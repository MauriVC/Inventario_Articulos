require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    ...(process.env.DB_SSL === 'true' && { ssl: { rejectUnauthorized: false } }),
  });
  
  const [almacenes] = await pool.query('SELECT * FROM almacenes');
  console.log('Almacenes:', almacenes.length);
  const [articulos] = await pool.query('SELECT * FROM articulos');
  console.log('Articulos:', articulos.length);
  process.exit(0);
}
check();
