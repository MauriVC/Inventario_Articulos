/**
 * Rutas CRUD — Usuarios
 */
const { pool } = require('../config/database');
const { registrarActividad } = require('../config/actividadLog');
const { requirePermission } = require('../middleware/auth');

async function usuariosRoutes(fastify) {

  // GET /api/usuarios/permisos — Listar todos los permisos disponibles
  fastify.get('/permisos', { preHandler: requirePermission('GESTIONAR_USUARIOS') }, async () => {
    const [rows] = await pool.query('SELECT * FROM permisos ORDER BY modulo, nombre');
    return { data: rows };
  });

  // GET /api/usuarios — Listar usuarios (sin contraseña)
  fastify.get('/', { preHandler: requirePermission('GESTIONAR_USUARIOS') }, async () => {
    const [rows] = await pool.query(`
      SELECT u.id, u.carnet, u.nombres, u.apellidos, u.telefono, u.rol, u.estado, u.created_at,
             (SELECT GROUP_CONCAT(a.nombre SEPARATOR '||') FROM usuario_almacen ua JOIN almacenes a ON ua.almacen_id = a.id WHERE ua.usuario_id = u.id) AS almacenes_nombres,
             (SELECT GROUP_CONCAT(almacen_id SEPARATOR ',') FROM usuario_almacen WHERE usuario_id = u.id) AS almacenes_ids,
             (SELECT GROUP_CONCAT(permiso_id SEPARATOR ',') FROM usuario_permiso WHERE usuario_id = u.id) AS permisos_ids
      FROM usuarios u
      ORDER BY u.nombres
    `);

    const data = rows.map(r => ({
      ...r,
      almacenes: r.almacenes_nombres ? r.almacenes_nombres.split('||').map((n, i) => ({
        id: parseInt(r.almacenes_ids.split(',')[i]),
        nombre: n
      })) : [],
      permisos: r.permisos_ids ? r.permisos_ids.split(',').map(id => parseInt(id)) : []
    }));

    return { data };
  });

  // GET /api/usuarios/:id
  fastify.get('/:id', { preHandler: requirePermission('GESTIONAR_USUARIOS') }, async (request, reply) => {
    const [rows] = await pool.query(`
      SELECT u.id, u.carnet, u.nombres, u.apellidos, u.telefono, u.rol, u.estado, u.created_at,
             (SELECT GROUP_CONCAT(a.nombre SEPARATOR '||') FROM usuario_almacen ua JOIN almacenes a ON ua.almacen_id = a.id WHERE ua.usuario_id = u.id) AS almacenes_nombres,
             (SELECT GROUP_CONCAT(almacen_id SEPARATOR ',') FROM usuario_almacen WHERE usuario_id = u.id) AS almacenes_ids,
             (SELECT GROUP_CONCAT(permiso_id SEPARATOR ',') FROM usuario_permiso WHERE usuario_id = u.id) AS permisos_ids
      FROM usuarios u
      WHERE u.id = ?
    `, [request.params.id]);

    if (rows.length === 0) return reply.code(404).send({ error: 'Usuario no encontrado' });

    const r = rows[0];
    const data = {
      ...r,
      almacenes: r.almacenes_nombres ? r.almacenes_nombres.split('||').map((n, i) => ({
        id: parseInt(r.almacenes_ids.split(',')[i]),
        nombre: n
      })) : [],
      permisos: r.permisos_ids ? r.permisos_ids.split(',').map(id => parseInt(id)) : []
    };
    return { data };
  });

  // POST /api/usuarios — Crear usuario
  fastify.post('/', { preHandler: requirePermission('GESTIONAR_USUARIOS') }, async (request, reply) => {
    const { carnet, nombres, apellidos, telefono, contrasena, rol, almacenes = [], permisos = [] } = request.body;
    if (!carnet || !nombres || !apellidos || !contrasena) {
      return reply.code(400).send({ error: 'carnet, nombres, apellidos y contrasena son obligatorios' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insertar usuario
      const [result] = await connection.query(
        'INSERT INTO usuarios (carnet, nombres, apellidos, telefono, contrasena, rol) VALUES (?, ?, ?, ?, ?, ?)',
        [carnet, nombres, apellidos, telefono || null, contrasena, rol || 'Usuario']
      );
      const newUserId = result.insertId;

      // Insertar almacenes
      if (almacenes && almacenes.length > 0) {
        const values = almacenes.map(almacen_id => [newUserId, almacen_id]);
        await connection.query(
          'INSERT INTO usuario_almacen (usuario_id, almacen_id) VALUES ?',
          [values]
        );
      }

      // Insertar permisos
      if (permisos && permisos.length > 0) {
        const pValues = permisos.map(permiso_id => [newUserId, permiso_id]);
        await connection.query(
          'INSERT INTO usuario_permiso (usuario_id, permiso_id) VALUES ?',
          [pValues]
        );
      }

      await connection.commit();
      const creatorId = request.headers['x-user-id'] || null;
      registrarActividad({ tipo: 'REGISTRO', modulo: 'Usuario', descripcion: `Se registró el usuario "${nombres} ${apellidos}" (${rol || 'Usuario'})`, usuario_id: creatorId, referencia_id: newUserId });
      return reply.code(201).send({ data: { id: newUserId, carnet, nombres, apellidos, rol: rol || 'Usuario' } });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  // PUT /api/usuarios/:id
  fastify.put('/:id', { preHandler: requirePermission('GESTIONAR_USUARIOS') }, async (request, reply) => {
    const { carnet, nombres, apellidos, telefono, rol, estado, almacenes = [], permisos = [], contrasena } = request.body;
    if (!carnet || !nombres || !apellidos) {
      return reply.code(400).send({ error: 'carnet, nombres y apellidos son obligatorios' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Actualizar usuario
      let query = 'UPDATE usuarios SET carnet = ?, nombres = ?, apellidos = ?, telefono = ?, rol = ?, estado = ?';
      let params = [carnet, nombres, apellidos, telefono || null, rol || 'Usuario', estado || 'Activo'];

      if (contrasena && contrasena.trim() !== '') {
        query += ', contrasena = ?';
        params.push(contrasena);
      }
      
      query += ' WHERE id = ?';
      params.push(request.params.id);

      const [result] = await connection.query(query, params);
      if (result.affectedRows === 0) {
        await connection.rollback();
        return reply.code(404).send({ error: 'Usuario no encontrado' });
      }

      // Actualizar almacenes
      await connection.query('DELETE FROM usuario_almacen WHERE usuario_id = ?', [request.params.id]);
      if (almacenes && almacenes.length > 0) {
        const values = almacenes.map(almacen_id => [request.params.id, almacen_id]);
        await connection.query(
          'INSERT INTO usuario_almacen (usuario_id, almacen_id) VALUES ?',
          [values]
        );
      }

      // Actualizar permisos
      await connection.query('DELETE FROM usuario_permiso WHERE usuario_id = ?', [request.params.id]);
      if (permisos && permisos.length > 0) {
        const pValues = permisos.map(permiso_id => [request.params.id, permiso_id]);
        await connection.query(
          'INSERT INTO usuario_permiso (usuario_id, permiso_id) VALUES ?',
          [pValues]
        );
      }

      await connection.commit();
      const editorId = request.headers['x-user-id'] || null;
      registrarActividad({ tipo: 'EDICIÓN', modulo: 'Usuario', descripcion: `Se editó el usuario "${nombres} ${apellidos}"`, usuario_id: editorId, referencia_id: Number(request.params.id) });
      return { data: { id: Number(request.params.id), carnet, nombres, apellidos, rol, estado } };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  // DELETE /api/usuarios/:id
  fastify.delete('/:id', { preHandler: requirePermission('GESTIONAR_USUARIOS') }, async (request, reply) => {
    const [[user]] = await pool.query('SELECT nombres, apellidos FROM usuarios WHERE id = ?', [request.params.id]);
    const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Usuario no encontrado' });
    const deleterId = request.headers['x-user-id'] || null;
    registrarActividad({ tipo: 'BORRADO', modulo: 'Usuario', descripcion: `Se eliminó el usuario "${user ? user.nombres+' '+user.apellidos : 'ID:'+request.params.id}"`, usuario_id: deleterId, referencia_id: Number(request.params.id) });
    return { message: 'Usuario eliminado' };
  });
}

module.exports = usuariosRoutes;
