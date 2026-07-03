<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <p class="text-muted">Gestiona los almacenes del sistema</p>
      </div>
      <button class="btn btn-primary" @click="openModal()" v-if="auth.isSuperAdmin">
        <Plus :size="18" />
        Nuevo Almacén
      </button>
    </div>

    <!-- Loading -->
    <div class="card" v-if="loading">
      <div class="empty-state">
        <p>Cargando almacenes...</p>
      </div>
    </div>

    <!-- Table -->
    <div class="card" v-else>
      <div class="card-body" style="padding: 0;">
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Ubicación</th>
                <th>Descripción</th>
                <th>Artículos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(almacen, i) in almacenes" :key="almacen.id">
                <td class="text-muted">{{ i + 1 }}</td>
                <td class="font-semibold">{{ almacen.nombre }}</td>
                <td>{{ almacen.ubicacion || '—' }}</td>
                <td class="text-muted text-sm">{{ almacen.descripcion || '—' }}</td>
                <td class="text-center">
                  <span class="badge badge-primary">{{ almacen.totalArticulos }}</span>
                </td>
                <td>
                  <span 
                    class="badge" 
                    :class="[almacen.estado === 'Activo' ? 'badge-success' : 'badge-danger', { 'cursor-pointer': auth.isSuperAdmin }]"
                    @click="auth.isSuperAdmin && toggleEstado(almacen)"
                    :title="auth.isSuperAdmin ? 'Clic para cambiar estado' : ''"
                    style="transition: opacity 0.2s;">
                    {{ almacen.estado }}
                  </span>
                </td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-ghost btn-icon" title="Ver detalle" @click="openDetalle(almacen)">
                      <Eye :size="16" />
                    </button>
                    <button class="btn btn-ghost btn-icon" title="Editar" v-if="auth.isSuperAdmin" @click="openModal(almacen)">
                      <Pencil :size="16" />
                    </button>
                    <button class="btn btn-ghost btn-icon" title="Eliminar" v-if="auth.isSuperAdmin" @click="eliminar(almacen)">
                      <Trash2 :size="16" style="color: var(--color-danger);" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="almacenes.length === 0">
                <td colspan="7" class="text-center text-muted" style="padding: var(--space-6);">No hay almacenes registrados</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div class="modal-overlay" v-if="selectedAlmacenDetalle" @click.self="selectedAlmacenDetalle = null">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <div class="flex items-center gap-3">
            <h2>Detalle del Almacén</h2>
            <span class="badge" :class="selectedAlmacenDetalle.estado === 'Activo' ? 'badge-success' : 'badge-danger'">{{ selectedAlmacenDetalle.estado }}</span>
          </div>
          <button class="btn btn-ghost btn-icon" @click="selectedAlmacenDetalle = null"><X :size="20" /></button>
        </div>
        <div class="modal-body" style="background-color: #fcfcfc; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; padding: var(--space-5);">
          <!-- Main Info Card -->
          <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: var(--radius-lg); padding: var(--space-4); margin-bottom: var(--space-4); box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div class="grid-2" style="gap: var(--space-4);">
              <div>
                <span class="text-xs text-muted font-medium uppercase tracking-wider block mb-1">Nombre</span>
                <p class="font-bold" style="color: #1e293b; font-size: 1.1em;">{{ selectedAlmacenDetalle.nombre }}</p>
              </div>
              <div>
                <span class="text-xs text-muted font-medium uppercase tracking-wider block mb-1">Responsable</span>
                <p class="font-medium flex items-center gap-1.5" style="color: #475569;">
                  <User :size="14" style="color: #94a3b8;" /> {{ selectedAlmacenDetalle.responsable_nombre || 'Sistema' }}
                </p>
              </div>
              <div>
                <span class="text-xs text-muted font-medium uppercase tracking-wider block mb-1">Ubicación</span>
                <p class="font-medium flex items-center gap-1.5" style="color: #475569;">
                  <MapPin :size="14" style="color: #94a3b8;" /> {{ selectedAlmacenDetalle.ubicacion || '—' }}
                </p>
              </div>
              <div style="grid-column: span 2;" v-if="selectedAlmacenDetalle.descripcion">
                <span class="text-xs text-muted font-medium uppercase tracking-wider block mb-1">Descripción</span>
                <p class="font-medium" style="color: #475569;">{{ selectedAlmacenDetalle.descripcion }}</p>
              </div>
            </div>
          </div>

          <!-- Articles Table -->
          <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="background-color: #f8fafc; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
              <h3 class="font-semibold m-0 flex items-center gap-2" style="font-size: 13px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">
                <Package :size="16" style="color: #64748b;" /> Artículos en este Almacén
              </h3>
              <span class="badge badge-primary" style="font-size: 12px; font-weight: 700; padding: 4px 10px;">Total: {{ almacenArticulos.length }}</span>
            </div>
            
            <div v-if="isLoadingArticulos" class="text-center" style="padding: 20px;">
              <span class="text-muted">Cargando artículos...</span>
            </div>
            <div v-else style="max-height: 350px; overflow-y: auto; border-bottom-left-radius: var(--radius-lg); border-bottom-right-radius: var(--radius-lg);">
              <table class="table" style="margin: 0; border: none; width: 100%;">
                <thead style="position: sticky; top: 0; z-index: 10; background-color: white; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                  <tr>
                    <th style="background-color: white; border-bottom: 1px solid #e2e8f0; font-size: 11px; padding: 10px 16px;">Código</th>
                    <th style="background-color: white; border-bottom: 1px solid #e2e8f0; font-size: 11px; padding: 10px 16px;">Nombre</th>
                    <th style="background-color: white; border-bottom: 1px solid #e2e8f0; font-size: 11px; padding: 10px 16px;">Categoría</th>
                    <th class="text-center" style="background-color: white; border-bottom: 1px solid #e2e8f0; font-size: 11px; padding: 10px 16px;">Stock Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="art in almacenArticulos" :key="art.id">
                    <td class="font-medium" style="border-bottom: 1px solid #f1f5f9; padding: 12px 16px; color: var(--color-primary);">{{ art.codigo || '—' }}</td>
                    <td style="border-bottom: 1px solid #f1f5f9; padding: 12px 16px; color: #334155;">{{ art.nombre }}</td>
                    <td style="border-bottom: 1px solid #f1f5f9; padding: 12px 16px; color: #475569;">{{ art.categoria_nombre }}</td>
                    <td class="font-bold text-center" style="border-bottom: 1px solid #f1f5f9; padding: 12px 16px; color: #0f172a; font-size: 14px;">{{ art.stock_total }}</td>
                  </tr>
                  <tr v-if="almacenArticulos.length === 0">
                    <td colspan="4" class="text-center text-muted" style="padding: 30px;">Este almacén no tiene artículos</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editing ? 'Editar Almacén' : 'Nuevo Almacén' }}</h2>
          <button class="btn btn-ghost btn-icon" @click="closeModal"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="flex flex-col gap-4">
            <div class="form-group">
              <label class="form-label">Nombre *</label>
              <input v-model="form.nombre" type="text" class="form-input" placeholder="Ej: Almacén Central" />
            </div>
            <div class="form-group">
              <label class="form-label">Ubicación</label>
              <input v-model="form.ubicacion" type="text" class="form-input" placeholder="Ej: Edificio A, Planta Baja" />
            </div>
            <div class="form-group">
              <label class="form-label">Descripción</label>
              <textarea v-model="form.descripcion" class="form-input" placeholder="Descripción del almacén..."></textarea>
            </div>
            <div class="form-group" v-if="editing">
              <label class="form-label">Estado</label>
              <select v-model="form.estado" class="form-select">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
          <div class="text-sm" style="color: var(--color-danger); margin-top: var(--space-3);" v-if="formError">⚠ {{ formError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancelar</button>
          <button class="btn btn-primary" @click="guardar" :disabled="saving">
            <Save :size="16" />
            {{ saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Guardar') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Pencil, Trash2, X, Save, Eye, MapPin, Package, User } from 'lucide-vue-next'
import { api } from '@/api'
import { auth } from '@/auth'
import { confirmAction, showError, showWarning, showSuccess } from '@/utils/alerts'

const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const loading = ref(true)
const formError = ref('')

const selectedAlmacenDetalle = ref(null)
const isLoadingArticulos = ref(false)
const almacenArticulos = ref([])

const form = ref({ nombre: '', ubicacion: '', descripcion: '', estado: 'Activo' })
const almacenes = ref([])

onMounted(async () => { await cargar() })

async function cargar() {
  loading.value = true
  try {
    const res = await api.getAlmacenes()
    almacenes.value = res.data
  } catch (err) {
    console.error('Error cargando almacenes:', err)
  } finally {
    loading.value = false
  }
}

async function openDetalle(almacen) {
  selectedAlmacenDetalle.value = almacen
  isLoadingArticulos.value = true
  almacenArticulos.value = []
  try {
    const res = await api.getArticulos({ almacen_id: almacen.id })
    almacenArticulos.value = res.data
  } catch (error) {
    console.error('Error cargando artículos del almacén:', error)
  } finally {
    isLoadingArticulos.value = false
  }
}

function openModal(almacen = null) {
  editing.value = almacen
  if (almacen) {
    form.value = {
      nombre: almacen.nombre,
      ubicacion: almacen.ubicacion || '',
      descripcion: almacen.descripcion || '',
      estado: almacen.estado
    }
  } else {
    form.value = { nombre: '', ubicacion: '', descripcion: '', estado: 'Activo' }
  }
  formError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
  form.value = { nombre: '', ubicacion: '', descripcion: '', estado: 'Activo' }
  formError.value = ''
}

async function guardar() {
  if (!form.value.nombre.trim()) {
    formError.value = 'El nombre es obligatorio'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) {
      await api.updateAlmacen(editing.value.id, form.value)
      showSuccess('Almacén actualizado correctamente')
    } else {
      await api.createAlmacen(form.value)
      showSuccess('Almacén creado correctamente')
    }
    closeModal()
    await cargar()
  } catch (err) {
    formError.value = err.message
  } finally {
    saving.value = false
  }
}

async function toggleEstado(almacen) {
  const nuevoEstado = almacen.estado === 'Activo' ? 'Inactivo' : 'Activo'
  if (!await confirmAction('Confirmar', `¿Cambiar estado del almacén "${almacen.nombre}" a ${nuevoEstado}?`)) return
  try {
    await api.updateAlmacen(almacen.id, { ...almacen, estado: nuevoEstado })
    almacen.estado = nuevoEstado
    showSuccess('Estado actualizado')
  } catch (err) {
    showError('Error al cambiar estado: ' + err.message)
  }
}

async function eliminar(almacen) {
  if (almacen.totalArticulos > 0) {
    showWarning(`No se puede eliminar el almacén "${almacen.nombre}" porque tiene ${almacen.totalArticulos} artículo(s) asignados. Reasigne o elimine los artículos primero.`)
    return
  }
  if (!await confirmAction('Eliminar Almacén', `¿Eliminar el almacén "${almacen.nombre}"? Esta acción no se puede deshacer.`)) return
  try {
    await api.deleteAlmacen(almacen.id)
    showSuccess('Almacén eliminado')
    await cargar()
  } catch (err) {
    showError('Error al eliminar: ' + err.message)
  }
}
</script>
