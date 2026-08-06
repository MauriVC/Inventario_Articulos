/**
 * Rutas — Historial de Actividades (unificado)
 */
const actividadService = require('./actividad.service');

async function actividadRoutes(fastify) {

  // GET /api/actividad — Historial unificado con paginación y filtros
  fastify.get('/', async (request, reply) => {
    try {
      const { tipo, modulo, desde, hasta, search, limit, offset, usuario_id } = request.query;
      const userRole = request.headers['x-user-role'];

      const result = await actividadService.listar({
        tipo, modulo, desde, hasta, search, limit, offset, usuario_id, userRole
      });

      return result;
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Error al listar actividad', details: err.message });
    }
  });

  // GET /api/actividad/:origen/:id — Detalle (movimiento o actividad)
  fastify.get('/:origen/:id', async (request, reply) => {
    try {
      const { origen, id } = request.params;
      const data = await actividadService.obtenerPorId(origen, id);
      return { data };
    } catch (err) {
      if (err.statusCode) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      request.log.error(err);
      return reply.code(500).send({ error: 'Error al obtener detalle de actividad', details: err.message });
    }
  });

  // GET /api/actividad/recientes/dashboard — Para el dashboard
  fastify.get('/recientes/dashboard', async (request, reply) => {
    try {
      const userId = request.headers['x-user-id'];
      const userRole = request.headers['x-user-role'];
      const data = await actividadService.listarRecientesDashboard(userId, userRole);
      return { data };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Error al obtener actividades recientes', details: err.message });
    }
  });
}

module.exports = actividadRoutes;
