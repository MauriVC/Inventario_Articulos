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
                <span class="datetime-date">26 de Mayo, 2026</span>
                <span class="datetime-time">23:45:00</span>
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
        <!-- Search & Add -->
        <div class="add-article-bar mb-4">
          <div class="form-input-icon flex-1">
            <Search :size="16" />
            <input type="text" class="form-input" placeholder="Buscar artículo por nombre o código..." v-model="articuloSearch" />
          </div>
        </div>

        <!-- Search Results Dropdown -->
        <div class="search-results" v-if="articuloSearch.length > 0">
          <div class="search-result-item" v-for="a in searchResults" :key="a.id" @click="addArticulo(a)">
            <span class="font-medium">{{ a.nombre }}</span>
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
                <th>Cantidad a Retirar</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in items" :key="i">
                <td class="font-medium">{{ item.nombre }}</td>
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
          <p>Busca y agrega artículos para la salida</p>
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
import { Search, Calendar, ArrowUpFromLine, Package, X } from 'lucide-vue-next'

const solicitante = ref({ carnet: '', nombre: '', telefono: '' })
const solicitanteEncontrado = ref(false)
const destino = ref('')
const observacion = ref('')
const articuloSearch = ref('')

const items = ref([
  { nombre: 'Cuaderno 100h Tapa Dura', colorNombre: 'Azul', hex: '#007bff', stockDisponible: 200, cantidad: 10 },
  { nombre: 'Cuaderno 100h Tapa Dura', colorNombre: 'Rojo', hex: '#dc3545', stockDisponible: 150, cantidad: 5 },
  { nombre: 'Folder Oficio', colorNombre: 'Azul', hex: '#007bff', stockDisponible: 50, cantidad: 20 }
])

const allArticulos = ref([
  { id: 1, nombre: 'Pintura Latex 1L', colorNombre: 'Blanco', hex: '#ffffff', stock: 50 },
  { id: 2, nombre: 'Fierro Corrugado 3/8', colorNombre: 'S/N', hex: '#e9ecef', stock: 500 },
  { id: 3, nombre: 'Resma Papel Bond Carta', colorNombre: 'S/N', hex: '#e9ecef', stock: 120 },
  { id: 4, nombre: 'Martillo Carpintero', colorNombre: 'Mango Rojo', hex: '#dc3545', stock: 15 }
])

const searchResults = computed(() => {
  if (!articuloSearch.value) return []
  return allArticulos.value.filter(a => a.nombre.toLowerCase().includes(articuloSearch.value.toLowerCase()))
})

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
  items.value.push({ nombre: a.nombre, colorNombre: a.colorNombre, hex: a.hex, stockDisponible: a.stock, cantidad: 1 })
  articuloSearch.value = ''
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
