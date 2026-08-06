/**
 * Rutas CRUD — Marcas
 * Delegadas a catalogo.service.js
 */
const catalogoService = require('../catalogo.service');
const { requirePermission } = require('../../../core/middleware/auth');
const { validateIdParam, validateConfiguracionBody } = require('../../../core/middleware/validation');

async function marcasRoutes(fastify) {

  fastify.get('/', async () => {
    const rows = await catalogoService.listar('marcas', {
      selectFields: 'id, nombre, descripcion, estado, created_at'
    });
    return { data: rows };
  });

  fastify.get('/:id', async (request, reply) => {
    try {
      const data = await catalogoService.obtenerPorId('marcas', request.params.id, { entityName: 'Marca' });
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.post('/', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateConfiguracionBody] }, async (request, reply) => {
    const { nombre, descripcion } = request.body;
    try {
      const data = await catalogoService.crear('marcas', {
        columns: ['nombre', 'descripcion'],
        values: [nombre, descripcion || null],
        modulo: 'Marca', nombre, entityName: 'la marca',
        userId: request.headers['x-user-id'] || null,
        responseData: { nombre, descripcion }
      });
      return reply.code(201).send({ data });
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.put('/:id', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateIdParam, validateConfiguracionBody] }, async (request, reply) => {
    const { nombre, descripcion, estado } = request.body;
    try {
      const data = await catalogoService.actualizar('marcas', request.params.id, {
        columns: ['nombre', 'descripcion', 'estado'],
        values: [nombre, descripcion || null, estado || 'Activo'],
        modulo: 'Marca', nombre, entityName: 'la marca',
        userId: request.headers['x-user-id'] || null,
        responseData: { nombre, descripcion, estado }
      });
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.delete('/:id', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateIdParam] }, async (request, reply) => {
    try {
      const result = await catalogoService.eliminar('marcas', request.params.id, {
        modulo: 'Marca', entityName: 'la marca', deleteMessage: 'Marca eliminada',
        userId: request.headers['x-user-id'] || null
      });
      return result;
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });
}

module.exports = marcasRoutes;
