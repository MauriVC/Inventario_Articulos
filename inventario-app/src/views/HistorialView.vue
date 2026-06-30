<template>
  <div>
    <!-- Filters -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <input type="date" v-model="filters.desde" class="form-input" style="width: 160px;" @change="loadMovimientos(1)" />
        <span class="text-muted text-sm">hasta</span>
        <input type="date" v-model="filters.hasta" class="form-input" style="width: 160px;" @change="loadMovimientos(1)" />
        <select v-model="filters.tipo" class="form-select" style="width: 140px;" @change="loadMovimientos(1)">
          <option value="">Tipo: Todos</option>
          <option value="SALIDA">Salida</option>
          <option value="ENTRADA">Entrada</option>
          <option value="BAJA">Baja</option>
        </select>
        <select v-model="filters.almacen_id" class="form-select" style="width: 180px;" @change="loadMovimientos(1)">
          <option value="">Almacén: Todos</option>
          <option v-for="a in almacenes" :key="a.id" :value="a.id">{{ a.nombre }}</option>
        </select>
        <div class="form-input-icon">
          <Search :size="16" />
          <input v-model="filters.search" type="text" class="form-input" placeholder="Buscar código o solicitante..." style="width: 240px;" @keyup.enter="loadMovimientos(1)" />
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
                <th>Código</th>
                <th>Tipo</th>
                <th>Almacén</th>
                <th>Solicitante</th>
                <th>CI</th>
                <th>Destino / Procedencia</th>
                <th>Artículos</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in movimientos" :key="m.id">
                <td class="font-semibold" :style="{ color: m.tipo === 'SALIDA' ? 'var(--color-danger)' : m.tipo === 'ENTRADA' ? 'var(--color-success)' : 'var(--color-warning)' }">{{ m.codigo }}</td>
                <td>
                  <span class="badge" :class="tipoBadgeClass(m.tipo)">
                    <component :is="tipoIcon(m.tipo)" :size="12" />
                    {{ m.tipo }}
                  </span>
                </td>
                <td>{{ m.almacen_nombre }}</td>
                <td class="font-medium">{{ m.solicitante_nombre || '—' }}</td>
                <td class="text-muted text-sm">{{ m.solicitante_ci || '—' }}</td>
                <td>{{ m.destino_procedencia || '—' }}</td>
                <td class="text-center">
                  <span class="badge badge-primary">{{ m.total_articulos }}</span>
                </td>
                <td class="text-muted text-sm">{{ new Date(m.fecha_movimiento).toLocaleString('es-ES') }}</td>
                <td>
                  <button class="btn btn-ghost btn-icon" title="Ver detalle" @click="openDetalle(m.id)">
                    <Eye :size="16" />
                  </button>
                </td>
              </tr>
              <tr v-if="movimientos.length === 0">
                <td colspan="9" class="text-center p-4 text-muted">No se encontraron movimientos con los filtros aplicados.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Paginación dinámica -->
        <div class="pagination" v-if="totalRecords > 0">
          <span class="pagination-info">
            Mostrando {{ paginationStart }}-{{ paginationEnd }} de {{ totalRecords }} registros
          </span>
          <div class="pagination-buttons">
            <button class="pagination-btn" :disabled="currentPage <= 1" @click="loadMovimientos(1)">&laquo;</button>
            <button class="pagination-btn" :disabled="currentPage <= 1" @click="loadMovimientos(currentPage - 1)">&lsaquo;</button>
            <button 
              v-for="p in visiblePages" :key="p"
              class="pagination-btn" 
              :class="{ active: p === currentPage }"
              @click="loadMovimientos(p)"
            >{{ p }}</button>
            <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="loadMovimientos(currentPage + 1)">&rsaquo;</button>
            <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="loadMovimientos(totalPages)">&raquo;</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div class="modal-overlay" v-if="selectedMov" @click.self="selectedMov = null">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <div class="flex items-center gap-3">
            <h2>Detalle del Movimiento</h2>
            <span class="badge" :class="selectedMov.tipo === 'SALIDA' ? 'badge-danger' : selectedMov.tipo === 'ENTRADA' ? 'badge-success' : 'badge-warning'">{{ selectedMov.tipo }}</span>
          </div>
          <button class="btn btn-ghost btn-icon" @click="selectedMov = null"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="grid-2 mb-4">
            <div><span class="text-sm text-muted">Código</span><p class="font-semibold">{{ selectedMov.codigo }}</p></div>
            <div><span class="text-sm text-muted">Fecha</span><p class="font-medium">{{ new Date(selectedMov.fecha_movimiento).toLocaleString('es-ES') }}</p></div>
            <div><span class="text-sm text-muted">{{ selectedMov.tipo === 'BAJA' ? 'Responsable' : 'Solicitante' }}</span><p class="font-medium">{{ selectedMov.solicitante_nombre || '—' }} <span v-if="selectedMov.solicitante_ci">(CI: {{ selectedMov.solicitante_ci }})</span></p></div>
            <div v-if="selectedMov.tipo === 'BAJA'"><span class="text-sm text-muted">Motivo de Baja</span><p class="font-medium" style="color: var(--color-warning);">{{ selectedMov.motivo_baja || '—' }}</p></div>
            <div v-else><span class="text-sm text-muted">{{ selectedMov.tipo === 'ENTRADA' ? 'Procedencia' : 'Destino' }}</span><p class="font-medium">{{ selectedMov.destino_procedencia || '—' }}</p></div>
            <div><span class="text-sm text-muted">Almacén</span><p class="font-medium">{{ selectedMov.almacen_nombre }}</p></div>
            <div><span class="text-sm text-muted">Observación General</span><p class="font-medium">{{ selectedMov.observacion || 'Ninguna' }}</p></div>
          </div>

          <div class="paquete-info mb-4" v-if="selectedMov.paquete_nombre">
            <div class="flex items-center gap-2" style="padding: var(--space-3); background: rgba(237, 137, 54, 0.05); border: 1px solid var(--color-warning-light); border-radius: var(--radius-md);">
              <Boxes :size="18" style="color: #dd6b20;" />
              <div>
                <p class="text-sm text-muted" style="line-height: 1;">Salida originada desde el paquete</p>
                <p class="font-medium" style="color: #dd6b20;">{{ selectedMov.paquete_nombre }}</p>
              </div>
            </div>
          </div>

          <h3 class="font-semibold mb-3" style="font-size: var(--font-size-base); color: var(--color-gray-700);">Artículos del movimiento</h3>
          <table class="table">
            <thead>
              <tr><th>Artículo</th><th>Color</th><th class="text-center">Cantidad</th><th class="text-center">Stock Ant.</th><th class="text-center">Stock Post.</th><th v-if="selectedMov.tipo === 'BAJA'">Observación</th><th class="text-center" v-else>Devolución</th></tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in selectedMov.detalles" :key="i">
                <td class="font-medium">{{ d.articulo_nombre }}</td>
                <td>
                  <div class="flex items-center gap-2">
                    <span class="color-dot" :style="{ background: d.codigo_hex, width: '14px', height: '14px', display: 'inline-block', borderRadius: '50%' }"></span>
                    {{ d.color_nombre }}
                  </div>
                </td>
                <td class="font-semibold text-center">{{ d.cantidad }}</td>
                <td class="text-center text-muted">{{ d.stock_anterior }}</td>
                <td class="text-center font-medium">{{ d.stock_posterior }}</td>
                <td v-if="selectedMov.tipo === 'BAJA'" class="text-sm text-muted">{{ d.observacion || '—' }}</td>
                <td class="text-center" v-else>
                  <span v-if="d.requiere_devolucion" class="badge badge-devolucion">
                    <RotateCcw :size="10" /> DEVUELVE
                  </span>
                  <span v-else class="text-xs text-muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="selectedMov = null">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, Eye, ArrowUpFromLine, ArrowDownToLine, X, PackageMinus, Boxes, RotateCcw } from 'lucide-vue-next'
import { api } from '@/api'
import { showError } from '@/utils/alerts'

function tipoBadgeClass(tipo) {
  if (tipo === 'SALIDA') return 'badge-danger'
  if (tipo === 'ENTRADA') return 'badge-success'
  return 'badge-warning'
}
function tipoIcon(tipo) {
  if (tipo === 'SALIDA') return ArrowUpFromLine
  if (tipo === 'ENTRADA') return ArrowDownToLine
  return PackageMinus
}

const selectedMov = ref(null)
const filters = ref({ desde: '', hasta: '', tipo: '', almacen_id: '', search: '' })

const movimientos = ref([])
const almacenes = ref([])
const currentPage = ref(1)
const totalRecords = ref(0)
const pageSize = 20

const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / pageSize)))
const paginationStart = computed(() => ((currentPage.value - 1) * pageSize) + 1)
const paginationEnd = computed(() => Math.min(currentPage.value * pageSize, totalRecords.value))

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  
  let start = Math.max(1, current - 2)
  let end = Math.min(total, current + 2)
  
  // Asegurar al menos 5 botones si hay suficientes páginas
  if (end - start < 4) {
    if (start === 1) end = Math.min(total, start + 4)
    else start = Math.max(1, end - 4)
  }
  
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

onMounted(async () => {
  // Cargar almacenes para el filtro
  try {
    const almRes = await api.getAlmacenes()
    almacenes.value = almRes.data
  } catch (e) {
    console.error('Error cargando almacenes:', e)
  }
  await loadMovimientos(1)
})

async function loadMovimientos(page = 1) {
  currentPage.value = page
  try {
    const params = {}
    if (filters.value.tipo) params.tipo = filters.value.tipo
    if (filters.value.almacen_id) params.almacen_id = filters.value.almacen_id
    if (filters.value.desde) params.desde = filters.value.desde
    if (filters.value.hasta) params.hasta = filters.value.hasta
    if (filters.value.search) params.search = filters.value.search
    params.limit = pageSize
    params.offset = (page - 1) * pageSize

    const res = await api.getMovimientos(params)
    movimientos.value = res.data
    totalRecords.value = res.total || res.data.length
  } catch (error) {
    console.error("Error cargando historial:", error)
  }
}

async function openDetalle(id) {
  try {
    const res = await api.getMovimiento(id)
    selectedMov.value = res.data
  } catch (error) {
    console.error("Error cargando detalle:", error)
    showError("No se pudo cargar el detalle del movimiento.")
  }
}
</script>

<style scoped>
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
</style>
