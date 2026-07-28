/**
 * almacenes.routes.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests de INTEGRACIÓN para /api/almacenes
 *
 * Verifica el CRUD completo incluyendo el filtrado por usuario
 * (solo ve sus almacenes asignados si no es SuperAdministrador).
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { createTestDb, injectTestDb } = require('../helpers/setupTestDb');

let app;
let cleanup;

const SUPER_ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'x-user-id': '1',
  'x-user-role': 'SuperAdministrador'
};

// Administrador con permisos CREAR/EDITAR/ELIMINAR_ALMACEN
// (Lo damos de alta en el beforeAll con esos permisos)
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

  // Dar al Administrador (id=2) los permisos de almacenes para estos tests
  const permCrear  = db.prepare("SELECT id FROM permisos WHERE nombre = 'CREAR_ALMACEN'").get();
  const permEditar = db.prepare("SELECT id FROM permisos WHERE nombre = 'EDITAR_ALMACEN'").get();
  const permElim   = db.prepare("SELECT id FROM permisos WHERE nombre = 'ELIMINAR_ALMACEN'").get();
  if (permCrear)  db.prepare('INSERT OR IGNORE INTO usuario_permiso (usuario_id, permiso_id) VALUES (2, ?)').run(permCrear.id);
  if (permEditar) db.prepare('INSERT OR IGNORE INTO usuario_permiso (usuario_id, permiso_id) VALUES (2, ?)').run(permEditar.id);
  if (permElim)   db.prepare('INSERT OR IGNORE INTO usuario_permiso (usuario_id, permiso_id) VALUES (2, ?)').run(permElim.id);

  cleanup = injectTestDb(db);
  const { buildTestApp } = require('../helpers/buildTestApp');
  app = await buildTestApp();
});

afterAll(async () => {
  if (app) await app.close();
  if (cleanup) cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — GET /api/almacenes (listar)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/almacenes — Listar almacenes', () => {
  test('SuperAdministrador ve todos los almacenes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/almacenes',
      headers: SUPER_ADMIN_HEADERS
    });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    // La BD semilla tiene 1 almacén
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('cada almacén tiene campos requeridos', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/almacenes',
      headers: SUPER_ADMIN_HEADERS
    });
    const body = JSON.parse(res.body);

    for (const almacen of body.data) {
      expect(almacen).toHaveProperty('id');
      expect(almacen).toHaveProperty('nombre');
      expect(almacen).toHaveProperty('estado');
      expect(almacen).toHaveProperty('totalArticulos');
    }
  });

  test('Administrador solo ve sus almacenes asignados', async () => {
    // El Administrador (id=2) tiene asignado el Almacén Central (id=1)
    const res = await app.inject({
      method: 'GET',
      url: '/api/almacenes',
      headers: ADMIN_HEADERS
    });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    // Solo debe ver el almacén asignado
    expect(body.data.length).toBe(1);
    expect(body.data[0].nombre).toBe('Almacén Central');
  });

  test('usuario no asignado a ningún almacén ve lista vacía', async () => {
    // El usuario id=3 no tiene almacenes asignados
    const res = await app.inject({
      method: 'GET',
      url: '/api/almacenes',
      headers: USER_NO_PERMS_HEADERS
    });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.data).toEqual([]);
  });

  test('sin autenticación devuelve lista según cabeceras (acceso abierto en GET)', async () => {
    // GET /almacenes no tiene preHandler de permiso, cualquier usuario autenticado puede listar
    // pero sin x-user-id, la query no filtra por rol y devuelve todos si no hay userId
    const res = await app.inject({
      method: 'GET',
      url: '/api/almacenes',
      headers: { 'Content-Type': 'application/json' }
    });
    // Sin userId, no hay filtro → devuelve todos (comportamiento por diseño)
    expect(res.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — GET /api/almacenes/:id (obtener uno)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/almacenes/:id — Obtener almacén por ID', () => {
  test('obtiene el Almacén Central correctamente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/almacenes/1',
      headers: SUPER_ADMIN_HEADERS
    });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.data.nombre).toBe('Almacén Central');
    expect(body.data.id).toBe(1);
  });

  test('almacén inexistente devuelve 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/almacenes/99999',
      headers: SUPER_ADMIN_HEADERS
    });
    expect(res.statusCode).toBe(404);
  });

  test('id no numérico devuelve 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/almacenes/abc',
      headers: SUPER_ADMIN_HEADERS
    });
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — POST /api/almacenes (crear)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/almacenes — Crear almacén', () => {
  test('SuperAdministrador crea un almacén nuevo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/almacenes',
      headers: SUPER_ADMIN_HEADERS,
      payload: { nombre: 'Almacén Norte', ubicacion: 'Primer Piso', descripcion: 'Para pruebas' }
    });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(201);
    expect(body.data.nombre).toBe('Almacén Norte');
    expect(body.data.id).toBeDefined();
  });

  test('Administrador con permiso CREAR_ALMACEN puede crear', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/almacenes',
      headers: ADMIN_HEADERS,
      payload: { nombre: 'Almacén Admin', ubicacion: 'Segundo Piso' }
    });

    expect(res.statusCode).toBe(201);
  });

  test('usuario sin permiso recibe 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/almacenes',
      headers: USER_NO_PERMS_HEADERS,
      payload: { nombre: 'No autorizado', ubicacion: 'Ninguno' }
    });
    expect(res.statusCode).toBe(403);
  });

  test('nombre vacío devuelve 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/almacenes',
      headers: SUPER_ADMIN_HEADERS,
      payload: { nombre: '', ubicacion: 'Somewhere' }
    });
    expect(res.statusCode).toBe(400);
  });

  test('body sin nombre devuelve 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/almacenes',
      headers: SUPER_ADMIN_HEADERS,
      payload: { ubicacion: 'Sin nombre' }
    });
    expect(res.statusCode).toBe(400);
  });

  test('el almacén creado aparece en la lista', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/almacenes',
      headers: SUPER_ADMIN_HEADERS,
      payload: { nombre: 'Almacén Verificable', ubicacion: 'Verificar' }
    });
    const created = JSON.parse(createRes.body);
    expect(createRes.statusCode).toBe(201);

    const listRes = await app.inject({
      method: 'GET',
      url: `/api/almacenes/${created.data.id}`,
      headers: SUPER_ADMIN_HEADERS
    });
    const found = JSON.parse(listRes.body);
    expect(listRes.statusCode).toBe(200);
    expect(found.data.nombre).toBe('Almacén Verificable');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — PUT /api/almacenes/:id (editar)
// ─────────────────────────────────────────────────────────────────────────────
describe('PUT /api/almacenes/:id — Editar almacén', () => {
  test('SuperAdministrador edita el Almacén Central', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/almacenes/1',
      headers: SUPER_ADMIN_HEADERS,
      payload: {
        nombre: 'Almacén Central Editado',
        ubicacion: 'Planta Baja',
        descripcion: 'Actualizado',
        estado: 'Activo'
      }
    });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.data.nombre).toBe('Almacén Central Editado');
  });

  test('se puede cambiar el estado a Inactivo', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/almacenes/1',
      headers: SUPER_ADMIN_HEADERS,
      payload: {
        nombre: 'Almacén Central',
        ubicacion: 'Planta Baja',
        estado: 'Inactivo'
      }
    });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.data.estado).toBe('Inactivo');
  });

  test('editar almacén inexistente devuelve 404', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/almacenes/99999',
      headers: SUPER_ADMIN_HEADERS,
      payload: { nombre: 'No existe', estado: 'Activo' }
    });
    expect(res.statusCode).toBe(404);
  });

  test('usuario sin permiso EDITAR_ALMACEN recibe 403', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/almacenes/1',
      headers: USER_NO_PERMS_HEADERS,
      payload: { nombre: 'Intento de edición', estado: 'Activo' }
    });
    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — DELETE /api/almacenes/:id (eliminar)
// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/almacenes/:id — Eliminar almacén', () => {
  test('SuperAdministrador puede crear y luego eliminar un almacén', async () => {
    // Primero crear
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/almacenes',
      headers: SUPER_ADMIN_HEADERS,
      payload: { nombre: 'Almacén Para Borrar', ubicacion: 'Temporal' }
    });
    const created = JSON.parse(createRes.body);
    expect(createRes.statusCode).toBe(201);

    // Luego eliminar
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/almacenes/${created.data.id}`,
      headers: SUPER_ADMIN_HEADERS
    });
    expect(deleteRes.statusCode).toBe(200);

    // Verificar que ya no existe
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/almacenes/${created.data.id}`,
      headers: SUPER_ADMIN_HEADERS
    });
    expect(getRes.statusCode).toBe(404);
  });

  test('eliminar almacén inexistente devuelve 404', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/almacenes/99999',
      headers: SUPER_ADMIN_HEADERS
    });
    expect(res.statusCode).toBe(404);
  });

  test('usuario sin permiso ELIMINAR_ALMACEN recibe 403', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/almacenes/1',
      headers: USER_NO_PERMS_HEADERS
    });
    expect(res.statusCode).toBe(403);
  });

  test('id no numérico devuelve 400', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/almacenes/xyz',
      headers: SUPER_ADMIN_HEADERS
    });
    expect(res.statusCode).toBe(400);
  });
});
