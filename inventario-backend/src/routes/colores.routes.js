/**
 * Rutas CRUD — Colores
 */
const { pool } = require('../config/database');

async function coloresRoutes(fastify) {

  fastify.get('/', async () => {
    const [rows] = await pool.query('SELECT id, nombre, codigo_hex, estado, created_at FROM colores ORDER BY nombre');
    return { data: rows };
  });

  fastify.get('/:id', async (request, reply) => {
    const [rows] = await pool.query('SELECT * FROM colores WHERE id = ?', [request.params.id]);
    if (rows.length === 0) return reply.code(404).send({ error: 'Color no encontrado' });
    return { data: rows[0] };
  });

  fastify.post('/', async (request, reply) => {
    const { nombre, codigo_hex } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });
    const [result] = await pool.query('INSERT INTO colores (nombre, codigo_hex) VALUES (?, ?)', [nombre, codigo_hex || '#CCCCCC']);
    return reply.code(201).send({ data: { id: result.insertId, nombre, codigo_hex } });
  });

  fastify.put('/:id', async (request, reply) => {
    const { nombre, codigo_hex, estado } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });
    const [result] = await pool.query('UPDATE colores SET nombre = ?, codigo_hex = ?, estado = ? WHERE id = ?', [nombre, codigo_hex || '#CCCCCC', estado || 'Activo', request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Color no encontrado' });
    return { data: { id: Number(request.params.id), nombre, codigo_hex, estado } };
  });

  fastify.delete('/:id', async (request, reply) => {
    const [result] = await pool.query('DELETE FROM colores WHERE id = ?', [request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Color no encontrado' });
    return { message: 'Color eliminado' };
  });
}

module.exports = coloresRoutes;
