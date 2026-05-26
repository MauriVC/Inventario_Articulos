<template>
  <div>
    <!-- Filters -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <input type="date" v-model="filters.desde" class="form-input" style="width: 160px;" />
        <span class="text-muted text-sm">hasta</span>
        <input type="date" v-model="filters.hasta" class="form-input" style="width: 160px;" />
        <select v-model="filters.tipo" class="form-select" style="width: 140px;">
          <option value="">Tipo: Todos</option>
          <option value="SALIDA">Salida</option>
          <option value="ENTRADA">Entrada</option>
        </select>
        <select v-model="filters.almacen" class="form-select" style="width: 180px;">
          <option value="">Almacén: Todos</option>
          <option>Almacén Central</option>
          <option>Almacén Norte</option>
          <option>Almacén Laboratorio</option>
        </select>
        <div class="form-input-icon">
          <Search :size="16" />
          <input v-model="filters.search" type="text" class="form-input" placeholder="Buscar código o solicitante..." style="width: 240px;" />
        </div>
      </div>
      <button class="btn btn-outline">
        <FileDown :size="16" />
        Exportar PDF
      </button>
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
              <tr v-for="m in filteredMovimientos" :key="m.codigo">
                <td class="font-semibold" :style="{ color: m.tipo === 'SALIDA' ? 'var(--color-danger)' : 'var(--color-success)' }">{{ m.codigo }}</td>
                <td>
                  <span class="badge" :class="m.tipo === 'SALIDA' ? 'badge-danger' : 'badge-success'">
                    <component :is="m.tipo === 'SALIDA' ? ArrowUpFromLine : ArrowDownToLine" :size="12" />
                    {{ m.tipo }}
                  </span>
                </td>
                <td>{{ m.almacen }}</td>
                <td class="font-medium">{{ m.solicitante }}</td>
                <td class="text-muted text-sm">{{ m.ci }}</td>
                <td>{{ m.destino }}</td>
                <td class="text-center">
                  <span class="badge badge-primary">{{ m.totalArticulos }}</span>
                </td>
                <td class="text-muted text-sm">{{ m.fecha }}</td>
                <td>
                  <button class="btn btn-ghost btn-icon" title="Ver detalle" @click="selectedMov = m">
                    <Eye :size="16" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <span class="pagination-info">Mostrando 1-10 de 156 registros</span>
          <div class="pagination-buttons">
            <button class="pagination-btn">&laquo;</button>
            <button class="pagination-btn active">1</button>
            <button class="pagination-btn">2</button>
            <button class="pagination-btn">3</button>
            <button class="pagination-btn">...</button>
            <button class="pagination-btn">16</button>
            <button class="pagination-btn">&raquo;</button>
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
            <span class="badge" :class="selectedMov.tipo === 'SALIDA' ? 'badge-danger' : 'badge-success'">{{ selectedMov.tipo }}</span>
          </div>
          <button class="btn btn-ghost btn-icon" @click="selectedMov = null"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="grid-2 mb-4">
            <div><span class="text-sm text-muted">Código</span><p class="font-semibold">{{ selectedMov.codigo }}</p></div>
            <div><span class="text-sm text-muted">Fecha</span><p class="font-medium">{{ selectedMov.fecha }}</p></div>
            <div><span class="text-sm text-muted">Solicitante</span><p class="font-medium">{{ selectedMov.solicitante }} (CI: {{ selectedMov.ci }})</p></div>
            <div><span class="text-sm text-muted">{{ selectedMov.tipo === 'SALIDA' ? 'Destino' : 'Procedencia' }}</span><p class="font-medium">{{ selectedMov.destino }}</p></div>
            <div><span class="text-sm text-muted">Almacén</span><p class="font-medium">{{ selectedMov.almacen }}</p></div>
            <div><span class="text-sm text-muted">Registrado por</span><p class="font-medium">Juan C. Pérez</p></div>
          </div>

          <h3 class="font-semibold mb-3" style="font-size: var(--font-size-base); color: var(--color-gray-700);">Artículos del movimiento</h3>
          <table class="table">
            <thead>
              <tr><th>Artículo</th><th>Color</th><th>Cantidad</th><th>Stock Ant.</th><th>Stock Post.</th></tr>
            </thead>
            <tbody>
              <tr v-for="d in selectedMov.detalles" :key="d.nombre">
                <td class="font-medium">{{ d.nombre }}</td>
                <td>
                  <div class="flex items-center gap-2">
                    <span class="color-dot" :style="{ background: d.hex, width: '14px', height: '14px' }"></span>
                    {{ d.color }}
                  </div>
                </td>
                <td class="font-semibold text-center">{{ d.cantidad }}</td>
                <td class="text-center text-muted">{{ d.stockAnt }}</td>
                <td class="text-center font-medium">{{ d.stockPost }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline"><FileDown :size="16" /> Exportar</button>
          <button class="btn btn-secondary" @click="selectedMov = null">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search, FileDown, Eye, ArrowUpFromLine, ArrowDownToLine, X } from 'lucide-vue-next'

const selectedMov = ref(null)
const filters = ref({ desde: '', hasta: '', tipo: '', almacen: '', search: '' })

const movimientos = ref([
  { codigo: 'SAL-2026-0012', tipo: 'SALIDA', almacen: 'Almacén Central', solicitante: 'Carlos Pérez', ci: '12345678', destino: 'Aula 3A', totalArticulos: 3, fecha: '26/05/2026 10:30',
    detalles: [ { nombre: 'Cuaderno 100h', color: 'Azul', hex: '#007bff', cantidad: 10, stockAnt: 200, stockPost: 190 }, { nombre: 'Cuaderno 100h', color: 'Rojo', hex: '#dc3545', cantidad: 5, stockAnt: 150, stockPost: 145 }, { nombre: 'Folder Oficio', color: 'Azul', hex: '#007bff', cantidad: 20, stockAnt: 50, stockPost: 30 }]
  },
  { codigo: 'ENT-2026-0008', tipo: 'ENTRADA', almacen: 'Almacén Central', solicitante: 'María López', ci: '87654321', destino: 'Laboratorio', totalArticulos: 2, fecha: '26/05/2026 09:15',
    detalles: [ { nombre: 'Cuaderno 100h', color: 'Azul', hex: '#007bff', cantidad: 8, stockAnt: 190, stockPost: 198 }, { nombre: 'Folder Oficio', color: 'Azul', hex: '#007bff', cantidad: 15, stockAnt: 30, stockPost: 45 }]
  },
  { codigo: 'SAL-2026-0011', tipo: 'SALIDA', almacen: 'Almacén Norte', solicitante: 'Pedro Gómez', ci: '11223344', destino: 'Taller Mecánica', totalArticulos: 5, fecha: '25/05/2026 16:45',
    detalles: [ { nombre: 'Martillo Carpintero', color: 'Mango Rojo', hex: '#dc3545', cantidad: 2, stockAnt: 15, stockPost: 13 }, { nombre: 'Pintura Latex 1L', color: 'Blanco', hex: '#ffffff', cantidad: 3, stockAnt: 50, stockPost: 47 }]
  },
  { codigo: 'ENT-2026-0007', tipo: 'ENTRADA', almacen: 'Almacén Central', solicitante: 'Ana Torres', ci: '55667788', destino: 'Dirección', totalArticulos: 1, fecha: '25/05/2026 14:20',
    detalles: [ { nombre: 'Resma Papel Bond', color: 'S/N', hex: '#e9ecef', cantidad: 5, stockAnt: 115, stockPost: 120 }]
  },
  { codigo: 'SAL-2026-0010', tipo: 'SALIDA', almacen: 'Almacén Central', solicitante: 'Luis Mamani', ci: '99001122', destino: 'Sala de Profesores', totalArticulos: 4, fecha: '25/05/2026 11:00',
    detalles: [ { nombre: 'Cuaderno 50h', color: 'Amarillo', hex: '#ffc107', cantidad: 20, stockAnt: 300, stockPost: 280 }]
  },
  { codigo: 'SAL-2026-0009', tipo: 'SALIDA', almacen: 'Almacén Norte', solicitante: 'Roberto Quispe', ci: '33445566', destino: 'Cancha Deportiva', totalArticulos: 2, fecha: '24/05/2026 15:30',
    detalles: [ { nombre: 'Pintura Latex 1L', color: 'Azul', hex: '#007bff', cantidad: 5, stockAnt: 30, stockPost: 25 }]
  },
  { codigo: 'ENT-2026-0006', tipo: 'ENTRADA', almacen: 'Almacén Norte', solicitante: 'Pedro Gómez', ci: '11223344', destino: 'Taller Mecánica', totalArticulos: 2, fecha: '24/05/2026 09:00',
    detalles: [ { nombre: 'Martillo Carpintero', color: 'Mango Rojo', hex: '#dc3545', cantidad: 2, stockAnt: 13, stockPost: 15 }]
  },
  { codigo: 'SAL-2026-0008', tipo: 'SALIDA', almacen: 'Almacén Central', solicitante: 'Carmen Flores', ci: '77889900', destino: 'Aula 5B', totalArticulos: 3, fecha: '23/05/2026 10:15',
    detalles: []
  }
])

const filteredMovimientos = computed(() => {
  return movimientos.value.filter(m => {
    const matchTipo = !filters.value.tipo || m.tipo === filters.value.tipo
    const matchAlmacen = !filters.value.almacen || m.almacen === filters.value.almacen
    const matchSearch = !filters.value.search || m.codigo.toLowerCase().includes(filters.value.search.toLowerCase()) || m.solicitante.toLowerCase().includes(filters.value.search.toLowerCase())
    return matchTipo && matchAlmacen && matchSearch
  })
})
</script>
