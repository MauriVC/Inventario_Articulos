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

  // Categorias
  getCategorias: () => apiFetch('/categorias'),

  // Marcas
  getMarcas: () => apiFetch('/marcas'),

  // Unidades
  getUnidades: () => apiFetch('/unidades'),

  // Colores
  getColores: () => apiFetch('/colores'),

  // Atributos (con sus datos)
  getAtributos: () => apiFetch('/atributos'),

  // Artículos
  getArticulos: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/articulos${query ? '?' + query : ''}`);
  },
  getArticulo: (id) => apiFetch(`/articulos/${id}`),
  createArticulo: (data) => apiFetch('/articulos', { method: 'POST', body: data }),
  updateArticulo: (id, data) => apiFetch(`/articulos/${id}`, { method: 'PUT', body: data }),
  deleteArticulo: (id) => apiFetch(`/articulos/${id}`, { method: 'DELETE' }),
  toggleDevolucion: (id, value) => apiFetch(`/articulos/${id}/devolucion`, { method: 'PATCH', body: { requiere_devolucion: value } }),

  // Paquetes
  getPaquetes: () => apiFetch('/paquetes'),
  createPaquete: (data) => apiFetch('/paquetes', { method: 'POST', body: data }),

  // Movimientos
  getMovimientos: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/movimientos${query ? '?' + query : ''}`);
  },
  getMovimiento: (id) => apiFetch(`/movimientos/${id}`),
  createMovimiento: (data) => apiFetch('/movimientos', { method: 'POST', body: data }),

  // Auth
  login: (carnet, contrasena) => apiFetch('/auth/login', { method: 'POST', body: { carnet, contrasena } }),

  // Usuarios
  getUsuarios: () => apiFetch('/usuarios'),
};
