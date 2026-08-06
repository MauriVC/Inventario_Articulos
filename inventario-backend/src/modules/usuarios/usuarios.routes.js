/**
 * Rutas CRUD — Usuarios
 * Delegadas a usuario.service.js
 */
const usuarioService = require('./usuario.service');
const { requirePermission } = require('../../core/middleware/auth');
const { validateIdParam, validateUsuarioBody } = require('../../core/middleware/validation');

async function usuariosRoutes(fastify) {

  // GET /api/usuarios/permisos — Listar todos los permisos disponibles
  fastify.get('/permisos', { preHandler: requirePermission('GESTIONAR_USUARIOS') }, async () => {
    const rows = await usuarioService.listarPermisos();
    return { data: rows };
  });

  // GET /api/usuarios — Listar usuarios (sin contraseña)
  fastify.get('/', { preHandler: requirePermission('GESTIONAR_USUARIOS') }, async () => {
    const data = await usuarioService.listar();
    return { data };
  });

  // GET /api/usuarios/:id
  fastify.get('/:id', { preHandler: [requirePermission('GESTIONAR_USUARIOS'), validateIdParam] }, async (request, reply) => {
    try {
      const data = await usuarioService.obtenerPorId(request.params.id);
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // POST /api/usuarios — Crear usuario
  fastify.post('/', { preHandler: [requirePermission('GESTIONAR_USUARIOS'), validateUsuarioBody] }, async (request, reply) => {
    const { carnet, nombres, apellidos, telefono, contrasena, rol, almacenes, permisos } = request.body;
    try {
      const data = await usuarioService.crear({
        carnet, nombres, apellidos, telefono, contrasena, rol, almacenes, permisos,
        creatorId: request.headers['x-user-id'] || null
      });
      return reply.code(201).send({ data });
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // PUT /api/usuarios/:id
  fastify.put('/:id', { preHandler: [requirePermission('GESTIONAR_USUARIOS'), validateIdParam, validateUsuarioBody] }, async (request, reply) => {
    const { carnet, nombres, apellidos, telefono, rol, estado, almacenes, permisos, contrasena } = request.body;
    try {
      const data = await usuarioService.actualizar(request.params.id, {
        carnet, nombres, apellidos, telefono, rol, estado, almacenes, permisos, contrasena,
        editorId: request.headers['x-user-id'] || null
      });
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // DELETE /api/usuarios/:id
  fastify.delete('/:id', { preHandler: [requirePermission('GESTIONAR_USUARIOS'), validateIdParam] }, async (request, reply) => {
    try {
      const result = await usuarioService.eliminar(request.params.id, request.headers['x-user-id'] || null);
      return result;
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });
}

module.exports = usuariosRoutes;
