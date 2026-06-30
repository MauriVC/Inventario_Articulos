<template>
  <div class="dashboard">
    <!-- Filters Row -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold text-gray-800">Resumen Diario</h2>
      <div class="flex items-center gap-2">
        <label for="dashboard-date" class="text-sm font-medium text-gray-600">Fecha de eventos:</label>
        <input type="date" id="dashboard-date" class="form-input" style="width: auto; padding: 6px 12px; border-radius: var(--radius-md);" v-model="selectedDate" @change="loadDashboardData">
      </div>
    </div>

    <div v-if="loading" class="empty-state" style="height: 60vh;">
      <p>Cargando información del dashboard...</p>
    </div>
    
    <template v-else>
      <!-- Stats Cards (Overview) -->
      <div class="card mb-6" style="padding: var(--space-5);">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg text-gray-800">Resumen</h3>
        </div>
        <div class="grid-5">
          <div class="stat-card" v-for="stat in stats" :key="stat.label">
            <div class="stat-card-icon" :style="{ background: stat.bg, color: stat.color }">
              <component :is="stat.icon" :size="28" />
            </div>
            <div class="stat-card-info">
              <span class="stat-card-label">{{ stat.label }}</span>
              <span class="stat-card-value">{{ stat.value }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="dashboard-grid mb-6">
        <!-- Left Column (Sub-grid for Pie Chart and Bar Chart) -->
        <div class="charts-left-col">
          <!-- Pie Chart (Doughnut) -->
          <div class="card" style="display: flex; flex-direction: column;">
            <div class="card-header border-b-0 pb-0">
              <h3 class="font-bold text-gray-800">Distribución (Día)</h3>
            </div>
            <div class="card-body flex-center flex-column" style="padding: var(--space-5) var(--space-4); flex: 1;">
              <div class="doughnut-chart-container">
                <div class="pie-chart" :style="{ background: pieChartBackground }">
                  <div class="doughnut-hole flex flex-column flex-center justify-center">
                    <span class="text-xs text-gray-500 font-medium">Total</span>
                    <span class="text-xl font-bold text-gray-800" style="line-height: 1;">{{ totalMovimientosMes }}</span>
                  </div>
                </div>
              </div>
              
              <div class="chart-legend" style="margin-top: var(--space-6); flex-wrap: wrap; justify-content: center; gap: var(--space-4);">
                <span class="chart-legend-item" v-for="item in distribucionMes" :key="item.tipo">
                  <span class="chart-legend-dot" :class="`dot-${item.tipo.toLowerCase()}`"></span> 
                  <span class="text-sm font-medium text-gray-600">{{ item.tipo }} <strong class="text-gray-800">({{ item.total }})</strong></span>
                </span>
                <span v-if="distribucionMes.length === 0" class="text-sm text-muted">No hay movimientos.</span>
              </div>
            </div>
          </div>

          <!-- Activity Chart -->
          <div class="card" style="display: flex; flex-direction: column;">
            <div class="card-header border-b-0 pb-0 flex items-center justify-between" style="flex-wrap: wrap; gap: 8px;">
              <h3 class="font-bold text-gray-800">Actividad del Día</h3>
            </div>
            <div class="card-body" style="padding-bottom: 0; display: flex; flex-direction: column; flex: 1;">
              <div class="chart-bars-wrapper">
                <div class="chart-bars">
                  <div class="chart-bar-group" v-for="item in chartData" :key="item.label">
                    <div class="chart-bar-container">
                      <div class="chart-bar bar-entrada" :style="{ height: maxChartValue ? (item.entrada / maxChartValue * 100) + '%' : '0%' }" :title="'Entradas: ' + item.entrada"></div>
                      <div class="chart-bar bar-salida" :style="{ height: maxChartValue ? (item.salida / maxChartValue * 100) + '%' : '0%' }" :title="'Salidas: ' + item.salida"></div>
                      <div class="chart-bar bar-baja" :style="{ height: maxChartValue ? ((item.baja || 0) / maxChartValue * 100) + '%' : '0%' }" :title="'Bajas: ' + (item.baja || 0)"></div>
                    </div>
                    <span class="chart-label">{{ item.label }}</span>
                  </div>
                </div>
              </div>
              <div class="chart-legend" style="padding-bottom: var(--space-4); margin-top: var(--space-2);">
                <span class="chart-legend-item"><span class="chart-legend-dot dot-entrada"></span> <span class="text-sm font-medium text-gray-600">Entradas</span></span>
                <span class="chart-legend-item"><span class="chart-legend-dot dot-salida"></span> <span class="text-sm font-medium text-gray-600">Salidas</span></span>
                <span class="chart-legend-item"><span class="chart-legend-dot dot-baja"></span> <span class="text-sm font-medium text-gray-600">Bajas</span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions + Info -->
        <div class="dashboard-right-col">
          <!-- Quick Actions -->
          <div class="card">
            <div class="card-header border-b-0 pb-0">
              <h3 class="font-bold text-gray-800">Acciones Rápidas</h3>
            </div>
            <div class="card-body">
              <div class="quick-actions">
                <router-link to="/movimientos/salida" class="quick-action-btn qa-salida">
                  <ArrowUpFromLine :size="18" />
                  <span>Nueva Salida</span>
                </router-link>
                <router-link to="/movimientos/entrada" class="quick-action-btn qa-entrada">
                  <ArrowDownToLine :size="18" />
                  <span>Nueva Entrada</span>
                </router-link>
                <router-link to="/articulos" class="quick-action-btn qa-articulo">
                  <PackagePlus :size="18" />
                  <span>Nuevo Artículo</span>
                </router-link>
                <router-link to="/historial" class="quick-action-btn qa-historial">
                  <ClipboardList :size="18" />
                  <span>Ver Historial</span>
                </router-link>
              </div>
            </div>
          </div>

          <!-- Top Articulos & Alerts Row (sub-grid) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
            <!-- Top Artículos -->
            <div class="card">
              <div class="card-header border-b-0" style="padding: var(--space-4) var(--space-4) 0;">
                <h3 class="font-bold text-gray-800" style="font-size: var(--font-size-sm);">Top Artículos (Día)</h3>
              </div>
              <div class="card-body scrollable-list" style="padding: 0;">
                <div v-if="topArticulos.length === 0" class="p-4 text-center text-sm text-muted">
                  Sin movimientos.
                </div>
                <div class="alert-item" v-for="item in topArticulos" :key="item.name">
                  <div class="alert-info">
                    <span class="alert-name">{{ item.name }}</span>
                  </div>
                  <span class="badge" style="background-color: var(--color-primary-light); color: var(--color-primary-dark);">
                    {{ item.total }} movs
                  </span>
                </div>
              </div>
            </div>

            <!-- Low Stock Alerts -->
            <div class="card">
              <div class="card-header border-b-0" style="padding: var(--space-4) var(--space-4) 0;">
                <h3 class="font-bold text-gray-800" style="font-size: var(--font-size-sm);">Alertas Stock</h3>
                <span class="badge badge-warning" v-if="stockAlerts.length > 0">{{ stockAlerts.length }}</span>
              </div>
              <div class="card-body scrollable-list" style="padding: 0;">
                <div v-if="stockAlerts.length === 0" class="p-4 text-center text-sm text-muted">
                  No hay alertas.
                </div>
                <div class="alert-item" v-for="alert in stockAlerts" :key="alert.name + alert.almacen">
                  <div class="alert-info">
                    <span class="alert-name">{{ alert.name }}</span>
                    <span class="alert-location text-xs text-muted">{{ alert.almacen }}</span>
                  </div>
                  <span class="badge" :class="alert.stock <= 0 ? 'badge-danger' : 'badge-warning'" style="font-size: 10px;">
                    Stock: {{ alert.stock }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Movements Table -->
      <div class="card">
        <div class="card-header border-b-0">
          <h3 class="font-bold text-gray-800 text-lg">Lista de Movimientos Recientes</h3>
          <router-link to="/historial" class="btn btn-ghost btn-sm text-gray-500 hover:text-gray-800">
            Ver todo
            <ChevronRight :size="16" />
          </router-link>
        </div>
        <div class="card-body" style="padding: 0 var(--space-5) var(--space-5);">
          <div class="table-wrapper table-scroll">
            <table class="table custom-table">
              <thead>
                <tr>
                  <th>Usuario / Solicitante</th>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th>Almacén</th>
                  <th>Destino / Proc.</th>
                  <th>Artículos</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="mov in recentMovements" :key="mov.codigo">
                  <td class="font-medium text-gray-700">{{ mov.solicitante }}</td>
                  <td class="text-gray-500">{{ mov.codigo }}</td>
                  <td>
                    <span class="badge" :class="mov.tipo === 'SALIDA' ? 'badge-danger' : 'badge-success'">
                      {{ mov.tipo }}
                    </span>
                  </td>
                  <td class="text-gray-600">{{ mov.almacen }}</td>
                  <td class="text-gray-600">{{ mov.destino }}</td>
                  <td class="text-center font-medium">{{ mov.articulos }}</td>
                  <td class="text-muted text-sm">{{ new Date(mov.fecha).toLocaleString('es-ES') }}</td>
                </tr>
                <tr v-if="recentMovements.length === 0">
                  <td colspan="7" class="text-center p-4 text-muted">No hay movimientos recientes.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  Package, Warehouse, ArrowUpFromLine, ArrowDownToLine,
  PackagePlus, ClipboardList, ChevronRight, RotateCcw
} from 'lucide-vue-next'
import { api } from '@/api'

const loading = ref(true)
const currentYear = new Date().getFullYear()
const selectedYear = ref(currentYear)
const selectedMonth = ref('all')

// Obtener fecha actual en la zona horaria local (en lugar de UTC)
const tzOffset = (new Date()).getTimezoneOffset() * 60000;
const localISODate = (new Date(Date.now() - tzOffset)).toISOString().split('T')[0];
const selectedDate = ref(localISODate)

const statsData = ref({
  total_articulos: 0,
  almacenes_activos: 0,
  salidas_dia: 0,
  entradas_dia: 0,
  devoluciones_pendientes: 0
})
const chartData = ref([])
const stockAlerts = ref([])
const topArticulos = ref([])
const recentMovements = ref([])
const distribucionMes = ref([])

onMounted(async () => {
  await loadDashboardData()
})

async function loadDashboardData() {
  loading.value = true
  try {
    const res = await api.getDashboardStats('', '', selectedDate.value)
    const d = res.data
    statsData.value = d.stats
    chartData.value = d.chartData
    stockAlerts.value = d.stockAlerts
    topArticulos.value = d.topArticulos || []
    recentMovements.value = d.recentMovements
    distribucionMes.value = d.distribucionMes || []
  } catch (error) {
    console.error("Error al cargar datos del dashboard:", error)
  } finally {
    loading.value = false
  }
}

const maxChartValue = computed(() => {
  if (!chartData.value.length) return 0
  return Math.max(...chartData.value.map(d => Math.max(d.entrada, d.salida, d.baja || 0)))
})

const totalMovimientosMes = computed(() => {
  if (!distribucionMes.value) return 0;
  return distribucionMes.value.reduce((acc, curr) => acc + curr.total, 0);
})

const isToday = computed(() => selectedDate.value === new Date().toISOString().split('T')[0])

const stats = computed(() => [
  { label: 'Total Artículos', value: statsData.value.total_articulos, icon: Package, bg: '#eef2ff', color: '#4f46e5' },
  { label: 'Almacenes', value: statsData.value.almacenes_activos, icon: Warehouse, bg: '#f0fdf4', color: '#16a34a' },
  { label: `Salidas (${isToday.value ? 'Hoy' : 'Día'})`, value: statsData.value.salidas_dia, icon: ArrowUpFromLine, bg: '#fef2f2', color: '#dc2626' },
  { label: `Entradas (${isToday.value ? 'Hoy' : 'Día'})`, value: statsData.value.entradas_dia, icon: ArrowDownToLine, bg: '#f0fdfa', color: '#0d9488' },
  { label: 'Pendientes', value: statsData.value.devoluciones_pendientes, icon: RotateCcw, bg: '#fffbeb', color: '#d97706' }
])

const pieChartBackground = computed(() => {
  if (!distribucionMes.value || distribucionMes.value.length === 0) return 'var(--color-gray-100)';
  
  const total = totalMovimientosMes.value;
  if (total === 0) return 'var(--color-gray-100)';

  let bg = 'conic-gradient(';
  let currentPercentage = 0;
  
  const colors = {
    'ENTRADA': 'var(--color-success)',
    'SALIDA': 'var(--color-danger)',
    'BAJA': 'var(--color-warning)'
  };

  distribucionMes.value.forEach((item, index) => {
    const percentage = (item.total / total) * 100;
    const color = colors[item.tipo] || 'var(--color-primary)';
    bg += `${color} ${currentPercentage}% ${currentPercentage + percentage}%`;
    currentPercentage += percentage;
    if (index < distribucionMes.value.length - 1) bg += ', ';
  });
  
  bg += ')';
  return bg;
})
</script>

<style scoped>
.dashboard {
  background-color: #f8fafc;
  min-height: 100vh;
  padding-bottom: 20px;
}

.card {
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border: none;
  border-radius: 16px;
  background-color: white;
  min-width: 0;
}

.border-b-0 {
  border-bottom: none !important;
}

.grid-5 {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-4);
}

.charts-left-col {
  display: grid;
  grid-template-columns: 1fr 1.8fr;
  gap: var(--space-5);
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
.flex-column {
  flex-direction: column;
}

.doughnut-chart-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
}

.pie-chart {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}
.pie-chart:hover {
  transform: scale(1.05);
}

.doughnut-hole {
  width: 90px;
  height: 90px;
  background-color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
}
.justify-center {
  justify-content: center;
}

/* Stat Cards (Redesigned) */
.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: 0 var(--space-2);
  border-right: 1px solid var(--color-gray-100);
}
.stat-card:last-child {
  border-right: none;
}
.stat-card-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-card-info {
  display: flex;
  flex-direction: column;
}
.stat-card-label {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
  font-weight: 500;
  margin-bottom: 2px;
}
.stat-card-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-gray-800);
  line-height: 1.1;
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-5);
  align-items: stretch;
}
.dashboard-right-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* Chart */
.chart-bars-wrapper {
  position: relative;
  flex: 1;
  min-height: 200px;
  margin-top: var(--space-2);
  background: repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 39px,
    #f1f5f9 39px,
    #f1f5f9 40px
  );
  overflow-x: auto;
  overflow-y: hidden;
}

.chart-bars-wrapper::-webkit-scrollbar {
  height: 6px;
}
.chart-bars-wrapper::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 4px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 100%;
  min-width: 800px;
  padding: var(--space-4) 0;
}
.chart-bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  height: 100%;
}
.chart-bar-container {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  height: calc(100% - 20px);
  width: 100%;
  justify-content: center;
}
.chart-bar {
  width: 10px;
  border-radius: 2px 2px 0 0;
  transition: height var(--transition-slow);
  cursor: pointer;
  flex: 1;
  max-width: 14px;
}
.chart-bar:hover {
  opacity: 0.8;
}
.bar-entrada {
  background: var(--color-success);
}
.bar-salida {
  background: var(--color-danger);
}
.bar-baja {
  background: var(--color-warning);
}
.chart-label {
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
  font-weight: 500;
}
.chart-legend {
  display: flex;
  justify-content: center;
  gap: var(--space-4);
}
.chart-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.chart-legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid;
  background-color: transparent;
}
.dot-entrada { border-color: var(--color-success); }
.dot-salida { border-color: var(--color-danger); }
.dot-baja { border-color: var(--color-warning); }

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
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: 500;
  transition: all var(--transition-fast);
  text-decoration: none;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.qa-salida {
  background: #fff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
}
.qa-salida:hover { background: #f8fafc; border-color: #cbd5e1; }
.qa-entrada {
  background: #fff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
}
.qa-entrada:hover { background: #f8fafc; border-color: #cbd5e1; }
.qa-articulo {
  background: #fff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
}
.qa-articulo:hover { background: #f8fafc; border-color: #cbd5e1; }
.qa-historial {
  background: #fff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
}
.qa-historial:hover { background: #f8fafc; border-color: #cbd5e1; }

/* Alert Items */
.alert-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px var(--space-4);
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
  font-weight: 600;
  color: #334155;
}
.alert-location {
  font-size: 11px;
}

/* Custom Table (Matching reference) */
.custom-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}
.custom-table thead tr {
  background-color: #f1f5f9;
}
.custom-table th {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  text-align: left;
  border: none;
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #f1f5f9;
}
.custom-table th:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
.custom-table th:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
.custom-table td {
  padding: 14px 16px;
  font-size: 14px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}
.custom-table tbody tr:last-child td { border-bottom: none; }

/* Scrollable List for Alerts/Top */
.scrollable-list {
  max-height: 220px;
  overflow-y: auto;
}
.scrollable-list::-webkit-scrollbar {
  width: 5px;
}
.scrollable-list::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 4px;
}

/* Scrollable Table */
.table-scroll {
  max-height: 260px;
  overflow-y: auto;
}
.table-scroll::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.table-scroll::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 4px;
}
</style>
