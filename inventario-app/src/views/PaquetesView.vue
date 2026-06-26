<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <p class="text-muted">Crea paquetes personalizados de artículos para enviar a los solicitantes</p>
      <button class="btn btn-primary" @click="openModal">
        <Plus :size="18" /> Nuevo Paquete
      </button>
    </div>

    <!-- Paquetes Grid -->
    <div class="paquetes-grid" v-if="paquetes.length > 0">
      <div class="paquete-card" v-for="paq in paquetes" :key="paq.id">
        <div class="paquete-card-header">
          <div class="flex items-center gap-2">
            <Boxes :size="20" class="paquete-icon" />
            <h3 class="paquete-name">{{ paq.nombre }}</h3>
          </div>
          <span class="badge" :class="paq.categoria === 'Mixta' ? 'badge-warning' : 'badge-primary'">
            {{ paq.categoria }}
          </span>
        </div>
        <div class="paquete-card-body">
          <div class="paquete-item" v-for="(item, i) in paq.items" :key="i">
            <span class="paquete-item-qty">{{ item.cantidad }}x</span>
            <span class="paquete-item-name">{{ item.nombre }}</span>
          </div>
        </div>
        <div class="paquete-card-footer">
          <span class="text-xs text-muted">{{ paq.items.length }} artículo{{ paq.items.length !== 1 ? 's' : '' }} · {{ totalItems(paq) }} unidades</span>
          <div class="flex gap-1" v-if="auth.isAdmin">
            <button class="btn btn-ghost btn-icon" title="Editar"><Pencil :size="15" /></button>
            <button class="btn btn-ghost btn-icon" title="Eliminar"><Trash2 :size="15" style="color: var(--color-danger);" /></button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div class="card" v-else>
      <div class="empty-state">
        <Boxes :size="48" />
        <p>No hay paquetes creados</p>
        <button class="btn btn-primary" @click="openModal"><Plus :size="16" /> Crear primer paquete</button>
      </div>
    </div>

    <!-- Create Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h2>Nuevo Paquete</h2>
          <button class="btn btn-ghost btn-icon" @click="showModal = false"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <!-- Info -->
          <div class="grid-2 mb-4">
            <div class="form-group">
              <label class="form-label">Nombre del Paquete *</label>
              <input v-model="form.nombre" type="text" class="form-input" placeholder="Ej: Paquete Cuadernos" />
            </div>
            <div class="form-group">
              <label class="form-label">Categoría *</label>
              <select v-model="form.categoria" class="form-select">
                <option v-for="c in categoriasConMixta" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Observación</label>
            <input v-model="form.observacion" type="text" class="form-input" placeholder="Descripción opcional del paquete" />
          </div>

          <!-- Cart: Article Picker -->
          <div class="cart-section">
            <h3 class="section-title"><ShoppingCart :size="16" /> Contenido del Paquete</h3>
            <p class="text-sm text-muted mb-3">Busca artículos y agrégalos al paquete con la cantidad deseada.</p>

            <!-- Search -->
            <div class="cart-search-row mb-3">
              <div class="form-input-icon" style="flex: 1;">
                <Search :size="16" />
                <input v-model="busqueda" type="text" class="form-input" placeholder="Buscar artículo por nombre o código..." @focus="showResults = true" />
              </div>
            </div>

            <!-- Search Results Dropdown -->
            <div class="cart-results" v-if="busqueda.length > 0 && showResults && resultados.length > 0">
              <div class="cart-result-item" v-for="r in resultados" :key="r.id" @click="agregarAlCarrito(r)">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ r.nombre }}</span>
                  <span class="badge badge-primary" style="font-size: 9px;">{{ r.categoria }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-muted">Stock: {{ r.stock }}</span>
                  <Plus :size="14" class="cart-add-icon" />
                </div>
              </div>
            </div>
            <div class="cart-results cart-no-results" v-if="busqueda.length > 1 && resultados.length === 0">
              <p class="text-sm text-muted" style="padding: var(--space-3) var(--space-4);">No se encontraron artículos</p>
            </div>

            <!-- Cart Items Table -->
            <div class="cart-items" v-if="carrito.length > 0">
              <table class="table">
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th>Categoría</th>
                    <th style="width: 120px; text-align: center;">Cantidad</th>
                    <th style="width: 50px;"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, i) in carrito" :key="i">
                    <td class="font-medium">{{ item.nombre }}</td>
                    <td><span class="badge badge-primary" style="font-size: 10px;">{{ item.categoria }}</span></td>
                    <td>
                      <div class="qty-control">
                        <button class="qty-btn" @click="decrementQty(i)"><Minus :size="14" /></button>
                        <input v-model.number="item.cantidad" type="number" min="1" class="qty-input" />
                        <button class="qty-btn" @click="item.cantidad++"><Plus :size="14" /></button>
                      </div>
                    </td>
                    <td>
                      <button class="btn btn-ghost btn-icon" @click="carrito.splice(i, 1)">
                        <X :size="16" style="color: var(--color-danger);" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="cart-summary">
                <span class="text-sm text-muted">{{ carrito.length }} artículo{{ carrito.length !== 1 ? 's' : '' }}</span>
                <span class="font-semibold">Total: {{ totalCarrito }} unidades</span>
              </div>
            </div>

            <!-- Empty Cart -->
            <div class="cart-empty" v-else>
              <ShoppingCart :size="32" />
              <p class="text-sm text-muted">Busca y agrega artículos al paquete</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="guardarPaquete" :disabled="!canSave">
            <Save :size="16" /> Guardar Paquete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plus, Pencil, Trash2, X, Save, Search, Boxes, ShoppingCart, Minus } from 'lucide-vue-next'
import { auth } from '@/auth'

const showModal = ref(false)
const busqueda = ref('')
const showResults = ref(false)

const categorias = ref(['Cuadernos', 'Hojas y Papelería', 'Pinturas', 'Herramientas', 'Mat. Construcción', 'EPP'])
const categoriasConMixta = computed(() => [...categorias.value, 'Mixta'])

const form = ref({ nombre: '', categoria: 'Mixta', observacion: '' })
const carrito = ref([])

const articulosDisponibles = ref([
  { id: 1, nombre: 'Cuaderno 100h Tapa Dura', categoria: 'Cuadernos', stock: 430 },
  { id: 2, nombre: 'Cuaderno 50h Económico', categoria: 'Cuadernos', stock: 600 },
  { id: 3, nombre: 'Pintura Latex 1L', categoria: 'Pinturas', stock: 105 },
  { id: 4, nombre: 'Martillo Carpintero', categoria: 'Herramientas', stock: 35 },
  { id: 5, nombre: 'Fierro Corrugado 3/8', categoria: 'Mat. Construcción', stock: 500 },
  { id: 6, nombre: 'Folder Oficio', categoria: 'Hojas y Papelería', stock: 95 },
  { id: 7, nombre: 'Resma Papel Bond Carta', categoria: 'Hojas y Papelería', stock: 120 },
  { id: 8, nombre: 'Destornillador Phillips', categoria: 'Herramientas', stock: 40 },
  { id: 9, nombre: 'Cinta Métrica 5m', categoria: 'Herramientas', stock: 25 },
  { id: 10, nombre: 'Lápiz HB', categoria: 'Cuadernos', stock: 500 },
  { id: 11, nombre: 'Clavos 2 pulgadas (100u)', categoria: 'Mat. Construcción', stock: 300 },
  { id: 12, nombre: 'Casco de Seguridad', categoria: 'EPP', stock: 50 }
])

const resultados = computed(() => {
  if (!busqueda.value || busqueda.value.length < 1) return []
  return articulosDisponibles.value.filter(a =>
    a.nombre.toLowerCase().includes(busqueda.value.toLowerCase())
  )
})

function agregarAlCarrito(art) {
  const existing = carrito.value.find(c => c.id === art.id)
  if (existing) {
    existing.cantidad++
  } else {
    carrito.value.push({ ...art, cantidad: 1 })
  }
  busqueda.value = ''
  showResults.value = false
}

function decrementQty(i) {
  if (carrito.value[i].cantidad > 1) carrito.value[i].cantidad--
}

const totalCarrito = computed(() => carrito.value.reduce((sum, c) => sum + c.cantidad, 0))
const canSave = computed(() => form.value.nombre.trim() && carrito.value.length > 0)

// Demo paquetes
const paquetes = ref([
  {
    id: 1, nombre: 'Paquete Cuadernos', categoria: 'Cuadernos',
    items: [
      { nombre: 'Cuaderno 100h Tapa Dura', cantidad: 10 },
      { nombre: 'Cuaderno 50h Económico', cantidad: 10 }
    ]
  },
  {
    id: 2, nombre: 'Paquete Carpintería', categoria: 'Mixta',
    items: [
      { nombre: 'Martillo Carpintero', cantidad: 1 },
      { nombre: 'Clavos 2 pulgadas (100u)', cantidad: 50 },
      { nombre: 'Cuaderno 100h Tapa Dura', cantidad: 1 },
      { nombre: 'Lápiz HB', cantidad: 1 },
      { nombre: 'Cinta Métrica 5m', cantidad: 1 }
    ]
  },
  {
    id: 3, nombre: 'Paquete EPP Básico', categoria: 'EPP',
    items: [
      { nombre: 'Casco de Seguridad', cantidad: 1 }
    ]
  }
])

function totalItems(paq) {
  return paq.items.reduce((sum, i) => sum + i.cantidad, 0)
}

function openModal() {
  form.value = { nombre: '', categoria: 'Mixta', observacion: '' }
  carrito.value = []
  busqueda.value = ''
  showModal.value = true
}

function guardarPaquete() {
  if (!canSave.value) return
  paquetes.value.push({
    id: Date.now(),
    nombre: form.value.nombre,
    categoria: form.value.categoria,
    items: carrito.value.map(c => ({ nombre: c.nombre, cantidad: c.cantidad }))
  })
  showModal.value = false
}
</script>

<style scoped>
/* Paquetes Grid */
.paquetes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-4);
}
.paquete-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-gray-200);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: all var(--transition-base);
}
.paquete-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.paquete-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-gray-100);
  background: var(--color-gray-50);
}
.paquete-icon { color: var(--color-primary); }
.paquete-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-gray-800);
}
.paquete-card-body {
  padding: var(--space-3) var(--space-5);
  max-height: 180px;
  overflow-y: auto;
}
.paquete-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) 0;
  font-size: var(--font-size-sm);
  color: var(--color-gray-700);
}
.paquete-item + .paquete-item {
  border-top: 1px solid var(--color-gray-50);
}
.paquete-item-qty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  padding: 1px 6px;
  background: var(--color-primary-lightest);
  color: var(--color-primary-dark);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--font-size-xs);
}
.paquete-item-name { font-weight: 400; }
.paquete-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-gray-100);
}

/* Section Title */
.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
  color: var(--color-gray-700);
  font-size: var(--font-size-base);
  margin-bottom: var(--space-2);
}

/* Cart Section */
.cart-section {
  background: var(--color-gray-50);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  border: 1px solid var(--color-gray-200);
}
.cart-search-row {
  display: flex;
  gap: var(--space-3);
}
.cart-results {
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  margin-bottom: var(--space-3);
  max-height: 200px;
  overflow-y: auto;
}
.cart-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.cart-result-item:hover {
  background: var(--color-primary-lightest);
}
.cart-result-item + .cart-result-item {
  border-top: 1px solid var(--color-gray-100);
}
.cart-add-icon {
  color: var(--color-primary);
  opacity: 0;
  transition: opacity var(--transition-fast);
}
.cart-result-item:hover .cart-add-icon { opacity: 1; }
.cart-items {
  background: var(--color-white);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-gray-200);
  overflow: hidden;
}
.cart-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-gray-100);
  background: var(--color-gray-50);
}

/* Qty Control */
.qty-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  overflow: hidden;
  width: fit-content;
  margin: 0 auto;
}
.qty-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: var(--color-gray-50);
  color: var(--color-gray-600);
  transition: all var(--transition-fast);
  cursor: pointer;
  border: none;
}
.qty-btn:hover {
  background: var(--color-primary-lightest);
  color: var(--color-primary);
}
.qty-input {
  width: 44px;
  height: 30px;
  text-align: center;
  border: none;
  border-left: 1px solid var(--color-gray-300);
  border-right: 1px solid var(--color-gray-300);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-gray-800);
  outline: none;
  -moz-appearance: textfield;
}
.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Empty Cart */
.cart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6);
  color: var(--color-gray-400);
}
</style>
