const { runSync } = require('./electron/syncService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../inventario-backend/.env') });

(async () => {
  // we can't require better-sqlite3 from node, so we will just run the mysql connection test
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    timezone: 'Z',
    ...(process.env.DB_SSL === 'true' && { ssl: { rejectUnauthorized: false } }),
  });
  
  try {
    const conn = await pool.getConnection();
    // Test the insert on duplicate key query syntax
    const sql = "INSERT INTO almacenes (id, nombre, ubicacion) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), ubicacion = VALUES(ubicacion)";
    await conn.query(sql, [99999, 'Test Sync', 'Test']);
    console.log("Syntax is valid!");
    
    // delete it
    await conn.query("DELETE FROM almacenes WHERE id = 99999");
    
    // Test with ISO date
    const dateSql = "INSERT INTO almacenes (id, nombre, ubicacion, created_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)";
    await conn.query(dateSql, [99998, 'Test Sync 2', 'Test', new Date().toISOString()]);
    console.log("ISO Date is valid!");
    await conn.query("DELETE FROM almacenes WHERE id = 99998");
    
    console.log("All tests passed");
  } catch (err) {
    console.error("MySQL Error:", err.message);
  } finally {
    await pool.end();
  }
})();
