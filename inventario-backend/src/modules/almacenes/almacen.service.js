/**
 * Servicio — Almacenes
 */
const { pool } = require('../../core/config/database');
const { registrarActividad } = require('../../core/config/actividadLog');
const { buildAlmacenJoinFilter } = require('../../core/helpers/almacenFilter');

/**
 * Listar almacenes con conteo de artículos y responsable
 */
async function listar(userId, userRole) {
  const { join, where, params } = buildAlmacenJoinFilter(userId, userRole);

  const query = `
    SELECT a.id, a.nombre, a.ubicacion, a.descripcion, a.estado, a.created_at, a.updated_at,
           COUNT(art.id) AS totalArticulos,
           CONCAT(u.nombres, ' ', u.apellidos) AS responsable_nombre
    FROM almacenes a
    LEFT JOIN articulos art ON art.almacen_id = a.id
    LEFT JOIN usuarios u ON a.created_by = u.id
    ${join}${where}
    GROUP BY a.id
    ORDER BY a.nombre
  `;

  const [rows] = await pool.query(query, params);
  return rows;
}

/**
 * Obtener un almacén por ID
 */
async function obtenerPorId(id) {
  const [rows] = await pool.query('SELECT * FROM almacenes WHERE id = ?', [id]);
  if (rows.length === 0) {
    const error = new Error('Almacén no encontrado');
    error.statusCode = 404;
    throw error;
  }
  return rows[0];
}

/**
 * Crear un almacén y asignarlo al usuario creador
 */
async function crear({ nombre, ubicacion, descripcion, userId }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO almacenes (nombre, ubicacion, descripcion, created_by) VALUES (?, ?, ?, ?)',
      [nombre, ubicacion || null, descripcion || null, userId]
    );

    if (userId) {
      await conn.query('INSERT INTO usuario_almacen (usuario_id, almacen_id) VALUES (?, ?)', [userId, result.insertId]);
    }

    await conn.commit();
    registrarActividad({ tipo: 'REGISTRO', modulo: 'Almacén', descripcion: `Se registró el almacén "${nombre}"`, usuario_id: userId, referencia_id: result.insertId });
    return { id: result.insertId, nombre, ubicacion, descripcion, created_by: userId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Actualizar un almacén
 */
async function actualizar(id, { nombre, ubicacion, descripcion, estado, userId }) {
  const [result] = await pool.query(
    'UPDATE almacenes SET nombre = ?, ubicacion = ?, descripcion = ?, estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [nombre, ubicacion || null, descripcion || null, estado || 'Activo', id]
  );
  if (result.affectedRows === 0) {
    const error = new Error('Almacén no encontrado');
    error.statusCode = 404;
    throw error;
  }
  registrarActividad({ tipo: 'EDICIÓN', modulo: 'Almacén', descripcion: `Se editó el almacén "${nombre}"`, usuario_id: userId, referencia_id: Number(id) });
  return { id: Number(id), nombre, ubicacion, descripcion, estado };
}

/**
 * Eliminar un almacén
 */
async function eliminar(id, userId) {
  const [[almacen]] = await pool.query('SELECT nombre FROM almacenes WHERE id = ?', [id]);
  const [result] = await pool.query('DELETE FROM almacenes WHERE id = ?', [id]);
  if (result.affectedRows === 0) {
    const error = new Error('Almacén no encontrado');
    error.statusCode = 404;
    throw error;
  }
  registrarActividad({ tipo: 'BORRADO', modulo: 'Almacén', descripcion: `Se eliminó el almacén "${almacen ? almacen.nombre : 'ID:' + id}"`, usuario_id: userId, referencia_id: Number(id) });
  return { message: 'Almacén eliminado' };
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
