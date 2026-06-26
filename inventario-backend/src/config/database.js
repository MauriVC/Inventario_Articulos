/**
 * Módulo de conexión a MySQL (Aiven)
 * Exporta un pool de conexiones reutilizable
 */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  timezone: 'Z',
  ...(process.env.DB_SSL === 'true' && { ssl: { rejectUnauthorized: false } }),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Verifica que la conexión a la BD funciona.
 * Se llama al arrancar el servidor.
 */
async function testConnection() {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}
module.exports = { pool, testConnection };


