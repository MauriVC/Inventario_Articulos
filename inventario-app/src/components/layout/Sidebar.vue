<template>
  <aside class="sidebar" :class="{ 'collapsed': isCollapsed }">
    <!-- Logo & Toggle -->
    <div class="sidebar-logo" :class="{ 'justify-center': isCollapsed }">
      <div class="sidebar-brand" :class="{ 'hidden-text': isCollapsed }">
        <img :src="logoUrl" alt="U.E. Corazón Nuevo" class="sidebar-logo-img" />
        <div class="sidebar-logo-text">
          <span class="sidebar-logo-title">Control de Inventario</span>
          <span class="sidebar-logo-subtitle">U.E. Corazón Nuevo</span>
        </div>
      </div>
      <button class="sidebar-toggle" @click="isCollapsed = !isCollapsed" :title="isCollapsed ? 'Expandir' : 'Contraer'">
        <Menu :size="24" v-if="isCollapsed" style="color: var(--color-white);" />
        <ChevronLeft :size="20" v-else />
      </button>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <div class="sidebar-section">
        <span class="sidebar-section-label">Principal</span>
        <router-link to="/" class="sidebar-link" :class="{ active: $route.name === 'Dashboard' }" :title="isCollapsed ? 'Dashboard' : ''">
          <LayoutDashboard :size="20" />
          <span class="link-text">Dashboard</span>
        </router-link>
        <router-link v-if="auth.hasPermission('VER_ALMACENES')" to="/almacenes" class="sidebar-link" :class="{ active: $route.name === 'Almacenes' }" :title="isCollapsed ? 'Almacenes' : ''">
          <Warehouse :size="20" />
          <span class="link-text">Almacenes</span>
        </router-link>
        <router-link v-if="auth.hasPermission('VER_ARTICULOS')" to="/articulos" class="sidebar-link" :class="{ active: $route.name === 'Articulos' }" :title="isCollapsed ? 'Artículos' : ''">
          <Package :size="20" />
          <span class="link-text">Artículos</span>
        </router-link>
        <!-- Paquetes oculto visualmente, la ruta sigue disponible -->
        <!-- <router-link to="/paquetes" class="sidebar-link" :class="{ active: $route.name === 'Paquetes' }">
          <Boxes :size="20" />
          <span>Paquetes</span>
        </router-link> -->
      </div>

      <div class="sidebar-section">
        <span class="sidebar-section-label">Movimientos</span>
        <router-link v-if="auth.hasPermission('REGISTRAR_SALIDA')" to="/movimientos/salida" class="sidebar-link" :class="{ active: $route.name === 'MovimientoSalida' }" :title="isCollapsed ? 'Salida' : ''">
          <ArrowUpFromLine :size="20" />
          <span class="link-text">Salida</span>
          <span class="sidebar-badge badge-sal" v-show="!isCollapsed">SAL</span>
        </router-link>
        <router-link v-if="auth.hasPermission('REGISTRAR_ENTRADA')" to="/movimientos/entrada" class="sidebar-link" :class="{ active: $route.name === 'MovimientoEntrada' }" :title="isCollapsed ? 'Entrada' : ''">
          <ArrowDownToLine :size="20" />
          <span class="link-text">Entrada</span>
          <span class="sidebar-badge badge-ent" v-show="!isCollapsed">ENT</span>
        </router-link>

        <router-link v-if="auth.hasPermission('REGISTRAR_BAJA')" to="/movimientos/baja" class="sidebar-link" :class="{ active: $route.name === 'BajaArticulos' }" :title="isCollapsed ? 'Baja' : ''">
          <PackageMinus :size="20" />
          <span class="link-text">Baja</span>
          <span class="sidebar-badge badge-baj" v-show="!isCollapsed">BAJ</span>
        </router-link>
      </div>

      <div class="sidebar-section">
        <span class="sidebar-section-label">Catálogos</span>
        <router-link v-if="auth.hasPermission('GESTIONAR_CONFIGURACION')" to="/categorias" class="sidebar-link" :class="{ active: $route.name === 'Categorias' }" :title="isCollapsed ? 'Categorías' : ''">
          <FolderTree :size="20" />
          <span class="link-text">Categorías</span>
        </router-link>
        <router-link v-if="auth.hasPermission('GESTIONAR_CONFIGURACION')" to="/marcas" class="sidebar-link" :class="{ active: $route.name === 'Marcas' }" :title="isCollapsed ? 'Marcas' : ''">
          <Tag :size="20" />
          <span class="link-text">Marcas</span>
        </router-link>
        <router-link v-if="auth.hasPermission('GESTIONAR_CONFIGURACION')" to="/unidades" class="sidebar-link" :class="{ active: $route.name === 'Unidades' }" :title="isCollapsed ? 'Unidades' : ''">
          <Ruler :size="20" />
          <span class="link-text">Unidades de Medida</span>
        </router-link>
        <router-link v-if="auth.hasPermission('GESTIONAR_CONFIGURACION')" to="/colores" class="sidebar-link" :class="{ active: $route.name === 'Colores' }" :title="isCollapsed ? 'Colores' : ''">
          <Palette :size="20" />
          <span class="link-text">Colores</span>
        </router-link>
        <router-link v-if="auth.hasPermission('GESTIONAR_CONFIGURACION')" to="/atributos" class="sidebar-link" :class="{ active: $route.name === 'Atributos' }" :title="isCollapsed ? 'Atributos' : ''">
          <Tags :size="20" />
          <span class="link-text">Atributos</span>
        </router-link>
        <router-link v-if="auth.hasPermission('VER_MOVIMIENTOS')" to="/devolucion" class="sidebar-link" :class="{ active: $route.name === 'Devolucion' }" :title="isCollapsed ? 'Devolución' : ''">
          <RotateCcw :size="20" />
          <span class="link-text">Adm. Devolución</span>
        </router-link>
      </div>

      <div class="sidebar-section" v-if="auth.hasPermission('VER_REPORTES') || auth.hasPermission('GESTIONAR_USUARIOS')">
        <span class="sidebar-section-label">Administración</span>
        <router-link to="/historial" class="sidebar-link" :class="{ active: $route.name === 'Historial' }" v-if="auth.hasPermission('VER_REPORTES')" :title="isCollapsed ? 'Historial' : ''">
          <ClipboardList :size="20" />
          <span class="link-text">Historial</span>
        </router-link>
        <router-link to="/usuarios" class="sidebar-link" :class="{ active: $route.name === 'Usuarios' }" v-if="auth.hasPermission('GESTIONAR_USUARIOS')" :title="isCollapsed ? 'Usuarios' : ''">
          <Users :size="20" />
          <span class="link-text">Usuarios</span>
        </router-link>
      </div>
    </nav>

    <!-- User Info -->
    <div class="sidebar-user" :class="{ 'collapsed-user': isCollapsed }">
      <div class="sidebar-user-avatar">
        <UserCircle :size="36" />
      </div>
      <div class="sidebar-user-info" v-show="!isCollapsed">
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
import { useStorage } from '@vueuse/core'
import {
  LayoutDashboard, Warehouse, Package, Boxes,
  ArrowUpFromLine, ArrowDownToLine, ClipboardList, PackageMinus,
  FolderTree, Tag, Ruler, Palette, Tags, RotateCcw,
  Users, UserCircle, LogOut, ChevronLeft, ChevronRight, Menu
} from 'lucide-vue-next'
import { auth } from '@/auth'

const isCollapsed = useStorage('sidebar-collapsed', false)

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
  transition: width var(--transition-base) cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar.collapsed {
  width: var(--sidebar-collapsed);
}

/* Logo */
.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: all var(--transition-base);
}
.sidebar-logo.justify-center {
  justify-content: center;
  padding: var(--space-5) 0;
}
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  overflow: hidden;
  transition: opacity 0.2s, width 0.2s;
}
.sidebar-brand.hidden-text {
  opacity: 0;
  width: 0;
  pointer-events: none;
}
.sidebar-toggle {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  border: none;
  border-radius: var(--radius-md);
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}
.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  color: var(--color-white);
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
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
}
.sidebar.collapsed .sidebar-section-label {
  opacity: 0;
  height: 0;
  padding: 0;
  margin: 0;
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
  position: relative;
  overflow: hidden;
}
.sidebar.collapsed .sidebar-link {
  padding: var(--space-2) 0;
  justify-content: center;
}
.sidebar-link .link-text {
  transition: opacity 0.2s, width 0.2s;
  white-space: nowrap;
}
.sidebar.collapsed .sidebar-link .link-text {
  opacity: 0;
  width: 0;
  display: none;
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
  transition: all var(--transition-base);
}
.sidebar-user.collapsed-user {
  flex-direction: column;
  padding: var(--space-4) 0;
  gap: var(--space-2);
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
