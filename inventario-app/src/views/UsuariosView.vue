<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <p class="text-muted">Administra los usuarios del sistema y sus almacenes asignados</p>
      <button class="btn btn-primary" @click="openCreateModal"><Plus :size="18" /> Nuevo Usuario</button>
    </div>

    <!-- Loading State -->
    <div class="card" v-if="loading">
      <div class="empty-state">
        <p>Cargando usuarios...</p>
      </div>
    </div>

    <!-- Table -->
    <div class="card" v-else>
      <div class="card-body" style="padding: 0;">
        <table class="table">
          <thead>
            <tr>
              <th>Carnet</th>
              <th>Nombres</th>
              <th>Apellidos</th>
              <th>Teléfono</th>
              <th>Rol</th>
              <th>Almacenes</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in usuarios" :key="u.id" :class="{ 'opacity-50': u.estado === 'Inactivo' }">
              <td class="font-semibold">{{ u.carnet }}</td>
              <td>{{ u.nombres }}</td>
              <td>{{ u.apellidos }}</td>
              <td class="text-muted">{{ u.telefono || '—' }}</td>
              <td>
                <span class="badge" :class="rolBadgeClass(u.rol)">{{ u.rol }}</span>
              </td>
              <td>
                <div class="flex gap-1" style="flex-wrap: wrap;">
                  <span class="almacen-pill" v-for="a in u.almacenes" :key="a.id">{{ a.nombre }}</span>
                  <span class="text-muted text-xs" v-if="u.almacenes.length === 0">Sin asignar</span>
                </div>
              </td>
              <td>
                <span class="badge" :class="u.estado === 'Activo' ? 'badge-success' : 'badge-danger'">{{ u.estado }}</span>
              </td>
              <td>
                <div class="flex gap-1">
                  <button class="btn btn-ghost btn-icon" @click="openEditModal(u)" title="Editar">
                    <Pencil :size="16" />
                  </button>
                  <button v-if="u.estado === 'Activo'" class="btn btn-ghost btn-icon" @click="toggleEstado(u)" title="Inhabilitar">
                    <UserMinus :size="16" style="color: var(--color-warning);" />
                  </button>
                  <button v-else class="btn btn-ghost btn-icon" @click="toggleEstado(u)" title="Habilitar">
                    <UserCheck :size="16" style="color: var(--color-success);" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="usuarios.length === 0">
              <td colspan="8" style="text-align: center; padding: var(--space-8);">
                <div class="empty-state" style="padding: var(--space-6);">
                  <p class="text-muted">No hay usuarios registrados</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h2>{{ isEditing ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
          <button class="btn btn-ghost btn-icon" @click="closeModal"><X :size="20" /></button>
        </div>
        <form @submit.prevent="saveUsuario">
          <div class="modal-body">
            <div class="grid-2 mb-4">
              <div class="form-group">
                <label class="form-label">Carnet *</label>
                <input type="text" v-model="form.carnet" class="form-input" placeholder="Carnet de identidad" required />
              </div>
              <div class="form-group">
                <label class="form-label">Teléfono</label>
                <input type="text" v-model="form.telefono" class="form-input" placeholder="Número de teléfono" />
              </div>
            </div>
            <div class="grid-2 mb-4">
              <div class="form-group">
                <label class="form-label">Nombres *</label>
                <input type="text" v-model="form.nombres" class="form-input" placeholder="Nombres" required />
              </div>
              <div class="form-group">
                <label class="form-label">Apellidos *</label>
                <input type="text" v-model="form.apellidos" class="form-input" placeholder="Apellidos" required />
              </div>
            </div>
            <div class="grid-2 mb-4">
              <div class="form-group">
                <label class="form-label">Contraseña <span v-if="!isEditing">*</span></label>
                <input type="password" v-model="form.contrasena" class="form-input" :placeholder="isEditing ? 'Dejar en blanco para no cambiar' : 'Contraseña segura'" :required="!isEditing" />
              </div>
              <div class="form-group">
                <label class="form-label">Rol *</label>
                <select v-model="form.rol" class="form-select" required>
                  <option value="Usuario">Usuario</option>
                  <option value="Administrador">Administrador</option>
                  <option value="SuperAdministrador">SuperAdministrador</option>
                </select>
              </div>
            </div>

            <!-- Warehouse Assignment -->
            <div class="almacen-assignment mt-6">
              <h3 class="font-semibold mb-2" style="color: var(--color-gray-700); font-size: var(--font-size-base);">Asignar Almacenes</h3>
              <p class="text-sm text-muted mb-3">Selecciona los almacenes a los que tendrá acceso este usuario. Es opcional.</p>
              
              <div class="flex flex-col gap-2" v-if="almacenesDisponibles.length > 0">
                <label class="almacen-checkbox" v-for="a in almacenesDisponibles" :key="a.id">
                  <input type="checkbox" :value="a.id" v-model="form.almacenes" />
                  <span class="almacen-checkbox-custom"></span>
                  <div class="almacen-checkbox-info">
                    <span class="font-medium">{{ a.nombre }}</span>
                    <span class="text-xs text-muted">{{ a.ubicacion || 'Sin ubicación' }}</span>
                  </div>
                </label>
              </div>
              <div v-else class="text-sm text-muted">
                No hay almacenes disponibles para asignar.
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <Save :size="16" /> {{ saving ? 'Guardando...' : 'Guardar Usuario' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Pencil, Trash2, X, Save, UserMinus, UserCheck } from 'lucide-vue-next'
import { api } from '@/api'

const showModal = ref(false)
const loading = ref(true)
const saving = ref(false)
const isEditing = ref(false)

const usuarios = ref([])
const almacenesDisponibles = ref([])

const form = ref({
  id: null,
  carnet: '',
  nombres: '',
  apellidos: '',
  telefono: '',
  contrasena: '',
  rol: 'Usuario',
  almacenes: [] // Array of IDs
})

onMounted(async () => {
  await Promise.all([
    loadUsuarios(),
    loadAlmacenes()
  ])
})

async function loadUsuarios() {
  loading.value = true
  try {
    const res = await api.getUsuarios()
    usuarios.value = res.data
  } catch (err) {
    console.error('Error cargando usuarios:', err)
  } finally {
    loading.value = false
  }
}

async function loadAlmacenes() {
  try {
    const res = await api.getAlmacenes()
    almacenesDisponibles.value = res.data
  } catch (err) {
    console.error('Error cargando almacenes:', err)
  }
}

function rolBadgeClass(rol) {
  if (rol === 'SuperAdministrador') return 'badge-dark'
  if (rol === 'Administrador') return 'badge-medium'
  return 'badge-light'
}

function openCreateModal() {
  isEditing.value = false
  form.value = {
    id: null,
    carnet: '',
    nombres: '',
    apellidos: '',
    telefono: '',
    contrasena: '',
    rol: 'Usuario',
    almacenes: []
  }
  showModal.value = true
}

function openEditModal(usuario) {
  isEditing.value = true
  form.value = {
    id: usuario.id,
    carnet: usuario.carnet,
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
    telefono: usuario.telefono || '',
    contrasena: '', // Empty unless changing
    rol: usuario.rol,
    almacenes: usuario.almacenes.map(a => a.id) // Map to array of IDs
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function saveUsuario() {
  saving.value = true
  try {
    const dataToSend = { ...form.value }
    if (isEditing.value && !dataToSend.contrasena) {
      delete dataToSend.contrasena // Don't send empty password if editing
    }

    if (isEditing.value) {
      await api.updateUsuario(form.value.id, dataToSend)
    } else {
      await api.createUsuario(dataToSend)
    }
    closeModal()
    await loadUsuarios()
  } catch (err) {
    alert('Error al guardar usuario: ' + (err.response?.data?.error || err.message))
  } finally {
    saving.value = false
  }
}

async function toggleEstado(usuario) {
  const newEstado = usuario.estado === 'Activo' ? 'Inactivo' : 'Activo'
  if (!confirm(`¿Estás seguro de que deseas ${newEstado === 'Inactivo' ? 'inhabilitar' : 'habilitar'} al usuario ${usuario.nombres}?`)) {
    return
  }

  try {
    // Re-send same data but change 'estado'
    await api.updateUsuario(usuario.id, {
      carnet: usuario.carnet,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      telefono: usuario.telefono,
      rol: usuario.rol,
      estado: newEstado,
      almacenes: usuario.almacenes.map(a => a.id)
    })
    await loadUsuarios()
  } catch (err) {
    alert('Error al cambiar estado: ' + err.message)
  }
}
</script>

<style scoped>
.almacen-pill {
  display: inline-block;
  padding: 2px 8px;
  background: var(--color-primary-lightest);
  color: var(--color-primary-dark);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;
}
.almacen-assignment {
  background: var(--color-gray-50);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  border: 1px solid var(--color-gray-200);
}
.almacen-checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: var(--color-white);
}
.almacen-checkbox:hover {
  border-color: var(--color-primary-light);
  background: var(--color-primary-lightest);
}
.almacen-checkbox input[type="checkbox"] {
  width: 18px; height: 18px; accent-color: var(--color-primary);
  cursor: pointer; flex-shrink: 0;
}
.almacen-checkbox-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
</style>
