/**
 * Rutas CRUD — Marcas
 */
const { pool } = require('../config/database');

async function marcasRoutes(fastify) {

  fastify.get('/', async () => {
    const [rows] = await pool.query('SELECT id, nombre, descripcion, estado, created_at FROM marcas ORDER BY nombre');
    return { data: rows };
  });

  fastify.get('/:id', async (request, reply) => {
    const [rows] = await pool.query('SELECT * FROM marcas WHERE id = ?', [request.params.id]);
    if (rows.length === 0) return reply.code(404).send({ error: 'Marca no encontrada' });
    return { data: rows[0] };
  });

  fastify.post('/', async (request, reply) => {
    const { nombre, descripcion } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });
    const [result] = await pool.query('INSERT INTO marcas (nombre, descripcion) VALUES (?, ?)', [nombre, descripcion || null]);
    return reply.code(201).send({ data: { id: result.insertId, nombre, descripcion } });
  });

  fastify.put('/:id', async (request, reply) => {
    const { nombre, descripcion, estado } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });
    const [result] = await pool.query('UPDATE marcas SET nombre = ?, descripcion = ?, estado = ? WHERE id = ?', [nombre, descripcion || null, estado || 'Activo', request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Marca no encontrada' });
    return { data: { id: Number(request.params.id), nombre, descripcion, estado } };
  });

  fastify.delete('/:id', async (request, reply) => {
    const [result] = await pool.query('DELETE FROM marcas WHERE id = ?', [request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Marca no encontrada' });
    return { message: 'Marca eliminada' };
  });
}

module.exports = marcasRoutes;
