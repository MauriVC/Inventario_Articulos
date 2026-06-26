/**
 * API Helper — Centraliza todas las peticiones al backend
 */
const API_BASE = 'http://localhost:3000/api';

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || `Error ${res.status}`);
  }

  return json;
}

export const api = {
  // Almacenes
  getAlmacenes: () => apiFetch('/almacenes'),
  createAlmacen: (data) => apiFetch('/almacenes', { method: 'POST', body: data }),
  updateAlmacen: (id, data) => apiFetch(`/almacenes/${id}`, { method: 'PUT', body: data }),
  deleteAlmacen: (id) => apiFetch(`/almacenes/${id}`, { method: 'DELETE' }),

  // Categorias
  getCategorias: () => apiFetch('/categorias'),
  createCategoria: (data) => apiFetch('/categorias', { method: 'POST', body: data }),
  updateCategoria: (id, data) => apiFetch(`/categorias/${id}`, { method: 'PUT', body: data }),
  deleteCategoria: (id) => apiFetch(`/categorias/${id}`, { method: 'DELETE' }),

  // Marcas
  getMarcas: () => apiFetch('/marcas'),
  createMarca: (data) => apiFetch('/marcas', { method: 'POST', body: data }),
  updateMarca: (id, data) => apiFetch(`/marcas/${id}`, { method: 'PUT', body: data }),
  deleteMarca: (id) => apiFetch(`/marcas/${id}`, { method: 'DELETE' }),

  // Unidades
  getUnidades: () => apiFetch('/unidades'),
  createUnidad: (data) => apiFetch('/unidades', { method: 'POST', body: data }),
  updateUnidad: (id, data) => apiFetch(`/unidades/${id}`, { method: 'PUT', body: data }),
  deleteUnidad: (id) => apiFetch(`/unidades/${id}`, { method: 'DELETE' }),

  // Colores
  getColores: () => apiFetch('/colores'),
  createColor: (data) => apiFetch('/colores', { method: 'POST', body: data }),
  updateColor: (id, data) => apiFetch(`/colores/${id}`, { method: 'PUT', body: data }),
  deleteColor: (id) => apiFetch(`/colores/${id}`, { method: 'DELETE' }),

  // Atributos (con sus datos)
  getAtributos: () => apiFetch('/atributos'),
  createAtributo: (data) => apiFetch('/atributos', { method: 'POST', body: data }),
  updateAtributo: (id, data) => apiFetch(`/atributos/${id}`, { method: 'PUT', body: data }),
  deleteAtributo: (id) => apiFetch(`/atributos/${id}`, { method: 'DELETE' }),
  // Datos (valores de un atributo)
  createDato: (atributoId, data) => apiFetch(`/atributos/${atributoId}/datos`, { method: 'POST', body: data }),
  deleteDato: (atributoId, datoId) => apiFetch(`/atributos/${atributoId}/datos/${datoId}`, { method: 'DELETE' }),

  // Artículos
  getArticulos: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/articulos${query ? '?' + query : ''}`);
  },
  getArticulo: (id) => apiFetch(`/articulos/${id}`),
  createArticulo: (data) => apiFetch('/articulos', { method: 'POST', body: data }),
  updateArticulo: (id, data) => apiFetch(`/articulos/${id}`, { method: 'PUT', body: data }),
  toggleEstadoArticulo: (id, estado) => apiFetch(`/articulos/${id}/estado`, { method: 'PATCH', body: { estado } }),
  deleteArticulo: (id) => apiFetch(`/articulos/${id}`, { method: 'DELETE' }),
  toggleDevolucion: (id, value) => apiFetch(`/articulos/${id}/devolucion`, { method: 'PATCH', body: { requiere_devolucion: value } }),

  // Paquetes
  getPaquetes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/paquetes${query ? '?' + query : ''}`);
  },
  createPaquete: (data) => apiFetch('/paquetes', { method: 'POST', body: data }),
  updatePaquete: (id, data) => apiFetch(`/paquetes/${id}`, { method: 'PUT', body: data }),
  deletePaquete: (id) => apiFetch(`/paquetes/${id}`, { method: 'DELETE' }),

  // Movimientos
  getMovimientos: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/movimientos${query ? '?' + query : ''}`);
  },
  getMovimiento: (id) => apiFetch(`/movimientos/${id}`),
  createMovimiento: (data) => apiFetch('/movimientos', { method: 'POST', body: data }),
  getSalidasConDevolucion: () => apiFetch('/movimientos/salidas-con-devolucion'),
  // Auth
  login: (carnet, contrasena) => apiFetch('/auth/login', { method: 'POST', body: { carnet, contrasena } }),

  // Usuarios
  getUsuarios: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/usuarios${query ? '?' + query : ''}`);
  },
  getUsuario: (id) => apiFetch(`/usuarios/${id}`),
  createUsuario: (data) => apiFetch('/usuarios', { method: 'POST', body: data }),
  updateUsuario: (id, data) => apiFetch(`/usuarios/${id}`, { method: 'PUT', body: data }),
  deleteUsuario: (id) => apiFetch(`/usuarios/${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboardStats: (year = '', month = '', date = '') => {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    if (date) params.append('date', date);
    const qs = params.toString();
    return apiFetch(`/dashboard${qs ? '?' + qs : ''}`);
  },

  // Autocompletado de Solicitantes
  getSolicitanteByCi: (ci) => apiFetch(`/movimientos/solicitante/${ci}`),
  getPendientesGlobales: () => apiFetch(`/movimientos/pendientes-globales`)
};
