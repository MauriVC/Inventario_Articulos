/**
 * Rutas CRUD — Unidades de Medida
 * Delegadas a catalogo.service.js
 */
const catalogoService = require('../catalogo.service');
const { requirePermission } = require('../../../core/middleware/auth');
const { validateIdParam, validateConfiguracionBody } = require('../../../core/middleware/validation');

async function unidadesRoutes(fastify) {

  fastify.get('/', async () => {
    const rows = await catalogoService.listar('unidad_medidas', {
      selectFields: 'id, nombre, abreviatura, estado, created_at'
    });
    return { data: rows };
  });

  fastify.get('/:id', async (request, reply) => {
    try {
      const data = await catalogoService.obtenerPorId('unidad_medidas', request.params.id, { entityName: 'Unidad' });
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.post('/', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateConfiguracionBody] }, async (request, reply) => {
    const { nombre, abreviatura } = request.body;
    try {
      const data = await catalogoService.crear('unidad_medidas', {
        columns: ['nombre', 'abreviatura'],
        values: [nombre, abreviatura || null],
        modulo: 'Unidad de Medida', nombre, entityName: 'la unidad',
        userId: request.headers['x-user-id'] || null,
        responseData: { nombre, abreviatura }
      });
      return reply.code(201).send({ data });
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.put('/:id', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateIdParam, validateConfiguracionBody] }, async (request, reply) => {
    const { nombre, abreviatura, estado } = request.body;
    try {
      const data = await catalogoService.actualizar('unidad_medidas', request.params.id, {
        columns: ['nombre', 'abreviatura', 'estado'],
        values: [nombre, abreviatura || null, estado || 'Activo'],
        modulo: 'Unidad de Medida', nombre, entityName: 'la unidad',
        userId: request.headers['x-user-id'] || null,
        responseData: { nombre, abreviatura, estado }
      });
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.delete('/:id', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateIdParam] }, async (request, reply) => {
    try {
      const result = await catalogoService.eliminar('unidad_medidas', request.params.id, {
        modulo: 'Unidad de Medida', entityName: 'la unidad', deleteMessage: 'Unidad eliminada',
        userId: request.headers['x-user-id'] || null
      });
      return result;
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });
}

module.exports = unidadesRoutes;
