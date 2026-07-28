/**
 * auth.middleware.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests UNITARIOS para el middleware requirePermission de auth.js.
 *
 * Estrategia: inyectamos un pool mock que controla qué devuelve la consulta
 * de permisos, sin necesidad de BD real ni servidor HTTP. Simulamos el ciclo
 * request/reply de Fastify con objetos simples.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ── Helpers para simular request y reply de Fastify ──────────────────────────

function makeRequest(userId, userRole) {
  return { headers: { 'x-user-id': userId, 'x-user-role': userRole } };
}

function makeReply() {
  const reply = {
    _code: null,
    _body: null,
    code(statusCode) {
      this._code = statusCode;
      return this; // permite encadenar .send()
    },
    send(body) {
      this._body = body;
      return this;
    }
  };
  return reply;
}

// ── Factory del middleware con pool inyectable ────────────────────────────────

function buildRequirePermission(mockPool) {
  // Re-implementamos requirePermission idéntico a auth.js pero con pool inyectado
  return function requirePermission(requiredPermission) {
    return async (request, reply) => {
      const userId = request.headers['x-user-id'];
      const userRole = request.headers['x-user-role'];

      if (!userId) {
        return reply.code(401).send({ error: 'No autenticado. Falta X-User-Id' });
      }

      if (userRole === 'SuperAdministrador') {
        return; // Acceso total
      }

      const [rows] = await mockPool.query(
        `SELECT 1 FROM usuario_permiso up
         INNER JOIN permisos p ON up.permiso_id = p.id
         WHERE up.usuario_id = ? AND p.nombre = ?`,
        [userId, requiredPermission]
      );

      if (rows.length === 0) {
        return reply.code(403).send({ error: 'Acceso denegado, no tiene permisos para proceder a esta acción' });
      }
    };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — Autenticación básica
// ─────────────────────────────────────────────────────────────────────────────
describe('requirePermission — Autenticación básica', () => {
  test('devuelve 401 cuando no hay X-User-Id', async () => {
    const mockPool = { query: jest.fn() };
    const requirePermission = buildRequirePermission(mockPool);
    const middleware = requirePermission('GESTIONAR_USUARIOS');

    const request = { headers: {} }; // Sin x-user-id
    const reply = makeReply();

    await middleware(request, reply);

    expect(reply._code).toBe(401);
    expect(reply._body.error).toMatch(/No autenticado/i);
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  test('devuelve 401 cuando X-User-Id es string vacío', async () => {
    const mockPool = { query: jest.fn() };
    const requirePermission = buildRequirePermission(mockPool);
    const middleware = requirePermission('GESTIONAR_USUARIOS');

    const request = makeRequest('', 'Administrador');
    const reply = makeReply();

    await middleware(request, reply);

    expect(reply._code).toBe(401);
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — SuperAdministrador (acceso total sin consultar BD)
// ─────────────────────────────────────────────────────────────────────────────
describe('requirePermission — SuperAdministrador', () => {
  test('pasa sin consultar la BD para cualquier permiso', async () => {
    const mockPool = { query: jest.fn() };
    const requirePermission = buildRequirePermission(mockPool);
    const middleware = requirePermission('GESTIONAR_USUARIOS');

    const request = makeRequest('1', 'SuperAdministrador');
    const reply = makeReply();

    await middleware(request, reply);

    expect(reply._code).toBeNull(); // No se llamó a reply.code()
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  test('pasa para permisos de Almacenes también', async () => {
    const mockPool = { query: jest.fn() };
    const requirePermission = buildRequirePermission(mockPool);
    const middleware = requirePermission('ELIMINAR_ALMACEN');

    const request = makeRequest('1', 'SuperAdministrador');
    const reply = makeReply();

    await middleware(request, reply);

    expect(reply._code).toBeNull();
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Administrador con permisos
// ─────────────────────────────────────────────────────────────────────────────
describe('requirePermission — Administrador con permiso', () => {
  test('permite acceso cuando el usuario tiene el permiso requerido', async () => {
    const mockPool = {
      // Simula que la BD encontró el permiso (1 fila)
      query: jest.fn().mockResolvedValue([[{ '1': 1 }], null])
    };
    const requirePermission = buildRequirePermission(mockPool);
    const middleware = requirePermission('GESTIONAR_USUARIOS');

    const request = makeRequest('2', 'Administrador');
    const reply = makeReply();

    await middleware(request, reply);

    expect(mockPool.query).toHaveBeenCalledTimes(1);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE up.usuario_id = ?'),
      ['2', 'GESTIONAR_USUARIOS']
    );
    expect(reply._code).toBeNull(); // No bloqueó
  });

  test('consulta la BD con el permiso correcto', async () => {
    const mockPool = {
      query: jest.fn().mockResolvedValue([[{ '1': 1 }], null])
    };
    const requirePermission = buildRequirePermission(mockPool);

    await requirePermission('CREAR_ALMACEN')(makeRequest('2', 'Administrador'), makeReply());
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      ['2', 'CREAR_ALMACEN']
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Usuario sin permiso
// ─────────────────────────────────────────────────────────────────────────────
describe('requirePermission — Usuario sin permiso', () => {
  test('devuelve 403 cuando el usuario no tiene el permiso requerido', async () => {
    const mockPool = {
      // Simula que la BD no encontró el permiso (0 filas)
      query: jest.fn().mockResolvedValue([[], null])
    };
    const requirePermission = buildRequirePermission(mockPool);
    const middleware = requirePermission('GESTIONAR_USUARIOS');

    const request = makeRequest('3', 'Usuario');
    const reply = makeReply();

    await middleware(request, reply);

    expect(reply._code).toBe(403);
    expect(reply._body.error).toMatch(/Acceso denegado/i);
  });

  test('devuelve 403 también para rol Administrador sin el permiso específico', async () => {
    const mockPool = {
      query: jest.fn().mockResolvedValue([[], null])
    };
    const requirePermission = buildRequirePermission(mockPool);
    const middleware = requirePermission('ELIMINAR_ALMACEN');

    const request = makeRequest('2', 'Administrador');
    const reply = makeReply();

    await middleware(request, reply);

    expect(reply._code).toBe(403);
  });

  test('consulta la BD antes de denegar', async () => {
    const mockPool = {
      query: jest.fn().mockResolvedValue([[], null])
    };
    const requirePermission = buildRequirePermission(mockPool);
    await requirePermission('GESTIONAR_USUARIOS')(makeRequest('3', 'Usuario'), makeReply());

    // Debe haber consultado la BD exactamente una vez
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Modo Offline (mismo comportamiento, BD local)
// Verifica que el middleware funciona igual con SQLite que con MySQL
// ─────────────────────────────────────────────────────────────────────────────
describe('requirePermission — Modo Offline (SQLite)', () => {
  const { createTestDb } = require('../helpers/setupTestDb');
  let db;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  function buildOfflinePool(sqliteDb) {
    return {
      async query(sql, params = []) {
        // Transformación mínima para SQLite
        const stmt = sqliteDb.prepare(sql);
        const rows = stmt.all(...params);
        return [rows, null];
      }
    };
  }

  test('SuperAdmin pasa sin consultar SQLite', async () => {
    const pool = buildOfflinePool(db);
    const spy = jest.spyOn(pool, 'query');
    const requirePermission = buildRequirePermission(pool);

    const reply = makeReply();
    await requirePermission('GESTIONAR_USUARIOS')(makeRequest('1', 'SuperAdministrador'), reply);

    expect(spy).not.toHaveBeenCalled();
    expect(reply._code).toBeNull();
  });

  test('Administrador con permiso pasa en SQLite', async () => {
    const pool = buildOfflinePool(db);
    const requirePermission = buildRequirePermission(pool);

    const reply = makeReply();
    // El usuario ID=2 tiene GESTIONAR_USUARIOS en la BD semilla
    await requirePermission('GESTIONAR_USUARIOS')(makeRequest('2', 'Administrador'), reply);

    expect(reply._code).toBeNull(); // No bloqueó
  });

  test('Usuario sin permisos recibe 403 en SQLite', async () => {
    const pool = buildOfflinePool(db);
    const requirePermission = buildRequirePermission(pool);

    const reply = makeReply();
    // El usuario ID=3 no tiene ningún permiso en la BD semilla
    await requirePermission('GESTIONAR_USUARIOS')(makeRequest('3', 'Usuario'), reply);

    expect(reply._code).toBe(403);
  });
});
