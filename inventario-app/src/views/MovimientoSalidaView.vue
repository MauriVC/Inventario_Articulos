<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <span class="mov-type-badge mov-salida"><ArrowUpFromLine :size="18" /> SALIDA</span>
        <select v-model="selectedAlmacen" class="form-select" style="width: 220px;" @change="loadAlmacenData">
          <option value="">Seleccione un almacén...</option>
          <option v-for="a in almacenes" :key="a.id" :value="a.id">{{ a.nombre }}</option>
        </select>
      </div>
      <span class="text-muted text-sm">Código: <strong style="color: var(--color-danger);">Auto-generado</strong></span>
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
                <input v-model="solicitante.carnet" type="text" class="form-input" placeholder="Buscar por carnet..." @input="solicitante.carnet = solicitante.carnet.replace(/[^0-9]/g, ''); buscarSolicitante()" />
              </div>
              <span class="text-xs text-muted" v-if="solicitanteEncontrado">✓ Solicitante encontrado, datos autocompletados</span>
            </div>
            <div class="form-group">
              <label class="form-label">Nombre Completo *</label>
              <input v-model="solicitante.nombre" type="text" class="form-input" placeholder="Nombre y apellidos" @input="solicitante.nombre = solicitante.nombre.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')" />
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input v-model="solicitante.telefono" type="text" class="form-input" placeholder="Número de teléfono" @input="solicitante.telefono = solicitante.telefono.replace(/[^0-9]/g, '')" />
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
                <span class="datetime-date">{{ currentDate }}</span>
                <span class="datetime-time">{{ currentTime }}</span>
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
        <!-- Mode Toggle: Artículos individuales vs Paquete (Oculto temporalmente) -->
        <div class="mode-toggle mb-4" v-show="false">
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
          <p>Busca y agrega artículos para la salida</p>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="form-actions mt-6">
      <router-link to="/" class="btn btn-secondary">Cancelar</router-link>
      <button class="btn btn-danger btn-lg" :disabled="saving" @click="registrarSalida">
        <ArrowUpFromLine :size="18" />
        {{ saving ? 'Registrando...' : 'Registrar Salida' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Calendar, ArrowUpFromLine, Package, X, Boxes, RotateCcw } from 'lucide-vue-next'
import { api } from '@/api'
import { confirmAction, showError, showWarning, showSuccess } from '@/utils/alerts'

const router = useRouter()

const almacenes = ref([])
const selectedAlmacen = ref('')

const solicitante = ref({ carnet: '', nombre: '', telefono: '' })
const solicitanteEncontrado = ref(false)
const destino = ref('')
const observacion = ref('')
const articuloSearch = ref('')
const mode = ref('articulos')
const selectedPaqueteId = ref('')
const paqueteAplicado = ref(null)
const saving = ref(false)

const items = ref([])
const allArticulos = ref([])
const paquetesDisponibles = ref([])

// Current date/time display
const currentDate = ref('')
const currentTime = ref('')
let timer

onMounted(async () => {
  updateTime()
  timer = setInterval(updateTime, 1000)

  try {
    const resAlm = await api.getAlmacenes()
    almacenes.value = resAlm.data.filter(a => a.estado === 'Activo')
  } catch (error) {
    console.error("Error cargando almacenes:", error)
  }
})

onUnmounted(() => {
  clearInterval(timer)
})

function updateTime() {
  const now = new Date()
  currentDate.value = now.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
  currentTime.value = now.toLocaleTimeString('es-ES')
}

async function loadAlmacenData() {
  if (!selectedAlmacen.value) {
    allArticulos.value = []
    paquetesDisponibles.value = []
    items.value = []
    return
  }

  try {
    const resArt = await api.getArticulos({ almacen_id: selectedAlmacen.value })
    const flatVariantes = []
    for (const art of resArt.data) {
      if (art.estado !== 'Activo') continue
      for (const v of art.variantes) {
        if (v.estado !== 'Activo') continue
        flatVariantes.push({
          articulo_item_id: v.id,
          nombre: art.nombre,
          colorNombre: v.color_nombre,
          hex: v.codigo_hex,
          stock: v.stock,
          requiereDevolucion: art.requiere_devolucion === 1
        })
      }
    }
    allArticulos.value = flatVariantes

    const resPaq = await api.getPaquetes({ almacen_id: selectedAlmacen.value })
    paquetesDisponibles.value = resPaq.data.filter(p => p.estado === 'Activo')
  } catch (error) {
    console.error("Error cargando artículos o paquetes:", error)
  }
}

const searchResults = computed(() => {
  if (!articuloSearch.value) return []
  return allArticulos.value.filter(a => a.nombre.toLowerCase().includes(articuloSearch.value.toLowerCase()))
})

const itemsConDevolucion = computed(() => items.value.filter(i => i.requiereDevolucion))

let debounceTimeout;
async function buscarSolicitante() {
  clearTimeout(debounceTimeout);
  solicitanteEncontrado.value = false;
  
  const ci = solicitante.value.carnet.trim();
  if (ci.length < 4) return;

  debounceTimeout = setTimeout(async () => {
    try {
      const res = await api.getSolicitanteByCi(ci);
      if (res.data) {
        solicitante.value.nombre = res.data.nombre || '';
        solicitante.value.telefono = res.data.telefono || '';
        solicitanteEncontrado.value = true;
      }
    } catch (err) {
      // Ignorar 404 (no encontrado)
      solicitanteEncontrado.value = false;
    }
  }, 500); // medio segundo de espera
}

function addArticulo(a) {
  const existing = items.value.find(i => i.articulo_item_id === a.articulo_item_id)
  if (existing) {
    if (existing.cantidad < a.stock) {
      existing.cantidad++
    }
  } else {
    items.value.push({
      articulo_item_id: a.articulo_item_id,
      nombre: a.nombre, colorNombre: a.colorNombre, hex: a.hex,
      stockDisponible: a.stock, cantidad: 1, requiereDevolucion: a.requiereDevolucion || false
    })
  }
  articuloSearch.value = ''
}

function aplicarPaquete() {
  const paq = paquetesDisponibles.value.find(p => p.id === Number(selectedPaqueteId.value))
  if (!paq) return
  paqueteAplicado.value = paq
  
  items.value = paq.items.map(item => ({
    articulo_item_id: item.articulo_item_id,
    nombre: item.articulo_nombre,
    colorNombre: item.color_nombre,
    hex: item.codigo_hex,
    stockDisponible: item.stock,
    cantidad: Math.min(item.cantidad, item.stock),
    requiereDevolucion: item.requiere_devolucion === 1
  }))
}

function limpiarPaquete() {
  paqueteAplicado.value = null
  selectedPaqueteId.value = ''
  items.value = []
}

async function registrarSalida() {
  if (!selectedAlmacen.value) {
    showWarning("Primero debe seleccionar un almacén para registrar el movimiento.")
    return
  }
  if (items.value.length === 0) {
    showWarning("Debe agregar al menos un artículo para la salida.")
    return
  }
  if (!solicitante.value.carnet || !solicitante.value.nombre || !destino.value) {
    showWarning("Por favor, complete los campos obligatorios del solicitante y destino.")
    return
  }

  saving.value = true
  try {
    const payload = {
      tipo: 'SALIDA',
      almacen_id: Number(selectedAlmacen.value),
      paquete_id: paqueteAplicado.value ? paqueteAplicado.value.id : null,
      solicitante_ci: solicitante.value.carnet,
      solicitante_nombre: solicitante.value.nombre,
      solicitante_telefono: solicitante.value.telefono,
      destino_procedencia: destino.value,
      observacion: observacion.value,
      detalles: items.value.map(i => ({
        articulo_item_id: i.articulo_item_id,
        cantidad: i.cantidad
      }))
    }

    await api.createMovimiento(payload)
    
    // Redirect to historial or success page
    showSuccess("Salida registrada exitosamente")
    router.push('/historial')
  } catch (error) {
    showError("Error al registrar la salida: " + error.message)
  } finally {
    saving.value = false
  }
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
