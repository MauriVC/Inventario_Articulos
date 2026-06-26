const { pool } = require('../config/database');

async function dashboardRoutes(fastify) {
  fastify.get('/', async (request) => {
    const year = request.query.year || new Date().getFullYear();
    const month = request.query.month || '';
    const targetDate = request.query.date || new Date().toISOString().split('T')[0];

    // 1. Stats generales
    const [[{ total_articulos }]] = await pool.query('SELECT COUNT(*) AS total_articulos FROM articulos');
    const [[{ almacenes_activos }]] = await pool.query('SELECT COUNT(*) AS almacenes_activos FROM almacenes WHERE estado = "Activo"');
    const [[{ salidas_dia }]] = await pool.query('SELECT COUNT(DISTINCT m.id) AS salidas_dia FROM movimientos m WHERE DATE(m.fecha_movimiento) = ? AND m.tipo = "SALIDA"', [targetDate]);
    const [[{ entradas_dia }]] = await pool.query('SELECT COUNT(DISTINCT m.id) AS entradas_dia FROM movimientos m WHERE DATE(m.fecha_movimiento) = ? AND m.tipo = "ENTRADA"', [targetDate]);

    // 2. Gráfico (Actividad por Hora del Día seleccionado)
    let chartRows = [];
    let chartData = [];
    
    [chartRows] = await pool.query(`
      SELECT HOUR(m.fecha_movimiento) AS periodo, m.tipo, SUM(md.cantidad) AS total_cantidad
      FROM movimientos m
      JOIN movimiento_detalles md ON m.id = md.movimiento_id
      WHERE DATE(m.fecha_movimiento) = ?
      GROUP BY periodo, m.tipo
    `, [targetDate]);

    chartData = Array.from({ length: 24 }, (_, i) => ({
      periodo: i,
      label: `${String(i).padStart(2, '0')}:00`,
      entrada: 0,
      salida: 0
    }));

    chartRows.forEach(row => {
      const idx = chartData.findIndex(d => d.periodo === row.periodo);
      if (idx !== -1) {
        if (row.tipo === 'ENTRADA') chartData[idx].entrada = Number(row.total_cantidad);
        if (row.tipo === 'SALIDA') chartData[idx].salida = Number(row.total_cantidad);
      }
    });

    // 3. Alertas de stock
    const [alertRows] = await pool.query(`
      SELECT a.nombre AS articulo, c.nombre AS color, alm.nombre AS almacen, ai.stock
      FROM articulo_items ai
      JOIN articulos a ON ai.articulo_id = a.id
      JOIN almacenes alm ON a.almacen_id = alm.id
      JOIN colores c ON ai.color_id = c.id
      WHERE ai.stock <= 5 AND ai.estado = 'Activo'
      ORDER BY ai.stock ASC
      LIMIT 10
    `);

    // 4. Movimientos recientes
    const [recentRows] = await pool.query(`
      SELECT m.codigo, m.tipo, alm.nombre AS almacen, m.solicitante_nombre AS solicitante, 
             m.destino_procedencia AS destino, m.fecha_movimiento AS fecha,
             SUM(md.cantidad) AS articulos
      FROM movimientos m
      JOIN almacenes alm ON m.almacen_id = alm.id
      JOIN movimiento_detalles md ON m.id = md.movimiento_id
      GROUP BY m.id
      ORDER BY m.fecha_movimiento DESC
      LIMIT 5
    `);

    // 5. Devoluciones pendientes globales
    const [[{ devoluciones_pendientes }]] = await pool.query(`
      SELECT SUM(
        CASE WHEN m.tipo = 'SALIDA' THEN md.cantidad 
             WHEN m.tipo = 'ENTRADA' THEN -md.cantidad 
             ELSE 0 END
      ) AS pendientes 
      FROM movimiento_detalles md 
      JOIN movimientos m ON md.movimiento_id = m.id
      JOIN articulo_items ai ON md.articulo_item_id = ai.id
      JOIN articulos a ON ai.articulo_id = a.id
      WHERE a.requiere_devolucion = 1
    `);

    // 6. Top Artículos del mes
    const [topArticulosRows] = await pool.query(`
      SELECT a.nombre AS articulo, c.nombre AS color, SUM(md.cantidad) AS total_movido
      FROM movimiento_detalles md
      JOIN articulo_items ai ON md.articulo_item_id = ai.id
      JOIN articulos a ON ai.articulo_id = a.id
      JOIN colores c ON ai.color_id = c.id
      JOIN movimientos m ON md.movimiento_id = m.id
      WHERE DATE(m.fecha_movimiento) = ?
      GROUP BY ai.id
      ORDER BY total_movido DESC
      LIMIT 5
    `, [targetDate]);

    // 7. Distribución de movimientos del mes
    const [distRows] = await pool.query(`
      SELECT m.tipo, SUM(md.cantidad) as total
      FROM movimientos m
      JOIN movimiento_detalles md ON m.id = md.movimiento_id
      WHERE DATE(m.fecha_movimiento) = ?
      GROUP BY m.tipo
    `, [targetDate]);

    return {
      data: {
        stats: {
          total_articulos,
          almacenes_activos,
          salidas_dia,
          entradas_dia,
          devoluciones_pendientes: Number(devoluciones_pendientes) || 0
        },
        chartData,
        stockAlerts: alertRows.map(r => ({
          name: `${r.articulo} (${r.color})`,
          almacen: r.almacen,
          stock: r.stock
        })),
        recentMovements: recentRows.map(r => ({
          codigo: r.codigo,
          tipo: r.tipo,
          almacen: r.almacen,
          solicitante: r.solicitante || 'N/A',
          destino: r.destino || 'N/A',
          articulos: Number(r.articulos),
          fecha: r.fecha
        })),
        topArticulos: topArticulosRows.map(r => ({
          name: `${r.articulo} (${r.color})`,
          total: Number(r.total_movido)
        })),
        distribucionMes: distRows.map(r => ({
          tipo: r.tipo,
          total: Number(r.total)
        }))
      }
    };
  });
}

module.exports = dashboardRoutes;
