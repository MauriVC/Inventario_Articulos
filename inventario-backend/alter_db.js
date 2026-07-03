const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterTable() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123',
    database: process.env.DB_NAME || 'inventario_articulos',
    port: process.env.DB_PORT || 3306
  });

  try {
    await pool.query("ALTER TABLE almacenes ADD COLUMN created_by INT DEFAULT NULL;");
    await pool.query("ALTER TABLE almacenes ADD FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;");
    console.log('Table altered successfully.');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists.');
    } else {
      console.error('Error altering table:', error);
    }
  } finally {
    await pool.end();
  }
}

alterTable();
