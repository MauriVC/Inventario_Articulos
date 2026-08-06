const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function initLocalDb(userDataPath) {
  const dbPath = path.join(userDataPath, 'inventario_local.sqlite');
  console.log('[SQLite] Ruta de base de datos local:', dbPath);

  // Inicializar base de datos
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Migración: Verificar si el esquema tiene CASCADE (v2)
  // Si no, recrear todas las tablas desde cero
  migrateSchemaIfNeeded();

  db.pragma('foreign_keys = ON');

  // Crear esquema si no existe
  createSchema();

  return db;
}

function migrateSchemaIfNeeded() {
  try {
    // Verificar si almacenes tiene created_by
    const almacenesInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='almacenes'").get();
    if (almacenesInfo && !almacenesInfo.sql.includes('created_by')) {
      console.log('[SQLite] Agregando columna created_by a almacenes...');
      db.prepare("ALTER TABLE almacenes ADD COLUMN created_by INTEGER").run();
    }

    // Verificar si la tabla 'articulos' existe y tiene la FK con ON DELETE CASCADE
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='articulos'").get();
    if (tableInfo && !tableInfo.sql.includes('ON DELETE CASCADE')) {
      console.log('[SQLite] Migrando esquema a v2 (con ON DELETE CASCADE)...');
      db.pragma('foreign_keys = OFF');
      
      const tables = [
        'sync_queue', 'usuario_almacen', 'paquete_contenido', 'paquetes',
        'movimiento_detalles', 'movimientos', 'articulo_datos', 'articulo_items',
        'articulos', 'datos', 'atributos', 'colores', 'unidad_medidas',
        'marcas', 'categorias', 'usuarios', 'almacenes'
      ];
      for (const t of tables) {
        db.prepare(`DROP TABLE IF EXISTS ${t}`).run();
      }
      
      db.pragma('foreign_keys = ON');
      console.log('[SQLite] Tablas eliminadas. Se recrearán con CASCADE.');
    }
    // Verificar si unidad_medidas tiene abreviatura NOT NULL (corregir a nullable)
    const unidadInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='unidad_medidas'").get();
    if (unidadInfo && unidadInfo.sql.includes('abreviatura TEXT NOT NULL')) {
      console.log('[SQLite] Migrando unidad_medidas: abreviatura NOT NULL → nullable...');
      db.pragma('foreign_keys = OFF');
      const rows = db.prepare('SELECT * FROM unidad_medidas').all();
      db.prepare('DROP TABLE unidad_medidas').run();
      db.prepare(`CREATE TABLE unidad_medidas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        abreviatura TEXT,
        estado TEXT DEFAULT 'Activo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`).run();
      if (rows.length > 0) {
        const insert = db.prepare('INSERT INTO unidad_medidas (id, nombre, abreviatura, estado, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
        for (const row of rows) {
          insert.run(row.id, row.nombre, row.abreviatura, row.estado, row.created_at, row.updated_at);
        }
      }
      db.pragma('foreign_keys = ON');
      console.log('[SQLite] Migración de unidad_medidas completada.');
    }

  } catch (e) {
    // Si la tabla no existe, createSchema() la creará
  }
}

function getDb() {
  if (!db) throw new Error("Base de datos local no inicializada");
  return db;
}

function checkpointWal() {
  if (!db) return;
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
    console.log('[SQLite] WAL checkpoint completado.');
  } catch (e) {
    console.warn('[SQLite] No se pudo hacer WAL checkpoint:', e.message);
  }
}

function createSchema() {
  const createTablesSql = `
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
      abreviatura TEXT,
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

    CREATE TABLE IF NOT EXISTS articulo_datos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      articulo_id INTEGER NOT NULL,
      dato_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (articulo_id) REFERENCES articulos(id) ON DELETE CASCADE,
      FOREIGN KEY (dato_id) REFERENCES datos(id) ON DELETE CASCADE
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
      solicitante_telefono TEXT,
      destino_procedencia TEXT,
      motivo_baja TEXT,
      observacion TEXT,
      fecha_movimiento DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (almacen_id) REFERENCES almacenes(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (paquete_id) REFERENCES paquetes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS movimiento_detalles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movimiento_id INTEGER NOT NULL,
      articulo_item_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      stock_anterior INTEGER NOT NULL,
      stock_posterior INTEGER NOT NULL,
      observacion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
      updated_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS paquete_contenido (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paquete_id INTEGER NOT NULL,
      articulo_item_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paquete_id) REFERENCES paquetes(id) ON DELETE CASCADE,
      FOREIGN KEY (articulo_item_id) REFERENCES articulo_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS usuario_almacen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      almacen_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );

    -- Tabla especial para manejar la sincronización
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
      record_id INTEGER,
      payload TEXT, -- JSON
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
    );
  `;

  db.exec(createTablesSql);

  // Evitar colisiones de IDs (MySQL vs SQLite) haciendo que los IDs locales empiecen en 10,000,000
  const tables = [
    'almacenes', 'usuarios', 'categorias', 'marcas', 'unidad_medidas',
    'colores', 'atributos', 'datos', 'articulos', 'articulo_items',
    'movimientos', 'movimiento_detalles', 'paquetes', 'actividad_log'
  ];
  
  for (const table of tables) {
    try {
      db.prepare(`INSERT OR IGNORE INTO sqlite_sequence (name, seq) VALUES (?, 10000000)`).run(table);
    } catch (e) {
      // Ignorar si la tabla no tiene autoincrement aún
    }
  }

  console.log('[SQLite] Esquema local inicializado.');
}

module.exports = {
  initLocalDb,
  getDb,
  checkpointWal
};
