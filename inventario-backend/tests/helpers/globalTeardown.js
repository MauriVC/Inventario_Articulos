/**
 * globalTeardown.js
 * Corre UNA vez al finalizar toda la suite de tests.
 */
module.exports = async function globalTeardown() {
  // Nada que limpiar a nivel global por ahora.
  // Los tests de integración cierran sus propios recursos en afterAll().
};
