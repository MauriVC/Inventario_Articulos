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
    
    // 1. SUBIDA: Procesar operaciones locales pendientes (sync_queue)
    const pendingOps = sqliteDb.prepare(`SELECT * FROM sync_queue WHERE synced = 0 ORDER BY id ASC`).all();
    if (pendingOps.length > 0) {
      console.log(`[SyncService] Procesando ${pendingOps.length} operaciones pendientes para subir a la nube...`);
      for (const op of pendingOps) {
        try {
          let { sql, params } = JSON.parse(op.payload);
          
          // CRÍTICO: Si es un INSERT, MySQL ignorará el ID generado por SQLite (ej. 10000001) 
          // porque el query original no incluye la columna "id".
          // Debemos inyectar el "id" explícitamente para que MySQL respete el ID local 
          // y las llaves foráneas (ej. articulo_items) no se rompan.
          if (op.operation === 'INSERT' && op.record_id) {
            // Solo inyectar ID si es un INSERT sencillo, no un bulk insert
            const isBulkInsert = sql.toUpperCase().split('VALUES')[1]?.includes('),');
            
            if (!isBulkInsert) {
              const insertMatch = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/i);
              if (insertMatch) {
                const table = insertMatch[1];
                const columns = insertMatch[2];
                const placeholders = insertMatch[3];
                
                sql = `INSERT INTO ${table} (id, ${columns}) VALUES (?, ${placeholders})`;
                params.unshift(op.record_id); // Colocar el ID al inicio de los parámetros
              }
            }
          }
          
          await conn.query(sql, params);
          sqliteDb.prepare(`UPDATE sync_queue SET synced = 1 WHERE id = ?`).run(op.id);
          console.log(`[SyncService] Subida exitosa - Operación #${op.id} (${op.operation} en ${op.table_name})`);
        } catch (opErr) {
          console.error(`[SyncService] Error subiendo operación #${op.id}:`, opErr);
          // Opcional: Podríamos detener la sincronización si falla una operación para mantener la consistencia
        }
      }
    }

    // 2. BAJADA: Traer datos de Aiven a SQLite local
    // Hacemos una copia espejo desde la nube a la base local
    // Para simplificar: vaciamos y llenamos (solo para DBs pequeñas)
    
    // Desactivar foreign keys temporalmente para vaciar
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
    console.log('[SyncService] Sincronización de bajada completada exitosamente.');

  } catch (error) {
    console.error('[SyncService] Error en sincronización:', error);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { runSync };
