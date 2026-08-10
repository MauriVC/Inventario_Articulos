const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { getSqliteDb, getSqlitePath } = require('./database');

// Configurable por entorno
const CRON_SCHEDULE = process.env.BACKUP_CRON || '0 2 * * *'; // diario 02:00
const MAX_BACKUPS = Number(process.env.BACKUP_MAX) || 10;
const BACKUP_DIR = process.env.BACKUP_DIR || null; // si se define, usa otra carpeta

let scheduled = false;

function getBackupDir() {
  if (BACKUP_DIR) return BACKUP_DIR;
  return path.join(path.dirname(getSqlitePath()), 'backups');
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
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
 * Crea una copia de seguridad consistente del SQLite local.
 * Usa db.backup() (snapshot) para que la copia incluya el WAL.
 */
async function createBackup() {
  const db = getSqliteDb();
  const dbPath = getSqlitePath();
  if (!db || !dbPath) {
    console.log('[Backup] SQLite no está activo (modo cloud o BD de prueba) — backup omitido.');
    return null;
  }

  const dir = getBackupDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, `inventario_local-${timestamp()}.sqlite`);

    // checkpoint previo para que el snapshot incluya lo más reciente
    try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch {}

    await db.backup(dest); // snapshot consistente (mejor que copiar el archivo)
    cleanupOldBackups(dir);
    console.log(`[Backup] Copia creada: ${dest}`);
    return dest;
  } catch (error) {
    console.error('[Backup] Error al crear la copia:', error.message);
    return null;
  }
}

/** Arranca el respaldo programado. Solo actúa si SQLite está activo (modo LOCAL). */
function startBackupScheduler() {
  if (scheduled) return;
  const db = getSqliteDb();
  if (!db) {
    console.log('[Backup] SQLite no activo (modo cloud) — respaldo automático desactivado.');
    return;
  }
  scheduled = true;
  console.log(`[Backup] Programado: cron "${CRON_SCHEDULE}", máx ${MAX_BACKUPS} copias, carpeta: ${getBackupDir()}`);
  createBackup(); // copia inicial al arrancar
  cron.schedule(CRON_SCHEDULE, () => {
    createBackup().catch(() => {});
  });
}

module.exports = { createBackup, startBackupScheduler };
