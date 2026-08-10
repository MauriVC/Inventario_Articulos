const mysql = require('mysql2/promise');
const { getDb, checkpointWal } = require('./localDb');

let cloudPool = null;

async function initCloudPool(envConfig) {
  if (cloudPool) return cloudPool;
  
  cloudPool = mysql.createPool({
    host: envConfig.DB_HOST,
    user: envConfig.DB_USER,
    password: envConfig.DB_PASSWORD,
    database: envConfig.DB_NAME,
    port: Number(envConfig.DB_PORT) || 3306,
    timezone: 'Z',
    ...(envConfig.DB_SSL === 'true' && { ssl: { rejectUnauthorized: false } }),
  });
  return cloudPool;
}

const SYNC_TABLES = [
  'permisos', 'usuario_permiso',
  'almacenes', 'usuarios', 'categorias', 'marcas', 'unidad_medidas',
  'colores', 'atributos', 'datos', 'articulos', 'articulo_items',
  'articulo_datos', 'movimientos', 'movimiento_detalles', 'paquetes',
  'paquete_contenido', 'usuario_almacen', 'actividad_log'
];

const SYNC_TABLE_SET = new Set(SYNC_TABLES);

// Prioridad de subida respetando dependencias de FK (padres antes que hijos)
const UPLOAD_PRIORITY = {
  'permisos': 1, 'usuarios': 1, 'categorias': 1, 'marcas': 1, 'unidad_medidas': 1, 'colores': 1, 'atributos': 1,
  'almacenes': 2, 'datos': 2, 'usuario_almacen': 2, 'usuario_permiso': 2, 'actividad_log': 2,
  'articulos': 3, 'paquetes': 3,
  'articulo_items': 4, 'articulo_datos': 4, 'movimientos': 4,
  'movimiento_detalles': 5, 'paquete_contenido': 5,
};

// FKs hijo -> (columna, tabla_padre) para limpieza de huérfanos tras la descarga
const FK_CHILD_TABLES = {
  'movimiento_detalles': [['movimiento_id', 'movimientos'], ['articulo_item_id', 'articulo_items']],
  'articulo_datos': [['articulo_id', 'articulos'], ['dato_id', 'datos']],
  'articulo_items': [['articulo_id', 'articulos'], ['color_id', 'colores']],
  'articulos': [['almacen_id', 'almacenes'], ['categoria_id', 'categorias'], ['marca_id', 'marcas'], ['unidad_medida_id', 'unidad_medidas']],
  'movimientos': [['almacen_id', 'almacenes'], ['usuario_id', 'usuarios'], ['paquete_id', 'paquetes']],
  'paquete_contenido': [['paquete_id', 'paquetes'], ['articulo_item_id', 'articulo_items']],
  'paquetes': [['categoria_id', 'categorias'], ['almacen_id', 'almacenes']],
  'datos': [['atributo_id', 'atributos']],
  'categorias': [['padre_id', 'categorias']],
  'usuario_almacen': [['usuario_id', 'usuarios'], ['almacen_id', 'almacenes']],
  'usuario_permiso': [['usuario_id', 'usuarios'], ['permiso_id', 'permisos']],
  'actividad_log': [['usuario_id', 'usuarios']],
  'almacenes': [['created_by', 'usuarios']],
};

function normalizeParamsForMysql(params) {
  return params.map(p => {
    if (typeof p === 'string' && p.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/)) {
      return p.slice(0, 19).replace('T', ' ');
    }
    return p;
  });
}

function buildMysqlInsertWithId(sql, params, recordId) {
  const insertMatch = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)\s*$/i);
  if (!insertMatch || !recordId) return { sql, params };

  const table = insertMatch[1];
  const columns = insertMatch[2];
  const placeholders = insertMatch[3];
  const colList = columns.split(',').map(c => c.trim());

  const placeholderCount = (placeholders.match(/\?/g) || []).length;
  if (placeholderCount !== colList.length) {
    // INSERT con valores literales dentro de VALUES rompe el alineado columnas/placeholders.
    // uploadPendingOps reintentara con el fallback de fila completa (tryFallbackInsert).
    throw new Error(`INSERT no alineado en ${table}: ${colList.length} columnas pero ${placeholderCount} placeholders en VALUES`);
  }

  const updateCols = colList.map(c => `${c} = ?`).join(', ');
  const mysqlSql = `INSERT INTO ${table} (id, ${columns}) VALUES (?, ${placeholders}) ON DUPLICATE KEY UPDATE ${updateCols}`;
  const originalParams = [...params];
  const mysqlParams = [recordId, ...originalParams, ...originalParams];
  return { sql: mysqlSql, params: mysqlParams };
}

async function tryFallbackInsert(conn, sqliteDb, op) {
  if (op.operation !== 'INSERT' || !op.record_id) return false;
  if (!SYNC_TABLE_SET.has(op.table_name)) return false;

  const row = sqliteDb.prepare(`SELECT * FROM ${op.table_name} WHERE id = ?`).get(op.record_id);
  if (!row) return false;

  const columns = Object.keys(row).filter(c => c !== 'id');
  const placeholders = columns.map(() => '?').join(', ');
  const updateCols = columns.map(c => `${c} = ?`).join(', ');
  const params = columns.map(c => (row[c] instanceof Date ? row[c].toISOString() : row[c]));

  const sql = `INSERT INTO ${op.table_name} (id, ${columns.join(', ')}) VALUES (?, ${placeholders}) ON DUPLICATE KEY UPDATE ${updateCols}`;
  const mysqlParams = normalizeParamsForMysql([op.record_id, ...params, ...params]);

  try {
    await conn.query(sql, mysqlParams);
    sqliteDb.prepare(`UPDATE sync_queue SET synced = 1 WHERE id = ?`).run(op.id);
    console.log(`[SyncService] Subida recuperada (rebuild fila local) - Operación #${op.id} (INSERT en ${op.table_name})`);
    return true;
  } catch (rebuildErr) {
    console.error(`[SyncService] Fallback de inserción falló para #${op.id} en ${op.table_name}:`, rebuildErr.message);
    return false;
  }
}

async function uploadPendingOps(conn, sqliteDb) {
  let pendingOps = sqliteDb.prepare(`SELECT * FROM sync_queue WHERE synced = 0`).all();
  if (pendingOps.length === 0) {
    console.log('[SyncService] No hay operaciones pendientes para subir.');
    return { success: true, uploaded: 0, errors: [] };
  }

  // Ordenar respetando dependencias de FK: padres antes que hijos.
  // Dentro de la misma tabla se mantiene el orden FIFO.
  pendingOps.sort((a, b) => {
    const pa = UPLOAD_PRIORITY[a.table_name] ?? 9;
    const pb = UPLOAD_PRIORITY[b.table_name] ?? 9;
    return (pa - pb) || (a.id - b.id);
  });

  console.log(`[SyncService] Procesando ${pendingOps.length} operaciones pendientes para subir a la nube...`);
  let uploaded = 0;
  const errors = [];

  async function executeOp(op) {
    let { sql, params } = JSON.parse(op.payload);
    params = normalizeParamsForMysql(params);

    if (op.operation === 'INSERT') {
      const built = buildMysqlInsertWithId(sql, params, op.record_id);
      sql = built.sql;
      params = built.params;
    }

    await conn.query(sql, params);
    sqliteDb.prepare(`UPDATE sync_queue SET synced = 1 WHERE id = ?`).run(op.id);
    uploaded++;
    console.log(`[SyncService] Subida exitosa - Operación #${op.id} (${op.operation} en ${op.table_name})`);
  }

  async function handleOpFailure(op, opErr) {
    // 1) Reconstruir desde la fila local (payloads viejos con literales, etc.)
    const fallbackUsed = await tryFallbackInsert(conn, sqliteDb, op);
    if (fallbackUsed) return;

    // 2) Si la fila local ya no existe, la operación es obsoleta (dato borrado/sobrescrito)
    if (op.operation === 'INSERT' && op.record_id && SYNC_TABLE_SET.has(op.table_name)) {
      const rowExists = sqliteDb.prepare(`SELECT 1 FROM ${op.table_name} WHERE id = ?`).get(op.record_id);
      if (!rowExists) {
        sqliteDb.prepare(`DELETE FROM sync_queue WHERE id = ?`).run(op.id);
        console.log(`[SyncService] Operación #${op.id} descartada (fila local ya no existe)`);
        return;
      }
    }

    // 3) Error real: queda pendiente para reintentar, pero NO bloquea la descarga
    console.error(`[SyncService] Error subiendo operación #${op.id} (${op.operation} en ${op.table_name}):`, opErr.message);
    errors.push({ id: op.id, error: opErr.message });
  }

  for (const op of pendingOps) {
    try {
      await executeOp(op);
    } catch (opErr) {
      await handleOpFailure(op, opErr);
    }
  }

  // Reintento: hijos que fallaron por FK pueden subir ahora que sus padres ya están en la nube
  if (errors.length > 0) {
    console.log(`[SyncService] ${errors.length} op(s) fallaron en el primer intento. Reintentando tras subir los padres...`);
    const retryOps = sqliteDb.prepare(`SELECT * FROM sync_queue WHERE synced = 0`).all();
    retryOps.sort((a, b) => {
      const pa = UPLOAD_PRIORITY[a.table_name] ?? 9;
      const pb = UPLOAD_PRIORITY[b.table_name] ?? 9;
      return (pa - pb) || (a.id - b.id);
    });
    errors.length = 0;
    for (const op of retryOps) {
      try {
        await executeOp(op);
      } catch (opErr) {
        await handleOpFailure(op, opErr);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`[SyncService] ${errors.length} operación(es) no pudieron subirse. Sus tablas se excluirán de la descarga para no perder datos locales.`);
    return { success: true, uploaded, errors };
  }

  return { success: true, uploaded, errors: [] };
}

async function downloadFromCloud(conn, sqliteDb) {
  sqliteDb.pragma('foreign_keys = OFF');

  // Tablas con operaciones pendientes se excluyen de la descarga para no perder datos locales sin subir
  const pendingTables = new Set(
    sqliteDb.prepare(`SELECT DISTINCT table_name FROM sync_queue WHERE synced = 0`).all().map(r => r.table_name)
  );
  const refreshedTables = new Set();

  for (const table of SYNC_TABLES) {
    if (pendingTables.has(table)) {
      console.log(`[SyncService] Tabla ${table} excluida de la descarga (tiene operaciones pendientes por subir).`);
      continue;
    }

    const [rows] = await conn.query(`SELECT * FROM ${table}`);
    sqliteDb.prepare(`DELETE FROM ${table}`).run();

    if (rows.length > 0) {
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(',');
      const insertStmt = sqliteDb.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`);

      const insertMany = sqliteDb.transaction((records) => {
        for (const record of records) {
          const values = columns.map(col => {
            const val = record[col];
            if (val instanceof Date) return val.toISOString();
            return val;
          });
          insertStmt.run(...values);
        }
      });

      insertMany(rows);
    }
    refreshedTables.add(table);
  }

  // Limpieza de huérfanos: en tablas excluidas, eliminar filas cuyo padre fue actualizado/borrado en la nube
  for (const table of pendingTables) {
    const fks = FK_CHILD_TABLES[table];
    if (!fks) continue;
    for (const [childCol, parentTable] of fks) {
      if (!refreshedTables.has(parentTable)) continue;
      const deleted = sqliteDb.prepare(
        `DELETE FROM ${table} WHERE ${childCol} IS NOT NULL AND ${childCol} NOT IN (SELECT id FROM ${parentTable})`
      ).run().changes;
      if (deleted > 0) {
        console.log(`[SyncService] Pruning: ${deleted} filas huérfanas en ${table} (referencia ${parentTable}.id)`);
      }
    }
  }

  // Descartar operaciones obsoletas: pendientes cuyo dato local ya no existe (huérfano eliminado)
  const pendingInserts = sqliteDb.prepare(
    `SELECT id, table_name, record_id FROM sync_queue WHERE synced = 0 AND operation = 'INSERT'`
  ).all();
  for (const op of pendingInserts) {
    if (!SYNC_TABLE_SET.has(op.table_name)) continue;
    const rowExists = sqliteDb.prepare(`SELECT 1 FROM ${op.table_name} WHERE id = ?`).get(op.record_id);
    if (!rowExists) {
      sqliteDb.prepare(`DELETE FROM sync_queue WHERE id = ?`).run(op.id);
      console.log(`[SyncService] Operación #${op.id} descartada (fila huérfana eliminada).`);
    }
  }

  sqliteDb.pragma('foreign_keys = ON');
  sqliteDb.prepare(`DELETE FROM sync_queue WHERE synced = 1`).run();
}

async function runSync(envConfig) {
  console.log('[SyncService] Iniciando sincronización...');
  checkpointWal();
  const sqliteDb = getDb();
  let conn = null;

  try {
    const pool = await initCloudPool(envConfig);
    conn = await pool.getConnection();

    // 1. SUBIDA: Procesar operaciones locales pendientes
    const uploadResult = await uploadPendingOps(conn, sqliteDb);
    if (uploadResult.errors && uploadResult.errors.length > 0) {
      // Las ops que no subieron NO bloquean la descarga: sus tablas se excluyen para no perder datos locales
      console.error(`[SyncService] ${uploadResult.errors.length} operación(es) sin subir. Continuando con descarga segura.`);
    }

    // 2. BAJADA: refrescar desde la nube (excluyendo tablas con pendientes)
    await downloadFromCloud(conn, sqliteDb);
    console.log('[SyncService] Sincronización completa (subida + bajada).');
    return { success: true, uploaded: uploadResult.uploaded, errors: uploadResult.errors };

  } catch (error) {
    console.error('[SyncService] Error en sincronización:', error);
    return { success: false, reason: 'sync_error', error: error.message };
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { runSync };
