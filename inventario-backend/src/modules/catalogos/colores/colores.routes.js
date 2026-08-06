/**
 * Rutas CRUD — Colores
 * Delegadas a catalogo.service.js
 */
const catalogoService = require('../catalogo.service');
const { requirePermission } = require('../../../core/middleware/auth');
const { validateIdParam, validateConfiguracionBody } = require('../../../core/middleware/validation');

async function coloresRoutes(fastify) {

  fastify.get('/', async () => {
    const rows = await catalogoService.listar('colores', {
      selectFields: 'id, nombre, codigo_hex, estado, created_at'
    });
    return { data: rows };
  });

  fastify.get('/:id', async (request, reply) => {
    try {
      const data = await catalogoService.obtenerPorId('colores', request.params.id, { entityName: 'Color' });
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.post('/', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateConfiguracionBody] }, async (request, reply) => {
    const { nombre, codigo_hex } = request.body;
    try {
      const data = await catalogoService.crear('colores', {
        columns: ['nombre', 'codigo_hex'],
        values: [nombre, codigo_hex || '#CCCCCC'],
        modulo: 'Color', nombre, entityName: 'el color',
        userId: request.headers['x-user-id'] || null,
        responseData: { nombre, codigo_hex }
      });
      return reply.code(201).send({ data });
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.put('/:id', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateIdParam, validateConfiguracionBody] }, async (request, reply) => {
    const { nombre, codigo_hex, estado } = request.body;
    try {
      const data = await catalogoService.actualizar('colores', request.params.id, {
        columns: ['nombre', 'codigo_hex', 'estado'],
        values: [nombre, codigo_hex || '#CCCCCC', estado || 'Activo'],
        modulo: 'Color', nombre, entityName: 'el color',
        userId: request.headers['x-user-id'] || null,
        responseData: { nombre, codigo_hex, estado }
      });
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.delete('/:id', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateIdParam] }, async (request, reply) => {
    try {
      const result = await catalogoService.eliminar('colores', request.params.id, {
        modulo: 'Color', entityName: 'el color', deleteMessage: 'Color eliminado',
        userId: request.headers['x-user-id'] || null
      });
      return result;
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });
}

module.exports = coloresRoutes;
