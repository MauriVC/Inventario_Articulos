const { pool } = require('../config/database');

/**
 * Middleware para requerir un permiso específico.
 * @param {string} requiredPermission - El nombre del permiso (ej. 'ELIMINAR_ALMACEN')
 */
function requirePermission(requiredPermission) {
  return async (request, reply) => {
    const userId = request.headers['x-user-id'];
    const userRole = request.headers['x-user-role'];

    if (!userId) {
      return reply.code(401).send({ error: 'No autenticado. Falta X-User-Id' });
    }

    // El SuperAdministrador tiene acceso total a todo por defecto
    if (userRole === 'SuperAdministrador') {
      return;
    }

    // Consultar si el usuario tiene el permiso requerido
    const [rows] = await pool.query(
      `SELECT 1 
       FROM usuario_permiso up
       INNER JOIN permisos p ON up.permiso_id = p.id
       WHERE up.usuario_id = ? AND p.nombre = ?`,
      [userId, requiredPermission]
    );

    if (rows.length === 0) {
      return reply.code(403).send({ error: 'Acceso denegado, no tiene permisos para proceder a esta acción' });
    }
  };
}

module.exports = {
  requirePermission
};
