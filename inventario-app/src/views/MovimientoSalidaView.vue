<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <span class="mov-type-badge mov-salida"><ArrowUpFromLine :size="18" /> SALIDA</span>
        <select class="form-select" style="width: 220px;">
          <option>Almacén Central</option>
          <option>Almacén Norte</option>
          <option>Almacén Laboratorio</option>
        </select>
      </div>
      <span class="text-muted text-sm">Código: <strong class="text-primary">SAL-2026-0013</strong> (Auto-generado)</span>
    </div>

    <div class="mov-form-grid">
      <!-- Solicitante Section -->
      <div class="card">
        <div class="card-header"><h3>Datos del Solicitante</h3></div>
        <div class="card-body">
          <div class="flex flex-col gap-4">
            <div class="form-group">
              <label class="form-label">Carnet de Identidad *</label>
              <div class="form-input-icon">
                <Search :size="16" />
                <input v-model="solicitante.carnet" type="text" class="form-input" placeholder="Buscar por carnet..." @input="buscarSolicitante" />
              </div>
              <span class="text-xs text-muted" v-if="solicitanteEncontrado">✓ Solicitante encontrado, datos autocompletados</span>
            </div>
            <div class="form-group">
              <label class="form-label">Nombre Completo *</label>
              <input v-model="solicitante.nombre" type="text" class="form-input" placeholder="Nombre y apellidos" />
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input v-model="solicitante.telefono" type="text" class="form-input" placeholder="Número de teléfono" />
            </div>
            <div class="form-group">
              <label class="form-label">Destino de los materiales *</label>
              <input v-model="destino" type="text" class="form-input" placeholder="Ej: Aula 3A, Taller de Mecánica..." />
            </div>
          </div>
        </div>
      </div>

      <!-- Date & Observations -->
      <div class="flex flex-col gap-5">
        <div class="card">
          <div class="card-header"><h3>Fecha y Hora</h3></div>
          <div class="card-body">
            <div class="datetime-display">
              <Calendar :size="20" />
              <div>
                <span class="datetime-date">27 de Mayo, 2026</span>
                <span class="datetime-time">23:21:00</span>
              </div>
            </div>
          </div>
        </div>
        <div class="card flex-1">
          <div class="card-header"><h3>Observaciones</h3></div>
          <div class="card-body">
            <textarea v-model="observacion" class="form-input" placeholder="Notas adicionales sobre esta salida..." style="min-height: 120px;"></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- Articles Section -->
    <div class="card mt-6">
      <div class="card-header">
        <h3>Artículos a Retirar</h3>
        <span class="badge badge-primary">{{ items.length }} artículo(s)</span>
      </div>
      <div class="card-body">
        <!-- Mode Toggle: Artículos individuales vs Paquete -->
        <div class="mode-toggle mb-4">
          <button class="mode-btn" :class="{ active: mode === 'articulos' }" @click="mode = 'articulos'">
            <Package :size="16" /> Artículos individuales
          </button>
          <button class="mode-btn" :class="{ active: mode === 'paquete' }" @click="mode = 'paquete'">
            <Boxes :size="16" /> Desde Paquete
          </button>
        </div>

        <!-- Individual: Search & Add -->
        <div v-if="mode === 'articulos'">
          <div class="add-article-bar mb-4">
            <div class="form-input-icon flex-1">
              <Search :size="16" />
              <input type="text" class="form-input" placeholder="Buscar artículo por nombre o código..." v-model="articuloSearch" />
            </div>
          </div>
          <div class="search-results" v-if="articuloSearch.length > 0 && searchResults.length > 0">
            <div class="search-result-item" v-for="a in searchResults" :key="a.id" @click="addArticulo(a)">
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ a.nombre }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="color-dot" :style="{ background: a.hex, width: '12px', height: '12px' }"></span>
                <span class="text-sm text-muted">{{ a.colorNombre }} — Stock: {{ a.stock }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Paquete: Select -->
        <div v-if="mode === 'paquete'">
          <div class="paquete-picker mb-4">
            <label class="form-label mb-2">Seleccionar Paquete</label>
            <select v-model="selectedPaqueteId" class="form-select" @change="aplicarPaquete">
              <option value="">Elegir paquete...</option>
              <option v-for="p in paquetesDisponibles" :key="p.id" :value="p.id">
                {{ p.nombre }} ({{ p.categoria }}) — {{ p.items.length }} artículos
              </option>
            </select>
          </div>
          <!-- Paquete Applied Info -->
          <div class="paquete-applied" v-if="paqueteAplicado">
            <div class="paquete-applied-header">
              <div class="flex items-center gap-2">
                <Boxes :size="18" />
                <span class="font-semibold">{{ paqueteAplicado.nombre }}</span>
                <span class="badge" :class="paqueteAplicado.categoria === 'Mixta' ? 'badge-warning' : 'badge-primary'" style="font-size: 10px;">{{ paqueteAplicado.categoria }}</span>
              </div>
              <button class="btn btn-ghost btn-sm" @click="limpiarPaquete" style="color: var(--color-danger);">
                <X :size="14" /> Quitar paquete
              </button>
            </div>
            <!-- Devolución warnings -->
            <div class="devolucion-alert" v-if="itemsConDevolucion.length > 0">
              <RotateCcw :size="14" />
              <span><strong>{{ itemsConDevolucion.length }} artículo(s)</strong> de este paquete requieren devolución</span>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div class="table-wrapper" v-if="items.length > 0">
          <table class="table">
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Variante / Color</th>
                <th>Stock Disponible</th>
                <th>Cantidad a Retirar</th>
                <th>Devolución</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in items" :key="i" :class="{ 'devolucion-row': item.requiereDevolucion }">
                <td>
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{{ item.nombre }}</span>
                  </div>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <span class="color-dot" :style="{ background: item.hex, width: '14px', height: '14px' }"></span>
                    {{ item.colorNombre }}
                  </div>
                </td>
                <td class="text-center">
                  <span class="badge badge-info">{{ item.stockDisponible }}</span>
                </td>
                <td style="width: 160px;">
                  <input v-model.number="item.cantidad" type="number" min="1" :max="item.stockDisponible" class="form-input" style="width: 100px; text-align: center;" />
                </td>
                <td class="text-center">
                  <span v-if="item.requiereDevolucion" class="badge badge-devolucion">
                    <RotateCcw :size="10" /> DEVUELVE
                  </span>
                  <span v-else class="text-xs text-muted">—</span>
                </td>
                <td>
                  <button class="btn btn-ghost btn-icon" @click="items.splice(i, 1)" v-if="!paqueteAplicado">
                    <X :size="16" style="color: var(--color-danger);" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="empty-state" v-else>
          <Package :size="48" />
          <p>Busca artículos o selecciona un paquete para la salida</p>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="form-actions mt-6">
      <router-link to="/" class="btn btn-secondary">Cancelar</router-link>
      <button class="btn btn-danger btn-lg" :disabled="items.length === 0">
        <ArrowUpFromLine :size="18" />
        Registrar Salida
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search, Calendar, ArrowUpFromLine, Package, X, Boxes, RotateCcw } from 'lucide-vue-next'

const solicitante = ref({ carnet: '', nombre: '', telefono: '' })
const solicitanteEncontrado = ref(false)
const destino = ref('')
const observacion = ref('')
const articuloSearch = ref('')
const mode = ref('articulos')
const selectedPaqueteId = ref('')
const paqueteAplicado = ref(null)

const items = ref([
  { nombre: 'Cuaderno 100h Tapa Dura', colorNombre: 'Azul', hex: '#007bff', stockDisponible: 200, cantidad: 10, requiereDevolucion: false },
  { nombre: 'Cuaderno 100h Tapa Dura', colorNombre: 'Rojo', hex: '#dc3545', stockDisponible: 150, cantidad: 5, requiereDevolucion: false },
  { nombre: 'Folder Oficio', colorNombre: 'Azul', hex: '#007bff', stockDisponible: 50, cantidad: 20, requiereDevolucion: false }
])

const allArticulos = ref([
  { id: 1, nombre: 'Pintura Latex 1L', colorNombre: 'Blanco', hex: '#ffffff', stock: 50, requiereDevolucion: false },
  { id: 2, nombre: 'Fierro Corrugado 3/8', colorNombre: 'S/N', hex: '#e9ecef', stock: 500, requiereDevolucion: false },
  { id: 3, nombre: 'Resma Papel Bond Carta', colorNombre: 'S/N', hex: '#e9ecef', stock: 120, requiereDevolucion: false },
  { id: 4, nombre: 'Martillo Carpintero', colorNombre: 'Mango Rojo', hex: '#dc3545', stock: 15, requiereDevolucion: true },
  { id: 5, nombre: 'Destornillador Phillips', colorNombre: 'S/N', hex: '#e9ecef', stock: 40, requiereDevolucion: true },
  { id: 6, nombre: 'Cinta Métrica 5m', colorNombre: 'S/N', hex: '#e9ecef', stock: 25, requiereDevolucion: true },
  { id: 7, nombre: 'Casco de Seguridad', colorNombre: 'S/N', hex: '#e9ecef', stock: 50, requiereDevolucion: true },
  { id: 8, nombre: 'Lápiz HB', colorNombre: 'S/N', hex: '#e9ecef', stock: 500, requiereDevolucion: false }
])

const paquetesDisponibles = ref([
  {
    id: 1, nombre: 'Paquete Cuadernos', categoria: 'Cuadernos',
    items: [
      { nombre: 'Cuaderno 100h Tapa Dura', colorNombre: 'Azul', hex: '#007bff', stockDisponible: 200, cantidad: 10, requiereDevolucion: false },
      { nombre: 'Cuaderno 100h Tapa Dura', colorNombre: 'Rojo', hex: '#dc3545', stockDisponible: 150, cantidad: 10, requiereDevolucion: false }
    ]
  },
  {
    id: 2, nombre: 'Paquete Carpintería', categoria: 'Mixta',
    items: [
      { nombre: 'Martillo Carpintero', colorNombre: 'Mango Rojo', hex: '#dc3545', stockDisponible: 15, cantidad: 1, requiereDevolucion: true },
      { nombre: 'Clavos 2 pulgadas', colorNombre: 'S/N', hex: '#e9ecef', stockDisponible: 300, cantidad: 50, requiereDevolucion: false },
      { nombre: 'Cuaderno 100h Tapa Dura', colorNombre: 'Azul', hex: '#007bff', stockDisponible: 200, cantidad: 1, requiereDevolucion: false },
      { nombre: 'Lápiz HB', colorNombre: 'S/N', hex: '#e9ecef', stockDisponible: 500, cantidad: 1, requiereDevolucion: false },
      { nombre: 'Cinta Métrica 5m', colorNombre: 'S/N', hex: '#e9ecef', stockDisponible: 25, cantidad: 1, requiereDevolucion: true }
    ]
  },
  {
    id: 3, nombre: 'Paquete EPP Básico', categoria: 'EPP',
    items: [
      { nombre: 'Casco de Seguridad', colorNombre: 'S/N', hex: '#e9ecef', stockDisponible: 50, cantidad: 1, requiereDevolucion: true }
    ]
  }
])

const searchResults = computed(() => {
  if (!articuloSearch.value) return []
  return allArticulos.value.filter(a => a.nombre.toLowerCase().includes(articuloSearch.value.toLowerCase()))
})

const itemsConDevolucion = computed(() => items.value.filter(i => i.requiereDevolucion))

function buscarSolicitante() {
  if (solicitante.value.carnet === '12345678') {
    solicitante.value.nombre = 'Carlos Eduardo Pérez Mendoza'
    solicitante.value.telefono = '70012345'
    solicitanteEncontrado.value = true
  } else {
    solicitanteEncontrado.value = false
  }
}

function addArticulo(a) {
  items.value.push({
    nombre: a.nombre, colorNombre: a.colorNombre, hex: a.hex,
    stockDisponible: a.stock, cantidad: 1, requiereDevolucion: a.requiereDevolucion || false
  })
  articuloSearch.value = ''
}

function aplicarPaquete() {
  const paq = paquetesDisponibles.value.find(p => p.id === Number(selectedPaqueteId.value))
  if (!paq) return
  paqueteAplicado.value = paq
  items.value = paq.items.map(item => ({ ...item }))
}

function limpiarPaquete() {
  paqueteAplicado.value = null
  selectedPaqueteId.value = ''
  items.value = []
}
</script>

<style scoped>
.mov-type-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-size-base);
  letter-spacing: 0.03em;
}
.mov-salida {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger-light);
}

.mov-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
}

.datetime-display {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-primary-lightest);
  border-radius: var(--radius-lg);
  color: var(--color-primary-dark);
}
.datetime-display div {
  display: flex;
  flex-direction: column;
}
.datetime-date {
  font-weight: 600;
  font-size: var(--font-size-md);
}
.datetime-time {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
}

/* Mode Toggle */
.mode-toggle {
  display: flex;
  gap: 0;
  background: var(--color-gray-100);
  border-radius: var(--radius-lg);
  padding: 3px;
  width: fit-content;
}
.mode-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-gray-500);
  transition: all var(--transition-fast);
  cursor: pointer;
  border: none;
  background: none;
}
.mode-btn.active {
  background: var(--color-white);
  color: var(--color-gray-800);
  box-shadow: var(--shadow-sm);
  font-weight: 600;
}
.mode-btn:hover:not(.active) {
  color: var(--color-gray-700);
}

.add-article-bar {
  display: flex;
  gap: var(--space-3);
}

.search-results {
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  margin-top: -12px;
  margin-bottom: var(--space-4);
  max-height: 200px;
  overflow-y: auto;
}
.search-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.search-result-item:hover {
  background: var(--color-primary-lightest);
}
.search-result-item + .search-result-item {
  border-top: 1px solid var(--color-gray-100);
}

/* Paquete picker */
.paquete-picker {
  max-width: 480px;
}
.paquete-applied {
  margin-bottom: var(--space-4);
}
.paquete-applied-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: rgba(237, 137, 54, 0.06);
  border: 1px solid var(--color-warning-light);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-2);
}

/* Devolución alert */
.devolucion-alert {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(56, 161, 105, 0.08);
  border: 1px solid rgba(56, 161, 105, 0.2);
  border-radius: var(--radius-md);
  color: #276749;
  font-size: var(--font-size-sm);
}

/* Devolución badge */
.badge-devolucion {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  background: rgba(56, 161, 105, 0.12);
  color: #276749;
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

/* Devolución row */
.devolucion-row {
  background: rgba(56, 161, 105, 0.03);
}
.devolucion-row:hover {
  background: rgba(56, 161, 105, 0.07) !important;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) 0;
}

.empty-state {
  padding: var(--space-8);
}
.empty-state svg {
  width: 48px;
  height: 48px;
}
</style>
