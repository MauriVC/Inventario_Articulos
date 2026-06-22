require('dotenv').config();

const fastify = require('fastify')({ logger: true });
const { testConnection } = require('./src/config/database');
const cors = require('@fastify/cors');
const registerRoutes = require('./src/routes');

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
    ...(process.env.NODE_ENV !== 'production' && { details: error.message })
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

start();