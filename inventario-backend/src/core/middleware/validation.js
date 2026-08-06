/**
 * Middlewares de Validación
 * Usados para limpiar y validar inputs antes de que toquen el controlador.
 */

// Valida que el parámetro ID en la URL sea un número
const validateIdParam = (request, reply, done) => {
  const { id } = request.params;
  if (!id || isNaN(Number(id))) {
    return reply.code(400).send({ error: 'Parámetro ID inválido. Debe ser numérico.' });
  }
  done();
};

// Valida el cuerpo en el endpoint de login
const validateLoginBody = (request, reply, done) => {
  const { carnet, contrasena } = request.body || {};
  if (!carnet || !contrasena) {
    return reply.code(400).send({ error: 'Carnet y contraseña son obligatorios' });
  }
  
  if (typeof carnet !== 'string' || carnet.trim() === '') {
    return reply.code(400).send({ error: 'El carnet proporcionado es inválido' });
  }
  
  done();
};

// Valida el cuerpo al crear/editar un almacén
const validateAlmacenBody = (request, reply, done) => {
  const { nombre } = request.body || {};
  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    return reply.code(400).send({ error: 'El campo nombre es obligatorio y debe ser texto' });
  }
  done();
};

// Valida el cuerpo genérico para configuración (marcas, colores, unidades, categorias, atributos)
const validateConfiguracionBody = (request, reply, done) => {
  const { nombre } = request.body || {};
  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    return reply.code(400).send({ error: 'El nombre es obligatorio' });
  }
  done();
};

// Valida creación de datos de atributos
const validateDatoAtributoBody = (request, reply, done) => {
  const { nombre } = request.body || {};
  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    return reply.code(400).send({ error: 'El nombre del dato es obligatorio' });
  }
  done();
};

// Valida creación/edición de usuario
const validateUsuarioBody = (request, reply, done) => {
  const { carnet, nombres, apellidos } = request.body || {};
  if (!carnet || !nombres || !apellidos) {
    return reply.code(400).send({ error: 'carnet, nombres y apellidos son obligatorios' });
  }
  
  // Si es POST, la contraseña también es requerida. 
  // Evaluamos esto en la ruta si es POST (se requiere contraseña) o PUT (es opcional).
  if (request.method === 'POST') {
    const { contrasena } = request.body;
    if (!contrasena) {
      return reply.code(400).send({ error: 'La contraseña es obligatoria al crear un usuario' });
    }
  }
  done();
};

// Valida creación/edición de artículo
const validateArticuloBody = (request, reply, done) => {
  const { nombre, almacen_id, categoria_id, unidad_medida_id } = request.body || {};
  if (!nombre || !almacen_id || !categoria_id || !unidad_medida_id) {
    return reply.code(400).send({ error: 'nombre, almacen_id, categoria_id y unidad_medida_id son obligatorios' });
  }
  done();
};

// Valida estado del artículo
const validateArticuloEstadoBody = (request, reply, done) => {
  const { estado } = request.body || {};
  if (!estado || (estado !== 'Activo' && estado !== 'Inactivo')) {
    return reply.code(400).send({ error: 'Estado es obligatorio y debe ser Activo o Inactivo' });
  }
  done();
};

// Valida creación de paquete
const validatePaqueteBody = (request, reply, done) => {
  const { nombre, almacen_id, items } = request.body || {};
  if (!nombre || !almacen_id) {
    return reply.code(400).send({ error: 'nombre y almacen_id son obligatorios' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return reply.code(400).send({ error: 'El paquete debe tener al menos un artículo' });
  }
  done();
};

// Valida registro de movimiento
const validateMovimientoBody = (request, reply, done) => {
  const { tipo, almacen_id, detalles } = request.body || {};
  if (!tipo || !almacen_id || !detalles) {
    return reply.code(400).send({ error: 'tipo, almacen_id y detalles son obligatorios' });
  }
  if (!['ENTRADA', 'SALIDA', 'BAJA'].includes(tipo)) {
    return reply.code(400).send({ error: 'tipo debe ser ENTRADA, SALIDA o BAJA' });
  }
  if (!Array.isArray(detalles) || detalles.length === 0) {
    return reply.code(400).send({ error: 'Debe haber al menos un detalle de artículo' });
  }
  done();
};

module.exports = {
  validateIdParam,
  validateLoginBody,
  validateAlmacenBody,
  validateConfiguracionBody,
  validateDatoAtributoBody,
  validateUsuarioBody,
  validateArticuloBody,
  validateArticuloEstadoBody,
  validatePaqueteBody,
  validateMovimientoBody
};
