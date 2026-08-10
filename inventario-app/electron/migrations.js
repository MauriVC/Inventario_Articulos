const fs = require('fs');
const path = require('path');

/**
 * Sistema de migraciones incremental para el SQLite local.
 *
 * - Carpeta: electron/migrations/*.sql con nombres tipo 001_nombre.sql
 * - La tabla schema_migrations registra cuáles ya se aplicaron.
 * - Cada migración se aplica dentro de una transacción.
 */

function ensureMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function getAppliedVersions(db) {
  return new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version)
  );
}

/** Aplica las migraciones pendientes. Idempotente. */
function migrate(db, migrationsDir) {
  ensureMigrationsTable(db);
  const applied = getAppliedVersions(db);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort();

  for (const file of files) {
    const version = Number(file.match(/^(\d+)/)[1]);
    if (applied.has(version)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const apply = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(version, file);
    });
    apply();
    console.log(`[SQLite] Migración aplicada: ${file}`);
  }
}

module.exports = { migrate };
