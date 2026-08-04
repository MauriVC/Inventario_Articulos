const { pool } = require('../config/database');

// Zona horaria del sistema (Venezuela = UTC-4)
// Usamos DATE_ADD con INTERVAL en vez de CONVERT_TZ por compatibilidad con Aiven MySQL
const TZ_ADJUST = "DATE_ADD(m.fecha_movimiento, INTERVAL -4 HOUR)";

async function dashboardRoutes(fastify) {
  fastify.get('/', async (request, reply) => {
    try {
    const targetDate = request.query.date || new Date().toISOString().split('T')[0];
    const userId = request.headers['x-user-id'];
    const userRole = request.headers['x-user-role'];

    const isRestricted = userId && userRole !== 'SuperAdministrador';

    let roleFilterAct = '';
    if (userRole === 'Administrador') {
      roleFilterAct = " AND (u.rol = 'Administrador' OR u.rol = 'Usuario' OR u.rol IS NULL)";
    } else if (userRole === 'Usuario') {
      roleFilterAct = " AND (u.rol = 'Usuario' OR u.rol IS NULL)";
    }

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
    // Ejecutar todas las consultas en paralelo
    // ═══════════════════════════════════════
    const [
      [[{ total_articulos }]],
      [[{ almacenes_activos }]],
      [[{ salidas_dia }]],
      [[{ entradas_dia }]],
      [chartRows],
      [alertRows],
      [recentRows],
      [[{ devoluciones_pendientes }]],
      [topArticulosRows],
      [distRows]
    ] = await Promise.all([
      // 1. Total artículos
      pool.query(`SELECT COUNT(*) AS total_articulos FROM articulos a WHERE 1=1 ${artAlmacenFilter}`, [...artParams]),
      
      // 2. Almacenes activos
      pool.query(
        isRestricted
          ? `SELECT COUNT(DISTINCT a.id) AS almacenes_activos FROM almacenes a 
             INNER JOIN usuario_almacen ua ON ua.almacen_id = a.id 
             WHERE a.estado = 'Activo' AND ua.usuario_id = ?`
          : `SELECT COUNT(*) AS almacenes_activos FROM almacenes WHERE estado = 'Activo'`,
        isRestricted ? [userId] : []
      ),
      
      // 3. Salidas del día
      pool.query(`SELECT COUNT(DISTINCT m.id) AS salidas_dia FROM movimientos m 
                  WHERE DATE(${TZ_ADJUST}) = ? AND m.tipo = 'SALIDA' ${movAlmacenFilter}`, [targetDate, ...movParams]),
      
      // 4. Entradas del día
      pool.query(`SELECT COUNT(DISTINCT m.id) AS entradas_dia FROM movimientos m 
                  WHERE DATE(${TZ_ADJUST}) = ? AND m.tipo = 'ENTRADA' ${movAlmacenFilter}`, [targetDate, ...movParams]),
      
      // 5. Gráfico de Actividad por Hora
      pool.query(`
        SELECT periodo, tipo, SUM(total_cantidad) AS total_cantidad, MIN(primera_vez) AS primera_vez FROM (
          SELECT HOUR(${TZ_ADJUST}) AS periodo, m.tipo, SUM(md.cantidad) AS total_cantidad, MIN(m.fecha_movimiento) AS primera_vez
          FROM movimientos m JOIN movimiento_detalles md ON m.id = md.movimiento_id
          LEFT JOIN usuarios u ON m.usuario_id = u.id
          WHERE DATE(${TZ_ADJUST}) = ? ${movAlmacenFilter} ${roleFilterAct} GROUP BY periodo, m.tipo
          UNION ALL
          SELECT HOUR(DATE_ADD(al.created_at, INTERVAL -4 HOUR)) AS periodo, al.tipo, COUNT(*) AS total_cantidad, MIN(al.created_at) AS primera_vez
          FROM actividad_log al
          LEFT JOIN usuarios u ON al.usuario_id = u.id
          WHERE DATE(DATE_ADD(al.created_at, INTERVAL -4 HOUR)) = ? ${roleFilterAct}
          GROUP BY periodo, al.tipo
        ) AS combined_chart
        GROUP BY periodo, tipo
      `, [targetDate, ...movParams, targetDate]),
                  
      // 6. Alertas de stock
      pool.query(`SELECT a.nombre AS articulo, c.nombre AS color, alm.nombre AS almacen, ai.stock
                  FROM articulo_items ai JOIN articulos a ON ai.articulo_id = a.id
                  JOIN almacenes alm ON a.almacen_id = alm.id JOIN colores c ON ai.color_id = c.id
                  WHERE ai.stock <= 5 AND ai.estado = 'Activo' ${artAlmacenFilter}
                  ORDER BY ai.stock ASC LIMIT 10`, artParams),
                  
      // 7. Movimientos/Actividades recientes
      pool.query(`
        SELECT * FROM (
          SELECT 
            m.id, 'movimiento' AS origen, m.tipo, 'Movimiento' AS modulo, m.codigo AS codigo_o_modulo,
            alm.nombre AS almacen, m.solicitante_nombre AS solicitante, 
            m.destino_procedencia AS destino, m.fecha_movimiento AS fecha, 
            (SELECT SUM(cantidad) FROM movimiento_detalles md WHERE md.movimiento_id = m.id) AS articulos
          FROM movimientos m 
          JOIN almacenes alm ON m.almacen_id = alm.id
          LEFT JOIN usuarios u ON m.usuario_id = u.id
          WHERE 1=1 ${movAlmacenFilter} ${roleFilterAct}
          UNION ALL
          SELECT 
            al.id, 'actividad' AS origen, al.tipo, al.modulo, al.modulo AS codigo_o_modulo,
            '—' AS almacen, al.descripcion AS solicitante, 
            '—' AS destino, al.created_at AS fecha, 
            0 AS articulos
          FROM actividad_log al
          LEFT JOIN usuarios u ON al.usuario_id = u.id
          WHERE 1=1 ${roleFilterAct}
        ) AS combined_results
        ORDER BY fecha DESC, id DESC LIMIT 6
      `, movParams),
                  
      // 8. Devoluciones pendientes
      pool.query(`SELECT COALESCE(SUM(CASE WHEN m.tipo = 'SALIDA' THEN md.cantidad 
                                           WHEN m.tipo = 'ENTRADA' THEN -md.cantidad ELSE 0 END), 0) AS pendientes 
                  FROM movimiento_detalles md JOIN movimientos m ON md.movimiento_id = m.id
                  JOIN articulo_items ai ON md.articulo_item_id = ai.id JOIN articulos a ON ai.articulo_id = a.id
                  WHERE a.requiere_devolucion = 1 ${movAlmacenFilter}`, movParams),
                  
      // 9. Top Artículos del día
      pool.query(`SELECT a.nombre AS articulo, c.nombre AS color, SUM(md.cantidad) AS total_movido
                  FROM movimiento_detalles md JOIN articulo_items ai ON md.articulo_item_id = ai.id
                  JOIN articulos a ON ai.articulo_id = a.id JOIN colores c ON ai.color_id = c.id
                  JOIN movimientos m ON md.movimiento_id = m.id
                  WHERE DATE(${TZ_ADJUST}) = ? ${movAlmacenFilter}
                  GROUP BY ai.id ORDER BY total_movido DESC LIMIT 5`, [targetDate, ...movParams]),
                  
      // 10. Distribución de movimientos y actividades
      pool.query(`
        SELECT tipo, SUM(total) AS total FROM (
          SELECT m.tipo, SUM(md.cantidad) as total FROM movimientos m
          JOIN movimiento_detalles md ON m.id = md.movimiento_id
          LEFT JOIN usuarios u ON m.usuario_id = u.id
          WHERE DATE(${TZ_ADJUST}) = ? ${movAlmacenFilter} ${roleFilterAct} GROUP BY m.tipo
          UNION ALL
          SELECT al.tipo, COUNT(*) as total FROM actividad_log al
          LEFT JOIN usuarios u ON al.usuario_id = u.id
          WHERE DATE(DATE_ADD(al.created_at, INTERVAL -4 HOUR)) = ? ${roleFilterAct} GROUP BY al.tipo
        ) AS combined_dist
        GROUP BY tipo
      `, [targetDate, ...movParams, targetDate])
    ]);

    // ═══════════════════════════════════════
    // Procesar datos para el gráfico
    // ═══════════════════════════════════════
    const chartData = Array.from({ length: 24 }, (_, i) => ({
      periodo: i,
      label: `${String(i).padStart(2, '0')}:00`,
      entrada: 0,
      salida: 0,
      baja: 0,
      registro: 0,
      edicion: 0,
      borrado: 0,
      events: []
    }));

    chartRows.forEach(row => {
      const idx = chartData.findIndex(d => d.periodo === row.periodo);
      if (idx !== -1) {
        if (row.tipo === 'ENTRADA') chartData[idx].entrada = Number(row.total_cantidad);
        if (row.tipo === 'SALIDA') chartData[idx].salida = Number(row.total_cantidad);
        if (row.tipo === 'BAJA') chartData[idx].baja = Number(row.total_cantidad);
        if (row.tipo === 'REGISTRO') chartData[idx].registro = Number(row.total_cantidad);
        if (row.tipo === 'EDICIÓN') chartData[idx].edicion = Number(row.total_cantidad);
        if (row.tipo === 'BORRADO') chartData[idx].borrado = Number(row.total_cantidad);

        chartData[idx].events.push({
          tipo: row.tipo,
          total: Number(row.total_cantidad),
          primera_vez: new Date(row.primera_vez).getTime()
        });
      }
    });

    chartData.forEach(hour => {
      hour.events.sort((a, b) => a.primera_vez - b.primera_vez);
    });

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
          origen: r.origen,
          codigo: r.codigo_o_modulo,
          tipo: r.tipo,
          modulo: r.modulo,
          almacen: r.almacen,
          solicitante: r.solicitante || '—',
          destino: r.destino || '—',
          articulos: Number(r.articulos) || 0,
          fecha: r.fecha
        })),
        topArticulos: topArticulosRows.map(r => ({
          name: `${r.articulo} (${r.color})`,
          total: Number(r.total_movido)
        })),
        distribucionMes: ['ENTRADA', 'SALIDA', 'BAJA', 'REGISTRO', 'EDICIÓN', 'BORRADO'].map(tipo => {
          const row = distRows.find(r => r.tipo === tipo);
          return {
            tipo,
            total: row ? Number(row.total) : 0
          };
        })
      }
    };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Error cargando dashboard', details: err.message });
    }
  });
}

module.exports = dashboardRoutes;
