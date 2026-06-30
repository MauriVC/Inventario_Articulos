const { pool } = require('../config/database');

// Zona horaria del sistema (Venezuela = UTC-4)
// Usamos DATE_ADD con INTERVAL en vez de CONVERT_TZ por compatibilidad con Aiven MySQL
const TZ_ADJUST = "DATE_ADD(m.fecha_movimiento, INTERVAL -4 HOUR)";

async function dashboardRoutes(fastify) {
  fastify.get('/', async (request) => {
    const targetDate = request.query.date || new Date().toISOString().split('T')[0];
    const userId = request.headers['x-user-id'];
    const userRole = request.headers['x-user-role'];

    const isRestricted = userId && userRole !== 'SuperAdministrador';

    // ─── Helpers para construir filtros ───
    // Filtro para tablas de artículos (a.almacen_id)
    const artAlmacenFilter = isRestricted
      ? ' AND a.almacen_id IN (SELECT almacen_id FROM usuario_almacen WHERE usuario_id = ?)'
      : '';
    const artParams = isRestricted ? [userId] : [];

    // Filtro para tablas de movimientos (m.almacen_id)
    const movAlmacenFilter = isRestricted
      ? ' AND m.almacen_id IN (SELECT almacen_id FROM usuario_almacen WHERE usuario_id = ?)'
      : '';
    const movParams = isRestricted ? [userId] : [];

    // Filtro directo por almacen_id (para tablas sin alias)
    const directAlmacenFilter = isRestricted
      ? ' AND almacen_id IN (SELECT almacen_id FROM usuario_almacen WHERE usuario_id = ?)'
      : '';

    // ═══════════════════════════════════════
    // 1. Stats generales (filtrados por usuario)
    // ═══════════════════════════════════════
    const [[{ total_articulos }]] = await pool.query(
      `SELECT COUNT(*) AS total_articulos FROM articulos a WHERE 1=1 ${artAlmacenFilter}`,
      [...artParams]
    );
    
    const [[{ almacenes_activos }]] = await pool.query(
      isRestricted
        ? `SELECT COUNT(DISTINCT a.id) AS almacenes_activos FROM almacenes a 
           INNER JOIN usuario_almacen ua ON ua.almacen_id = a.id 
           WHERE a.estado = 'Activo' AND ua.usuario_id = ?`
        : `SELECT COUNT(*) AS almacenes_activos FROM almacenes WHERE estado = 'Activo'`,
      isRestricted ? [userId] : []
    );

    // Salidas y entradas del día — usando DATE_ADD para comparar en hora local
    const [[{ salidas_dia }]] = await pool.query(
      `SELECT COUNT(DISTINCT m.id) AS salidas_dia FROM movimientos m 
       WHERE DATE(${TZ_ADJUST}) = ? 
       AND m.tipo = 'SALIDA' ${movAlmacenFilter}`,
      [targetDate, ...movParams]
    );
    const [[{ entradas_dia }]] = await pool.query(
      `SELECT COUNT(DISTINCT m.id) AS entradas_dia FROM movimientos m 
       WHERE DATE(${TZ_ADJUST}) = ? 
       AND m.tipo = 'ENTRADA' ${movAlmacenFilter}`,
      [targetDate, ...movParams]
    );

    // ═══════════════════════════════════════
    // 2. Gráfico de Actividad por Hora (hora local)
    // ═══════════════════════════════════════
    const [chartRows] = await pool.query(`
      SELECT HOUR(${TZ_ADJUST}) AS periodo, 
             m.tipo, SUM(md.cantidad) AS total_cantidad
      FROM movimientos m
      JOIN movimiento_detalles md ON m.id = md.movimiento_id
      WHERE DATE(${TZ_ADJUST}) = ? ${movAlmacenFilter}
      GROUP BY periodo, m.tipo
    `, [targetDate, ...movParams]);

    const chartData = Array.from({ length: 24 }, (_, i) => ({
      periodo: i,
      label: `${String(i).padStart(2, '0')}:00`,
      entrada: 0,
      salida: 0,
      baja: 0
    }));

    chartRows.forEach(row => {
      const idx = chartData.findIndex(d => d.periodo === row.periodo);
      if (idx !== -1) {
        if (row.tipo === 'ENTRADA') chartData[idx].entrada = Number(row.total_cantidad);
        if (row.tipo === 'SALIDA') chartData[idx].salida = Number(row.total_cantidad);
        if (row.tipo === 'BAJA') chartData[idx].baja = Number(row.total_cantidad);
      }
    });

    // ═══════════════════════════════════════
    // 3. Alertas de stock (filtradas por usuario)
    // ═══════════════════════════════════════
    const [alertRows] = await pool.query(`
      SELECT a.nombre AS articulo, c.nombre AS color, alm.nombre AS almacen, ai.stock
      FROM articulo_items ai
      JOIN articulos a ON ai.articulo_id = a.id
      JOIN almacenes alm ON a.almacen_id = alm.id
      JOIN colores c ON ai.color_id = c.id
      WHERE ai.stock <= 5 AND ai.estado = 'Activo' ${artAlmacenFilter}
      ORDER BY ai.stock ASC
      LIMIT 10
    `, artParams);

    // ═══════════════════════════════════════
    // 4. Movimientos recientes (filtrados por usuario)
    // ═══════════════════════════════════════
    const [recentRows] = await pool.query(`
      SELECT m.codigo, m.tipo, alm.nombre AS almacen, m.solicitante_nombre AS solicitante, 
             m.destino_procedencia AS destino, m.fecha_movimiento AS fecha,
             SUM(md.cantidad) AS articulos
      FROM movimientos m
      JOIN almacenes alm ON m.almacen_id = alm.id
      JOIN movimiento_detalles md ON m.id = md.movimiento_id
      WHERE 1=1 ${movAlmacenFilter}
      GROUP BY m.id
      ORDER BY m.fecha_movimiento DESC
      LIMIT 5
    `, movParams);

    // ═══════════════════════════════════════
    // 5. Devoluciones pendientes (filtradas por usuario)
    // ═══════════════════════════════════════
    const [[{ devoluciones_pendientes }]] = await pool.query(`
      SELECT COALESCE(SUM(
        CASE WHEN m.tipo = 'SALIDA' THEN md.cantidad 
             WHEN m.tipo = 'ENTRADA' THEN -md.cantidad 
             ELSE 0 END
      ), 0) AS pendientes 
      FROM movimiento_detalles md 
      JOIN movimientos m ON md.movimiento_id = m.id
      JOIN articulo_items ai ON md.articulo_item_id = ai.id
      JOIN articulos a ON ai.articulo_id = a.id
      WHERE a.requiere_devolucion = 1 ${movAlmacenFilter}
    `, movParams);

    // ═══════════════════════════════════════
    // 6. Top Artículos del día (filtrados por usuario)
    // ═══════════════════════════════════════
    const [topArticulosRows] = await pool.query(`
      SELECT a.nombre AS articulo, c.nombre AS color, SUM(md.cantidad) AS total_movido
      FROM movimiento_detalles md
      JOIN articulo_items ai ON md.articulo_item_id = ai.id
      JOIN articulos a ON ai.articulo_id = a.id
      JOIN colores c ON ai.color_id = c.id
      JOIN movimientos m ON md.movimiento_id = m.id
      WHERE DATE(${TZ_ADJUST}) = ? ${movAlmacenFilter}
      GROUP BY ai.id
      ORDER BY total_movido DESC
      LIMIT 5
    `, [targetDate, ...movParams]);

    // ═══════════════════════════════════════
    // 7. Distribución de movimientos del día (filtrada por usuario)
    // ═══════════════════════════════════════
    const [distRows] = await pool.query(`
      SELECT m.tipo, SUM(md.cantidad) as total
      FROM movimientos m
      JOIN movimiento_detalles md ON m.id = md.movimiento_id
      WHERE DATE(${TZ_ADJUST}) = ? ${movAlmacenFilter}
      GROUP BY m.tipo
    `, [targetDate, ...movParams]);

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
