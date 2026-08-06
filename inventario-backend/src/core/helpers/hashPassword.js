/**
 * Helper — Hash de contraseñas con SHA-256
 * Centraliza la lógica que se repite en auth.routes y usuarios.routes
 */
const crypto = require('crypto');

/**
 * Genera un hash SHA-256 de la contraseña proporcionada
 * @param {string} plainPassword - Contraseña en texto plano
 * @returns {string} Hash hexadecimal SHA-256
 */
function hashPassword(plainPassword) {
  return crypto.createHash('sha256').update(plainPassword).digest('hex');
}

module.exports = { hashPassword };
