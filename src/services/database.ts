// Database service - komunikuje s backend API
// Všechna data jsou uložena na serveru a synchronizována mezi zařízeními

import type { Revize, Rozvadec, Okruh, Zavada, Mistnost, Zarizeni, Zakazka, Nastaveni, MericiPristroj, Firma, ZavadaKatalog, Zakaznik, PredvolenyText, Kalibrace } from '../types';

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
    return fetch(`${API_BASE_URL}/revize`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Revize[]>(res));
  },

  async getById(id: number): Promise<Revize | undefined> {
    return fetch(`${API_BASE_URL}/revize/${id}`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Revize | undefined>(res));
  },

  async create(data: Omit<Revize, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/revize`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<{ id: number }>(res));
    return response.id;
  },

  async update(id: number, data: Partial<Revize>): Promise<number> {
    await fetch(`${API_BASE_URL}/revize/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<unknown>(res));
    return 1;
  },

  async delete(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/revize/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
  },

  async duplikovat(id: number, cisloRevize: string, typ: 'navazujici' | 'duplikat' = 'navazujici'): Promise<{ id: number; skupinaRevizi: string }> {
    return fetch(`${API_BASE_URL}/revize/${id}/duplikovat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ cisloRevize, typ }),
    }).then(res => handleResponse<{ id: number; skupinaRevizi: string }>(res));
  },

  async getHistorie(id: number): Promise<Partial<Revize>[]> {
    return fetch(`${API_BASE_URL}/revize/${id}/historie`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Partial<Revize>[]>(res));
  },
};

// ==================== ROZVADĚČE ====================
export const rozvadecService = {
  async getByRevize(revizeId: number): Promise<Rozvadec[]> {
    return fetch(`${API_BASE_URL}/rozvadece/${revizeId}`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Rozvadec[]>(res));
  },

  async getById(_id: number): Promise<Rozvadec | undefined> {
    return undefined;
  },

  async create(data: Omit<Rozvadec, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/rozvadece`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<{ id: number }>(res));
    return response.id;
  },

  async update(id: number, data: Partial<Rozvadec>): Promise<number> {
    await fetch(`${API_BASE_URL}/rozvadece/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<unknown>(res));
    return 1;
  },

  async delete(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/rozvadece/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
  },
};

// ==================== OKRUHY ====================
export const okruhService = {
  async getByRozvadec(rozvadecId: number): Promise<Okruh[]> {
    return fetch(`${API_BASE_URL}/okruhy/${rozvadecId}`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Okruh[]>(res));
  },

  async create(data: Omit<Okruh, 'id'>): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/okruhy`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<{ id: number }>(res));
    return response.id;
  },

  async update(id: number, data: Partial<Okruh>): Promise<number> {
    await fetch(`${API_BASE_URL}/okruhy/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<unknown>(res));
    return 1;
  },

  async delete(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/okruhy/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
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
    return fetch(`${API_BASE_URL}/mistnosti/revize/${revizeId}`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Mistnost[]>(res));
  },

  async getById(id: number): Promise<Mistnost | undefined> {
    const all = await this.getAll();
    return all.find(m => m.id === id);
  },

  async create(data: Omit<Mistnost, 'id'>): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/mistnosti`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<{ id: number }>(res));
    return response.id;
  },

  async update(id: number, data: Partial<Mistnost>): Promise<number> {
    await fetch(`${API_BASE_URL}/mistnosti/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<unknown>(res));
    return 1;
  },

  async delete(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/mistnosti/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
  },
};

// ==================== ZARIZENI ====================
export const zarizeniService = {
  async getAll(): Promise<Zarizeni[]> {
    return [];
  },

  async getByMistnost(mistnostId: number): Promise<Zarizeni[]> {
    return fetch(`${API_BASE_URL}/zarizeni/${mistnostId}`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Zarizeni[]>(res));
  },

  async getById(_id: number): Promise<Zarizeni | undefined> {
    return undefined;
  },

  async create(data: Omit<Zarizeni, 'id'>): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/zarizeni`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<{ id: number }>(res));
    return response.id;
  },

  async update(id: number, data: Partial<Zarizeni>): Promise<number> {
    await fetch(`${API_BASE_URL}/zarizeni/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<unknown>(res));
    return 1;
  },

  async delete(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/zarizeni/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
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
    return fetch(`${API_BASE_URL}/zavady/revize/${revizeId}`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Zavada[]>(res));
  },

  async create(data: Omit<Zavada, 'id'>): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/zavady`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<{ id: number }>(res));
    return response.id;
  },

  async update(id: number, data: Partial<Zavada>): Promise<number> {
    await fetch(`${API_BASE_URL}/zavady/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<unknown>(res));
    return 1;
  },

  async delete(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/zavady/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
  },
};

// ==================== FIRMY ====================
export const firmaService = {
  async getAll(): Promise<Firma[]> {
    return fetch(`${API_BASE_URL}/firmy`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Firma[]>(res));
  },

  async getById(id: number): Promise<Firma | undefined> {
    return fetch(`${API_BASE_URL}/firmy/${id}`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Firma | undefined>(res));
  },

  async create(data: Omit<Firma, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/firmy`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<{ id: number }>(res));
    return response.id;
  },

  async update(id: number, data: Partial<Firma>): Promise<number> {
    await fetch(`${API_BASE_URL}/firmy/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<unknown>(res));
    return 1;
  },

  async delete(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/firmy/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
  },
};

// ==================== ZAKAZKY ====================
export const zakazkaService = {
  async getAll(): Promise<Zakazka[]> {
    return fetch(`${API_BASE_URL}/zakazky`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Zakazka[]>(res));
  },

  async getById(id: number): Promise<Zakazka | undefined> {
    const all = await this.getAll();
    return all.find(z => z.id === id);
  },

  async create(data: Omit<Zakazka, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/zakazky`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<{ id: number }>(res));
    return response.id;
  },

  async update(id: number, data: Partial<Zakazka>): Promise<number> {
    await fetch(`${API_BASE_URL}/zakazky/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<unknown>(res));
    return 1;
  },

  async delete(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/zakazky/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
  },
};

// ==================== MERICI PRISTROJE ====================
export const pristrojService = {
  async getAll(): Promise<MericiPristroj[]> {
    return fetch(`${API_BASE_URL}/pristroje`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<MericiPristroj[]>(res));
  },

  async getById(id: number): Promise<MericiPristroj | undefined> {
    return fetch(`${API_BASE_URL}/pristroje/${id}`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<MericiPristroj | undefined>(res));
  },

  async getExpiring(days: number = 30): Promise<MericiPristroj[]> {
    const all = await this.getAll();
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    return all.filter(p => new Date(p.platnostKalibrace) <= futureDate);
  },

  async create(data: Omit<MericiPristroj, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/pristroje`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<{ id: number }>(res));
    return response.id;
  },

  async update(id: number, data: Partial<MericiPristroj>): Promise<number> {
    await fetch(`${API_BASE_URL}/pristroje/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<unknown>(res));
    return 1;
  },

  async delete(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/pristroje/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
  },
};

// ==================== REVIZE-PRISTROJ (vazby) ====================
export const revizePristrojService = {
  async getByRevize(revizeId: number): Promise<MericiPristroj[]> {
    return fetch(`${API_BASE_URL}/revize-pristroje/${revizeId}`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<MericiPristroj[]>(res));
  },

  async addToRevize(revizeId: number, pristrojId: number): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/revize-pristroje`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ revizeId, pristrojId }),
    }).then(res => handleResponse<{ id: number }>(res));
    return response.id;
  },

  async removeFromRevize(revizeId: number, pristrojId: number): Promise<void> {
    await fetch(`${API_BASE_URL}/revize-pristroje/${revizeId}/${pristrojId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
  },
};

// ==================== KALIBRACE (historie) ====================
export const kalibraceService = {
  async getByPristroj(pristrojId: number): Promise<Kalibrace[]> {
    return fetch(`${API_BASE_URL}/kalibrace/${pristrojId}`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Kalibrace[]>(res));
  },

  async create(data: Omit<Kalibrace, 'id' | 'createdAt'>): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/kalibrace`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<{ id: number }>(res));
    return response.id;
  },

  async delete(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/kalibrace/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
  },
};

// ==================== NASTAVENI ====================
export const nastaveniService = {
  async get(): Promise<Nastaveni | undefined> {
    return fetch(`${API_BASE_URL}/nastaveni`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Nastaveni | undefined>(res));
  },

  async save(data: Partial<Nastaveni>): Promise<void> {
    await fetch(`${API_BASE_URL}/nastaveni`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<unknown>(res));
  },
};

// ==================== ZAVADY KATALOG ====================
export const zavadaKatalogService = {
  async getAll(): Promise<ZavadaKatalog[]> {
    return fetch(`${API_BASE_URL}/zavady-katalog`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<ZavadaKatalog[]>(res));
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
    const response = await fetch(`${API_BASE_URL}/zavady-katalog`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<{ id: number }>(res));
    return response.id;
  },

  async update(id: number, data: Partial<ZavadaKatalog>): Promise<number> {
    await fetch(`${API_BASE_URL}/zavady-katalog/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<unknown>(res));
    return 1;
  },

  async delete(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/zavady-katalog/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
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
    return fetch(`${API_BASE_URL}/predvolene-texty`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<PredvolenyText[]>(res));
  },

  async getByPole(pole: string): Promise<PredvolenyText[]> {
    return fetch(`${API_BASE_URL}/predvolene-texty/${pole}`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<PredvolenyText[]>(res));
  },

  async create(data: { pole: string; nazev: string; text: string; poradi?: number }): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/predvolene-texty`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<{ id: number }>(res));
    return response.id;
  },

  async update(id: number, data: { nazev: string; text: string; poradi?: number }): Promise<void> {
    await fetch(`${API_BASE_URL}/predvolene-texty/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<unknown>(res));
  },

  async delete(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/predvolene-texty/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
  },
};

// ==================== ZÁKAZNÍCI ====================
export const zakazniciService = {
  async getAll(): Promise<Zakaznik[]> {
    return fetch(`${API_BASE_URL}/zakaznici`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Zakaznik[]>(res));
  },

  async getById(id: number): Promise<Zakaznik | undefined> {
    return fetch(`${API_BASE_URL}/zakaznici/${id}`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Zakaznik | undefined>(res));
  },

  async getRevize(zakaznikId: number): Promise<Revize[]> {
    return fetch(`${API_BASE_URL}/zakaznici/${zakaznikId}/revize`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Revize[]>(res));
  },

  async create(data: Omit<Zakaznik, 'id' | 'pocetRevizi' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/zakaznici`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<{ id: number }>(res));
    return response.id;
  },

  async update(id: number, data: Partial<Zakaznik>): Promise<number> {
    await fetch(`${API_BASE_URL}/zakaznici/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<unknown>(res));
    return 1;
  },

  async delete(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/zakaznici/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
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

// Pro zpětnou kompatibilitu - prázdná db konstanta
export const db = null;
