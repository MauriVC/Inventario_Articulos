<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <span class="mov-type-badge mov-entrada"><ArrowDownToLine :size="18" /> ENTRADA</span>
        <select v-model="selectedAlmacen" class="form-select" style="width: 220px;" @change="loadAlmacenData">
          <option value="">Seleccione un almacén...</option>
          <option v-for="a in almacenes" :key="a.id" :value="a.id">{{ a.nombre }}</option>
        </select>
      </div>
      <span class="text-muted text-sm">Código: <strong style="color: var(--color-success);">Auto-generado</strong></span>
    </div>

    <!-- Toggle Es Devolución -->
    <div class="card mb-4" style="background: rgba(56, 161, 105, 0.05); border: 1px solid rgba(56, 161, 105, 0.2); display: inline-block;">
      <label class="card-body py-3 flex justify-between items-center gap-8 cursor-pointer" style="margin: 0;">
        <div>
          <h4 class="font-semibold" style="color: var(--color-success); margin: 0 0 4px 0;">¿Es una devolución?</h4>
          <p class="text-sm text-muted m-0">Active esta opción si el ingreso corresponde a material que fue prestado previamente.</p>
        </div>
        <div class="switch" style="pointer-events: none;">
          <input type="checkbox" v-model="esDevolucion" @change="handleDevolucionToggle">
          <span class="slider round"></span>
        </div>
      </label>
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
              <label class="form-label">Procedencia de los materiales *</label>
              <input v-model="procedencia" type="text" class="form-input" placeholder="Ej: Aula 3A, Laboratorio..." />
            </div>
          </div>
        </div>
      </div>

      <!-- Date & Observations -->
      <div class="flex flex-col gap-5">
        <div class="card">
          <div class="card-header"><h3>Fecha y Hora</h3></div>
          <div class="card-body">
            <div class="datetime-display entrada">
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
            <textarea v-model="observacion" class="form-input" placeholder="Notas sobre el estado del material devuelto..." style="min-height: 120px;"></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- Articles Section -->
    <div class="card mt-6">
      <div class="card-header">
        <h3>Artículos a Ingresar</h3>
        <span class="badge badge-success">{{ items.length }} artículo(s)</span>
      </div>
      <div class="card-body">
        <div class="add-article-bar mb-4">
          <div class="form-input-icon flex-1">
            <Search :size="16" />
            <input type="text" class="form-input" placeholder="Buscar artículo por nombre o código..." v-model="articuloSearch" />
          </div>
        </div>

        <div class="search-results" v-if="articuloSearch.length > 0 && searchResults.length > 0">
          <div class="search-result-item" v-for="a in searchResults" :key="a.articulo_item_id" @click="addArticulo(a)">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ a.nombre }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="color-dot" :style="{ background: a.hex, width: '12px', height: '12px' }"></span>
              <span class="text-sm text-muted">{{ a.colorNombre }} — Stock actual: {{ a.stock }}</span>
            </div>
          </div>
        </div>

        <div class="table-wrapper" v-if="items.length > 0">
          <table class="table">
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Variante / Color</th>
                <th>Stock Actual</th>
                <th>Cantidad a Ingresar</th>
                <th>Observación</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in items" :key="i">
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
                  <span class="badge badge-info">{{ item.stockActual }}</span>
                </td>
                <td style="width: 140px;">
                  <div class="flex flex-col">
                    <input v-model.number="item.cantidad" type="number" min="1" :max="esDevolucion ? item.maxDevolucion : null" class="form-input" style="width: 100px; text-align: center;" @change="validateCantidad(item)" />
                    <span class="text-xs text-danger" v-if="esDevolucion && item.cantidad > item.maxDevolucion">Máx: {{ item.maxDevolucion }}</span>
                  </div>
                </td>
                <td style="width: 200px;">
                  <input v-model="item.observacion" type="text" class="form-input" placeholder="Ej: Buen estado" style="font-size: 13px;" />
                </td>
                <td>
                  <button class="btn btn-ghost btn-icon" @click="items.splice(i, 1)">
                    <X :size="16" style="color: var(--color-danger);" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="empty-state" v-else>
          <Package :size="48" />
          <p>Busca y agrega artículos para el ingreso</p>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="form-actions mt-6">
      <router-link to="/" class="btn btn-secondary">Cancelar</router-link>
      <button class="btn btn-success btn-lg" :disabled="saving" @click="registrarEntrada">
        <ArrowDownToLine :size="18" />
        {{ saving ? 'Registrando...' : 'Registrar Entrada' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Calendar, ArrowDownToLine, Package, X } from 'lucide-vue-next'
import { api } from '@/api'
import { confirmAction, showError, showWarning, showSuccess } from '@/utils/alerts'

const router = useRouter()

const almacenes = ref([])
const selectedAlmacen = ref('')

const solicitante = ref({ carnet: '', nombre: '', telefono: '' })
const solicitanteEncontrado = ref(false)
const procedencia = ref('')
const observacion = ref('')
const articuloSearch = ref('')
const saving = ref(false)
const esDevolucion = ref(false)
const pendientesList = ref([])

const items = ref([])
const allArticulos = ref([])

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
    
    if (esDevolucion.value) {
      await cargarPendientes();
    }
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
          stock: v.stock
        })
      }
    }
    allArticulos.value = flatVariantes
  } catch (error) {
    console.error("Error cargando artículos:", error)
  }
}

const searchResults = computed(() => {
  if (!articuloSearch.value) return []
  return allArticulos.value.filter(a => a.nombre.toLowerCase().includes(articuloSearch.value.toLowerCase()))
})

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
      solicitanteEncontrado.value = false;
    }
  }, 500);
}

async function cargarPendientes() {
  try {
    const res = await api.getPendientesGlobales();
    pendientesList.value = res.data || [];
  } catch (err) {
    pendientesList.value = [];
  }
}

function handleDevolucionToggle() {
  items.value = [];
  if (esDevolucion.value) {
    cargarPendientes();
  }
}

function validateCantidad(item) {
  if (esDevolucion.value && item.cantidad > item.maxDevolucion) {
    item.cantidad = item.maxDevolucion;
  }
}

function addArticulo(a) {
  let maxDevolucion = null;
  if (esDevolucion.value) {
    const pendiente = pendientesList.value.find(p => p.articulo_item_id === a.articulo_item_id);
    if (!pendiente) {
      showWarning('Actualmente no existe ningún préstamo pendiente de devolución para este artículo.');
      return;
    }
    maxDevolucion = pendiente.max_devolucion;
  }

  const existing = items.value.find(i => i.articulo_item_id === a.articulo_item_id)
  if (existing) {
    if (!esDevolucion.value || existing.cantidad < existing.maxDevolucion) {
      existing.cantidad++
    }
  } else {
    items.value.push({
      articulo_item_id: a.articulo_item_id,
      nombre: a.nombre,
      colorNombre: a.colorNombre,
      hex: a.hex,
      stockActual: a.stock,
      cantidad: 1,
      observacion: '',
      maxDevolucion: maxDevolucion
    })
  }
  articuloSearch.value = ''
}

async function registrarEntrada() {
  if (!selectedAlmacen.value) {
    showWarning("Primero debe seleccionar un almacén para registrar el movimiento.")
    return
  }
  if (items.value.length === 0) {
    showWarning("Debe agregar al menos un artículo para el ingreso.")
    return
  }
  if (!solicitante.value.carnet || !solicitante.value.nombre || !procedencia.value) {
    showWarning("Por favor, complete los campos obligatorios del solicitante y procedencia.")
    return
  }

  saving.value = true
  try {
    const payload = {
      tipo: 'ENTRADA',
      almacen_id: Number(selectedAlmacen.value),
      solicitante_ci: solicitante.value.carnet,
      solicitante_nombre: solicitante.value.nombre,
      solicitante_telefono: solicitante.value.telefono,
      destino_procedencia: procedencia.value,
      observacion: observacion.value,
      es_devolucion: esDevolucion.value,
      detalles: items.value.map(i => ({
        articulo_item_id: i.articulo_item_id,
        cantidad: i.cantidad,
        observacion: i.observacion
      }))
    }

    await api.createMovimiento(payload)
    showSuccess("Entrada registrada exitosamente")
    router.push('/historial')
  } catch (error) {
    showError("Error al registrar la entrada: " + error.message)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.mov-type-badge {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-4); border-radius: var(--radius-full);
  font-weight: 700; font-size: var(--font-size-base); letter-spacing: 0.03em;
}
.mov-entrada {
  background: var(--color-success-bg); color: var(--color-success);
  border: 1px solid var(--color-success-light);
}
.mov-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); }
.datetime-display {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3); border-radius: var(--radius-lg);
}
.datetime-display.entrada { background: var(--color-success-bg); color: #276749; }
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
.search-result-item:hover { background: var(--color-success-bg); }
.search-result-item + .search-result-item { border-top: 1px solid var(--color-gray-100); }
.form-actions { display: flex; justify-content: flex-end; gap: var(--space-3); padding: var(--space-4) 0; }
.empty-state { padding: var(--space-8); }
.empty-state svg { width: 48px; height: 48px; }
</style>
