/**
 * Rutas CRUD — Artículos (con items/variantes por color y atributos)
 * Delegadas a articulo.service.js
 */
const articuloService = require('./articulo.service');
const { requirePermission } = require('../../core/middleware/auth');
const { validateIdParam, validateArticuloBody, validateArticuloEstadoBody } = require('../../core/middleware/validation');

async function articulosRoutes(fastify) {

  // GET /api/articulos — Listar artículos con sus variantes y atributos
  fastify.get('/', async (request) => {
    const { almacen_id, categoria_id, estado } = request.query;
    const userId = request.headers['x-user-id'];
    const userRole = request.headers['x-user-role'];

    const data = await articuloService.listar({ almacen_id, categoria_id, estado, userId, userRole });
    return { data };
  });

  // GET /api/articulos/:id — Detalles de un artículo
  fastify.get('/:id', { preHandler: validateIdParam }, async (request, reply) => {
    try {
      const data = await articuloService.obtenerPorId(request.params.id);
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // POST /api/articulos — Crear
  fastify.post('/', { preHandler: [requirePermission('CREAR_ARTICULO'), validateArticuloBody] }, async (request, reply) => {
    const { almacen_id, categoria_id, marca_id, unidad_medida_id, codigo, nombre, descripcion, variantes, dato_ids, requiere_devolucion } = request.body;
    try {
      const data = await articuloService.crear({
        almacen_id, categoria_id, marca_id, unidad_medida_id, codigo, nombre, descripcion,
        variantes, dato_ids, requiere_devolucion,
        userId: request.headers['x-user-id'] || null
      });
      return reply.code(201).send({ data });
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // PUT /api/articulos/:id — Actualizar
  fastify.put('/:id', { preHandler: [requirePermission('EDITAR_ARTICULO'), validateIdParam, validateArticuloBody] }, async (request, reply) => {
    const { almacen_id, categoria_id, marca_id, unidad_medida_id, codigo, nombre, descripcion, variantes, dato_ids, requiere_devolucion } = request.body;
    try {
      const data = await articuloService.actualizar(request.params.id, {
        almacen_id, categoria_id, marca_id, unidad_medida_id, codigo, nombre, descripcion,
        variantes, dato_ids, requiere_devolucion,
        userId: request.headers['x-user-id'] || null
      });
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // PATCH /api/articulos/:id/estado — Cambiar estado
  fastify.patch('/:id/estado', { preHandler: [requirePermission('EDITAR_ARTICULO'), validateIdParam, validateArticuloEstadoBody] }, async (request, reply) => {
    try {
      const data = await articuloService.cambiarEstado(request.params.id, request.body.estado);
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // PATCH /api/articulos/:id/devolucion — Cambiar si requiere devolución
  fastify.patch('/:id/devolucion', { preHandler: [requirePermission('EDITAR_ARTICULO'), validateIdParam] }, async (request, reply) => {
    try {
      const data = await articuloService.cambiarDevolucion(request.params.id, request.body.requiere_devolucion);
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // DELETE /api/articulos/:id — Eliminar
  fastify.delete('/:id', { preHandler: [requirePermission('ELIMINAR_ARTICULO'), validateIdParam] }, async (request, reply) => {
    try {
      const result = await articuloService.eliminar(request.params.id, request.headers['x-user-id'] || null);
      return result;
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });
}

module.exports = articulosRoutes;
