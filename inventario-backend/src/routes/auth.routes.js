/**
 * Rutas de Autenticación — Login
 */
const { pool } = require('../config/database');

async function authRoutes(fastify) {

  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    const { carnet, contrasena } = request.body;
    if (!carnet || !contrasena) {
      return reply.code(400).send({ error: 'carnet y contrasena son obligatorios' });
    }

    const [users] = await pool.query(
      'SELECT id, carnet, nombres, apellidos, rol, estado FROM usuarios WHERE carnet = ? AND contrasena = ?',
      [carnet, contrasena]
    );

    if (users.length === 0) {
      return reply.code(401).send({ error: 'Credenciales inválidas' });
    }

    const user = users[0];
    if (user.estado === 'Inactivo') {
      return reply.code(403).send({ error: 'Usuario inactivo. Contacte al administrador.' });
    }

    // TODO: Generar JWT token para producción
    return {
      data: {
        id: user.id,
        carnet: user.carnet,
        nombres: user.nombres,
        apellidos: user.apellidos,
        rol: user.rol
      },
      message: 'Login exitoso'
    };
  });
}

module.exports = authRoutes;
