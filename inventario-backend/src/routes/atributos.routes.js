/**
 * Rutas CRUD — Atributos y sus Datos (valores)
 * Ej: Atributo "Acabado" → Datos: "Anillado", "Empastado"...
 */
const { pool } = require('../config/database');
const { registrarActividad } = require('../config/actividadLog');

async function atributosRoutes(fastify) {

  // GET /api/atributos — Listar atributos con sus datos
  fastify.get('/', async () => {
    const [atributos] = await pool.query('SELECT id, nombre, created_at FROM atributos ORDER BY nombre');
    const [datos] = await pool.query('SELECT id, atributo_id, nombre FROM datos ORDER BY nombre');

    const result = atributos.map(attr => ({
      ...attr,
      datos: datos.filter(d => d.atributo_id === attr.id)
    }));
    return { data: result };
  });

  // GET /api/atributos/:id
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const [atributos] = await pool.query('SELECT * FROM atributos WHERE id = ?', [id]);
    if (atributos.length === 0) return reply.code(404).send({ error: 'Atributo no encontrado' });

    const [datos] = await pool.query('SELECT id, nombre FROM datos WHERE atributo_id = ? ORDER BY nombre', [id]);
    return { data: { ...atributos[0], datos } };
  });

  // POST /api/atributos — Crear atributo (opcionalmente con datos iniciales)
  fastify.post('/', async (request, reply) => {
    const { nombre, datos } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });

    try {
      const [result] = await pool.query('INSERT INTO atributos (nombre) VALUES (?)', [nombre]);
      const atributoId = result.insertId;

      // Insertar datos si vienen
      if (datos && Array.isArray(datos) && datos.length > 0) {
        const values = datos.map(d => [atributoId, d]);
        await pool.query('INSERT INTO datos (atributo_id, nombre) VALUES ?', [values]);
      }

      const userId = request.headers['x-user-id'] || null;
      registrarActividad({ tipo: 'REGISTRO', modulo: 'Atributo', descripcion: `Se registró el atributo "${nombre}"`, usuario_id: userId, referencia_id: atributoId });
      return reply.code(201).send({ data: { id: atributoId, nombre } });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && (err.message.includes('Duplicate entry') || err.message.includes('UNIQUE constraint failed')))) {
        return reply.code(400).send({ error: 'Ya existe un atributo con este nombre' });
      }
      throw err;
    }
  });

  // PUT /api/atributos/:id — Renombrar atributo
  fastify.put('/:id', async (request, reply) => {
    const { nombre } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre es obligatorio' });
    try {
      const [result] = await pool.query('UPDATE atributos SET nombre = ? WHERE id = ?', [nombre, request.params.id]);
      if (result.affectedRows === 0) return reply.code(404).send({ error: 'Atributo no encontrado' });
      const userId = request.headers['x-user-id'] || null;
      registrarActividad({ tipo: 'EDICIÓN', modulo: 'Atributo', descripcion: `Se editó el atributo "${nombre}"`, usuario_id: userId, referencia_id: Number(request.params.id) });
      return { data: { id: Number(request.params.id), nombre } };
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && (err.message.includes('Duplicate entry') || err.message.includes('UNIQUE constraint failed')))) {
        return reply.code(400).send({ error: 'Ya existe un atributo con este nombre' });
      }
      throw err;
    }
  });

  // DELETE /api/atributos/:id — Elimina atributo y sus datos en cascada
  fastify.delete('/:id', async (request, reply) => {
    const [[attr]] = await pool.query('SELECT nombre FROM atributos WHERE id = ?', [request.params.id]);
    const [result] = await pool.query('DELETE FROM atributos WHERE id = ?', [request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Atributo no encontrado' });
    const userId = request.headers['x-user-id'] || null;
    registrarActividad({ tipo: 'BORRADO', modulo: 'Atributo', descripcion: `Se eliminó el atributo "${attr ? attr.nombre : 'ID:'+request.params.id}"`, usuario_id: userId, referencia_id: Number(request.params.id) });
    return { message: 'Atributo y sus datos eliminados' };
  });

  // --- Sub-rutas para Datos (valores de un atributo) ---

  // POST /api/atributos/:id/datos — Agregar un dato a un atributo
  fastify.post('/:id/datos', async (request, reply) => {
    const { id } = request.params;
    const { nombre } = request.body;
    if (!nombre) return reply.code(400).send({ error: 'El nombre del dato es obligatorio' });

    try {
      const [result] = await pool.query('INSERT INTO datos (atributo_id, nombre) VALUES (?, ?)', [id, nombre]);
      return reply.code(201).send({ data: { id: result.insertId, atributo_id: Number(id), nombre } });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && (err.message.includes('Duplicate entry') || err.message.includes('UNIQUE constraint failed')))) {
        return reply.code(400).send({ error: 'Ya existe este dato en el atributo' });
      }
      throw err;
    }
  });

  // DELETE /api/atributos/:id/datos/:datoId — Eliminar un dato
  fastify.delete('/:id/datos/:datoId', async (request, reply) => {
    const [result] = await pool.query('DELETE FROM datos WHERE id = ? AND atributo_id = ?', [request.params.datoId, request.params.id]);
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'Dato no encontrado' });
    return { message: 'Dato eliminado' };
  });
}

module.exports = atributosRoutes;
