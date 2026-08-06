/**
 * Rutas CRUD — Categorías (con jerarquía padre/hijo)
 * Delegadas a catalogo.service.js
 */
const catalogoService = require('../catalogo.service');
const { requirePermission } = require('../../../core/middleware/auth');
const { validateIdParam, validateConfiguracionBody } = require('../../../core/middleware/validation');

async function categoriasRoutes(fastify) {

  // GET /api/categorias — Listar todas (incluye nombre del padre si existe)
  fastify.get('/', async () => {
    const rows = await catalogoService.listar('categorias c', {
      selectFields: 'c.id, c.nombre, c.padre_id, c.descripcion, c.estado, c.created_at, p.nombre AS padre_nombre',
      extraJoins: 'LEFT JOIN categorias p ON c.padre_id = p.id',
      orderBy: 'c.nombre'
    });
    return { data: rows };
  });

  // GET /api/categorias/:id
  fastify.get('/:id', { preHandler: [validateIdParam] }, async (request, reply) => {
    try {
      const data = await catalogoService.obtenerPorId('categorias c', request.params.id, {
        selectFields: 'c.*, p.nombre AS padre_nombre',
        extraJoins: 'LEFT JOIN categorias p ON c.padre_id = p.id',
        wherePrefix: 'c.',
        entityName: 'Categoría'
      });
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // POST /api/categorias
  fastify.post('/', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateConfiguracionBody] }, async (request, reply) => {
    const { nombre, padre_id, descripcion } = request.body;
    try {
      const data = await catalogoService.crear('categorias', {
        columns: ['nombre', 'padre_id', 'descripcion'],
        values: [nombre, padre_id || null, descripcion || null],
        modulo: 'Categoría', nombre, entityName: 'la categoría',
        userId: request.headers['x-user-id'] || null,
        responseData: { nombre, padre_id, descripcion }
      });
      return reply.code(201).send({ data });
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // PUT /api/categorias/:id
  fastify.put('/:id', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateIdParam, validateConfiguracionBody] }, async (request, reply) => {
    const { nombre, padre_id, descripcion, estado } = request.body;
    try {
      const data = await catalogoService.actualizar('categorias', request.params.id, {
        columns: ['nombre', 'padre_id', 'descripcion', 'estado'],
        values: [nombre, padre_id || null, descripcion || null, estado || 'Activo'],
        modulo: 'Categoría', nombre, entityName: 'la categoría',
        userId: request.headers['x-user-id'] || null,
        responseData: { nombre, padre_id, descripcion, estado }
      });
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // DELETE /api/categorias/:id
  fastify.delete('/:id', { preHandler: [requirePermission('GESTIONAR_CONFIGURACION'), validateIdParam] }, async (request, reply) => {
    try {
      const result = await catalogoService.eliminar('categorias', request.params.id, {
        modulo: 'Categoría', entityName: 'la categoría', deleteMessage: 'Categoría eliminada',
        userId: request.headers['x-user-id'] || null
      });
      return result;
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });
}

module.exports = categoriasRoutes;
