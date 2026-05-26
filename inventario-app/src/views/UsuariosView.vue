<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <p class="text-muted">Administra los usuarios del sistema y sus almacenes asignados</p>
      <button class="btn btn-primary" @click="showModal = true"><Plus :size="18" /> Nuevo Usuario</button>
    </div>
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <table class="table">
          <thead><tr><th>Carnet</th><th>Nombres</th><th>Apellidos</th><th>Teléfono</th><th>Rol</th><th>Almacenes</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr v-for="u in usuarios" :key="u.id">
              <td class="font-semibold">{{ u.carnet }}</td>
              <td>{{ u.nombres }}</td>
              <td>{{ u.apellidos }}</td>
              <td class="text-muted">{{ u.telefono || '—' }}</td>
              <td>
                <span class="badge" :class="rolBadgeClass(u.rol)">{{ u.rol }}</span>
              </td>
              <td>
                <div class="flex gap-1" style="flex-wrap: wrap;">
                  <span class="almacen-pill" v-for="a in u.almacenes" :key="a">{{ a }}</span>
                  <span class="text-muted text-xs" v-if="u.almacenes.length === 0">Sin asignar</span>
                </div>
              </td>
              <td><span class="badge" :class="u.estado === 'Activo' ? 'badge-success' : 'badge-danger'">{{ u.estado }}</span></td>
              <td><div class="flex gap-1"><button class="btn btn-ghost btn-icon"><Pencil :size="16" /></button><button class="btn btn-ghost btn-icon"><Trash2 :size="16" style="color: var(--color-danger);" /></button></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-content modal-lg">
        <div class="modal-header"><h2>Nuevo Usuario</h2><button class="btn btn-ghost btn-icon" @click="showModal = false"><X :size="20" /></button></div>
        <div class="modal-body">
          <div class="grid-2 mb-4">
            <div class="form-group"><label class="form-label">Carnet *</label><input type="text" class="form-input" placeholder="Carnet de identidad" /></div>
            <div class="form-group"><label class="form-label">Teléfono</label><input type="text" class="form-input" placeholder="Número de teléfono" /></div>
          </div>
          <div class="grid-2 mb-4">
            <div class="form-group"><label class="form-label">Nombres *</label><input type="text" class="form-input" placeholder="Nombres" /></div>
            <div class="form-group"><label class="form-label">Apellidos *</label><input type="text" class="form-input" placeholder="Apellidos" /></div>
          </div>
          <div class="grid-2 mb-4">
            <div class="form-group"><label class="form-label">Contraseña *</label><input type="password" class="form-input" placeholder="Contraseña segura" /></div>
            <div class="form-group"><label class="form-label">Rol *</label>
              <select class="form-select">
                <option>Usuario</option>
                <option>Administrador</option>
                <option>SuperAdministrador</option>
              </select>
            </div>
          </div>

          <!-- Warehouse Assignment -->
          <div class="almacen-assignment">
            <h3 class="font-semibold mb-2" style="color: var(--color-gray-700); font-size: var(--font-size-base);">Asignar Almacenes</h3>
            <p class="text-sm text-muted mb-3">Selecciona los almacenes a los que tendrá acceso este usuario. Es opcional.</p>
            <div class="flex flex-col gap-2">
              <label class="almacen-checkbox" v-for="a in almacenesDisponibles" :key="a.id">
                <input type="checkbox" v-model="a.checked" />
                <span class="almacen-checkbox-custom"></span>
                <div class="almacen-checkbox-info">
                  <span class="font-medium">{{ a.nombre }}</span>
                  <span class="text-xs text-muted">{{ a.ubicacion }}</span>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showModal = false">Cancelar</button><button class="btn btn-primary"><Save :size="16" /> Guardar Usuario</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Plus, Pencil, Trash2, X, Save } from 'lucide-vue-next'
const showModal = ref(false)

function rolBadgeClass(rol) {
  if (rol === 'SuperAdministrador') return 'badge-dark'
  if (rol === 'Administrador') return 'badge-medium'
  return 'badge-light'
}

const almacenesDisponibles = ref([
  { id: 1, nombre: 'Almacén Central', ubicacion: 'Edificio A, Planta Baja', checked: true },
  { id: 2, nombre: 'Almacén Norte', ubicacion: 'Edificio B, Piso 1', checked: false },
  { id: 3, nombre: 'Almacén Laboratorio', ubicacion: 'Bloque C', checked: false }
])

const usuarios = ref([
  { id: 1, carnet: '9876543', nombres: 'Admin', apellidos: 'Sistema', telefono: '70000001', rol: 'SuperAdministrador', almacenes: ['Almacén Central', 'Almacén Norte', 'Almacén Laboratorio'], estado: 'Activo' },
  { id: 2, carnet: '1234567', nombres: 'Juan Carlos', apellidos: 'Pérez Mendoza', telefono: '70012345', rol: 'Administrador', almacenes: ['Almacén Central', 'Almacén Norte'], estado: 'Activo' },
  { id: 3, carnet: '2345678', nombres: 'María', apellidos: 'López Gutierrez', telefono: '71234567', rol: 'Administrador', almacenes: ['Almacén Laboratorio'], estado: 'Activo' },
  { id: 4, carnet: '3456789', nombres: 'Pedro', apellidos: 'Gómez Quispe', telefono: '72345678', rol: 'Usuario', almacenes: ['Almacén Central'], estado: 'Activo' },
  { id: 5, carnet: '4567890', nombres: 'Ana', apellidos: 'Torres Flores', telefono: '', rol: 'Usuario', almacenes: ['Almacén Norte'], estado: 'Activo' },
  { id: 6, carnet: '5678901', nombres: 'Luis', apellidos: 'Mamani Condori', telefono: '73456789', rol: 'Usuario', almacenes: [], estado: 'Inactivo' }
])
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
