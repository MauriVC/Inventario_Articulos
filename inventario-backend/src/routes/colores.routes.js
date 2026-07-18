/**
 * Rutas CRUD — Colores
 */
const { pool } = require('../config/database');
const { registrarActividad } = require('../config/actividadLog');
const { requirePermission } = require('../middleware/auth');
const { validateIdParam, validateConfiguracionBody } = require('../middleware/validation');

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

  fastify.post('/', { preHandler: [requirePermission('CONFIGURACION_SISTEMA'), validateConfiguracionBody] }, async (request, reply) => {
    const { nombre, codigo_hex } = request.body;
    try {
      const [result] = await pool.query('INSERT INTO colores (nombre, codigo_hex) VALUES (?, ?)', [nombre, codigo_hex || '#CCCCCC']);
      const userId = request.headers['x-user-id'] || null;
      registrarActividad({ tipo: 'REGISTRO', modulo: 'Color', descripcion: `Se registró el color "${nombre}"`, usuario_id: userId, referencia_id: result.insertId });
      return reply.code(201).send({ data: { id: result.insertId, nombre, codigo_hex } });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && (err.message.includes('Duplicate entry') || err.message.includes('UNIQUE constraint failed')))) {
        return reply.code(400).send({ error: 'Ya existe un color con este nombre' });
      }
      throw err;
    }
  });

  fastify.put('/:id', { preHandler: [requirePermission('CONFIGURACION_SISTEMA'), validateIdParam, validateConfiguracionBody] }, async (request, reply) => {
    const { nombre, codigo_hex, estado } = request.body;
    try {
      const [result] = await pool.query('UPDATE colores SET nombre = ?, codigo_hex = ?, estado = ? WHERE id = ?', [nombre, codigo_hex || '#CCCCCC', estado || 'Activo', request.params.id]);
      if (result.affectedRows === 0) return reply.code(404).send({ error: 'Color no encontrado' });
      const userId = request.headers['x-user-id'] || null;
      registrarActividad({ tipo: 'EDICIÓN', modulo: 'Color', descripcion: `Se editó el color "${nombre}"`, usuario_id: userId, referencia_id: Number(request.params.id) });
      return { data: { id: Number(request.params.id), nombre, codigo_hex, estado } };
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && (err.message.includes('Duplicate entry') || err.message.includes('UNIQUE constraint failed')))) {
        return reply.code(400).send({ error: 'Ya existe un color con este nombre' });
      }
      throw err;
    }
  });

  fastify.delete('/:id', { preHandler: [requirePermission('CONFIGURACION_SISTEMA'), validateIdParam] }, async (request, reply) => {
    const [[color]] = await pool.query('SELECT nombre FROM colores WHERE id = ?', [request.params.id]);
    const [result] = await pool.query('DELETE FROM colores WHERE id = ?', [request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Color no encontrado' });
    const userId = request.headers['x-user-id'] || null;
    registrarActividad({ tipo: 'BORRADO', modulo: 'Color', descripcion: `Se eliminó el color "${color ? color.nombre : 'ID:'+request.params.id}"`, usuario_id: userId, referencia_id: Number(request.params.id) });
    return { message: 'Color eliminado' };
  });
}

module.exports = coloresRoutes;
