/**
 * Rutas CRUD — Unidades de Medida
 */
const { pool } = require('../config/database');

async function unidadesRoutes(fastify) {

  fastify.get('/', async () => {
    const [rows] = await pool.query('SELECT id, nombre, abreviatura, estado, created_at FROM unidad_medidas ORDER BY nombre');
    return { data: rows };
  });

  fastify.get('/:id', async (request, reply) => {
    const [rows] = await pool.query('SELECT * FROM unidad_medidas WHERE id = ?', [request.params.id]);
    if (rows.length === 0) return reply.code(404).send({ error: 'Unidad no encontrada' });
    return { data: rows[0] };
  });

  fastify.post('/', async (request, reply) => {
    const { nombre, abreviatura } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });
    const [result] = await pool.query('INSERT INTO unidad_medidas (nombre, abreviatura) VALUES (?, ?)', [nombre, abreviatura || null]);
    return reply.code(201).send({ data: { id: result.insertId, nombre, abreviatura } });
  });

  fastify.put('/:id', async (request, reply) => {
    const { nombre, abreviatura, estado } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });
    const [result] = await pool.query('UPDATE unidad_medidas SET nombre = ?, abreviatura = ?, estado = ? WHERE id = ?', [nombre, abreviatura || null, estado || 'Activo', request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Unidad no encontrada' });
    return { data: { id: Number(request.params.id), nombre, abreviatura, estado } };
  });

  fastify.delete('/:id', async (request, reply) => {
    const [result] = await pool.query('DELETE FROM unidad_medidas WHERE id = ?', [request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Unidad no encontrada' });
    return { message: 'Unidad eliminada' };
  });
}

module.exports = unidadesRoutes;
