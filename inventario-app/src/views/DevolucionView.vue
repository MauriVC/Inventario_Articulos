<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <p class="text-muted">Define qué artículos requieren devolución después de ser entregados</p>
    </div>

    <!-- Stats Cards -->
    <div class="devolucion-stats mb-6">
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
    </div>

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

    <!-- Table -->
    <div class="card">
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
                <th style="width: 200px; text-align: center;">¿Requiere Devolución?</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(art, i) in filteredArticulos"
                :key="art.id"
                class="devolucion-row"
                :class="{ 'devolucion-activa': art.requiereDevolucion }"
              >
                <td class="text-muted">{{ i + 1 }}</td>
                <td class="font-semibold text-primary">{{ art.codigo }}</td>
                <td>
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{{ art.nombre }}</span>
                    <span class="badge badge-info" v-if="art.requiereDevolucion" style="font-size: 9px;">
                      <RotateCcw :size="10" /> DEVUELVE
                    </span>
                  </div>
                </td>
                <td>{{ art.categoria }}</td>
                <td>{{ art.unidad }}</td>
                <td style="text-align: center;">
                  <div class="switch-container" @click="toggleDevolucion(art)">
                    <div class="switch-track" :class="{ active: art.requiereDevolucion }">
                      <div class="switch-thumb"></div>
                    </div>
                    <span class="switch-label" :class="{ active: art.requiereDevolucion }">
                      {{ art.requiereDevolucion ? 'Sí' : 'No' }}
                    </span>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredArticulos.length === 0">
                <td colspan="6" style="text-align: center; padding: var(--space-8);">
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

    <!-- Info -->
    <div class="devolucion-info mt-4">
      <Info :size="16" />
      <span>Los artículos marcados como <strong>"Requiere Devolución"</strong> deberán ser devueltos al almacén después de su uso. Ejemplo: herramientas, equipos de protección, instrumentos.</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search, Package, RotateCcw, PackageX, Info } from 'lucide-vue-next'

const search = ref('')
const selectedCategoria = ref('')
const selectedFiltroDevolucion = ref('')

const categorias = ref(['Cuadernos', 'Hojas y Papelería', 'Pinturas', 'Herramientas', 'Mat. Construcción', 'EPP'])

const articulos = ref([
  { id: 1, codigo: 'CUA-001', nombre: 'Cuaderno 100h Tapa Dura', categoria: 'Cuadernos', unidad: 'Unidad', requiereDevolucion: false },
  { id: 2, codigo: 'CUA-002', nombre: 'Cuaderno 50h Económico', categoria: 'Cuadernos', unidad: 'Unidad', requiereDevolucion: false },
  { id: 3, codigo: 'PIN-001', nombre: 'Pintura Latex 1L', categoria: 'Pinturas', unidad: 'Litro', requiereDevolucion: false },
  { id: 4, codigo: 'HER-001', nombre: 'Martillo Carpintero', categoria: 'Herramientas', unidad: 'Unidad', requiereDevolucion: true },
  { id: 5, codigo: 'FIE-001', nombre: 'Fierro Corrugado 3/8', categoria: 'Mat. Construcción', unidad: 'Metro', requiereDevolucion: false },
  { id: 6, codigo: 'FOL-001', nombre: 'Folder Oficio', categoria: 'Hojas y Papelería', unidad: 'Unidad', requiereDevolucion: false },
  { id: 7, codigo: 'PAQ-001', nombre: 'Paquete Escolar Básico', categoria: 'Cuadernos', unidad: 'Paquete', requiereDevolucion: false },
  { id: 8, codigo: 'HOJ-001', nombre: 'Resma Papel Bond Carta', categoria: 'Hojas y Papelería', unidad: 'Resma', requiereDevolucion: false },
  { id: 9, codigo: 'HER-002', nombre: 'Destornillador Phillips', categoria: 'Herramientas', unidad: 'Unidad', requiereDevolucion: true },
  { id: 10, codigo: 'HER-003', nombre: 'Taladro Eléctrico', categoria: 'Herramientas', unidad: 'Unidad', requiereDevolucion: true },
  { id: 11, codigo: 'EPP-001', nombre: 'Casco de Seguridad', categoria: 'EPP', unidad: 'Unidad', requiereDevolucion: true },
  { id: 12, codigo: 'EPP-002', nombre: 'Guantes de Trabajo', categoria: 'EPP', unidad: 'Unidad', requiereDevolucion: true },
  { id: 13, codigo: 'HER-004', nombre: 'Sierra Circular', categoria: 'Herramientas', unidad: 'Unidad', requiereDevolucion: true },
  { id: 14, codigo: 'PIN-002', nombre: 'Pintura Esmalte Spray', categoria: 'Pinturas', unidad: 'Unidad', requiereDevolucion: false },
  { id: 15, codigo: 'MAT-001', nombre: 'Cemento Portland 50kg', categoria: 'Mat. Construcción', unidad: 'Kilogramo', requiereDevolucion: false },
  { id: 16, codigo: 'EPP-003', nombre: 'Chaleco Reflectivo', categoria: 'EPP', unidad: 'Unidad', requiereDevolucion: true }
])

const articulosConDevolucion = computed(() => articulos.value.filter(a => a.requiereDevolucion).length)
const articulosSinDevolucion = computed(() => articulos.value.filter(a => !a.requiereDevolucion).length)

const filteredArticulos = computed(() => {
  return articulos.value.filter(a => {
    const matchSearch = !search.value || a.nombre.toLowerCase().includes(search.value.toLowerCase()) || a.codigo.toLowerCase().includes(search.value.toLowerCase())
    const matchCat = !selectedCategoria.value || a.categoria === selectedCategoria.value
    const matchDevolucion = !selectedFiltroDevolucion.value ||
      (selectedFiltroDevolucion.value === 'si' && a.requiereDevolucion) ||
      (selectedFiltroDevolucion.value === 'no' && !a.requiereDevolucion)
    return matchSearch && matchCat && matchDevolucion
  })
})

function toggleDevolucion(art) {
  art.requiereDevolucion = !art.requiereDevolucion
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
