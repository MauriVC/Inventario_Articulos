/**
 * Helper — JWT (firma y verificación de tokens)
 * Usa JWT_SECRET desde las variables de entorno. En desarrollo usa un secreto
 * de respaldo con advertencia, pero en producción JWT_SECRET es obligatorio.
 */
const jwt = require('jsonwebtoken');

const DEV_FALLBACK_SECRET = 'inventario-dev-secret-do-not-use-in-prod';
const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

function getSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET es obligatorio en producción');
  }
  console.warn('[JWT] ⚠ Usando secreto de desarrollo. Define JWT_SECRET en .env');
  return DEV_FALLBACK_SECRET;
}

/**
 * Firmar un token JWT
 * @param {Object} payload - Datos que viajan en el token (id, rol, carnet)
 * @returns {string} Token firmado
 */
function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_EXPIRES_IN });
}

/**
 * Verificar y decodificar un token JWT
 * @param {string} token
 * @returns {Object} Payload decodificado
 * @throws Error si el token es inválido o expiró
 */
function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { signToken, verifyToken };
