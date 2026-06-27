require('dotenv').config({ path: '../inventario-backend/.env' });
const { app } = require('electron');
const path = require('path');
const { runSync } = require('./electron/syncService');
const { initLocalDb } = require('./electron/localDb');

app.whenReady().then(async () => {
  try {
    const fs = require('fs');
    const dbPath = path.join(app.getPath('userData'), 'inventario_local.sqlite');
    // NO borramos la bd
    
    initLocalDb(app.getPath('userData'));
    await runSync(process.env);
  } catch (err) {
    console.error(err);
  } finally {
    app.quit();
  }
});
