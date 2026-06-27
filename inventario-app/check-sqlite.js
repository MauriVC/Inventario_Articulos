const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'inventario-app', 'inventario_local.sqlite');

try {
  const db = new Database(dbPath);
  const almacenes = db.prepare('SELECT count(*) as count FROM almacenes').get();
  console.log('Almacenes in SQLite:', almacenes.count);
  const articulos = db.prepare('SELECT count(*) as count FROM articulos').get();
  console.log('Articulos in SQLite:', articulos.count);
} catch (err) {
  console.error('Error reading SQLite:', err.message);
}
