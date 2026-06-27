<template>
  <header class="topbar">
    <div class="topbar-left">
      <h1 class="topbar-title">{{ $route.meta.title || 'Dashboard' }}</h1>
      <div class="topbar-breadcrumb" v-if="$route.meta.parent">
        <span class="topbar-breadcrumb-item">{{ $route.meta.parent }}</span>
        <ChevronRight :size="14" />
        <span class="topbar-breadcrumb-current">{{ $route.meta.title }}</span>
      </div>
    </div>
    <div class="topbar-right">
      <!-- Indicador de Red -->
      <div class="network-badge" :class="isOnline ? 'online' : 'offline'" v-if="isElectron">
        <Wifi v-if="isOnline" :size="14" />
        <WifiOff v-else :size="14" />
        <span>{{ isOnline ? 'Nube (Online)' : 'Local (Offline)' }}</span>
      </div>

      <div class="topbar-search">
        <Search :size="16" />
        <input 
          type="text" 
          placeholder="Buscar pantalla..." 
          class="topbar-search-input" 
          v-model="searchQuery"
          @focus="isSearchFocused = true"
          @blur="handleBlur"
        />
        <!-- Dropdown de Resultados -->
        <div class="search-dropdown" v-if="isSearchFocused && searchQuery">
          <div 
            class="search-item" 
            v-for="res in searchResults" 
            :key="res.path"
            @mousedown.prevent="goTo(res.path)"
          >
            {{ res.name }}
          </div>
          <div class="search-item text-muted" v-if="searchResults.length === 0">
            No se encontraron resultados
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { Search, ChevronRight, Wifi, WifiOff } from 'lucide-vue-next'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const searchQuery = ref('')
const isSearchFocused = ref(false)

const isOnline = ref(true)
const isElectron = ref(false)

onMounted(async () => {
  if (window.electronAPI) {
    isElectron.value = true;
    isOnline.value = await window.electronAPI.getNetworkStatus();
    window.electronAPI.onNetworkStatus((status) => {
      isOnline.value = status;
    });
  }
})

const searchablePages = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Artículos (Inventario)', path: '/articulos' },
  { name: 'Categorías', path: '/categorias' },
  { name: 'Marcas', path: '/marcas' },
  { name: 'Unidades de Medida', path: '/unidades' },
  { name: 'Colores', path: '/colores' },
  { name: 'Usuarios del Sistema', path: '/usuarios' },
  { name: 'Movimiento: Nueva Salida', path: '/movimientos/salida' },
  { name: 'Movimiento: Nueva Entrada / Devolución', path: '/movimientos/entrada' },
  { name: 'Movimiento: Dar de Baja', path: '/movimientos/baja' },
  { name: 'Historial de Movimientos', path: '/historial' },
]

const searchResults = computed(() => {
  if (!searchQuery.value) return []
  const q = searchQuery.value.toLowerCase()
  return searchablePages.filter(p => p.name.toLowerCase().includes(q))
})

function goTo(path) {
  router.push(path)
  searchQuery.value = ''
  isSearchFocused.value = false
}

function handleBlur() {
  // Pequeño timeout para permitir que el click registre antes de ocultar
  setTimeout(() => {
    isSearchFocused.value = false
  }, 150)
}
</script>

<style scoped>
.topbar {
  height: var(--topbar-height);
  background: var(--color-white);
  border-bottom: 1px solid var(--color-gray-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
  flex-shrink: 0;
}
.topbar-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.topbar-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-gray-800);
  line-height: 1.2;
}
.topbar-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}
.topbar-breadcrumb-current {
  color: var(--color-primary);
  font-weight: 500;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.network-badge {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  transition: all 0.3s ease;
}
.network-badge.online {
  background: var(--color-success-light);
  color: var(--color-success);
}
.network-badge.offline {
  background: var(--color-danger-light);
  color: var(--color-danger);
}
.topbar-search {
  position: relative;
  display: flex;
  align-items: center;
}
.topbar-search svg {
  position: absolute;
  left: var(--space-3);
  color: var(--color-gray-400);
  pointer-events: none;
}
.topbar-search-input {
  padding: var(--space-2) var(--space-3);
  padding-left: 2.25rem;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  background: var(--color-gray-50);
  outline: none;
  width: 220px;
  transition: all var(--transition-fast);
  color: var(--color-gray-700);
}
.topbar-search-input:focus {
  border-color: var(--color-primary);
  background: var(--color-white);
  box-shadow: 0 0 0 3px rgba(46, 109, 164, 0.1);
  width: 280px;
}
.topbar-search-input::placeholder {
  color: var(--color-gray-400);
}
.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  background: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 50;
  max-height: 300px;
  overflow-y: auto;
}
.search-item {
  padding: 10px 16px;
  font-size: var(--font-size-sm);
  color: var(--color-gray-700);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}
.search-item:hover {
  background-color: var(--color-gray-50);
  color: var(--color-primary);
}
.text-muted {
  color: var(--color-gray-400);
  cursor: default;
}
.text-muted:hover {
  background-color: transparent;
  color: var(--color-gray-400);
}
</style>
