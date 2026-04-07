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

  async getHistorie(): Promise<import('../types').TechnikHistorie[]> {
    return fetch(`${API_BASE_URL}/technik-historie`, {
      headers: getAuthHeaders(),
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

// ==================== HEALTH CHECK ====================
export async function checkServerHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// ==================== AI ====================
export const aiApi = {
  /** Zkontrolovat, zda je AI nakonfigurováno */
  async getStatus(): Promise<{ configured: boolean }> {
    return fetch(`${API_BASE_URL}/ai/status`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<{ configured: boolean }>(res));
  },

  /** Vygenerovat text revizní zprávy z dat revize */
  async generateReport(revizeId: number): Promise<{ text: string }> {
    return fetch(`${API_BASE_URL}/ai/generate-report`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ revizeId }),
    }).then(res => handleResponse<{ text: string }>(res));
  },

  /** Chat s AI asistentem */
  async chat(
    messages: { role: 'user' | 'assistant'; content: string }[],
    revizeContext?: any,
  ): Promise<{ reply: string }> {
    return fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ messages, revizeContext }),
    }).then(res => handleResponse<{ reply: string }>(res));
  },

  /** Auto-vyplnění pole formuláře */
  async autofill(
    field: string,
    formData: Record<string, any>,
    entityType: string,
  ): Promise<{ suggestion: Record<string, string> }> {
    return fetch(`${API_BASE_URL}/ai/autofill`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ field, formData, entityType }),
    }).then(res => handleResponse<{ suggestion: Record<string, string> }>(res));
  },
};
