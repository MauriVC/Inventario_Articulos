/**
 * Plugin de CORS para Fastify
 * Permite peticiones desde el frontend (Vite/Electron)
 */
const cors = require('@fastify/cors');

async function corsPlugin(fastify) {
  await fastify.register(cors, {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      process.env.CORS_ORIGIN
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  });
}

module.exports = corsPlugin;
