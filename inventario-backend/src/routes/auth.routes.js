/**
 * Rutas CRUD — Autenticación
 */
const { pool } = require('../config/database');
const { registrarActividad } = require('../config/actividadLog');
const { validateLoginBody } = require('../middleware/validation');

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

    // Obtener los permisos del usuario
    const [permsRows] = await pool.query(
      `SELECT p.nombre 
       FROM permisos p
       INNER JOIN usuario_permiso up ON p.id = up.permiso_id
       WHERE up.usuario_id = ?`,
      [user.id]
    );
    const permisos = permsRows.map(row => row.nombre);

    // TODO: Generar JWT token para producción
    return {
      data: {
        id: user.id,
        carnet: user.carnet,
        nombres: user.nombres,
        apellidos: user.apellidos,
        rol: user.rol,
        permisos: permisos
      },
      message: 'Login exitoso'
    };
  });
}

module.exports = authRoutes;
