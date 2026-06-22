<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <p class="text-muted">Gestiona los almacenes del sistema</p>
      </div>
      <button class="btn btn-primary" @click="showModal = true" v-if="auth.isSuperAdmin">
        <Plus :size="18" />
        Nuevo Almacén
      </button>
    </div>

    <!-- Table -->
    <div class="card">
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
                <th v-if="auth.isSuperAdmin">Acciones</th>
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
                  <span class="badge" :class="almacen.estado === 'Activo' ? 'badge-success' : 'badge-danger'">
                    {{ almacen.estado }}
                  </span>
                </td>
                <td v-if="auth.isSuperAdmin">
                  <div class="flex gap-1">
                    <button class="btn btn-ghost btn-icon" title="Editar" @click="editAlmacen(almacen)">
                      <Pencil :size="16" />
                    </button>
                    <button class="btn btn-ghost btn-icon" title="Eliminar">
                      <Trash2 :size="16" style="color: var(--color-danger);" />
                    </button>
                  </div>
                </td>
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
          <h2>{{ editingId ? 'Editar Almacén' : 'Nuevo Almacén' }}</h2>
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
            <div class="form-group">
              <label class="form-label">Estado</label>
              <select v-model="form.estado" class="form-select">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancelar</button>
          <button class="btn btn-primary" @click="saveAlmacen">
            <Save :size="16" />
            {{ editingId ? 'Actualizar' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Plus, Pencil, Trash2, X, Save } from 'lucide-vue-next'
import { auth } from '@/auth'

const showModal = ref(false)
const editingId = ref(null)

const form = ref({ nombre: '', ubicacion: '', descripcion: '', estado: 'Activo' })

const almacenes = ref([
  { id: 1, nombre: 'Almacén Central', ubicacion: 'Edificio A, Planta Baja', descripcion: 'Almacén principal del colegio', totalArticulos: 847, estado: 'Activo' },
  { id: 2, nombre: 'Almacén Norte', ubicacion: 'Edificio B, Piso 1', descripcion: 'Materiales de construcción y mantenimiento', totalArticulos: 312, estado: 'Activo' },
  { id: 3, nombre: 'Almacén Laboratorio', ubicacion: 'Bloque C', descripcion: 'Insumos de laboratorio', totalArticulos: 88, estado: 'Activo' }
])

function editAlmacen(almacen) {
  editingId.value = almacen.id
  form.value = { ...almacen }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
  form.value = { nombre: '', ubicacion: '', descripcion: '', estado: 'Activo' }
}

function saveAlmacen() {
  closeModal()
}
</script>
