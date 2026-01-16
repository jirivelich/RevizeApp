// Database service - komunikuje s backend API
// Všechna data jsou uložena na serveru a synchronizována mezi zařízeními

import type { Revize, Rozvadec, Okruh, Zavada, Mistnost, Zarizeni, Zakazka, Nastaveni, Sablona, MericiPristroj, Firma, ZavadaKatalog, Zakaznik } from '../types';

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

// ==================== SABLONY ====================
export const sablonaService = {
  async getAll(): Promise<Sablona[]> {
    return fetch(`${API_BASE_URL}/sablony`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Sablona[]>(res));
  },

  async getById(id: number): Promise<Sablona | undefined> {
    return fetch(`${API_BASE_URL}/sablony/${id}`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Sablona | undefined>(res));
  },

  async getVychozi(): Promise<Sablona | undefined> {
    return fetch(`${API_BASE_URL}/sablony/vychozi/get`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Sablona | undefined>(res));
  },

  async create(data: Omit<Sablona, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/sablony`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<{ id: number }>(res));
    return response.id;
  },

  async update(id: number, data: Partial<Sablona>): Promise<number> {
    await fetch(`${API_BASE_URL}/sablony/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(res => handleResponse<unknown>(res));
    return 1;
  },

  async delete(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/sablony/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(res => handleResponse<unknown>(res));
  },

  getDefaultSablona(): Omit<Sablona, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      nazev: 'Výchozí šablona',
      popis: 'Šablona podle požadavků na revizní zprávu vyhrazeného elektrického zařízení',
      jeVychozi: true,
      zahlaviZobrazitLogo: true,
      zahlaviZobrazitFirmu: true,
      zahlaviZobrazitTechnika: true,
      zahlaviCustomText: '',
      uvodniStranaZobrazit: true,
      uvodniStranaZobrazitObjekt: true,
      uvodniStranaZobrazitTechnika: true,
      uvodniStranaZobrazitFirmu: true,
      uvodniStranaZobrazitZakaznika: true,
      uvodniStranaZobrazitVyhodnoceni: true,
      uvodniStranaZobrazitPodpisy: true,
      podpisyUmisteni: 'uvodni',
      uvodniStranaNadpis: 'ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ',
      uvodniStranaNadpisFontSize: 16,
      uvodniStranaNadpisRamecek: true,
      uvodniStranaRamecekUdaje: true,
      uvodniStranaRamecekObjekt: true,
      uvodniStranaRamecekZakaznik: true,
      uvodniStranaRamecekVyhodnoceni: true,
      // Bloky úvodní strany 
      uvodniStranaBloky: [
        { id: 'hlavicka', nazev: 'Hlavička (Firma + Revizní technik)', enabled: true, poradi: 1 },
        { id: 'nadpis', nazev: 'Nadpis dokumentu', enabled: true, poradi: 2 },
        { id: 'zakaznik', nazev: 'Provozovatel (zákazník)', enabled: true, poradi: 3 },
        { id: 'objekt', nazev: 'Identifikace zařízení a místo', enabled: true, poradi: 4 },
        { id: 'zakladni-udaje', nazev: 'Základní údaje revize', enabled: true, poradi: 5 },
        { id: 'vyhodnoceni', nazev: 'Vyhodnocení revize', enabled: true, poradi: 6 },
        { id: 'podpisy', nazev: 'Podpisy a předání', enabled: true, poradi: 7 },
      ],
      // Sekce dokumentu podle zákonných požadavků
      sekce: [
        { id: 'zakladni-udaje', nazev: 'Základní údaje revize', enabled: true, poradi: 1 },
        { id: 'objekt', nazev: 'Údaje o objektu/zařízení', enabled: true, poradi: 2 },
        { id: 'vymezeni-rozsahu', nazev: 'Vymezení rozsahu revize', enabled: true, poradi: 3 },
        { id: 'charakteristika-zarizeni', nazev: 'Charakteristika zařízení', enabled: true, poradi: 4 },
        { id: 'pristroje', nazev: 'Soupis měřicích přístrojů', enabled: true, poradi: 5 },
        { id: 'podklady', nazev: 'Podklady pro revizi', enabled: true, poradi: 6 },
        { id: 'provedene-ukony', nazev: 'Provedené úkony', enabled: true, poradi: 7 },
        { id: 'vyhodnoceni-predchozich', nazev: 'Vyhodnocení předchozích revizí', enabled: true, poradi: 8 },
        { id: 'rozvadece', nazev: 'Rozvaděče a okruhy', enabled: true, poradi: 9 },
        { id: 'mereni', nazev: 'Naměřené hodnoty', enabled: true, poradi: 10 },
        { id: 'mistnosti', nazev: 'Místnosti a zařízení', enabled: true, poradi: 11 },
        { id: 'zaver', nazev: 'Závěrečné zhodnocení', enabled: true, poradi: 12 },
        { id: 'podpisy', nazev: 'Podpisy', enabled: true, poradi: 13 },
        { id: 'zavady', nazev: 'Přehled zjištěných závad', enabled: true, poradi: 14 },
      ],
      sloupceOkruhu: [
        { id: 'cislo', nazev: 'Č.', enabled: true, poradi: 1 },
        { id: 'jistic', nazev: 'Jistič', enabled: true, poradi: 2 },
        { id: 'nazev', nazev: 'Název okruhu', enabled: true, poradi: 3 },
        { id: 'vodic', nazev: 'Vodič', enabled: true, poradi: 4 },
        { id: 'izolacniOdpor', nazev: 'Iz. odpor [MΩ]', enabled: true, poradi: 5 },
        { id: 'impedanceSmycky', nazev: 'Zs [Ω]', enabled: true, poradi: 6 },
        { id: 'proudovyChranicMa', nazev: 'IΔn [mA]', enabled: true, poradi: 7 },
        { id: 'casOdpojeni', nazev: 'tA [ms]', enabled: true, poradi: 8 },
      ],
      zapatiZobrazitCisloStranky: true,
      zapatiZobrazitDatum: true,
      zapatiCustomText: '',
      barvaPrimary: '#1e40af',
      barvaSecondary: '#64748b',
      fontFamily: 'Arial',
      fontSize: 10,
    };
  }
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

  async importDatabase(jsonData: string, mergeMode: 'replace' | 'merge' = 'replace'): Promise<void> {
    const data = JSON.parse(jsonData);
    await fetch(`${API_BASE_URL}/backup/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ data, mode: mergeMode }),
    }).then(res => handleResponse<unknown>(res));
  },

  async getDatabaseStats(): Promise<Record<string, number>> {
    const data = await fetch(`${API_BASE_URL}/backup`, {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<Record<string, unknown[]>>(res));
    
    return {
      revize: data.revize?.length || 0,
      rozvadece: data.rozvadec?.length || 0,
      okruhy: data.okruh?.length || 0,
      zavady: data.zavada?.length || 0,
      mistnosti: data.mistnost?.length || 0,
      zarizeni: data.zarizeni?.length || 0,
      zakazky: data.zakazka?.length || 0,
      firmy: data.firma?.length || 0,
      zakaznici: data.zakaznik?.length || 0,
      pristroje: data.mericiPristroj?.length || 0,
      sablony: data.sablona?.length || 0,
    };
  },

  async getDatabaseSize(): Promise<string> {
    const stats = await this.getDatabaseStats();
    let totalSize = 0;
    for (const count of Object.values(stats)) {
      totalSize += count * 1;
    }
    return (totalSize / 1024).toFixed(2);
  },

  async cleanOldData(_daysOld: number = 365): Promise<void> {
    // Funkce pro čištění starých dat - zatím pouze placeholder
    // Server by měl mít endpoint pro tuto funkci
    console.log('Clean old data - not implemented on server yet');
  },
};

// ==================== EXPORT SERVICE (pro kompatibilitu) ====================
export const exportService = {
  async exportAll(): Promise<string> {
    return backupService.exportDatabase();
  },

  async importAll(jsonString: string): Promise<void> {
    return backupService.importDatabase(jsonString, 'replace');
  },
};

// Pro zpětnou kompatibilitu - prázdná db konstanta
export const db = null;
