<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <p class="text-muted">Define qué artículos requieren devolución después de ser entregados</p>
    </div>

    <!-- Stats Cards -->
    <div class="devolucion-stats mb-6">
      <template v-if="activeTab === 'articulos'">
        <div class="stat-card stat-total">
          <div class="stat-icon">
            <Package :size="22" />
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ articulos.length }}</span>
            <span class="stat-label">Total Artículos</span>
          </div>
        </div>
        <div class="stat-card stat-devuelve">
          <div class="stat-icon">
            <RotateCcw :size="22" />
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ articulosConDevolucion }}</span>
            <span class="stat-label">Requieren Devolución</span>
          </div>
        </div>
        <div class="stat-card stat-no-devuelve">
          <div class="stat-icon">
            <PackageX :size="22" />
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ articulosSinDevolucion }}</span>
            <span class="stat-label">Sin Devolución</span>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="stat-card stat-total">
          <div class="stat-icon">
            <ArrowUpRight :size="22" />
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ salidasDevolucion.length }}</span>
            <span class="stat-label">Total Entregas</span>
          </div>
        </div>
        <div class="stat-card" style="border-left: 4px solid var(--color-warning);">
          <div class="stat-icon" style="background: var(--color-warning-light); color: #B7791F;">
            <RotateCcw :size="22" />
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ pendientesCount }}</span>
            <span class="stat-label">Pendientes</span>
          </div>
        </div>
        <div class="stat-card stat-devuelve">
          <div class="stat-icon">
            <CheckCircle :size="22" />
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ salidasDevolucion.length - pendientesCount }}</span>
            <span class="stat-label">Devueltos</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Tabs -->
    <div class="devolucion-tabs mb-4">
      <button class="tab-btn" :class="{ active: activeTab === 'articulos' }" @click="activeTab = 'articulos'">
        <Package :size="16" />
        Configuración de Artículos
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'entregas' }" @click="activeTab = 'entregas'; loadSalidas()">
        <ArrowUpRight :size="16" />
        Entregas con Retorno
        <span class="tab-badge" v-if="pendientesCount > 0">{{ pendientesCount }}</span>
      </button>
    </div>

    <!-- Tab 1: Configuración de Artículos -->
    <template v-if="activeTab === 'articulos'">
      <!-- Filters -->
      <div class="card mb-4">
        <div class="card-body" style="padding: var(--space-3) var(--space-4);">
          <div class="flex items-center gap-3">
            <div class="form-input-icon" style="flex: 1;">
              <Search :size="16" />
              <input v-model="search" type="text" class="form-input" placeholder="Buscar artículo por nombre o código..." />
            </div>
            <select v-model="selectedCategoria" class="form-select" style="width: 200px;">
              <option value="">Todas las categorías</option>
              <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
            </select>
            <select v-model="selectedFiltroDevolucion" class="form-select" style="width: 200px;">
              <option value="">Todos</option>
              <option value="si">Requieren devolución</option>
              <option value="no">Sin devolución</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div class="card" v-if="loading">
        <div class="empty-state">
          <p>Cargando artículos...</p>
        </div>
      </div>

      <!-- Table -->
      <div class="card" v-else>
        <div class="card-body" style="padding: 0;">
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 60px;">#</th>
                  <th>Código</th>
                  <th>Artículo</th>
                  <th>Categoría</th>
                  <th>Unidad</th>
                  <th>Almacén</th>
                  <th style="width: 200px; text-align: center;">¿Requiere Devolución?</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(art, i) in filteredArticulos"
                  :key="art.id"
                  class="devolucion-row"
                  :class="{ 'devolucion-activa': art.requiere_devolucion }"
                >
                  <td class="text-muted">{{ i + 1 }}</td>
                  <td class="font-semibold text-primary">{{ art.codigo || '—' }}</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{{ art.nombre }}</span>
                      <span class="badge badge-info" v-if="art.requiere_devolucion" style="font-size: 9px;">
                        <RotateCcw :size="10" /> DEVUELVE
                      </span>
                    </div>
                  </td>
                  <td>{{ art.categoria_nombre }}</td>
                  <td>{{ art.unidad_nombre }}</td>
                  <td class="text-sm">{{ art.almacen_nombre }}</td>
                  <td style="text-align: center;">
                    <div class="switch-container" @click="toggleDevolucion(art)">
                      <div class="switch-track" :class="{ active: art.requiere_devolucion }">
                        <div class="switch-thumb"></div>
                      </div>
                      <span class="switch-label" :class="{ active: art.requiere_devolucion }">
                        {{ art.requiere_devolucion ? 'Sí' : 'No' }}
                      </span>
                    </div>
                  </td>
                </tr>
                <tr v-if="filteredArticulos.length === 0">
                  <td colspan="7" style="text-align: center; padding: var(--space-8);">
                    <div class="empty-state" style="padding: var(--space-6);">
                      <Search :size="40" />
                      <p class="text-muted">No se encontraron artículos con los filtros aplicados</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Tab 2: Entregas con Retorno -->
    <template v-if="activeTab === 'entregas'">
      <!-- Filter for entregas -->
      <div class="card mb-4">
        <div class="card-body" style="padding: var(--space-3) var(--space-4);">
          <div class="flex items-center gap-3">
            <div class="form-input-icon" style="flex: 1;">
              <Search :size="16" />
              <input v-model="searchEntregas" type="text" class="form-input" placeholder="Buscar por artículo, solicitante o código..." />
            </div>
            <select v-model="filtroEstadoEntrega" class="form-select" style="width: 200px;">
              <option value="">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="devuelto">Devueltos</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card" v-if="loadingSalidas">
        <div class="empty-state">
          <p>Cargando entregas...</p>
        </div>
      </div>

      <div class="card" v-else>
        <div class="card-body" style="padding: 0;">
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Código Mov.</th>
                  <th>Fecha</th>
                  <th>Artículo</th>
                  <th>Variante</th>
                  <th>Cant. Entregada</th>
                  <th>Entregado a</th>
                  <th>CI</th>
                  <th>Destino</th>
                  <th>Almacén</th>
                  <th style="text-align: center;">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(s, i) in filteredSalidas" 
                  :key="i" 
                  class="devolucion-row"
                  :class="{ 'devolucion-activa': s.pendiente > 0 }"
                >
                  <td class="font-semibold text-primary">{{ s.codigo }}</td>
                  <td class="text-sm">{{ formatFecha(s.fecha_movimiento) }}</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{{ s.articulo_nombre }}</span>
                      <span class="badge badge-info" style="font-size: 9px;">
                        <RotateCcw :size="10" /> DEVUELVE
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="flex items-center gap-1">
                      <span class="color-dot" :style="{ background: s.codigo_hex }" style="width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
                      {{ s.color_nombre }}
                    </div>
                  </td>
                  <td class="font-semibold text-center">{{ s.cantidad }}</td>
                  <td class="font-medium">{{ s.solicitante_nombre || '—' }}</td>
                  <td class="text-sm">{{ s.solicitante_ci || '—' }}</td>
                  <td class="text-sm">{{ s.destino_procedencia || '—' }}</td>
                  <td class="text-sm">{{ s.almacen_nombre }}</td>
                  <td style="text-align: center;">
                    <span v-if="s.pendiente > 0" class="badge badge-warning" style="font-size: 11px;">
                      ⏳ Pendiente ({{ s.pendiente }})
                    </span>
                    <span v-else class="badge badge-success" style="font-size: 11px;">
                      ✓ Devuelto
                    </span>
                  </td>
                </tr>
                <tr v-if="filteredSalidas.length === 0">
                  <td colspan="10" style="text-align: center; padding: var(--space-8);">
                    <div class="empty-state" style="padding: var(--space-6);">
                      <RotateCcw :size="40" />
                      <p class="text-muted">No hay entregas con los filtros aplicados</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Info -->
    <div class="devolucion-info mt-4">
      <Info :size="16" />
      <span>Los artículos marcados como <strong>"Requiere Devolución"</strong> deberán ser devueltos al almacén después de su uso. Ejemplo: herramientas, equipos de protección, instrumentos. En la pestaña "Entregas con Retorno" se visualizan todas las salidas de estos artículos.</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, Package, RotateCcw, PackageX, Info, ArrowUpRight, CheckCircle } from 'lucide-vue-next'
import { api } from '@/api'

const search = ref('')
const selectedCategoria = ref('')
const selectedFiltroDevolucion = ref('')
const activeTab = ref('articulos')
const loading = ref(true)
const loadingSalidas = ref(false)

const articulos = ref([])
const salidasDevolucion = ref([])

onMounted(async () => {
  await cargarArticulos()
})

async function cargarArticulos() {
  loading.value = true
  try {
    const res = await api.getArticulos()
    articulos.value = res.data.map(a => ({
      ...a,
      requiere_devolucion: !!a.requiere_devolucion
    }))
  } catch (err) {
    console.error('Error cargando artículos:', err)
  } finally {
    loading.value = false
  }
}

async function loadSalidas() {
  loadingSalidas.value = true
  try {
    const res = await api.getSalidasConDevolucion()
    salidasDevolucion.value = res.data
  } catch (err) {
    console.error('Error cargando salidas:', err)
  } finally {
    loadingSalidas.value = false
  }
}

const categorias = computed(() => {
  const cats = new Set(articulos.value.map(a => a.categoria_nombre).filter(Boolean))
  return [...cats].sort()
})

const articulosConDevolucion = computed(() => articulos.value.filter(a => a.requiere_devolucion).length)
const articulosSinDevolucion = computed(() => articulos.value.filter(a => !a.requiere_devolucion).length)

const filteredArticulos = computed(() => {
  return articulos.value.filter(a => {
    const matchSearch = !search.value || a.nombre.toLowerCase().includes(search.value.toLowerCase()) || (a.codigo && a.codigo.toLowerCase().includes(search.value.toLowerCase()))
    const matchCat = !selectedCategoria.value || a.categoria_nombre === selectedCategoria.value
    const matchDevolucion = !selectedFiltroDevolucion.value ||
      (selectedFiltroDevolucion.value === 'si' && a.requiere_devolucion) ||
      (selectedFiltroDevolucion.value === 'no' && !a.requiere_devolucion)
    return matchSearch && matchCat && matchDevolucion
  })
})

const searchEntregas = ref('')
const filtroEstadoEntrega = ref('')

const pendientesCount = computed(() => salidasDevolucion.value.filter(s => s.pendiente > 0).length)

const filteredSalidas = computed(() => {
  return salidasDevolucion.value.filter(s => {
    const matchSearch = !searchEntregas.value || 
      s.articulo_nombre.toLowerCase().includes(searchEntregas.value.toLowerCase()) ||
      (s.solicitante_nombre && s.solicitante_nombre.toLowerCase().includes(searchEntregas.value.toLowerCase())) ||
      s.codigo.toLowerCase().includes(searchEntregas.value.toLowerCase())
    const matchEstado = !filtroEstadoEntrega.value ||
      (filtroEstadoEntrega.value === 'pendiente' && s.pendiente > 0) ||
      (filtroEstadoEntrega.value === 'devuelto' && s.pendiente <= 0)
    return matchSearch && matchEstado
  })
})

async function toggleDevolucion(art) {
  const newValue = !art.requiere_devolucion
  try {
    await api.toggleDevolucion(art.id, newValue)
    art.requiere_devolucion = newValue
  } catch (err) {
    alert('Error al cambiar devolución: ' + err.message)
  }
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
/* Stats */
.devolucion-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}
.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}
.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}
.stat-total .stat-icon {
  background: var(--color-primary-lightest);
  color: var(--color-primary);
}
.stat-devuelve .stat-icon {
  background: var(--color-success-light);
  color: #276749;
}
.stat-no-devuelve .stat-icon {
  background: var(--color-gray-100);
  color: var(--color-gray-500);
}
.stat-info {
  display: flex;
  flex-direction: column;
}
.stat-number {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-gray-800);
  line-height: 1.2;
}
.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
  font-weight: 400;
}

/* Tabs */
.devolucion-tabs {
  display: flex;
  gap: var(--space-1);
  background: var(--color-gray-100);
  border-radius: var(--radius-lg);
  padding: 4px;
}
.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-gray-500);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.tab-btn:hover {
  color: var(--color-gray-700);
}
.tab-btn.active {
  background: var(--color-white);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
  font-weight: 600;
}
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: white;
  font-size: 11px;
  font-weight: 700;
}

/* Switch */
.switch-container {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  user-select: none;
}
.switch-track {
  position: relative;
  width: 44px;
  height: 24px;
  background: var(--color-gray-300);
  border-radius: var(--radius-full);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}
.switch-track.active {
  background: linear-gradient(135deg, #38A169, #2F855A);
  box-shadow: 0 0 12px rgba(56, 161, 105, 0.4);
}
.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: var(--color-white);
  border-radius: var(--radius-full);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.switch-track.active .switch-thumb {
  left: 22px;
}
.switch-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-gray-400);
  min-width: 24px;
  transition: color var(--transition-fast);
}
.switch-label.active {
  color: #276749;
}

/* Devolucion row highlight */
.devolucion-row {
  transition: all var(--transition-fast);
}
.devolucion-row.devolucion-activa {
  background: rgba(56, 161, 105, 0.04);
}
.devolucion-row.devolucion-activa:hover {
  background: rgba(56, 161, 105, 0.08) !important;
}

/* Info banner */
.devolucion-info {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--color-info-light);
  border: 1px solid rgba(43, 108, 176, 0.15);
  border-radius: var(--radius-lg);
  color: #2B6CB0;
  font-size: var(--font-size-sm);
  line-height: 1.5;
}
.devolucion-info svg {
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
