/**
 * Helper para registrar actividad en el sistema
 * Uso: registrarActividad({ tipo, modulo, descripcion, usuario_id, referencia_id })
 */
const { pool } = require('./database');

async function registrarActividad({ tipo, modulo, descripcion, usuario_id, referencia_id, created_at }) {
  try {
    await pool.query(
      'INSERT INTO actividad_log (tipo, modulo, descripcion, usuario_id, referencia_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [tipo, modulo, descripcion, usuario_id || null, referencia_id || null, created_at || new Date()]
    );
  } catch (error) {
    // No bloquear la operación principal si falla el log
    console.error('Error registrando actividad:', error.message);
  }
}

module.exports = { registrarActividad };
