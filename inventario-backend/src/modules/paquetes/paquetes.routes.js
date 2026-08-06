/**
 * Rutas CRUD — Paquetes (con contenido)
 * Delegadas a paquete.service.js
 * 
 * NOTA: El frontend tiene esta sección oculta visualmente.
 * Los usuarios no interactúan con paquetes actualmente.
 */
const paqueteService = require('./paquete.service');
const { requirePermission } = require('../../core/middleware/auth');
const { validateIdParam, validatePaqueteBody } = require('../../core/middleware/validation');

async function paquetesRoutes(fastify) {

  // GET /api/paquetes — Listar paquetes con su contenido
  fastify.get('/', async (request) => {
    const { almacen_id } = request.query;
    const data = await paqueteService.listar({ almacen_id });
    return { data };
  });

  // GET /api/paquetes/:id — Obtener uno con sus items
  fastify.get('/:id', { preHandler: validateIdParam }, async (request, reply) => {
    try {
      const data = await paqueteService.obtenerPorId(request.params.id);
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // POST /api/paquetes — Crear paquete
  fastify.post('/', { preHandler: [requirePermission('CREAR_ARTICULO'), validatePaqueteBody] }, async (request, reply) => {
    const { nombre, categoria_id, almacen_id, descripcion, items } = request.body;
    try {
      const data = await paqueteService.crear({
        nombre, categoria_id, almacen_id, descripcion, items,
        userId: request.headers['x-user-id'] || null
      });
      return reply.code(201).send({ data });
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // PUT /api/paquetes/:id — Editar paquete
  fastify.put('/:id', { preHandler: [requirePermission('EDITAR_ARTICULO'), validateIdParam, validatePaqueteBody] }, async (request, reply) => {
    const { nombre, categoria_id, observacion, estado, items } = request.body;
    try {
      const data = await paqueteService.actualizar(request.params.id, {
        nombre, categoria_id, observacion, estado, items,
        userId: request.headers['x-user-id'] || null
      });
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // DELETE /api/paquetes/:id — Eliminar paquete
  fastify.delete('/:id', { preHandler: [requirePermission('ELIMINAR_ARTICULO'), validateIdParam] }, async (request, reply) => {
    try {
      const result = await paqueteService.eliminar(request.params.id, request.headers['x-user-id'] || null);
      return result;
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });
}

module.exports = paquetesRoutes;
