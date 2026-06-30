<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <p class="text-muted">Organiza los artículos en categorías y subcategorías</p>
      <button class="btn btn-primary" @click="openModal()"><Plus :size="18" /> Nueva Categoría</button>
    </div>
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <table class="table">
          <thead><tr><th>#</th><th>Nombre</th><th>Categoría Padre</th><th>Descripción</th><th>Estado</th><th v-if="auth.isAdmin">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="(c, i) in categorias" :key="c.id">
              <td class="text-muted">{{ i + 1 }}</td>
              <td class="font-semibold">
                <span v-if="c.padre_nombre" class="text-muted">└─ </span>{{ c.nombre }}
              </td>
              <td>{{ c.padre_nombre || '—' }}</td>
              <td class="text-muted text-sm">{{ c.descripcion || '—' }}</td>
              <td><span class="badge badge-success">{{ c.estado }}</span></td>
              <td v-if="auth.isAdmin">
                <div class="flex gap-1">
                  <button class="btn btn-ghost btn-icon" @click="openModal(c)"><Pencil :size="16" /></button>
                  <button class="btn btn-ghost btn-icon" @click="eliminar(c.id)"><Trash2 :size="16" style="color: var(--color-danger);" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="categorias.length === 0">
              <td colspan="6" class="text-center text-muted" style="padding: var(--space-6);">No hay categorías registradas</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <!-- Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header"><h2>{{ editing ? 'Editar Categoría' : 'Nueva Categoría' }}</h2><button class="btn btn-ghost btn-icon" @click="showModal = false"><X :size="20" /></button></div>
        <div class="modal-body">
          <div class="flex flex-col gap-4">
            <div class="form-group"><label class="form-label">Nombre *</label><input v-model="form.nombre" type="text" class="form-input" placeholder="Ej: Pinturas" /></div>
            <div class="form-group"><label class="form-label">Categoría Padre</label>
              <select v-model="form.padre_id" class="form-select">
                <option :value="null">Ninguna (Categoría raíz)</option>
                <option v-for="c in categoriasRaiz" :key="c.id" :value="c.id">{{ c.nombre }}</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">Descripción</label><input v-model="form.descripcion" type="text" class="form-input" placeholder="Descripción opcional" /></div>
          </div>
          <div class="text-sm" style="color: var(--color-danger); margin-top: var(--space-3);" v-if="formError">⚠ {{ formError }}</div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showModal = false">Cancelar</button><button class="btn btn-primary" @click="guardar" :disabled="saving"><Save :size="16" /> {{ saving ? 'Guardando...' : 'Guardar' }}</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, Pencil, Trash2, X, Save } from 'lucide-vue-next'
import { api } from '@/api'
import { auth } from '@/auth'
import { confirmAction, showError, showWarning, showSuccess } from '@/utils/alerts'

const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')
const categorias = ref([])
const form = ref({ nombre: '', padre_id: null, descripcion: '' })

const categoriasRaiz = computed(() => categorias.value.filter(c => !c.padre_id))

onMounted(async () => { await cargar() })

async function cargar() {
  try { const res = await api.getCategorias(); categorias.value = res.data } catch (err) { console.error('Error:', err) }
}

function openModal(c = null) {
  editing.value = c
  form.value = c ? { nombre: c.nombre, padre_id: c.padre_id || null, descripcion: c.descripcion || '' } : { nombre: '', padre_id: null, descripcion: '' }
  formError.value = ''
  showModal.value = true
}

async function guardar() {
  if (!form.value.nombre.trim()) { formError.value = 'El nombre es obligatorio'; return }
  saving.value = true; formError.value = ''
  try {
    if (editing.value) { await api.updateCategoria(editing.value.id, form.value); showSuccess('Categoría actualizada') } else { await api.createCategoria(form.value); showSuccess('Categoría creada') }
    showModal.value = false; await cargar()
  } catch (err) { formError.value = err.message } finally { saving.value = false }
}

async function eliminar(id) {
  if (!await confirmAction('Eliminar Categoría', '¿Eliminar esta categoría?')) return
  try { await api.deleteCategoria(id); showSuccess('Categoría eliminada'); await cargar() } catch (err) { showError('Error: ' + err.message) }
}
</script>
