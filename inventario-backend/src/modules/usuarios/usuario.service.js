/**
 * Servicio — Usuarios
 */
const { pool } = require('../../core/config/database');
const { registrarActividad } = require('../../core/config/actividadLog');
const { hashPassword } = require('../../core/helpers/hashPassword');

const USUARIO_SELECT_QUERY = `
  SELECT u.id, u.carnet, u.nombres, u.apellidos, u.telefono, u.rol, u.estado, u.created_at,
         (SELECT GROUP_CONCAT(a.nombre SEPARATOR '||') FROM usuario_almacen ua JOIN almacenes a ON ua.almacen_id = a.id WHERE ua.usuario_id = u.id) AS almacenes_nombres,
         (SELECT GROUP_CONCAT(almacen_id SEPARATOR ',') FROM usuario_almacen WHERE usuario_id = u.id) AS almacenes_ids,
         (SELECT GROUP_CONCAT(permiso_id SEPARATOR ',') FROM usuario_permiso WHERE usuario_id = u.id) AS permisos_ids
  FROM usuarios u
`;

/**
 * Parsear GROUP_CONCAT de almacenes y permisos en objetos
 */
function parseUsuarioRelations(row) {
  return {
    ...row,
    almacenes: row.almacenes_nombres ? row.almacenes_nombres.split('||').map((n, i) => ({
      id: parseInt(row.almacenes_ids.split(',')[i]),
      nombre: n
    })) : [],
    permisos: row.permisos_ids ? row.permisos_ids.split(',').map(id => parseInt(id)) : []
  };
}

/**
 * Listar todos los permisos disponibles
 */
async function listarPermisos() {
  const [rows] = await pool.query('SELECT * FROM permisos ORDER BY modulo, nombre');
  return rows;
}

/**
 * Listar todos los usuarios con sus almacenes y permisos
 */
async function listar() {
  const [rows] = await pool.query(`${USUARIO_SELECT_QUERY} ORDER BY u.nombres`);
  return rows.map(parseUsuarioRelations);
}

/**
 * Obtener un usuario por ID
 */
async function obtenerPorId(id) {
  const [rows] = await pool.query(`${USUARIO_SELECT_QUERY} WHERE u.id = ?`, [id]);
  if (rows.length === 0) {
    const error = new Error('Usuario no encontrado');
    error.statusCode = 404;
    throw error;
  }
  return parseUsuarioRelations(rows[0]);
}

/**
 * Crear un usuario con almacenes y permisos en transacción
 */
async function crear({ carnet, nombres, apellidos, telefono, contrasena, rol, almacenes = [], permisos = [], creatorId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const hashedPass = hashPassword(contrasena);

    const [result] = await connection.query(
      'INSERT INTO usuarios (carnet, nombres, apellidos, telefono, contrasena, rol) VALUES (?, ?, ?, ?, ?, ?)',
      [carnet, nombres, apellidos, telefono || null, hashedPass, rol || 'Usuario']
    );
    const newUserId = result.insertId;

    if (almacenes && almacenes.length > 0) {
      const values = almacenes.map(almacen_id => [newUserId, almacen_id]);
      await connection.query('INSERT INTO usuario_almacen (usuario_id, almacen_id) VALUES ?', [values]);
    }

    if (permisos && permisos.length > 0) {
      const pValues = permisos.map(permiso_id => [newUserId, permiso_id]);
      await connection.query('INSERT INTO usuario_permiso (usuario_id, permiso_id) VALUES ?', [pValues]);
    }

    await connection.commit();
    registrarActividad({ tipo: 'REGISTRO', modulo: 'Usuario', descripcion: `Se registró el usuario "${nombres} ${apellidos}" (${rol || 'Usuario'})`, usuario_id: creatorId, referencia_id: newUserId });
    return { id: newUserId, carnet, nombres, apellidos, rol: rol || 'Usuario' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Actualizar un usuario (datos + almacenes + permisos) en transacción
 */
async function actualizar(id, { carnet, nombres, apellidos, telefono, rol, estado, almacenes = [], permisos = [], contrasena, editorId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let query = 'UPDATE usuarios SET carnet = ?, nombres = ?, apellidos = ?, telefono = ?, rol = ?, estado = ?';
    let params = [carnet, nombres, apellidos, telefono || null, rol || 'Usuario', estado || 'Activo'];

    if (contrasena && contrasena.trim() !== '') {
      const hashedPass = hashPassword(contrasena);
      query += ', contrasena = ?';
      params.push(hashedPass);
    }

    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await connection.query(query, params);
    if (result.affectedRows === 0) {
      await connection.rollback();
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Reemplazar almacenes
    await connection.query('DELETE FROM usuario_almacen WHERE usuario_id = ?', [id]);
    if (almacenes && almacenes.length > 0) {
      const values = almacenes.map(almacen_id => [id, almacen_id]);
      await connection.query('INSERT INTO usuario_almacen (usuario_id, almacen_id) VALUES ?', [values]);
    }

    // Reemplazar permisos
    await connection.query('DELETE FROM usuario_permiso WHERE usuario_id = ?', [id]);
    if (permisos && permisos.length > 0) {
      const pValues = permisos.map(permiso_id => [id, permiso_id]);
      await connection.query('INSERT INTO usuario_permiso (usuario_id, permiso_id) VALUES ?', [pValues]);
    }

    await connection.commit();
    registrarActividad({ tipo: 'EDICIÓN', modulo: 'Usuario', descripcion: `Se editó el usuario "${nombres} ${apellidos}"`, usuario_id: editorId, referencia_id: Number(id) });
    return { id: Number(id), carnet, nombres, apellidos, rol, estado };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Eliminar un usuario
 */
async function eliminar(id, deleterId) {
  const [[user]] = await pool.query('SELECT nombres, apellidos FROM usuarios WHERE id = ?', [id]);
  const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
  if (result.affectedRows === 0) {
    const error = new Error('Usuario no encontrado');
    error.statusCode = 404;
    throw error;
  }
  registrarActividad({ tipo: 'BORRADO', modulo: 'Usuario', descripcion: `Se eliminó el usuario "${user ? user.nombres + ' ' + user.apellidos : 'ID:' + id}"`, usuario_id: deleterId, referencia_id: Number(id) });
  return { message: 'Usuario eliminado' };
}

module.exports = { listarPermisos, listar, obtenerPorId, crear, actualizar, eliminar };
