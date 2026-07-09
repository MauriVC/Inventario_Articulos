import { createRouter, createWebHashHistory } from 'vue-router'
import { auth } from '@/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { layout: 'none', public: true }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { title: 'Dashboard', icon: 'LayoutDashboard' }
  },
  {
    path: '/almacenes',
    name: 'Almacenes',
    component: () => import('@/views/AlmacenesView.vue'),
    meta: { title: 'Almacenes', icon: 'Warehouse', permission: 'VER_ALMACENES' }
  },
  {
    path: '/articulos',
    name: 'Articulos',
    component: () => import('@/views/ArticulosView.vue'),
    meta: { title: 'Artículos', icon: 'Package', permission: 'VER_ARTICULOS' }
  },
  {
    path: '/paquetes',
    name: 'Paquetes',
    component: () => import('@/views/PaquetesView.vue'),
    meta: { title: 'Paquetes', icon: 'Boxes', permission: 'VER_ARTICULOS' }
  },
  {
    path: '/movimientos/salida',
    name: 'MovimientoSalida',
    component: () => import('@/views/MovimientoSalidaView.vue'),
    meta: { title: 'Registro de Salida', icon: 'ArrowUpFromLine', parent: 'Movimientos', permission: 'REGISTRAR_SALIDA' }
  },
  {
    path: '/movimientos/entrada',
    name: 'MovimientoEntrada',
    component: () => import('@/views/MovimientoEntradaView.vue'),
    meta: { title: 'Registro de Entrada', icon: 'ArrowDownToLine', parent: 'Movimientos', permission: 'REGISTRAR_ENTRADA' }
  },
  {
    path: '/movimientos/baja',
    name: 'BajaArticulos',
    component: () => import('@/views/BajaArticulosView.vue'),
    meta: { title: 'Baja de Artículos', icon: 'PackageMinus', parent: 'Movimientos', permission: 'REGISTRAR_BAJA' }
  },
  {
    path: '/categorias',
    name: 'Categorias',
    component: () => import('@/views/CategoriasView.vue'),
    meta: { title: 'Categorías', icon: 'FolderTree', permission: 'GESTIONAR_CONFIGURACION' }
  },
  {
    path: '/marcas',
    name: 'Marcas',
    component: () => import('@/views/MarcasView.vue'),
    meta: { title: 'Marcas', icon: 'Tag', permission: 'GESTIONAR_CONFIGURACION' }
  },
  {
    path: '/unidades',
    name: 'Unidades',
    component: () => import('@/views/UnidadesView.vue'),
    meta: { title: 'Unidades de Medida', icon: 'Ruler', permission: 'GESTIONAR_CONFIGURACION' }
  },
  {
    path: '/colores',
    name: 'Colores',
    component: () => import('@/views/ColoresView.vue'),
    meta: { title: 'Colores', icon: 'Palette', permission: 'GESTIONAR_CONFIGURACION' }
  },
  {
    path: '/atributos',
    name: 'Atributos',
    component: () => import('@/views/AtributosView.vue'),
    meta: { title: 'Atributos', icon: 'Tags', permission: 'GESTIONAR_CONFIGURACION' }
  },
  {
    path: '/devolucion',
    name: 'Devolucion',
    component: () => import('@/views/DevolucionView.vue'),
    meta: { title: 'Adm. Devolución', icon: 'RotateCcw', permission: 'VER_MOVIMIENTOS' }
  },
  {
    path: '/usuarios',
    name: 'Usuarios',
    component: () => import('@/views/UsuariosView.vue'),
    meta: { title: 'Usuarios', icon: 'Users', permission: 'GESTIONAR_USUARIOS' }
  },
  {
    path: '/historial',
    name: 'Historial',
    component: () => import('@/views/HistorialView.vue'),
    meta: { title: 'Historial', icon: 'ClipboardList', permission: 'VER_REPORTES' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// ─── Navigation Guard ───
router.beforeEach((to, from, next) => {
  // Ruta pública (login): si ya está autenticado, ir al dashboard
  if (to.meta.public) {
    if (auth.isLoggedIn.value) {
      return next('/')
    }
    return next()
  }

  // Ruta protegida: si no está autenticado, ir al login
  if (!auth.isLoggedIn.value) {
    return next('/login')
  }

  // Verificar permisos si la ruta lo requiere
  if (to.meta.permission) {
    if (!auth.hasPermission(to.meta.permission)) {
      // No tiene permiso → redirigir al dashboard
      return next('/')
    }
  }

  next()
})

export default router
