/**
 * Servicio — Autenticación
 */
const { pool } = require('../../core/config/database');
const { hashPassword } = require('../../core/helpers/hashPassword');

/**
 * Verificar credenciales y obtener datos del usuario con permisos
 * @param {string} carnet
 * @param {string} contrasena - Contraseña en texto plano
 * @returns {Object} Datos del usuario + permisos
 * @throws Error con statusCode 401 o 403
 */
async function login(carnet, contrasena) {
  const hashedPass = hashPassword(contrasena);

  const [users] = await pool.query(
    'SELECT id, carnet, nombres, apellidos, rol, estado FROM usuarios WHERE carnet = ? AND contrasena = ?',
    [carnet, hashedPass]
  );

  if (users.length === 0) {
    const error = new Error('Credenciales inválidas');
    error.statusCode = 401;
    throw error;
  }

  const user = users[0];
  if (user.estado === 'Inactivo') {
    const error = new Error('Usuario inactivo. Contacte al administrador.');
    error.statusCode = 403;
    throw error;
  }

  // Obtener permisos del usuario
  const [permsRows] = await pool.query(
    `SELECT p.nombre 
     FROM permisos p
     INNER JOIN usuario_permiso up ON p.id = up.permiso_id
     WHERE up.usuario_id = ?`,
    [user.id]
  );

  return {
    id: user.id,
    carnet: user.carnet,
    nombres: user.nombres,
    apellidos: user.apellidos,
    rol: user.rol,
    permisos: permsRows.map(row => row.nombre)
  };
}

module.exports = { login };
