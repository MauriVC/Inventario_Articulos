<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <p class="text-muted">Catálogo de colores para las variantes de artículos</p>
      <button class="btn btn-primary" @click="showModal = true"><Plus :size="18" /> Nuevo Color</button>
    </div>
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <table class="table">
          <thead><tr><th>#</th><th>Color</th><th>Nombre</th><th>Código Hex</th><th>Variantes</th><th>Estado</th><th v-if="auth.isAdmin">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="(c, i) in colores" :key="c.id">
              <td class="text-muted">{{ i + 1 }}</td>
              <td><span class="color-dot" :style="{ background: c.hex, width: '24px', height: '24px' }"></span></td>
              <td class="font-semibold">{{ c.nombre }}</td>
              <td><code style="background: var(--color-gray-100); padding: 2px 8px; border-radius: 4px; font-size: 13px;">{{ c.hex }}</code></td>
              <td class="text-center">{{ c.total }}</td>
              <td><span class="badge badge-success">Activo</span></td>
              <td v-if="auth.isAdmin"><div class="flex gap-1"><button class="btn btn-ghost btn-icon"><Pencil :size="16" /></button><button class="btn btn-ghost btn-icon"><Trash2 :size="16" style="color: var(--color-danger);" /></button></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header"><h2>Nuevo Color</h2><button class="btn btn-ghost btn-icon" @click="showModal = false"><X :size="20" /></button></div>
        <div class="modal-body">
          <div class="flex flex-col gap-4">
            <div class="form-group"><label class="form-label">Nombre *</label><input v-model="form.nombre" type="text" class="form-input" placeholder="Ej: Azul Marino" /></div>
            <div class="form-group">
              <label class="form-label">Código Hexadecimal</label>
              <div class="flex items-center gap-3">
                <input v-model="form.hex" type="color" style="width: 50px; height: 40px; border: 1px solid var(--color-gray-300); border-radius: 6px; cursor: pointer; padding: 2px;" />
                <input v-model="form.hex" type="text" class="form-input" placeholder="#007bff" style="flex: 1;" />
              </div>
            </div>
            <div class="color-preview" :style="{ background: form.hex || '#e9ecef' }">
              <span :style="{ color: isLight(form.hex) ? '#333' : '#fff' }">{{ form.nombre || 'Vista previa' }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showModal = false">Cancelar</button><button class="btn btn-primary"><Save :size="16" /> Guardar</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Plus, Pencil, Trash2, X, Save } from 'lucide-vue-next'
import { auth } from '@/auth'
const showModal = ref(false)
const form = ref({ nombre: '', hex: '#007bff' })

function isLight(hex) {
  if (!hex || hex.length < 7) return true
  const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}

const colores = ref([
  { id: 1, nombre: 'Azul', hex: '#007bff', total: 145 },
  { id: 2, nombre: 'Rojo', hex: '#dc3545', total: 120 },
  { id: 3, nombre: 'Verde bandera', hex: '#28a745', total: 89 },
  { id: 4, nombre: 'Amarillo', hex: '#ffc107', total: 78 },
  { id: 5, nombre: 'Celeste', hex: '#17a2b8', total: 56 },
  { id: 6, nombre: 'Negro', hex: '#343a40', total: 67 },
  { id: 7, nombre: 'Blanco', hex: '#ffffff', total: 98 },
  { id: 8, nombre: 'Naranja', hex: '#fd7e14', total: 34 },
  { id: 9, nombre: 'Morado', hex: '#6f42c1', total: 23 },
  { id: 10, nombre: 'Rosado pastel', hex: '#f8b1d1', total: 15 },
  { id: 11, nombre: 'S/N', hex: '#e9ecef', total: 234 }
])
</script>

<style scoped>
.color-preview {
  height: 60px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: var(--font-size-md);
  border: 1px solid var(--color-gray-200);
}
</style>
