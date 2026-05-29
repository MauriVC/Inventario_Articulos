/**
 * Rutas CRUD — Usuarios
 */
const { pool } = require('../config/database');

async function usuariosRoutes(fastify) {

  // GET /api/usuarios — Listar usuarios (sin contraseña)
  fastify.get('/', async () => {
    const [rows] = await pool.query(
      'SELECT id, carnet, nombres, apellidos, telefono, rol, estado, created_at FROM usuarios ORDER BY nombres'
    );
    return { data: rows };
  });

  // GET /api/usuarios/:id
  fastify.get('/:id', async (request, reply) => {
    const [rows] = await pool.query(
      'SELECT id, carnet, nombres, apellidos, telefono, rol, estado, created_at FROM usuarios WHERE id = ?',
      [request.params.id]
    );
    if (rows.length === 0) return reply.code(404).send({ error: 'Usuario no encontrado' });
    return { data: rows[0] };
  });

  // POST /api/usuarios — Crear usuario
  fastify.post('/', async (request, reply) => {
    const { carnet, nombres, apellidos, telefono, contrasena, rol } = request.body;
    if (!carnet || !nombres || !apellidos || !contrasena) {
      return reply.code(400).send({ error: 'carnet, nombres, apellidos y contrasena son obligatorios' });
    }

    // TODO: Hash de contraseña con bcrypt antes de producción
    const [result] = await pool.query(
      'INSERT INTO usuarios (carnet, nombres, apellidos, telefono, contrasena, rol) VALUES (?, ?, ?, ?, ?, ?)',
      [carnet, nombres, apellidos, telefono || null, contrasena, rol || 'Usuario']
    );
    return reply.code(201).send({ data: { id: result.insertId, carnet, nombres, apellidos, rol: rol || 'Usuario' } });
  });

  // PUT /api/usuarios/:id
  fastify.put('/:id', async (request, reply) => {
    const { carnet, nombres, apellidos, telefono, rol, estado } = request.body;
    if (!carnet || !nombres || !apellidos) {
      return reply.code(400).send({ error: 'carnet, nombres y apellidos son obligatorios' });
    }
    const [result] = await pool.query(
      'UPDATE usuarios SET carnet = ?, nombres = ?, apellidos = ?, telefono = ?, rol = ?, estado = ? WHERE id = ?',
      [carnet, nombres, apellidos, telefono || null, rol || 'Usuario', estado || 'Activo', request.params.id]
    );
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Usuario no encontrado' });
    return { data: { id: Number(request.params.id), carnet, nombres, apellidos, rol, estado } };
  });

  // DELETE /api/usuarios/:id
  fastify.delete('/:id', async (request, reply) => {
    const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Usuario no encontrado' });
    return { message: 'Usuario eliminado' };
  });
}

module.exports = usuariosRoutes;
