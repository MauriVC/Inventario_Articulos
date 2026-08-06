const dashboardService = require('./dashboard.service');

async function dashboardRoutes(fastify) {
  fastify.get('/', async (request, reply) => {
    try {
      const date = request.query.date;
      const userId = request.headers['x-user-id'];
      const userRole = request.headers['x-user-role'];

      const result = await dashboardService.getDashboardStats({ date, userId, userRole });
      return { data: result };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Error cargando dashboard', details: err.message });
    }
  });
}

module.exports = dashboardRoutes;
