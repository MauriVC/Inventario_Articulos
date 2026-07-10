/**
 * Rutas — Historial de Actividades (unificado)
 * Combina movimientos (ENTRADA/SALIDA/BAJA) con actividades CRUD (REGISTRO/EDICIÓN/BORRADO)
 */
const { pool } = require('../config/database');

async function actividadRoutes(fastify) {

  // GET /api/actividad — Historial unificado con paginación y filtros
  fastify.get('/', async (request) => {
    const { tipo, modulo, desde, hasta, search, limit, offset } = request.query;
    const userRole = request.headers['x-user-role'];

    // ─── Filtros para movimientos ───
    let movWhere = '1=1';
    
    if (userRole === 'Administrador') {
      movWhere += " AND (u.rol = 'Administrador' OR u.rol = 'Usuario' OR u.rol IS NULL)";
    } else if (userRole === 'Usuario') {
      movWhere += " AND (u.rol = 'Usuario' OR u.rol IS NULL)";
    }
    
    const movParams = [];

    if (tipo && ['ENTRADA', 'SALIDA', 'BAJA'].includes(tipo)) {
      movWhere += ' AND m.tipo = ?';
      movParams.push(tipo);
    } else if (tipo) {
      // Si filtran por REGISTRO/EDICIÓN/BORRADO, excluir movimientos
      movWhere = '1=0';
    }

    if (modulo && modulo !== 'Movimiento') {
      movWhere = '1=0'; // movimientos no aplican si filtran otro módulo
    }

    if (desde) { movWhere += ' AND m.fecha_movimiento >= ?'; movParams.push(desde); }
    if (hasta) { movWhere += ' AND m.fecha_movimiento <= ?'; movParams.push(`${hasta} 23:59:59`); }
    if (search) {
      movWhere += ' AND (m.codigo LIKE ? OR m.solicitante_nombre LIKE ?)';
      movParams.push(`%${search}%`, `%${search}%`);
    }

    // ─── Filtros para actividad_log ───
    let actWhere = '1=1';
    
    if (userRole === 'Administrador') {
      actWhere += " AND (u.rol = 'Administrador' OR u.rol = 'Usuario' OR u.rol IS NULL)";
    } else if (userRole === 'Usuario') {
      actWhere += " AND (u.rol = 'Usuario' OR u.rol IS NULL)";
    }

    const actParams = [];

    if (tipo && ['REGISTRO', 'EDICIÓN', 'BORRADO'].includes(tipo)) {
      actWhere += ' AND al.tipo = ?';
      actParams.push(tipo);
    } else if (tipo) {
      // Si filtran por ENTRADA/SALIDA/BAJA, excluir actividades CRUD
      actWhere = '1=0';
    }

    if (modulo && modulo !== 'Movimiento') {
      actWhere += ' AND al.modulo = ?';
      actParams.push(modulo);
    } else if (modulo === 'Movimiento') {
      actWhere = '1=0'; // actividades CRUD no aplican si filtran por movimiento
    }

    if (desde) { actWhere += ' AND al.created_at >= ?'; actParams.push(desde); }
    if (hasta) { actWhere += ' AND al.created_at <= ?'; actParams.push(`${hasta} 23:59:59`); }
    if (search) {
      actWhere += ' AND al.descripcion LIKE ?';
      actParams.push(`%${search}%`);
    }

    // ─── UNION de ambas fuentes ───
    const countQuery = `
      SELECT (
        (SELECT COUNT(*) FROM movimientos m LEFT JOIN usuarios u ON m.usuario_id = u.id WHERE ${movWhere}) +
        (SELECT COUNT(*) FROM actividad_log al LEFT JOIN usuarios u ON al.usuario_id = u.id WHERE ${actWhere})
      ) AS total
    `;
    const [[countResult]] = await pool.query(countQuery, [...movParams, ...actParams]);

    const unionQuery = `
      SELECT * FROM (
        SELECT 
          m.id,
          'movimiento' AS origen,
          m.tipo,
          'Movimiento' AS modulo,
          CONCAT(m.tipo, ' — ', m.codigo, ' — ', COALESCE(m.solicitante_nombre, 'Sin solicitante')) AS descripcion,
          m.usuario_id,
          CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre,
          m.id AS referencia_id,
          m.fecha_movimiento AS fecha
        FROM movimientos m
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        WHERE ${movWhere}
        UNION ALL
        SELECT 
          al.id,
          'actividad' AS origen,
          al.tipo,
          al.modulo,
          al.descripcion,
          al.usuario_id,
          CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre,
          al.referencia_id,
          al.created_at AS fecha
        FROM actividad_log al
        LEFT JOIN usuarios u ON al.usuario_id = u.id
        WHERE ${actWhere}
      ) AS combined_results
      ORDER BY fecha DESC, id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(unionQuery, [
      ...movParams,
      ...actParams,
      Number(limit) || 20,
      Number(offset) || 0
    ]);

    return { data: rows, total: countResult.total };
  });

  // GET /api/actividad/:origen/:id — Detalle (movimiento o actividad)
  fastify.get('/:origen/:id', async (request, reply) => {
    const { origen, id } = request.params;

    if (origen === 'movimiento') {
      // Reutilizar lógica del detalle de movimiento
      const [[mov]] = await pool.query(`
        SELECT m.*, 
               alm.nombre AS almacen_nombre,
               paq.nombre AS paquete_nombre,
               u.nombres AS usuario_nombres, u.apellidos AS usuario_apellidos
        FROM movimientos m
        JOIN almacenes alm ON m.almacen_id = alm.id
        LEFT JOIN paquetes paq ON m.paquete_id = paq.id
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        WHERE m.id = ?
      `, [id]);

      if (!mov) return reply.code(404).send({ error: 'Movimiento no encontrado' });

      const [detalles] = await pool.query(`
        SELECT md.*, 
               a.nombre AS articulo_nombre, a.requiere_devolucion,
               c.nombre AS color_nombre, c.codigo_hex
        FROM movimiento_detalles md
        JOIN articulo_items ai ON md.articulo_item_id = ai.id
        JOIN articulos a ON ai.articulo_id = a.id
        JOIN colores c ON ai.color_id = c.id
        WHERE md.movimiento_id = ?
      `, [id]);

      mov.detalles = detalles;
      return { data: mov };
    } else {
      // Actividad CRUD simple
      const [[act]] = await pool.query(`
        SELECT al.*, CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre
        FROM actividad_log al
        LEFT JOIN usuarios u ON al.usuario_id = u.id
        WHERE al.id = ?
      `, [id]);

      if (!act) return reply.code(404).send({ error: 'Actividad no encontrada' });
      return { data: act };
    }
  });

  // GET /api/actividad/recientes — Para el dashboard (últimas 5 actividades de todo tipo)
  fastify.get('/recientes/dashboard', async (request) => {
    const userId = request.headers['x-user-id'];
    const userRole = request.headers['x-user-role'];

    const isRestricted = userId && userRole !== 'SuperAdministrador';

    const movAlmacenFilter = isRestricted
      ? ' AND m.almacen_id IN (SELECT almacen_id FROM usuario_almacen WHERE usuario_id = ?)'
      : '';
    const movParams = isRestricted ? [userId] : [];

    const query = `
      SELECT * FROM (
        SELECT 
          m.id,
          'movimiento' AS origen,
          m.tipo,
          'Movimiento' AS modulo,
          CONCAT(m.codigo, ' — ', COALESCE(m.solicitante_nombre, 'Sin solicitante')) AS descripcion,
          CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre,
          m.fecha_movimiento AS fecha
        FROM movimientos m
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        WHERE 1=1 ${movAlmacenFilter}
        UNION ALL
        SELECT 
          al.id,
          'actividad' AS origen,
          al.tipo,
          al.modulo,
          al.descripcion,
          CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre,
          al.created_at AS fecha
        FROM actividad_log al
        LEFT JOIN usuarios u ON al.usuario_id = u.id
      ) AS combined_results
      ORDER BY fecha DESC, id DESC
      LIMIT 8
    `;

    const [rows] = await pool.query(query, movParams);
    return { data: rows };
  });
}

module.exports = actividadRoutes;
