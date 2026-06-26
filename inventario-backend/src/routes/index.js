/**
 * Registrador central de rutas
 * Importa y registra cada módulo de rutas bajo /api
 */
async function registerRoutes(fastify) {
  // Catálogos simples
  fastify.register(require('./almacenes.routes'),   { prefix: '/api/almacenes' });
  fastify.register(require('./categorias.routes'),   { prefix: '/api/categorias' });
  fastify.register(require('./marcas.routes'),       { prefix: '/api/marcas' });
  fastify.register(require('./unidades.routes'),     { prefix: '/api/unidades' });
  fastify.register(require('./colores.routes'),      { prefix: '/api/colores' });

  // Con relaciones
  fastify.register(require('./atributos.routes'),    { prefix: '/api/atributos' });
  fastify.register(require('./articulos.routes'),    { prefix: '/api/articulos' });

  // Complejos
  fastify.register(require('./paquetes.routes'),     { prefix: '/api/paquetes' });
  fastify.register(require('./movimientos.routes'),  { prefix: '/api/movimientos' });

  // Auth & Usuarios
  fastify.register(require('./auth.routes'),         { prefix: '/api/auth' });
  fastify.register(require('./usuarios.routes'),     { prefix: '/api/usuarios' });

  // Dashboard
  fastify.register(require('./dashboard.routes'),    { prefix: '/api/dashboard' });
}

module.exports = registerRoutes;
