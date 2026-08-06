/**
 * Rutas CRUD — Almacenes
 * Delegadas a almacen.service.js
 */
const almacenService = require('./almacen.service');
const { requirePermission } = require('../../core/middleware/auth');
const { validateIdParam, validateAlmacenBody } = require('../../core/middleware/validation');

async function almacenesRoutes(fastify) {

  // GET /api/almacenes — Listar todos (con conteo de artículos)
  fastify.get('/', async (request) => {
    const userId = request.headers['x-user-id'];
    const userRole = request.headers['x-user-role'];
    const rows = await almacenService.listar(userId, userRole);
    return { data: rows };
  });

  // GET /api/almacenes/:id — Obtener uno
  fastify.get('/:id', { preHandler: validateIdParam }, async (request, reply) => {
    try {
      const data = await almacenService.obtenerPorId(request.params.id);
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // POST /api/almacenes — Crear
  fastify.post('/', { preHandler: [requirePermission('CREAR_ALMACEN'), validateAlmacenBody] }, async (request, reply) => {
    const { nombre, ubicacion, descripcion } = request.body;
    const userId = request.headers['x-user-id'] || null;
    try {
      const data = await almacenService.crear({ nombre, ubicacion, descripcion, userId });
      return reply.code(201).send({ data });
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // PUT /api/almacenes/:id — Actualizar
  fastify.put('/:id', { preHandler: [requirePermission('EDITAR_ALMACEN'), validateIdParam, validateAlmacenBody] }, async (request, reply) => {
    const { nombre, ubicacion, descripcion, estado } = request.body;
    const userId = request.headers['x-user-id'] || null;
    try {
      const data = await almacenService.actualizar(request.params.id, { nombre, ubicacion, descripcion, estado, userId });
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // DELETE /api/almacenes/:id — Eliminar
  fastify.delete('/:id', { preHandler: [requirePermission('ELIMINAR_ALMACEN'), validateIdParam] }, async (request, reply) => {
    try {
      const result = await almacenService.eliminar(request.params.id, request.headers['x-user-id'] || null);
      return result;
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });
}

module.exports = almacenesRoutes;
