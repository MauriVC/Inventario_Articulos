<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <p class="text-muted">Gestiona los almacenes del sistema</p>
      </div>
<<<<<<< Updated upstream
      <button class="btn btn-primary" @click="showModal = true">
=======
      <button class="btn btn-primary" @click="openModal()" v-if="auth.isSuperAdmin">
>>>>>>> Stashed changes
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
                    <button class="btn btn-ghost btn-icon" title="Editar" @click="openModal(almacen)">
                      <Pencil :size="16" />
                    </button>
                    <button class="btn btn-ghost btn-icon" title="Eliminar" @click="eliminar(almacen)">
                      <Trash2 :size="16" style="color: var(--color-danger);" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="almacenes.length === 0">
                <td :colspan="auth.isSuperAdmin ? 7 : 6" class="text-center text-muted" style="padding: var(--space-6);">No hay almacenes registrados</td>
              </tr>
            </tbody>
          </table>
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
import { Plus, Pencil, Trash2, X, Save } from 'lucide-vue-next'
import { api } from '@/api'
import { auth } from '@/auth'

const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const loading = ref(true)
const formError = ref('')

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
    } else {
      await api.createAlmacen(form.value)
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
  if (!confirm(`¿Cambiar estado del almacén "${almacen.nombre}" a ${nuevoEstado}?`)) return
  try {
    await api.updateAlmacen(almacen.id, { ...almacen, estado: nuevoEstado })
    almacen.estado = nuevoEstado
  } catch (err) {
    alert('Error al cambiar estado: ' + err.message)
  }
}

async function eliminar(almacen) {
  if (almacen.totalArticulos > 0) {
    alert(`No se puede eliminar el almacén "${almacen.nombre}" porque tiene ${almacen.totalArticulos} artículo(s) asignados. Reasigne o elimine los artículos primero.`)
    return
  }
  if (!confirm(`¿Eliminar el almacén "${almacen.nombre}"? Esta acción no se puede deshacer.`)) return
  try {
    await api.deleteAlmacen(almacen.id)
    await cargar()
  } catch (err) {
    alert('Error al eliminar: ' + err.message)
  }
}
</script>
