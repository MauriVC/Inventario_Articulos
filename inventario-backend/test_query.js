require('dotenv').config();
const { pool } = require('./src/config/database');
async function run() {
  try {
    const unionQuery = `
      (
        SELECT 
          m.id,
          'movimiento' AS origen,
          m.tipo,
          'Movimiento' AS modulo,
          CONCAT(m.tipo, ' — ', m.codigo, ' — ', COALESCE(m.solicitante_nombre, 'Sin solicitante')) AS descripcion,
          m.usuario_id,
          CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre,
          m.id AS referencia_id,
          m.fecha_movimiento AS fecha
        FROM movimientos m
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        WHERE 1=1
      )
      UNION ALL
      (
        SELECT 
          al.id,
          'actividad' AS origen,
          al.tipo,
          al.modulo,
          al.descripcion,
          al.usuario_id,
          CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre,
          al.referencia_id,
          al.created_at AS fecha
        FROM actividad_log al
        LEFT JOIN usuarios u ON al.usuario_id = u.id
        WHERE 1=1
      )
      ORDER BY fecha DESC
      LIMIT 20 OFFSET 0
    `;
    const [rows] = await pool.query(unionQuery);
    console.log(rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
