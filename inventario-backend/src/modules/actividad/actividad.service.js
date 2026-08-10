const { pool } = require('../../core/config/database');

async function listar({ tipo, modulo, desde, hasta, search, limit, offset, usuario_id, userRole }) {
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
    movParams.length = 0;
  }

  if (modulo && modulo !== 'Movimiento') {
    movWhere = '1=0'; // movimientos no aplican si filtran otro módulo
    movParams.length = 0;
  }

  if (desde) { movWhere += ' AND m.fecha_movimiento >= ?'; movParams.push(desde); }
  if (hasta) { movWhere += ' AND m.fecha_movimiento <= ?'; movParams.push(`${hasta} 23:59:59`); }
  if (search) {
    movWhere += ' AND (m.codigo LIKE ? OR m.solicitante_nombre LIKE ?)';
    movParams.push(`%${search}%`, `%${search}%`);
  }
  if (usuario_id) {
    movWhere += ' AND m.usuario_id = ?';
    movParams.push(usuario_id);
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
    actParams.length = 0;
  }

  if (modulo && modulo !== 'Movimiento') {
    actWhere += ' AND al.modulo = ?';
    actParams.push(modulo);
  } else if (modulo === 'Movimiento') {
    actWhere = '1=0'; // actividades CRUD no aplican si filtran por movimiento
    actParams.length = 0;
  }

  if (desde) { actWhere += ' AND al.created_at >= ?'; actParams.push(desde); }
  if (hasta) { actWhere += ' AND al.created_at <= ?'; actParams.push(`${hasta} 23:59:59`); }
  if (search) {
    actWhere += ' AND al.descripcion LIKE ?';
    actParams.push(`%${search}%`);
  }
  if (usuario_id) {
    actWhere += ' AND al.usuario_id = ?';
    actParams.push(usuario_id);
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
    ORDER BY fecha DESC, (origen = 'movimiento') DESC, id DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(unionQuery, [
    ...movParams,
    ...actParams,
    Number(limit) || 20,
    Number(offset) || 0
  ]);

  return { data: rows, total: countResult.total };
}

async function obtenerPorId(origen, id) {
  if (origen === 'movimiento') {
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

    if (!mov) {
      const error = new Error('Movimiento no encontrado');
      error.statusCode = 404;
      throw error;
    }

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
    return mov;
  } else {
    // Actividad CRUD simple
    const [[act]] = await pool.query(`
      SELECT al.*, CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre
      FROM actividad_log al
      LEFT JOIN usuarios u ON al.usuario_id = u.id
      WHERE al.id = ?
    `, [id]);

    if (!act) {
      const error = new Error('Actividad no encontrada');
      error.statusCode = 404;
      throw error;
    }
    
    // Enriquecer datos si es un Artículo y no ha sido borrado físicamente
    if (act.modulo === 'Artículo' && act.referencia_id && act.tipo !== 'BORRADO') {
      const [[articulo]] = await pool.query(`
        SELECT a.codigo, a.nombre, a.descripcion, a.estado, a.requiere_devolucion,
               alm.nombre AS almacen_nombre, cat.nombre AS categoria_nombre,
               um.nombre AS unidad_nombre
        FROM articulos a
        LEFT JOIN almacenes alm ON a.almacen_id = alm.id
        LEFT JOIN categorias cat ON a.categoria_id = cat.id
        LEFT JOIN unidad_medidas um ON a.unidad_medida_id = um.id
        WHERE a.id = ?
      `, [act.referencia_id]);

      if (articulo) {
        act.articulo = articulo;
        const [variantes] = await pool.query(`
          SELECT c.nombre AS color_nombre, c.codigo_hex, ai.stock
          FROM articulo_items ai
          JOIN colores c ON ai.color_id = c.id
          WHERE ai.articulo_id = ?
        `, [act.referencia_id]);
        act.articulo.variantes = variantes;
        
        const [atributos] = await pool.query(`
          SELECT at.nombre AS atributo_nombre, d.nombre AS dato_nombre
          FROM articulo_datos ad
          JOIN datos d ON ad.dato_id = d.id
          JOIN atributos at ON d.atributo_id = at.id
          WHERE ad.articulo_id = ?
        `, [act.referencia_id]);
        act.articulo.atributos = atributos;
      }
    }

    return act;
  }
}

async function listarRecientesDashboard(userId, userRole) {
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
    ORDER BY fecha DESC, (origen = 'movimiento') DESC, id DESC
    LIMIT 8
  `;

  const [rows] = await pool.query(query, movParams);
  return rows;
}

module.exports = {
  listar,
  obtenerPorId,
  listarRecientesDashboard
};
