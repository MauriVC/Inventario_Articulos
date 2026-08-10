-- 001_initial_schema.sql
-- Esquema base de la base de datos local.
-- Se aplica con CREATE TABLE IF NOT EXISTS: en una BD existente es un no-op;
-- en una BD nueva crea todo el esquema.

CREATE TABLE IF NOT EXISTS almacenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  ubicacion TEXT,
  descripcion TEXT,
  estado TEXT DEFAULT 'Activo' CHECK(estado IN ('Activo', 'Inactivo')),
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
  rol TEXT DEFAULT 'Usuario' CHECK(rol IN ('SuperAdministrador', 'Administrador', 'Usuario')),
  estado TEXT DEFAULT 'Activo' CHECK(estado IN ('Activo', 'Inactivo')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  padre_id INTEGER,
  descripcion TEXT,
  estado TEXT DEFAULT 'Activo' CHECK(estado IN ('Activo', 'Inactivo')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (padre_id) REFERENCES categorias(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS marcas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT DEFAULT 'Activo' CHECK(estado IN ('Activo', 'Inactivo')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unidad_medidas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  abreviatura TEXT,
  estado TEXT DEFAULT 'Activo' CHECK(estado IN ('Activo', 'Inactivo')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS colores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  codigo_hex TEXT,
  estado TEXT DEFAULT 'Activo' CHECK(estado IN ('Activo', 'Inactivo')),
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
  estado TEXT DEFAULT 'Activo' CHECK(estado IN ('Activo', 'Inactivo')),
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
  estado TEXT DEFAULT 'Activo' CHECK(estado IN ('Activo', 'Inactivo')),
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
  tipo TEXT NOT NULL CHECK(tipo IN ('ENTRADA', 'SALIDA', 'BAJA')),
  es_devolucion INTEGER DEFAULT 0,
  almacen_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  paquete_id INTEGER,
  solicitante_ci TEXT,
  solicitante_nombre TEXT,
  solicitante_telefono TEXT,
  destino_procedencia TEXT,
  motivo_baja TEXT CHECK(motivo_baja IS NULL OR motivo_baja IN ('Dañado', 'Vencido', 'Pérdida', 'Consumo', 'Obsoleto', 'Otro')),
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
  estado TEXT DEFAULT 'Activo' CHECK(estado IN ('Activo', 'Inactivo')),
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
  tipo TEXT NOT NULL CHECK(tipo IN ('REGISTRO', 'EDICIÓN', 'BORRADO')),
  modulo TEXT NOT NULL,
  descripcion TEXT,
  usuario_id INTEGER,
  referencia_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Tabla especial para manejar la sincronizacion
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id INTEGER,
  payload TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  synced INTEGER DEFAULT 0
);
