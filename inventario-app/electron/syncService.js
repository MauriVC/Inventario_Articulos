const mysql = require('mysql2/promise');
const { getDb } = require('./localDb');

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
  'almacenes', 'usuarios', 'categorias', 'marcas', 'unidad_medidas',
  'colores', 'atributos', 'datos', 'articulos', 'articulo_items',
  'articulo_datos', 'movimientos', 'movimiento_detalles', 'paquetes',
  'paquete_contenido', 'usuario_almacen'
];

async function runSync(envConfig) {
  console.log('[SyncService] Iniciando sincronización...');
  const sqliteDb = getDb();
  let conn = null;

  try {
    const pool = await initCloudPool(envConfig);
    conn = await pool.getConnection();
    
    // ═══════════════════════════════════════════════════
    // 1. SUBIDA: Procesar operaciones locales pendientes
    // ═══════════════════════════════════════════════════
    const pendingOps = sqliteDb.prepare(`SELECT * FROM sync_queue WHERE synced = 0 ORDER BY id ASC`).all();
    if (pendingOps.length > 0) {
      console.log(`[SyncService] Procesando ${pendingOps.length} operaciones pendientes para subir a la nube...`);
      for (const op of pendingOps) {
        try {
          let { sql, params } = JSON.parse(op.payload);
          
          if (op.operation === 'INSERT' && op.record_id) {
            // Para INSERTs: convertir a INSERT ... ON DUPLICATE KEY UPDATE
            // para que no falle si el registro ya existe en la nube
            const isBulkInsert = sql.toUpperCase().split('VALUES')[1]?.includes('),');
            
            if (!isBulkInsert) {
              const insertMatch = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/i);
              if (insertMatch) {
                const table = insertMatch[1];
                const columns = insertMatch[2];
                const placeholders = insertMatch[3];
                const colList = columns.split(',').map(c => c.trim());
                
                // Inyectar ID local + ON DUPLICATE KEY UPDATE
                const updateCols = colList.map(c => `${c} = VALUES(${c})`).join(', ');
                sql = `INSERT INTO ${table} (id, ${columns}) VALUES (?, ${placeholders}) ON DUPLICATE KEY UPDATE ${updateCols}`;
                params.unshift(op.record_id);
              }
            }
          } else if (op.operation === 'UPDATE') {
            // Para UPDATEs: simplemente ejecutar (si falla porque el registro no existe, registrar y continuar)
          } else if (op.operation === 'DELETE') {
            // Para DELETEs: ejecutar directamente, si el registro ya no existe ignorar
          }
          
          await conn.query(sql, params);
          sqliteDb.prepare(`UPDATE sync_queue SET synced = 1 WHERE id = ?`).run(op.id);
          console.log(`[SyncService] Subida exitosa - Operación #${op.id} (${op.operation} en ${op.table_name})`);
        } catch (opErr) {
          // Marcar como sincronizado de todos modos para evitar bucles infinitos
          // El paso de BAJADA traerá los datos correctos de la nube
          console.error(`[SyncService] Error subiendo operación #${op.id} (${op.operation} en ${op.table_name}):`, opErr.message);
          sqliteDb.prepare(`UPDATE sync_queue SET synced = 1 WHERE id = ?`).run(op.id);
        }
      }
    }

    // ═══════════════════════════════════════════════════
    // 2. BAJADA: Traer datos de la nube a SQLite local
    // ═══════════════════════════════════════════════════
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
    
    // Limpiar toda la sync_queue después de una bajada exitosa
    sqliteDb.prepare(`DELETE FROM sync_queue`).run();
    
    console.log('[SyncService] Sincronización completa (subida + bajada).');

  } catch (error) {
    console.error('[SyncService] Error en sincronización:', error);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { runSync };
