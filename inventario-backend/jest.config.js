/** @type {import('jest').Config} */
module.exports = {
  // Entorno Node.js (no browser)
  testEnvironment: 'node',

  // Dónde buscar los tests
  testMatch: [
    '**/tests/**/*.test.js'
  ],

  // Archivos de setup que corren antes de cada suite
  globalSetup: './tests/helpers/globalSetup.js',
  globalTeardown: './tests/helpers/globalTeardown.js',

  // Cobertura de código
  collectCoverage: false, // Activar con --coverage en CLI
  collectCoverageFrom: [
    'src/**/*.js',
    'index.js',
    '!src/config/actividadLog.js' // Solo logging, sin lógica crítica
  ],
  coverageThreshold: {
    // Umbrales realistas para la cobertura actual.
    // Testeamos: auth, almacenes, usuarios (integración) + database + auth middleware (unidad).
    // Las rutas no testeadas (artículos, movimientos, dashboard, etc.) bajan el promedio global.
    // A medida que se agreguen tests de esas rutas, estos umbrales deben subir.
    global: {
      lines: 25,
      branches: 10,
      functions: 20,
      statements: 25
    },
    // Umbrales específicos para los módulos críticos ya testeados
    './src/config/database.js': {
      lines: 60,
      branches: 50
    },
    './src/middleware/auth.js': {
      lines: 90,
      branches: 85
    }
  },
  coverageReporters: ['text', 'text-summary', 'lcov'],
  coverageDirectory: 'coverage',

  // Tiempo máximo por test (los de integración pueden tardar un poco)
  testTimeout: 15000,

  // Mostrar cada test individualmente en consola
  verbose: true,

  // Limpiar mocks entre tests
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false
};
