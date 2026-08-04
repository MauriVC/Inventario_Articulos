/**
 * Rutas CRUD — Unidades de Medida
 */
const { pool } = require('../config/database');
const { registrarActividad } = require('../config/actividadLog');
const { requirePermission } = require('../middleware/auth');
const { validateIdParam, validateConfiguracionBody } = require('../middleware/validation');

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

  fastify.post('/', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateConfiguracionBody] }, async (request, reply) => {
    const { nombre, abreviatura } = request.body;
    try {
      const [result] = await pool.query('INSERT INTO unidad_medidas (nombre, abreviatura) VALUES (?, ?)', [nombre, abreviatura || null]);
      const userId = request.headers['x-user-id'] || null;
      registrarActividad({ tipo: 'REGISTRO', modulo: 'Unidad de Medida', descripcion: `Se registró la unidad "${nombre}"`, usuario_id: userId, referencia_id: result.insertId });
      return reply.code(201).send({ data: { id: result.insertId, nombre, abreviatura } });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && (err.message.includes('Duplicate entry') || err.message.includes('UNIQUE constraint failed')))) {
        return reply.code(400).send({ error: 'Ya existe una unidad de medida con este nombre' });
      }
      throw err;
    }
  });

  fastify.put('/:id', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateIdParam, validateConfiguracionBody] }, async (request, reply) => {
    const { id } = request.params;
    const { nombre, abreviatura, estado } = request.body;
    try {
      const [result] = await pool.query('UPDATE unidad_medidas SET nombre = ?, abreviatura = ?, estado = ? WHERE id = ?', [nombre, abreviatura || null, estado || 'Activo', id]);
      if (result.affectedRows === 0) return reply.code(404).send({ error: 'Unidad no encontrada' });
      const userId = request.headers['x-user-id'] || null;
      registrarActividad({ tipo: 'EDICIÓN', modulo: 'Unidad de Medida', descripcion: `Se editó la unidad "${nombre}"`, usuario_id: userId, referencia_id: Number(id) });
      return { data: { id: Number(id), nombre, abreviatura, estado } };
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && (err.message.includes('Duplicate entry') || err.message.includes('UNIQUE constraint failed')))) {
        return reply.code(400).send({ error: 'Ya existe una unidad de medida con este nombre' });
      }
      throw err;
    }
  });

  fastify.delete('/:id', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateIdParam] }, async (request, reply) => {
    const { id } = request.params;
    const [[unidad]] = await pool.query('SELECT nombre FROM unidad_medidas WHERE id = ?', [id]);
    const [result] = await pool.query('DELETE FROM unidad_medidas WHERE id = ?', [id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Unidad no encontrada' });
    const userId = request.headers['x-user-id'] || null;
    registrarActividad({ tipo: 'BORRADO', modulo: 'Unidad de Medida', descripcion: `Se eliminó la unidad "${unidad ? unidad.nombre : 'ID:'+id}"`, usuario_id: userId, referencia_id: Number(id) });
    return { message: 'Unidad eliminada' };
  });
}

module.exports = unidadesRoutes;
