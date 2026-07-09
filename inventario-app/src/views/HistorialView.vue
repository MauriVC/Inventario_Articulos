<template>
  <div>
    <!-- Filters -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <input type="date" v-model="filters.desde" class="form-input" style="width: 130px;" @change="loadMovimientos(1)" />
        <span class="text-muted text-sm">hasta</span>
        <input type="date" v-model="filters.hasta" class="form-input" style="width: 130px;" @change="loadMovimientos(1)" />
        <select v-model="filters.tipo" class="form-select" style="width: 140px;" @change="loadMovimientos(1)">
          <option value="">Tipo: Todos</option>
          <optgroup label="Movimientos">
            <option value="ENTRADA">Entrada</option>
            <option value="SALIDA">Salida</option>
            <option value="BAJA">Baja</option>
          </optgroup>
          <optgroup label="Actividades CRUD">
            <option value="REGISTRO">Registro</option>
            <option value="EDICIÓN">Edición</option>
            <option value="BORRADO">Borrado</option>
          </optgroup>
        </select>
        <select v-model="filters.modulo" class="form-select" style="width: 160px;" @change="loadMovimientos(1)">
          <option value="">Módulo: Todos</option>
          <option value="Movimiento">Movimientos</option>
          <option value="Artículo">Artículos</option>
          <option value="Almacén">Almacenes</option>
          <option value="Categoría">Categorías</option>
          <option value="Marca">Marcas</option>
          <option value="Unidad de Medida">Unidades</option>
          <option value="Color">Colores</option>
          <option value="Atributo">Atributos</option>
          <option value="Usuario">Usuarios</option>
        </select>
        <div class="form-input-icon">
          <Search :size="16" />
          <input v-model="filters.search" type="text" class="form-input" placeholder="Buscar..." style="width: 200px;" @keyup.enter="loadMovimientos(1)" />
        </div>
      </div>
      <button class="btn btn-primary" style="padding-left: 16px; padding-right: 16px;" @click="openExportFullModal">
        <Download :size="18" /> Descargar Historial
      </button>
    </div>

    <!-- Table -->
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Módulo</th>
                <th>Descripción / Detalle</th>
                <th>Responsable</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in movimientos" :key="m.origen + m.id">
                <td class="text-muted font-medium" style="white-space: nowrap;">
                  {{ new Date(m.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' }) }}
                </td>
                <td>
                  <span class="badge" :class="tipoBadgeClass(m.tipo)">
                    <component :is="tipoIcon(m.tipo)" :size="12" />
                    {{ m.tipo }}
                  </span>
                </td>
                <td class="font-semibold text-gray-700">{{ m.modulo }}</td>
                <td style="max-width: 350px;">
                  <p class="text-sm text-gray-800" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" :title="m.descripcion">
                    {{ m.descripcion }}
                  </p>
                </td>
                <td class="text-muted text-sm">{{ m.usuario_nombre || 'Sistema' }}</td>
                <td>
                  <button class="btn btn-ghost btn-icon" title="Ver detalle" @click="openDetalle(m.origen, m.id)">
                    <Eye :size="16" />
                  </button>
                </td>
              </tr>
              <tr v-if="movimientos.length === 0">
                <td colspan="6" class="text-center p-4 text-muted">No se encontraron registros con los filtros aplicados.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Paginación dinámica -->
        <div class="pagination flex items-center justify-between" v-if="totalRecords > 0" style="padding: var(--space-4); border-top: 1px solid var(--color-gray-100);">
          <div class="flex items-center gap-3">
            <span class="pagination-info text-sm text-muted">
              Mostrando {{ paginationStart }}-{{ paginationEnd }} de {{ totalRecords }} registros
            </span>
            <select v-model="pageSize" class="form-select" style="width: auto; padding-top: 4px; padding-bottom: 4px; font-size: 13px;" @change="loadMovimientos(1)">
              <option :value="5">5 por página</option>
              <option :value="10">10 por página</option>
              <option :value="20">20 por página</option>
              <option :value="50">50 por página</option>
            </select>
          </div>
          <div class="pagination-buttons flex gap-1">
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
    <div class="modal-overlay" v-if="selectedMov">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <div class="flex items-center gap-3">
            <h2>Detalle de Actividad</h2>
            <span class="badge" :class="tipoBadgeClass(selectedMov.tipo)">{{ selectedMov.tipo }}</span>
          </div>
          <button class="btn btn-ghost btn-icon" @click="selectedMov = null"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          
          <!-- Vista para Movimientos de Inventario -->
          <template v-if="selectedOrigen === 'movimiento'">
            <div class="grid-2 mb-4">
              <div><span class="text-sm text-muted">Código</span><p class="font-semibold">{{ selectedMov.codigo }}</p></div>
              <div><span class="text-sm text-muted">Fecha</span><p class="font-medium">{{ new Date(selectedMov.fecha_movimiento).toLocaleString('es-ES') }}</p></div>
              <div><span class="text-sm text-muted">Solicitante</span><p class="font-medium">{{ selectedMov.solicitante_nombre || '—' }} <span v-if="selectedMov.solicitante_ci">(CI: {{ selectedMov.solicitante_ci }})</span></p></div>
              <div><span class="text-sm text-muted">Responsable del Movimiento</span><p class="font-medium">{{ selectedMov.usuario_nombres }} {{ selectedMov.usuario_apellidos }}</p></div>
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
          </template>

          <!-- Vista para Actividades CRUD Simples -->
          <template v-else>
            <div class="grid-1 gap-4">
              <div>
                <span class="text-sm text-muted block mb-1">Módulo Afectado</span>
                <span class="badge badge-primary">{{ selectedMov.modulo }}</span>
              </div>
              <div>
                <span class="text-sm text-muted block mb-1">Descripción de la Actividad</span>
                <p class="font-medium text-lg">{{ selectedMov.descripcion }}</p>
              </div>
              <div class="grid-2">
                <div>
                  <span class="text-sm text-muted block mb-1">Fecha y Hora</span>
                  <p class="font-medium">{{ new Date(selectedMov.created_at).toLocaleString('es-ES') }}</p>
                </div>
                <div>
                  <span class="text-sm text-muted block mb-1">Responsable de la Acción</span>
                  <p class="font-medium">{{ selectedMov.usuario_nombre || 'Sistema' }}</p>
                </div>
              </div>
            </div>
          </template>

        </div>
        <div class="modal-footer flex items-center justify-between">
          <button class="btn btn-primary" @click="exportingFull = false; showExportModal = true">
            <Download :size="16" /> Descargar Registro
          </button>
          <button class="btn btn-secondary" @click="selectedMov = null">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- Export Modal -->
    <div class="modal-overlay" v-if="showExportModal" style="z-index: 1100;">
      <div class="modal-content" style="max-width: 450px;">
        <div class="modal-header">
          <h2>{{ exportingFull ? 'Descargar Historial' : 'Descargar Registro' }}</h2>
          <button class="btn btn-ghost btn-icon" @click="showExportModal = false"><X :size="20" /></button>
        </div>
        <div class="modal-body text-center" style="padding: var(--space-6);">
          <p class="text-muted mb-6">
            <template v-if="exportingFull">
              Elige el formato en el que deseas descargar el reporte completo del historial actual.
            </template>
            <template v-else>
              Elige el formato en el que deseas descargar el detalle de este registro.
            </template>
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center; align-items: center;">
            <button style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; width: 150px; height: 130px; border: 1px solid #e2e8f0; background: #fff; border-radius: 12px; cursor: pointer; transition: all 0.2s;" @click="handleDownloadPDF" onmouseover="this.style.borderColor='#e53e3e'; this.style.backgroundColor='#fff5f5'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.backgroundColor='#fff'">
              <div style="background: #fed7d7; padding: 14px; border-radius: 50%; color: #e53e3e; display: flex; align-items: center; justify-content: center;">
                <FileText :size="28" />
              </div>
              <span class="font-bold" style="color: #4a5568;">Documento PDF</span>
            </button>
            <button style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; width: 150px; height: 130px; border: 1px solid #e2e8f0; background: #fff; border-radius: 12px; cursor: pointer; transition: all 0.2s;" @click="handleDownloadExcel" onmouseover="this.style.borderColor='#38a169'; this.style.backgroundColor='#f0fff4'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.backgroundColor='#fff'">
              <div style="background: #c6f6d5; padding: 14px; border-radius: 50%; color: #38a169; display: flex; align-items: center; justify-content: center;">
                <FileSpreadsheet :size="28" />
              </div>
              <span class="font-bold" style="color: #4a5568;">Hoja de Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, Eye, ArrowUpFromLine, ArrowDownToLine, X, PackageMinus, Boxes, RotateCcw, Download, FileText, FileSpreadsheet, PlusCircle, Edit, Trash2 } from 'lucide-vue-next'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { api } from '@/api'
import { showError, showToast } from '@/utils/alerts'

function tipoBadgeClass(tipo) {
  if (tipo === 'SALIDA') return 'badge-danger'
  if (tipo === 'ENTRADA') return 'badge-success'
  if (tipo === 'BAJA') return 'badge-warning'
  if (tipo === 'REGISTRO') return 'badge-info'
  if (tipo === 'EDICIÓN') return 'badge-purple'
  if (tipo === 'BORRADO') return 'badge-dark'
  return 'badge-primary'
}

function tipoIcon(tipo) {
  if (tipo === 'SALIDA') return ArrowUpFromLine
  if (tipo === 'ENTRADA') return ArrowDownToLine
  if (tipo === 'BAJA') return PackageMinus
  if (tipo === 'REGISTRO') return PlusCircle
  if (tipo === 'EDICIÓN') return Edit
  if (tipo === 'BORRADO') return Trash2
  return Eye
}

const selectedMov = ref(null)
const selectedOrigen = ref(null)
const showExportModal = ref(false)
const exportingFull = ref(false)
const filters = ref({ desde: '', hasta: '', tipo: '', modulo: '', search: '' })

function openExportFullModal() {
  exportingFull.value = true
  showExportModal.value = true
}

async function handleDownloadPDF() {
  if (exportingFull.value) await descargarHistorialPDF()
  else descargarPDF()
}

async function handleDownloadExcel() {
  if (exportingFull.value) await descargarHistorialExcel()
  else descargarExcel()
}

const movimientos = ref([])
const currentPage = ref(1)
const totalRecords = ref(0)
const pageSize = ref(10)

const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / pageSize.value)))
const paginationStart = computed(() => totalRecords.value > 0 ? ((currentPage.value - 1) * pageSize.value) + 1 : 0)
const paginationEnd = computed(() => Math.min(currentPage.value * pageSize.value, totalRecords.value))

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  
  let start = Math.max(1, current - 2)
  let end = Math.min(total, current + 2)
  
  if (end - start < 4) {
    if (start === 1) end = Math.min(total, start + 4)
    else start = Math.max(1, end - 4)
  }
  
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

onMounted(async () => {
  await loadMovimientos(1)
})

async function loadMovimientos(page = 1) {
  currentPage.value = page
  try {
    const params = {}
    if (filters.value.tipo) params.tipo = filters.value.tipo
    if (filters.value.modulo) params.modulo = filters.value.modulo
    if (filters.value.desde) params.desde = filters.value.desde
    if (filters.value.hasta) params.hasta = filters.value.hasta
    if (filters.value.search) params.search = filters.value.search
    params.limit = pageSize.value
    params.offset = (page - 1) * pageSize.value

    const res = await api.getActividades(params)
    movimientos.value = res.data
    totalRecords.value = res.total || res.data.length
  } catch (error) {
    console.error("Error cargando historial:", error)
  }
}

async function openDetalle(origen, id) {
  try {
    const res = await api.getActividad(origen, id)
    selectedMov.value = res.data
    selectedOrigen.value = origen
  } catch (error) {
    console.error("Error cargando detalle:", error)
    showError("No se pudo cargar el detalle.")
  }
}

function descargarPDF() {
  if (!selectedMov.value) return
  
  const doc = new jsPDF()
  const mov = selectedMov.value
  const isMovimiento = selectedOrigen.value === 'movimiento'
  
  if (isMovimiento) {
    // Header Movimiento
    doc.setFontSize(20)
    doc.setTextColor(40, 40, 40)
    doc.text(`Detalle de Movimiento: ${mov.codigo}`, 14, 22)
    
    doc.setFontSize(11)
    doc.setTextColor(100, 100, 100)
    doc.text(`Fecha: ${new Date(mov.fecha_movimiento).toLocaleString('es-ES')}`, 14, 32)
    doc.text(`Tipo: ${mov.tipo}`, 14, 38)
    
    // Info section
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    const isBaja = mov.tipo === 'BAJA'
    const isEntrada = mov.tipo === 'ENTRADA'
    
    doc.text(`Almacén: ${mov.almacen_nombre}`, 14, 50)
    doc.text(`Solicitante: ${mov.solicitante_nombre || '—'} ${mov.solicitante_ci ? '(CI: '+mov.solicitante_ci+')' : ''}`, 14, 56)
    doc.text(`Responsable: ${mov.usuario_nombres} ${mov.usuario_apellidos}`, 14, 62)
    
    if (isBaja) {
      doc.text(`Motivo de Baja: ${mov.motivo_baja || '—'}`, 14, 68)
    } else {
      doc.text(`${isEntrada ? 'Procedencia' : 'Destino'}: ${mov.destino_procedencia || '—'}`, 14, 68)
    }
    
    doc.text(`Observación: ${mov.observacion || 'Ninguna'}`, 14, 74)
    
    if (mov.paquete_nombre) {
      doc.text(`Paquete: ${mov.paquete_nombre}`, 14, 80)
    }
    
    // Table
    const tableColumn = ["Artículo", "Color", "Cantidad", "Stock Ant.", "Stock Post."]
    if (isBaja) tableColumn.push("Observación")
    else tableColumn.push("Devolución")
    
    const tableRows = []
    
    mov.detalles.forEach(d => {
      const row = [
        d.articulo_nombre,
        d.color_nombre,
        d.cantidad,
        d.stock_anterior,
        d.stock_posterior
      ]
      if (isBaja) row.push(d.observacion || '—')
      else row.push(d.requiere_devolucion ? 'DEVUELVE' : '—')
      
      tableRows.push(row)
    })
    
    autoTable(doc, {
      startY: 88,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [52, 73, 94] }
    })
    doc.save(`${mov.codigo}.pdf`)
  } else {
    // Header Actividad Simple
    doc.setFontSize(20)
    doc.setTextColor(40, 40, 40)
    doc.text(`Registro de Actividad`, 14, 22)
    
    doc.setFontSize(11)
    doc.setTextColor(100, 100, 100)
    doc.text(`Fecha: ${new Date(mov.created_at).toLocaleString('es-ES')}`, 14, 32)
    doc.text(`Tipo: ${mov.tipo}`, 14, 38)
    doc.text(`Módulo: ${mov.modulo}`, 14, 44)
    
    doc.setFontSize(12)
    doc.setTextColor(40, 40, 40)
    doc.text(`Responsable: ${mov.usuario_nombre || 'Sistema'}`, 14, 56)
    
    doc.text(`Descripción:`, 14, 66)
    doc.setFontSize(11)
    doc.setTextColor(80, 80, 80)
    
    const splitDesc = doc.splitTextToSize(mov.descripcion, 180)
    doc.text(splitDesc, 14, 74)
    
    doc.save(`Actividad_${mov.tipo}_${mov.id}.pdf`)
  }
  
  showExportModal.value = false
  showToast("El archivo se descargó correctamente.", "pdf")
}

function descargarExcel() {
  if (!selectedMov.value) return
  
  const mov = selectedMov.value
  const isMovimiento = selectedOrigen.value === 'movimiento'
  let resumen = []
  
  if (isMovimiento) {
    const isBaja = mov.tipo === 'BAJA'
    const isEntrada = mov.tipo === 'ENTRADA'
    
    resumen = [
      ["CÓDIGO", mov.codigo],
      ["TIPO", mov.tipo],
      ["FECHA", new Date(mov.fecha_movimiento).toLocaleString('es-ES')],
      ["ALMACÉN", mov.almacen_nombre],
      ['SOLICITANTE', `${mov.solicitante_nombre || '—'} ${mov.solicitante_ci ? '(CI: '+mov.solicitante_ci+')' : ''}`],
      ['RESPONSABLE', `${mov.usuario_nombres} ${mov.usuario_apellidos}`]
    ]
    
    if (isBaja) resumen.push(["MOTIVO DE BAJA", mov.motivo_baja || '—'])
    else resumen.push([isEntrada ? 'PROCEDENCIA' : 'DESTINO', mov.destino_procedencia || '—'])
    
    resumen.push(["OBSERVACIÓN", mov.observacion || 'Ninguna'])
    if (mov.paquete_nombre) resumen.push(["PAQUETE", mov.paquete_nombre])
    
    resumen.push([])
    resumen.push([])
    
    const tableHeader = ["Artículo", "Color", "Cantidad", "Stock Ant.", "Stock Post.", isBaja ? "Observación" : "Devolución"]
    resumen.push(tableHeader)
    
    mov.detalles.forEach(d => {
      resumen.push([
        d.articulo_nombre,
        d.color_nombre,
        d.cantidad,
        d.stock_anterior,
        d.stock_posterior,
        isBaja ? (d.observacion || '—') : (d.requiere_devolucion ? 'DEVUELVE' : '—')
      ])
    })
  } else {
    resumen = [
      ["REGISTRO DE ACTIVIDAD"],
      [],
      ["TIPO", mov.tipo],
      ["MÓDULO", mov.modulo],
      ["FECHA", new Date(mov.created_at).toLocaleString('es-ES')],
      ["RESPONSABLE", mov.usuario_nombre || 'Sistema'],
      ["DESCRIPCIÓN", mov.descripcion]
    ]
  }
  
  const ws = XLSX.utils.aoa_to_sheet(resumen)
  
  // Ajustar anchos
  const colWidths = []
  resumen.forEach(row => {
    row.forEach((cell, i) => {
      const cellValue = cell !== null && cell !== undefined ? cell.toString() : ''
      const cellLength = cellValue.length
      const width = Math.min(Math.max(cellLength + 4, 12), 60)
      if (!colWidths[i] || colWidths[i].wch < width) {
        colWidths[i] = { wch: width }
      }
    })
  })
  ws['!cols'] = colWidths
  
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Detalle")
  
  XLSX.writeFile(wb, isMovimiento ? `${mov.codigo}.xlsx` : `Actividad_${mov.tipo}_${mov.id}.xlsx`)
  showExportModal.value = false
  showToast("El archivo se descargó correctamente.", "excel")
}

async function fetchFullHistorial() {
  try {
    const params = {}
    if (filters.value.tipo) params.tipo = filters.value.tipo
    if (filters.value.modulo) params.modulo = filters.value.modulo
    if (filters.value.desde) params.desde = filters.value.desde
    if (filters.value.hasta) params.hasta = filters.value.hasta
    if (filters.value.search) params.search = filters.value.search
    params.limit = 99999
    params.offset = 0

    const res = await api.getActividades(params)
    return res.data
  } catch (error) {
    console.error("Error cargando historial completo:", error)
    showError("No se pudo obtener el historial para descargar.")
    return []
  }
}

async function descargarHistorialPDF() {
  const data = await fetchFullHistorial()
  if (!data || data.length === 0) {
    showError("No hay datos para exportar")
    return
  }
  
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(18)
  doc.setTextColor(40, 40, 40)
  doc.text("Reporte de Historial de Actividades", 14, 22)
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  let filterText = "Filtros aplicados: "
  const applied = []
  if (filters.value.desde || filters.value.hasta) applied.push(`Fechas: ${filters.value.desde || 'Inicio'} a ${filters.value.hasta || 'Fin'}`)
  if (filters.value.tipo) applied.push(`Tipo: ${filters.value.tipo}`)
  if (filters.value.modulo) applied.push(`Módulo: ${filters.value.modulo}`)
  if (filters.value.search) applied.push(`Búsqueda: "${filters.value.search}"`)
  
  filterText += applied.length > 0 ? applied.join(" | ") : "Ninguno (Historial Completo)"
  const splitFilter = doc.splitTextToSize(filterText, 180)
  doc.text(splitFilter, 14, 30)
  
  // Table
  const tableColumn = ["Fecha", "Tipo", "Módulo", "Descripción", "Responsable"]
  const tableRows = data.map(m => [
    new Date(m.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' }),
    m.tipo,
    m.modulo,
    m.descripcion,
    m.usuario_nombre || 'Sistema'
  ])
  
  autoTable(doc, {
    startY: 38 + (splitFilter.length - 1) * 5,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [52, 73, 94] }
  })
  
  doc.save(`Historial_Actividades.pdf`)
  showExportModal.value = false
  showToast("El archivo se descargó correctamente.", "pdf")
}

async function descargarHistorialExcel() {
  const data = await fetchFullHistorial()
  if (!data || data.length === 0) {
    showError("No hay datos para exportar")
    return
  }
  
  const resumen = []
  
  // Header
  resumen.push(["REPORTE DE HISTORIAL DE ACTIVIDADES"])
  resumen.push([])
  
  let filterText = "Filtros aplicados: "
  const applied = []
  if (filters.value.desde || filters.value.hasta) applied.push(`Fechas: ${filters.value.desde || 'Inicio'} a ${filters.value.hasta || 'Fin'}`)
  if (filters.value.tipo) applied.push(`Tipo: ${filters.value.tipo}`)
  if (filters.value.modulo) applied.push(`Módulo: ${filters.value.modulo}`)
  if (filters.value.search) applied.push(`Búsqueda: "${filters.value.search}"`)
  filterText += applied.length > 0 ? applied.join(" | ") : "Ninguno (Historial Completo)"
  
  resumen.push([filterText])
  resumen.push([])
  
  // Tabla
  const tableHeader = ["Fecha", "Tipo", "Módulo", "Descripción", "Responsable"]
  resumen.push(tableHeader)
  
  data.forEach(m => {
    resumen.push([
      new Date(m.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' }),
      m.tipo,
      m.modulo,
      m.descripcion,
      m.usuario_nombre || 'Sistema'
    ])
  })
  
  const ws = XLSX.utils.aoa_to_sheet(resumen)
  
  // Ajustar anchos
  const colWidths = []
  resumen.forEach(row => {
    row.forEach((cell, i) => {
      const cellValue = cell !== null && cell !== undefined ? cell.toString() : ''
      const cellLength = cellValue.length
      const width = Math.min(Math.max(cellLength + 4, 12), 60)
      if (!colWidths[i] || colWidths[i].wch < width) {
        colWidths[i] = { wch: width }
      }
    })
  })
  ws['!cols'] = colWidths
  
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Historial")
  
  XLSX.writeFile(wb, `Historial_Actividades.xlsx`)
  showExportModal.value = false
  showToast("El archivo se descargó correctamente.", "excel")
}
</script>

<style scoped>
.badge-info {
  background: rgba(49, 130, 206, 0.15);
  color: #3182ce;
}
.badge-purple {
  background: rgba(128, 90, 213, 0.15);
  color: #805ad5;
}
.badge-dark {
  background: rgba(74, 85, 104, 0.15);
  color: #4a5568;
}
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
