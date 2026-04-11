// Database service - komunikuje s backend API
// Všechna data jsou uložena na serveru a synchronizována mezi zařízeními

import type { Revize, Rozvadec, Okruh, Chranic, Zavada, Mistnost, Zarizeni, Zakazka, Nastaveni, MericiPristroj, Firma, ZavadaKatalog, Zakaznik, PredvolenyText, Kalibrace } from '../types';
import { safeApiRequest } from './safeApiRequest';
import { db } from '../db';

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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Sezení vypršelo. Přihlaste se znovu.');
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Neznámá chyba' }));
    throw new Error(error.error || 'API chyba');
  }
  return response.json() as Promise<T>;
}

// ==================== REVIZE ====================
export const revizeService = {
  async getAll(): Promise<Revize[]> {
    if (navigator.onLine) {
      try {
        const revize = await fetch(`${API_BASE_URL}/revize`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<Revize[]>(res));
        // Cache all revize for offline
        for (const r of revize) {
          if (r.id) await db.revizeCache.put({ id: r.id, data: r, updatedAt: Date.now() });
        }
        return revize;
      } catch {
        // Network error - fallback to cache
        const all = await db.revizeCache.toArray();
        return all.map(r => r.data);
      }
    } else {
      const all = await db.revizeCache.toArray();
      return all.map(r => r.data);
    }
  },

  async getById(id: number): Promise<Revize | undefined> {
    if (navigator.onLine) {
      try {
        const revize = await fetch(`${API_BASE_URL}/revize/${id}`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<Revize | undefined>(res));
        if (revize) {
          await db.revizeCache.put({ id, data: revize, updatedAt: Date.now() });
        }
        return revize;
      } catch {
        const cached = await db.revizeCache.get(id);
        return cached?.data;
      }
    } else {
      const cached = await db.revizeCache.get(id);
      return cached?.data;
    }
  },

  async create(data: Omit<Revize, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const url = `${API_BASE_URL}/revize`;
    const headers = getAuthHeaders();
    if (navigator.onLine) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        }).then(res => handleResponse<{ id: number }>(res));
        await db.revizeCache.put({ id: response.id, data: { ...data, id: response.id } as Revize, updatedAt: Date.now() });
        return response.id;
      } catch {
        // Network error - queue offline
      }
    }
    const tempId = Date.now() * -1;
    await db.revizeCache.put({ id: tempId, data: { ...data, id: tempId }, updatedAt: Date.now() });
    await safeApiRequest({ url, method: 'POST', body: data, headers: headers as Record<string, string>, tempId });
    return tempId;
  },

  async update(id: number, data: Partial<Revize>): Promise<number> {
    const url = `${API_BASE_URL}/revize/${id}`;
    const headers = getAuthHeaders();
    if (navigator.onLine) {
      try {
        await fetch(url, {
          method: 'PUT',
          headers,
          body: JSON.stringify(data),
        }).then(res => handleResponse<unknown>(res));
        const cached = await db.revizeCache.get(id);
        if (cached) {
          await db.revizeCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
        }
        return 1;
      } catch {
        // Network error - fallback to offline
      }
    }
    const cached = await db.revizeCache.get(id);
    if (cached) {
      await db.revizeCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
    }
    await safeApiRequest({ url, method: 'PUT', body: data, headers: headers as Record<string, string> });
    return 1;
  },

  async delete(id: number): Promise<void> {
    await db.revizeCache.delete(id);
    await safeApiRequest({ url: `${API_BASE_URL}/revize/${id}`, method: 'DELETE', headers: getAuthHeaders() as Record<string, string> });
  },

  async duplikovat(id: number, cisloRevize: string, typ: 'navazujici' | 'duplikat' = 'navazujici'): Promise<{ id: number; skupinaRevizi: string }> {
    return fetch(`${API_BASE_URL}/revize/${id}/duplikovat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ cisloRevize, typ }),
    }).then(res => handleResponse<{ id: number; skupinaRevizi: string }>(res));
  },

  async getHistorie(id: number): Promise<Partial<Revize>[]> {
    try {
      return await fetch(`${API_BASE_URL}/revize/${id}/historie`, {
        headers: getAuthHeaders(),
      }).then(res => handleResponse<Partial<Revize>[]>(res));
    } catch {
      return [];
    }
  },
};

// ==================== ROZVADĚČE ====================
export const rozvadecService = {
  async getById(_id: number): Promise<Rozvadec | undefined> {
    // Příklad: pokud by byl implementován detail rozvaděče
    return undefined;
  },

  async getByRevize(revizeId: number): Promise<Rozvadec[]> {
    if (navigator.onLine) {
      try {
        const rozvadece = await fetch(`${API_BASE_URL}/rozvadece/${revizeId}`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<Rozvadec[]>(res));
        if (rozvadece) {
          for (const r of rozvadece) {
            await db.rozvadecCache.put({ id: r.id ?? -1, data: r, updatedAt: Date.now() });
          }
        }
        return rozvadece;
      } catch {
        const all = await db.rozvadecCache.toArray();
        return all.filter(r => r.data.revizeId === revizeId).map(r => r.data);
      }
    } else {
      const all = await db.rozvadecCache.toArray();
      return all.filter(r => r.data.revizeId === revizeId).map(r => r.data);
    }
  },

  async create(data: Omit<Rozvadec, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const url = `${API_BASE_URL}/rozvadece`;
    const headers = getAuthHeaders();
    if (navigator.onLine) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        }).then(res => handleResponse<{ id: number }>(res));
        await db.rozvadecCache.put({ id: response.id, data: { ...data, id: response.id } as Rozvadec, updatedAt: Date.now() });
        return response.id;
      } catch {
        // Network error - queue offline
      }
    }
    const tempId = Date.now() * -1;
    await db.rozvadecCache.put({ id: tempId, data: { ...data, id: tempId }, updatedAt: Date.now() });
    await safeApiRequest({ url, method: 'POST', body: data, headers: headers as Record<string, string>, tempId });
    return tempId;
  },

  async update(id: number, data: Partial<Rozvadec>): Promise<number> {
    const url = `${API_BASE_URL}/rozvadece/${id}`;
    const headers = getAuthHeaders();
    if (navigator.onLine) {
      try {
        await fetch(url, {
          method: 'PUT',
          headers,
          body: JSON.stringify(data),
        }).then(res => handleResponse<unknown>(res));
        const cached = await db.rozvadecCache.get(id);
        if (cached) {
          await db.rozvadecCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
        }
        return 1;
      } catch {
        // Network error - fallback to offline
      }
    }
    const cached = await db.rozvadecCache.get(id);
    if (cached) {
      await db.rozvadecCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
    }
    await safeApiRequest({ url, method: 'PUT', body: data, headers: headers as Record<string, string> });
    return 1;
  },

  async delete(id: number): Promise<void> {
    await db.rozvadecCache.delete(id);
    await safeApiRequest({ url: `${API_BASE_URL}/rozvadece/${id}`, method: 'DELETE', headers: getAuthHeaders() as Record<string, string> });
  },
};

// ==================== OKRUHY ====================
export const okruhService = {
  async getByRozvadec(rozvadecId: number): Promise<Okruh[]> {
    if (navigator.onLine) {
      try {
        const okruhy = await fetch(`${API_BASE_URL}/okruhy/${rozvadecId}`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<Okruh[]>(res));
        if (okruhy) {
          for (const o of okruhy) {
            await db.okruhCache.put({ id: o.id ?? -1, data: o, updatedAt: Date.now() });
          }
        }
        return okruhy;
      } catch {
        const all = await db.okruhCache.toArray();
        return all.filter(o => o.data.rozvadecId === rozvadecId).map(o => o.data);
      }
    } else {
      const all = await db.okruhCache.toArray();
      return all.filter(o => o.data.rozvadecId === rozvadecId).map(o => o.data);
    }
  },

  async create(data: Omit<Okruh, 'id'>): Promise<number> {
    const url = `${API_BASE_URL}/okruhy`;
    const headers = getAuthHeaders();
    if (navigator.onLine) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        }).then(res => handleResponse<{ id: number }>(res));
        await db.okruhCache.put({ id: response.id, data: { ...data, id: response.id } as Okruh, updatedAt: Date.now() });
        return response.id;
      } catch {
        // Network error - queue offline
      }
    }
    const tempId = Date.now() * -1;
    await db.okruhCache.put({ id: tempId, data: { ...data, id: tempId }, updatedAt: Date.now() });
    await safeApiRequest({ url, method: 'POST', body: data, headers: headers as Record<string, string>, tempId });
    return tempId;
  },

  async update(id: number, data: Partial<Okruh>): Promise<number> {
    const url = `${API_BASE_URL}/okruhy/${id}`;
    const headers = getAuthHeaders();
    if (navigator.onLine) {
      try {
        await fetch(url, {
          method: 'PUT',
          headers,
          body: JSON.stringify(data),
        }).then(res => handleResponse<unknown>(res));
        const cached = await db.okruhCache.get(id);
        if (cached) {
          await db.okruhCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
        }
        return 1;
      } catch {
        // Network error - fallback to offline
      }
    }
    const cached = await db.okruhCache.get(id);
    if (cached) {
      await db.okruhCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
    }
    await safeApiRequest({ url, method: 'PUT', body: data, headers: headers as Record<string, string> });
    return 1;
  },

  async delete(id: number): Promise<void> {
    await db.okruhCache.delete(id);
    await safeApiRequest({ url: `${API_BASE_URL}/okruhy/${id}`, method: 'DELETE', headers: getAuthHeaders() as Record<string, string> });
  },
};

// ==================== CHRANIČE ====================
export const cranicService = {
  async getByRozvadec(rozvadecId: number): Promise<Chranic[]> {
    if (navigator.onLine) {
      try {
        const chranice = await fetch(`${API_BASE_URL}/chranice/${rozvadecId}`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<Chranic[]>(res));
        if (chranice) {
          for (const c of chranice) {
            await db.cranicCache.put({ id: c.id ?? -1, data: c, updatedAt: Date.now() });
          }
        }
        return chranice;
      } catch {
        const all = await db.cranicCache.toArray();
        return all.filter(c => c.data.rozvadecId === rozvadecId).map(c => c.data);
      }
    } else {
      const all = await db.cranicCache.toArray();
      return all.filter(c => c.data.rozvadecId === rozvadecId).map(c => c.data);
    }
  },

  async create(data: Omit<Chranic, 'id'>): Promise<number> {
    const url = `${API_BASE_URL}/chranice`;
    const headers = getAuthHeaders();
    if (navigator.onLine) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        }).then(res => handleResponse<{ id: number }>(res));
        await db.cranicCache.put({ id: response.id, data: { ...data, id: response.id } as Chranic, updatedAt: Date.now() });
        return response.id;
      } catch {
        // Network error - queue offline
      }
    }
    const tempId = Date.now() * -1;
    await db.cranicCache.put({ id: tempId, data: { ...data, id: tempId }, updatedAt: Date.now() });
    await safeApiRequest({ url, method: 'POST', body: data, headers: headers as Record<string, string>, tempId });
    return tempId;
  },

  async update(id: number, data: Partial<Chranic>): Promise<number> {
    const url = `${API_BASE_URL}/chranice/${id}`;
    const headers = getAuthHeaders();
    if (navigator.onLine) {
      try {
        await fetch(url, {
          method: 'PUT',
          headers,
          body: JSON.stringify(data),
        }).then(res => handleResponse<unknown>(res));
        const cached = await db.cranicCache.get(id);
        if (cached) {
          await db.cranicCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
        }
        return 1;
      } catch {
        // Network error - fallback to offline
      }
    }
    const cached = await db.cranicCache.get(id);
    if (cached) {
      await db.cranicCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
    }
    await safeApiRequest({ url, method: 'PUT', body: data, headers: headers as Record<string, string> });
    return 1;
  },

  async delete(id: number): Promise<void> {
    await db.cranicCache.delete(id);
    await safeApiRequest({ url: `${API_BASE_URL}/chranice/${id}`, method: 'DELETE', headers: getAuthHeaders() as Record<string, string> });
  },
};

// ==================== MISTNOSTI ====================
export const mistnostService = {
  async getAll(): Promise<Mistnost[]> {
    return fetch(`${API_BASE_URL}/mistnosti`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Mistnost[]>(res));
  },

  async getByRevize(revizeId: number): Promise<Mistnost[]> {
    if (navigator.onLine) {
      try {
        const mistnosti = await fetch(`${API_BASE_URL}/mistnosti/revize/${revizeId}`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<Mistnost[]>(res));
        if (mistnosti) {
          for (const m of mistnosti) {
            await db.mistnostCache.put({ id: m.id ?? -1, data: m, updatedAt: Date.now() });
          }
        }
        return mistnosti;
      } catch {
        const all = await db.mistnostCache.toArray();
        return all.filter(m => m.data.revizeId === revizeId).map(m => m.data);
      }
    } else {
      const all = await db.mistnostCache.toArray();
      return all.filter(m => m.data.revizeId === revizeId).map(m => m.data);
    }
  },

  async getById(id: number): Promise<Mistnost | undefined> {
    const all = await this.getAll();
    return all.find(m => m.id === id);
  },

  async create(data: Omit<Mistnost, 'id'>): Promise<number> {
    const url = `${API_BASE_URL}/mistnosti`;
    const headers = getAuthHeaders();
    if (navigator.onLine) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        }).then(res => handleResponse<{ id: number }>(res));
        await db.mistnostCache.put({ id: response.id, data: { ...data, id: response.id } as Mistnost, updatedAt: Date.now() });
        return response.id;
      } catch {
        // Network error - queue offline
      }
    }
    const tempId = Date.now() * -1;
    await db.mistnostCache.put({ id: tempId, data: { ...data, id: tempId }, updatedAt: Date.now() });
    await safeApiRequest({ url, method: 'POST', body: data, headers: headers as Record<string, string>, tempId });
    return tempId;
  },

  async update(id: number, data: Partial<Mistnost>): Promise<number> {
    const url = `${API_BASE_URL}/mistnosti/${id}`;
    const headers = getAuthHeaders();
    if (navigator.onLine) {
      try {
        await fetch(url, {
          method: 'PUT',
          headers,
          body: JSON.stringify(data),
        }).then(res => handleResponse<unknown>(res));
        const cached = await db.mistnostCache.get(id);
        if (cached) {
          await db.mistnostCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
        }
        return 1;
      } catch {
        // Network error - fallback to offline
      }
    }
    const cached = await db.mistnostCache.get(id);
    if (cached) {
      await db.mistnostCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
    }
    await safeApiRequest({ url, method: 'PUT', body: data, headers: headers as Record<string, string> });
    return 1;
  },

  async delete(id: number): Promise<void> {
    await db.mistnostCache.delete(id);
    await safeApiRequest({ url: `${API_BASE_URL}/mistnosti/${id}`, method: 'DELETE', headers: getAuthHeaders() as Record<string, string> });
  },
};

// ==================== ZARIZENI ====================
export const zarizeniService = {
  async getAll(): Promise<Zarizeni[]> {
    return [];
  },

  async getByMistnost(mistnostId: number): Promise<Zarizeni[]> {
    if (navigator.onLine) {
      try {
        const zarizeni = await fetch(`${API_BASE_URL}/zarizeni/${mistnostId}`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<Zarizeni[]>(res));
        for (const z of zarizeni) {
          if (z.id) await db.zarizeniCache.put({ id: z.id, data: z, updatedAt: Date.now() });
        }
        return zarizeni;
      } catch {
        const all = await db.zarizeniCache.toArray();
        return all.filter(z => z.data.mistnostId === mistnostId).map(z => z.data);
      }
    } else {
      const all = await db.zarizeniCache.toArray();
      return all.filter(z => z.data.mistnostId === mistnostId).map(z => z.data);
    }
  },

  async getById(_id: number): Promise<Zarizeni | undefined> {
    return undefined;
  },

  async create(data: Omit<Zarizeni, 'id'>): Promise<number> {
    const url = `${API_BASE_URL}/zarizeni`;
    const headers = getAuthHeaders();
    if (navigator.onLine) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        }).then(res => handleResponse<{ id: number }>(res));
        await db.zarizeniCache.put({ id: response.id, data: { ...data, id: response.id } as Zarizeni, updatedAt: Date.now() });
        return response.id;
      } catch {
        // Network error - queue offline
      }
    }
    const tempId = Date.now() * -1;
    await db.zarizeniCache.put({ id: tempId, data: { ...data, id: tempId }, updatedAt: Date.now() });
    await safeApiRequest({ url, method: 'POST', body: data, headers: headers as Record<string, string>, tempId });
    return tempId;
  },

  async update(id: number, data: Partial<Zarizeni>): Promise<number> {
    const url = `${API_BASE_URL}/zarizeni/${id}`;
    const headers = getAuthHeaders();
    if (navigator.onLine) {
      try {
        await fetch(url, {
          method: 'PUT',
          headers,
          body: JSON.stringify(data),
        }).then(res => handleResponse<unknown>(res));
        const cached = await db.zarizeniCache.get(id);
        if (cached) {
          await db.zarizeniCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
        }
        return 1;
      } catch {
        // Network error - fallback to offline
      }
    }
    const cached = await db.zarizeniCache.get(id);
    if (cached) {
      await db.zarizeniCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
    }
    await safeApiRequest({ url, method: 'PUT', body: data, headers: headers as Record<string, string> });
    return 1;
  },

  async delete(id: number): Promise<void> {
    await db.zarizeniCache.delete(id);
    await safeApiRequest({ url: `${API_BASE_URL}/zarizeni/${id}`, method: 'DELETE', headers: getAuthHeaders() as Record<string, string> });
  },

  async deleteByMistnost(_mistnostId: number): Promise<void> {
    // Server smaže automaticky při smazání místnosti díky ON DELETE CASCADE
  },
};

// ==================== ZAVADY ====================
export const zavadaService = {
  async getAll(): Promise<Zavada[]> {
    return fetch(`${API_BASE_URL}/zavady`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Zavada[]>(res));
  },

  async getByRevize(revizeId: number): Promise<Zavada[]> {
    if (navigator.onLine) {
      try {
        const zavady = await fetch(`${API_BASE_URL}/zavady/revize/${revizeId}`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<Zavada[]>(res));
        if (zavady) {
          for (const z of zavady) {
            await db.zavadaCache.put({ id: z.id ?? -1, data: z, updatedAt: Date.now() });
          }
        }
        return zavady;
      } catch {
        const all = await db.zavadaCache.toArray();
        return all.filter(z => z.data.revizeId === revizeId).map(z => z.data);
      }
    } else {
      const all = await db.zavadaCache.toArray();
      return all.filter(z => z.data.revizeId === revizeId).map(z => z.data);
    }
  },

  async create(data: Omit<Zavada, 'id'>): Promise<number> {
    const url = `${API_BASE_URL}/zavady`;
    const headers = getAuthHeaders();
    if (navigator.onLine) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        }).then(res => handleResponse<{ id: number }>(res));
        await db.zavadaCache.put({ id: response.id, data: { ...data, id: response.id } as Zavada, updatedAt: Date.now() });
        return response.id;
      } catch {
        // Network error - queue offline
      }
    }
    const tempId = Date.now() * -1;
    await db.zavadaCache.put({ id: tempId, data: { ...data, id: tempId }, updatedAt: Date.now() });
    await safeApiRequest({ url, method: 'POST', body: data, headers: headers as Record<string, string>, tempId });
    return tempId;
  },

  async update(id: number, data: Partial<Zavada>): Promise<number> {
    const url = `${API_BASE_URL}/zavady/${id}`;
    const headers = getAuthHeaders();
    if (navigator.onLine) {
      try {
        await fetch(url, {
          method: 'PUT',
          headers,
          body: JSON.stringify(data),
        }).then(res => handleResponse<unknown>(res));
        const cached = await db.zavadaCache.get(id);
        if (cached) {
          await db.zavadaCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
        }
        return 1;
      } catch {
        // Network error - fallback to offline
      }
    }
    const cached = await db.zavadaCache.get(id);
    if (cached) {
      await db.zavadaCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
    }
    await safeApiRequest({ url, method: 'PUT', body: data, headers: headers as Record<string, string> });
    return 1;
  },

  async delete(id: number): Promise<void> {
    await db.zavadaCache.delete(id);
    await safeApiRequest({ url: `${API_BASE_URL}/zavady/${id}`, method: 'DELETE', headers: getAuthHeaders() as Record<string, string> });
  },
};

// ==================== FIRMY ====================
export const firmaService = {
  async getAll(): Promise<Firma[]> {
    if (navigator.onLine) {
      try {
        const firmy = await fetch(`${API_BASE_URL}/firmy`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<Firma[]>(res));
        for (const f of firmy) {
          if (f.id) await db.firmaCache.put({ id: f.id, data: f, updatedAt: Date.now() });
        }
        return firmy;
      } catch {
        const all = await db.firmaCache.toArray();
        return all.map(f => f.data);
      }
    } else {
      const all = await db.firmaCache.toArray();
      return all.map(f => f.data);
    }
  },

  async getById(id: number): Promise<Firma | undefined> {
    if (navigator.onLine) {
      try {
        const firma = await fetch(`${API_BASE_URL}/firmy/${id}`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<Firma | undefined>(res));
        if (firma) await db.firmaCache.put({ id, data: firma, updatedAt: Date.now() });
        return firma;
      } catch {
        const cached = await db.firmaCache.get(id);
        return cached?.data;
      }
    } else {
      const cached = await db.firmaCache.get(id);
      return cached?.data;
    }
  },

  async create(data: Omit<Firma, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_BASE_URL}/firmy`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }).then(res => handleResponse<{ id: number }>(res));
        await db.firmaCache.put({ id: response.id, data: { ...data, id: response.id } as Firma, updatedAt: Date.now() });
        return response.id;
      } catch {
        // Network error - queue offline
      }
    }
    {
      const tempId = Date.now() * -1;
      await db.firmaCache.put({ id: tempId, data: { ...data, id: tempId }, updatedAt: Date.now() });
      await safeApiRequest({ url: `${API_BASE_URL}/firmy`, method: 'POST', body: data, headers: getAuthHeaders() as Record<string, string> });
      return tempId;
    }
  },

  async update(id: number, data: Partial<Firma>): Promise<number> {
    if (navigator.onLine) {
      try {
        await fetch(`${API_BASE_URL}/firmy/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }).then(res => handleResponse<unknown>(res));
        const cached = await db.firmaCache.get(id);
        if (cached) {
          await db.firmaCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
        }
        return 1;
      } catch {
        // Network error - fallback to offline
      }
    }
    const cached = await db.firmaCache.get(id);
    if (cached) {
      await db.firmaCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
    }
    await safeApiRequest({ url: `${API_BASE_URL}/firmy/${id}`, method: 'PUT', body: data, headers: getAuthHeaders() as Record<string, string> });
    return 1;
  },

  async delete(id: number): Promise<void> {
    await db.firmaCache.delete(id);
    await safeApiRequest({ url: `${API_BASE_URL}/firmy/${id}`, method: 'DELETE', headers: getAuthHeaders() as Record<string, string> });
  },
};

// ==================== ZAKAZKY ====================
export const zakazkaService = {
  async getAll(): Promise<Zakazka[]> {
    if (navigator.onLine) {
      try {
        const zakazky = await fetch(`${API_BASE_URL}/zakazky`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<Zakazka[]>(res));
        for (const z of zakazky) {
          if (z.id) await db.zakazkaCache.put({ id: z.id, data: z, updatedAt: Date.now() });
        }
        return zakazky;
      } catch {
        const all = await db.zakazkaCache.toArray();
        return all.map(z => z.data);
      }
    } else {
      const all = await db.zakazkaCache.toArray();
      return all.map(z => z.data);
    }
  },

  async getById(id: number): Promise<Zakazka | undefined> {
    const all = await this.getAll();
    return all.find(z => z.id === id);
  },

  async create(data: Omit<Zakazka, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_BASE_URL}/zakazky`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }).then(res => handleResponse<{ id: number }>(res));
        await db.zakazkaCache.put({ id: response.id, data: { ...data, id: response.id } as Zakazka, updatedAt: Date.now() });
        return response.id;
      } catch {
        // Network error - queue offline
      }
    }
    {
      const tempId = Date.now() * -1;
      await db.zakazkaCache.put({ id: tempId, data: { ...data, id: tempId }, updatedAt: Date.now() });
      await safeApiRequest({ url: `${API_BASE_URL}/zakazky`, method: 'POST', body: data, headers: getAuthHeaders() as Record<string, string> });
      return tempId;
    }
  },

  async update(id: number, data: Partial<Zakazka>): Promise<number> {
    if (navigator.onLine) {
      try {
        await fetch(`${API_BASE_URL}/zakazky/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }).then(res => handleResponse<unknown>(res));
        const cached = await db.zakazkaCache.get(id);
        if (cached) {
          await db.zakazkaCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
        }
        return 1;
      } catch {
        // Network error - fallback to offline
      }
    }
    const cached = await db.zakazkaCache.get(id);
    if (cached) {
      await db.zakazkaCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
    }
    await safeApiRequest({ url: `${API_BASE_URL}/zakazky/${id}`, method: 'PUT', body: data, headers: getAuthHeaders() as Record<string, string> });
    return 1;
  },

  async delete(id: number): Promise<void> {
    await db.zakazkaCache.delete(id);
    await safeApiRequest({ url: `${API_BASE_URL}/zakazky/${id}`, method: 'DELETE', headers: getAuthHeaders() as Record<string, string> });
  },
};

// ==================== MERICI PRISTROJE ====================
export const pristrojService = {
  async getAll(): Promise<MericiPristroj[]> {
    if (navigator.onLine) {
      try {
        const pristroje = await fetch(`${API_BASE_URL}/pristroje`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<MericiPristroj[]>(res));
        for (const p of pristroje) {
          if (p.id) await db.pristrojCache.put({ id: p.id, data: p, updatedAt: Date.now() });
        }
        return pristroje;
      } catch {
        return (await db.pristrojCache.toArray()).map(r => r.data);
      }
    } else {
      return (await db.pristrojCache.toArray()).map(r => r.data);
    }
  },

  async getById(id: number): Promise<MericiPristroj | undefined> {
    if (navigator.onLine) {
      try {
        const p = await fetch(`${API_BASE_URL}/pristroje/${id}`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<MericiPristroj | undefined>(res));
        if (p && p.id) await db.pristrojCache.put({ id: p.id, data: p, updatedAt: Date.now() });
        return p;
      } catch {
        const cached = await db.pristrojCache.get(id);
        return cached?.data;
      }
    } else {
      const cached = await db.pristrojCache.get(id);
      return cached?.data;
    }
  },

  async getExpiring(days: number = 30): Promise<MericiPristroj[]> {
    const all = await this.getAll();
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    return all.filter(p => new Date(p.platnostKalibrace) <= futureDate);
  },

  async create(data: Omit<MericiPristroj, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_BASE_URL}/pristroje`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }).then(res => handleResponse<{ id: number }>(res));
        await db.pristrojCache.put({ id: response.id, data: { ...data, id: response.id } as MericiPristroj, updatedAt: Date.now() });
        return response.id;
      } catch {
        // Network error - queue offline
      }
    }
    {
      const tempId = Date.now() * -1;
      await db.pristrojCache.put({ id: tempId, data: { ...data, id: tempId } as MericiPristroj, updatedAt: Date.now() });
      await safeApiRequest({ url: `${API_BASE_URL}/pristroje`, method: 'POST', body: data, headers: getAuthHeaders() as Record<string, string> });
      return tempId;
    }
  },

  async update(id: number, data: Partial<MericiPristroj>): Promise<number> {
    if (navigator.onLine) {
      try {
        await fetch(`${API_BASE_URL}/pristroje/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }).then(res => handleResponse<unknown>(res));
        const cached = await db.pristrojCache.get(id);
        if (cached) {
          await db.pristrojCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
        }
        return 1;
      } catch {
        // Network error - fallback to offline
      }
    }
    const cached = await db.pristrojCache.get(id);
    if (cached) {
      await db.pristrojCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
    }
    await safeApiRequest({ url: `${API_BASE_URL}/pristroje/${id}`, method: 'PUT', body: data, headers: getAuthHeaders() as Record<string, string> });
    return 1;
  },

  async delete(id: number): Promise<void> {
    await db.pristrojCache.delete(id);
    await safeApiRequest({ url: `${API_BASE_URL}/pristroje/${id}`, method: 'DELETE', headers: getAuthHeaders() as Record<string, string> });
  },
};

// ==================== REVIZE-PRISTROJ (vazby) ====================
export const revizePristrojService = {
  async getByRevize(revizeId: number): Promise<MericiPristroj[]> {
    if (navigator.onLine) {
      try {
        return await fetch(`${API_BASE_URL}/revize-pristroje/${revizeId}`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<MericiPristroj[]>(res));
      } catch {
        return (await db.pristrojCache.toArray()).map(r => r.data);
      }
    } else {
      return (await db.pristrojCache.toArray()).map(r => r.data);
    }
  },

  async addToRevize(revizeId: number, pristrojId: number): Promise<number> {
    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_BASE_URL}/revize-pristroje`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ revizeId, pristrojId }),
        }).then(res => handleResponse<{ id: number }>(res));
        return response.id;
      } catch {
        // Network error - queue offline
      }
    }
    await safeApiRequest({ url: `${API_BASE_URL}/revize-pristroje`, method: 'POST', body: { revizeId, pristrojId }, headers: getAuthHeaders() as Record<string, string> });
    return Date.now() * -1;
  },

  async removeFromRevize(revizeId: number, pristrojId: number): Promise<void> {
    await safeApiRequest({ url: `${API_BASE_URL}/revize-pristroje/${revizeId}/${pristrojId}`, method: 'DELETE', headers: getAuthHeaders() as Record<string, string> });
  },
};

// ==================== KALIBRACE (historie) ====================
export const kalibraceService = {
  async getByPristroj(pristrojId: number): Promise<Kalibrace[]> {
    try {
      return await fetch(`${API_BASE_URL}/kalibrace/${pristrojId}`, {
        headers: getAuthHeaders(),
      }).then(res => handleResponse<Kalibrace[]>(res));
    } catch {
      return [];
    }
  },

  async create(data: Omit<Kalibrace, 'id' | 'createdAt'>): Promise<number> {
    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_BASE_URL}/kalibrace`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }).then(res => handleResponse<{ id: number }>(res));
        return response.id;
      } catch {
        // Network error - queue offline
      }
    }
    await safeApiRequest({ url: `${API_BASE_URL}/kalibrace`, method: 'POST', body: data, headers: getAuthHeaders() as Record<string, string> });
    return Date.now() * -1;
  },

  async delete(id: number): Promise<void> {
    await safeApiRequest({ url: `${API_BASE_URL}/kalibrace/${id}`, method: 'DELETE', headers: getAuthHeaders() as Record<string, string> });
  },
};

// ==================== NASTAVENI ====================
export const nastaveniService = {
  async get(): Promise<Nastaveni | undefined> {
    if (navigator.onLine) {
      try {
        const nastaveni = await fetch(`${API_BASE_URL}/nastaveni`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<Nastaveni | undefined>(res));
        if (nastaveni) await db.nastaveniCache.put({ id: 1, data: nastaveni, updatedAt: Date.now() });
        return nastaveni;
      } catch {
        const cached = await db.nastaveniCache.get(1);
        return cached?.data;
      }
    } else {
      const cached = await db.nastaveniCache.get(1);
      return cached?.data;
    }
  },

  async save(data: Partial<Nastaveni>): Promise<void> {
    if (navigator.onLine) {
      try {
        await fetch(`${API_BASE_URL}/nastaveni`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }).then(res => handleResponse<unknown>(res));
        const cached = await db.nastaveniCache.get(1);
        if (cached) {
          await db.nastaveniCache.put({ id: 1, data: { ...cached.data, ...data }, updatedAt: Date.now() });
        } else {
          await db.nastaveniCache.put({ id: 1, data: data as Nastaveni, updatedAt: Date.now() });
        }
        return;
      } catch {
        // Network error - fallback to offline
      }
    }
    const cached = await db.nastaveniCache.get(1);
    if (cached) {
      await db.nastaveniCache.put({ id: 1, data: { ...cached.data, ...data }, updatedAt: Date.now() });
    } else {
      await db.nastaveniCache.put({ id: 1, data: data as Nastaveni, updatedAt: Date.now() });
    }
    await safeApiRequest({ url: `${API_BASE_URL}/nastaveni`, method: 'PUT', body: data, headers: getAuthHeaders() as Record<string, string> });
  },
};

// ==================== ZAVADY KATALOG ====================
export const zavadaKatalogService = {
  async getAll(): Promise<ZavadaKatalog[]> {
    if (navigator.onLine) {
      try {
        const items = await fetch(`${API_BASE_URL}/zavady-katalog`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<ZavadaKatalog[]>(res));
        for (const item of items) {
          if (item.id) await db.zavadaKatalogCache.put({ id: item.id, data: item, updatedAt: Date.now() });
        }
        return items;
      } catch {
        return (await db.zavadaKatalogCache.toArray()).map(r => r.data);
      }
    } else {
      return (await db.zavadaKatalogCache.toArray()).map(r => r.data);
    }
  },

  async getById(id: number): Promise<ZavadaKatalog | undefined> {
    const all = await this.getAll();
    return all.find(z => z.id === id);
  },

  async getByKategorie(kategorie: string): Promise<ZavadaKatalog[]> {
    const all = await this.getAll();
    return all.filter(z => z.kategorie === kategorie);
  },

  async getByZavaznost(zavaznost: string): Promise<ZavadaKatalog[]> {
    const all = await this.getAll();
    return all.filter(z => z.zavaznost === zavaznost);
  },

  async create(data: Omit<ZavadaKatalog, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_BASE_URL}/zavady-katalog`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }).then(res => handleResponse<{ id: number }>(res));
        await db.zavadaKatalogCache.put({ id: response.id, data: { ...data, id: response.id } as ZavadaKatalog, updatedAt: Date.now() });
        return response.id;
      } catch {
        // Network error - queue offline
      }
    }
    {
      const tempId = Date.now() * -1;
      await db.zavadaKatalogCache.put({ id: tempId, data: { ...data, id: tempId } as ZavadaKatalog, updatedAt: Date.now() });
      await safeApiRequest({ url: `${API_BASE_URL}/zavady-katalog`, method: 'POST', body: data, headers: getAuthHeaders() as Record<string, string> });
      return tempId;
    }
  },

  async update(id: number, data: Partial<ZavadaKatalog>): Promise<number> {
    if (navigator.onLine) {
      try {
        await fetch(`${API_BASE_URL}/zavady-katalog/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }).then(res => handleResponse<unknown>(res));
        const cached = await db.zavadaKatalogCache.get(id);
        if (cached) {
          await db.zavadaKatalogCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
        }
        return 1;
      } catch {
        // Network error - fallback to offline
      }
    }
    const cached = await db.zavadaKatalogCache.get(id);
    if (cached) {
      await db.zavadaKatalogCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
    }
    await safeApiRequest({ url: `${API_BASE_URL}/zavady-katalog/${id}`, method: 'PUT', body: data, headers: getAuthHeaders() as Record<string, string> });
    return 1;
  },

  async delete(id: number): Promise<void> {
    await db.zavadaKatalogCache.delete(id);
    await safeApiRequest({ url: `${API_BASE_URL}/zavady-katalog/${id}`, method: 'DELETE', headers: getAuthHeaders() as Record<string, string> });
  },

  async getKategorie(): Promise<string[]> {
    const all = await this.getAll();
    const kategorie = [...new Set(all.map(z => z.kategorie).filter(Boolean))];
    return kategorie as string[];
  },

  getDefaultZavady(): Omit<ZavadaKatalog, 'id' | 'createdAt' | 'updatedAt'>[] {
    return [
      {
        popis: 'Chybí revizní zpráva předchozí revize',
        zavaznost: 'C2',
        norma: 'ČSN 33 1500',
        clanek: 'čl. 3.2',
        zneniClanku: 'Provozovatel elektrického zařízení je povinen uchovávat revizní zprávy po celou dobu provozu zařízení.',
        kategorie: 'Dokumentace'
      },
      {
        popis: 'Rozvaděč není označen výstražnými tabulkami',
        zavaznost: 'C2',
        norma: 'ČSN EN 61439-1',
        clanek: 'čl. 6.5',
        zneniClanku: 'Rozvaděče musí být opatřeny výstražnými a informačními štítky.',
        kategorie: 'Rozvaděče'
      },
    ];
  }
};

// ==================== PŘEDVOLENÉ TEXTY ====================
export const predvolenyTextService = {
  async getAll(): Promise<PredvolenyText[]> {
    if (navigator.onLine) {
      try {
        const items = await fetch(`${API_BASE_URL}/predvolene-texty`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<PredvolenyText[]>(res));
        for (const item of items) {
          if (item.id) await db.predvolenyTextCache.put({ id: item.id, data: item, updatedAt: Date.now() });
        }
        return items;
      } catch {
        return (await db.predvolenyTextCache.toArray()).map(r => r.data);
      }
    } else {
      return (await db.predvolenyTextCache.toArray()).map(r => r.data);
    }
  },

  async getByPole(pole: string): Promise<PredvolenyText[]> {
    if (navigator.onLine) {
      try {
        return await fetch(`${API_BASE_URL}/predvolene-texty/${pole}`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<PredvolenyText[]>(res));
      } catch {
        return (await db.predvolenyTextCache.toArray()).map(r => r.data).filter(t => t.pole === pole);
      }
    } else {
      return (await db.predvolenyTextCache.toArray()).map(r => r.data).filter(t => t.pole === pole);
    }
  },

  async create(data: { pole: string; nazev: string; text: string; poradi?: number }): Promise<number> {
    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_BASE_URL}/predvolene-texty`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }).then(res => handleResponse<{ id: number }>(res));
        await db.predvolenyTextCache.put({ id: response.id, data: { ...data, id: response.id } as PredvolenyText, updatedAt: Date.now() });
        return response.id;
      } catch {
        // Network error - queue offline
      }
    }
    {
      const tempId = Date.now() * -1;
      await db.predvolenyTextCache.put({ id: tempId, data: { ...data, id: tempId } as PredvolenyText, updatedAt: Date.now() });
      await safeApiRequest({ url: `${API_BASE_URL}/predvolene-texty`, method: 'POST', body: data, headers: getAuthHeaders() as Record<string, string> });
      return tempId;
    }
  },

  async update(id: number, data: { nazev: string; text: string; poradi?: number }): Promise<void> {
    if (navigator.onLine) {
      try {
        await fetch(`${API_BASE_URL}/predvolene-texty/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }).then(res => handleResponse<unknown>(res));
        const cached = await db.predvolenyTextCache.get(id);
        if (cached) {
          await db.predvolenyTextCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
        }
        return;
      } catch {
        // Network error - fallback to offline
      }
    }
    const cached = await db.predvolenyTextCache.get(id);
    if (cached) {
      await db.predvolenyTextCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
    }
    await safeApiRequest({ url: `${API_BASE_URL}/predvolene-texty/${id}`, method: 'PUT', body: data, headers: getAuthHeaders() as Record<string, string> });
  },

  async delete(id: number): Promise<void> {
    await db.predvolenyTextCache.delete(id);
    await safeApiRequest({ url: `${API_BASE_URL}/predvolene-texty/${id}`, method: 'DELETE', headers: getAuthHeaders() as Record<string, string> });
  },
};

// ==================== ZÁKAZNÍCI ====================
export const zakazniciService = {
  async getAll(): Promise<Zakaznik[]> {
    if (navigator.onLine) {
      try {
        const zakaznici = await fetch(`${API_BASE_URL}/zakaznici`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<Zakaznik[]>(res));
        for (const z of zakaznici) {
          if (z.id) await db.zakaznikCache.put({ id: z.id, data: z, updatedAt: Date.now() });
        }
        return zakaznici;
      } catch {
        return (await db.zakaznikCache.toArray()).map(r => r.data);
      }
    } else {
      return (await db.zakaznikCache.toArray()).map(r => r.data);
    }
  },

  async getById(id: number): Promise<Zakaznik | undefined> {
    if (navigator.onLine) {
      try {
        const z = await fetch(`${API_BASE_URL}/zakaznici/${id}`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<Zakaznik | undefined>(res));
        if (z && z.id) await db.zakaznikCache.put({ id: z.id, data: z, updatedAt: Date.now() });
        return z;
      } catch {
        const cached = await db.zakaznikCache.get(id);
        return cached?.data;
      }
    } else {
      const cached = await db.zakaznikCache.get(id);
      return cached?.data;
    }
  },

  async getRevize(zakaznikId: number): Promise<Revize[]> {
    if (navigator.onLine) {
      try {
        return await fetch(`${API_BASE_URL}/zakaznici/${zakaznikId}/revize`, {
          headers: getAuthHeaders(),
        }).then(res => handleResponse<Revize[]>(res));
      } catch {
        return (await db.revizeCache.toArray()).map(r => r.data).filter(r => r.zakaznikId === zakaznikId);
      }
    } else {
      return (await db.revizeCache.toArray()).map(r => r.data).filter(r => r.zakaznikId === zakaznikId);
    }
  },

  async create(data: Omit<Zakaznik, 'id' | 'pocetRevizi' | 'createdAt' | 'updatedAt'>): Promise<number> {
    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_BASE_URL}/zakaznici`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }).then(res => handleResponse<{ id: number }>(res));
        await db.zakaznikCache.put({ id: response.id, data: { ...data, id: response.id, pocetRevizi: 0 } as Zakaznik, updatedAt: Date.now() });
        return response.id;
      } catch {
        // Network error - queue offline
      }
    }
    {
      const tempId = Date.now() * -1;
      await db.zakaznikCache.put({ id: tempId, data: { ...data, id: tempId, pocetRevizi: 0 } as Zakaznik, updatedAt: Date.now() });
      await safeApiRequest({ url: `${API_BASE_URL}/zakaznici`, method: 'POST', body: data, headers: getAuthHeaders() as Record<string, string> });
      return tempId;
    }
  },

  async update(id: number, data: Partial<Zakaznik>): Promise<number> {
    if (navigator.onLine) {
      try {
        await fetch(`${API_BASE_URL}/zakaznici/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }).then(res => handleResponse<unknown>(res));
        const cached = await db.zakaznikCache.get(id);
        if (cached) {
          await db.zakaznikCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
        }
        return 1;
      } catch {
        // Network error - fallback to offline
      }
    }
    const cached = await db.zakaznikCache.get(id);
    if (cached) {
      await db.zakaznikCache.put({ id, data: { ...cached.data, ...data }, updatedAt: Date.now() });
    }
    await safeApiRequest({ url: `${API_BASE_URL}/zakaznici/${id}`, method: 'PUT', body: data, headers: getAuthHeaders() as Record<string, string> });
    return 1;
  },

  async delete(id: number): Promise<void> {
    await db.zakaznikCache.delete(id);
    await safeApiRequest({ url: `${API_BASE_URL}/zakaznici/${id}`, method: 'DELETE', headers: getAuthHeaders() as Record<string, string> });
  },
};

// ==================== BACKUP ====================
export const backupService = {
  async exportDatabase(): Promise<string> {
    const data = await fetch(`${API_BASE_URL}/backup`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
    return JSON.stringify(data, null, 2);
  },

  async importDatabase(jsonData: string, mergeMode: 'replace' | 'merge' = 'replace'): Promise<{ imported: number; errors: number }> {
    const data = JSON.parse(jsonData);
    return fetch(`${API_BASE_URL}/backup/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ data, mode: mergeMode }),
    }).then(res => handleResponse<{ imported: number; errors: number }>(res));
  },

  async getDatabaseStats(): Promise<{ stats: Record<string, number>; sizeMB: string }> {
    return fetch(`${API_BASE_URL}/backup/stats`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<{ stats: Record<string, number>; sizeMB: string }>(res));
  },

  async cleanOldData(daysOld: number = 365): Promise<{ deleted: number; message?: string }> {
    return fetch(`${API_BASE_URL}/backup/clean`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ daysOld }),
    }).then(res => handleResponse<{ deleted: number; message?: string }>(res));
  },
};

// ==================== EXPORT SERVICE (pro kompatibilitu) ====================
export const exportService = {
  async exportAll(): Promise<string> {
    return backupService.exportDatabase();
  },

  async importAll(jsonString: string): Promise<void> {
    await backupService.importDatabase(jsonString, 'replace');
  },
};

