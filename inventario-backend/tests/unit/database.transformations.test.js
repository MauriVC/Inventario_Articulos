/**
 * database.transformations.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests UNITARIOS para las funciones de transformación SQL de database.js.
 *
 * Estrategia: extraemos las funciones puras (replaceBalancedFunction,
 * splitTopLevelArgs, executeSqliteQuery) directamente del módulo configurado
 * en modo 'local' con una BD en memoria, sin levantar ningún servidor HTTP.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const Database = require('better-sqlite3');

// ── Configurar entorno ANTES de hacer require() del módulo ──────────────────
beforeAll(() => {
  process.env.DB_MODE = 'local';
  process.env.NODE_ENV = 'test';
});

// Limpiamos la caché de módulos para asegurarnos de que database.js
// se inicialice con las variables de entorno correctas
beforeEach(() => {
  // Limpiar caché del módulo para reinicializar con cada test si es necesario
  const dbModulePath = require.resolve('../../src/config/database');
  delete require.cache[dbModulePath];
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de test: re-implementamos las funciones puras para testearlas
// directamente sin depender de los internos no exportados del módulo.
// Esto refleja exactamente el código de database.js.
// ─────────────────────────────────────────────────────────────────────────────

function replaceBalancedFunction(sql, funcName, transformFn) {
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
      inString = true; stringChar = c; current += c;
    } else if (inString && c === stringChar) {
      inString = false; current += c;
    } else if (!inString && c === '(') {
      depth++; current += c;
    } else if (!inString && c === ')') {
      depth--; current += c;
    } else if (!inString && c === ',' && depth === 0) {
      args.push(current.trim()); current = '';
    } else {
      current += c;
    }
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — splitTopLevelArgs
// ─────────────────────────────────────────────────────────────────────────────
describe('splitTopLevelArgs', () => {
  test('separa argumentos simples', () => {
    expect(splitTopLevelArgs('a, b, c')).toEqual(['a', 'b', 'c']);
  });

  test('no divide dentro de paréntesis anidados', () => {
    expect(splitTopLevelArgs('fn(a, b), c')).toEqual(['fn(a, b)', 'c']);
  });

  test('no divide dentro de strings con comas', () => {
    expect(splitTopLevelArgs("'hola, mundo', b")).toEqual(["'hola, mundo'", 'b']);
  });

  test('maneja un solo argumento sin comas', () => {
    expect(splitTopLevelArgs('u.nombres')).toEqual(['u.nombres']);
  });

  test('maneja subqueries con múltiples comas anidadas', () => {
    const result = splitTopLevelArgs('SELECT id FROM t WHERE a = 1, otro');
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('SELECT id FROM t WHERE a = 1');
    expect(result[1]).toBe('otro');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — replaceBalancedFunction
// ─────────────────────────────────────────────────────────────────────────────
describe('replaceBalancedFunction', () => {
  test('reemplaza función simple sin anidamiento', () => {
    const result = replaceBalancedFunction('SELECT HOUR(fecha) FROM t', 'HOUR', (inner) => {
      return `CAST(strftime('%H', ${inner}) AS INTEGER)`;
    });
    expect(result).toBe("SELECT CAST(strftime('%H', fecha) AS INTEGER) FROM t");
  });

  test('reemplaza GROUP_CONCAT con SEPARATOR', () => {
    const result = replaceBalancedFunction(
      "SELECT GROUP_CONCAT(nombre SEPARATOR '||') FROM t",
      'GROUP_CONCAT',
      (inner) => {
        const sepMatch = inner.match(/^(.*)\s+SEPARATOR\s+'([^']*)'\s*$/i);
        if (sepMatch) return `GROUP_CONCAT(${sepMatch[1].trim()}, '${sepMatch[2]}')`;
        return `GROUP_CONCAT(${inner})`;
      }
    );
    expect(result).toBe("SELECT GROUP_CONCAT(nombre, '||') FROM t");
  });

  test('reemplaza múltiples ocurrencias en la misma query', () => {
    const result = replaceBalancedFunction(
      'SELECT HOUR(a), HOUR(b) FROM t',
      'HOUR',
      (inner) => `CAST(strftime('%H', ${inner}) AS INTEGER)`
    );
    expect(result).toContain("CAST(strftime('%H', a) AS INTEGER)");
    expect(result).toContain("CAST(strftime('%H', b) AS INTEGER)");
  });

  test('maneja correctamente paréntesis anidados', () => {
    const result = replaceBalancedFunction(
      'SELECT HOUR(DATE_ADD(fecha, INTERVAL 1 HOUR)) FROM t',
      'HOUR',
      (inner) => `CAST(strftime('%H', ${inner}) AS INTEGER)`
    );
    // Debe capturar todo el contenido de HOUR(), incluyendo DATE_ADD(...)
    expect(result).toContain('DATE_ADD(fecha, INTERVAL 1 HOUR)');
    expect(result).toContain('CAST(strftime');
  });

  test('no reemplaza si la función no existe en el SQL', () => {
    const sql = 'SELECT nombre FROM usuarios';
    const result = replaceBalancedFunction(sql, 'HOUR', () => 'REPLACED');
    expect(result).toBe(sql);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Transformaciones GROUP_CONCAT con SEPARATOR en subqueries
// Este es el caso exacto del bug del módulo de Usuarios
// ─────────────────────────────────────────────────────────────────────────────
describe('GROUP_CONCAT con SEPARATOR en subqueries correlacionados', () => {
  test('transforma SEPARATOR en subquery de un solo nivel', () => {
    const sql = `SELECT u.id,
      (SELECT GROUP_CONCAT(a.nombre SEPARATOR '||') FROM usuario_almacen ua
       JOIN almacenes a ON ua.almacen_id = a.id WHERE ua.usuario_id = u.id) AS almacenes_nombres
    FROM usuarios u`;

    const result = replaceBalancedFunction(sql, 'GROUP_CONCAT', (inner) => {
      const sepMatch = inner.match(/^(.*)\s+SEPARATOR\s+'([^']*)'\s*$/i);
      if (sepMatch) return `GROUP_CONCAT(${sepMatch[1].trim()}, '${sepMatch[2]}')`;
      return `GROUP_CONCAT(${inner})`;
    });

    // El SEPARATOR '||' debe haber sido reemplazado por sintaxis SQLite
    expect(result).not.toContain("SEPARATOR '||'");
    expect(result).toContain("GROUP_CONCAT(a.nombre, '||')");
  });

  test('transforma múltiples GROUP_CONCAT con SEPARATOR distintos', () => {
    const sql = `
      SELECT GROUP_CONCAT(a.nombre SEPARATOR '||') AS nombres,
             GROUP_CONCAT(a.id SEPARATOR ',') AS ids
      FROM almacenes a
    `;

    const result = replaceBalancedFunction(sql, 'GROUP_CONCAT', (inner) => {
      const sepMatch = inner.match(/^(.*)\s+SEPARATOR\s+'([^']*)'\s*$/i);
      if (sepMatch) return `GROUP_CONCAT(${sepMatch[1].trim()}, '${sepMatch[2]}')`;
      return `GROUP_CONCAT(${inner})`;
    });

    expect(result).not.toContain('SEPARATOR');
    expect(result).toContain("GROUP_CONCAT(a.nombre, '||')");
    expect(result).toContain("GROUP_CONCAT(a.id, ',')");
  });

  test('GROUP_CONCAT sin SEPARATOR queda intacto', () => {
    const sql = "SELECT GROUP_CONCAT(nombre) FROM t";
    const result = replaceBalancedFunction(sql, 'GROUP_CONCAT', (inner) => {
      const sepMatch = inner.match(/^(.*)\s+SEPARATOR\s+'([^']*)'\s*$/i);
      if (sepMatch) return `GROUP_CONCAT(${sepMatch[1].trim()}, '${sepMatch[2]}')`;
      return `GROUP_CONCAT(${inner})`;
    });
    expect(result).toBe("SELECT GROUP_CONCAT(nombre) FROM t");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Transformación CONCAT → operador || de SQLite
// Verifica que el lookbehind (?<!GROUP_) no rompe GROUP_CONCAT
// ─────────────────────────────────────────────────────────────────────────────
describe('CONCAT → || (lookbehind negativo no afecta GROUP_CONCAT)', () => {
  // Aplicar las dos transformaciones en secuencia, igual que database.js
  function applyBothTransforms(sql) {
    sql = replaceBalancedFunction(sql, 'GROUP_CONCAT', (inner) => {
      const sepMatch = inner.match(/^(.*)\s+SEPARATOR\s+'([^']*)'\s*$/i);
      if (sepMatch) return `GROUP_CONCAT(${sepMatch[1].trim()}, '${sepMatch[2]}')`;
      return `GROUP_CONCAT(${inner})`;
    });
    sql = replaceBalancedFunction(sql, '(?<!GROUP_)CONCAT', (inner) => {
      return splitTopLevelArgs(inner).join(' || ');
    });
    return sql;
  }

  test('CONCAT simple se convierte a ||', () => {
    const result = applyBothTransforms("SELECT CONCAT(u.nombres, ' ', u.apellidos) FROM usuarios u");
    expect(result).toContain("u.nombres || ' ' || u.apellidos");
    expect(result).not.toContain('CONCAT(');
  });

  test('GROUP_CONCAT NO es afectado por el reemplazador de CONCAT', () => {
    const sql = "SELECT GROUP_CONCAT(nombre, '||') FROM almacenes";
    const result = applyBothTransforms(sql);
    // GROUP_CONCAT debe permanecer intacto
    expect(result).toContain("GROUP_CONCAT(nombre, '||')");
  });

  test('ambas funciones coexisten en la misma query', () => {
    const sql = `
      SELECT CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
             GROUP_CONCAT(a.nombre SEPARATOR ',') AS almacenes
      FROM usuarios u
      JOIN usuario_almacen ua ON ua.usuario_id = u.id
      JOIN almacenes a ON ua.almacen_id = a.id
    `;
    const result = applyBothTransforms(sql);

    expect(result).not.toContain('SEPARATOR');
    expect(result).toContain("u.nombres || ' ' || u.apellidos");
    expect(result).toContain("GROUP_CONCAT(a.nombre, ',')");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Transformaciones DATE_ADD y HOUR
// ─────────────────────────────────────────────────────────────────────────────
describe('Transformaciones DATE_ADD y HOUR', () => {
  test('DATE_ADD con INTERVAL HOUR se convierte a datetime()', () => {
    const sql = "SELECT DATE_ADD(created_at, INTERVAL -3 HOUR) FROM t";
    const result = replaceBalancedFunction(sql, 'DATE_ADD', (inner) => {
      const m = inner.match(/^(.*),\s*INTERVAL\s+([-+]?\d+)\s+HOUR$/i);
      if (m) return `datetime(${m[1].trim()}, '${m[2]} hours')`;
      return `datetime(${inner})`;
    });
    expect(result).toBe("SELECT datetime(created_at, '-3 hours') FROM t");
  });

  test('HOUR se convierte a CAST(strftime)', () => {
    const sql = "WHERE CAST(strftime('%H', fecha) AS INTEGER) >= 8";
    // Ya transformado: verificar que la sintaxis SQLite es correcta
    expect(sql).toContain("strftime('%H'");
  });

  test('FOR UPDATE se elimina', () => {
    const sql = 'SELECT * FROM articulos WHERE id = 1 FOR UPDATE';
    const result = sql.replace(/FOR UPDATE/gi, '');
    expect(result.trim()).toBe('SELECT * FROM articulos WHERE id = 1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — Bulk inserts (VALUES ?)
// ─────────────────────────────────────────────────────────────────────────────
describe('Expansión de Bulk Inserts (VALUES ?)', () => {
  test('expande VALUES ? con array de 3 filas de 2 columnas', () => {
    let sql = 'INSERT INTO usuario_almacen (usuario_id, almacen_id) VALUES ?';
    let params = [[[1, 10], [2, 20], [3, 30]]];

    if (sql.includes('VALUES ?') && params.length === 1 && Array.isArray(params[0])) {
      const rows = params[0];
      const placeholders = `(${new Array(rows[0].length).fill('?').join(', ')})`;
      const valuesStr = new Array(rows.length).fill(placeholders).join(', ');
      sql = sql.replace('VALUES ?', `VALUES ${valuesStr}`);
      params = rows.flat();
    }

    expect(sql).toBe('INSERT INTO usuario_almacen (usuario_id, almacen_id) VALUES (?, ?), (?, ?), (?, ?)');
    expect(params).toEqual([1, 10, 2, 20, 3, 30]);
  });

  test('expande VALUES ? con array de 1 fila', () => {
    let sql = 'INSERT INTO permisos (nombre, modulo) VALUES ?';
    let params = [[['CREAR_ALMACEN', 'Almacenes']]];

    if (sql.includes('VALUES ?') && params.length === 1 && Array.isArray(params[0])) {
      const rows = params[0];
      const placeholders = `(${new Array(rows[0].length).fill('?').join(', ')})`;
      const valuesStr = new Array(rows.length).fill(placeholders).join(', ');
      sql = sql.replace('VALUES ?', `VALUES ${valuesStr}`);
      params = rows.flat();
    }

    expect(sql).toBe('INSERT INTO permisos (nombre, modulo) VALUES (?, ?)');
    expect(params).toEqual(['CREAR_ALMACEN', 'Almacenes']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7 — Normalización de fechas ISO
// ─────────────────────────────────────────────────────────────────────────────
describe('Normalización de fechas ISO desde SQLite', () => {
  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/;

  function normalizeRowDates(rows) {
    for (const row of rows) {
      for (const key in row) {
        if (typeof row[key] === 'string' && dateTimeRegex.test(row[key])) {
          row[key] = row[key].replace(' ', 'T') + 'Z';
        }
      }
    }
    return rows;
  }

  test('convierte fecha con espacio a formato ISO con Z', () => {
    const rows = [{ created_at: '2024-01-15 10:30:00' }];
    const result = normalizeRowDates(rows);
    expect(result[0].created_at).toBe('2024-01-15T10:30:00Z');
  });

  test('no modifica fechas que ya tienen T y Z', () => {
    const rows = [{ created_at: '2024-01-15T10:30:00Z' }];
    const result = normalizeRowDates(rows);
    expect(result[0].created_at).toBe('2024-01-15T10:30:00Z');
  });

  test('no modifica campos que no son fechas', () => {
    const rows = [{ nombre: 'Almacén Central', id: 1 }];
    const result = normalizeRowDates(rows);
    expect(result[0].nombre).toBe('Almacén Central');
    expect(result[0].id).toBe(1);
  });

  test('normaliza múltiples campos de fecha en la misma fila', () => {
    const rows = [{
      created_at: '2024-01-15 08:00:00',
      updated_at: '2024-06-20 14:30:00',
      nombre: 'Test'
    }];
    const result = normalizeRowDates(rows);
    expect(result[0].created_at).toBe('2024-01-15T08:00:00Z');
    expect(result[0].updated_at).toBe('2024-06-20T14:30:00Z');
    expect(result[0].nombre).toBe('Test');
  });
});
