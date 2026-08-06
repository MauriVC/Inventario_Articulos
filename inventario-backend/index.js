const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const fastify = require('fastify')({ 
  logger: true,
  bodyLimit: 1048576 // Límite estricto de 1MB para los payloads
});
const { testConnection, closeSqlite } = require('./src/core/config/database');
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');
const registerRoutes = require('./src/modules');

// ─── Seguridad y Rate Limit Global ───
fastify.register(helmet, {
  contentSecurityPolicy: false // Para que no haya conflicto si usas VUE en algún momento integrado
});
fastify.register(rateLimit, {
  max: 100, // Máximo 100 peticiones globales
  timeWindow: '1 minute'
});

// ─── CORS ───
fastify.register(cors, {
  origin: true, // Permite cualquier origen en desarrollo
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
});

// ─── Rutas ───
fastify.register(registerRoutes);

// ─── Health Check ───
fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// ─── Error Handler Global ───
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  const statusCode = error.statusCode || 500;
  reply.code(statusCode).send({
    error: statusCode === 500 ? 'Error interno del servidor' : error.message,
    details: error.message
  });
});

// ─── Arrancar Servidor ───
const start = async () => {
  try {
    // Verificar conexión a BD (no bloquea el arranque)
    try {
      await testConnection();
      fastify.log.info('✓ Conexión a MySQL (Aiven) verificada');
    } catch (dbErr) {
      fastify.log.warn(`⚠ No se pudo conectar a MySQL: ${dbErr.message}`);
      fastify.log.warn('  El servidor arrancará pero las rutas que usan BD fallarán');
    }

    const port = Number(process.env.PORT) || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`✓ API escuchando en http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(`✗ Error al iniciar el servidor: ${err.message}`);
    process.exit(1);
  }
};

async function shutdown() {
  try { await fastify.close(); } catch (e) { /* ignore */ }
  closeSqlite();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('message', (msg) => {
  if (msg === 'shutdown') shutdown();
});

start();