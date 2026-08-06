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
 * Listar todos los permisos disponibles (filtrados por los que tiene el usuario actual)
 */
async function listarPermisos(userId, userRole) {
  if (userRole === 'SuperAdministrador') {
    const [rows] = await pool.query('SELECT * FROM permisos ORDER BY modulo, nombre');
    return rows;
  } else {
    const [rows] = await pool.query(`
      SELECT p.* FROM permisos p
      INNER JOIN usuario_permiso up ON p.id = up.permiso_id
      WHERE up.usuario_id = ?
      ORDER BY p.modulo, p.nombre
    `, [userId]);
    return rows;
  }
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
async function crear({ carnet, nombres, apellidos, telefono, contrasena, rol, almacenes = [], permisos = [], creatorId, creatorRole }) {
  if (rol === 'SuperAdministrador' && creatorRole !== 'SuperAdministrador') {
    const error = new Error('No tienes permisos para crear un SuperAdministrador');
    error.statusCode = 403;
    throw error;
  }

  let permisosValidos = permisos;
  if (creatorRole !== 'SuperAdministrador' && permisos.length > 0) {
    const allowedPermsRows = await listarPermisos(creatorId, creatorRole);
    const allowedIds = allowedPermsRows.map(p => p.id);
    permisosValidos = permisos.filter(id => allowedIds.includes(id));
  }
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

    if (permisosValidos && permisosValidos.length > 0) {
      const pValues = permisosValidos.map(permiso_id => [newUserId, permiso_id]);
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
async function actualizar(id, { carnet, nombres, apellidos, telefono, rol, estado, almacenes = [], permisos = [], contrasena, editorId, editorRole }) {
  if (editorRole !== 'SuperAdministrador') {
    const [[targetUser]] = await pool.query('SELECT rol FROM usuarios WHERE id = ?', [id]);
    if (targetUser && targetUser.rol === 'SuperAdministrador') {
      const error = new Error('No tienes permisos para editar a un SuperAdministrador');
      error.statusCode = 403;
      throw error;
    }
    if (rol === 'SuperAdministrador') {
      const error = new Error('No tienes permisos para otorgar el rol de SuperAdministrador');
      error.statusCode = 403;
      throw error;
    }
  }
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
    let permisosValidos = permisos;
    if (editorRole !== 'SuperAdministrador') {
      const [currentPermsRows] = await connection.query('SELECT permiso_id FROM usuario_permiso WHERE usuario_id = ?', [id]);
      const currentPerms = currentPermsRows.map(r => r.permiso_id);
      const allowedPermsRows = await listarPermisos(editorId, editorRole);
      const allowedIds = allowedPermsRows.map(p => p.id);
      
      const unmanageablePerms = currentPerms.filter(pid => !allowedIds.includes(pid));
      const manageableRequestedPerms = permisos.filter(pid => allowedIds.includes(pid));
      permisosValidos = [...unmanageablePerms, ...manageableRequestedPerms];
    }

    await connection.query('DELETE FROM usuario_permiso WHERE usuario_id = ?', [id]);
    if (permisosValidos && permisosValidos.length > 0) {
      const pValues = permisosValidos.map(permiso_id => [id, permiso_id]);
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
async function eliminar(id, deleterId, deleterRole) {
  if (deleterRole !== 'SuperAdministrador') {
    const [[targetUser]] = await pool.query('SELECT rol FROM usuarios WHERE id = ?', [id]);
    if (targetUser && targetUser.rol === 'SuperAdministrador') {
      const error = new Error('No tienes permisos para eliminar a un SuperAdministrador');
      error.statusCode = 403;
      throw error;
    }
  }
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
