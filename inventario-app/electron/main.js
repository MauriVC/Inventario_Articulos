const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { fork } = require('child_process')
const { initLocalDb } = require('./localDb')
const connectionManager = require('./connectionManager')
const { runSync } = require('./syncService')
require('dotenv').config({ path: path.join(__dirname, '../../inventario-backend/.env') })

const isDev = !app.isPackaged

// Disable hardware acceleration to prevent UI freezes (input freezing) on some Windows machines
app.disableHardwareAcceleration()

let backendProcess = null;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'Sistema de Inventario - U.E. Corazón Nuevo',
    icon: path.join(__dirname, '../src/assets/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    autoHideMenuBar: true,
    show: false
  })

  // Exponer el estado actual a las ventanas web
  connectionManager.on('status-changed', async (onlineStatus) => {
    console.log(`[Main] Cambio de estado de red detectado: ${onlineStatus ? 'ONLINE' : 'OFFLINE'}`);
    
    if (mainWindow) {
      mainWindow.webContents.send('network-status', onlineStatus);
    }
    
    if (onlineStatus) {
      // 1. Apagamos el backend INMEDIATAMENTE de forma segura
      await killBackendAsync();
      
      // 2. Ejecutamos la sincronización de subida/bajada
      try {
        await runSync(process.env);
      } catch (err) {
        console.error('[Main] Error durante la sincronización:', err);
      }
      
      // 3. Encendemos el backend en modo nube
      startNewBackend(onlineStatus);
    } else {
      // Si se fue el internet, apagamos y prendemos en modo local
      await killBackendAsync();
      startNewBackend(onlineStatus);
    }
  });

  ipcMain.handle('get-network-status', () => connectionManager.getStatus());

  // Show window when ready to avoid visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // Uncomment to open DevTools automatically:
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  // 1. Inicializar BD local
  initLocalDb(app.getPath('userData'));

  // 2. Iniciar monitor de red
  connectionManager.start();

  // 3. Descargar datos si iniciamos con internet
  if (connectionManager.getStatus()) {
    try {
      await runSync(process.env);
    } catch (err) {
      console.error('[Main] Error en la sincronización inicial:', err);
    }
  }

  // 4. Arrancar backend y ventana
  restartBackend(connectionManager.getStatus());
  createWindow();
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

function killBackendAsync() {
  return new Promise((resolve) => {
    if (!backendProcess) {
      return resolve();
    }
    
    // Si ya está muerto (exitCode no es null) o fue matado, resolvemos de inmediato
    if (backendProcess.exitCode !== null || backendProcess.killed) {
      backendProcess = null;
      return resolve();
    }

    backendProcess.removeAllListeners('exit');
    backendProcess.once('exit', () => {
      backendProcess = null;
      resolve();
    });
    
    try {
      backendProcess.kill();
    } catch (e) {
      backendProcess = null;
      resolve();
    }
  });
}

function restartBackend(isOnline) {
  killBackendAsync().then(() => {
    startNewBackend(isOnline);
  });
}

function startNewBackend(isOnline) {
  const backendPath = isDev 
    ? path.join(__dirname, '../../inventario-backend/index.js') 
    : path.join(process.resourcesPath, 'backend/index.js');

  const sqlitePath = path.join(app.getPath('userData'), 'inventario_local.sqlite');

  console.log(`[Main] Arrancando backend en modo: ${isOnline ? 'CLOUD' : 'LOCAL'}`);
  
  const betterSqlite3Path = isDev
    ? path.join(__dirname, '../node_modules/better-sqlite3')
    : path.join(process.resourcesPath, 'app.asar/node_modules/better-sqlite3');

  backendProcess = fork(backendPath, [], {
    env: {
      ...process.env,
      DB_MODE: isOnline ? 'cloud' : 'local',
      SQLITE_PATH: sqlitePath,
      BETTER_SQLITE3_PATH: betterSqlite3Path
    }
  });

  backendProcess.on('error', (err) => {
    console.error('[Main] Error en el backend:', err);
  });
}
