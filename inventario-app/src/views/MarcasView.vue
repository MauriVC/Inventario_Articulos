<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <p class="text-muted">Marcas de los artículos del inventario</p>
      <button class="btn btn-primary" @click="showModal = true"><Plus :size="18" /> Nueva Marca</button>
    </div>
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <table class="table">
          <thead><tr><th>#</th><th>Nombre</th><th>Descripción</th><th>Artículos</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr v-for="(m, i) in marcas" :key="m.id">
              <td class="text-muted">{{ i + 1 }}</td>
              <td class="font-semibold">{{ m.nombre }}</td>
              <td class="text-muted text-sm">{{ m.descripcion || '—' }}</td>
              <td class="text-center"><span class="badge badge-primary">{{ m.total }}</span></td>
              <td><span class="badge badge-success">Activo</span></td>
              <td><div class="flex gap-1"><button class="btn btn-ghost btn-icon"><Pencil :size="16" /></button><button class="btn btn-ghost btn-icon"><Trash2 :size="16" style="color: var(--color-danger);" /></button></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header"><h2>Nueva Marca</h2><button class="btn btn-ghost btn-icon" @click="showModal = false"><X :size="20" /></button></div>
        <div class="modal-body"><div class="flex flex-col gap-4"><div class="form-group"><label class="form-label">Nombre *</label><input type="text" class="form-input" placeholder="Ej: Stanley" /></div><div class="form-group"><label class="form-label">Descripción</label><input type="text" class="form-input" placeholder="Descripción opcional" /></div></div></div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="showModal = false">Cancelar</button><button class="btn btn-primary"><Save :size="16" /> Guardar</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Plus, Pencil, Trash2, X, Save } from 'lucide-vue-next'
const showModal = ref(false)
const marcas = ref([
  { id: 1, nombre: 'Norma', descripcion: 'Cuadernos y papelería escolar', total: 280 },
  { id: 2, nombre: 'Faber-Castell', descripcion: 'Lápices, colores y papelería', total: 95 },
  { id: 3, nombre: 'Monopol', descripcion: 'Pinturas y recubrimientos', total: 67 },
  { id: 4, nombre: 'Stanley', descripcion: 'Herramientas profesionales', total: 48 },
  { id: 5, nombre: 'Sika', descripcion: 'Adhesivos y materiales de construcción', total: 34 },
  { id: 6, nombre: 'Aceros Bolivia', descripcion: 'Fierros y productos metálicos', total: 22 }
])
</script>
