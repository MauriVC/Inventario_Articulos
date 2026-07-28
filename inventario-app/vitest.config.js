import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      // Mismo alias @/ que en vite.config.js para que los imports funcionen igual
      '@': resolve(__dirname, 'src')
    }
  },

  test: {
    // Entorno browser simulado con jsdom (necesario para montar componentes Vue)
    environment: 'jsdom',

    // Dónde buscar los tests
    include: ['src/tests/**/*.test.js'],

    // Variables globales (describe, test, expect) sin necesidad de importarlas
    globals: true,

    // Archivo de setup que corre antes de cada suite de componentes
    setupFiles: ['src/tests/setup.js'],

    // Cobertura con V8
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{js,vue}'],
      exclude: [
        'src/main.js',        // Entry point, sin lógica testeable
        'src/assets/**',      // Estilos e imágenes
        'src/tests/**',       // Los propios tests
      ],
      thresholds: {
        // Umbrales realistas para la cobertura actual.
        // Solo UsuariosView, api.js y utils están testeados.
        // A medida que se agreguen tests de las otras vistas, estos suben.
        lines: 5,
        branches: 5,
        functions: 5,
        statements: 5
      }
    },

    // Mostrar cada test individualmente
    reporter: 'verbose',

    // Tiempo máximo por test
    testTimeout: 10000,

    // Limpiar mocks entre tests
    clearMocks: true,
    restoreMocks: true
  }
})
