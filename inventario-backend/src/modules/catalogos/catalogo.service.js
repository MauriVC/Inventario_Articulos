/**
 * Servicio CRUD genérico para catálogos de configuración
 * Unifica la lógica de: marcas, colores, unidades, categorías, atributos
 */
const { pool } = require('../../core/config/database');
const { registrarActividad } = require('../../core/config/actividadLog');
const { isDuplicateError } = require('../../core/helpers/errorHandler');

/**
 * Listar todos los registros de un catálogo
 * @param {string} table - Nombre de la tabla
 * @param {Object} [options]
 * @param {string} [options.selectFields] - Campos a seleccionar (default: '*')
 * @param {string} [options.extraJoins] - JOINs adicionales
 * @param {string} [options.orderBy] - Campo de ordenamiento (default: 'nombre')
 */
async function listar(table, options = {}) {
  const { selectFields = '*', extraJoins = '', orderBy = 'nombre' } = options;
  const [rows] = await pool.query(`SELECT ${selectFields} FROM ${table} ${extraJoins} ORDER BY ${orderBy}`);
  return rows;
}

/**
 * Obtener un registro por ID
 * @param {string} table - Nombre de la tabla
 * @param {number|string} id
 * @param {Object} [options]
 * @param {string} [options.selectFields] - Campos a seleccionar
 * @param {string} [options.extraJoins] - JOINs adicionales
 * @param {string} [options.wherePrefix] - Prefijo para el WHERE (ej: 'c.' para categorías)
 * @param {string} [options.entityName] - Nombre para el error 404 (ej: 'Marca')
 */
async function obtenerPorId(table, id, options = {}) {
  const { selectFields = '*', extraJoins = '', wherePrefix = '', entityName = 'Registro' } = options;
  const [rows] = await pool.query(
    `SELECT ${selectFields} FROM ${table} ${extraJoins} WHERE ${wherePrefix}id = ?`, [id]
  );
  if (rows.length === 0) {
    const error = new Error(`${entityName} no encontrado/a`);
    error.statusCode = 404;
    throw error;
  }
  return rows[0];
}

/**
 * Crear un registro en un catálogo
 * @param {string} table - Nombre de la tabla
 * @param {Object} options
 * @param {string[]} options.columns - Columnas a insertar
 * @param {Array} options.values - Valores correspondientes a las columnas
 * @param {string} options.modulo - Nombre del módulo para actividad (ej: 'Marca')
 * @param {string} options.nombre - Nombre del registro (para la descripción de actividad)
 * @param {string|number} options.userId - ID del usuario que realiza la acción
 * @param {string} options.entityName - Nombre de la entidad para errores (ej: 'marca')
 * @param {Object} [options.responseData] - Datos extra a devolver en la respuesta
 */
async function crear(table, options) {
  const { columns, values, modulo, nombre, userId, entityName, responseData = {} } = options;
  
  const placeholders = columns.map(() => '?').join(', ');
  const colStr = columns.join(', ');

  try {
    const [result] = await pool.query(
      `INSERT INTO ${table} (${colStr}) VALUES (${placeholders})`, values
    );
    registrarActividad({
      tipo: 'REGISTRO',
      modulo,
      descripcion: `Se registró ${entityName} "${nombre}"`,
      usuario_id: userId,
      referencia_id: result.insertId
    });
    return { id: result.insertId, ...responseData };
  } catch (err) {
    if (isDuplicateError(err)) {
      const error = new Error(`Ya existe un/a ${entityName} con este nombre`);
      error.statusCode = 400;
      throw error;
    }
    throw err;
  }
}

/**
 * Actualizar un registro en un catálogo
 * @param {string} table - Nombre de la tabla
 * @param {number|string} id
 * @param {Object} options
 * @param {string[]} options.columns - Columnas a actualizar
 * @param {Array} options.values - Valores correspondientes
 * @param {string} options.modulo - Módulo para actividad
 * @param {string} options.nombre - Nombre del registro
 * @param {string|number} options.userId - ID del usuario
 * @param {string} options.entityName - Nombre de la entidad
 * @param {Object} [options.responseData] - Datos extra a devolver
 */
async function actualizar(table, id, options) {
  const { columns, values, modulo, nombre, userId, entityName, responseData = {} } = options;

  const setStr = columns.map(col => `${col} = ?`).join(', ');

  try {
    const [result] = await pool.query(
      `UPDATE ${table} SET ${setStr} WHERE id = ?`, [...values, id]
    );
    if (result.affectedRows === 0) {
      const error = new Error(`${entityName} no encontrado/a`);
      error.statusCode = 404;
      throw error;
    }
    registrarActividad({
      tipo: 'EDICIÓN',
      modulo,
      descripcion: `Se editó ${entityName} "${nombre}"`,
      usuario_id: userId,
      referencia_id: Number(id)
    });
    return { id: Number(id), ...responseData };
  } catch (err) {
    if (isDuplicateError(err)) {
      const error = new Error(`Ya existe un/a ${entityName} con este nombre`);
      error.statusCode = 400;
      throw error;
    }
    throw err;
  }
}

/**
 * Eliminar un registro de un catálogo
 * @param {string} table - Nombre de la tabla
 * @param {number|string} id
 * @param {Object} options
 * @param {string} options.modulo - Módulo para actividad
 * @param {string|number} options.userId - ID del usuario
 * @param {string} options.entityName - Nombre de la entidad
 * @param {string} [options.deleteMessage] - Mensaje de respuesta
 */
async function eliminar(table, id, options) {
  const { modulo, userId, entityName, deleteMessage } = options;

  // Obtener nombre antes de eliminar (para el log de actividad)
  const [[registro]] = await pool.query(`SELECT nombre FROM ${table} WHERE id = ?`, [id]);
  const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);

  if (result.affectedRows === 0) {
    const error = new Error(`${entityName} no encontrado/a`);
    error.statusCode = 404;
    throw error;
  }

  registrarActividad({
    tipo: 'BORRADO',
    modulo,
    descripcion: `Se eliminó ${entityName} "${registro ? registro.nombre : 'ID:' + id}"`,
    usuario_id: userId,
    referencia_id: Number(id)
  });

  return { message: deleteMessage || `${entityName} eliminado/a` };
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
