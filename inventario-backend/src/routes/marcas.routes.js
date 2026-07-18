/**
 * Rutas CRUD — Marcas
 */
const { pool } = require('../config/database');
const { registrarActividad } = require('../config/actividadLog');
const { requirePermission } = require('../middleware/auth');
const { validateIdParam, validateConfiguracionBody } = require('../middleware/validation');

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

  fastify.post('/', { preHandler: [requirePermission('CONFIGURACION_SISTEMA'), validateConfiguracionBody] }, async (request, reply) => {
    const { nombre, descripcion } = request.body;
    try {
      const [result] = await pool.query('INSERT INTO marcas (nombre, descripcion) VALUES (?, ?)', [nombre, descripcion || null]);
      const userId = request.headers['x-user-id'] || null;
      registrarActividad({ tipo: 'REGISTRO', modulo: 'Marca', descripcion: `Se registró la marca "${nombre}"`, usuario_id: userId, referencia_id: result.insertId });
      return reply.code(201).send({ data: { id: result.insertId, nombre, descripcion } });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && (err.message.includes('Duplicate entry') || err.message.includes('UNIQUE constraint failed')))) {
        return reply.code(400).send({ error: 'Ya existe una marca con este nombre' });
      }
      throw err;
    }
  });

  fastify.put('/:id', { preHandler: [requirePermission('CONFIGURACION_SISTEMA'), validateIdParam, validateConfiguracionBody] }, async (request, reply) => {
    const { nombre, descripcion, estado } = request.body;
    try {
      const [result] = await pool.query('UPDATE marcas SET nombre = ?, descripcion = ?, estado = ? WHERE id = ?', [nombre, descripcion || null, estado || 'Activo', request.params.id]);
      if (result.affectedRows === 0) return reply.code(404).send({ error: 'Marca no encontrada' });
      const userId = request.headers['x-user-id'] || null;
      registrarActividad({ tipo: 'EDICIÓN', modulo: 'Marca', descripcion: `Se editó la marca "${nombre}"`, usuario_id: userId, referencia_id: Number(request.params.id) });
      return { data: { id: Number(request.params.id), nombre, descripcion, estado } };
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && (err.message.includes('Duplicate entry') || err.message.includes('UNIQUE constraint failed')))) {
        return reply.code(400).send({ error: 'Ya existe una marca con este nombre' });
      }
      throw err;
    }
  });

  fastify.delete('/:id', { preHandler: [requirePermission('CONFIGURACION_SISTEMA'), validateIdParam] }, async (request, reply) => {
    const [[marca]] = await pool.query('SELECT nombre FROM marcas WHERE id = ?', [request.params.id]);
    const [result] = await pool.query('DELETE FROM marcas WHERE id = ?', [request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Marca no encontrada' });
    const userId = request.headers['x-user-id'] || null;
    registrarActividad({ tipo: 'BORRADO', modulo: 'Marca', descripcion: `Se eliminó la marca "${marca ? marca.nombre : 'ID:'+request.params.id}"`, usuario_id: userId, referencia_id: Number(request.params.id) });
    return { message: 'Marca eliminada' };
  });
}

module.exports = marcasRoutes;
