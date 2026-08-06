/**
 * Registrador central de rutas
 * Importa y registra cada módulo de rutas bajo /api
 */
async function registerRoutes(fastify) {
  // Catálogos simples
  fastify.register(require('./almacenes/almacenes.routes'),   { prefix: '/api/almacenes' });
  fastify.register(require('./catalogos/categorias/categorias.routes'),   { prefix: '/api/categorias' });
  fastify.register(require('./catalogos/marcas/marcas.routes'),       { prefix: '/api/marcas' });
  fastify.register(require('./catalogos/unidades/unidades.routes'),     { prefix: '/api/unidades' });
  fastify.register(require('./catalogos/colores/colores.routes'),      { prefix: '/api/colores' });

  // Con relaciones
  fastify.register(require('./catalogos/atributos/atributos.routes'),    { prefix: '/api/atributos' });
  fastify.register(require('./articulos/articulos.routes'),    { prefix: '/api/articulos' });

  // Complejos
  fastify.register(require('./paquetes/paquetes.routes'),     { prefix: '/api/paquetes' });
  fastify.register(require('./movimientos/movimientos.routes'),  { prefix: '/api/movimientos' });

  // Auth & Usuarios
  fastify.register(require('./auth/auth.routes'),         { prefix: '/api/auth' });
  fastify.register(require('./usuarios/usuarios.routes'),     { prefix: '/api/usuarios' });

  // Dashboard
  fastify.register(require('./dashboard/dashboard.routes'),    { prefix: '/api/dashboard' });

  // Historial de Actividades (unificado)
  fastify.register(require('./actividad/actividad.routes'),    { prefix: '/api/actividad' });
}

module.exports = registerRoutes;
