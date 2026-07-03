/**
 * Rutas CRUD — Almacenes
 */
const { pool } = require('../config/database');

async function almacenesRoutes(fastify) {

  // GET /api/almacenes — Listar todos (con conteo de artículos)
  fastify.get('/', async (request, reply) => {
    const userId = request.headers['x-user-id'];
    const userRole = request.headers['x-user-role'];

    let query = `
      SELECT a.id, a.nombre, a.ubicacion, a.descripcion, a.estado, a.created_at,
             COUNT(art.id) AS totalArticulos,
             CONCAT(u.nombres, ' ', u.apellidos) AS responsable_nombre
      FROM almacenes a
      LEFT JOIN articulos art ON art.almacen_id = a.id
      LEFT JOIN usuarios u ON a.created_by = u.id
    `;
    const params = [];

    // Filtrar si no es SuperAdministrador
    if (userId && userRole !== 'SuperAdministrador') {
      query += `
        INNER JOIN usuario_almacen ua ON ua.almacen_id = a.id
        WHERE ua.usuario_id = ?
      `;
      params.push(userId);
    }

    query += `
      GROUP BY a.id
      ORDER BY a.nombre
    `;

    const [rows] = await pool.query(query, params);
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
    const userId = request.headers['x-user-id'] || null;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });

    const [result] = await pool.query(
      'INSERT INTO almacenes (nombre, ubicacion, descripcion, created_by) VALUES (?, ?, ?, ?)',
      [nombre, ubicacion || null, descripcion || null, userId]
    );
    return reply.code(201).send({ data: { id: result.insertId, nombre, ubicacion, descripcion, created_by: userId } });
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
