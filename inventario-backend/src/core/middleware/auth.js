const { pool } = require('../config/database');
const { verifyToken } = require('../helpers/jwt');

/**
 * Rutas públicas que no requieren token JWT
 */
const PUBLIC_ROUTES = ['/api/auth/login', '/api/health'];

/**
 * Middleware de autenticación (onRequest global).
 * Verifica el token JWT (Authorization: Bearer <token>), deja los datos del
 * usuario en request.user y sobrescribe los headers legados x-user-id/x-user-role
 * con los datos verificados del token (neutraliza la suplantación por headers).
 */
async function authenticate(request, reply) {
  // Preflight CORS y rutas públicas no requieren token
  if (request.method === 'OPTIONS') return;
  if (PUBLIC_ROUTES.includes(request.raw.url.split('?')[0])) return;

  const authHeader = request.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return reply.code(401).send({ error: 'No autenticado. Token JWT requerido' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return reply.code(401).send({ error: 'Sesión inválida o expirada. Inicie sesión nuevamente' });
  }

  // Datos verificados del usuario para el resto de la aplicación
  request.user = {
    id: payload.id,
    rol: payload.rol,
    carnet: payload.carnet
  };

  // Sobrescribir headers legados con datos verificados del token
  request.headers['x-user-id'] = String(payload.id);
  request.headers['x-user-role'] = payload.rol || '';
}

/**
 * Middleware para requerir un permiso específico.
 * @param {string} requiredPermission - El nombre del permiso (ej. 'ELIMINAR_ALMACEN')
 */
function requirePermission(requiredPermission) {
  return async (request, reply) => {
    const user = request.user;

    if (!user || !user.id) {
      return reply.code(401).send({ error: 'No autenticado' });
    }

    // El SuperAdministrador tiene acceso total a todo por defecto
    if (user.rol === 'SuperAdministrador') {
      return;
    }

    // Consultar si el usuario tiene el permiso requerido
    const [rows] = await pool.query(
      `SELECT 1 
       FROM usuario_permiso up
       INNER JOIN permisos p ON up.permiso_id = p.id
       WHERE up.usuario_id = ? AND p.nombre = ?`,
      [user.id, requiredPermission]
    );

    if (rows.length === 0) {
      return reply.code(403).send({ error: 'Acceso denegado, no tiene permisos para proceder a esta acción' });
    }
  };
}

module.exports = {
  requirePermission,
  authenticate
};
