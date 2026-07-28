/**
 * buildTestApp.js
 * Construye una instancia Fastify aislada para tests de integración.
 * La BD ya fue inyectada vía injectTestDb() antes de llamar esta función.
 */
const Fastify = require('fastify');

async function buildTestApp() {
  const app = Fastify({ logger: false });

  await app.register(require('@fastify/cors'), { origin: true });
  await app.register(require('@fastify/helmet'), { contentSecurityPolicy: false });

  // Las rutas usan pool de database.js, que ya tiene sqliteDb inyectada
  const registerRoutes = require('../../src/routes');
  await app.register(registerRoutes);

  app.get('/api/health', async () => ({ status: 'ok' }));

  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;
    reply.code(statusCode).send({
      error: statusCode === 500 ? 'Error interno del servidor' : error.message,
      details: error.message
    });
  });

  await app.ready();
  return app;
}

module.exports = { buildTestApp };
