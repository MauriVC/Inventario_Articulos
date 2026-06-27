const { app } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  try {
    const Database = require('better-sqlite3');
    const dbPath = 'C:\\\\Users\\\\USUARIO\\\\AppData\\\\Roaming\\\\inventario-app\\\\inventario_local.sqlite';
    console.log('Ruta:', dbPath);
    const db = new Database(dbPath);
    
    const tables = ['almacenes', 'usuarios', 'articulos', 'usuario_almacen', 'movimientos'];
    for (const table of tables) {
      const { c } = db.prepare(`SELECT count(*) as c FROM ${table}`).get();
      console.log(`Tabla ${table}: ${c} filas`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    app.quit();
  }
});
