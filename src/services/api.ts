// API service pro komunikaci s backendem
// V produkci používáme relativní URL (frontend i backend na stejném serveru)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Získat token z localStorage
function getToken(): string | null {
  return localStorage.getItem('token');
}

// Vytvořit headers s tokenem
function getAuthHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    // Token vypršel nebo není platný
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Sezení vypršelo. Přihlaste se znovu.');
  }
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API chyba');
  }
  return response.json();
}

// ==================== REVIZE ====================
export const revizeApi = {
  async getAll() {
    return fetch(`${API_BASE_URL}/revize`, {
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },

  async getById(id: string) {
    return fetch(`${API_BASE_URL}/revize/${id}`, {
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },

  async create(data: any) {
    return fetch(`${API_BASE_URL}/revize`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  async update(id: string, data: any) {
    return fetch(`${API_BASE_URL}/revize/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  async delete(id: string) {
    return fetch(`${API_BASE_URL}/revize/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },
};

// ==================== ROZVADECE ====================
export const rozvadeceApi = {
  async getByRevize(revizeId: string) {
    return fetch(`${API_BASE_URL}/rozvadece/${revizeId}`, {
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },

  async create(data: any) {
    return fetch(`${API_BASE_URL}/rozvadece`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  async delete(id: string) {
    return fetch(`${API_BASE_URL}/rozvadece/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },
};

// ==================== NASTAVENÍ ====================
export const nastaveniApi = {
  async get() {
    return fetch(`${API_BASE_URL}/nastaveni`, {
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },

  async update(data: any) {
    return fetch(`${API_BASE_URL}/nastaveni`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },
};

// ==================== BACKUP ====================
export const backupApi = {
  async download() {
    return fetch(`${API_BASE_URL}/backup`, {
      headers: { 'Content-Type': 'application/json' },
    }).then(handleResponse);
  },

  async import(data: any, mode: 'merge' | 'replace' = 'merge') {
    return fetch(`${API_BASE_URL}/backup/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, mode }),
    }).then(handleResponse);
  },
};

// ==================== PDF DESIGNER ŠABLONY ====================
export const pdfSablonyApi = {
  async getAll() {
    return fetch(`${API_BASE_URL}/pdf-sablony`, {
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },

  async getById(id: number | string) {
    return fetch(`${API_BASE_URL}/pdf-sablony/${id}`, {
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },

  async getVychozi() {
    return fetch(`${API_BASE_URL}/pdf-sablony/vychozi`, {
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },

  async create(data: { nazev: string; popis?: string; jeVychozi?: boolean; template: any }) {
    return fetch(`${API_BASE_URL}/pdf-sablony`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  async update(id: number | string, data: { nazev: string; popis?: string; jeVychozi?: boolean; template: any }) {
    return fetch(`${API_BASE_URL}/pdf-sablony/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  async delete(id: number | string) {
    return fetch(`${API_BASE_URL}/pdf-sablony/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },
};

// ==================== HEALTH CHECK ====================
export async function checkServerHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
