<template>
  <div class="dashboard">
    <!-- Stats Cards -->
    <div class="grid-4 mb-6">
      <div class="stat-card" v-for="stat in stats" :key="stat.label">
        <div class="stat-card-icon" :style="{ background: stat.bg, color: stat.color }">
          <component :is="stat.icon" :size="24" />
        </div>
        <div class="stat-card-info">
          <span class="stat-card-value">{{ stat.value }}</span>
          <span class="stat-card-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="dashboard-grid mb-6">
      <!-- Monthly Movements Chart -->
      <div class="card">
        <div class="card-header">
          <h3>Movimientos Mensuales</h3>
          <select class="form-select" style="width: auto;">
            <option>2026</option>
            <option>2025</option>
          </select>
        </div>
        <div class="card-body">
          <div class="chart-bars">
            <div class="chart-bar-group" v-for="month in chartData" :key="month.label">
              <div class="chart-bar-container">
                <div class="chart-bar bar-entrada" :style="{ height: month.entrada + '%' }" :title="'Entradas: ' + month.entrada"></div>
                <div class="chart-bar bar-salida" :style="{ height: month.salida + '%' }" :title="'Salidas: ' + month.salida"></div>
              </div>
              <span class="chart-label">{{ month.label }}</span>
            </div>
          </div>
          <div class="chart-legend">
            <span class="chart-legend-item"><span class="chart-legend-dot dot-entrada"></span> Entradas</span>
            <span class="chart-legend-item"><span class="chart-legend-dot dot-salida"></span> Salidas</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions + Info -->
      <div class="dashboard-right-col">
        <!-- Quick Actions -->
        <div class="card">
          <div class="card-header">
            <h3>Acciones Rápidas</h3>
          </div>
          <div class="card-body">
            <div class="quick-actions">
              <router-link to="/movimientos/salida" class="quick-action-btn qa-salida">
                <ArrowUpFromLine :size="20" />
                <span>Nueva Salida</span>
              </router-link>
              <router-link to="/movimientos/entrada" class="quick-action-btn qa-entrada">
                <ArrowDownToLine :size="20" />
                <span>Nueva Entrada</span>
              </router-link>
              <router-link to="/articulos" class="quick-action-btn qa-articulo">
                <PackagePlus :size="20" />
                <span>Nuevo Artículo</span>
              </router-link>
              <router-link to="/historial" class="quick-action-btn qa-historial">
                <ClipboardList :size="20" />
                <span>Ver Historial</span>
              </router-link>
            </div>
          </div>
        </div>

        <!-- Low Stock Alerts -->
        <div class="card">
          <div class="card-header">
            <h3>Alertas de Stock</h3>
            <span class="badge badge-warning">3</span>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="alert-item" v-for="alert in stockAlerts" :key="alert.name">
              <div class="alert-info">
                <span class="alert-name">{{ alert.name }}</span>
                <span class="alert-location text-sm text-muted">{{ alert.almacen }}</span>
              </div>
              <span class="badge" :class="alert.stock <= 5 ? 'badge-danger' : 'badge-warning'">
                Stock: {{ alert.stock }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Movements Table -->
    <div class="card">
      <div class="card-header">
        <h3>Últimos Movimientos</h3>
        <router-link to="/historial" class="btn btn-ghost btn-sm">
          Ver todo
          <ChevronRight :size="16" />
        </router-link>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Almacén</th>
                <th>Solicitante</th>
                <th>Destino / Procedencia</th>
                <th>Artículos</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="mov in recentMovements" :key="mov.codigo">
                <td class="font-semibold">{{ mov.codigo }}</td>
                <td>
                  <span class="badge" :class="mov.tipo === 'SALIDA' ? 'badge-danger' : 'badge-success'">
                    {{ mov.tipo }}
                  </span>
                </td>
                <td>{{ mov.almacen }}</td>
                <td>{{ mov.solicitante }}</td>
                <td>{{ mov.destino }}</td>
                <td class="text-center">{{ mov.articulos }}</td>
                <td class="text-muted text-sm">{{ mov.fecha }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  Package, Warehouse, ArrowUpFromLine, ArrowDownToLine,
  PackagePlus, ClipboardList, ChevronRight, AlertTriangle
} from 'lucide-vue-next'

const stats = ref([
  { label: 'Total Artículos', value: '1,247', icon: Package, bg: 'var(--color-primary-lightest)', color: 'var(--color-primary)' },
  { label: 'Almacenes Activos', value: '3', icon: Warehouse, bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  { label: 'Salidas Hoy', value: '12', icon: ArrowUpFromLine, bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
  { label: 'Entradas Hoy', value: '8', icon: ArrowDownToLine, bg: 'var(--color-success-bg)', color: 'var(--color-success)' }
])

const chartData = ref([
  { label: 'Ene', entrada: 65, salida: 80 },
  { label: 'Feb', entrada: 50, salida: 60 },
  { label: 'Mar', entrada: 75, salida: 70 },
  { label: 'Abr', entrada: 60, salida: 85 },
  { label: 'May', entrada: 90, salida: 55 },
  { label: 'Jun', entrada: 40, salida: 45 },
  { label: 'Jul', entrada: 70, salida: 65 },
  { label: 'Ago', entrada: 55, salida: 75 },
  { label: 'Sep', entrada: 80, salida: 50 },
  { label: 'Oct', entrada: 45, salida: 60 },
  { label: 'Nov', entrada: 60, salida: 70 },
  { label: 'Dic', entrada: 30, salida: 35 }
])

const stockAlerts = ref([
  { name: 'Cuaderno 100h Azul', almacen: 'Almacén Central', stock: 3 },
  { name: 'Pintura Latex Blanca 1L', almacen: 'Almacén Norte', stock: 5 },
  { name: 'Folder Oficio Rojo', almacen: 'Almacén Central', stock: 8 }
])

const recentMovements = ref([
  { codigo: 'SAL-2026-0012', tipo: 'SALIDA', almacen: 'Almacén Central', solicitante: 'Carlos Pérez', destino: 'Aula 3A', articulos: 3, fecha: '26/05/2026 10:30' },
  { codigo: 'ENT-2026-0008', tipo: 'ENTRADA', almacen: 'Almacén Central', solicitante: 'María López', destino: 'Laboratorio', articulos: 2, fecha: '26/05/2026 09:15' },
  { codigo: 'SAL-2026-0011', tipo: 'SALIDA', almacen: 'Almacén Norte', solicitante: 'Pedro Gómez', destino: 'Taller Mecánica', articulos: 5, fecha: '25/05/2026 16:45' },
  { codigo: 'ENT-2026-0007', tipo: 'ENTRADA', almacen: 'Almacén Central', solicitante: 'Ana Torres', destino: 'Dirección', articulos: 1, fecha: '25/05/2026 14:20' },
  { codigo: 'SAL-2026-0010', tipo: 'SALIDA', almacen: 'Almacén Central', solicitante: 'Luis Mamani', destino: 'Sala de Profesores', articulos: 4, fecha: '25/05/2026 11:00' }
])
</script>

<style scoped>
/* Stat Cards */
.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--color-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-gray-200);
  transition: all var(--transition-base);
}
.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.stat-card-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-card-info {
  display: flex;
  flex-direction: column;
}
.stat-card-value {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  color: var(--color-gray-800);
  line-height: 1;
}
.stat-card-label {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
  margin-top: 4px;
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: var(--space-6);
}
.dashboard-right-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* Chart */
.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
  height: 200px;
  padding: var(--space-4) 0;
}
.chart-bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
.chart-bar-container {
  display: flex;
  gap: 3px;
  align-items: flex-end;
  height: 160px;
  width: 100%;
  justify-content: center;
}
.chart-bar {
  width: 14px;
  border-radius: 3px 3px 0 0;
  transition: height var(--transition-slow);
  cursor: pointer;
}
.chart-bar:hover {
  opacity: 0.8;
}
.bar-entrada {
  background: var(--color-primary);
}
.bar-salida {
  background: var(--color-primary-lighter);
}
.chart-label {
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
  font-weight: 500;
}
.chart-legend {
  display: flex;
  justify-content: center;
  gap: var(--space-5);
  margin-top: var(--space-2);
}
.chart-legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-gray-600);
}
.chart-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-sm);
}
.dot-entrada { background: var(--color-primary); }
.dot-salida { background: var(--color-primary-lighter); }

/* Quick Actions */
.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.quick-action-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: 500;
  transition: all var(--transition-fast);
  text-decoration: none;
}
.qa-salida {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger-light);
}
.qa-salida:hover { background: var(--color-danger-light); }
.qa-entrada {
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid var(--color-success-light);
}
.qa-entrada:hover { background: var(--color-success-light); }
.qa-articulo {
  background: var(--color-primary-lightest);
  color: var(--color-primary);
  border: 1px solid var(--color-primary-lighter);
}
.qa-articulo:hover { background: var(--color-primary-lighter); }
.qa-historial {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border: 1px solid var(--color-warning-light);
}
.qa-historial:hover { background: var(--color-warning-light); }

/* Alert Items */
.alert-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--color-gray-100);
}
.alert-item:last-child { border-bottom: none; }
.alert-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.alert-name {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-gray-700);
}
.alert-location {
  font-size: var(--font-size-xs);
}
</style>
