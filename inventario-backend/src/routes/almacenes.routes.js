/**
 * Rutas CRUD — Almacenes
 */
const { pool } = require('../config/database');

async function almacenesRoutes(fastify) {

  // GET /api/almacenes — Listar todos (con conteo de artículos)
  fastify.get('/', async (request, reply) => {
    const [rows] = await pool.query(`
      SELECT a.id, a.nombre, a.ubicacion, a.descripcion, a.estado, a.created_at,
             COUNT(art.id) AS totalArticulos
      FROM almacenes a
      LEFT JOIN articulos art ON art.almacen_id = a.id
      GROUP BY a.id
      ORDER BY a.nombre
    `);
    return { data: rows };
  });

  // GET /api/almacenes/:id — Obtener uno
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const [rows] = await pool.query('SELECT * FROM almacenes WHERE id = ?', [id]);
    if (rows.length === 0) return reply.code(404).send({ error: 'Almacén no encontrado' });
    return { data: rows[0] };
  });

  // POST /api/almacenes — Crear
  fastify.post('/', async (request, reply) => {
    const { nombre, ubicacion, descripcion } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });

    const [result] = await pool.query(
      'INSERT INTO almacenes (nombre, ubicacion, descripcion) VALUES (?, ?, ?)',
      [nombre, ubicacion || null, descripcion || null]
    );
    return reply.code(201).send({ data: { id: result.insertId, nombre, ubicacion, descripcion } });
  });

  // PUT /api/almacenes/:id — Actualizar
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { nombre, ubicacion, descripcion, estado } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });

    const [result] = await pool.query(
      'UPDATE almacenes SET nombre = ?, ubicacion = ?, descripcion = ?, estado = ? WHERE id = ?',
      [nombre, ubicacion || null, descripcion || null, estado || 'Activo', id]
    );
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Almacén no encontrado' });
    return { data: { id: Number(id), nombre, ubicacion, descripcion, estado } };
  });

  // DELETE /api/almacenes/:id — Eliminar
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const [result] = await pool.query('DELETE FROM almacenes WHERE id = ?', [id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Almacén no encontrado' });
    return { message: 'Almacén eliminado' };
  });
}

module.exports = almacenesRoutes;
