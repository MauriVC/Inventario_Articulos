/**
 * Rutas CRUD — Paquetes (con contenido)
 */
const { pool } = require('../config/database');

async function paquetesRoutes(fastify) {

  // GET /api/paquetes — Listar paquetes con su contenido
  fastify.get('/', async (request) => {
    const { almacen_id } = request.query;
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

    if (paquetes.length === 0) return { data: [] };

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

    const result = paquetes.map(paq => ({
      ...paq,
      categoria_nombre: paq.categoria_nombre || 'Mixta',
      items: contenido.filter(c => c.paquete_id === paq.id)
    }));

    return { data: result };
  });

  // GET /api/paquetes/:id
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
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

    if (paquetes.length === 0) return reply.code(404).send({ error: 'Paquete no encontrado' });

    return { data: { ...paquetes[0], categoria_nombre: paquetes[0].categoria_nombre || 'Mixta', items: contenido } };
  });

  // POST /api/paquetes — Crear paquete con contenido
  fastify.post('/', async (request, reply) => {
    const { nombre, categoria_id, almacen_id, observacion, items } = request.body;
    if (!nombre || !almacen_id) return reply.code(400).send({ error: 'nombre y almacen_id son obligatorios' });
    if (!items || items.length === 0) return reply.code(400).send({ error: 'El paquete debe tener al menos un artículo' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        'INSERT INTO paquetes (nombre, categoria_id, almacen_id, observacion) VALUES (?, ?, ?, ?)',
        [nombre, categoria_id || null, almacen_id, observacion || null]
      );
      const paqueteId = result.insertId;

      const vals = items.map(i => [paqueteId, i.articulo_item_id, i.cantidad || 1]);
      await conn.query('INSERT INTO paquete_contenido (paquete_id, articulo_item_id, cantidad) VALUES ?', [vals]);

      await conn.commit();
      return reply.code(201).send({ data: { id: paqueteId, nombre } });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  // PUT /api/paquetes/:id — Actualizar paquete y reemplazar contenido
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { nombre, categoria_id, observacion, estado, items } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        'UPDATE paquetes SET nombre = ?, categoria_id = ?, observacion = ?, estado = ? WHERE id = ?',
        [nombre, categoria_id || null, observacion || null, estado || 'Activo', id]
      );
      if (result.affectedRows === 0) {
        await conn.rollback();
        return reply.code(404).send({ error: 'Paquete no encontrado' });
      }

      // Reemplazar contenido
      if (items && items.length > 0) {
        await conn.query('DELETE FROM paquete_contenido WHERE paquete_id = ?', [id]);
        const vals = items.map(i => [id, i.articulo_item_id, i.cantidad || 1]);
        await conn.query('INSERT INTO paquete_contenido (paquete_id, articulo_item_id, cantidad) VALUES ?', [vals]);
      }

      await conn.commit();
      return { data: { id: Number(id), nombre } };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  // DELETE /api/paquetes/:id
  fastify.delete('/:id', async (request, reply) => {
    const [result] = await pool.query('DELETE FROM paquetes WHERE id = ?', [request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Paquete no encontrado' });
    return { message: 'Paquete eliminado' };
  });
}

module.exports = paquetesRoutes;
