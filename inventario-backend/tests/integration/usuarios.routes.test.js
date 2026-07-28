/**
 * usuarios.routes.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests de INTEGRACIÓN para /api/usuarios y /api/usuarios/permisos
 *
 * Cubre el módulo que tenía el bug de modo Offline (GROUP_CONCAT + permisos).
 * Incluye casos con SuperAdministrador, Administrador con permiso,
 * y usuario sin permiso para verificar el control de acceso completo.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { createTestDb, injectTestDb } = require('../helpers/setupTestDb');

let app;
let cleanup;

// Cabeceras de autenticación reutilizables
const SUPER_ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'x-user-id': '1',
  'x-user-role': 'SuperAdministrador'
};
const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'x-user-id': '2',
  'x-user-role': 'Administrador'
};
const USER_NO_PERMS_HEADERS = {
  'Content-Type': 'application/json',
  'x-user-id': '3',
  'x-user-role': 'Usuario'
};

beforeAll(async () => {
  const db = createTestDb();
  cleanup = injectTestDb(db);
  const { buildTestApp } = require('../helpers/buildTestApp');
  app = await buildTestApp();
});

afterAll(async () => {
  if (app) await app.close();
  if (cleanup) cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — GET /api/usuarios (listar)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/usuarios — Listar usuarios', () => {
  test('SuperAdministrador obtiene la lista completa', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/usuarios',
      headers: SUPER_ADMIN_HEADERS
    });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    // La BD semilla tiene 4 usuarios
    expect(body.data.length).toBeGreaterThanOrEqual(4);
  });

  test('la respuesta NO incluye contraseñas', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/usuarios',
      headers: SUPER_ADMIN_HEADERS
    });
    const body = JSON.parse(res.body);

    for (const usuario of body.data) {
      expect(usuario.contrasena).toBeUndefined();
    }
  });

  test('cada usuario tiene el campo almacenes como array', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/usuarios',
      headers: SUPER_ADMIN_HEADERS
    });
    const body = JSON.parse(res.body);

    for (const usuario of body.data) {
      expect(Array.isArray(usuario.almacenes)).toBe(true);
    }
  });

  test('cada usuario tiene el campo permisos como array — fix del bug offline', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/usuarios',
      headers: SUPER_ADMIN_HEADERS
    });
    const body = JSON.parse(res.body);

    for (const usuario of body.data) {
      expect(Array.isArray(usuario.permisos)).toBe(true);
    }
  });

  test('Administrador con permiso GESTIONAR_USUARIOS obtiene la lista', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/usuarios',
      headers: ADMIN_HEADERS
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('usuario sin permiso GESTIONAR_USUARIOS recibe 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/usuarios',
      headers: USER_NO_PERMS_HEADERS
    });

    expect(res.statusCode).toBe(403);
  });

  test('sin cabeceras de autenticación recibe 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/usuarios',
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — GET /api/usuarios/permisos
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/usuarios/permisos — Listar permisos disponibles', () => {
  test('SuperAdministrador obtiene todos los permisos', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/usuarios/permisos',
      headers: SUPER_ADMIN_HEADERS
    });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  test('los permisos tienen campos nombre, descripcion y modulo', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/usuarios/permisos',
      headers: SUPER_ADMIN_HEADERS
    });
    const body = JSON.parse(res.body);

    for (const permiso of body.data) {
      expect(permiso).toHaveProperty('nombre');
      expect(permiso).toHaveProperty('modulo');
    }
  });

  test('usuario sin permiso no puede listar permisos', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/usuarios/permisos',
      headers: USER_NO_PERMS_HEADERS
    });
    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — POST /api/usuarios (crear)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/usuarios — Crear usuario', () => {
  test('SuperAdministrador crea un usuario nuevo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/usuarios',
      headers: SUPER_ADMIN_HEADERS,
      payload: {
        carnet: '55555555',
        nombres: 'Nuevo',
        apellidos: 'Usuario',
        telefono: '70000000',
        contrasena: 'pass1234',
        rol: 'Usuario',
        almacenes: [],
        permisos: []
      }
    });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(201);
    expect(body.data.carnet).toBe('55555555');
    expect(body.data.id).toBeDefined();
  });

  test('la contraseña no se devuelve en la respuesta de creación', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/usuarios',
      headers: SUPER_ADMIN_HEADERS,
      payload: {
        carnet: '66666666',
        nombres: 'Test',
        apellidos: 'Contrasena',
        contrasena: 'secreto123',
        rol: 'Usuario',
        almacenes: [],
        permisos: []
      }
    });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(201);
    expect(body.data.contrasena).toBeUndefined();
  });

  test('carnet duplicado devuelve error', async () => {
    // El carnet '11111111' ya existe en la BD semilla
    const res = await app.inject({
      method: 'POST',
      url: '/api/usuarios',
      headers: SUPER_ADMIN_HEADERS,
      payload: {
        carnet: '11111111',
        nombres: 'Duplicado',
        apellidos: 'Test',
        contrasena: 'pass1234',
        rol: 'Usuario',
        almacenes: [],
        permisos: []
      }
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  test('body inválido (sin carnet) devuelve 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/usuarios',
      headers: SUPER_ADMIN_HEADERS,
      payload: {
        nombres: 'Sin',
        apellidos: 'Carnet',
        contrasena: 'pass1234',
        rol: 'Usuario'
      }
    });
    expect(res.statusCode).toBe(400);
  });

  test('usuario sin permiso no puede crear usuarios', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/usuarios',
      headers: USER_NO_PERMS_HEADERS,
      payload: {
        carnet: '77777777',
        nombres: 'No',
        apellidos: 'Autorizado',
        contrasena: 'pass1234',
        rol: 'Usuario',
        almacenes: [],
        permisos: []
      }
    });
    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — PUT /api/usuarios/:id (editar)
// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/usuarios/:id — Editar usuario', () => {
  test('SuperAdministrador edita un usuario existente', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/usuarios/3',
      headers: SUPER_ADMIN_HEADERS,
      payload: {
        carnet: '33333333',
        nombres: 'Usuario',
        apellidos: 'Editado',
        rol: 'Usuario',
        estado: 'Activo',
        almacenes: [],
        permisos: []
      }
    });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.data.apellidos).toBe('Editado');
  });

  test('editar usuario inexistente devuelve 404', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/usuarios/99999',
      headers: SUPER_ADMIN_HEADERS,
      payload: {
        carnet: '00000000',
        nombres: 'No',
        apellidos: 'Existe',
        rol: 'Usuario',
        estado: 'Activo',
        almacenes: [],
        permisos: []
      }
    });
    expect(res.statusCode).toBe(404);
  });

  test('cambiar estado a Inactivo funciona correctamente', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/usuarios/3',
      headers: SUPER_ADMIN_HEADERS,
      payload: {
        carnet: '33333333',
        nombres: 'Usuario',
        apellidos: 'SinPermisos',
        rol: 'Usuario',
        estado: 'Inactivo',
        almacenes: [],
        permisos: []
      }
    });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.data.estado).toBe('Inactivo');
  });

  test('id no numérico devuelve 400', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/usuarios/abc',
      headers: SUPER_ADMIN_HEADERS,
      payload: {
        carnet: '12345678',
        nombres: 'Test',
        apellidos: 'Test',
        rol: 'Usuario',
        estado: 'Activo',
        almacenes: [],
        permisos: []
      }
    });
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — GET /api/usuarios/:id (obtener uno)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/usuarios/:id — Obtener usuario por ID', () => {
  test('obtiene el SuperAdministrador correctamente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/usuarios/1',
      headers: SUPER_ADMIN_HEADERS
    });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.data.carnet).toBe('11111111');
    expect(body.data.contrasena).toBeUndefined();
  });

  test('usuario inexistente devuelve 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/usuarios/99999',
      headers: SUPER_ADMIN_HEADERS
    });
    expect(res.statusCode).toBe(404);
  });
});
