const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'inventario-app', 'inventario_local.sqlite');

const SYNC_TABLES = [
  'almacenes', 'usuarios', 'categorias', 'marcas', 'unidad_medidas',
  'colores', 'atributos', 'datos', 'articulos', 'articulo_items',
  'articulo_datos', 'movimientos', 'movimiento_detalles', 'paquetes',
  'paquete_contenido', 'usuario_almacen'
];

try {
  const db = new Database(dbPath);
  for (const table of SYNC_TABLES) {
    const row = db.prepare(`SELECT count(*) as count FROM ${table}`).get();
    console.log(`${table}: ${row.count}`);
  }
} catch (err) {
  console.error('Error reading SQLite:', err.message);
}
