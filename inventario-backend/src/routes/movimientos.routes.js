/**
 * Rutas — Movimientos (Salida, Entrada, Baja)
 * Operaciones transaccionales que actualizan el stock
 */
const { pool } = require('../config/database');

async function movimientosRoutes(fastify) {

  // GET /api/movimientos — Historial con filtros
  fastify.get('/', async (request) => {
    const { tipo, almacen_id, desde, hasta, search, limit, offset } = request.query;

    let where = '1=1';
    const params = [];
    if (tipo) { where += ' AND m.tipo = ?'; params.push(tipo); }
    if (almacen_id) { where += ' AND m.almacen_id = ?'; params.push(almacen_id); }
    if (desde) { where += ' AND m.fecha_movimiento >= ?'; params.push(desde); }
    if (hasta) { where += ' AND m.fecha_movimiento <= ?'; params.push(`${hasta} 23:59:59`); }
    if (search) {
      where += ' AND (m.codigo LIKE ? OR m.solicitante_nombre LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Contar total para paginación
    const [countResult] = await pool.query(`SELECT COUNT(*) AS total FROM movimientos m WHERE ${where}`, params);

    const [movimientos] = await pool.query(`
      SELECT m.id, m.codigo, m.tipo, m.fecha_movimiento,
             m.solicitante_ci, m.solicitante_nombre, m.solicitante_telefono,
             m.destino_procedencia, m.motivo_baja, m.observacion,
             m.almacen_id, alm.nombre AS almacen_nombre,
             m.paquete_id, paq.nombre AS paquete_nombre,
             (SELECT COUNT(*) FROM movimiento_detalles md WHERE md.movimiento_id = m.id) AS total_articulos
      FROM movimientos m
      JOIN almacenes alm ON m.almacen_id = alm.id
      LEFT JOIN paquetes paq ON m.paquete_id = paq.id
      WHERE ${where}
      ORDER BY m.fecha_movimiento DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit) || 20, Number(offset) || 0]);

    return { data: movimientos, total: countResult[0].total };
  });

  // GET /api/movimientos/salidas-con-devolucion — Salidas con estado FIFO de devolución
  fastify.get('/salidas-con-devolucion', async (request) => {
    // 1. Obtener todas las salidas de artículos con requiere_devolucion
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

    if (salidas.length === 0) return { data: [] };

    // 2. Obtener total de entradas por cada articulo_item_id
    const itemIds = [...new Set(salidas.map(s => s.articulo_item_id))];
    const [entradas] = await pool.query(`
      SELECT md.articulo_item_id, SUM(md.cantidad) AS total_devuelto
      FROM movimiento_detalles md
      JOIN movimientos m ON md.movimiento_id = m.id
      WHERE m.tipo = 'ENTRADA' AND md.articulo_item_id IN (?)
      GROUP BY md.articulo_item_id
    `, [itemIds]);

    // Crear mapa de devoluciones por item
    const devueltoMap = {};
    for (const e of entradas) {
      devueltoMap[e.articulo_item_id] = Number(e.total_devuelto);
    }

    // 3. Distribuir devoluciones FIFO: las salidas más antiguas se cubren primero
    const restanteMap = {}; // cantidad de devoluciones restantes por distribuir per item
    for (const itemId of itemIds) {
      restanteMap[itemId] = devueltoMap[itemId] || 0;
    }

    // Recorrer salidas en orden cronológico (ASC) y asignar cuánto se cubrió
    const data = salidas.map(s => {
      const restante = restanteMap[s.articulo_item_id];
      let pendiente;
      if (restante >= s.cantidad) {
        // Esta salida está completamente cubierta por devoluciones
        pendiente = 0;
        restanteMap[s.articulo_item_id] -= s.cantidad;
      } else if (restante > 0) {
        // Parcialmente cubierta
        pendiente = s.cantidad - restante;
        restanteMap[s.articulo_item_id] = 0;
      } else {
        // No cubierta
        pendiente = s.cantidad;
      }
      return { ...s, pendiente };
    });

    // Devolver ordenado por fecha DESC (más recientes primero) para la vista
    data.sort((a, b) => new Date(b.fecha_movimiento) - new Date(a.fecha_movimiento));

    return { data };
  });

  // GET /api/movimientos/solicitante/:ci — Autocompletar datos del solicitante
  fastify.get('/solicitante/:ci', async (request, reply) => {
    const { ci } = request.params;
    const [rows] = await pool.query(`
      SELECT solicitante_nombre AS nombre, solicitante_telefono AS telefono
      FROM movimientos
      WHERE solicitante_ci = ? AND solicitante_nombre IS NOT NULL
      ORDER BY fecha_movimiento DESC
      LIMIT 1
    `, [ci]);
    if (rows.length === 0) return reply.code(404).send({ error: 'Solicitante no encontrado' });
    return { data: rows[0] };
  });

  // GET /api/movimientos/pendientes-globales — Obtener artículos pendientes de devolución globales
  fastify.get('/pendientes-globales', async (request) => {
    // 1. Obtener todas las salidas para artículos que requieren devolución
    const [salidas] = await pool.query(`
      SELECT md.articulo_item_id, SUM(md.cantidad) AS total_salido
      FROM movimiento_detalles md
      JOIN movimientos m ON md.movimiento_id = m.id
      JOIN articulo_items ai ON md.articulo_item_id = ai.id
      JOIN articulos a ON ai.articulo_id = a.id
      WHERE m.tipo = 'SALIDA' AND a.requiere_devolucion = 1
      GROUP BY md.articulo_item_id
    `);

    if (salidas.length === 0) return { data: [] };
    const itemIds = salidas.map(s => s.articulo_item_id);

    // 2. Obtener todas las entradas (devoluciones) para esos items
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

    // 3. Calcular pendientes globales
    const pendientes = [];
    for (const s of salidas) {
      const devuelto = devueltoMap[s.articulo_item_id] || 0;
      const pendiente = Number(s.total_salido) - devuelto;
      if (pendiente > 0) {
        pendientes.push({ articulo_item_id: s.articulo_item_id, max_devolucion: pendiente });
      }
    }

    return { data: pendientes };
  });

  // GET /api/movimientos/:id — Detalle con artículos
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const [movimientos] = await pool.query(`
      SELECT m.*, alm.nombre AS almacen_nombre, paq.nombre AS paquete_nombre
      FROM movimientos m
      JOIN almacenes alm ON m.almacen_id = alm.id
      LEFT JOIN paquetes paq ON m.paquete_id = paq.id
      WHERE m.id = ?
    `, [id]);
    if (movimientos.length === 0) return reply.code(404).send({ error: 'Movimiento no encontrado' });

    const [detalles] = await pool.query(`
      SELECT md.cantidad, md.stock_anterior, md.stock_posterior, md.observacion,
             a.nombre AS articulo_nombre, a.requiere_devolucion,
             c.nombre AS color_nombre, c.codigo_hex
      FROM movimiento_detalles md
      JOIN articulo_items ai ON md.articulo_item_id = ai.id
      JOIN articulos a ON ai.articulo_id = a.id
      JOIN colores c ON ai.color_id = c.id
      WHERE md.movimiento_id = ?
    `, [id]);

    return { data: { ...movimientos[0], detalles } };
  });

  // POST /api/movimientos — Registrar movimiento (SALIDA, ENTRADA o BAJA)
  fastify.post('/', async (request, reply) => {
    const {
      tipo, almacen_id, paquete_id,
      solicitante_ci, solicitante_nombre, solicitante_telefono,
      destino_procedencia, motivo_baja, observacion,
      detalles, // [{ articulo_item_id, cantidad }]
      es_devolucion = false // Nuevo campo desde el frontend
    } = request.body;

    if (!tipo || !almacen_id || !detalles || detalles.length === 0) {
      return reply.code(400).send({ error: 'tipo, almacen_id y detalles son obligatorios' });
    }
    if (!['ENTRADA', 'SALIDA', 'BAJA'].includes(tipo)) {
      return reply.code(400).send({ error: 'tipo debe ser ENTRADA, SALIDA o BAJA' });
    }

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

      // Insertar cabecera
      const [movResult] = await conn.query(
        `INSERT INTO movimientos (codigo, tipo, es_devolucion, almacen_id, usuario_id, paquete_id,
         solicitante_ci, solicitante_nombre, solicitante_telefono,
         destino_procedencia, motivo_baja, observacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [codigo, tipo, es_devolucion ? 1 : 0, almacen_id, 1, paquete_id || null,
         solicitante_ci || null, solicitante_nombre || null, solicitante_telefono || null,
         destino_procedencia || null, motivo_baja || null, observacion || null]
      );
      const movimientoId = movResult.insertId;

      // Procesar cada detalle: actualizar stock + insertar detalle
      for (const det of detalles) {
        // Obtener stock actual
        const [itemRows] = await conn.query('SELECT stock FROM articulo_items WHERE id = ? FOR UPDATE', [det.articulo_item_id]);
        if (itemRows.length === 0) throw new Error(`articulo_item_id ${det.articulo_item_id} no encontrado`);

        const stockAnterior = itemRows[0].stock;
        let stockPosterior;

        if (tipo === 'ENTRADA') {
          stockPosterior = stockAnterior + det.cantidad;
        } else {
          // SALIDA o BAJA: descontar
          if (stockAnterior < det.cantidad) {
            throw new Error(`Stock insuficiente para articulo_item_id ${det.articulo_item_id}. Disponible: ${stockAnterior}, Solicitado: ${det.cantidad}`);
          }
          stockPosterior = stockAnterior - det.cantidad;
        }

        // Actualizar stock
        await conn.query('UPDATE articulo_items SET stock = ? WHERE id = ?', [stockPosterior, det.articulo_item_id]);

        // Insertar detalle
        await conn.query(
          'INSERT INTO movimiento_detalles (movimiento_id, articulo_item_id, cantidad, stock_anterior, stock_posterior, observacion) VALUES (?, ?, ?, ?, ?, ?)',
          [movimientoId, det.articulo_item_id, det.cantidad, stockAnterior, stockPosterior, det.observacion || null]
        );
      }

      await conn.commit();
      return reply.code(201).send({ data: { id: movimientoId, codigo, tipo } });
    } catch (err) {
      await conn.rollback();
      if (err.message.includes('Stock insuficiente')) {
        return reply.code(409).send({ error: err.message });
      }
      throw err;
    } finally {
      conn.release();
    }
  });
}

module.exports = movimientosRoutes;
