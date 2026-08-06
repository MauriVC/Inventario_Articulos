/**
 * Rutas — Movimientos (Salida, Entrada, Baja)
 * Delegadas a movimiento.service.js
 */
const movimientoService = require('./movimiento.service');
const { requirePermission } = require('../../core/middleware/auth');
const { validateIdParam, validateMovimientoBody } = require('../../core/middleware/validation');

async function movimientosRoutes(fastify) {

  // GET /api/movimientos — Historial con filtros
  fastify.get('/', async (request) => {
    const { tipo, almacen_id, desde, hasta, search, limit, offset } = request.query;
    const userId = request.headers['x-user-id'];
    const userRole = request.headers['x-user-role'];

    const { movimientos, total } = await movimientoService.listar({
      tipo, almacen_id, desde, hasta, search, limit, offset, userId, userRole
    });
    return { data: movimientos, total };
  });

  // GET /api/movimientos/salidas-con-devolucion — Salidas con estado FIFO de devolución
  fastify.get('/salidas-con-devolucion', async () => {
    const data = await movimientoService.salidasConDevolucion();
    return { data };
  });

  // GET /api/movimientos/solicitante/:ci — Autocompletar datos del solicitante
  fastify.get('/solicitante/:ci', async (request, reply) => {
    try {
      const data = await movimientoService.buscarSolicitante(request.params.ci);
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // GET /api/movimientos/pendientes-globales — Artículos pendientes de devolución globales
  fastify.get('/pendientes-globales', async () => {
    const data = await movimientoService.pendientesGlobales();
    return { data };
  });

  // GET /api/movimientos/:id — Obtener detalle
  fastify.get('/:id', { preHandler: [requirePermission('VER_MOVIMIENTOS'), validateIdParam] }, async (request, reply) => {
    try {
      const data = await movimientoService.obtenerPorId(request.params.id);
      return { data };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // POST /api/movimientos — Registrar un movimiento
  const requireMovimientoPermission = async (request, reply) => {
    const { tipo } = request.body;
    if (tipo) {
      const check = requirePermission(`REGISTRAR_${tipo}`);
      await check(request, reply);
    }
  };

  fastify.post('/', { preHandler: [validateMovimientoBody, requireMovimientoPermission] }, async (request, reply) => {
    const {
      tipo, almacen_id, paquete_id,
      solicitante_ci, solicitante_nombre, solicitante_telefono,
      destino_procedencia, motivo_baja, observacion,
      detalles, es_devolucion
    } = request.body;

    try {
      const data = await movimientoService.registrar({
        tipo, almacen_id, paquete_id,
        solicitante_ci, solicitante_nombre, solicitante_telefono,
        destino_procedencia, motivo_baja, observacion,
        detalles, es_devolucion,
        userId: request.headers['x-user-id'] || null
      });
      return reply.code(201).send({ data });
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });
}

module.exports = movimientosRoutes;
