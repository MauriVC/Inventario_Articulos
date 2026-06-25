<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <span class="mov-type-badge mov-baja"><PackageMinus :size="18" /> BAJA</span>
        <select v-model="selectedAlmacen" class="form-select" style="width: 220px;" @change="loadAlmacenData">
          <option value="">Seleccione un almacén...</option>
          <option v-for="a in almacenes" :key="a.id" :value="a.id">{{ a.nombre }}</option>
        </select>
      </div>
      <span class="text-muted text-sm">Código: <strong style="color: var(--color-warning);">Auto-generado</strong></span>
    </div>

    <div class="mov-form-grid">
      <!-- Datos del Responsable -->
      <div class="card">
        <div class="card-header"><h3>Datos del Responsable de Baja</h3></div>
        <div class="card-body">
          <div class="flex flex-col gap-4">
            <div class="form-group">
              <label class="form-label">Carnet de Identidad *</label>
              <div class="form-input-icon">
                <Search :size="16" />
                <input v-model="responsableCi" type="text" class="form-input" placeholder="Buscar por carnet..." />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Nombre Completo *</label>
              <input v-model="responsable" type="text" class="form-input" placeholder="Nombre y apellidos" />
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input v-model="responsableTelefono" type="text" class="form-input" placeholder="Número de teléfono" />
            </div>
            <div class="form-group">
              <label class="form-label">Motivo Principal *</label>
              <select v-model="motivoBaja" class="form-select">
                <option value="">Seleccione un motivo...</option>
                <option value="Dañado">Dañado / Deterioro</option>
                <option value="Obsoleto">Obsoleto</option>
                <option value="Vencido">Vencido</option>
                <option value="Pérdida">Pérdida / Extravío</option>
                <option value="Consumo">Consumo interno</option>
                <option value="Otro">Otro</option>
              </select>
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
                <span class="datetime-date">{{ currentDate }}</span>
                <span class="datetime-time">{{ currentTime }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="card flex-1">
          <div class="card-header"><h3>Observaciones</h3></div>
          <div class="card-body">
            <textarea v-model="observacion" class="form-input" placeholder="Detalles adicionales sobre la baja, estado de los materiales, etc..." style="min-height: 120px;"></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- Warning -->
    <div class="baja-warning mt-4">
      <AlertTriangle :size="18" />
      <div>
        <strong>Atención:</strong> Dar de baja un artículo descontará la cantidad seleccionada del stock disponible. Esta acción queda registrada permanentemente en el historial. Para desactivar completamente un artículo, debes hacerlo desde el módulo de "Artículos".
      </div>
    </div>

    <!-- Articles Section -->
    <div class="card mt-4">
      <div class="card-header">
        <h3>Artículos a Dar de Baja</h3>
        <span class="badge badge-warning">{{ items.length }} artículo(s)</span>
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
              <span class="color-dot" :style="{ background: a.hex, width: '12px', height: '12px', display: 'inline-block', borderRadius: '50%' }"></span>
              <span class="text-sm text-muted">{{ a.colorNombre }} — Stock: {{ a.stock }}</span>
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
                <th>Cantidad a Dar de Baja</th>
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
                    <span class="color-dot" :style="{ background: item.hex, width: '14px', height: '14px', display: 'inline-block', borderRadius: '50%' }"></span>
                    {{ item.colorNombre }}
                  </div>
                </td>
                <td class="text-center">
                  <span class="badge badge-info">{{ item.stockActual }}</span>
                </td>
                <td style="width: 160px;">
                  <input v-model.number="item.cantidad" type="number" min="1" :max="item.stockActual" class="form-input" style="width: 100px; text-align: center;" />
                </td>
                <td style="width: 220px;">
                  <input v-model="item.observacion" type="text" class="form-input" placeholder="Ej: Roto, oxidado..." style="font-size: 13px;" />
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
          <PackageMinus :size="48" />
          <p>Busca y agrega artículos para dar de baja</p>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="form-actions mt-6">
      <router-link to="/" class="btn btn-secondary">Cancelar</router-link>
      <button class="btn btn-warning btn-lg" :disabled="items.length === 0 || !selectedAlmacen || !motivoBaja || !responsable || saving" @click="registrarBaja">
        <PackageMinus :size="18" />
        {{ saving ? 'Registrando...' : 'Confirmar Baja' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Calendar, PackageMinus, X, AlertTriangle } from 'lucide-vue-next'
import { api } from '@/api'

const router = useRouter()

const almacenes = ref([])
const selectedAlmacen = ref('')

const motivoBaja = ref('')
const responsable = ref('')
const responsableCi = ref('')
const responsableTelefono = ref('')
const observacion = ref('')
const articuloSearch = ref('')
const saving = ref(false)

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
    if (almacenes.value.length > 0) {
      selectedAlmacen.value = almacenes.value[0].id
      await loadAlmacenData()
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

function addArticulo(a) {
  if (a.stock <= 0) {
    alert('Este artículo no tiene stock disponible para dar de baja.')
    return
  }
  const existing = items.value.find(i => i.articulo_item_id === a.articulo_item_id)
  if (existing) {
    if (existing.cantidad < a.stock) existing.cantidad++
  } else {
    items.value.push({
      articulo_item_id: a.articulo_item_id,
      nombre: a.nombre,
      colorNombre: a.colorNombre,
      hex: a.hex,
      stockActual: a.stock,
      cantidad: a.stock, // Por defecto, dar de baja todo el stock
      observacion: ''
    })
  }
  articuloSearch.value = ''
}

async function registrarBaja() {
  if (items.value.length === 0 || !selectedAlmacen.value) return
  if (!motivoBaja.value || !responsable.value || !responsableCi.value) {
    alert("Por favor, complete el carnet de identidad, el motivo de baja y el responsable.")
    return
  }

  if (!confirm(`¿Está seguro de dar de baja la cantidad especificada de ${items.value.length} artículo(s)? Se reducirá el stock actual.`)) {
    return
  }

  saving.value = true
  try {
    const payload = {
      tipo: 'BAJA',
      almacen_id: Number(selectedAlmacen.value),
      solicitante_ci: responsableCi.value,
      solicitante_nombre: responsable.value,
      solicitante_telefono: responsableTelefono.value,
      motivo_baja: motivoBaja.value,
      observacion: observacion.value,
      detalles: items.value.map(i => ({
        articulo_item_id: i.articulo_item_id,
        cantidad: i.cantidad,
        observacion: i.observacion
      }))
    }

    await api.createMovimiento(payload)
    alert("Baja registrada exitosamente.")
    router.push('/historial')
  } catch (error) {
    alert("Error al registrar la baja: " + error.message)
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
.mov-baja {
  background: rgba(237, 137, 54, 0.1); color: #c05621;
  border: 1px solid rgba(237, 137, 54, 0.3);
}
.mov-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); }
.datetime-display {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3); border-radius: var(--radius-lg);
}
.datetime-display.baja { background: rgba(237, 137, 54, 0.08); color: #c05621; }
.datetime-display div { display: flex; flex-direction: column; }
.datetime-date { font-weight: 600; font-size: var(--font-size-md); }
.datetime-time { font-size: var(--font-size-sm); opacity: 0.8; }

.baja-warning {
  display: flex; align-items: flex-start; gap: var(--space-3);
  padding: var(--space-4); border-radius: var(--radius-lg);
  background: rgba(237, 137, 54, 0.08);
  border: 1px solid rgba(237, 137, 54, 0.25);
  color: #7b341e; font-size: var(--font-size-sm); line-height: 1.5;
}

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
.search-result-item:hover { background: rgba(237, 137, 54, 0.08); }
.search-result-item + .search-result-item { border-top: 1px solid var(--color-gray-100); }
.form-actions { display: flex; justify-content: flex-end; gap: var(--space-3); padding: var(--space-4) 0; }
.empty-state { padding: var(--space-8); }
.empty-state svg { width: 48px; height: 48px; }

.btn-warning {
  background: #ed8936; color: white; border: none;
}
.btn-warning:hover:not(:disabled) { background: #dd6b20; }
.btn-warning:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
