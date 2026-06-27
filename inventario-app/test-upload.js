require('dotenv').config({ path: '../inventario-backend/.env' });
const { app } = require('electron');
const path = require('path');
const mysql = require('mysql2/promise');

app.whenReady().then(async () => {
  try {
    const Database = require('better-sqlite3');
    const dbPath = 'C:\\\\Users\\\\USUARIO\\\\AppData\\\\Roaming\\\\inventario-app\\\\inventario_local.sqlite';
    const sqliteDb = new Database(dbPath);
    
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
      timezone: 'Z',
      ...(process.env.DB_SSL === 'true' && { ssl: { rejectUnauthorized: false } }),
    });
    
    const conn = await pool.getConnection();
    
    const pendingOps = sqliteDb.prepare(`SELECT * FROM sync_queue WHERE synced = 0 ORDER BY id ASC`).all();
    console.log(`Pendientes: ${pendingOps.length}`);
    
    for (const op of pendingOps) {
      try {
        let { sql, params } = JSON.parse(op.payload);
        const isBulkInsert = sql.toUpperCase().split('VALUES')[1]?.includes('),');
        if (op.operation === 'INSERT' && op.record_id && !isBulkInsert) {
          const insertMatch = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/i);
          if (insertMatch) {
            const table = insertMatch[1];
            const columns = insertMatch[2];
            const placeholders = insertMatch[3];
            sql = `INSERT INTO ${table} (id, ${columns}) VALUES (?, ${placeholders})`;
            params.unshift(op.record_id);
          }
        }
        
        console.log(`Ejecutando SQL: ${sql}`);
        console.log(`Parametros:`, params);
        await conn.query(sql, params);
        console.log(`Exito para op ${op.id}`);
      } catch (err) {
        console.error(`Error en op ${op.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    app.quit();
  }
});
