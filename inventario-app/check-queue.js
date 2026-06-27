const { app } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(() => {
  try {
    const Database = require('better-sqlite3');
    const dbPath = 'C:\\\\Users\\\\USUARIO\\\\AppData\\\\Roaming\\\\inventario-app\\\\inventario_local.sqlite';
    console.log('Ruta:', dbPath);
    const db = new Database(dbPath);
    
    const rows = db.prepare(`SELECT * FROM sync_queue ORDER BY id ASC`).all();
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    app.quit();
  }
});
