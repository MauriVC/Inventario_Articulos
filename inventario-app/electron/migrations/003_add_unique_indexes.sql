-- 003_add_unique_indexes.sql
-- Alinea las restricciones UNIQUE de SQLite con las de MySQL en la nube.
-- Sin estas restricciones, la app local permite duplicados que la nube
-- rechaza (o peor, colisiona en ON DUPLICATE KEY UPDATE y corrompe datos).

CREATE UNIQUE INDEX IF NOT EXISTS uq_categorias_nombre ON categorias(nombre);
CREATE UNIQUE INDEX IF NOT EXISTS uq_marcas_nombre ON marcas(nombre);
CREATE UNIQUE INDEX IF NOT EXISTS uq_unidad_medidas_nombre ON unidad_medidas(nombre);
CREATE UNIQUE INDEX IF NOT EXISTS uq_colores_nombre ON colores(nombre);
CREATE UNIQUE INDEX IF NOT EXISTS uq_atributos_nombre ON atributos(nombre);
CREATE UNIQUE INDEX IF NOT EXISTS uq_datos_atributo_nombre ON datos(atributo_id, nombre);
CREATE UNIQUE INDEX IF NOT EXISTS uq_articulo_items_articulo_color ON articulo_items(articulo_id, color_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_articulo_datos_articulo_dato ON articulo_datos(articulo_id, dato_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_almacen_usuario_almacen ON usuario_almacen(usuario_id, almacen_id);
