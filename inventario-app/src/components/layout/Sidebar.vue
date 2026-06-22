<template>
  <aside class="sidebar">
    <!-- Logo -->
    <div class="sidebar-logo">
      <img :src="logoUrl" alt="U.E. Corazón Nuevo" class="sidebar-logo-img" />
      <div class="sidebar-logo-text">
        <span class="sidebar-logo-title">Control de Inventario</span>
        <span class="sidebar-logo-subtitle">U.E. Corazón Nuevo</span>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <div class="sidebar-section">
        <span class="sidebar-section-label">Principal</span>
        <router-link to="/" class="sidebar-link" :class="{ active: $route.name === 'Dashboard' }">
          <LayoutDashboard :size="20" />
          <span>Dashboard</span>
        </router-link>
        <router-link to="/almacenes" class="sidebar-link" :class="{ active: $route.name === 'Almacenes' }">
          <Warehouse :size="20" />
          <span>Almacenes</span>
        </router-link>
        <router-link to="/articulos" class="sidebar-link" :class="{ active: $route.name === 'Articulos' }">
          <Package :size="20" />
          <span>Artículos</span>
        </router-link>
        <router-link to="/paquetes" class="sidebar-link" :class="{ active: $route.name === 'Paquetes' }">
          <Boxes :size="20" />
          <span>Paquetes</span>
        </router-link>
      </div>

      <div class="sidebar-section">
        <span class="sidebar-section-label">Movimientos</span>
        <router-link to="/movimientos/salida" class="sidebar-link" :class="{ active: $route.name === 'MovimientoSalida' }">
          <ArrowUpFromLine :size="20" />
          <span>Salida</span>
          <span class="sidebar-badge badge-sal">SAL</span>
        </router-link>
        <router-link to="/movimientos/entrada" class="sidebar-link" :class="{ active: $route.name === 'MovimientoEntrada' }">
          <ArrowDownToLine :size="20" />
          <span>Entrada</span>
          <span class="sidebar-badge badge-ent">ENT</span>
        </router-link>
        <router-link to="/historial" class="sidebar-link" :class="{ active: $route.name === 'Historial' }" v-if="isAdmin">
          <ClipboardList :size="20" />
          <span>Historial</span>
        </router-link>
        <router-link to="/movimientos/baja" class="sidebar-link" :class="{ active: $route.name === 'BajaArticulos' }">
          <PackageMinus :size="20" />
          <span>Baja</span>
          <span class="sidebar-badge badge-baj">BAJ</span>
        </router-link>
      </div>

      <div class="sidebar-section">
        <span class="sidebar-section-label">Catálogos</span>
        <router-link to="/categorias" class="sidebar-link" :class="{ active: $route.name === 'Categorias' }">
          <FolderTree :size="20" />
          <span>Categorías</span>
        </router-link>
        <router-link to="/marcas" class="sidebar-link" :class="{ active: $route.name === 'Marcas' }">
          <Tag :size="20" />
          <span>Marcas</span>
        </router-link>
        <router-link to="/unidades" class="sidebar-link" :class="{ active: $route.name === 'Unidades' }">
          <Ruler :size="20" />
          <span>Unidades de Medida</span>
        </router-link>
        <router-link to="/colores" class="sidebar-link" :class="{ active: $route.name === 'Colores' }">
          <Palette :size="20" />
          <span>Colores</span>
        </router-link>
        <router-link to="/atributos" class="sidebar-link" :class="{ active: $route.name === 'Atributos' }">
          <Tags :size="20" />
          <span>Atributos</span>
        </router-link>
        <router-link to="/devolucion" class="sidebar-link" :class="{ active: $route.name === 'Devolucion' }">
          <RotateCcw :size="20" />
          <span>Adm. Devolución</span>
        </router-link>
      </div>

      <div class="sidebar-section" v-if="isSuperAdmin">
        <span class="sidebar-section-label">Administración</span>
        <router-link to="/usuarios" class="sidebar-link" :class="{ active: $route.name === 'Usuarios' }">
          <Users :size="20" />
          <span>Usuarios</span>
        </router-link>
      </div>
    </nav>

    <!-- User Info -->
    <div class="sidebar-user">
      <div class="sidebar-user-avatar">
        <UserCircle :size="36" />
      </div>
      <div class="sidebar-user-info">
        <span class="sidebar-user-name">{{ userName }}</span>
        <span class="sidebar-user-role">{{ userRole }}</span>
      </div>
      <button class="sidebar-logout" title="Cerrar sesión" @click="handleLogout">
        <LogOut :size="18" />
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  LayoutDashboard, Warehouse, Package, Boxes,
  ArrowUpFromLine, ArrowDownToLine, ClipboardList, PackageMinus,
  FolderTree, Tag, Ruler, Palette, Tags, RotateCcw,
  Users, UserCircle, LogOut
} from 'lucide-vue-next'
import { auth } from '@/auth'

import logoSrc from '@/assets/logo.png'
const logoUrl = computed(() => logoSrc)
const router = useRouter()

const userName = auth.userName
const userRole = auth.userRole
const isAdmin = auth.isAdmin
const isSuperAdmin = auth.isSuperAdmin

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background: linear-gradient(180deg, var(--color-primary-darkest) 0%, var(--color-primary-dark) 100%);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

/* Logo */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.sidebar-logo-img {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.3);
}
.sidebar-logo-text {
  display: flex;
  flex-direction: column;
}
.sidebar-logo-title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-white);
  line-height: 1.2;
}
.sidebar-logo-subtitle {
  font-size: var(--font-size-xs);
  color: rgba(255, 255, 255, 0.55);
  font-weight: 400;
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3) 0;
}
.sidebar-nav::-webkit-scrollbar {
  width: 3px;
}
.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
}

.sidebar-section {
  margin-bottom: var(--space-2);
}
.sidebar-section-label {
  display: block;
  padding: var(--space-2) var(--space-5);
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-5);
  margin: 1px var(--space-2);
  color: rgba(255, 255, 255, 0.65);
  font-size: var(--font-size-base);
  font-weight: 400;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  text-decoration: none;
}
.sidebar-link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-white);
}
.sidebar-link.active {
  background: rgba(255, 255, 255, 0.15);
  color: var(--color-white);
  font-weight: 500;
}
.sidebar-link.active::before {
  content: '';
  position: absolute;
  left: 0;
  width: 3px;
  height: 24px;
  background: var(--color-primary-lighter);
  border-radius: 0 3px 3px 0;
}
.sidebar-link {
  position: relative;
}

.sidebar-badge {
  margin-left: auto;
  padding: 1px 6px;
  font-size: 0.625rem;
  font-weight: 700;
  border-radius: var(--radius-full);
  letter-spacing: 0.05em;
}
.badge-sal {
  background: rgba(229, 62, 62, 0.2);
  color: #FC8181;
}
.badge-ent {
  background: rgba(56, 161, 105, 0.2);
  color: #68D391;
}
.badge-baj {
  background: rgba(237, 137, 54, 0.2);
  color: #F6AD55;
}

/* User Info */
.sidebar-user {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-4);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.15);
}
.sidebar-user-avatar {
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}
.sidebar-user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.sidebar-user-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-white);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sidebar-user-role {
  font-size: var(--font-size-xs);
  color: rgba(255, 255, 255, 0.45);
}
.sidebar-logout {
  color: rgba(255, 255, 255, 0.5);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}
.sidebar-logout:hover {
  background: rgba(229, 62, 62, 0.3);
  color: #FC8181;
}
</style>
