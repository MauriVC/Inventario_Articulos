/**
 * Servicio — Movimientos (Salida, Entrada, Baja)
 * Operaciones transaccionales que actualizan el stock
 */
const { pool } = require('../../core/config/database');
const { buildAlmacenFilter } = require('../../core/helpers/almacenFilter');

/**
 * Listar movimientos con filtros y paginación
 */
async function listar({ tipo, almacen_id, desde, hasta, search, limit, offset, userId, userRole }) {
  let where = '1=1';
  const params = [];

  const almFilter = buildAlmacenFilter(userId, userRole, 'm.almacen_id');
  if (almFilter.isRestricted) {
    where += almFilter.filter;
    params.push(...almFilter.params);
  }

  if (tipo) { where += ' AND m.tipo = ?'; params.push(tipo); }
  if (almacen_id) { where += ' AND m.almacen_id = ?'; params.push(almacen_id); }
  if (desde) { where += ' AND m.fecha_movimiento >= ?'; params.push(desde); }
  if (hasta) { where += ' AND m.fecha_movimiento <= ?'; params.push(`${hasta} 23:59:59`); }
  if (search) {
    where += ' AND (m.codigo LIKE ? OR m.solicitante_nombre LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const [
    [countResult],
    [movimientos]
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM movimientos m WHERE ${where}`, params),
    pool.query(`
      SELECT m.id, m.codigo, m.tipo, m.fecha_movimiento,
             m.solicitante_ci, m.solicitante_nombre, m.solicitante_telefono,
             m.destino_procedencia, m.motivo_baja, m.observacion,
             m.almacen_id, alm.nombre AS almacen_nombre,
             m.paquete_id, paq.nombre AS paquete_nombre,
             u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos,
             (SELECT COUNT(*) FROM movimiento_detalles md WHERE md.movimiento_id = m.id) AS total_articulos
      FROM movimientos m
      JOIN almacenes alm ON m.almacen_id = alm.id
      LEFT JOIN paquetes paq ON m.paquete_id = paq.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE ${where}
      ORDER BY m.fecha_movimiento DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit) || 20, Number(offset) || 0])
  ]);

  return { movimientos, total: countResult[0].total };
}

/**
 * Obtener salidas con estado FIFO de devolución
 */
async function salidasConDevolucion() {
  const [salidas] = await pool.query(`
    SELECT m.id AS movimiento_id, m.codigo, m.fecha_movimiento,
           m.solicitante_ci, m.solicitante_nombre, m.solicitante_telefono,
           m.destino_procedencia,
           alm.nombre AS almacen_nombre,
           a.id AS articulo_id, a.nombre AS articulo_nombre, a.codigo AS articulo_codigo,
           c.nombre AS color_nombre, c.codigo_hex,
           md.articulo_item_id,
           md.cantidad
    FROM movimientos m
    JOIN almacenes alm ON m.almacen_id = alm.id
    JOIN movimiento_detalles md ON md.movimiento_id = m.id
    JOIN articulo_items ai ON md.articulo_item_id = ai.id
    JOIN articulos a ON ai.articulo_id = a.id
    JOIN colores c ON ai.color_id = c.id
    WHERE m.tipo = 'SALIDA' AND a.requiere_devolucion = 1
    ORDER BY m.fecha_movimiento ASC
  `);

  if (salidas.length === 0) return [];

  const itemIds = [...new Set(salidas.map(s => s.articulo_item_id))];
  const [entradas] = await pool.query(`
    SELECT md.articulo_item_id, SUM(md.cantidad) AS total_devuelto
    FROM movimiento_detalles md
    JOIN movimientos m ON md.movimiento_id = m.id
    WHERE m.tipo = 'ENTRADA' AND m.es_devolucion = 1 AND md.articulo_item_id IN (?)
    GROUP BY md.articulo_item_id
  `, [itemIds]);

  const devueltoMap = {};
  for (const e of entradas) {
    devueltoMap[e.articulo_item_id] = Number(e.total_devuelto);
  }

  // Distribuir devoluciones FIFO
  const restanteMap = {};
  for (const itemId of itemIds) {
    restanteMap[itemId] = devueltoMap[itemId] || 0;
  }

  const data = salidas.map(s => {
    const restante = restanteMap[s.articulo_item_id];
    let pendiente;
    if (restante >= s.cantidad) {
      pendiente = 0;
      restanteMap[s.articulo_item_id] -= s.cantidad;
    } else if (restante > 0) {
      pendiente = s.cantidad - restante;
      restanteMap[s.articulo_item_id] = 0;
    } else {
      pendiente = s.cantidad;
    }
    return { ...s, pendiente };
  });

  data.sort((a, b) => new Date(b.fecha_movimiento) - new Date(a.fecha_movimiento));
  return data;
}

/**
 * Buscar solicitante por CI (autocompletar)
 */
async function buscarSolicitante(ci) {
  const [rows] = await pool.query(`
    SELECT solicitante_nombre AS nombre, solicitante_telefono AS telefono
    FROM movimientos
    WHERE solicitante_ci = ? AND solicitante_nombre IS NOT NULL
    ORDER BY fecha_movimiento DESC
    LIMIT 1
  `, [ci]);

  if (rows.length === 0) {
    const error = new Error('Solicitante no encontrado');
    error.statusCode = 404;
    throw error;
  }
  return rows[0];
}

/**
 * Obtener pendientes de devolución globales
 */
async function pendientesGlobales() {
  const [salidas] = await pool.query(`
    SELECT md.articulo_item_id, SUM(md.cantidad) AS total_salido
    FROM movimiento_detalles md
    JOIN movimientos m ON md.movimiento_id = m.id
    JOIN articulo_items ai ON md.articulo_item_id = ai.id
    JOIN articulos a ON ai.articulo_id = a.id
    WHERE m.tipo = 'SALIDA' AND a.requiere_devolucion = 1
    GROUP BY md.articulo_item_id
  `);

  if (salidas.length === 0) return [];
  const itemIds = salidas.map(s => s.articulo_item_id);

  const [entradas] = await pool.query(`
    SELECT md.articulo_item_id, SUM(md.cantidad) AS total_devuelto
    FROM movimiento_detalles md
    JOIN movimientos m ON md.movimiento_id = m.id
    WHERE m.tipo = 'ENTRADA' AND m.es_devolucion = 1 AND md.articulo_item_id IN (?)
    GROUP BY md.articulo_item_id
  `, [itemIds]);

  const devueltoMap = {};
  for (const e of entradas) {
    devueltoMap[e.articulo_item_id] = Number(e.total_devuelto);
  }

  const pendientes = [];
  for (const s of salidas) {
    const devuelto = devueltoMap[s.articulo_item_id] || 0;
    const pendiente = Number(s.total_salido) - devuelto;
    if (pendiente > 0) {
      pendientes.push({ articulo_item_id: s.articulo_item_id, max_devolucion: pendiente });
    }
  }

  return pendientes;
}

/**
 * Obtener detalle de un movimiento
 */
async function obtenerPorId(id) {
  const [
    [movimientos],
    [detalles]
  ] = await Promise.all([
    pool.query(`
      SELECT m.*, alm.nombre AS almacen_nombre, paq.nombre AS paquete_nombre,
             u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos
      FROM movimientos m
      JOIN almacenes alm ON m.almacen_id = alm.id
      LEFT JOIN paquetes paq ON m.paquete_id = paq.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.id = ?
    `, [id]),
    pool.query(`
      SELECT md.cantidad, md.stock_anterior, md.stock_posterior, md.observacion,
             a.nombre AS articulo_nombre, a.requiere_devolucion,
             c.nombre AS color_nombre, c.codigo_hex
      FROM movimiento_detalles md
      JOIN articulo_items ai ON md.articulo_item_id = ai.id
      JOIN articulos a ON ai.articulo_id = a.id
      JOIN colores c ON ai.color_id = c.id
      WHERE md.movimiento_id = ?
    `, [id])
  ]);

  if (movimientos.length === 0) {
    const error = new Error('Movimiento no encontrado');
    error.statusCode = 404;
    throw error;
  }

  return { ...movimientos[0], detalles };
}

/**
 * Registrar un movimiento con actualización de stock en transacción
 */
async function registrar({
  tipo, almacen_id, paquete_id,
  solicitante_ci, solicitante_nombre, solicitante_telefono,
  destino_procedencia, motivo_baja, observacion,
  detalles, es_devolucion = false, userId
}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Generar código auto-incremental
    const prefix = tipo === 'SALIDA' ? 'SAL' : tipo === 'ENTRADA' ? 'ENT' : 'BAJ';
    const [lastCode] = await conn.query(
      "SELECT codigo FROM movimientos WHERE codigo LIKE ? ORDER BY id DESC LIMIT 1",
      [`${prefix}-2026-%`]
    );
    let nextNum = 1;
    if (lastCode.length > 0) {
      const parts = lastCode[0].codigo.split('-');
      nextNum = parseInt(parts[2], 10) + 1;
    }
    const codigo = `${prefix}-2026-${String(nextNum).padStart(4, '0')}`;

    const now = new Date();

    // Insertar cabecera
    const [movResult] = await conn.query(
      `INSERT INTO movimientos (codigo, tipo, es_devolucion, almacen_id, usuario_id, paquete_id,
       solicitante_ci, solicitante_nombre, solicitante_telefono,
       destino_procedencia, motivo_baja, observacion, fecha_movimiento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigo, tipo, es_devolucion ? 1 : 0, almacen_id, userId || 1, paquete_id || null,
       solicitante_ci || null, solicitante_nombre || null, solicitante_telefono || null,
       destino_procedencia || null, motivo_baja || null, observacion || null, now]
    );
    const movimientoId = movResult.insertId;

    // Procesar cada detalle: actualizar stock + insertar detalle
    for (const det of detalles) {
      const [itemRows] = await conn.query('SELECT stock FROM articulo_items WHERE id = ? FOR UPDATE', [det.articulo_item_id]);
      if (itemRows.length === 0) throw new Error(`articulo_item_id ${det.articulo_item_id} no encontrado`);

      const stockAnterior = itemRows[0].stock;
      let stockPosterior;

      if (tipo === 'ENTRADA') {
        stockPosterior = stockAnterior + det.cantidad;
      } else {
        if (stockAnterior < det.cantidad) {
          const error = new Error(`Stock insuficiente para articulo_item_id ${det.articulo_item_id}. Disponible: ${stockAnterior}, Solicitado: ${det.cantidad}`);
          error.statusCode = 409;
          throw error;
        }
        stockPosterior = stockAnterior - det.cantidad;
      }

      await conn.query('UPDATE articulo_items SET stock = ? WHERE id = ?', [stockPosterior, det.articulo_item_id]);
      await conn.query(
        'INSERT INTO movimiento_detalles (movimiento_id, articulo_item_id, cantidad, stock_anterior, stock_posterior, observacion) VALUES (?, ?, ?, ?, ?, ?)',
        [movimientoId, det.articulo_item_id, det.cantidad, stockAnterior, stockPosterior, det.observacion || null]
      );
    }

    await conn.commit();
    return { id: movimientoId, codigo, tipo };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { listar, salidasConDevolucion, buscarSolicitante, pendientesGlobales, obtenerPorId, registrar };
