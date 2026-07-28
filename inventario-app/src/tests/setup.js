/**
 * setup.js
 * Corre antes de cada suite de tests del frontend.
 * Configura el entorno global necesario para montar componentes Vue
 * y mockear las APIs que solo existen en Electron.
 */

import { vi } from 'vitest'

// ── Mock de la API de Electron (window.electronAPI) ──────────────────────────
// En el entorno de tests (jsdom) no existe window.electronAPI porque no hay
// proceso Electron. Lo mockeamos para que los componentes que lo usan no fallen.
Object.defineProperty(window, 'electronAPI', {
  value: {
    platform: 'win32',
    version: '1.0.5',
    getNetworkStatus: vi.fn().mockResolvedValue(true),
    onNetworkStatus: vi.fn()
  },
  writable: true
})

// ── Mock de import.meta.env ───────────────────────────────────────────────────
// Vitest lo provee automáticamente, pero nos aseguramos del valor de la API URL
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_URL: 'http://localhost:3000/api',
    MODE: 'test',
    DEV: false,
    PROD: false
  },
  writable: true
})

// ── Silenciar advertencias de Vue esperadas en tests ─────────────────────────
// Por ejemplo: "Component is missing template or render function" al testear
// vistas que tienen dependencias externas no resueltas.
const originalWarn = console.warn
beforeEach(() => {
  console.warn = (...args) => {
    // Suprimir solo advertencias conocidas y esperadas en el entorno de test
    const msg = args[0]?.toString() || ''
    if (
      msg.includes('[Vue warn]') ||
      msg.includes('Component is missing template')
    ) return
    originalWarn(...args)
  }
})

afterEach(() => {
  console.warn = originalWarn
})
