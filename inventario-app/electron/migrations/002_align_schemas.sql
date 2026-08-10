-- Alinea el esquema SQLite local con el de MySQL en la nube.
-- En MySQL paquete_contenido.updated_at existe; en SQLite no, lo que
-- rompe downloadFromCloud al insertar filas bajadas de la nube
-- ("no such column: updated_at").
-- SQLite no admite CURRENT_TIMESTAMP como DEFAULT en ALTER TABLE ADD COLUMN;
-- el service local nunca escribe este campo y la bajada desde la nube lo puebla.
ALTER TABLE paquete_contenido ADD COLUMN updated_at DATETIME;
