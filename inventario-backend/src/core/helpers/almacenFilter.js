/**
 * Helper — Filtro de almacenes por rol de usuario
 * Centraliza la lógica que se repite en almacenes, artículos, movimientos, dashboard, actividad
 *
 * @param {string|number} userId  - ID del usuario actual
 * @param {string} userRole       - Rol del usuario ('SuperAdministrador', 'Administrador', 'Usuario')
 * @param {string} columnRef      - Referencia a la columna de almacén (ej: 'a.almacen_id', 'm.almacen_id')
 * @returns {{ filter: string, params: Array }}
 */
function buildAlmacenFilter(userId, userRole, columnRef = 'almacen_id') {
  const isRestricted = userId && userRole !== 'SuperAdministrador';
  if (!isRestricted) {
    return { filter: '', params: [], isRestricted: false };
  }
  return {
    filter: ` AND ${columnRef} IN (SELECT almacen_id FROM usuario_almacen WHERE usuario_id = ?)`,
    params: [userId],
    isRestricted: true
  };
}

/**
 * Genera la parte de un JOIN para filtro de almacenes (usado por almacenes.routes)
 * @param {string|number} userId
 * @param {string} userRole
 * @returns {{ join: string, params: Array, isRestricted: boolean }}
 */
function buildAlmacenJoinFilter(userId, userRole) {
  const isRestricted = userId && userRole !== 'SuperAdministrador';
  if (!isRestricted) {
    return { join: '', where: '', params: [], isRestricted: false };
  }
  return {
    join: ' INNER JOIN usuario_almacen ua ON ua.almacen_id = a.id',
    where: ' WHERE ua.usuario_id = ?',
    params: [userId],
    isRestricted: true
  };
}

/**
 * Genera filtro de actividad por rol (usado por dashboard y actividad)
 * @param {string} userRole
 * @param {string} [userAlias='u'] - Alias de la tabla usuarios
 * @returns {string}
 */
function buildRoleFilterAct(userRole, userAlias = 'u') {
  if (userRole === 'Administrador') {
    return ` AND (${userAlias}.rol = 'Administrador' OR ${userAlias}.rol = 'Usuario' OR ${userAlias}.rol IS NULL)`;
  } else if (userRole === 'Usuario') {
    return ` AND (${userAlias}.rol = 'Usuario' OR ${userAlias}.rol IS NULL)`;
  }
  return '';
}

module.exports = { buildAlmacenFilter, buildAlmacenJoinFilter, buildRoleFilterAct };
