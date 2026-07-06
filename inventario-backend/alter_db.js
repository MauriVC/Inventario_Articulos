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
    // Crear tabla de log de actividades del sistema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS actividad_log (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        tipo          VARCHAR(20) NOT NULL,
        modulo        VARCHAR(50) NOT NULL,
        descripcion   VARCHAR(500) NOT NULL,
        usuario_id    INT DEFAULT NULL,
        referencia_id INT DEFAULT NULL,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tipo (tipo),
        INDEX idx_modulo (modulo),
        INDEX idx_fecha (created_at),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ Tabla actividad_log creada correctamente.');
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('La tabla actividad_log ya existe.');
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    await pool.end();
  }
}

alterTable();
