-- ============================================
-- SISTEMA DE CONTROL DE INVENTARIO
-- Base de Datos Completa (v2 - con Atributos, Paquetes y Bajas)
-- MySQL / Aeven
-- ============================================

-- ============================================
-- 1. TABLA DE USUARIOS
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  carnet        VARCHAR(20) NOT NULL UNIQUE,
  nombres       VARCHAR(100) NOT NULL,
  apellidos     VARCHAR(100) NOT NULL,
  telefono      VARCHAR(20),
  contrasena    VARCHAR(255) NOT NULL,
  rol           ENUM('SuperAdministrador', 'Administrador', 'Usuario') NOT NULL DEFAULT 'Usuario',
  estado        ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 1B. TABLA DE PERMISOS
-- ============================================
CREATE TABLE IF NOT EXISTS permisos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL UNIQUE,
  descripcion   VARCHAR(255),
  modulo        VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 1C. TABLA PIVOTE: USUARIO ↔ PERMISOS
-- ============================================
CREATE TABLE IF NOT EXISTS usuario_permiso (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT NOT NULL,
  permiso_id    INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario_permiso (usuario_id, permiso_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 2. TABLA DE ALMACENES
-- ============================================
CREATE TABLE IF NOT EXISTS almacenes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(150) NOT NULL,
  ubicacion     VARCHAR(255),
  descripcion   TEXT,
  estado        ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  created_by    INT DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 3. TABLA PIVOTE: USUARIO ↔ ALMACÉN
-- ============================================
CREATE TABLE IF NOT EXISTS usuario_almacen (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT NOT NULL,
  almacen_id    INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario_almacen (usuario_id, almacen_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (almacen_id) REFERENCES almacenes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 4. TABLA DE CATEGORÍAS (con jerarquía)
-- ============================================
CREATE TABLE IF NOT EXISTS categorias (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL UNIQUE,
  padre_id      INT DEFAULT NULL,
  descripcion   VARCHAR(255),
  estado        ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (padre_id) REFERENCES categorias(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 5. TABLA DE MARCAS
-- ============================================
CREATE TABLE IF NOT EXISTS marcas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL UNIQUE,
  descripcion   VARCHAR(255),
  estado        ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 6. TABLA DE UNIDADES DE MEDIDA
-- ============================================
CREATE TABLE IF NOT EXISTS unidad_medidas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(50) NOT NULL UNIQUE,
  abreviatura   VARCHAR(10),
  estado        ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 7. TABLA DE COLORES
-- ============================================
CREATE TABLE IF NOT EXISTS colores (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(50) NOT NULL UNIQUE,
  codigo_hex    VARCHAR(7) DEFAULT '#CCCCCC',
  estado        ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 8. TABLA DE ATRIBUTOS (Acabado, Tamaño, Tipo de Hoja, etc.)
--    Reutiliza el patrón del ERP: Atributo → Dato
-- ============================================
CREATE TABLE IF NOT EXISTS atributos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL UNIQUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 9. TABLA DE DATOS (Valores de los atributos)
--    Ej: Atributo "Acabado" → Datos: "Anillado", "Empastado", etc.
-- ============================================
CREATE TABLE IF NOT EXISTS datos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  atributo_id   INT NOT NULL,
  nombre        VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_atributo_dato (atributo_id, nombre),
  FOREIGN KEY (atributo_id) REFERENCES atributos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 10. TABLA DE ARTÍCULOS (equivale a "productos" del ERP)
-- ============================================
CREATE TABLE IF NOT EXISTS articulos (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  almacen_id        INT NOT NULL,
  categoria_id      INT NOT NULL,
  marca_id          INT DEFAULT NULL,
  unidad_medida_id  INT NOT NULL,
  codigo             VARCHAR(30),
  nombre            VARCHAR(200) NOT NULL,
  descripcion       TEXT,
  requiere_devolucion TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = el artículo debe devolverse (herramientas, equipos), 0 = no requiere devolución (consumibles)',
  estado            ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  created_by        INT DEFAULT NULL,
  updated_by        INT DEFAULT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_almacen_estado (almacen_id, estado),
  INDEX idx_categoria (categoria_id),
  FOREIGN KEY (almacen_id) REFERENCES almacenes(id) ON DELETE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
  FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE SET NULL,
  FOREIGN KEY (unidad_medida_id) REFERENCES unidad_medidas(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 11. TABLA DE ARTÍCULO ITEMS (variantes por color)
--     Cada artículo puede tener N variantes de color,
--     cada una con su propio stock
-- ============================================
CREATE TABLE IF NOT EXISTS articulo_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  articulo_id   INT NOT NULL,
  color_id      INT NOT NULL,
  stock         INT NOT NULL DEFAULT 0,
  estado        ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_articulo_color (articulo_id, color_id),
  INDEX idx_articulo_estado (articulo_id, estado),
  FOREIGN KEY (articulo_id) REFERENCES articulos(id) ON DELETE CASCADE,
  FOREIGN KEY (color_id) REFERENCES colores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 12. TABLA PIVOTE: ARTÍCULO ↔ DATO (atributos asignados al artículo)
--     Reutiliza el patrón "producto_datos" del ERP
--     Ej: Artículo "Cuaderno 100h" tiene dato_id=1 (Anillado) + dato_id=5 (Carta)
-- ============================================
CREATE TABLE IF NOT EXISTS articulo_datos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  articulo_id   INT NOT NULL,
  dato_id       INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_articulo_dato (articulo_id, dato_id),
  INDEX idx_articulo (articulo_id),
  INDEX idx_dato (dato_id),
  FOREIGN KEY (articulo_id) REFERENCES articulos(id) ON DELETE CASCADE,
  FOREIGN KEY (dato_id) REFERENCES datos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 13. TABLA DE PAQUETES (paquetes personalizados)
--     Entidad independiente para armar paquetes de artículos
--     para enviar a clientes/solicitantes
-- ============================================
CREATE TABLE IF NOT EXISTS paquetes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(200) NOT NULL,
  categoria_id  INT DEFAULT NULL COMMENT 'NULL cuando es Mixta (artículos de diferentes categorías)',
  almacen_id    INT NOT NULL,
  observacion   TEXT,
  estado        ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  created_by    INT DEFAULT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
  FOREIGN KEY (almacen_id) REFERENCES almacenes(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 13b. TABLA DE PAQUETE CONTENIDO (artículos dentro de un paquete)
--      Cada línea indica qué artículo y cuántas unidades incluye
-- ============================================
CREATE TABLE IF NOT EXISTS paquete_contenido (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  paquete_id        INT NOT NULL,
  articulo_item_id  INT NOT NULL COMMENT 'Variante específica (artículo + color)',
  cantidad          INT NOT NULL DEFAULT 1,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (paquete_id) REFERENCES paquetes(id) ON DELETE CASCADE,
  FOREIGN KEY (articulo_item_id) REFERENCES articulo_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 14. TABLA DE MOVIMIENTOS (cabecera)
--     Tipos: ENTRADA, SALIDA, BAJA
-- ============================================
CREATE TABLE IF NOT EXISTS movimientos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  codigo        VARCHAR(20) NOT NULL UNIQUE,
  tipo          ENUM('ENTRADA', 'SALIDA', 'BAJA') NOT NULL,
  es_devolucion BOOLEAN DEFAULT FALSE,
  almacen_id    INT NOT NULL,
  usuario_id    INT NOT NULL COMMENT 'Usuario que registra el movimiento',
  paquete_id    INT DEFAULT NULL COMMENT 'Si la salida se originó desde un paquete, referencia al mismo',
  solicitante_ci    VARCHAR(20) COMMENT 'CI del solicitante (puede no ser usuario del sistema)',
  solicitante_nombre VARCHAR(200),
  solicitante_telefono VARCHAR(20),
  destino_procedencia VARCHAR(255) COMMENT 'Destino (salida/baja) o Procedencia (entrada)',
  motivo_baja   ENUM('Dañado', 'Vencido', 'Pérdida', 'Consumo', 'Obsoleto', 'Otro') DEFAULT NULL COMMENT 'Solo para tipo BAJA',
  observacion   TEXT,
  fecha_movimiento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_almacen_tipo_fecha (almacen_id, tipo, fecha_movimiento),
  INDEX idx_fecha (fecha_movimiento),
  FOREIGN KEY (almacen_id) REFERENCES almacenes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (paquete_id) REFERENCES paquetes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 15. TABLA DE MOVIMIENTO DETALLES (artículos en cada movimiento)
-- ============================================
CREATE TABLE IF NOT EXISTS movimiento_detalles (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  movimiento_id     INT NOT NULL,
  articulo_item_id  INT NOT NULL COMMENT 'La variante específica (color) afectada',
  cantidad          INT NOT NULL,
  stock_anterior    INT NOT NULL COMMENT 'Snapshot del stock antes del movimiento',
  stock_posterior   INT NOT NULL COMMENT 'Snapshot del stock después del movimiento',
  observacion       VARCHAR(255) COMMENT 'Observación individual por artículo (ej: estado del material devuelto)',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (movimiento_id) REFERENCES movimientos(id) ON DELETE CASCADE,
  FOREIGN KEY (articulo_item_id) REFERENCES articulo_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Color por defecto "S/N" para artículos sin color
INSERT IGNORE INTO colores (nombre, codigo_hex) VALUES ('S/N', '#E9ECEF');

-- Unidades de medida iniciales
INSERT IGNORE INTO usuarios (carnet, nombres, apellidos, telefono, contrasena, rol, estado) VALUES
  ('00000001', 'Super', 'Administrador', '70000001', 'admin123', 'SuperAdministrador', 'Activo');

-- Permisos iniciales
INSERT IGNORE INTO permisos (nombre, descripcion, modulo) VALUES
  ('VER_ALMACENES', 'Ver lista de almacenes', 'Almacenes'),
  ('CREAR_ALMACEN', 'Crear un almacén', 'Almacenes'),
  ('EDITAR_ALMACEN', 'Editar un almacén', 'Almacenes'),
  ('ELIMINAR_ALMACEN', 'Eliminar un almacén', 'Almacenes'),
  ('VER_ARTICULOS', 'Ver catálogo de artículos', 'Artículos'),
  ('CREAR_ARTICULO', 'Crear un artículo', 'Artículos'),
  ('EDITAR_ARTICULO', 'Editar un artículo', 'Artículos'),
  ('ELIMINAR_ARTICULO', 'Eliminar un artículo', 'Artículos'),
  ('VER_MOVIMIENTOS', 'Ver movimientos y stock', 'Movimientos'),
  ('REGISTRAR_ENTRADA', 'Registrar entrada de stock', 'Movimientos'),
  ('REGISTRAR_SALIDA', 'Registrar salida de stock', 'Movimientos'),
  ('REGISTRAR_BAJA', 'Dar de baja artículos', 'Movimientos'),
  ('VER_REPORTES', 'Acceso a los reportes y descargas', 'Reportes'),
  ('GESTIONAR_USUARIOS', 'Administrar usuarios y accesos', 'Usuarios'),
  ('GESTIONAR_CONFIGURACION', 'Administrar categorías, marcas, atributos', 'Configuración');

-- Asignar todos los permisos al SuperAdministrador inicial (id=1)
INSERT IGNORE INTO usuario_permiso (usuario_id, permiso_id)
SELECT 1, id FROM permisos;

INSERT IGNORE INTO unidad_medidas (nombre, abreviatura) VALUES
  ('Unidad', 'Ud'),
  ('Litro', 'L'),
  ('Kilogramo', 'Kg'),
  ('Metro', 'm'),
  ('Galón', 'Gal'),
  ('Rollo', 'Rl'),
  ('Resma', 'Rsm'),
  ('Caja', 'Cj'),
  ('Bolsa', 'Bls');

-- Atributos iniciales de ejemplo
INSERT IGNORE INTO atributos (nombre) VALUES
  ('Acabado'),
  ('Tamaño'),
  ('Tipo de Hoja');

-- Datos (valores) para los atributos de ejemplo
INSERT IGNORE INTO datos (atributo_id, nombre) VALUES
  -- Acabado
  (1, 'Anillado'),
  (1, 'Anillado Metálico'),
  (1, 'Empastado'),
  (1, 'Grapado'),
  (1, 'Espiral'),
  -- Tamaño
  (2, 'Carta'),
  (2, 'Oficio'),
  (2, 'Media Carta'),
  (2, 'A4'),
  (2, 'A5'),
  -- Tipo de Hoja
  (3, 'Blanca'),
  (3, 'Cuadriculada'),
  (3, 'Rayada'),
  (3, 'Punteada'),
  (3, 'Milimetrada');