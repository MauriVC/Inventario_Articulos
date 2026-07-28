/**
 * api.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests UNITARIOS para la capa api.js del frontend.
 *
 * Estrategia: mockear fetch globalmente para controlar las respuestas HTTP
 * sin necesidad de un servidor real. Verifica que:
 *   - Los métodos construyen las URLs correctas
 *   - Los headers de autenticación se envían siempre
 *   - El retry logic funciona ante errores de red
 *   - Los errores HTTP se propagan correctamente
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock del módulo auth para controlar el userId/Role ───────────────────────
vi.mock('@/auth', () => ({
  auth: {
    userId: { value: '1' },
    userRole: { value: 'SuperAdministrador' }
  }
}))

// ── Importar api DESPUÉS de mockear auth ─────────────────────────────────────
import { api } from '@/api'

// ── Helper: crea una respuesta fetch exitosa ──────────────────────────────────
function mockFetchOk(data, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status,
    json: async () => data
  })
}

// ── Helper: crea una respuesta fetch con error HTTP ───────────────────────────
function mockFetchError(errorBody, status) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => errorBody
  })
}

// ── Helper: crea un fetch que falla con error de red ─────────────────────────
function mockFetchNetworkError(message = 'Failed to fetch') {
  return vi.fn().mockRejectedValue(new Error(message))
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — Headers de autenticación
// ─────────────────────────────────────────────────────────────────────────────
describe('api — Headers de autenticación', () => {
  test('todas las peticiones incluyen X-User-Id y X-User-Role', async () => {
    global.fetch = mockFetchOk({ data: [] })

    await api.getAlmacenes()

    const [, config] = global.fetch.mock.calls[0]
    expect(config.headers['X-User-Id']).toBe('1')
    expect(config.headers['X-User-Role']).toBe('SuperAdministrador')
  })

  test('todas las peticiones incluyen Content-Type application/json', async () => {
    global.fetch = mockFetchOk({ data: [] })

    await api.getMarcas()

    const [, config] = global.fetch.mock.calls[0]
    expect(config.headers['Content-Type']).toBe('application/json')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — Construcción de URLs
// ─────────────────────────────────────────────────────────────────────────────
describe('api — Construcción de URLs', () => {
  test('getAlmacenes llama a /almacenes', async () => {
    global.fetch = mockFetchOk({ data: [] })
    await api.getAlmacenes()
    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('/almacenes')
  })

  test('getAlmacenes llama exactamente a la URL correcta', async () => {
    global.fetch = mockFetchOk({ data: [] })
    await api.getAlmacenes()
    const [url] = global.fetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/almacenes')
  })

  test('getUsuarios llama a /usuarios', async () => {
    global.fetch = mockFetchOk({ data: [] })
    await api.getUsuarios()
    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('/usuarios')
  })

  test('getPermisos llama a /usuarios/permisos', async () => {
    global.fetch = mockFetchOk({ data: [] })
    await api.getPermisos()
    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('/usuarios/permisos')
  })

  test('getArticulo con id construye la URL con el id', async () => {
    global.fetch = mockFetchOk({ data: {} })
    await api.getArticulo(42)
    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('/articulos/42')
  })

  test('updateAlmacen con id construye la URL con el id', async () => {
    global.fetch = mockFetchOk({ data: {} })
    await api.updateAlmacen(7, { nombre: 'Test' })
    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('/almacenes/7')
  })

  test('deleteAlmacen con id construye la URL con el id', async () => {
    global.fetch = mockFetchOk({ message: 'eliminado' })
    await api.deleteAlmacen(5)
    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('/almacenes/5')
  })

  test('getDashboardStats sin parámetros llama a /dashboard', async () => {
    global.fetch = mockFetchOk({ data: {} })
    await api.getDashboardStats()
    const [url] = global.fetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/dashboard')
  })

  test('getDashboardStats con year y month agrega query string', async () => {
    global.fetch = mockFetchOk({ data: {} })
    await api.getDashboardStats('2024', '06')
    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('year=2024')
    expect(url).toContain('month=06')
  })

  test('getArticulos con params agrega query string', async () => {
    global.fetch = mockFetchOk({ data: [] })
    await api.getArticulos({ almacen_id: 1, estado: 'Activo' })
    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('almacen_id=1')
    expect(url).toContain('estado=Activo')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Métodos HTTP correctos
// ─────────────────────────────────────────────────────────────────────────────
describe('api — Métodos HTTP', () => {
  test('getAlmacenes usa GET', async () => {
    global.fetch = mockFetchOk({ data: [] })
    await api.getAlmacenes()
    const [, config] = global.fetch.mock.calls[0]
    // GET no especifica method explícitamente (fetch usa GET por defecto)
    expect(config.method).toBeUndefined()
  })

  test('createAlmacen usa POST', async () => {
    global.fetch = mockFetchOk({ data: { id: 1 } }, 201)
    await api.createAlmacen({ nombre: 'Nuevo' })
    const [, config] = global.fetch.mock.calls[0]
    expect(config.method).toBe('POST')
  })

  test('updateAlmacen usa PUT', async () => {
    global.fetch = mockFetchOk({ data: { id: 1 } })
    await api.updateAlmacen(1, { nombre: 'Editado' })
    const [, config] = global.fetch.mock.calls[0]
    expect(config.method).toBe('PUT')
  })

  test('deleteAlmacen usa DELETE', async () => {
    global.fetch = mockFetchOk({ message: 'ok' })
    await api.deleteAlmacen(1)
    const [, config] = global.fetch.mock.calls[0]
    expect(config.method).toBe('DELETE')
  })

  test('toggleEstadoArticulo usa PATCH', async () => {
    global.fetch = mockFetchOk({ data: {} })
    await api.toggleEstadoArticulo(1, 'Inactivo')
    const [, config] = global.fetch.mock.calls[0]
    expect(config.method).toBe('PATCH')
  })

  test('login usa POST', async () => {
    global.fetch = mockFetchOk({ data: { id: 1, rol: 'Administrador' } })
    await api.login('11111111', 'pass')
    const [, config] = global.fetch.mock.calls[0]
    expect(config.method).toBe('POST')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Serialización del body
// ─────────────────────────────────────────────────────────────────────────────
describe('api — Serialización del body', () => {
  test('createAlmacen serializa el body a JSON', async () => {
    global.fetch = mockFetchOk({ data: { id: 1 } }, 201)
    const payload = { nombre: 'Almacén Test', ubicacion: 'Primer Piso' }
    await api.createAlmacen(payload)
    const [, config] = global.fetch.mock.calls[0]
    expect(config.body).toBe(JSON.stringify(payload))
  })

  test('createUsuario serializa correctamente datos anidados', async () => {
    global.fetch = mockFetchOk({ data: { id: 5 } }, 201)
    const payload = {
      carnet: '12345678',
      nombres: 'Test',
      apellidos: 'User',
      contrasena: 'pass',
      rol: 'Usuario',
      almacenes: [1, 2],
      permisos: [3]
    }
    await api.createUsuario(payload)
    const [, config] = global.fetch.mock.calls[0]
    const parsed = JSON.parse(config.body)
    expect(parsed.almacenes).toEqual([1, 2])
    expect(parsed.permisos).toEqual([3])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Manejo de errores HTTP
// ─────────────────────────────────────────────────────────────────────────────
describe('api — Manejo de errores HTTP', () => {
  test('respuesta 401 lanza un error', async () => {
    global.fetch = mockFetchError({ error: 'No autenticado' }, 401)
    await expect(api.getAlmacenes()).rejects.toThrow('No autenticado')
  })

  test('respuesta 403 lanza un error', async () => {
    global.fetch = mockFetchError({ error: 'Acceso denegado' }, 403)
    await expect(api.getUsuarios()).rejects.toThrow('Acceso denegado')
  })

  test('respuesta 404 lanza un error', async () => {
    global.fetch = mockFetchError({ error: 'No encontrado' }, 404)
    await expect(api.getArticulo(999)).rejects.toThrow('No encontrado')
  })

  test('respuesta 500 lanza error genérico', async () => {
    global.fetch = mockFetchError({ error: 'Error interno' }, 500)
    await expect(api.getAlmacenes()).rejects.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — Retry logic ante errores de red
// ─────────────────────────────────────────────────────────────────────────────
describe('api — Retry logic (errores de red)', () => {
  test('reintenta hasta 3 veces ante Failed to fetch', async () => {
    // Falla 3 veces y al 4to intento tiene éxito
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [] }) })

    const result = await api.getAlmacenes()
    expect(result.data).toEqual([])
    expect(global.fetch).toHaveBeenCalledTimes(4)
  }, 15000)

  test('lanza error después de agotar todos los reintentos', async () => {
    // Falla 4 veces (3 reintentos + intento original)
    global.fetch = vi.fn()
      .mockRejectedValue(new Error('Failed to fetch'))

    await expect(api.getAlmacenes()).rejects.toThrow('Failed to fetch')
    // 1 intento original + 3 reintentos = 4 llamadas
    expect(global.fetch).toHaveBeenCalledTimes(4)
  }, 15000)

  test('NO reintenta ante errores HTTP (solo ante errores de red)', async () => {
    global.fetch = mockFetchError({ error: 'No autorizado' }, 403)

    await expect(api.getAlmacenes()).rejects.toThrow()
    // Debe haber llamado fetch exactamente 1 vez (sin reintentos)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
