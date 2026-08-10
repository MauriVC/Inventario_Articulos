const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const { fork, spawn } = require('child_process')
const { initLocalDb, backupLocalDb } = require('./localDb')
const connectionManager = require('./connectionManager')
const { runSync } = require('./syncService')
const isDev = !app.isPackaged

const envPath = isDev 
  ? path.join(__dirname, '../../inventario-backend/.env')
  : path.join(process.resourcesPath, 'backend/.env')
require('dotenv').config({ path: envPath })

// Disable hardware acceleration to prevent UI freezes (input freezing) on some Windows machines
app.disableHardwareAcceleration()

let backendProcess = null;
let mainWindow = null;
let syncIntervalId = null;
let currentMode = null; // 'cloud' o 'local' — evita reinicios innecesarios

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

  // Interceptar descargas para guardarlas automáticamente en la carpeta de Descargas
  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    const defaultPath = path.join(app.getPath('downloads'), item.getFilename());
    item.setSavePath(defaultPath);
  });

  // Show window when ready to avoid visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize()
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

// ═══════════════════════════════════════════════════
// Manejo de cambios de estado de red
// ═══════════════════════════════════════════════════
connectionManager.on('status-changed', async (onlineStatus) => {
  console.log(`[Main] Cambio de estado de red: ${onlineStatus ? 'ONLINE' : 'OFFLINE'}`);
  
  if (mainWindow) {
    mainWindow.webContents.send('network-status', onlineStatus);
  }
  
  if (onlineStatus) {
    // ── VOLVIÓ EL INTERNET ──
    // 1. Apagar backend LOCAL (con cierre limpio de SQLite)
    await killBackendAsync();
    await new Promise(resolve => setTimeout(resolve, 400));

    // 2. Arrancar backend en modo CLOUD de inmediato (no esperamos a la sync)
    startNewBackend(true);

    // 3. Activar sincronización periódica (respaldo si la inmediata falla)
    startPeriodicSync();

    // 4. Sincronización inmediata en paralelo (no bloquea el cambio de modo),
    //    con reintentos: la 1ra conexión a la nube puede fallar justo al reconectar
    //    (DNS/TLS aún no listos). Con reintentos evitamos esperar al ciclo periódico.
    syncWithRetryOnSwitch();
  } else {
    // ── SE FUE EL INTERNET ──
    // 1. Detener sincronización periódica
    stopPeriodicSync();
    
    // 2. ESPERAR si hay una sincronización en curso para no corromper SQLite
    if (isSyncing) {
      console.log('[Main] Esperando a que termine la sincronización actual antes de cambiar a modo LOCAL...');
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!isSyncing) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 200);
      });
    }

    // 3. Apagar backend CLOUD y arrancar en LOCAL
    await killBackendAsync();
    console.log('[Main] Cambiando a modo OFFLINE. SQLite tiene los últimos datos sincronizados.');
    startNewBackend(false);
  }
});

ipcMain.handle('get-network-status', () => connectionManager.getStatus());

// ═══════════════════════════════════════════════════
// Arranque de la aplicación
// ═══════════════════════════════════════════════════
app.whenReady().then(async () => {
  // 1. Inicializar BD local (siempre, independientemente del estado de red)
  initLocalDb(app.getPath('userData'));

  // 2. Verificar estado de red ANTES de hacer cualquier cosa
  //    Hacemos una verificación real (no usamos el valor asumido)
  const isOnline = await checkRealConnectivity();
  console.log(`[Main] Estado de red al arrancar: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

  // 3. Si hay internet, sincronizar nube → SQLite
  if (isOnline) {
    try {
      console.log('[Main] Descargando datos de la nube al SQLite local...');
      await runSync(process.env);
      console.log('[Main] SQLite local actualizado con datos de la nube.');
      // Respaldar el SQLite local tras la sync inicial (máximo 1 por hora)
      await backupLocalDb().catch((err) => console.error('[Backup] Error al respaldar:', err.message));
    } catch (err) {
      console.error('[Main] Error en la sincronización inicial:', err.message);
    }
    startPeriodicSync();
  } else {
    console.log('[Main] Sin internet. Usando datos del SQLite local (última sesión).');
  }

  // 4. Arrancar backend según el estado real de red
  startNewBackend(isOnline);

  // 5. Iniciar monitor de red (DESPUÉS de haber arrancado el backend)
  //    Así evitamos que el monitor cambie el modo mientras arrancamos
  connectionManager.start();

  // 6. Crear ventana
  createWindow();

  // 7. Configurar Auto-Updater (Solo en producción)
  if (!isDev) {
    autoUpdater.logger = console;
    autoUpdater.autoDownload = true;

    autoUpdater.on('update-available', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Actualización Disponible',
        message: 'Hay una nueva versión de la aplicación. Se está descargando en segundo plano, por favor espera.'
      });
    });

    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Actualización Lista',
        message: 'La actualización se ha descargado y está lista para instalarse. El sistema se reiniciará para aplicar los cambios.',
        buttons: ['Reiniciar y Actualizar']
      }).then(() => {
        autoUpdater.quitAndInstall();
      });
    });

    autoUpdater.on('error', (err) => {
      console.error('[AutoUpdater] Error:', err);
    });

    // Verificar actualizaciones después de configurar los listeners
    autoUpdater.checkForUpdatesAndNotify();
  }
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

// ═══════════════════════════════════════════════════
// Verificación real de conectividad (no usa el estado asumido)
// ═══════════════════════════════════════════════════
async function checkRealConnectivity() {
  return connectionManager.checkReachable();
}

// ═══════════════════════════════════════════════════
// Gestión del proceso backend
// ═══════════════════════════════════════════════════
function killBackendAsync() {
  return new Promise((resolve) => {
    if (!backendProcess) {
      return resolve();
    }
    
    if (backendProcess.exitCode !== null || backendProcess.killed) {
      backendProcess = null;
      currentMode = null;
      return resolve();
    }

    backendProcess.removeAllListeners('exit');
    backendProcess.once('exit', () => {
      backendProcess = null;
      currentMode = null;
      resolve();
    });
    
    try {
      backendProcess.kill('SIGTERM');
    } catch (e) {
      backendProcess = null;
      currentMode = null;
      resolve();
    }
  });
}

function startNewBackend(isOnline) {
  const mode = isOnline ? 'cloud' : 'local';
  
  // Evitar reiniciar si ya estamos en el modo correcto
  if (backendProcess && currentMode === mode) {
    console.log(`[Main] Backend ya está en modo ${mode.toUpperCase()}, no es necesario reiniciar.`);
    return;
  }

  const backendPath = isDev 
    ? path.join(__dirname, '../../inventario-backend/index.js') 
    : path.join(process.resourcesPath, 'backend/index.js');

  const sqlitePath = path.join(app.getPath('userData'), 'inventario_local.sqlite');

  console.log(`[Main] Arrancando backend en modo: ${mode.toUpperCase()}`);

  const backendEnv = {
    ...process.env,
    DB_MODE: mode,
    SQLITE_PATH: sqlitePath
  };

  if (mode === 'local') {
    if (isDev) {
      // ═══════════════════════════════════════════════════════════════
      // MODO LOCAL EN DESARROLLO: Usar el Node.js del SISTEMA
      // Razón: better-sqlite3 está compilado para el Node.js del sistema.
      // ═══════════════════════════════════════════════════════════════
      const systemNode = process.platform === 'win32' ? 'node' : '/usr/bin/node';
      console.log(`[Main] Usando Node.js del sistema: ${systemNode}`);
      backendProcess = spawn(systemNode, [backendPath], {
        env: backendEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      backendProcess.stdout.on('data', (data) => console.log(`[BACKEND-LOCAL] ${data.toString().trim()}`));
      backendProcess.stderr.on('data', (data) => console.error(`[BACKEND-LOCAL] ${data.toString().trim()}`));
    } else {
      // ═══════════════════════════════════════════════════════════════
      // MODO LOCAL EN PRODUCCIÓN: Usar fork() (Electron Node)
      // Razón: Al crear el .exe, better-sqlite3 se recompila específicamente
      // para la versión V8 de Electron, por lo que fork() funciona perfecto.
      // ═══════════════════════════════════════════════════════════════
      console.log('[Main] Usando Node interno de Electron (Modo Prod)');
      backendProcess = fork(backendPath, [], { env: backendEnv, stdio: 'pipe' });
      backendProcess.stdout.on('data', (data) => console.log(`[BACKEND-PROD] ${data.toString().trim()}`));
      backendProcess.stderr.on('data', (data) => console.error(`[BACKEND-PROD] ${data.toString().trim()}`));
    }
  } else {
    // MODO CLOUD: fork() funciona bien porque MySQL no usa binarios nativos problemáticos
    backendProcess = fork(backendPath, [], { env: backendEnv });
    
    // Escuchar mensajes del backend para forzar copias de seguridad inmediatas tras cambios
    backendProcess.on('message', (msg) => {
      if (msg && msg.type === 'trigger_sync') {
        triggerImmediateSync();
      }
    });
  }

  currentMode = mode;

  backendProcess.on('error', (err) => {
    console.error('[Main] Error en el backend:', err.message);
  });

  backendProcess.on('exit', (code) => {
    console.log(`[Main] Backend (${mode}) terminó con código: ${code}`);
    backendProcess = null;
    currentMode = null;
  });
}

// ═══════════════════════════════════════════════════
// Sincronización periódica y bajo demanda
// ═══════════════════════════════════════════════════
let isSyncing = false;
let pendingSync = false;
let syncTimeoutId = null;

// Ejecuta la sincronización asegurando que no se solapen
async function performSync() {
  if (isSyncing) {
    pendingSync = true;
    return;
  }
  isSyncing = true;
  pendingSync = false;
  
  if (connectionManager.getStatus()) {
    try {
      console.log('[Sync] Actualizando SQLite local con datos de la nube...');
      await runSync(process.env);
      console.log('[Sync] SQLite local actualizado exitosamente.');
      // Respaldar el SQLite local tras una sync exitosa (máximo 1 por hora)
      await backupLocalDb().catch((err) => console.error('[Backup] Error al respaldar:', err.message));
    } catch (err) {
      console.error('[Sync] Error en sincronización:', err.message);
    }
  }
  
  isSyncing = false;
  
  if (pendingSync) {
    performSync();
  }
}

// Para cuando el usuario realiza cambios (sincronización instantánea)
// Protegido por isSyncing/pendingSync para no solapar ejecuciones si ocurren muchos cambios de golpe
function triggerImmediateSync() {
  console.log('[Main] Detectados cambios en la nube. Sincronización instantánea activada...');
  performSync();
}

// Sincronización inmediata con reintentos (protegida por isSyncing para no solaparse).
// Intentos: 0s, 2s, 4s, 8s — suficiente para que DNS/TLS se estabilicen al reconectar.
async function syncWithRetryOnSwitch() {
  const delays = [0, 2000, 4000, 8000];
  for (let i = 0; i < delays.length; i++) {
    // Si el usuario volvió a OFFLINE durante los reintentos, abortar
    if (!connectionManager.getStatus()) {
      console.log('[Main] Se perdió la conexión durante los reintentos de sincronización. Abortando.');
      return;
    }
    if (i > 0) {
      console.log(`[Main] Reintentando sincronización inmediata (intento ${i + 1}/${delays.length}) en ${delays[i] / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
    try {
      // Respetar isSyncing: si otra sync (periódica/trigger) está en curso, esperarla
      while (isSyncing) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      isSyncing = true;
      let result = null;
      try {
        result = await runSync(process.env);
      } finally {
        isSyncing = false;
        // Si algo pidió sync mientras corríamos (trigger_sync/periódico), ejecutarlo
        if (pendingSync) {
          pendingSync = false;
          performSync();
        }
      }
      if (result && result.success) {
        console.log('[Main] Sincronización inmediata completada tras volver a online.');
        await backupLocalDb().catch((err) => console.error('[Backup] Error al respaldar:', err.message));
        return;
      }
      console.error('[Main] Sincronización inmediata no completada:', result && result.reason);
    } catch (err) {
      console.error('[Main] Error en sincronización inmediata:', err.message);
    }
  }
  console.error('[Main] Sincronización inmediata agotó reintentos. El ciclo periódico lo reintentará.');
}

function startPeriodicSync() {
  stopPeriodicSync();
  console.log('[Main] Sincronización periódica activada (cada 30 segundos).');
  syncIntervalId = setInterval(() => {
    console.log('[Main] Ejecutando sincronización periódica de rutina...');
    performSync();
  }, 30 * 1000); // Cada 30 segundos
}

function stopPeriodicSync() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log('[Main] Sincronización periódica detenida.');
  }
}
