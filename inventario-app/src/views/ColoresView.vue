<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <p class="text-muted">Gestiona los colores disponibles para las variantes de los artículos</p>
      <button class="btn btn-primary" @click="openModal()"><Plus :size="18" /> Nuevo Color</button>
    </div>
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <table class="table">
          <thead><tr><th>#</th><th>Color</th><th>Nombre</th><th>Código Hex</th><th>Estado</th><th v-if="auth.isAdmin">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="(c, i) in colores" :key="c.id">
              <td class="text-muted">{{ i + 1 }}</td>
              <td><span class="color-dot" :style="{ background: c.codigo_hex, width: '20px', height: '20px' }"></span></td>
              <td class="font-semibold">{{ c.nombre }}</td>
              <td class="text-muted font-mono text-sm">{{ c.codigo_hex }}</td>
              <td><span class="badge badge-success">{{ c.estado }}</span></td>
              <td v-if="auth.isAdmin">
                <div class="flex gap-1">
                  <button class="btn btn-ghost btn-icon" @click="openModal(c)"><Pencil :size="16" /></button>
                  <button class="btn btn-ghost btn-icon" @click="eliminar(c.id)" :disabled="c.nombre === 'S/N'"><Trash2 :size="16" :style="{ color: c.nombre === 'S/N' ? 'var(--color-gray-400)' : 'var(--color-danger)' }" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="colores.length === 0">
              <td colspan="6" class="text-center text-muted" style="padding: var(--space-6);">No hay colores registrados</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header"><h2>{{ editing ? 'Editar Color' : 'Nuevo Color' }}</h2><button class="btn btn-ghost btn-icon" @click="showModal = false"><X :size="20" /></button></div>
        <div class="modal-body">
          <div class="flex flex-col gap-4">
            <div class="form-group"><label class="form-label">Nombre del Color *</label><input v-model="form.nombre" type="text" class="form-input" placeholder="Ej: Rojo Oscuro" /></div>
            <div class="form-group"><label class="form-label">Código Hexadecimal *</label>
              <div class="flex items-center gap-3">
                <input v-model="form.codigo_hex" type="color" style="width: 50px; height: 40px; padding: 0; cursor: pointer; border-radius: var(--radius-sm); border: 1px solid var(--color-gray-300);" />
                <input v-model="form.codigo_hex" type="text" class="form-input font-mono flex-1" placeholder="#FF0000" />
              </div>
            </div>
          </div>
          <div class="text-sm" style="color: var(--color-danger); margin-top: var(--space-3);" v-if="formError">⚠ {{ formError }}</div>
        </div>
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

const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')
const colores = ref([])
const form = ref({ nombre: '', codigo_hex: '#000000' })

onMounted(async () => { await cargar() })

async function cargar() {
  try { const res = await api.getColores(); colores.value = res.data } catch (err) { console.error('Error cargando colores:', err) }
}

function openModal(c = null) {
  editing.value = c
  form.value = c ? { nombre: c.nombre, codigo_hex: c.codigo_hex || '#000000' } : { nombre: '', codigo_hex: '#000000' }
  formError.value = ''
  showModal.value = true
}

async function guardar() {
  if (!form.value.nombre.trim() || !form.value.codigo_hex.trim()) { formError.value = 'El nombre y el color son obligatorios'; return }
  saving.value = true; formError.value = ''
  try {
    if (editing.value) { await api.updateColor(editing.value.id, form.value) } else { await api.createColor(form.value) }
    showModal.value = false; await cargar()
  } catch (err) { formError.value = err.message } finally { saving.value = false }
}

async function eliminar(id) {
  if (!confirm('¿Eliminar este color?')) return
  try { await api.deleteColor(id); await cargar() } catch (err) { alert('Error: ' + err.message) }
}
</script>
