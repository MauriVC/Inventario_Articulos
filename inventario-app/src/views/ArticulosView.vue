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
          <option v-for="c in categorias" :key="c.id" :value="c.nombre">{{ c.nombre }}</option>
        </select>
        <select v-model="selectedMarca" class="form-select" style="width: 160px;">
          <option value="">Marca</option>
          <option v-for="m in marcas" :key="m.id" :value="m.nombre">{{ m.nombre }}</option>
        </select>
        <div class="form-input-icon">
          <Search :size="16" />
          <input v-model="search" type="text" class="form-input" placeholder="Buscar artículo..." style="width: 220px;" />
        </div>
      </div>
      <button class="btn btn-primary" @click="openModal(null)">
        <Plus :size="18" />
        Nuevo Artículo
      </button>
    </div>

    <!-- Loading -->
    <div class="card" v-if="loading">
      <div class="empty-state">
        <p>Cargando artículos...</p>
      </div>
    </div>

    <!-- Table -->
    <div class="card" v-else>
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
                <td class="font-semibold text-primary">{{ art.codigo || '—' }}</td>
                <td>
                  <div class="flex items-center gap-2" style="flex-wrap: wrap;">
                    <span class="font-medium">{{ art.nombre }}</span>
                    <span class="attr-pill" v-for="attr in art.atributos" :key="attr">{{ attr }}</span>
                  </div>
                </td>
                <td>{{ art.categoria_nombre }}</td>
                <td>{{ art.marca_nombre || '—' }}</td>
                <td>{{ art.unidad_nombre }}</td>
                <td>
                  <div class="color-dots">
                    <span
                      v-for="v in art.variantes"
                      :key="v.id"
                      class="color-dot"
                      :style="{ background: v.codigo_hex }"
                      :title="v.color_nombre + ': ' + v.stock"
                    ></span>
                  </div>
                </td>
                <td class="font-semibold text-center">{{ art.stock_total }}</td>
                <td class="text-sm">{{ art.almacen_nombre }}</td>
                <td>
                  <span class="badge" 
                        :class="[art.estado === 'Activo' ? 'badge-success' : 'badge-danger', { 'cursor-pointer': auth.isAdmin }]"
                        @click="auth.isAdmin && toggleEstado(art)"
                        :title="auth.isAdmin ? 'Clic para cambiar estado' : ''"
                        style="transition: opacity 0.2s;">
                    {{ art.estado }}
                  </span>
                </td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-ghost btn-icon" title="Ver variantes" @click="toggleExpand(art.id)">
                      <ChevronDown :size="16" :class="{ 'rotate-180': expandedId === art.id }" style="transition: transform 0.2s;" />
                    </button>
                    <button class="btn btn-ghost btn-icon" title="Editar" v-if="auth.isAdmin" @click="openModal(art.id)">
                      <Pencil :size="16" />
                    </button>
                    <button class="btn btn-ghost btn-icon" title="Eliminar" @click="eliminarArticulo(art.id)" v-if="auth.isAdmin">
                      <Trash2 :size="16" style="color: var(--color-danger);" />
                    </button>
                  </div>
                </td>
              </tr>
              <!-- Expanded Variants Row -->
              <tr v-if="expandedId === art.id" class="expanded-row">
                <td colspan="10">
                  <div class="variants-detail">
                    <div class="variant-item" v-for="v in art.variantes" :key="v.id">
                      <span class="color-dot" :style="{ background: v.codigo_hex }"></span>
                      <span class="font-medium">{{ v.color_nombre }}</span>
                      <span class="text-muted">Stock: <strong>{{ v.stock }}</strong></span>
                    </div>
                  </div>
                </td>
              </tr>
              </template>
              <tr v-if="filteredArticulos.length === 0">
                <td colspan="10" class="text-center text-muted" style="padding: var(--space-6);">
                  No se encontraron artículos
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h2>{{ editingArticulo ? 'Editar Artículo' : 'Nuevo Artículo' }}</h2>
          <button class="btn btn-ghost btn-icon" @click="showModal = false"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="grid-2 mb-4">
            <div class="form-group">
              <label class="form-label">Almacén *</label>
              <select v-model="form.almacen_id" class="form-select">
                <option v-for="a in almacenes" :key="a.id" :value="a.id">{{ a.nombre }}</option>
              </select>
            </div>
            <div class="form-group" v-if="editingArticulo">
              <label class="form-label">Código</label>
              <input v-model="form.codigo" type="text" class="form-input" readonly style="background: var(--color-gray-50); color: var(--color-primary); font-weight: 600;" />
            </div>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Nombre del artículo *</label>
            <input v-model="form.nombre" type="text" class="form-input" placeholder="Ej: Cuaderno 100 hojas Tapa Dura" />
          </div>
          <div class="grid-3 mb-4">
            <div class="form-group">
              <label class="form-label">Categoría *</label>
              <select v-model="form.categoria_id" class="form-select">
                <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Marca</label>
              <select v-model="form.marca_id" class="form-select">
                <option :value="null">Sin marca</option>
                <option v-for="m in marcas" :key="m.id" :value="m.id">{{ m.nombre }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Unidad de Medida *</label>
              <select v-model="form.unidad_medida_id" class="form-select">
                <option v-for="u in unidades.filter(u => u.estado === 'Activo')" :key="u.id" :value="u.id">{{ u.nombre }}</option>
              </select>
            </div>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Descripción</label>
            <textarea v-model="form.descripcion" class="form-input" placeholder="Descripción adicional..."></textarea>
          </div>

          <!-- Atributos Section -->
          <div class="atributos-section mb-4">
            <h3 class="section-title"><Tags :size="16" /> Atributos y Datos</h3>
            <p class="text-sm text-muted mb-3">Asigna propiedades al artículo (acabado, tamaño, tipo de hoja, etc.)</p>
            <div class="flex items-center gap-3 mb-3">
              <select v-model="selectedAtributo" class="form-select" style="flex: 1;">
                <option value="">Seleccionar atributo...</option>
                <option v-for="a in atributosDisponibles" :key="a.id" :value="a.id">{{ a.nombre }}</option>
              </select>
              <select v-model="selectedDato" class="form-select" style="flex: 1;" :disabled="!selectedAtributo">
                <option value="">{{ selectedAtributo ? 'Seleccionar valor...' : 'Primero seleccione un atributo' }}</option>
                <option v-for="d in datosDelAtributo" :key="d.id" :value="d.id">{{ d.nombre }}</option>
              </select>
              <button class="btn btn-primary" @click="agregarDato" :disabled="!selectedDato">
                <Plus :size="16" /> Agregar
              </button>
            </div>
            <div class="datos-asignados" v-if="datosAsignados.length > 0">
              <div class="dato-asignado" v-for="(da, i) in datosAsignados" :key="i">
                <span class="dato-atributo">{{ da.atributoNombre }}:</span>
                <span class="dato-valor">{{ da.datoNombre }}</span>
                <button class="btn btn-ghost btn-icon" @click="datosAsignados.splice(i, 1)" style="padding: 2px;">
                  <X :size="14" style="color: var(--color-danger);" />
                </button>
              </div>
            </div>
            <p class="text-xs text-muted" v-else>No se han asignado atributos aún. Son opcionales.</p>
          </div>

          <!-- Color Variants Section -->
          <div class="variants-section mb-4">
            <h3 class="font-semibold mb-3" style="color: var(--color-gray-700);">Variantes por Color</h3>
            <p class="text-sm text-muted mb-4">Selecciona los colores disponibles y asigna el stock inicial para cada uno. Si no seleccionas ninguno, se asignará automáticamente "S/N".</p>
            <div class="variant-grid">
              <div
                v-for="c in availableColors"
                :key="c.id"
                class="variant-color-option"
                :class="{ selected: c.selected }"
                @click="c.selected = !c.selected"
              >
                <span class="color-dot" :style="{ background: c.codigo_hex }"></span>
                <span class="text-sm">{{ c.nombre }}</span>
                <input
                  v-if="c.selected"
                  v-model.number="c.stock"
                  type="number"
                  class="variant-stock-input"
                  placeholder="Stock"
                  min="1"
                  @click.stop
                />
              </div>
            </div>
          </div>

          <!-- Error -->
          <div class="text-sm" style="color: var(--color-danger); margin-bottom: var(--space-3);" v-if="formError">
            ⚠ {{ formError }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="guardarArticulo" :disabled="saving">
            <Save :size="16" />
            {{ saving ? 'Guardando...' : 'Guardar Artículo' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, Plus, Pencil, Trash2, ChevronDown, X, Save, Tags } from 'lucide-vue-next'
import { api } from '@/api'
import { auth } from '@/auth'
import { confirmAction, showError, showWarning, showSuccess } from '@/utils/alerts'

const showModal = ref(false)
const editingArticulo = ref(null)
const expandedId = ref(null)
const search = ref('')
const selectedAlmacen = ref('')
const selectedCategoria = ref('')
const selectedMarca = ref('')
const loading = ref(true)
const saving = ref(false)
const formError = ref('')

// Datos cargados desde el API
const almacenes = ref([])
const categorias = ref([])
const marcas = ref([])
const unidades = ref([])
const availableColors = ref([])
const atributosDisponibles = ref([])
const articulos = ref([])

// Form data
const form = ref({
  almacen_id: null,
  categoria_id: null,
  marca_id: null,
  unidad_medida_id: null,
  codigo: '',
  nombre: '',
  descripcion: ''
})

// Atributos
const selectedAtributo = ref('')
const selectedDato = ref('')
const datosAsignados = ref([])

const datosDelAtributo = computed(() => {
  if (!selectedAtributo.value) return []
  const attr = atributosDisponibles.value.find(a => a.id === selectedAtributo.value)
  return attr ? attr.datos : []
})

function agregarDato() {
  const attr = atributosDisponibles.value.find(a => a.id === selectedAtributo.value)
  const dato = datosDelAtributo.value.find(d => d.id === selectedDato.value)
  if (attr && dato && !datosAsignados.value.find(x => x.datoId === dato.id)) {
    datosAsignados.value.push({ atributoNombre: attr.nombre, datoNombre: dato.nombre, datoId: dato.id })
  }
  selectedDato.value = ''
}

// Filtros
const filteredArticulos = computed(() => {
  return articulos.value.filter(a => {
    const matchSearch = !search.value || a.nombre.toLowerCase().includes(search.value.toLowerCase()) || (a.codigo && a.codigo.toLowerCase().includes(search.value.toLowerCase()))
    const matchCat = !selectedCategoria.value || a.categoria_nombre === selectedCategoria.value
    const matchMarca = !selectedMarca.value || a.marca_nombre === selectedMarca.value
    return matchSearch && matchCat && matchMarca
  })
})

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

// ─── Cargar datos iniciales ───
async function loadCatalogs() {
  try {
    const [almRes, catRes, marRes, uniRes, colRes, atrRes] = await Promise.all([
      api.getAlmacenes(),
      api.getCategorias(),
      api.getMarcas(),
      api.getUnidades(),
      api.getColores(),
      api.getAtributos()
    ])
    almacenes.value = almRes.data
    categorias.value = catRes.data
    marcas.value = marRes.data
    unidades.value = uniRes.data
    availableColors.value = colRes.data.map(c => ({ ...c, selected: false, stock: 0 }))
    atributosDisponibles.value = atrRes.data
  } catch (err) {
    console.error('Error cargando catálogos:', err)
  }
}

async function loadArticulos() {
  loading.value = true
  try {
    const res = await api.getArticulos()
    articulos.value = res.data
  } catch (err) {
    console.error('Error cargando artículos:', err)
  } finally {
    loading.value = false
  }
}

async function toggleEstado(art) {
  if (!auth.isAdmin) return
  
  const nuevoEstado = art.estado === 'Activo' ? 'Inactivo' : 'Activo'
  if (!await confirmAction('Confirmar', `¿Cambiar estado del artículo a ${nuevoEstado}?`)) return
  
  try {
    await api.toggleEstadoArticulo(art.id, nuevoEstado)
    art.estado = nuevoEstado
    showSuccess('Estado actualizado')
  } catch (error) {
    showError("Error al cambiar estado: " + error.message)
  }
}

async function openModal(id = null) {
  formError.value = ''
  datosAsignados.value = []
  availableColors.value.forEach(c => { c.selected = false; c.stock = 0 })

  if (id) {
    editingArticulo.value = id
    loading.value = true
    try {
      const res = await api.getArticulo(id)
      const art = res.data
      form.value = {
        almacen_id: art.almacen_id,
        categoria_id: art.categoria_id,
        marca_id: art.marca_id,
        unidad_medida_id: art.unidad_medida_id,
        codigo: art.codigo || '',
        nombre: art.nombre,
        descripcion: art.descripcion || ''
      }
      // Establecer variantes y su stock
      art.variantes.forEach(v => {
        const c = availableColors.value.find(ac => ac.id === v.color_id)
        if (c) {
          c.selected = true
          c.stock = v.stock
        }
      })
      // Establecer atributos
      datosAsignados.value = art.atributos.map(a => ({
        atributoNombre: a.atributo,
        datoNombre: a.dato,
        datoId: a.dato_id
      }))
    } catch (err) {
      showError("Error cargando el artículo: " + err.message)
      loading.value = false
      return
    } finally {
      loading.value = false
    }
  } else {
    editingArticulo.value = null
    form.value = {
      almacen_id: almacenes.value.length > 0 ? almacenes.value[0].id : null,
      categoria_id: categorias.value.length > 0 ? categorias.value[0].id : null,
      marca_id: null,
      unidad_medida_id: unidades.value.length > 0 ? unidades.value[0].id : null,
      codigo: '',
      nombre: '',
      descripcion: ''
    }
  }
  showModal.value = true
}

async function guardarArticulo() {
  formError.value = ''

  if (!form.value.nombre.trim()) {
    formError.value = 'El nombre del artículo es obligatorio'
    return
  }

  // Construir variantes
  const selectedColors = availableColors.value.filter(c => c.selected)
  let variantes = []

  if (selectedColors.length > 0) {
    // Validar stock mínimo de 1 al crear
    if (!editingArticulo.value) {
      const sinStock = selectedColors.find(c => !c.stock || c.stock < 1)
      if (sinStock) {
        formError.value = `El color "${sinStock.nombre}" debe tener al menos 1 de stock`
        return
      }
    }
    variantes = selectedColors.map(c => ({ color_id: c.id, stock: c.stock || 1 }))
  } else {
    // Auto-asignar S/N con stock mínimo de 1
    const sinColor = availableColors.value.find(c => c.nombre === 'S/N')
    if (sinColor) {
      formError.value = 'Debe seleccionar al menos un color y asignar stock mínimo de 1'
      return
    }
  }

  const dato_ids = datosAsignados.value.map(d => d.datoId)

  saving.value = true
  try {
    const payload = {
      ...form.value,
      variantes,
      dato_ids
    }
    if (editingArticulo.value) {
      await api.updateArticulo(editingArticulo.value, payload)
      showSuccess('Artículo actualizado correctamente')
    } else {
      await api.createArticulo(payload)
      showSuccess('Artículo creado correctamente')
    }
    showModal.value = false
    await loadArticulos()
  } catch (err) {
    formError.value = err.message
  } finally {
    saving.value = false
  }
}

async function eliminarArticulo(id) {
  if (!await confirmAction('Eliminar Artículo', '¿Estás seguro de eliminar este artículo?')) return
  try {
    await api.deleteArticulo(id)
    showSuccess('Artículo eliminado')
    await loadArticulos()
  } catch (err) {
    showError('Error al eliminar: ' + err.message)
  }
}

onMounted(async () => {
  await loadCatalogs()
  await loadArticulos()
})
</script>

<style scoped>
.rotate-180 { transform: rotate(180deg); }

/* Attribute pills in table */
.attr-pill {
  display: inline-block;
  padding: 1px 8px;
  background: var(--color-primary-lightest);
  color: var(--color-primary-dark);
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 500;
}

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
}

.expanded-row td {
  padding: 0 !important;
  background: var(--color-gray-50);
}

/* Create/Edit Modal sections */
.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
  color: var(--color-gray-700);
  font-size: var(--font-size-base);
  margin-bottom: var(--space-2);
}
.atributos-section {
  background: var(--color-gray-50);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  border: 1px solid var(--color-gray-200);
}
.datos-asignados {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.dato-asignado {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  background: var(--color-white);
  border: 1px solid var(--color-gray-300);
  font-size: var(--font-size-sm);
}
.dato-atributo {
  color: var(--color-gray-500);
  font-weight: 400;
}
.dato-valor {
  color: var(--color-primary-dark);
  font-weight: 600;
}
.variants-section {
  background: var(--color-gray-50);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-gray-200);
}
.variant-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--space-3);
}
.variant-color-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-white);
  border: 2px solid var(--color-gray-200);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.variant-color-option:hover { border-color: var(--color-primary-light); }
.variant-color-option.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-lightest);
}
.variant-stock-input {
  width: 80px;
  padding: var(--space-1);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  text-align: center;
}
</style>
