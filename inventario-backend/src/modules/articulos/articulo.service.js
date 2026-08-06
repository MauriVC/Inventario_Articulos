/**
 * Servicio — Artículos (con variantes/items por color y atributos)
 */
const { pool } = require('../../core/config/database');
const { registrarActividad } = require('../../core/config/actividadLog');
const { buildAlmacenFilter } = require('../../core/helpers/almacenFilter');

// --- Utilidades de generación de código ---

function obtenerPrimerasTresLetras(texto) {
  if (!texto || texto.trim() === '') return '';
  texto = texto.trim().toUpperCase();
  const letrasMatch = texto.match(/[A-ZÁÉÍÓÚÑ]/gu);
  if (!letrasMatch) return '';
  let letras = letrasMatch.slice(0, 3);
  while (letras.length < 3) letras.push('X');
  return letras.join('');
}

function generarPalabraCodigo(nombre, categoria) {
  const NOMBRES_ESPECIFICOS = {
    'CARTA': 'CAR',
    'MEDIO OFICIO': 'MEOF',
    'OFICIO': 'OF',
    'PAQUETE': 'PACK'
  };
  const nombreUpper = nombre.trim().toUpperCase();
  for (const [palabra, codigo] of Object.entries(NOMBRES_ESPECIFICOS)) {
    if (nombreUpper.includes(palabra)) return codigo;
  }
  const letrasNombre = obtenerPrimerasTresLetras(nombre);
  if (categoria) {
    const letrasCategoria = obtenerPrimerasTresLetras(categoria);
    return letrasNombre + letrasCategoria;
  }
  return letrasNombre;
}

/**
 * Generar código auto-incremental inteligente para un artículo
 * @param {Object} conn - Conexión de la transacción
 * @param {string} nombre - Nombre del artículo
 * @param {number} categoria_id
 * @returns {string} Código generado
 */
async function generarCodigoArticulo(conn, nombre, categoria_id) {
  const [[categoria]] = await conn.query('SELECT nombre FROM categorias WHERE id = ?', [categoria_id]);
  const categoriaNombre = categoria ? categoria.nombre : '';
  const prefix = generarPalabraCodigo(nombre, categoriaNombre);

  const [existentes] = await conn.query(
    "SELECT codigo FROM articulos WHERE codigo LIKE ?",
    [`${prefix}-%`]
  );

  let nextNum = 1;
  if (existentes.length > 0) {
    const numeros = existentes.map(row => {
      const parts = row.codigo.split('-');
      return parseInt(parts[parts.length - 1], 10) || 0;
    });
    nextNum = Math.max(...numeros) + 1;
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

// --- Operaciones CRUD ---

/**
 * Listar artículos con variantes y atributos
 */
async function listar({ almacen_id, categoria_id, estado, userId, userRole }) {
  let where = '1=1';
  const params = [];

  const almFilter = buildAlmacenFilter(userId, userRole, 'a.almacen_id');
  if (almFilter.isRestricted) {
    where += almFilter.filter;
    params.push(...almFilter.params);
  }

  if (almacen_id) { where += ' AND a.almacen_id = ?'; params.push(almacen_id); }
  if (categoria_id) { where += ' AND a.categoria_id = ?'; params.push(categoria_id); }
  if (estado) { where += ' AND a.estado = ?'; params.push(estado); }

  const [articulos] = await pool.query(`
    SELECT a.id, a.codigo, a.nombre, a.descripcion, a.requiere_devolucion, a.estado,
           a.almacen_id, alm.nombre AS almacen_nombre,
           a.categoria_id, cat.nombre AS categoria_nombre,
           a.marca_id, mar.nombre AS marca_nombre,
           a.unidad_medida_id, um.nombre AS unidad_nombre, um.abreviatura AS unidad_abreviatura,
           a.created_at,
           CONCAT(u.nombres, ' ', u.apellidos) AS responsable_nombre
    FROM articulos a
    JOIN almacenes alm ON a.almacen_id = alm.id
    JOIN categorias cat ON a.categoria_id = cat.id
    LEFT JOIN marcas mar ON a.marca_id = mar.id
    JOIN unidad_medidas um ON a.unidad_medida_id = um.id
    LEFT JOIN usuarios u ON a.created_by = u.id
    WHERE ${where}
    ORDER BY a.nombre
  `, params);

  if (articulos.length === 0) return [];

  const ids = articulos.map(a => a.id);

  const [
    [items],
    [datosAsignados]
  ] = await Promise.all([
    pool.query(`
      SELECT ai.id, ai.articulo_id, ai.stock, ai.estado,
             c.nombre AS color_nombre, c.codigo_hex
      FROM articulo_items ai
      JOIN colores c ON ai.color_id = c.id
      WHERE ai.articulo_id IN (?)
      ORDER BY c.nombre
    `, [ids]),
    pool.query(`
      SELECT ad.articulo_id, d.nombre AS dato_nombre, at.nombre AS atributo_nombre
      FROM articulo_datos ad
      JOIN datos d ON ad.dato_id = d.id
      JOIN atributos at ON d.atributo_id = at.id
      WHERE ad.articulo_id IN (?)
    `, [ids])
  ]);

  return articulos.map(art => ({
    ...art,
    variantes: items.filter(i => i.articulo_id === art.id),
    stock_total: items.filter(i => i.articulo_id === art.id).reduce((sum, i) => sum + i.stock, 0),
    atributos: datosAsignados.filter(d => d.articulo_id === art.id).map(d => d.dato_nombre)
  }));
}

/**
 * Obtener un artículo por ID con variantes y atributos
 */
async function obtenerPorId(id) {
  const [articulos] = await pool.query(`
    SELECT a.*, alm.nombre AS almacen_nombre, cat.nombre AS categoria_nombre,
           mar.nombre AS marca_nombre, um.nombre AS unidad_nombre
    FROM articulos a
    JOIN almacenes alm ON a.almacen_id = alm.id
    JOIN categorias cat ON a.categoria_id = cat.id
    LEFT JOIN marcas mar ON a.marca_id = mar.id
    JOIN unidad_medidas um ON a.unidad_medida_id = um.id
    WHERE a.id = ?
  `, [id]);

  if (articulos.length === 0) {
    const error = new Error('Artículo no encontrado');
    error.statusCode = 404;
    throw error;
  }

  const [
    [variantes],
    [atributos]
  ] = await Promise.all([
    pool.query(`
      SELECT ai.id, ai.stock, ai.estado, c.id AS color_id, c.nombre AS color_nombre, c.codigo_hex
      FROM articulo_items ai JOIN colores c ON ai.color_id = c.id
      WHERE ai.articulo_id = ?
    `, [id]),
    pool.query(`
      SELECT d.id AS dato_id, d.nombre AS dato_nombre, at.nombre AS atributo_nombre
      FROM articulo_datos ad
      JOIN datos d ON ad.dato_id = d.id
      JOIN atributos at ON d.atributo_id = at.id
      WHERE ad.articulo_id = ?
    `, [id])
  ]);

  return {
    ...articulos[0],
    variantes,
    stock_total: variantes.reduce((sum, v) => sum + v.stock, 0),
    atributos: atributos.map(a => ({ atributo: a.atributo_nombre, dato: a.dato_nombre, dato_id: a.dato_id }))
  };
}

/**
 * Crear un artículo con variantes y atributos en transacción
 */
async function crear({ almacen_id, categoria_id, marca_id, unidad_medida_id, codigo, nombre, descripcion, variantes = [], dato_ids = [], requiere_devolucion = false, userId }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let finalCodigo = codigo;
    if (!finalCodigo || !finalCodigo.trim()) {
      finalCodigo = await generarCodigoArticulo(conn, nombre, categoria_id);
    }

    const [artResult] = await conn.query(
      'INSERT INTO articulos (almacen_id, categoria_id, marca_id, unidad_medida_id, codigo, nombre, descripcion, requiere_devolucion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [almacen_id, categoria_id, marca_id || null, unidad_medida_id, finalCodigo, nombre, descripcion || null, requiere_devolucion ? 1 : 0]
    );
    const articuloId = artResult.insertId;

    if (variantes && variantes.length > 0) {
      const vals = variantes.map(v => [articuloId, v.color_id, v.stock || 0]);
      await conn.query('INSERT INTO articulo_items (articulo_id, color_id, stock) VALUES ?', [vals]);
    }

    if (dato_ids && dato_ids.length > 0) {
      const vals = dato_ids.map(did => [articuloId, did]);
      await conn.query('INSERT INTO articulo_datos (articulo_id, dato_id) VALUES ?', [vals]);
    }

    await conn.commit();
    registrarActividad({ tipo: 'REGISTRO', modulo: 'Artículo', descripcion: `Se registró el artículo "${nombre}" (${finalCodigo})`, usuario_id: userId, referencia_id: articuloId });
    return { id: articuloId, nombre };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Actualizar un artículo con variantes y atributos en transacción
 */
async function actualizar(id, { almacen_id, categoria_id, marca_id, unidad_medida_id, codigo, nombre, descripcion, variantes = [], dato_ids = [], requiere_devolucion, userId }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'UPDATE articulos SET almacen_id = ?, categoria_id = ?, marca_id = ?, unidad_medida_id = ?, codigo = ?, nombre = ?, descripcion = ?, requiere_devolucion = ? WHERE id = ?',
      [almacen_id, categoria_id, marca_id || null, unidad_medida_id, codigo || null, nombre, descripcion || null, requiere_devolucion ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      const error = new Error('Artículo no encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Actualizar atributos (borrar y recrear, no afectan historial)
    await conn.query('DELETE FROM articulo_datos WHERE articulo_id = ?', [id]);
    if (dato_ids && dato_ids.length > 0) {
      const vals = dato_ids.map(did => [id, did]);
      await conn.query('INSERT INTO articulo_datos (articulo_id, dato_id) VALUES ?', [vals]);
    }

    // Actualizar variantes (upsert seguro para no romper FK del historial)
    if (variantes && variantes.length > 0) {
      for (const v of variantes) {
        const [exists] = await conn.query('SELECT id FROM articulo_items WHERE articulo_id = ? AND color_id = ?', [id, v.color_id]);
        if (exists.length > 0) {
          await conn.query('UPDATE articulo_items SET stock = ? WHERE id = ?', [v.stock || 0, exists[0].id]);
        } else {
          await conn.query('INSERT INTO articulo_items (articulo_id, color_id, stock) VALUES (?, ?, ?)', [id, v.color_id, v.stock || 0]);
        }
      }
    }

    await conn.commit();
    registrarActividad({ tipo: 'EDICIÓN', modulo: 'Artículo', descripcion: `Se editó el artículo "${nombre}"`, usuario_id: userId, referencia_id: Number(id) });
    return { id: Number(id), nombre };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Cambiar estado de un artículo y sus variantes
 */
async function cambiarEstado(id, estado) {
  const [result] = await pool.query('UPDATE articulos SET estado = ? WHERE id = ?', [estado, id]);
  if (result.affectedRows === 0) {
    const error = new Error('Artículo no encontrado');
    error.statusCode = 404;
    throw error;
  }
  await pool.query('UPDATE articulo_items SET estado = ? WHERE articulo_id = ?', [estado, id]);
  return { id: Number(id), estado };
}

/**
 * Cambiar si un artículo requiere devolución
 */
async function cambiarDevolucion(id, requiere_devolucion) {
  const [result] = await pool.query(
    'UPDATE articulos SET requiere_devolucion = ? WHERE id = ?',
    [requiere_devolucion ? 1 : 0, id]
  );
  if (result.affectedRows === 0) {
    const error = new Error('Artículo no encontrado');
    error.statusCode = 404;
    throw error;
  }
  return { id: Number(id), requiere_devolucion: !!requiere_devolucion };
}

/**
 * Eliminar un artículo (solo si no tiene movimientos)
 */
async function eliminar(id, userId) {
  // Validar si tiene movimientos
  const [movs] = await pool.query(`
    SELECT 1 FROM movimiento_detalles md
    JOIN articulo_items ai ON md.articulo_item_id = ai.id
    WHERE ai.articulo_id = ?
    LIMIT 1
  `, [id]);

  if (movs.length > 0) {
    const error = new Error('No se puede eliminar el artículo porque ya tiene movimientos (entradas/salidas) registrados en el historial. Para dejar de usarlo, edite el artículo y cambie su estado a "Inactivo".');
    error.statusCode = 400;
    throw error;
  }

  const [[art]] = await pool.query('SELECT nombre, codigo FROM articulos WHERE id = ?', [id]);
  const [result] = await pool.query('DELETE FROM articulos WHERE id = ?', [id]);
  if (result.affectedRows === 0) {
    const error = new Error('Artículo no encontrado');
    error.statusCode = 404;
    throw error;
  }

  registrarActividad({ tipo: 'BORRADO', modulo: 'Artículo', descripcion: `Se eliminó el artículo "${art ? art.nombre : 'ID:' + id}"`, usuario_id: userId, referencia_id: Number(id) });
  return { message: 'Artículo eliminado' };
}

module.exports = { listar, obtenerPorId, crear, actualizar, cambiarEstado, cambiarDevolucion, eliminar };
