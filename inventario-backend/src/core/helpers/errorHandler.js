/**
 * Helper — Detección de errores de entrada duplicada
 * Centraliza la lógica que se repite en categorías, marcas, colores, unidades, atributos
 */

/**
 * Verifica si un error de base de datos es por entrada duplicada (UNIQUE constraint)
 * Compatible con MySQL (ER_DUP_ENTRY) y SQLite (SQLITE_CONSTRAINT_UNIQUE)
 * @param {Error} err - Error lanzado por la base de datos
 * @returns {boolean}
 */
function isDuplicateError(err) {
  return (
    err.code === 'ER_DUP_ENTRY' ||
    err.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    (err.message && (
      err.message.includes('Duplicate entry') ||
      err.message.includes('UNIQUE constraint failed')
    ))
  );
}

module.exports = { isDuplicateError };
