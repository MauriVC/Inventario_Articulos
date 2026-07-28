/**
 * UsuariosView.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests de COMPONENTE para UsuariosView.vue
 *
 * Estrategia: montar el componente con @vue/test-utils usando un router stub
 * y mockear api.js para controlar qué datos recibe el componente.
 * No se hace ninguna llamada HTTP real.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

// ── Mocks declarados ANTES del import del componente ─────────────────────────

// Mock completo de api.js — controlamos cada método individualmente en cada test
vi.mock('@/api', () => ({
  api: {
    getUsuarios: vi.fn(),
    getAlmacenes: vi.fn(),
    getPermisos: vi.fn(),
    createUsuario: vi.fn(),
    updateUsuario: vi.fn()
  }
}))

// Mock de auth.js — usuario logueado como SuperAdministrador
vi.mock('@/auth', () => ({
  auth: {
    state: { user: { id: 1, rol: 'SuperAdministrador' } },
    isLoggedIn: { value: true },
    userRole: { value: 'SuperAdministrador' },
    userId: { value: 1 },
    isSuperAdmin: { value: true },
    isAdmin: { value: true },
    hasPermission: () => true
  }
}))

// Mock de alerts.js — evitar que SweetAlert2 intente renderizar en jsdom
vi.mock('@/utils/alerts', () => ({
  confirmAction: vi.fn().mockResolvedValue(true),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn()
}))

// Importar el componente y api después de los mocks
import UsuariosView from '@/views/UsuariosView.vue'
import { api } from '@/api'

// ── Datos de prueba ───────────────────────────────────────────────────────────
const USUARIOS_MOCK = [
  {
    id: 1,
    carnet: '11111111',
    nombres: 'Super',
    apellidos: 'Admin',
    telefono: '70000001',
    rol: 'SuperAdministrador',
    estado: 'Activo',
    almacenes: [],
    permisos: []
  },
  {
    id: 2,
    carnet: '22222222',
    nombres: 'Admin',
    apellidos: 'Prueba',
    telefono: '70000002',
    rol: 'Administrador',
    estado: 'Activo',
    almacenes: [{ id: 1, nombre: 'Almacén Central' }],
    permisos: [1]
  },
  {
    id: 3,
    carnet: '33333333',
    nombres: 'Usuario',
    apellidos: 'Normal',
    telefono: null,
    rol: 'Usuario',
    estado: 'Inactivo',
    almacenes: [],
    permisos: []
  }
]

const ALMACENES_MOCK = [
  { id: 1, nombre: 'Almacén Central', ubicacion: 'Planta Baja' }
]

const PERMISOS_MOCK = [
  { id: 1, nombre: 'GESTIONAR_USUARIOS', descripcion: 'Gestionar usuarios', modulo: 'Usuarios' },
  { id: 2, nombre: 'CREAR_ALMACEN', descripcion: 'Crear almacenes', modulo: 'Almacenes' }
]

// ── Router mínimo para evitar el "RouterView not found" de Vue Router ─────────
function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }]
  })
}

// ── Helper: montar el componente con datos por defecto ───────────────────────
async function mountUsuariosView(overrides = {}) {
  api.getUsuarios.mockResolvedValue({ data: USUARIOS_MOCK, ...overrides.usuarios })
  api.getAlmacenes.mockResolvedValue({ data: ALMACENES_MOCK })
  api.getPermisos.mockResolvedValue({ data: PERMISOS_MOCK })

  const wrapper = mount(UsuariosView, {
    global: {
      plugins: [buildRouter()],
      stubs: {
        // Stub de iconos Lucide para evitar errores de render SVG en jsdom
        Plus: { template: '<span data-icon="Plus" />' },
        Pencil: { template: '<span data-icon="Pencil" />' },
        Trash2: { template: '<span data-icon="Trash2" />' },
        X: { template: '<span data-icon="X" />' },
        Save: { template: '<span data-icon="Save" />' },
        UserMinus: { template: '<span data-icon="UserMinus" />' },
        UserCheck: { template: '<span data-icon="UserCheck" />' }
      }
    }
  })

  // Esperar a que se resuelvan todas las promesas (loadUsuarios, loadAlmacenes, loadPermisos)
  await flushPromises()

  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — Renderizado inicial
// ─────────────────────────────────────────────────────────────────────────────
describe('UsuariosView — Renderizado inicial', () => {
  test('muestra el botón Nuevo Usuario', async () => {
    const wrapper = await mountUsuariosView()
    expect(wrapper.text()).toContain('Nuevo Usuario')
  })

  test('llama a getUsuarios, getAlmacenes y getPermisos al montar', async () => {
    await mountUsuariosView()
    expect(api.getUsuarios).toHaveBeenCalledTimes(1)
    expect(api.getAlmacenes).toHaveBeenCalledTimes(1)
    expect(api.getPermisos).toHaveBeenCalledTimes(1)
  })

  test('muestra la tabla con los usuarios cargados', async () => {
    const wrapper = await mountUsuariosView()
    expect(wrapper.text()).toContain('11111111')
    expect(wrapper.text()).toContain('22222222')
    expect(wrapper.text()).toContain('33333333')
  })

  test('muestra los nombres y apellidos de los usuarios', async () => {
    const wrapper = await mountUsuariosView()
    expect(wrapper.text()).toContain('Super')
    expect(wrapper.text()).toContain('Admin')
    expect(wrapper.text()).toContain('Prueba')
  })

  test('muestra los roles correctamente', async () => {
    const wrapper = await mountUsuariosView()
    expect(wrapper.text()).toContain('SuperAdministrador')
    expect(wrapper.text()).toContain('Administrador')
    expect(wrapper.text()).toContain('Usuario')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — Estado vacío
// ─────────────────────────────────────────────────────────────────────────────
describe('UsuariosView — Estado vacío', () => {
  test('muestra mensaje de estado vacío cuando no hay usuarios', async () => {
    api.getUsuarios.mockResolvedValue({ data: [] })
    api.getAlmacenes.mockResolvedValue({ data: [] })
    api.getPermisos.mockResolvedValue({ data: [] })

    const wrapper = mount(UsuariosView, {
      global: {
        plugins: [buildRouter()],
        stubs: {
          Plus: { template: '<span />' }, Pencil: { template: '<span />' },
          X: { template: '<span />' }, Save: { template: '<span />' },
          UserMinus: { template: '<span />' }, UserCheck: { template: '<span />' }
        }
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('No hay usuarios registrados')
  })

  test('estado vacío: el botón Nuevo Usuario sigue disponible', async () => {
    api.getUsuarios.mockResolvedValue({ data: [] })
    api.getAlmacenes.mockResolvedValue({ data: [] })
    api.getPermisos.mockResolvedValue({ data: [] })

    const wrapper = mount(UsuariosView, {
      global: {
        plugins: [buildRouter()],
        stubs: {
          Plus: { template: '<span />' }, Pencil: { template: '<span />' },
          X: { template: '<span />' }, Save: { template: '<span />' },
          UserMinus: { template: '<span />' }, UserCheck: { template: '<span />' }
        }
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Nuevo Usuario')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Modal de creación
// ─────────────────────────────────────────────────────────────────────────────
describe('UsuariosView — Modal de creación', () => {
  test('el modal está oculto al cargar la vista', async () => {
    const wrapper = await mountUsuariosView()
    // El modal-overlay solo debe estar en el DOM cuando showModal es true
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  test('hacer click en Nuevo Usuario abre el modal', async () => {
    const wrapper = await mountUsuariosView()

    const btn = wrapper.find('button.btn-primary')
    await btn.trigger('click')

    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
  })

  test('el modal abierto muestra el título Nuevo Usuario', async () => {
    const wrapper = await mountUsuariosView()
    await wrapper.find('button.btn-primary').trigger('click')

    expect(wrapper.find('.modal-content').text()).toContain('Nuevo Usuario')
  })

  test('el modal tiene campos de carnet, nombres, apellidos y contraseña', async () => {
    const wrapper = await mountUsuariosView()
    await wrapper.find('button.btn-primary').trigger('click')

    const inputs = wrapper.findAll('input')
    // Debe haber al menos carnet, nombres, apellidos, contraseña, teléfono
    expect(inputs.length).toBeGreaterThanOrEqual(4)
  })

  test('hacer click en Cancelar cierra el modal', async () => {
    const wrapper = await mountUsuariosView()
    await wrapper.find('button.btn-primary').trigger('click')
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)

    const cancelBtn = wrapper.find('button.btn-secondary')
    await cancelBtn.trigger('click')

    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Modal de edición
// ─────────────────────────────────────────────────────────────────────────────
describe('UsuariosView — Modal de edición', () => {
  test('hacer click en editar abre el modal con título Editar Usuario', async () => {
    const wrapper = await mountUsuariosView()

    // El primer botón de editar (ícono Pencil) de la primera fila
    const editBtns = wrapper.findAll('button.btn-ghost.btn-icon')
    await editBtns[0].trigger('click')

    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.find('.modal-content').text()).toContain('Editar Usuario')
  })

  test('el modal de edición pre-rellena el carnet del usuario', async () => {
    const wrapper = await mountUsuariosView()

    const editBtns = wrapper.findAll('button.btn-ghost.btn-icon')
    await editBtns[0].trigger('click')

    const carnetInput = wrapper.find('input[placeholder="Carnet de identidad"]')
    expect(carnetInput.element.value).toBe('11111111')
  })

  test('el campo contraseña está vacío en modo edición', async () => {
    const wrapper = await mountUsuariosView()

    const editBtns = wrapper.findAll('button.btn-ghost.btn-icon')
    await editBtns[0].trigger('click')

    const passInput = wrapper.find('input[type="password"]')
    expect(passInput.element.value).toBe('')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Guardado de usuario
// ─────────────────────────────────────────────────────────────────────────────
describe('UsuariosView — Guardado', () => {
  test('al guardar un usuario nuevo, llama a api.createUsuario', async () => {
    api.createUsuario.mockResolvedValue({ data: { id: 99 } })

    const wrapper = await mountUsuariosView()
    await wrapper.find('button.btn-primary').trigger('click')

    // Rellenar campos requeridos
    await wrapper.find('input[placeholder="Carnet de identidad"]').setValue('99999999')
    await wrapper.find('input[placeholder="Nombres"]').setValue('Test')
    await wrapper.find('input[placeholder="Apellidos"]').setValue('Nuevo')
    await wrapper.find('input[type="password"]').setValue('pass1234')

    // Enviar el formulario
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.createUsuario).toHaveBeenCalledTimes(1)
    const callArg = api.createUsuario.mock.calls[0][0]
    expect(callArg.carnet).toBe('99999999')
    expect(callArg.nombres).toBe('Test')
  })

  test('al guardar un usuario editado, llama a api.updateUsuario con el id correcto', async () => {
    api.updateUsuario.mockResolvedValue({ data: { id: 1 } })

    const wrapper = await mountUsuariosView()

    // Abrir modal de edición del primer usuario (id=1)
    const editBtns = wrapper.findAll('button.btn-ghost.btn-icon')
    await editBtns[0].trigger('click')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.updateUsuario).toHaveBeenCalledTimes(1)
    expect(api.updateUsuario.mock.calls[0][0]).toBe(1) // id del usuario
  })

  test('tras guardar, vuelve a cargar la lista de usuarios', async () => {
    api.createUsuario.mockResolvedValue({ data: { id: 88 } })

    const wrapper = await mountUsuariosView()
    // getUsuarios ya fue llamado 1 vez en el montaje
    expect(api.getUsuarios).toHaveBeenCalledTimes(1)

    await wrapper.find('button.btn-primary').trigger('click')
    await wrapper.find('input[placeholder="Carnet de identidad"]').setValue('88888888')
    await wrapper.find('input[placeholder="Nombres"]').setValue('Recarga')
    await wrapper.find('input[placeholder="Apellidos"]').setValue('Test')
    await wrapper.find('input[type="password"]').setValue('pass1234')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    // Debe haberse llamado 2 veces (montaje + después de guardar)
    expect(api.getUsuarios).toHaveBeenCalledTimes(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — Accesibilidad y estructura del DOM
// ─────────────────────────────────────────────────────────────────────────────
describe('UsuariosView — Estructura y accesibilidad', () => {
  test('la tabla tiene encabezados de columna visibles', async () => {
    const wrapper = await mountUsuariosView()
    const headers = wrapper.findAll('th')
    const headerTexts = headers.map(h => h.text())

    expect(headerTexts).toContain('Carnet')
    expect(headerTexts).toContain('Nombres')
    expect(headerTexts).toContain('Apellidos')
    expect(headerTexts).toContain('Rol')
    expect(headerTexts).toContain('Estado')
    expect(headerTexts).toContain('Acciones')
  })

  test('los usuarios inactivos tienen clase opacity-50', async () => {
    const wrapper = await mountUsuariosView()
    // El usuario id=3 tiene estado 'Inactivo'
    const rows = wrapper.findAll('tbody tr')
    const inactiveRow = rows.find(r => r.text().includes('33333333'))
    expect(inactiveRow?.classes()).toContain('opacity-50')
  })

  test('usuarios sin teléfono muestran guión', async () => {
    const wrapper = await mountUsuariosView()
    // Usuario id=3 tiene telefono: null
    expect(wrapper.text()).toContain('—')
  })
})
