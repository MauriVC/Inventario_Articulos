/**
 * Rutas CRUD — Categorías (con jerarquía padre/hijo)
 */
const { pool } = require('../config/database');

async function categoriasRoutes(fastify) {

  // GET /api/categorias — Listar todas (incluye nombre del padre si existe)
  fastify.get('/', async (request, reply) => {
    const [rows] = await pool.query(`
      SELECT c.id, c.nombre, c.padre_id, c.descripcion, c.estado, c.created_at,
             p.nombre AS padre_nombre
      FROM categorias c
      LEFT JOIN categorias p ON c.padre_id = p.id
      ORDER BY c.nombre
    `);
    return { data: rows };
  });

  // GET /api/categorias/:id
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const [rows] = await pool.query(`
      SELECT c.*, p.nombre AS padre_nombre
      FROM categorias c
      LEFT JOIN categorias p ON c.padre_id = p.id
      WHERE c.id = ?
    `, [id]);
    if (rows.length === 0) return reply.code(404).send({ error: 'Categoría no encontrada' });
    return { data: rows[0] };
  });

  // POST /api/categorias
  fastify.post('/', async (request, reply) => {
    const { nombre, padre_id, descripcion } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });

    const [result] = await pool.query(
      'INSERT INTO categorias (nombre, padre_id, descripcion) VALUES (?, ?, ?)',
      [nombre, padre_id || null, descripcion || null]
    );
    return reply.code(201).send({ data: { id: result.insertId, nombre, padre_id, descripcion } });
  });

  // PUT /api/categorias/:id
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { nombre, padre_id, descripcion, estado } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });

    const [result] = await pool.query(
      'UPDATE categorias SET nombre = ?, padre_id = ?, descripcion = ?, estado = ? WHERE id = ?',
      [nombre, padre_id || null, descripcion || null, estado || 'Activo', id]
    );
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Categoría no encontrada' });
    return { data: { id: Number(id), nombre, padre_id, descripcion, estado } };
  });

  // DELETE /api/categorias/:id
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const [result] = await pool.query('DELETE FROM categorias WHERE id = ?', [id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Categoría no encontrada' });
    return { message: 'Categoría eliminada' };
  });
}

module.exports = categoriasRoutes;
