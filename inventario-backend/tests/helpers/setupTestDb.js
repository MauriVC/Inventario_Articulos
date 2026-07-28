/**
 * setupTestDb.js
 * Crea una base de datos SQLite en memoria con el esquema completo
 * del sistema. Se usa en los tests de integración para aislarlos
 * completamente de la BD de producción.
 */
const Database = require('better-sqlite3');
const crypto = require('crypto');

/**
 * Crea y devuelve un objeto { db, env } listo para usar.
 * - db:  instancia better-sqlite3 en memoria
 * - env: variables de entorno que apuntan al modo local
 */
function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // ── Esquema idéntico al de localDb.js ──────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS almacenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      ubicacion TEXT,
      descripcion TEXT,
      estado TEXT DEFAULT 'Activo',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      carnet TEXT NOT NULL UNIQUE,
      nombres TEXT NOT NULL,
      apellidos TEXT NOT NULL,
      telefono TEXT,
      contrasena TEXT NOT NULL,
      rol TEXT DEFAULT 'Usuario',
      estado TEXT DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      padre_id INTEGER,
      descripcion TEXT,
      estado TEXT DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (padre_id) REFERENCES categorias(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS marcas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      estado TEXT DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS unidad_medidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      abreviatura TEXT NOT NULL,
      estado TEXT DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS colores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      codigo_hex TEXT,
      estado TEXT DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS atributos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS datos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      atributo_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (atributo_id) REFERENCES atributos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS articulos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      almacen_id INTEGER NOT NULL,
      categoria_id INTEGER NOT NULL,
      marca_id INTEGER,
      unidad_medida_id INTEGER NOT NULL,
      codigo TEXT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      requiere_devolucion INTEGER DEFAULT 0,
      estado TEXT DEFAULT 'Activo',
      created_by INTEGER,
      updated_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (almacen_id) REFERENCES almacenes(id) ON DELETE CASCADE,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
      FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE SET NULL,
      FOREIGN KEY (unidad_medida_id) REFERENCES unidad_medidas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS articulo_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      articulo_id INTEGER NOT NULL,
      color_id INTEGER NOT NULL,
      stock INTEGER DEFAULT 0,
      estado TEXT DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (articulo_id) REFERENCES articulos(id) ON DELETE CASCADE,
      FOREIGN KEY (color_id) REFERENCES colores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS movimientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      tipo TEXT NOT NULL,
      es_devolucion INTEGER DEFAULT 0,
      almacen_id INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL,
      paquete_id INTEGER,
      solicitante_ci TEXT,
      solicitante_nombre TEXT,
      observacion TEXT,
      fecha_movimiento DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (almacen_id) REFERENCES almacenes(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS movimiento_detalles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movimiento_id INTEGER NOT NULL,
      articulo_item_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      stock_anterior INTEGER NOT NULL,
      stock_posterior INTEGER NOT NULL,
      FOREIGN KEY (movimiento_id) REFERENCES movimientos(id) ON DELETE CASCADE,
      FOREIGN KEY (articulo_item_id) REFERENCES articulo_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS paquetes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      categoria_id INTEGER,
      almacen_id INTEGER NOT NULL,
      observacion TEXT,
      estado TEXT DEFAULT 'Activo',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS paquete_contenido (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paquete_id INTEGER NOT NULL,
      articulo_item_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      FOREIGN KEY (paquete_id) REFERENCES paquetes(id) ON DELETE CASCADE,
      FOREIGN KEY (articulo_item_id) REFERENCES articulo_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS usuario_almacen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      almacen_id INTEGER NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (almacen_id) REFERENCES almacenes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS permisos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      descripcion TEXT,
      modulo TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usuario_permiso (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      permiso_id INTEGER NOT NULL,
      UNIQUE(usuario_id, permiso_id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS actividad_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      modulo TEXT NOT NULL,
      descripcion TEXT,
      usuario_id INTEGER,
      referencia_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      record_id INTEGER,
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
    );
  `);

  // ── Datos semilla ──────────────────────────────────────────────────

  // Permisos del sistema
  const permisos = [
    ['GESTIONAR_USUARIOS',  'Gestionar usuarios del sistema', 'Usuarios'],
    ['CREAR_ALMACEN',       'Crear almacenes',                'Almacenes'],
    ['EDITAR_ALMACEN',      'Editar almacenes',               'Almacenes'],
    ['ELIMINAR_ALMACEN',    'Eliminar almacenes',             'Almacenes'],
    ['CREAR_ARTICULO',      'Crear artículos',                'Artículos'],
    ['EDITAR_ARTICULO',     'Editar artículos',               'Artículos'],
    ['ELIMINAR_ARTICULO',   'Eliminar artículos',             'Artículos'],
    ['VER_MOVIMIENTOS',     'Ver movimientos',                'Movimientos'],
    ['CREAR_MOVIMIENTO',    'Crear movimientos',              'Movimientos'],
  ];
  const insertPerm = db.prepare('INSERT INTO permisos (nombre, descripcion, modulo) VALUES (?, ?, ?)');
  for (const p of permisos) insertPerm.run(...p);

  // SuperAdministrador de prueba
  const hashAdmin = crypto.createHash('sha256').update('admin123').digest('hex');
  db.prepare(
    `INSERT INTO usuarios (id, carnet, nombres, apellidos, contrasena, rol, estado)
     VALUES (1, '11111111', 'Super', 'Admin', ?, 'SuperAdministrador', 'Activo')`
  ).run(hashAdmin);

  // Administrador de prueba (con permiso GESTIONAR_USUARIOS)
  const hashAdm = crypto.createHash('sha256').update('adm123').digest('hex');
  db.prepare(
    `INSERT INTO usuarios (id, carnet, nombres, apellidos, contrasena, rol, estado)
     VALUES (2, '22222222', 'Admin', 'Prueba', ?, 'Administrador', 'Activo')`
  ).run(hashAdm);
  // Asignar permiso GESTIONAR_USUARIOS al Administrador
  const permGestionar = db.prepare("SELECT id FROM permisos WHERE nombre = 'GESTIONAR_USUARIOS'").get();
  db.prepare('INSERT INTO usuario_permiso (usuario_id, permiso_id) VALUES (2, ?)').run(permGestionar.id);

  // Usuario sin permisos
  const hashUser = crypto.createHash('sha256').update('user123').digest('hex');
  db.prepare(
    `INSERT INTO usuarios (id, carnet, nombres, apellidos, contrasena, rol, estado)
     VALUES (3, '33333333', 'Usuario', 'SinPermisos', ?, 'Usuario', 'Activo')`
  ).run(hashUser);

  // Usuario inactivo
  const hashInact = crypto.createHash('sha256').update('inact123').digest('hex');
  db.prepare(
    `INSERT INTO usuarios (id, carnet, nombres, apellidos, contrasena, rol, estado)
     VALUES (4, '44444444', 'Inactivo', 'Test', ?, 'Usuario', 'Inactivo')`
  ).run(hashInact);

  // Almacén de prueba
  db.prepare(
    `INSERT INTO almacenes (id, nombre, ubicacion, estado, created_by)
     VALUES (1, 'Almacén Central', 'Planta Baja', 'Activo', 1)`
  ).run();

  // Asignar almacén al administrador
  db.prepare('INSERT INTO usuario_almacen (usuario_id, almacen_id) VALUES (2, 1)').run();

  return db;
}

/**
 * Inyecta la BD de test en database.js directamente a través de setTestDb().
 * Debe llamarse ANTES de hacer require() de buildTestApp.
 * Devuelve una función cleanup() que restaura el estado.
 */
function injectTestDb(db) {
  // Forzar modo local para que el pool exportado sea sqlitePool
  process.env.DB_MODE = 'local';

  // Usar la función setTestDb que expone database.js para reemplazar sqliteDb
  const { setTestDb } = require('../../src/config/database');
  setTestDb(db);

  return function cleanup() {
    db.close();
  };
}

module.exports = { createTestDb, injectTestDb };
