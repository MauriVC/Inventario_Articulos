/**
 * Rutas CRUD — Usuarios
 */
const { pool } = require('../config/database');

async function usuariosRoutes(fastify) {

  // GET /api/usuarios — Listar usuarios (sin contraseña)
  fastify.get('/', async () => {
    const [rows] = await pool.query(`
      SELECT u.id, u.carnet, u.nombres, u.apellidos, u.telefono, u.rol, u.estado, u.created_at,
             GROUP_CONCAT(a.nombre SEPARATOR '||') AS almacenes_nombres,
             GROUP_CONCAT(ua.almacen_id SEPARATOR ',') AS almacenes_ids
      FROM usuarios u
      LEFT JOIN usuario_almacen ua ON u.id = ua.usuario_id
      LEFT JOIN almacenes a ON ua.almacen_id = a.id
      GROUP BY u.id
      ORDER BY u.nombres
    `);

    const data = rows.map(r => ({
      ...r,
      almacenes: r.almacenes_nombres ? r.almacenes_nombres.split('||').map((n, i) => ({
        id: parseInt(r.almacenes_ids.split(',')[i]),
        nombre: n
      })) : []
    }));

    return { data };
  });

  // GET /api/usuarios/:id
  fastify.get('/:id', async (request, reply) => {
    const [rows] = await pool.query(`
      SELECT u.id, u.carnet, u.nombres, u.apellidos, u.telefono, u.rol, u.estado, u.created_at,
             GROUP_CONCAT(a.nombre SEPARATOR '||') AS almacenes_nombres,
             GROUP_CONCAT(ua.almacen_id SEPARATOR ',') AS almacenes_ids
      FROM usuarios u
      LEFT JOIN usuario_almacen ua ON u.id = ua.usuario_id
      LEFT JOIN almacenes a ON ua.almacen_id = a.id
      WHERE u.id = ?
      GROUP BY u.id
    `, [request.params.id]);

    if (rows.length === 0) return reply.code(404).send({ error: 'Usuario no encontrado' });

    const r = rows[0];
    const data = {
      ...r,
      almacenes: r.almacenes_nombres ? r.almacenes_nombres.split('||').map((n, i) => ({
        id: parseInt(r.almacenes_ids.split(',')[i]),
        nombre: n
      })) : []
    };
    return { data };
  });

  // POST /api/usuarios — Crear usuario
  fastify.post('/', async (request, reply) => {
    const { carnet, nombres, apellidos, telefono, contrasena, rol, almacenes = [] } = request.body;
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

      await connection.commit();
      return reply.code(201).send({ data: { id: newUserId, carnet, nombres, apellidos, rol: rol || 'Usuario' } });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  // PUT /api/usuarios/:id
  fastify.put('/:id', async (request, reply) => {
    const { carnet, nombres, apellidos, telefono, rol, estado, almacenes = [], contrasena } = request.body;
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

      await connection.commit();
      return { data: { id: Number(request.params.id), carnet, nombres, apellidos, rol, estado } };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  });

  // DELETE /api/usuarios/:id
  fastify.delete('/:id', async (request, reply) => {
    const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Usuario no encontrado' });
    return { message: 'Usuario eliminado' };
  });
}

module.exports = usuariosRoutes;
