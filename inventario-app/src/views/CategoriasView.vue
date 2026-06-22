<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <p class="text-muted">Organiza los artículos en categorías y subcategorías</p>
      <button class="btn btn-primary" @click="showModal = true"><Plus :size="18" /> Nueva Categoría</button>
    </div>
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <table class="table">
          <thead><tr><th>#</th><th>Nombre</th><th>Categoría Padre</th><th>Descripción</th><th>Artículos</th><th>Estado</th><th v-if="auth.isAdmin">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="(c, i) in categorias" :key="c.id">
              <td class="text-muted">{{ i + 1 }}</td>
              <td class="font-semibold">
                <span v-if="c.padre" class="text-muted">└─ </span>{{ c.nombre }}
              </td>
              <td>{{ c.padre || '—' }}</td>
              <td class="text-muted text-sm">{{ c.descripcion || '—' }}</td>
              <td class="text-center"><span class="badge badge-primary">{{ c.total }}</span></td>
              <td><span class="badge badge-success">Activo</span></td>
              <td v-if="auth.isAdmin">
                <div class="flex gap-1">
                  <button class="btn btn-ghost btn-icon" title="Editar"><Pencil :size="16" /></button>
                  <button class="btn btn-ghost btn-icon" title="Eliminar"><Trash2 :size="16" style="color: var(--color-danger);" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <!-- Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header"><h2>Nueva Categoría</h2><button class="btn btn-ghost btn-icon" @click="showModal = false"><X :size="20" /></button></div>
        <div class="modal-body">
          <div class="flex flex-col gap-4">
            <div class="form-group"><label class="form-label">Nombre *</label><input type="text" class="form-input" placeholder="Ej: Pinturas" /></div>
            <div class="form-group"><label class="form-label">Categoría Padre</label>
              <select class="form-select"><option value="">Ninguna (Categoría raíz)</option><option v-for="c in categorias.filter(x => !x.padre)" :key="c.id">{{ c.nombre }}</option></select>
            </div>
            <div class="form-group"><label class="form-label">Descripción</label><input type="text" class="form-input" placeholder="Descripción opcional" /></div>
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
const categorias = ref([
  { id: 1, nombre: 'Material de Escritorio', padre: null, descripcion: 'Materiales escolares y de oficina', total: 423 },
  { id: 2, nombre: 'Cuadernos', padre: 'Material de Escritorio', descripcion: 'Cuadernos de todas las medidas', total: 280 },
  { id: 3, nombre: 'Hojas y Papelería', padre: 'Material de Escritorio', descripcion: 'Resmas, hojas sueltas, cartulinas', total: 143 },
  { id: 4, nombre: 'Herramientas', padre: null, descripcion: 'Herramientas manuales y eléctricas', total: 156 },
  { id: 5, nombre: 'Pinturas', padre: null, descripcion: 'Pinturas latex, esmalte, spray', total: 89 },
  { id: 6, nombre: 'Mat. Construcción', padre: null, descripcion: 'Fierros, cemento, arena', total: 67 },
  { id: 7, nombre: 'EPP', padre: null, descripcion: 'Equipos de protección personal', total: 45 }
])
</script>
