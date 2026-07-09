/**
 * Auth Store — Estado global de autenticación
 * Usa reactive de Vue para compartir estado entre componentes
 * Persiste la sesión en sessionStorage para que el ejecutable pida login al abrir
 */
import { reactive, computed } from 'vue'
import { api } from '@/api'

const STORAGE_KEY = 'inventario_user'

// Cargar sesión persistida
function loadStoredUser() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
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
  // ─── Verificación de roles ───
  isSuperAdmin: computed(() => state.user?.rol === 'SuperAdministrador'),
  isAdmin: computed(() => state.user?.rol === 'Administrador' || state.user?.rol === 'SuperAdministrador'),
  isUsuario: computed(() => state.user?.rol === 'Usuario'),

  // ─── Verificación de permisos ───
  hasPermission: (permiso) => {
    if (state.user?.rol === 'SuperAdministrador') return true;
    return state.user?.permisos?.includes(permiso) || false;
  },

  // ─── Acciones ───
  async login(carnet, contrasena) {
    state.loginError = ''
    state.loading = true

    try {
      const res = await api.login(carnet, contrasena)
      state.user = res.data
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(res.data))
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
    sessionStorage.removeItem(STORAGE_KEY)
  }
}
