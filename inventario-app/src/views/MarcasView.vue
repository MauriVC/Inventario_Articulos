<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <p class="text-muted">Marcas de los artículos del inventario</p>
      <button class="btn btn-primary" @click="openModal()"><Plus :size="18" /> Nueva Marca</button>
    </div>
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <table class="table">
          <thead><tr><th>#</th><th>Nombre</th><th>Descripción</th><th>Estado</th><th v-if="auth.isAdmin">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="(m, i) in marcas" :key="m.id">
              <td class="text-muted">{{ i + 1 }}</td>
              <td class="font-semibold">{{ m.nombre }}</td>
              <td class="text-muted text-sm">{{ m.descripcion || '—' }}</td>
              <td><span class="badge badge-success">{{ m.estado }}</span></td>
              <td v-if="auth.isAdmin">
                <div class="flex gap-1">
                  <button class="btn btn-ghost btn-icon" @click="openModal(m)"><Pencil :size="16" /></button>
                  <button class="btn btn-ghost btn-icon" @click="eliminar(m.id)"><Trash2 :size="16" style="color: var(--color-danger);" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="marcas.length === 0">
              <td colspan="5" class="text-center text-muted" style="padding: var(--space-6);">No hay marcas registradas</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header"><h2>{{ editing ? 'Editar Marca' : 'Nueva Marca' }}</h2><button class="btn btn-ghost btn-icon" @click="showModal = false"><X :size="20" /></button></div>
        <div class="modal-body"><div class="flex flex-col gap-4"><div class="form-group"><label class="form-label">Nombre *</label><input v-model="form.nombre" type="text" class="form-input" placeholder="Ej: Stanley" /></div><div class="form-group"><label class="form-label">Descripción</label><input v-model="form.descripcion" type="text" class="form-input" placeholder="Descripción opcional" /></div></div>
        <div class="text-sm" style="color: var(--color-danger); margin-top: var(--space-3);" v-if="formError">⚠ {{ formError }}</div></div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showModal = false">Cancelar</button><button class="btn btn-primary" @click="guardar" :disabled="saving"><Save :size="16" /> {{ saving ? 'Guardando...' : 'Guardar' }}</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Pencil, Trash2, X, Save } from 'lucide-vue-next'
import { api } from '@/api'
import { auth } from '@/auth'
import { confirmAction, showError, showWarning, showSuccess } from '@/utils/alerts'

const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')
const marcas = ref([])
const form = ref({ nombre: '', descripcion: '' })

onMounted(async () => { await cargar() })

async function cargar() {
  try { const res = await api.getMarcas(); marcas.value = res.data } catch (err) { console.error('Error cargando marcas:', err) }
}

function openModal(m = null) {
  editing.value = m
  form.value = m ? { nombre: m.nombre, descripcion: m.descripcion || '' } : { nombre: '', descripcion: '' }
  formError.value = ''
  showModal.value = true
}

async function guardar() {
  if (!form.value.nombre.trim()) { formError.value = 'El nombre es obligatorio'; return }
  saving.value = true; formError.value = ''
  try {
    if (editing.value) { await api.updateMarca(editing.value.id, form.value); showSuccess('Marca actualizada') } else { await api.createMarca(form.value); showSuccess('Marca creada') }
    showModal.value = false; await cargar()
  } catch (err) { formError.value = err.message } finally { saving.value = false }
}

async function eliminar(id) {
  if (!await confirmAction('Eliminar Marca', '¿Eliminar esta marca?')) return
  try { await api.deleteMarca(id); showSuccess('Marca eliminada'); await cargar() } catch (err) { showError('Error: ' + err.message) }
}
</script>
