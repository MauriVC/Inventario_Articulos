<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <p class="text-muted">Atributos dinámicos para describir las propiedades de los artículos (Acabado, Tamaño, Tipo de Hoja, etc.)</p>
      <button class="btn btn-primary" @click="openAtributoModal()"><Plus :size="18" /> Nuevo Atributo</button>
    </div>

    <!-- Attributes Table -->
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <table class="table">
          <thead>
            <tr>
              <th style="width: 40px;"></th>
              <th>Atributo</th>
              <th>Valores Disponibles</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="attr in atributos" :key="attr.id">
              <tr class="atributo-row">
                <td>
                  <button class="btn btn-ghost btn-icon" @click="toggleExpand(attr.id)">
                    <ChevronRight :size="16" :class="{ 'icon-rotated': expandedId === attr.id }" style="transition: transform 0.2s;" />
                  </button>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <Tags :size="16" style="color: var(--color-primary);" />
                    <span class="font-semibold">{{ attr.nombre }}</span>
                  </div>
                </td>
                <td>
                  <div class="dato-pills">
                    <span class="dato-pill" v-for="d in attr.datos" :key="d.id">{{ d.nombre }}</span>
                    <span class="text-muted text-xs" v-if="attr.datos.length === 0">Sin valores</span>
                  </div>
                </td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-ghost btn-icon" title="Agregar valor" @click="openDatoModal(attr)">
                      <PlusCircle :size="16" style="color: var(--color-success);" />
                    </button>
                    <button class="btn btn-ghost btn-icon" title="Editar" @click="openAtributoModal(attr)" v-if="auth.isAdmin">
                      <Pencil :size="16" />
                    </button>
                    <button class="btn btn-ghost btn-icon" title="Eliminar" @click="eliminarAtributo(attr.id)" v-if="auth.isAdmin">
                      <Trash2 :size="16" style="color: var(--color-danger);" />
                    </button>
                  </div>
                </td>
              </tr>
              <!-- Expanded: valores del atributo -->
              <tr v-if="expandedId === attr.id" class="expanded-row">
                <td colspan="4">
                  <div class="datos-expanded">
                    <div class="datos-header">
                      <span class="text-sm font-semibold" style="color: var(--color-gray-600);">
                        Valores de "{{ attr.nombre }}"
                      </span>
                      <button class="btn btn-success btn-sm" @click="openDatoModal(attr)">
                        <Plus :size="14" /> Agregar Valor
                      </button>
                    </div>
                    <div class="datos-grid">
                      <div class="dato-card" v-for="d in attr.datos" :key="d.id">
                        <span class="dato-card-name">{{ d.nombre }}</span>
                        <div class="dato-card-actions" v-if="auth.isAdmin">
                          <button class="btn btn-ghost btn-icon" title="Eliminar" @click="eliminarDato(attr.id, d.id)">
                            <X :size="14" style="color: var(--color-danger);" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <p class="text-xs text-muted" v-if="attr.datos.length === 0" style="padding: var(--space-4); text-align: center;">
                      Este atributo aún no tiene valores. Haz clic en "Agregar Valor" para crear uno.
                    </p>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="atributos.length === 0">
              <td colspan="4" class="text-center text-muted" style="padding: var(--space-6);">No hay atributos registrados</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: Crear/Editar Atributo -->
    <div class="modal-overlay" v-if="showAtributoModal" @click.self="showAtributoModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editingAtributo ? 'Editar Atributo' : 'Nuevo Atributo' }}</h2>
          <button class="btn btn-ghost btn-icon" @click="showAtributoModal = false"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group mb-4">
            <label class="form-label">Nombre del Atributo *</label>
            <input v-model="atributoForm.nombre" type="text" class="form-input" placeholder="Ej: Acabado, Tamaño, Tipo de Hoja, Material..." />
          </div>
          <div class="info-box">
            <Info :size="16" />
            <span>Los atributos son categorías de propiedades. Luego podrás agregar valores (datos) a cada atributo. Ejemplo: Atributo "Acabado" con valores "Anillado", "Empastado", etc.</span>
          </div>
          <div class="text-sm" style="color: var(--color-danger); margin-top: var(--space-3);" v-if="formError">⚠ {{ formError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAtributoModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="saveAtributo" :disabled="saving">
            <Save :size="16" /> {{ editingAtributo ? 'Actualizar' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Crear Dato (Valor) -->
    <div class="modal-overlay" v-if="showDatoModal" @click.self="showDatoModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Nuevo Valor <span class="text-primary" style="font-weight: 400;">— {{ selectedAtributo?.nombre }}</span></h2>
          <button class="btn btn-ghost btn-icon" @click="showDatoModal = false"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group mb-4">
            <label class="form-label">Nombre del Valor *</label>
            <input v-model="datoForm.nombre" type="text" class="form-input" placeholder="Ej: Anillado, Carta, Cuadriculada..." />
          </div>
          <!-- Quick add: multiple values -->
          <div class="quick-add">
            <label class="form-label">Agregar múltiples valores (separados por coma)</label>
            <input v-model="bulkDatos" type="text" class="form-input" placeholder="Ej: Anillado, Empastado, Grapado" />
            <span class="text-xs text-muted">Deja el campo superior vacío y escribe aquí para agregar varios a la vez</span>
          </div>
          <div class="text-sm" style="color: var(--color-danger); margin-top: var(--space-3);" v-if="formError">⚠ {{ formError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDatoModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="saveDato" :disabled="saving">
            <Save :size="16" /> Guardar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus, PlusCircle, Pencil, Trash2, ChevronRight, X, Save, Tags, Info } from 'lucide-vue-next'
import { api } from '@/api'
import { auth } from '@/auth'
import { confirmAction, showError, showWarning, showSuccess } from '@/utils/alerts'

const expandedId = ref(null)
const showAtributoModal = ref(false)
const showDatoModal = ref(false)
const editingAtributo = ref(null)
const selectedAtributo = ref(null)
const atributoForm = ref({ nombre: '' })
const datoForm = ref({ nombre: '' })
const bulkDatos = ref('')
const saving = ref(false)
const formError = ref('')

const atributos = ref([])

onMounted(async () => {
  await cargar()
})

async function cargar() {
  try {
    const res = await api.getAtributos()
    atributos.value = res.data
  } catch (err) {
    console.error('Error cargando atributos:', err)
  }
}

function toggleExpand(id) { expandedId.value = expandedId.value === id ? null : id }

function openAtributoModal(attr = null) {
  editingAtributo.value = attr
  atributoForm.value = { nombre: attr ? attr.nombre : '' }
  formError.value = ''
  showAtributoModal.value = true
}

function openDatoModal(attr) {
  selectedAtributo.value = attr
  datoForm.value = { nombre: '' }
  bulkDatos.value = ''
  formError.value = ''
  showDatoModal.value = true
}

async function saveAtributo() {
  if (!atributoForm.value.nombre.trim()) {
    formError.value = 'El nombre es obligatorio'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    if (editingAtributo.value) {
      await api.updateAtributo(editingAtributo.value.id, atributoForm.value)
      showSuccess('Atributo actualizado')
    } else {
      await api.createAtributo(atributoForm.value)
      showSuccess('Atributo creado')
    }
    showAtributoModal.value = false
    await cargar()
  } catch (err) {
    formError.value = err.message
  } finally {
    saving.value = false
  }
}

async function saveDato() {
  const nombres = []
  if (bulkDatos.value.trim()) {
    nombres.push(...bulkDatos.value.split(',').map(n => n.trim()).filter(n => n))
  } else if (datoForm.value.nombre.trim()) {
    nombres.push(datoForm.value.nombre.trim())
  }

  if (nombres.length === 0) {
    formError.value = 'Ingrese al menos un valor'
    return
  }

  saving.value = true
  formError.value = ''
  try {
    for (const nombre of nombres) {
      await api.createDato(selectedAtributo.value.id, { nombre })
    }
    showSuccess('Valor(es) guardado(s)')
    showDatoModal.value = false
    await cargar()
  } catch (err) {
    formError.value = err.message
  } finally {
    saving.value = false
  }
}

async function eliminarAtributo(id) {
  if (!await confirmAction('Eliminar Atributo', '¿Eliminar este atributo y todos sus valores?')) return
  try {
    await api.deleteAtributo(id)
    showSuccess('Atributo eliminado')
    await cargar()
  } catch (err) {
    showError('Error: ' + err.message)
  }
}

async function eliminarDato(atributoId, datoId) {
  if (!await confirmAction('Eliminar Valor', '¿Eliminar este valor?')) return
  try {
    await api.deleteDato(atributoId, datoId)
    showSuccess('Valor eliminado')
    await cargar()
  } catch (err) {
    showError('Error: ' + err.message)
  }
}
</script>

<style scoped>
.icon-rotated { transform: rotate(90deg); }

.dato-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.dato-pill {
  display: inline-block;
  padding: 2px 10px;
  background: var(--color-primary-lightest);
  color: var(--color-primary-dark);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.atributo-row { cursor: pointer; }
.atributo-row:hover { background: var(--color-gray-50); }

.expanded-row td { padding: 0 !important; background: var(--color-gray-50); }

.datos-expanded {
  padding: var(--space-4) var(--space-6);
}
.datos-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.datos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-2);
}
.dato-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}
.dato-card:hover {
  border-color: var(--color-primary-light);
  box-shadow: var(--shadow-sm);
}
.dato-card-name {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-gray-700);
}
.dato-card-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}
.dato-card:hover .dato-card-actions { opacity: 1; }

.info-box {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-primary-lightest);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-primary-lighter);
  font-size: var(--font-size-sm);
  color: var(--color-primary-dark);
}

.quick-add {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-gray-200);
}
</style>
