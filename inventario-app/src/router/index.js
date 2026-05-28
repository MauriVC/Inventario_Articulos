import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { layout: 'none' }
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
    meta: { title: 'Almacenes', icon: 'Warehouse' }
  },
  {
    path: '/articulos',
    name: 'Articulos',
    component: () => import('@/views/ArticulosView.vue'),
    meta: { title: 'Artículos', icon: 'Package' }
  },
  {
    path: '/paquetes',
    name: 'Paquetes',
    component: () => import('@/views/PaquetesView.vue'),
    meta: { title: 'Paquetes', icon: 'Boxes' }
  },
  {
    path: '/movimientos/salida',
    name: 'MovimientoSalida',
    component: () => import('@/views/MovimientoSalidaView.vue'),
    meta: { title: 'Registro de Salida', icon: 'ArrowUpFromLine', parent: 'Movimientos' }
  },
  {
    path: '/movimientos/entrada',
    name: 'MovimientoEntrada',
    component: () => import('@/views/MovimientoEntradaView.vue'),
    meta: { title: 'Registro de Entrada', icon: 'ArrowDownToLine', parent: 'Movimientos' }
  },
  {
    path: '/movimientos/baja',
    name: 'BajaArticulos',
    component: () => import('@/views/BajaArticulosView.vue'),
    meta: { title: 'Baja de Artículos', icon: 'PackageMinus', parent: 'Movimientos' }
  },
  {
    path: '/categorias',
    name: 'Categorias',
    component: () => import('@/views/CategoriasView.vue'),
    meta: { title: 'Categorías', icon: 'FolderTree' }
  },
  {
    path: '/marcas',
    name: 'Marcas',
    component: () => import('@/views/MarcasView.vue'),
    meta: { title: 'Marcas', icon: 'Tag' }
  },
  {
    path: '/unidades',
    name: 'Unidades',
    component: () => import('@/views/UnidadesView.vue'),
    meta: { title: 'Unidades de Medida', icon: 'Ruler' }
  },
  {
    path: '/colores',
    name: 'Colores',
    component: () => import('@/views/ColoresView.vue'),
    meta: { title: 'Colores', icon: 'Palette' }
  },
  {
    path: '/atributos',
    name: 'Atributos',
    component: () => import('@/views/AtributosView.vue'),
    meta: { title: 'Atributos', icon: 'Tags' }
  },
  {
    path: '/devolucion',
    name: 'Devolucion',
    component: () => import('@/views/DevolucionView.vue'),
    meta: { title: 'Adm. Devolución', icon: 'RotateCcw' }
  },
  {
    path: '/usuarios',
    name: 'Usuarios',
    component: () => import('@/views/UsuariosView.vue'),
    meta: { title: 'Usuarios', icon: 'Users' }
  },
  {
    path: '/historial',
    name: 'Historial',
    component: () => import('@/views/HistorialView.vue'),
    meta: { title: 'Historial', icon: 'ClipboardList' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
