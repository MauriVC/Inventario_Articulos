<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <select v-model="selectedAlmacen" class="form-select" style="width: 220px;">
          <option value="">Todos los almacenes</option>
          <option v-for="a in almacenes" :key="a.id" :value="a.id">{{ a.nombre }}</option>
        </select>
        <select v-model="selectedCategoria" class="form-select" style="width: 180px;">
          <option value="">Categoría</option>
          <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
        </select>
        <select v-model="selectedMarca" class="form-select" style="width: 160px;">
          <option value="">Marca</option>
          <option v-for="m in marcas" :key="m" :value="m">{{ m }}</option>
        </select>
        <div class="form-input-icon">
          <Search :size="16" />
          <input v-model="search" type="text" class="form-input" placeholder="Buscar artículo..." style="width: 220px;" />
        </div>
      </div>
      <button class="btn btn-primary" @click="showModal = true">
        <Plus :size="18" />
        Nuevo Artículo
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
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Marca</th>
                <th>Unidad</th>
                <th>Variantes</th>
                <th>Stock Total</th>
                <th>Almacén</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="art in filteredArticulos" :key="art.id">
              <tr>
                <td class="font-semibold text-primary">{{ art.codigo }}</td>
                <td class="font-medium">{{ art.nombre }}</td>
                <td>{{ art.categoria }}</td>
                <td>{{ art.marca || '—' }}</td>
                <td>{{ art.unidad }}</td>
                <td>
                  <div class="color-dots">
                    <span
                      v-for="v in art.variantes"
                      :key="v.color"
                      class="color-dot"
                      :style="{ background: v.hex }"
                      :title="v.color + ': ' + v.stock"
                    ></span>
                  </div>
                </td>
                <td class="font-semibold text-center">{{ art.stockTotal }}</td>
                <td class="text-sm">{{ art.almacen }}</td>
                <td>
                  <span class="badge" :class="art.estado === 'Activo' ? 'badge-success' : 'badge-danger'">
                    {{ art.estado }}
                  </span>
                </td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-ghost btn-icon" title="Ver variantes" @click="toggleExpand(art.id)">
                      <ChevronDown :size="16" :class="{ 'rotate-180': expandedId === art.id }" style="transition: transform 0.2s;" />
                    </button>
                    <button class="btn btn-ghost btn-icon" title="Editar">
                      <Pencil :size="16" />
                    </button>
                    <button class="btn btn-ghost btn-icon" title="Eliminar">
                      <Trash2 :size="16" style="color: var(--color-danger);" />
                    </button>
                  </div>
                </td>
              </tr>
              <!-- Expanded Variants Row -->
              <tr v-if="expandedId === art.id" class="expanded-row">
                <td colspan="10">
                  <div class="variants-detail">
                    <div class="variant-item" v-for="v in art.variantes" :key="v.color">
                      <span class="color-dot" :style="{ background: v.hex }"></span>
                      <span class="font-medium">{{ v.color }}</span>
                      <span class="text-muted">Stock: <strong>{{ v.stock }}</strong></span>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
            </tbody>
          </table>
        </div>
        <!-- Pagination -->
        <div class="pagination">
          <span class="pagination-info">Mostrando 1-8 de 847 artículos</span>
          <div class="pagination-buttons">
            <button class="pagination-btn">&laquo;</button>
            <button class="pagination-btn active">1</button>
            <button class="pagination-btn">2</button>
            <button class="pagination-btn">3</button>
            <button class="pagination-btn">...</button>
            <button class="pagination-btn">106</button>
            <button class="pagination-btn">&raquo;</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h2>Nuevo Artículo</h2>
          <button class="btn btn-ghost btn-icon" @click="showModal = false"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="grid-2 mb-4">
            <div class="form-group">
              <label class="form-label">Almacén *</label>
              <select class="form-select">
                <option v-for="a in almacenes" :key="a.id">{{ a.nombre }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Código</label>
              <input type="text" class="form-input" placeholder="Auto-generado o manual" />
            </div>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Nombre del artículo *</label>
            <input type="text" class="form-input" placeholder="Ej: Cuaderno 100 hojas Tapa Dura" />
          </div>
          <div class="grid-3 mb-4">
            <div class="form-group">
              <label class="form-label">Categoría *</label>
              <select class="form-select">
                <option v-for="c in categorias" :key="c">{{ c }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Marca</label>
              <select class="form-select">
                <option value="">Sin marca</option>
                <option v-for="m in marcas" :key="m">{{ m }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Unidad de Medida *</label>
              <select class="form-select">
                <option>Unidad</option>
                <option>Litro</option>
                <option>Kilogramo</option>
                <option>Metro</option>
              </select>
            </div>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Descripción</label>
            <textarea class="form-input" placeholder="Descripción adicional..."></textarea>
          </div>

          <!-- Color Variants Section -->
          <div class="variants-section">
            <h3 class="font-semibold mb-3" style="color: var(--color-gray-700);">Variantes por Color</h3>
            <p class="text-sm text-muted mb-4">Selecciona los colores disponibles y asigna el stock inicial para cada uno. Si no seleccionas ninguno, se asignará automáticamente "S/N".</p>
            <div class="variant-grid">
              <div
                v-for="c in availableColors"
                :key="c.nombre"
                class="variant-color-option"
                :class="{ selected: c.selected }"
                @click="c.selected = !c.selected"
              >
                <span class="color-dot" :style="{ background: c.hex }"></span>
                <span class="text-sm">{{ c.nombre }}</span>
                <input
                  v-if="c.selected"
                  type="number"
                  class="variant-stock-input"
                  placeholder="Stock"
                  min="0"
                  @click.stop
                />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showModal = false">Cancelar</button>
          <button class="btn btn-primary">
            <Save :size="16" />
            Guardar Artículo
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search, Plus, Pencil, Trash2, ChevronDown, X, Save } from 'lucide-vue-next'

const showModal = ref(false)
const expandedId = ref(null)
const search = ref('')
const selectedAlmacen = ref('')
const selectedCategoria = ref('')
const selectedMarca = ref('')

const almacenes = ref([
  { id: 1, nombre: 'Almacén Central' },
  { id: 2, nombre: 'Almacén Norte' },
  { id: 3, nombre: 'Almacén Laboratorio' }
])

const categorias = ref(['Cuadernos', 'Hojas y Papelería', 'Pinturas', 'Herramientas', 'Mat. Construcción', 'EPP'])
const marcas = ref(['Norma', 'Faber-Castell', 'Monopol', 'Stanley', 'Sika'])

const articulos = ref([
  { id: 1, codigo: 'CUA-001', nombre: 'Cuaderno 100h Tapa Dura', categoria: 'Cuadernos', marca: 'Norma', unidad: 'Unidad', almacen: 'Almacén Central', stockTotal: 430, estado: 'Activo', variantes: [
    { color: 'Azul', hex: '#007bff', stock: 200 }, { color: 'Rojo', hex: '#dc3545', stock: 150 }, { color: 'Verde', hex: '#28a745', stock: 80 }
  ]},
  { id: 2, codigo: 'CUA-002', nombre: 'Cuaderno 50h Económico', categoria: 'Cuadernos', marca: 'Norma', unidad: 'Unidad', almacen: 'Almacén Central', stockTotal: 600, estado: 'Activo', variantes: [
    { color: 'Amarillo', hex: '#ffc107', stock: 300 }, { color: 'Celeste', hex: '#17a2b8', stock: 300 }
  ]},
  { id: 3, codigo: 'PIN-001', nombre: 'Pintura Latex 1L', categoria: 'Pinturas', marca: 'Monopol', unidad: 'Litro', almacen: 'Almacén Norte', stockTotal: 105, estado: 'Activo', variantes: [
    { color: 'Azul', hex: '#007bff', stock: 30 }, { color: 'Blanco', hex: '#ffffff', stock: 50 }, { color: 'Rojo', hex: '#dc3545', stock: 25 }
  ]},
  { id: 4, codigo: 'HER-001', nombre: 'Martillo Carpintero', categoria: 'Herramientas', marca: 'Stanley', unidad: 'Unidad', almacen: 'Almacén Norte', stockTotal: 35, estado: 'Activo', variantes: [
    { color: 'Mango Rojo', hex: '#dc3545', stock: 15 }, { color: 'Mango Negro', hex: '#343a40', stock: 20 }
  ]},
  { id: 5, codigo: 'FIE-001', nombre: 'Fierro Corrugado 3/8', categoria: 'Mat. Construcción', marca: null, unidad: 'Metro', almacen: 'Almacén Norte', stockTotal: 500, estado: 'Activo', variantes: [
    { color: 'S/N', hex: '#e9ecef', stock: 500 }
  ]},
  { id: 6, codigo: 'FOL-001', nombre: 'Folder Oficio', categoria: 'Hojas y Papelería', marca: null, unidad: 'Unidad', almacen: 'Almacén Central', stockTotal: 95, estado: 'Activo', variantes: [
    { color: 'Azul', hex: '#007bff', stock: 50 }, { color: 'Rojo', hex: '#dc3545', stock: 45 }
  ]},
  { id: 7, codigo: 'CEM-001', nombre: 'Cemento Portland 50kg', categoria: 'Mat. Construcción', marca: null, unidad: 'Unidad', almacen: 'Almacén Norte', stockTotal: 80, estado: 'Activo', variantes: [
    { color: 'S/N', hex: '#e9ecef', stock: 80 }
  ]},
  { id: 8, codigo: 'HOJ-001', nombre: 'Resma Papel Bond Carta', categoria: 'Hojas y Papelería', marca: 'Faber-Castell', unidad: 'Paquete', almacen: 'Almacén Central', stockTotal: 120, estado: 'Activo', variantes: [
    { color: 'S/N', hex: '#e9ecef', stock: 120 }
  ]}
])

const availableColors = ref([
  { nombre: 'Azul', hex: '#007bff', selected: false },
  { nombre: 'Rojo', hex: '#dc3545', selected: false },
  { nombre: 'Verde', hex: '#28a745', selected: false },
  { nombre: 'Amarillo', hex: '#ffc107', selected: false },
  { nombre: 'Celeste', hex: '#17a2b8', selected: false },
  { nombre: 'Negro', hex: '#343a40', selected: false },
  { nombre: 'Blanco', hex: '#ffffff', selected: false },
  { nombre: 'Naranja', hex: '#fd7e14', selected: false },
  { nombre: 'Morado', hex: '#6f42c1', selected: false },
  { nombre: 'Rosado', hex: '#f8b1d1', selected: false }
])

const filteredArticulos = computed(() => {
  return articulos.value.filter(a => {
    const matchSearch = !search.value || a.nombre.toLowerCase().includes(search.value.toLowerCase()) || a.codigo.toLowerCase().includes(search.value.toLowerCase())
    const matchCat = !selectedCategoria.value || a.categoria === selectedCategoria.value
    const matchMarca = !selectedMarca.value || a.marca === selectedMarca.value
    return matchSearch && matchCat && matchMarca
  })
})

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}
</script>

<style scoped>
.rotate-180 { transform: rotate(180deg); }

.variants-detail {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-6);
  background: var(--color-gray-50);
}
.variant-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-white);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-gray-200);
  font-size: var(--font-size-sm);
}
.expanded-row td {
  padding: 0 !important;
  background: var(--color-gray-50);
}

/* Modal variants */
.variants-section {
  background: var(--color-gray-50);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  border: 1px solid var(--color-gray-200);
}
.variant-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-2);
}
.variant-color-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: var(--color-white);
}
.variant-color-option:hover {
  border-color: var(--color-primary-light);
}
.variant-color-option.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-lightest);
}
.variant-stock-input {
  width: 60px;
  padding: 2px 6px;
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  margin-left: auto;
  text-align: center;
}
</style>
