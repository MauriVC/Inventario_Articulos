/**
 * Servicio — Paquetes
 */
const { pool } = require('../../core/config/database');
const { registrarActividad } = require('../../core/config/actividadLog');

/**
 * Listar paquetes con su contenido
 */
async function listar({ almacen_id } = {}) {
  let where = '1=1';
  const params = [];
  if (almacen_id) { where += ' AND p.almacen_id = ?'; params.push(almacen_id); }

  const [paquetes] = await pool.query(`
    SELECT p.id, p.nombre, p.observacion, p.estado, p.created_at,
           p.almacen_id, alm.nombre AS almacen_nombre,
           p.categoria_id, cat.nombre AS categoria_nombre
    FROM paquetes p
    JOIN almacenes alm ON p.almacen_id = alm.id
    LEFT JOIN categorias cat ON p.categoria_id = cat.id
    WHERE ${where}
    ORDER BY p.nombre
  `, params);

  if (paquetes.length === 0) return [];

  const ids = paquetes.map(p => p.id);
  const [contenido] = await pool.query(`
    SELECT pc.paquete_id, pc.cantidad,
           ai.id AS articulo_item_id, ai.stock,
           a.nombre AS articulo_nombre, a.requiere_devolucion,
           c.nombre AS color_nombre, c.codigo_hex
    FROM paquete_contenido pc
    JOIN articulo_items ai ON pc.articulo_item_id = ai.id
    JOIN articulos a ON ai.articulo_id = a.id
    JOIN colores c ON ai.color_id = c.id
    WHERE pc.paquete_id IN (?)
  `, [ids]);

  return paquetes.map(paq => ({
    ...paq,
    categoria_nombre: paq.categoria_nombre || 'Mixta',
    items: contenido.filter(c => c.paquete_id === paq.id)
  }));
}

/**
 * Obtener un paquete por ID con sus items
 */
async function obtenerPorId(id) {
  const [
    [paquetes],
    [contenido]
  ] = await Promise.all([
    pool.query(`
      SELECT p.*, alm.nombre AS almacen_nombre, cat.nombre AS categoria_nombre
      FROM paquetes p
      JOIN almacenes alm ON p.almacen_id = alm.id
      LEFT JOIN categorias cat ON p.categoria_id = cat.id
      WHERE p.id = ?
    `, [id]),
    pool.query(`
      SELECT pc.cantidad, ai.id AS articulo_item_id, ai.stock,
             a.nombre AS articulo_nombre, a.requiere_devolucion,
             c.nombre AS color_nombre, c.codigo_hex
      FROM paquete_contenido pc
      JOIN articulo_items ai ON pc.articulo_item_id = ai.id
      JOIN articulos a ON ai.articulo_id = a.id
      JOIN colores c ON ai.color_id = c.id
      WHERE pc.paquete_id = ?
    `, [id])
  ]);

  if (paquetes.length === 0) {
    const error = new Error('Paquete no encontrado');
    error.statusCode = 404;
    throw error;
  }

  return { ...paquetes[0], categoria_nombre: paquetes[0].categoria_nombre || 'Mixta', items: contenido };
}

/**
 * Crear un paquete con su contenido en transacción
 */
async function crear({ nombre, categoria_id, almacen_id, descripcion, items, userId }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO paquetes (nombre, categoria_id, almacen_id, observacion) VALUES (?, ?, ?, ?)',
      [nombre, categoria_id || null, almacen_id, descripcion || null]
    );
    const paqueteId = result.insertId;

    const vals = items.map(i => [paqueteId, i.articulo_item_id, i.cantidad || 1]);
    await conn.query('INSERT INTO paquete_contenido (paquete_id, articulo_item_id, cantidad) VALUES ?', [vals]);

    await conn.commit();
    registrarActividad({ tipo: 'REGISTRO', modulo: 'Paquete', descripcion: `Se registró el paquete "${nombre}"`, usuario_id: userId, referencia_id: paqueteId });
    return { id: paqueteId, nombre };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Actualizar un paquete y reemplazar su contenido
 */
async function actualizar(id, { nombre, categoria_id, observacion, estado, items, userId }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'UPDATE paquetes SET nombre = ?, categoria_id = ?, observacion = ?, estado = ? WHERE id = ?',
      [nombre, categoria_id || null, observacion || null, estado || 'Activo', id]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      const error = new Error('Paquete no encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (items && items.length > 0) {
      await conn.query('DELETE FROM paquete_contenido WHERE paquete_id = ?', [id]);
      const vals = items.map(i => [id, i.articulo_item_id, i.cantidad || 1]);
      await conn.query('INSERT INTO paquete_contenido (paquete_id, articulo_item_id, cantidad) VALUES ?', [vals]);
    }

    await conn.commit();
    registrarActividad({ tipo: 'EDICIÓN', modulo: 'Paquete', descripcion: `Se editó el paquete "${nombre}"`, usuario_id: userId, referencia_id: Number(id) });
    return { id: Number(id), nombre };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Eliminar un paquete
 */
async function eliminar(id, userId) {
  const [[paq]] = await pool.query('SELECT nombre FROM paquetes WHERE id = ?', [id]);
  const [result] = await pool.query('DELETE FROM paquetes WHERE id = ?', [id]);
  if (result.affectedRows === 0) {
    const error = new Error('Paquete no encontrado');
    error.statusCode = 404;
    throw error;
  }
  registrarActividad({ tipo: 'BORRADO', modulo: 'Paquete', descripcion: `Se eliminó el paquete "${paq ? paq.nombre : 'ID:' + id}"`, usuario_id: userId, referencia_id: Number(id) });
  return { message: 'Paquete eliminado' };
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
