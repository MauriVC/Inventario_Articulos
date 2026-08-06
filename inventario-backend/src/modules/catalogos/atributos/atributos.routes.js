/**
 * Rutas CRUD — Atributos y sus Datos (valores)
 * Ej: Atributo "Acabado" → Datos: "Anillado", "Empastado"...
 * Delegadas a catalogo.service.js
 */
const { pool } = require('../../../core/config/database');
const catalogoService = require('../catalogo.service');
const { isDuplicateError } = require('../../../core/helpers/errorHandler');
const { requirePermission } = require('../../../core/middleware/auth');
const { validateIdParam, validateConfiguracionBody, validateDatoAtributoBody } = require('../../../core/middleware/validation');

async function atributosRoutes(fastify) {

  // GET /api/atributos — Listar atributos con sus datos
  fastify.get('/', async () => {
    const [atributos] = await pool.query('SELECT id, nombre, created_at FROM atributos ORDER BY nombre');
    const [datos] = await pool.query('SELECT id, atributo_id, nombre FROM datos ORDER BY nombre');

    const result = atributos.map(attr => ({
      ...attr,
      datos: datos.filter(d => d.atributo_id === attr.id)
    }));
    return { data: result };
  });

  // GET /api/atributos/:id
  fastify.get('/:id', async (request, reply) => {
    try {
      const atributo = await catalogoService.obtenerPorId('atributos', request.params.id, { entityName: 'Atributo' });
      const [datos] = await pool.query('SELECT id, nombre FROM datos WHERE atributo_id = ? ORDER BY nombre', [request.params.id]);
      return { data: { ...atributo, datos } };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // POST /api/atributos — Crear atributo (opcionalmente con datos iniciales)
  fastify.post('/', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateConfiguracionBody] }, async (request, reply) => {
    const { nombre, datos } = request.body;
    try {
      const data = await catalogoService.crear('atributos', {
        columns: ['nombre'],
        values: [nombre],
        modulo: 'Atributo', nombre, entityName: 'el atributo',
        userId: request.headers['x-user-id'] || null,
        responseData: { nombre }
      });

      // Insertar datos si vienen
      if (datos && Array.isArray(datos) && datos.length > 0) {
        const values = datos.map(d => [data.id, d]);
        await pool.query('INSERT INTO datos (atributo_id, nombre) VALUES ?', [values]);
      }

      return reply.code(201).send({ data });
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // PUT /api/atributos/:id — Renombrar atributo
  fastify.put('/:id', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateIdParam, validateConfiguracionBody] }, async (request, reply) => {
    const { nombre } = request.body;
    try {
      const data = await catalogoService.actualizar('atributos', request.params.id, {
        columns: ['nombre'],
        values: [nombre],
        modulo: 'Atributo', nombre, entityName: 'el atributo',
        userId: request.headers['x-user-id'] || null,
        responseData: { nombre }
      });
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // DELETE /api/atributos/:id — Elimina atributo y sus datos en cascada
  fastify.delete('/:id', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateIdParam] }, async (request, reply) => {
    try {
      const result = await catalogoService.eliminar('atributos', request.params.id, {
        modulo: 'Atributo', entityName: 'el atributo', deleteMessage: 'Atributo y sus datos eliminados',
        userId: request.headers['x-user-id'] || null
      });
      return result;
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // --- Sub-rutas para Datos (valores de un atributo) ---

  // POST /api/atributos/:id/datos — Agregar un dato a un atributo
  fastify.post('/:id/datos', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateIdParam, validateDatoAtributoBody] }, async (request, reply) => {
    const { id } = request.params;
    const { nombre } = request.body;

    try {
      const [result] = await pool.query('INSERT INTO datos (atributo_id, nombre) VALUES (?, ?)', [id, nombre]);
      return reply.code(201).send({ data: { id: result.insertId, atributo_id: Number(id), nombre } });
    } catch (err) {
      if (isDuplicateError(err)) {
        return reply.code(400).send({ error: 'Ya existe este dato en el atributo' });
      }
      throw err;
    }
  });

  // DELETE /api/atributos/:id/datos/:datoId — Eliminar un dato
  fastify.delete('/:id/datos/:datoId', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateIdParam] }, async (request, reply) => {
    const [result] = await pool.query('DELETE FROM datos WHERE id = ? AND atributo_id = ?', [request.params.datoId, request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Dato no encontrado' });
    return { message: 'Dato eliminado' };
  });
}

module.exports = atributosRoutes;
