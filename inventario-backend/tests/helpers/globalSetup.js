/**
 * globalSetup.js
 * Corre UNA vez antes de toda la suite de tests.
 * Establece variables de entorno base para el modo de test.
 */
module.exports = async function globalSetup() {
  // Asegurarse de que nunca se use la BD de producción durante los tests
  process.env.NODE_ENV = 'test';
  process.env.DB_MODE = 'local';
  process.env.PORT = '0'; // Puerto dinámico para evitar conflictos
};
