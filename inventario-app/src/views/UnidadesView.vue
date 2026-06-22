<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <p class="text-muted">Define las unidades de medida para los artículos</p>
      <button class="btn btn-primary" @click="showModal = true"><Plus :size="18" /> Nueva Unidad</button>
    </div>
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <table class="table">
          <thead><tr><th>#</th><th>Nombre</th><th>Abreviatura</th><th>Artículos</th><th>Estado</th><th v-if="auth.isAdmin">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="(u, i) in unidades" :key="u.id">
              <td class="text-muted">{{ i + 1 }}</td>
              <td class="font-semibold">{{ u.nombre }}</td>
              <td><span class="badge badge-primary">{{ u.abreviatura }}</span></td>
              <td class="text-center">{{ u.total }}</td>
              <td><span class="badge badge-success">Activo</span></td>
              <td v-if="auth.isAdmin"><div class="flex gap-1"><button class="btn btn-ghost btn-icon"><Pencil :size="16" /></button><button class="btn btn-ghost btn-icon"><Trash2 :size="16" style="color: var(--color-danger);" /></button></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header"><h2>Nueva Unidad de Medida</h2><button class="btn btn-ghost btn-icon" @click="showModal = false"><X :size="20" /></button></div>
        <div class="modal-body"><div class="flex flex-col gap-4"><div class="form-group"><label class="form-label">Nombre *</label><input type="text" class="form-input" placeholder="Ej: Kilogramo" /></div><div class="form-group"><label class="form-label">Abreviatura</label><input type="text" class="form-input" placeholder="Ej: Kg" /></div></div></div>
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
const unidades = ref([
  { id: 1, nombre: 'Unidad', abreviatura: 'Ud', total: 680 },
  { id: 2, nombre: 'Litro', abreviatura: 'L', total: 89 },
  { id: 3, nombre: 'Kilogramo', abreviatura: 'Kg', total: 34 },
  { id: 4, nombre: 'Metro', abreviatura: 'm', total: 67 },
  { id: 5, nombre: 'Galón', abreviatura: 'Gal', total: 23 },
  { id: 6, nombre: 'Rollo', abreviatura: 'Rl', total: 15 },
  { id: 7, nombre: 'Paquete', abreviatura: 'Paq', total: 120 },
  { id: 8, nombre: 'Resma', abreviatura: 'Rsm', total: 45 },
  { id: 9, nombre: 'Caja', abreviatura: 'Cj', total: 28 },
  { id: 10, nombre: 'Bolsa', abreviatura: 'Bls', total: 18 }
])
</script>
