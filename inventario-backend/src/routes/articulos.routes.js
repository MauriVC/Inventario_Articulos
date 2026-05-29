/**
 * Rutas CRUD — Artículos (con items/variantes por color y atributos)
 */
const { pool } = require('../config/database');

async function articulosRoutes(fastify) {

  // GET /api/articulos — Listar artículos con sus variantes y atributos
  fastify.get('/', async (request) => {
    const { almacen_id, categoria_id, estado } = request.query;

    let where = '1=1';
    const params = [];
    if (almacen_id) { where += ' AND a.almacen_id = ?'; params.push(almacen_id); }
    if (categoria_id) { where += ' AND a.categoria_id = ?'; params.push(categoria_id); }
    if (estado) { where += ' AND a.estado = ?'; params.push(estado); }

    const [articulos] = await pool.query(`
      SELECT a.id, a.codigo, a.nombre, a.descripcion, a.requiere_devolucion, a.estado,
             a.almacen_id, alm.nombre AS almacen_nombre,
             a.categoria_id, cat.nombre AS categoria_nombre,
             a.marca_id, mar.nombre AS marca_nombre,
             a.unidad_medida_id, um.nombre AS unidad_nombre, um.abreviatura AS unidad_abreviatura,
             a.created_at
      FROM articulos a
      JOIN almacenes alm ON a.almacen_id = alm.id
      JOIN categorias cat ON a.categoria_id = cat.id
      LEFT JOIN marcas mar ON a.marca_id = mar.id
      JOIN unidad_medidas um ON a.unidad_medida_id = um.id
      WHERE ${where}
      ORDER BY a.nombre
    `, params);

    if (articulos.length === 0) return { data: [] };

    // Cargar variantes (items) y atributos en lote
    const ids = articulos.map(a => a.id);

    const [items] = await pool.query(`
      SELECT ai.id, ai.articulo_id, ai.stock, ai.estado,
             c.nombre AS color_nombre, c.codigo_hex
      FROM articulo_items ai
      JOIN colores c ON ai.color_id = c.id
      WHERE ai.articulo_id IN (?)
      ORDER BY c.nombre
    `, [ids]);

    const [datosAsignados] = await pool.query(`
      SELECT ad.articulo_id, d.nombre AS dato_nombre, at.nombre AS atributo_nombre
      FROM articulo_datos ad
      JOIN datos d ON ad.dato_id = d.id
      JOIN atributos at ON d.atributo_id = at.id
      WHERE ad.articulo_id IN (?)
    `, [ids]);

    const result = articulos.map(art => ({
      ...art,
      variantes: items.filter(i => i.articulo_id === art.id),
      stock_total: items.filter(i => i.articulo_id === art.id).reduce((sum, i) => sum + i.stock, 0),
      atributos: datosAsignados.filter(d => d.articulo_id === art.id).map(d => d.dato_nombre)
    }));

    return { data: result };
  });

  // GET /api/articulos/:id — Detalle de un artículo
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
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
    if (articulos.length === 0) return reply.code(404).send({ error: 'Artículo no encontrado' });

    const [variantes] = await pool.query(`
      SELECT ai.id, ai.stock, ai.estado, c.nombre AS color_nombre, c.codigo_hex
      FROM articulo_items ai JOIN colores c ON ai.color_id = c.id
      WHERE ai.articulo_id = ?
    `, [id]);

    const [atributos] = await pool.query(`
      SELECT d.nombre AS dato_nombre, at.nombre AS atributo_nombre
      FROM articulo_datos ad
      JOIN datos d ON ad.dato_id = d.id
      JOIN atributos at ON d.atributo_id = at.id
      WHERE ad.articulo_id = ?
    `, [id]);

    return {
      data: {
        ...articulos[0],
        variantes,
        stock_total: variantes.reduce((sum, v) => sum + v.stock, 0),
        atributos: atributos.map(a => ({ atributo: a.atributo_nombre, dato: a.dato_nombre }))
      }
    };
  });

  // POST /api/articulos — Crear artículo con variantes y atributos
  fastify.post('/', async (request, reply) => {
    const { almacen_id, categoria_id, marca_id, unidad_medida_id, codigo, nombre, descripcion, requiere_devolucion, variantes, dato_ids } = request.body;

    if (!nombre || !almacen_id || !categoria_id || !unidad_medida_id) {
      return reply.code(400).send({ error: 'nombre, almacen_id, categoria_id y unidad_medida_id son obligatorios' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [artResult] = await conn.query(
        'INSERT INTO articulos (almacen_id, categoria_id, marca_id, unidad_medida_id, codigo, nombre, descripcion, requiere_devolucion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [almacen_id, categoria_id, marca_id || null, unidad_medida_id, codigo || null, nombre, descripcion || null, requiere_devolucion ? 1 : 0]
      );
      const articuloId = artResult.insertId;

      // Insertar variantes (color + stock)
      if (variantes && variantes.length > 0) {
        const vals = variantes.map(v => [articuloId, v.color_id, v.stock || 0]);
        await conn.query('INSERT INTO articulo_items (articulo_id, color_id, stock) VALUES ?', [vals]);
      }

      // Insertar atributos (dato_ids)
      if (dato_ids && dato_ids.length > 0) {
        const vals = dato_ids.map(did => [articuloId, did]);
        await conn.query('INSERT INTO articulo_datos (articulo_id, dato_id) VALUES ?', [vals]);
      }

      await conn.commit();
      return reply.code(201).send({ data: { id: articuloId, nombre } });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  // PUT /api/articulos/:id — Actualizar datos básicos
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { categoria_id, marca_id, unidad_medida_id, codigo, nombre, descripcion, requiere_devolucion, estado } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });

    const [result] = await pool.query(
      'UPDATE articulos SET categoria_id = ?, marca_id = ?, unidad_medida_id = ?, codigo = ?, nombre = ?, descripcion = ?, requiere_devolucion = ?, estado = ? WHERE id = ?',
      [categoria_id, marca_id || null, unidad_medida_id, codigo || null, nombre, descripcion || null, requiere_devolucion ? 1 : 0, estado || 'Activo', id]
    );
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Artículo no encontrado' });
    return { data: { id: Number(id), nombre } };
  });

  // PATCH /api/articulos/:id/devolucion — Toggle requiere_devolucion
  fastify.patch('/:id/devolucion', async (request, reply) => {
    const { id } = request.params;
    const { requiere_devolucion } = request.body;
    const [result] = await pool.query(
      'UPDATE articulos SET requiere_devolucion = ? WHERE id = ?',
      [requiere_devolucion ? 1 : 0, id]
    );
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Artículo no encontrado' });
    return { data: { id: Number(id), requiere_devolucion: !!requiere_devolucion } };
  });

  // DELETE /api/articulos/:id
  fastify.delete('/:id', async (request, reply) => {
    const [result] = await pool.query('DELETE FROM articulos WHERE id = ?', [request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Artículo no encontrado' });
    return { message: 'Artículo eliminado' };
  });
}

module.exports = articulosRoutes;
