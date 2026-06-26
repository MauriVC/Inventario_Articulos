/**
 * Auth Store — Estado global de autenticación
 * Usa reactive de Vue para compartir estado entre componentes
 * Persiste la sesión en localStorage para que sobreviva recargas
 */
import { reactive, computed } from 'vue'
import { api } from '@/api'

const STORAGE_KEY = 'inventario_user'

// Cargar sesión persistida
function loadStoredUser() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const state = reactive({
  user: loadStoredUser(),
  loginError: '',
  loading: false
})

export const auth = {
  // ─── Estado reactivo ───
  state,

  // ─── Computeds ───
  isLoggedIn: computed(() => !!state.user),
  userName: computed(() => state.user ? `${state.user.nombres} ${state.user.apellidos}` : ''),
  userRole: computed(() => state.user?.rol || ''),
  userId: computed(() => state.user?.id || null),

  // ─── Verificación de roles ───
  isSuperAdmin: computed(() => state.user?.rol === 'SuperAdministrador'),
  isAdmin: computed(() => state.user?.rol === 'Administrador' || state.user?.rol === 'SuperAdministrador'),
  isUsuario: computed(() => state.user?.rol === 'Usuario'),

  // ─── Acciones ───
  async login(carnet, contrasena) {
    state.loginError = ''
    state.loading = true

    try {
      const res = await api.login(carnet, contrasena)
      state.user = res.data
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data))
      return true
    } catch (err) {
      state.loginError = err.message
      return false
    } finally {
      state.loading = false
    }
  },

  logout() {
    state.user = null
    state.loginError = ''
    localStorage.removeItem(STORAGE_KEY)
  }
}
