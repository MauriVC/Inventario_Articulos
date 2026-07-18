/**
 * Rutas CRUD — Categorías (con jerarquía padre/hijo)
 */
const { pool } = require('../config/database');
const { registrarActividad } = require('../config/actividadLog');
const { requirePermission } = require('../middleware/auth');
const { validateIdParam, validateConfiguracionBody } = require('../middleware/validation');

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
  fastify.get('/:id', { preHandler: [validateIdParam] }, async (request, reply) => {
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
  fastify.post('/', { preHandler: [requirePermission('CONFIGURACION_SISTEMA'), validateConfiguracionBody] }, async (request, reply) => {
    const { nombre, padre_id, descripcion } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });

    try {
      const [result] = await pool.query(
        'INSERT INTO categorias (nombre, padre_id, descripcion) VALUES (?, ?, ?)',
        [nombre, padre_id || null, descripcion || null]
      );
      const userId = request.headers['x-user-id'] || null;
      registrarActividad({ tipo: 'REGISTRO', modulo: 'Categoría', descripcion: `Se registró la categoría "${nombre}"`, usuario_id: userId, referencia_id: result.insertId });
      return reply.code(201).send({ data: { id: result.insertId, nombre, padre_id, descripcion } });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && (err.message.includes('Duplicate entry') || err.message.includes('UNIQUE constraint failed')))) {
        return reply.code(400).send({ error: 'Ya existe una categoría con este nombre' });
      }
      throw err;
    }
  });

  // PUT /api/categorias/:id
  fastify.put('/:id', { preHandler: [requirePermission('CONFIGURACION_SISTEMA'), validateIdParam, validateConfiguracionBody] }, async (request, reply) => {
    const { id } = request.params;
    const { nombre, padre_id, descripcion, estado } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });

    try {
      const [result] = await pool.query(
        'UPDATE categorias SET nombre = ?, padre_id = ?, descripcion = ?, estado = ? WHERE id = ?',
        [nombre, padre_id || null, descripcion || null, estado || 'Activo', id]
      );
      if (result.affectedRows === 0) return reply.code(404).send({ error: 'Categoría no encontrada' });
      const userId = request.headers['x-user-id'] || null;
      registrarActividad({ tipo: 'EDICIÓN', modulo: 'Categoría', descripcion: `Se editó la categoría "${nombre}"`, usuario_id: userId, referencia_id: Number(id) });
      return { data: { id: Number(id), nombre, padre_id, descripcion, estado } };
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && (err.message.includes('Duplicate entry') || err.message.includes('UNIQUE constraint failed')))) {
        return reply.code(400).send({ error: 'Ya existe una categoría con este nombre' });
      }
      throw err;
    }
  });

  // DELETE /api/categorias/:id
  fastify.delete('/:id', { preHandler: [requirePermission('CONFIGURACION_SISTEMA'), validateIdParam] }, async (request, reply) => {
    const { id } = request.params;
    const [[cat]] = await pool.query('SELECT nombre FROM categorias WHERE id = ?', [id]);
    const [result] = await pool.query('DELETE FROM categorias WHERE id = ?', [id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Categoría no encontrada' });
    const userId = request.headers['x-user-id'] || null;
    registrarActividad({ tipo: 'BORRADO', modulo: 'Categoría', descripcion: `Se eliminó la categoría "${cat ? cat.nombre : 'ID:'+id}"`, usuario_id: userId, referencia_id: Number(id) });
    return { message: 'Categoría eliminada' };
  });
}

module.exports = categoriasRoutes;
