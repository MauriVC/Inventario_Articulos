<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <span class="mov-type-badge mov-entrada"><ArrowDownToLine :size="18" /> ENTRADA</span>
        <select class="form-select" style="width: 220px;">
          <option>Almacén Central</option>
          <option>Almacén Norte</option>
          <option>Almacén Laboratorio</option>
        </select>
      </div>
      <span class="text-muted text-sm">Código: <strong style="color: var(--color-success);">ENT-2026-0009</strong> (Auto-generado)</span>
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
                <input v-model="solicitante.carnet" type="text" class="form-input" placeholder="Buscar por carnet..." />
              </div>
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
                <span class="datetime-date">26 de Mayo, 2026</span>
                <span class="datetime-time">23:55:00</span>
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

        <div class="search-results" v-if="articuloSearch.length > 0">
          <div class="search-result-item" v-for="a in searchResults" :key="a.id" @click="addArticulo(a)">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ a.nombre }}</span>
              <span class="badge badge-warning" v-if="a.esPaquete" style="font-size: 10px;">📦 PAQUETE</span>
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
              <template v-for="(item, i) in items" :key="i">
                <tr :class="{ 'paquete-row': item.esPaquete }">
                  <td>
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{{ item.nombre }}</span>
                      <span class="badge badge-warning" v-if="item.esPaquete" style="font-size: 10px;">📦 PAQUETE</span>
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
                    <input v-model.number="item.cantidad" type="number" min="1" class="form-input" style="width: 100px; text-align: center;" />
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
                <!-- Package components -->
                <tr v-if="item.esPaquete && item.componentes" class="componentes-row">
                  <td colspan="6">
                    <div class="componentes-detail">
                      <span class="componentes-label">Se ingresarán a stock los siguientes componentes:</span>
                      <div class="componentes-list">
                        <span class="componente-chip" v-for="c in item.componentes" :key="c.nombre">
                          <span class="color-dot" :style="{ background: c.hex, width: '10px', height: '10px' }"></span>
                          {{ c.nombre }} ({{ c.color }}) ×{{ c.cantPorPaquete * item.cantidad }}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
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
      <button class="btn btn-success btn-lg" :disabled="items.length === 0">
        <ArrowDownToLine :size="18" />
        Registrar Entrada
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search, Calendar, ArrowDownToLine, Package, X } from 'lucide-vue-next'

const solicitante = ref({ carnet: '', nombre: '', telefono: '' })
const procedencia = ref('')
const observacion = ref('')
const articuloSearch = ref('')

const items = ref([
  { nombre: 'Cuaderno 100h Tapa Dura', colorNombre: 'Azul', hex: '#007bff', stockActual: 190, cantidad: 8, observacion: 'Buen estado' },
  { nombre: 'Folder Oficio', colorNombre: 'Azul', hex: '#007bff', stockActual: 30, cantidad: 15, observacion: '2 dañados' }
])

const allArticulos = ref([
  { id: 1, nombre: 'Cuaderno 100h Tapa Dura', colorNombre: 'Rojo', hex: '#dc3545', stock: 145, esPaquete: false },
  { id: 2, nombre: 'Pintura Latex 1L', colorNombre: 'Blanco', hex: '#ffffff', stock: 48, esPaquete: false },
  { id: 3, nombre: 'Martillo Carpintero', colorNombre: 'Mango Negro', hex: '#343a40', stock: 20, esPaquete: false },
  { id: 4, nombre: 'Paquete Escolar Básico', colorNombre: 'S/N', hex: '#e9ecef', stock: 25, esPaquete: true }
])

const searchResults = computed(() => {
  if (!articuloSearch.value) return []
  return allArticulos.value.filter(a => a.nombre.toLowerCase().includes(articuloSearch.value.toLowerCase()))
})

function addArticulo(a) {
  const item = { nombre: a.nombre, colorNombre: a.colorNombre, hex: a.hex, stockActual: a.stock, cantidad: 1, observacion: '', esPaquete: a.esPaquete || false, componentes: null }
  if (a.esPaquete) {
    item.componentes = [
      { nombre: 'Cuaderno 100h', color: 'Azul', hex: '#007bff', cantPorPaquete: 5 },
      { nombre: 'Folder Oficio', color: 'Rojo', hex: '#dc3545', cantPorPaquete: 3 },
      { nombre: 'Lápiz HB', color: 'S/N', hex: '#e9ecef', cantPorPaquete: 2 }
    ]
  }
  items.value.push(item)
  articuloSearch.value = ''
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

/* Package support */
.paquete-row { background: rgba(56, 161, 105, 0.04); }
.componentes-row td { padding: 0 !important; background: rgba(56, 161, 105, 0.06); }
.componentes-detail { padding: var(--space-2) var(--space-6); }
.componentes-label { font-size: var(--font-size-xs); color: #276749; font-weight: 500; margin-right: var(--space-2); }
.componentes-list { display: inline-flex; flex-wrap: wrap; gap: var(--space-2); }
.componente-chip {
  display: inline-flex; align-items: center; gap: var(--space-1);
  padding: 1px 8px; background: var(--color-white); border: 1px solid var(--color-success-light);
  border-radius: var(--radius-full); font-size: 11px;
}
</style>
