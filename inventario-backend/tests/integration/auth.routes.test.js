/**
 * auth.routes.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests de INTEGRACIÓN para POST /api/auth/login
 *
 * Levanta una instancia Fastify real con SQLite en memoria.
 * No toca MySQL ni la BD de producción.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { createTestDb, injectTestDb } = require('../helpers/setupTestDb');

let app;
let cleanup;

beforeAll(async () => {
  // 1. Crear BD en memoria con datos semilla
  const db = createTestDb();

  // 2. Inyectar la BD en database.js (reemplaza sqliteDb por closure)
  cleanup = injectTestDb(db);

  // 3. Construir la app — las rutas usarán automáticamente la BD inyectada
  const { buildTestApp } = require('../helpers/buildTestApp');
  app = await buildTestApp();
});

afterAll(async () => {
  if (app) await app.close();
  if (cleanup) cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function postLogin(body) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { 'Content-Type': 'application/json' },
    payload: body
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — Login exitoso
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login — Login exitoso', () => {
  test('SuperAdministrador inicia sesión correctamente', async () => {
    const res = await postLogin({ carnet: '11111111', contrasena: 'admin123' });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.message).toBe('Login exitoso');
    expect(body.data).toMatchObject({
      carnet: '11111111',
      nombres: 'Super',
      apellidos: 'Admin',
      rol: 'SuperAdministrador'
    });
    expect(body.data.id).toBeDefined();
    // La contraseña nunca debe estar en la respuesta
    expect(body.data.contrasena).toBeUndefined();
  });

  test('Administrador inicia sesión correctamente', async () => {
    const res = await postLogin({ carnet: '22222222', contrasena: 'adm123' });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.data.rol).toBe('Administrador');
    expect(body.data.carnet).toBe('22222222');
  });

  test('la respuesta incluye array de permisos', async () => {
    const res = await postLogin({ carnet: '22222222', contrasena: 'adm123' });
    const body = JSON.parse(res.body);

    expect(Array.isArray(body.data.permisos)).toBe(true);
    // El administrador de prueba tiene GESTIONAR_USUARIOS
    expect(body.data.permisos).toContain('GESTIONAR_USUARIOS');
  });

  test('SuperAdministrador tiene array de permisos (puede estar vacío o lleno)', async () => {
    const res = await postLogin({ carnet: '11111111', contrasena: 'admin123' });
    const body = JSON.parse(res.body);

    expect(Array.isArray(body.data.permisos)).toBe(true);
  });

  test('usuario sin permisos asignados tiene array vacío', async () => {
    const res = await postLogin({ carnet: '33333333', contrasena: 'user123' });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.data.permisos).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — Credenciales inválidas
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login — Credenciales inválidas', () => {
  test('contraseña incorrecta devuelve 401', async () => {
    const res = await postLogin({ carnet: '11111111', contrasena: 'contraseña_incorrecta' });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(401);
    expect(body.error).toBe('Credenciales inválidas');
  });

  test('carnet inexistente devuelve 401', async () => {
    const res = await postLogin({ carnet: '99999999', contrasena: 'admin123' });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(401);
    expect(body.error).toBe('Credenciales inválidas');
  });

  test('carnet correcto pero contraseña vacía devuelve 401 o 400', async () => {
    const res = await postLogin({ carnet: '11111111', contrasena: '' });
    // Puede ser 400 (validación) o 401 (credenciales). Ambos son correctos.
    expect([400, 401]).toContain(res.statusCode);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Usuario inactivo
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login — Usuario inactivo', () => {
  test('usuario inactivo recibe 403', async () => {
    const res = await postLogin({ carnet: '44444444', contrasena: 'inact123' });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(403);
    expect(body.error).toMatch(/inactivo/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Validación del body
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login — Validación del body', () => {
  test('body vacío devuelve 400', async () => {
    const res = await postLogin({});
    expect(res.statusCode).toBe(400);
  });

  test('falta carnet devuelve 400', async () => {
    const res = await postLogin({ contrasena: 'admin123' });
    expect(res.statusCode).toBe(400);
  });

  test('falta contraseña devuelve 400', async () => {
    const res = await postLogin({ carnet: '11111111' });
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Health check (verifica que el servidor responde)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  test('devuelve status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.status).toBe('ok');
  });
});
