<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <span class="mov-type-badge mov-baja"><PackageMinus :size="18" /> BAJA DE ARTÍCULOS</span>
        <select v-model="almacenId" class="form-select" style="width: 220px;">
          <option value="1">Almacén Central</option>
          <option value="2">Almacén Norte</option>
          <option value="3">Almacén Laboratorio</option>
        </select>
      </div>
      <span class="text-muted text-sm">Código: <strong class="text-warning-dark">BAJ-2026-0004</strong> (Auto-generado)</span>
    </div>

    <div class="mov-form-grid">
      <!-- Responsible + Motive -->
      <div class="card">
        <div class="card-header"><h3>Datos de la Baja</h3></div>
        <div class="card-body">
          <div class="flex flex-col gap-4">
            <div class="form-group">
              <label class="form-label">Responsable de la Baja *</label>
              <input type="text" class="form-input" value="Admin Sistema" disabled />
              <span class="text-xs text-muted">Se registra automáticamente con el usuario de la sesión activa</span>
            </div>
            <div class="form-group">
              <label class="form-label">Motivo de la Baja *</label>
              <select v-model="motivo" class="form-select">
                <option value="">Selecciona un motivo...</option>
                <option value="Dañado">Dañado</option>
                <option value="Vencido">Vencido</option>
                <option value="Pérdida">Pérdida</option>
                <option value="Consumo">Consumo (no retornable)</option>
                <option value="Obsoleto">Obsoleto</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div class="form-group" v-if="motivo === 'Otro'">
              <label class="form-label">Especificar motivo *</label>
              <input v-model="motivoOtro" type="text" class="form-input" placeholder="Describir motivo de la baja..." />
            </div>
          </div>
        </div>
      </div>

      <!-- Date & Observations -->
      <div class="flex flex-col gap-5">
        <div class="card">
          <div class="card-header"><h3>Fecha y Hora</h3></div>
          <div class="card-body">
            <div class="datetime-display baja">
              <Calendar :size="20" />
              <div>
                <span class="datetime-date">27 de Mayo, 2026</span>
                <span class="datetime-time">21:32:00</span>
              </div>
            </div>
          </div>
        </div>
        <div class="card flex-1">
          <div class="card-header"><h3>Observaciones</h3></div>
          <div class="card-body">
            <textarea v-model="observacion" class="form-input" placeholder="Detalle del estado de los materiales, razón específica de la baja..." style="min-height: 120px;"></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- Articles Section -->
    <div class="card mt-6">
      <div class="card-header">
        <h3>Artículos a Dar de Baja</h3>
        <span class="badge badge-warning">{{ items.length }} artículo(s)</span>
      </div>
      <div class="card-body">
        <!-- Search -->
        <div class="add-article-bar mb-4">
          <div class="form-input-icon flex-1">
            <Search :size="16" />
            <input type="text" class="form-input" placeholder="Buscar artículo por nombre o código..." v-model="articuloSearch" />
          </div>
        </div>

        <!-- Search Results -->
        <div class="search-results" v-if="articuloSearch.length > 0 && searchResults.length > 0">
          <div class="search-result-item" v-for="a in searchResults" :key="a.id" @click="addArticulo(a)">
            <div class="flex items-center gap-2">
              <component :is="a.esPaquete ? Package2 : Package" :size="16" :style="{ color: a.esPaquete ? 'var(--color-warning)' : 'var(--color-gray-400)' }" />
              <span class="font-medium">{{ a.nombre }}</span>
              <span class="badge badge-info" v-if="a.esPaquete" style="font-size: 10px;">PAQUETE</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="color-dot" :style="{ background: a.hex, width: '12px', height: '12px' }"></span>
              <span class="text-sm text-muted">{{ a.colorNombre }} — Stock: {{ a.stock }}</span>
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
                <th>Cantidad a Dar de Baja</th>
                <th>Motivo Individual</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(item, i) in items" :key="i">
                <tr :class="{ 'paquete-row': item.esPaquete }">
                  <td>
                    <div class="flex items-center gap-2">
                      <component :is="item.esPaquete ? Package2 : Package" :size="16" :style="{ color: item.esPaquete ? 'var(--color-warning)' : 'var(--color-gray-400)' }" />
                      <span class="font-medium">{{ item.nombre }}</span>
                      <span class="badge badge-warning" v-if="item.esPaquete" style="font-size: 10px;">PAQUETE</span>
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
                  <td style="width: 150px;">
                    <input v-model.number="item.cantidad" type="number" min="1" :max="item.stockDisponible" class="form-input" style="width: 100px; text-align: center;" />
                  </td>
                  <td style="width: 180px;">
                    <select v-model="item.motivoIndividual" class="form-select" style="font-size: 13px;">
                      <option value="">Usar motivo gral.</option>
                      <option value="Dañado">Dañado</option>
                      <option value="Vencido">Vencido</option>
                      <option value="Pérdida">Pérdida</option>
                      <option value="Consumo">Consumo</option>
                    </select>
                  </td>
                  <td>
                    <button class="btn btn-ghost btn-icon" @click="items.splice(i, 1)">
                      <X :size="16" style="color: var(--color-danger);" />
                    </button>
                  </td>
                </tr>
                <!-- Package components breakdown -->
                <tr v-if="item.esPaquete && item.componentes" class="componentes-row">
                  <td colspan="6">
                    <div class="componentes-detail">
                      <span class="componentes-label">
                        <AlertTriangle :size="14" />
                        Al dar de baja {{ item.cantidad }} paquete(s), se descontará de cada componente:
                      </span>
                      <div class="componentes-list">
                        <div class="componente-item" v-for="c in item.componentes" :key="c.nombre">
                          <span class="color-dot" :style="{ background: c.hex, width: '10px', height: '10px' }"></span>
                          <span>{{ c.nombre }} ({{ c.color }})</span>
                          <span class="font-semibold">×{{ c.cantPorPaquete * item.cantidad }}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Empty state -->
        <div class="empty-state" v-else>
          <PackageMinus :size="48" />
          <p>Busca y agrega los artículos que deseas dar de baja</p>
        </div>
      </div>
    </div>

    <!-- Summary + Actions -->
    <div class="baja-summary mt-6" v-if="items.length > 0">
      <div class="baja-summary-info">
        <AlertTriangle :size="20" />
        <div>
          <strong>Atención:</strong> Esta acción reducirá permanentemente el stock de los artículos seleccionados.
          El movimiento se registrará en el historial como <span class="badge badge-warning">BAJA</span> y no podrá ser revertido automáticamente.
        </div>
      </div>
    </div>

    <div class="form-actions mt-4">
      <router-link to="/" class="btn btn-secondary">Cancelar</router-link>
      <button class="btn btn-warning btn-lg" :disabled="items.length === 0 || !motivo">
        <PackageMinus :size="18" />
        Registrar Baja
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search, Calendar, Package, X, PackageMinus, AlertTriangle } from 'lucide-vue-next'

// Use Package as Package2 alias for the package icon
const Package2 = Package

const almacenId = ref('1')
const motivo = ref('')
const motivoOtro = ref('')
const observacion = ref('')
const articuloSearch = ref('')

const items = ref([
  { nombre: 'Cuaderno 100h Tapa Dura', colorNombre: 'Azul', hex: '#007bff', stockDisponible: 200, cantidad: 5, motivoIndividual: '', esPaquete: false, componentes: null },
  { nombre: 'Pintura Latex 1L', colorNombre: 'Blanco', hex: '#ffffff', stockDisponible: 50, cantidad: 2, motivoIndividual: 'Vencido', esPaquete: false, componentes: null },
  { nombre: 'Paquete Escolar Básico', colorNombre: 'S/N', hex: '#e9ecef', stockDisponible: 15, cantidad: 1, motivoIndividual: '', esPaquete: true,
    componentes: [
      { nombre: 'Cuaderno 100h', color: 'Azul', hex: '#007bff', cantPorPaquete: 5 },
      { nombre: 'Folder Oficio', color: 'Rojo', hex: '#dc3545', cantPorPaquete: 3 },
      { nombre: 'Resma Papel Bond', color: 'S/N', hex: '#e9ecef', cantPorPaquete: 1 }
    ]
  }
])

const allArticulos = ref([
  { id: 1, nombre: 'Martillo Carpintero', colorNombre: 'Mango Rojo', hex: '#dc3545', stock: 15, esPaquete: false },
  { id: 2, nombre: 'Fierro Corrugado 3/8', colorNombre: 'S/N', hex: '#e9ecef', stock: 500, esPaquete: false },
  { id: 3, nombre: 'Cemento Portland 50kg', colorNombre: 'S/N', hex: '#e9ecef', stock: 80, esPaquete: false },
  { id: 4, nombre: 'Paquete Limpieza', colorNombre: 'S/N', hex: '#e9ecef', stock: 8, esPaquete: true }
])

const searchResults = computed(() => {
  if (!articuloSearch.value) return []
  return allArticulos.value.filter(a => a.nombre.toLowerCase().includes(articuloSearch.value.toLowerCase()))
})

function addArticulo(a) {
  items.value.push({
    nombre: a.nombre, colorNombre: a.colorNombre, hex: a.hex,
    stockDisponible: a.stock, cantidad: 1, motivoIndividual: '',
    esPaquete: a.esPaquete,
    componentes: a.esPaquete ? [{ nombre: 'Componente ejemplo', color: 'S/N', hex: '#e9ecef', cantPorPaquete: 2 }] : null
  })
  articuloSearch.value = ''
}
</script>

<style scoped>
.mov-type-badge {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-4); border-radius: var(--radius-full);
  font-weight: 700; font-size: var(--font-size-base); letter-spacing: 0.03em;
}
.mov-baja {
  background: var(--color-warning-bg); color: var(--color-warning);
  border: 1px solid var(--color-warning-light);
}
.text-warning-dark { color: #b7791f; }

.mov-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); }

.datetime-display {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3); border-radius: var(--radius-lg);
}
.datetime-display.baja { background: var(--color-warning-bg); color: #975a16; }
.datetime-display div { display: flex; flex-direction: column; }
.datetime-date { font-weight: 600; font-size: var(--font-size-md); }
.datetime-time { font-size: var(--font-size-sm); opacity: 0.8; }

.add-article-bar { display: flex; gap: var(--space-3); }
.search-results {
  background: var(--color-white); border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md); box-shadow: var(--shadow-lg);
  margin-top: -12px; margin-bottom: var(--space-4); max-height: 200px; overflow-y: auto;
}
.search-result-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-3) var(--space-4); cursor: pointer; transition: background var(--transition-fast);
}
.search-result-item:hover { background: var(--color-warning-bg); }
.search-result-item + .search-result-item { border-top: 1px solid var(--color-gray-100); }

.paquete-row { background: rgba(237, 137, 54, 0.04); }

.componentes-row td { padding: 0 !important; background: rgba(237, 137, 54, 0.06); }
.componentes-detail {
  padding: var(--space-3) var(--space-6);
}
.componentes-label {
  display: flex; align-items: center; gap: var(--space-2);
  font-size: var(--font-size-xs); color: #b7791f; font-weight: 500; margin-bottom: var(--space-2);
}
.componentes-list {
  display: flex; flex-wrap: wrap; gap: var(--space-2);
}
.componente-item {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background: var(--color-white); border: 1px solid var(--color-warning-light);
  border-radius: var(--radius-full); font-size: var(--font-size-xs);
}

.baja-summary {
  padding: var(--space-4);
  background: var(--color-warning-bg);
  border: 1px solid var(--color-warning-light);
  border-radius: var(--radius-lg);
}
.baja-summary-info {
  display: flex; align-items: flex-start; gap: var(--space-3);
  font-size: var(--font-size-sm); color: #975a16;
}

.form-actions {
  display: flex; justify-content: flex-end; gap: var(--space-3); padding: var(--space-4) 0;
}
.empty-state { padding: var(--space-8); }
.empty-state svg { width: 48px; height: 48px; }
</style>
