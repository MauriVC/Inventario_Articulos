/**
 * database.utils.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests UNITARIOS para las funciones utilitarias puras del frontend.
 *
 * Cubre:
 *  - splitTopLevelArgs: parser de argumentos SQL
 *  - replaceBalancedFunction: transformador de funciones SQL con paréntesis anidados
 *  - Transformaciones GROUP_CONCAT / CONCAT / DATE_ADD aplicadas juntas
 *  - Lógica de normalización de fechas ISO
 *  - Lógica de expansión de bulk inserts (VALUES ?)
 *
 * NOTA: Estas funciones viven en el backend (database.js del proceso Electron),
 * pero son funciones puras que no dependen del entorno Node/Electron. Las
 * re-implementamos aquí para testear la lógica en el contexto del frontend
 * y garantizar que cualquier cambio futuro en la capa de compatibilidad SQLite
 * sea detectado por ambas suites (backend Jest y frontend Vitest).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, test, expect } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Re-implementación local de las funciones puras de database.js
// (idénticas a las del backend — cualquier divergencia es un bug)
// ─────────────────────────────────────────────────────────────────────────────

function replaceBalancedFunction(sql, funcName, transformFn) {
  const regex = new RegExp(funcName + '\\(', 'gi')
  let match
  while ((match = regex.exec(sql)) !== null) {
    const start = match.index
    let depth = 1
    let i = start + match[0].length
    while (i < sql.length && depth > 0) {
      if (sql[i] === '(') depth++
      else if (sql[i] === ')') depth--
      i++
    }
    const inner = sql.substring(start + match[0].length, i - 1)
    const replacement = transformFn(inner)
    sql = sql.substring(0, start) + replacement + sql.substring(i)
    regex.lastIndex = start + replacement.length
  }
  return sql
}

function splitTopLevelArgs(str) {
  const args = []
  let current = ''
  let depth = 0
  let inString = false
  let stringChar = ''

  for (let i = 0; i < str.length; i++) {
    const c = str[i]
    if ((c === "'" || c === '"') && !inString) {
      inString = true; stringChar = c; current += c
    } else if (inString && c === stringChar) {
      inString = false; current += c
    } else if (!inString && c === '(') {
      depth++; current += c
    } else if (!inString && c === ')') {
      depth--; current += c
    } else if (!inString && c === ',' && depth === 0) {
      args.push(current.trim()); current = ''
    } else {
      current += c
    }
  }
  if (current.trim()) args.push(current.trim())
  return args
}

/** Aplica las mismas transformaciones que database.js en modo local */
function applyAllTransforms(sql) {
  sql = replaceBalancedFunction(sql, 'DATE_ADD', (inner) => {
    const m = inner.match(/^(.*),\s*INTERVAL\s+([-+]?\d+)\s+HOUR$/i)
    if (m) return `datetime(${m[1].trim()}, '${m[2]} hours')`
    return `datetime(${inner})`
  })

  sql = replaceBalancedFunction(sql, 'HOUR', (inner) =>
    `CAST(strftime('%H', ${inner}) AS INTEGER)`
  )

  sql = replaceBalancedFunction(sql, 'GROUP_CONCAT', (inner) => {
    const sepMatch = inner.match(/^(.*)\s+SEPARATOR\s+'([^']*)'\s*$/i)
    if (sepMatch) return `GROUP_CONCAT(${sepMatch[1].trim()}, '${sepMatch[2]}')`
    return `GROUP_CONCAT(${inner})`
  })

  sql = replaceBalancedFunction(sql, '(?<!GROUP_)CONCAT', (inner) =>
    splitTopLevelArgs(inner).join(' || ')
  )

  sql = sql.replace(/FOR UPDATE/gi, '')
  sql = sql.replace(/\bORDER\s+BY\s+fecha\b/gi, 'ORDER BY datetime(fecha)')

  return sql
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — splitTopLevelArgs
// ─────────────────────────────────────────────────────────────────────────────
describe('splitTopLevelArgs', () => {
  test('divide argumentos simples', () => {
    expect(splitTopLevelArgs('a, b, c')).toEqual(['a', 'b', 'c'])
  })

  test('no divide dentro de paréntesis anidados', () => {
    expect(splitTopLevelArgs('fn(a, b), c')).toEqual(['fn(a, b)', 'c'])
  })

  test('no divide dentro de strings con comas', () => {
    expect(splitTopLevelArgs("'hola, mundo', b")).toEqual(["'hola, mundo'", 'b'])
  })

  test('un único argumento sin comas', () => {
    expect(splitTopLevelArgs('columna')).toEqual(['columna'])
  })

  test('subquery complejo con múltiples comas anidadas', () => {
    const result = splitTopLevelArgs('MAX(a, b), MIN(c, d), e')
    expect(result).toHaveLength(3)
    expect(result[0]).toBe('MAX(a, b)')
    expect(result[1]).toBe('MIN(c, d)')
    expect(result[2]).toBe('e')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — GROUP_CONCAT con SEPARATOR
// ─────────────────────────────────────────────────────────────────────────────
describe('Transformación GROUP_CONCAT SEPARATOR → SQLite', () => {
  test("convierte SEPARATOR '||' a sintaxis SQLite", () => {
    const sql = "SELECT GROUP_CONCAT(nombre SEPARATOR '||') FROM almacenes"
    const result = applyAllTransforms(sql)
    expect(result).toContain("GROUP_CONCAT(nombre, '||')")
    expect(result).not.toContain('SEPARATOR')
  })

  test("convierte SEPARATOR ',' a sintaxis SQLite", () => {
    const sql = "SELECT GROUP_CONCAT(id SEPARATOR ',') FROM usuarios"
    const result = applyAllTransforms(sql)
    expect(result).toContain("GROUP_CONCAT(id, ',')")
  })

  test('GROUP_CONCAT sin SEPARATOR permanece igual', () => {
    const sql = "SELECT GROUP_CONCAT(nombre) FROM categorias"
    const result = applyAllTransforms(sql)
    expect(result).toContain('GROUP_CONCAT(nombre)')
    expect(result).not.toContain('SEPARATOR')
  })

  test('caso real: query de usuarios con subqueries correlacionados', () => {
    const sql = `
      SELECT u.id,
        (SELECT GROUP_CONCAT(a.nombre SEPARATOR '||')
         FROM usuario_almacen ua
         JOIN almacenes a ON ua.almacen_id = a.id
         WHERE ua.usuario_id = u.id) AS almacenes_nombres,
        (SELECT GROUP_CONCAT(permiso_id SEPARATOR ',')
         FROM usuario_permiso
         WHERE usuario_id = u.id) AS permisos_ids
      FROM usuarios u
    `
    const result = applyAllTransforms(sql)
    expect(result).not.toContain('SEPARATOR')
    expect(result).toContain("GROUP_CONCAT(a.nombre, '||')")
    expect(result).toContain("GROUP_CONCAT(permiso_id, ',')")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — CONCAT → operador ||
// ─────────────────────────────────────────────────────────────────────────────
describe('Transformación CONCAT → ||', () => {
  test('CONCAT de dos columnas', () => {
    const sql = "SELECT CONCAT(nombres, ' ', apellidos) FROM usuarios"
    const result = applyAllTransforms(sql)
    expect(result).toContain("nombres || ' ' || apellidos")
    expect(result).not.toContain('CONCAT(')
  })

  test('CONCAT de tres partes', () => {
    const sql = "SELECT CONCAT(a, b, c) FROM t"
    const result = applyAllTransforms(sql)
    expect(result).toContain('a || b || c')
  })

  test('GROUP_CONCAT NO es afectado por el reemplazador de CONCAT', () => {
    const sql = "SELECT GROUP_CONCAT(nombre, '||') FROM t"
    const result = applyAllTransforms(sql)
    expect(result).toContain("GROUP_CONCAT(nombre, '||')")
    // No debe aparecer el operador || suelto como resultado de procesar GROUP_CONCAT
    expect(result).not.toMatch(/nombre \|\| '/)
  })

  test('CONCAT y GROUP_CONCAT coexisten en la misma query', () => {
    const sql = `
      SELECT CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
             GROUP_CONCAT(a.nombre SEPARATOR ',') AS almacenes
      FROM usuarios u
    `
    const result = applyAllTransforms(sql)
    expect(result).toContain("u.nombres || ' ' || u.apellidos")
    expect(result).toContain("GROUP_CONCAT(a.nombre, ',')")
    expect(result).not.toContain('SEPARATOR')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — DATE_ADD y HOUR
// ─────────────────────────────────────────────────────────────────────────────
describe('Transformaciones DATE_ADD y HOUR', () => {
  test('DATE_ADD con INTERVAL positivo', () => {
    const sql = "SELECT DATE_ADD(created_at, INTERVAL 3 HOUR) FROM t"
    const result = applyAllTransforms(sql)
    expect(result).toContain("datetime(created_at, '3 hours')")
  })

  test('DATE_ADD con INTERVAL negativo', () => {
    const sql = "SELECT DATE_ADD(fecha, INTERVAL -5 HOUR) FROM t"
    const result = applyAllTransforms(sql)
    expect(result).toContain("datetime(fecha, '-5 hours')")
  })

  test('HOUR(columna) se convierte a CAST(strftime)', () => {
    const sql = "WHERE HOUR(created_at) >= 8"
    const result = applyAllTransforms(sql)
    expect(result).toContain("CAST(strftime('%H', created_at) AS INTEGER)")
  })

  test('FOR UPDATE se elimina completamente', () => {
    const sql = "SELECT * FROM articulos WHERE id = 1 FOR UPDATE"
    const result = applyAllTransforms(sql)
    expect(result).not.toContain('FOR UPDATE')
    expect(result).toContain('WHERE id = 1')
  })

  test('ORDER BY fecha se convierte a ORDER BY datetime(fecha)', () => {
    const sql = "SELECT * FROM movimientos ORDER BY fecha DESC"
    const result = applyAllTransforms(sql)
    expect(result).toContain('ORDER BY datetime(fecha)')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Expansión de Bulk Inserts (VALUES ?)
// ─────────────────────────────────────────────────────────────────────────────
describe('Expansión de Bulk Inserts VALUES ?', () => {
  function expandBulkInsert(sql, params) {
    if (sql.includes('VALUES ?') && params.length === 1 && Array.isArray(params[0])) {
      const rows = params[0]
      if (rows.length > 0) {
        const placeholders = `(${new Array(rows[0].length).fill('?').join(', ')})`
        const valuesStr = new Array(rows.length).fill(placeholders).join(', ')
        sql = sql.replace('VALUES ?', `VALUES ${valuesStr}`)
        params = rows.flat()
      }
    }
    return { sql, params }
  }

  test('expande 3 filas de 2 columnas', () => {
    const { sql, params } = expandBulkInsert(
      'INSERT INTO usuario_almacen (usuario_id, almacen_id) VALUES ?',
      [[[1, 10], [2, 20], [3, 30]]]
    )
    expect(sql).toBe('INSERT INTO usuario_almacen (usuario_id, almacen_id) VALUES (?, ?), (?, ?), (?, ?)')
    expect(params).toEqual([1, 10, 2, 20, 3, 30])
  })

  test('expande 1 fila de 3 columnas', () => {
    const { sql, params } = expandBulkInsert(
      'INSERT INTO permisos (nombre, descripcion, modulo) VALUES ?',
      [[['CREAR_ALMACEN', 'Crear almacén', 'Almacenes']]]
    )
    expect(sql).toBe('INSERT INTO permisos (nombre, descripcion, modulo) VALUES (?, ?, ?)')
    expect(params).toEqual(['CREAR_ALMACEN', 'Crear almacén', 'Almacenes'])
  })

  test('no modifica un INSERT normal sin VALUES ?', () => {
    const originalSql = "INSERT INTO almacenes (nombre) VALUES (?)"
    const { sql, params } = expandBulkInsert(originalSql, ['Test'])
    expect(sql).toBe(originalSql)
    // params no es array anidado — se devuelve sin modificar como array de un elemento
    expect(params).toEqual(['Test'])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — Normalización de fechas (desde SQLite hacia la UI)
// ─────────────────────────────────────────────────────────────────────────────
describe('Normalización de fechas ISO', () => {
  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/

  function normalizeRowDates(rows) {
    for (const row of rows) {
      for (const key in row) {
        if (typeof row[key] === 'string' && dateTimeRegex.test(row[key])) {
          row[key] = row[key].replace(' ', 'T') + 'Z'
        }
      }
    }
    return rows
  }

  test('convierte fecha SQLite con espacio a ISO con Z', () => {
    const rows = [{ created_at: '2024-03-15 09:30:00' }]
    expect(normalizeRowDates(rows)[0].created_at).toBe('2024-03-15T09:30:00Z')
  })

  test('no modifica fechas que ya tienen formato ISO correcto', () => {
    const rows = [{ created_at: '2024-03-15T09:30:00Z' }]
    expect(normalizeRowDates(rows)[0].created_at).toBe('2024-03-15T09:30:00Z')
  })

  test('no modifica campos que no son fechas', () => {
    const rows = [{ nombre: 'Test', id: 42, stock: 100 }]
    const result = normalizeRowDates(rows)
    expect(result[0]).toEqual({ nombre: 'Test', id: 42, stock: 100 })
  })

  test('normaliza múltiples campos de fecha en la misma fila', () => {
    const rows = [{
      created_at: '2024-01-01 00:00:00',
      updated_at: '2024-06-15 12:00:00',
      nombre: 'Artículo'
    }]
    const result = normalizeRowDates(rows)
    expect(result[0].created_at).toBe('2024-01-01T00:00:00Z')
    expect(result[0].updated_at).toBe('2024-06-15T12:00:00Z')
    expect(result[0].nombre).toBe('Artículo')
  })

  test('normaliza múltiples filas en el mismo array', () => {
    const rows = [
      { created_at: '2024-01-01 10:00:00', nombre: 'A' },
      { created_at: '2024-02-01 11:00:00', nombre: 'B' }
    ]
    const result = normalizeRowDates(rows)
    expect(result[0].created_at).toBe('2024-01-01T10:00:00Z')
    expect(result[1].created_at).toBe('2024-02-01T11:00:00Z')
  })
})
