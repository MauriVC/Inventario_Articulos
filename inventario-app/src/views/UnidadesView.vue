<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <p class="text-muted">Define las unidades de medida para los artículos</p>
      <button class="btn btn-primary" @click="openModal()"><Plus :size="18" /> Nueva Unidad</button>
    </div>
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <table class="table">
          <thead><tr><th>#</th><th>Nombre</th><th>Abreviatura</th><th>Estado</th><th v-if="auth.isAdmin">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="(u, i) in unidades" :key="u.id">
              <td class="text-muted">{{ i + 1 }}</td>
              <td class="font-semibold">{{ u.nombre }}</td>
              <td><span class="badge badge-primary">{{ u.abreviatura || '—' }}</span></td>
              <td><span class="badge badge-success">{{ u.estado }}</span></td>
              <td v-if="auth.isAdmin">
                <div class="flex gap-1">
                  <button class="btn btn-ghost btn-icon" @click="openModal(u)"><Pencil :size="16" /></button>
                  <button class="btn btn-ghost btn-icon" @click="eliminar(u.id)"><Trash2 :size="16" style="color: var(--color-danger);" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="unidades.length === 0">
              <td colspan="5" class="text-center text-muted" style="padding: var(--space-6);">No hay unidades registradas</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <!-- Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editing ? 'Editar Unidad' : 'Nueva Unidad de Medida' }}</h2>
          <button class="btn btn-ghost btn-icon" @click="showModal = false"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="flex flex-col gap-4">
            <div class="form-group"><label class="form-label">Nombre *</label><input v-model="form.nombre" type="text" class="form-input" placeholder="Ej: Kilogramo" /></div>
            <div class="form-group"><label class="form-label">Abreviatura</label><input v-model="form.abreviatura" type="text" class="form-input" placeholder="Ej: Kg" /></div>
          </div>
          <div class="text-sm" style="color: var(--color-danger); margin-top: var(--space-3);" v-if="formError">⚠ {{ formError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="guardar" :disabled="saving">
            <Save :size="16" /> {{ saving ? 'Guardando...' : 'Guardar' }}
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
const formError = ref('')
const unidades = ref([])
const form = ref({ nombre: '', abreviatura: '' })

onMounted(async () => {
  await cargar()
})

async function cargar() {
  try {
    const res = await api.getUnidades()
    unidades.value = res.data
  } catch (err) {
    console.error('Error cargando unidades:', err)
  }
}

function openModal(u = null) {
  editing.value = u
  form.value = u ? { nombre: u.nombre, abreviatura: u.abreviatura || '' } : { nombre: '', abreviatura: '' }
  formError.value = ''
  showModal.value = true
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
      await api.updateUnidad(editing.value.id, form.value)
    } else {
      await api.createUnidad(form.value)
    }
    showModal.value = false
    await cargar()
  } catch (err) {
    formError.value = err.message
  } finally {
    saving.value = false
  }
}

async function eliminar(id) {
  if (!confirm('¿Eliminar esta unidad de medida?')) return
  try {
    await api.deleteUnidad(id)
    await cargar()
  } catch (err) {
    alert('Error: ' + err.message)
  }
}
</script>
