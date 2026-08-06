/**
 * Rutas — Autenticación
 * Delegadas a auth.service.js
 */
const authService = require('./auth.service');
const { validateLoginBody } = require('../../core/middleware/validation');

async function authRoutes(fastify) {

  // POST /api/auth/login
  // Configuramos rate limit específico: máximo 5 intentos por minuto para mitigar ataques de fuerza bruta
  fastify.post('/login', { 
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    },
    preHandler: validateLoginBody 
  }, async (request, reply) => {
    const { carnet, contrasena } = request.body;

    try {
      const userData = await authService.login(carnet, contrasena);
      // TODO: Generar JWT token para producción
      return { data: userData, message: 'Login exitoso' };
    } catch (err) {
      if (err.statusCode) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });
}

module.exports = authRoutes;
