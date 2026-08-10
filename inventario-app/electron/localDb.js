const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { migrate } = require('./migrations');

let db;
let dbPath = null;
let lastBackupTime = 0;

const BACKUP_INTERVAL_MS = 60 * 60 * 1000; // como máximo 1 backup por hora tras syncs
const MAX_BACKUPS = 10;

function initLocalDb(userDataPath) {
  dbPath = path.join(userDataPath, 'inventario_local.sqlite');
  console.log('[SQLite] Ruta de base de datos local:', dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Esquema y cambios de estructura de forma incremental y segura
  migrate(db, path.join(__dirname, 'migrations'));

  seedSequences();

  // WAL checkpoint al cerrar (para consistencia)
  process.on('exit', () => {
    try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch {}
  });

  return db;
}

// Evitar colisiones de IDs (MySQL vs SQLite) haciendo que los IDs locales empiecen en 10,000,000
function seedSequences() {
  const tables = [
    'almacenes', 'usuarios', 'categorias', 'marcas', 'unidad_medidas',
    'colores', 'atributos', 'datos', 'articulos', 'articulo_items',
    'movimientos', 'movimiento_detalles', 'paquetes', 'actividad_log'
  ];

  for (const table of tables) {
    try {
      db.prepare(`INSERT OR IGNORE INTO sqlite_sequence (name, seq) VALUES (?, 10000000)`).run(table);
    } catch (e) {
      // Ignorar si la tabla no tiene autoincrement aAun
    }
  }
}

function getDb() {
  if (!db) throw new Error("Base de datos local no inicializada");
  return db;
}

function checkpointWal() {
  if (!db) return;
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
    console.log('[SQLite] WAL checkpoint completado.');
  } catch (e) {
    console.warn('[SQLite] No se pudo hacer WAL checkpoint:', e.message);
  }
}

function cleanupOldBackups(dir) {
  try {
    const files = fs.readdirSync(dir)
      .filter((f) => /^inventario_local-.*\.sqlite$/.test(f))
      .sort();
    while (files.length > MAX_BACKUPS) {
      fs.unlinkSync(path.join(dir, files.shift()));
    }
  } catch (error) {
    console.error('[Backup] Error en la limpieza de copias viejas:', error.message);
  }
}

/**
 * Copia de seguridad del SQLite local usando snapshot consistente (db.backup).
 * Se llama tras cada sync exitoso desde main.js (máximo 1 por hora).
 */
async function backupLocalDb(force = false) {
  if (!db || !dbPath) return null;
  const now = Date.now();
  if (!force && now - lastBackupTime < BACKUP_INTERVAL_MS) return null;

  const dir = path.join(path.dirname(dbPath), 'backups');
  try {
    fs.mkdirSync(dir, { recursive: true });
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    const dest = path.join(dir, `inventario_local-${stamp}.sqlite`);

    try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch {}
    await db.backup(dest);
    lastBackupTime = now;
    cleanupOldBackups(dir);
    console.log(`[Backup] Copia de seguridad creada: ${dest}`);
    return dest;
  } catch (error) {
    console.error('[Backup] Error al crear la copia:', error.message);
    return null;
  }
}

module.exports = {
  initLocalDb,
  getDb,
  checkpointWal,
  backupLocalDb
};
