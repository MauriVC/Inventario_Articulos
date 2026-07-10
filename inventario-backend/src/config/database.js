/**
 * Módulo de conexión a MySQL (Aiven)
 * Exporta un pool de conexiones reutilizable
 */
const mysql = require('mysql2/promise');
const path = require('path');

// MODO DUAL: 'cloud' (Aiven MySQL) o 'local' (SQLite)
const DB_MODE = process.env.DB_MODE || 'cloud';

let mysqlPool = null;
let sqliteDb = null;

// --- CONFIGURACIÓN MYSQL ---
if (DB_MODE === 'cloud') {
  mysqlPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    timezone: 'Z',
    ...(process.env.DB_SSL === 'true' && { ssl: { rejectUnauthorized: false } }),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

// --- CONFIGURACIÓN SQLITE ---
if (DB_MODE === 'local') {
  const Database = require('better-sqlite3');
    
  // La ruta asume que estamos en el directorio de la app o backend.
  // En producción, esto apuntará al userData de Electron.
  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../inventario_local.sqlite');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
}

// --- CAPA DE COMPATIBILIDAD SQLITE -> MYSQL2 ---
function replaceBalancedFunction(sql, funcName, transformFn) {
  // Reemplaza funcName(contenido_balanceado) usando conteo de paréntesis
  const regex = new RegExp(funcName + '\\(', 'gi');
  let match;
  while ((match = regex.exec(sql)) !== null) {
    const start = match.index;
    let depth = 1;
    let i = start + match[0].length;
    while (i < sql.length && depth > 0) {
      if (sql[i] === '(') depth++;
      else if (sql[i] === ')') depth--;
      i++;
    }
    const inner = sql.substring(start + match[0].length, i - 1);
    const replacement = transformFn(inner);
    sql = sql.substring(0, start) + replacement + sql.substring(i);
    // Reset regex lastIndex para evitar saltar caracteres
    regex.lastIndex = start + replacement.length;
  }
  return sql;
}

function splitTopLevelArgs(str) {
  const args = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if ((c === "'" || c === '"') && !inString) {
      inString = true;
      stringChar = c;
      current += c;
    } else if (inString && c === stringChar) {
      inString = false;
      current += c;
    } else if (!inString && c === '(') {
      depth++;
      current += c;
    } else if (!inString && c === ')') {
      depth--;
      current += c;
    } else if (!inString && c === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }

  if (current.trim()) args.push(current.trim());
  return args;
}

function executeSqliteQuery(sql, params = []) {
  // 1. Reemplazar funciones específicas de MySQL
  // IMPORTANTE: DATE_ADD debe ir ANTES de HOUR para que HOUR(datetime(...)) funcione bien
  sql = replaceBalancedFunction(sql, 'DATE_ADD', (inner) => {
    const intervalMatch = inner.match(/^(.*),\s*INTERVAL\s+([-+]?\d+)\s+HOUR$/i);
    if (intervalMatch) {
      return `datetime(${intervalMatch[1].trim()}, '${intervalMatch[2]} hours')`;
    }
    return `datetime(${inner})`; // fallback
  });
  // HOUR(expr) → CAST(strftime('%H', expr) AS INTEGER)
  sql = replaceBalancedFunction(sql, 'HOUR', (inner) => {
    return `CAST(strftime('%H', ${inner}) AS INTEGER)`;
  });
  // GROUP_CONCAT antes que CONCAT (evitar que CONCAT matchee dentro de GROUP_CONCAT)
  sql = replaceBalancedFunction(sql, 'GROUP_CONCAT', (inner) => {
    const sepMatch = inner.match(/^(.*)\s+SEPARATOR\s+'([^']*)'\s*$/i);
    if (sepMatch) {
      return `GROUP_CONCAT(${sepMatch[1].trim()}, '${sepMatch[2]}')`;
    }
    return `GROUP_CONCAT(${inner})`;
  });
  // CONCAT(a, b, ...) → a || b || ... (SQLite no tiene CONCAT)
  sql = replaceBalancedFunction(sql, 'CONCAT', (inner) => {
    const args = splitTopLevelArgs(inner);
    return args.join(' || ');
  });
  // DATE() ya es compatible en SQLite; no transformar (un regex naive rompe DATE(datetime(...)))
  sql = sql.replace(/FOR UPDATE/gi, ""); // No existe en SQLite, ignorarlo

  // 2. Manejar Bulk Inserts (VALUES ?)
  if (sql.includes('VALUES ?') && params.length === 1 && Array.isArray(params[0]) && params[0].length > 0) {
    const rows = params[0];
    const placeholders = `(${new Array(rows[0].length).fill('?').join(', ')})`;
    const valuesStr = new Array(rows.length).fill(placeholders).join(', ');
    sql = sql.replace('VALUES ?', `VALUES ${valuesStr}`);
    params = rows.flat();
  }

  // 3. Manejar IN (?) para SQLite expandiendo el array
  let newSql = '';
  let newParams = [];
  let paramIndex = 0;
  let inString = false;
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'") inString = !inString;
    
    if (char === '?' && !inString) {
      const param = params[paramIndex++];
      if (Array.isArray(param)) {
        if (param.length === 0) {
          // Si el array está vacío, evitamos error de sintaxis en SQL IN ()
          newSql += 'NULL'; 
        } else {
          newSql += new Array(param.length).fill('?').join(', ');
          newParams.push(...param);
        }
      } else {
        newSql += '?';
        newParams.push(param);
      }
    } else {
      newSql += char;
    }
  }
  
  sql = newSql;
  params = newParams;

  // 4. SQLite no soporta objetos Date nativos en bind parameters, convertirlos a ISO String
  const safeParams = params.map(p => (p instanceof Date) ? p.toISOString() : p);

  try {
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA') || sql.trim().toUpperCase().startsWith('SHOW');
    if (isSelect) {
      if (sql.trim().toUpperCase().startsWith('SHOW TABLES')) {
        sql = "SELECT name AS `Tables_in_db` FROM sqlite_master WHERE type='table'";
      }
      const stmt = sqliteDb.prepare(sql);
      const rows = stmt.all(...safeParams);
      return [rows, null];
    } else {
      const stmt = sqliteDb.prepare(sql);
      const info = stmt.run(...safeParams);
      
      // Registrar en sync_queue para subirlo a la nube después
      const DB_MODE = process.env.DB_MODE || 'cloud';
      if (DB_MODE === 'local' && !sql.toUpperCase().includes('SYNC_QUEUE')) {
        const match = sql.match(/(?:INTO|UPDATE|FROM)\s+([a-zA-Z0-9_]+)/i);
        const tableName = match ? match[1] : 'unknown';
        const operation = sql.trim().toUpperCase().startsWith('INSERT') ? 'INSERT' 
                        : sql.trim().toUpperCase().startsWith('UPDATE') ? 'UPDATE' 
                        : 'DELETE';
        try {
          const stmtQueue = sqliteDb.prepare(`INSERT INTO sync_queue (table_name, operation, record_id, payload) VALUES (?, ?, ?, ?)`);
          stmtQueue.run(tableName, operation, info.lastInsertRowid || 0, JSON.stringify({ sql, params: safeParams }));
        } catch (queueErr) {
          console.error('[SQLite] Error al encolar operación:', queueErr);
        }
      }
      
      return [{ insertId: info.lastInsertRowid, affectedRows: info.changes }, null];
    }
  } catch (err) {
    console.error(`[SQLite Error] Query: ${sql}`, err);
    throw err;
  }
}

class SqliteConnectionWrapper {
  async beginTransaction() { sqliteDb.prepare('BEGIN').run(); }
  async commit() { sqliteDb.prepare('COMMIT').run(); }
  async rollback() { sqliteDb.prepare('ROLLBACK').run(); }
  release() {} // No-op en SQLite
  async query(sql, params = []) {
    return executeSqliteQuery(sql, params);
  }
  async ping() {}
}

const sqlitePool = {
  async query(sql, params = []) {
    return executeSqliteQuery(sql, params);
  },
  async getConnection() {
    return new SqliteConnectionWrapper();
  },
  async ping() {}
};

// --- EXPORTAR EL POOL ACTIVO ---
const pool = DB_MODE === 'local' ? sqlitePool : mysqlPool;

// Si estamos en la nube y dentro de Electron, notificar modificaciones para forzar backup local
if (DB_MODE === 'cloud' && process.send) {
  const originalQuery = pool.query;
  pool.query = async function(sql, params) {
    const result = await originalQuery.call(pool, sql, params);
    if (typeof sql === 'string' && sql.trim().toUpperCase().match(/^(INSERT|UPDATE|DELETE)/)) {
      process.send({ type: 'trigger_sync' });
    }
    return result;
  };
  
  const originalGetConnection = pool.getConnection;
  pool.getConnection = async function() {
    const conn = await originalGetConnection.call(pool);
    const origConnQuery = conn.query;
    conn.query = async function(sql, params) {
      const result = await origConnQuery.call(conn, sql, params);
      if (typeof sql === 'string' && sql.trim().toUpperCase().match(/^(INSERT|UPDATE|DELETE)/)) {
        process.send({ type: 'trigger_sync' });
      }
      return result;
    };
    return conn;
  };
}

async function testConnection() {
  if (DB_MODE === 'local') {
    console.log('[Database] Usando modo OFFLINE (SQLite local)');
    return;
  }
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
  console.log('[Database] Conectado a MySQL (Nube)');
}

module.exports = { pool, testConnection };


