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

  const updateCols = colList.map(c => `${c} = ?`).join(', ');
  const mysqlSql = `INSERT INTO ${table} (id, ${columns}) VALUES (?, ${placeholders}) ON DUPLICATE KEY UPDATE ${updateCols}`;
  const originalParams = [...params];
  const mysqlParams = [recordId, ...originalParams, ...originalParams];
  return { sql: mysqlSql, params: mysqlParams };
}

async function uploadPendingOps(conn, sqliteDb) {
  const pendingOps = sqliteDb.prepare(`SELECT * FROM sync_queue WHERE synced = 0 ORDER BY id ASC`).all();
  if (pendingOps.length === 0) {
    console.log('[SyncService] No hay operaciones pendientes para subir.');
    return { success: true, uploaded: 0 };
  }

  console.log(`[SyncService] Procesando ${pendingOps.length} operaciones pendientes para subir a la nube...`);
  let uploaded = 0;
  const errors = [];

  for (const op of pendingOps) {
    try {
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
    } catch (opErr) {
      console.error(`[SyncService] Error subiendo operación #${op.id} (${op.operation} en ${op.table_name}):`, opErr.message);
      errors.push({ id: op.id, error: opErr.message });
    }
  }

  if (errors.length > 0) {
    console.error(`[SyncService] ${errors.length} operación(es) fallaron. NO se descargará la nube para no perder datos locales.`);
    return { success: false, uploaded, errors };
  }

  return { success: true, uploaded };
}

async function downloadFromCloud(conn, sqliteDb) {
  sqliteDb.pragma('foreign_keys = OFF');

  for (const table of SYNC_TABLES) {
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
  }

  sqliteDb.pragma('foreign_keys = ON');
  sqliteDb.prepare(`DELETE FROM sync_queue`).run();
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
    if (!uploadResult.success) {
      console.error('[SyncService] Sincronización abortada: datos locales preservados.');
      return { success: false, reason: 'upload_failed', errors: uploadResult.errors };
    }

    // 2. BAJADA: Solo si la subida fue exitosa (o no había nada pendiente)
    await downloadFromCloud(conn, sqliteDb);
    console.log('[SyncService] Sincronización completa (subida + bajada).');
    return { success: true, uploaded: uploadResult.uploaded };

  } catch (error) {
    console.error('[SyncService] Error en sincronización:', error);
    return { success: false, reason: 'sync_error', error: error.message };
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { runSync };
