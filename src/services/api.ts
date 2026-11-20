// API service pro komunikaci s backendem
import { buildApiUrl, getAuthHeaders, getToken, handleResponse, clearAuthState } from './httpClient';

// Odhlásit — smaže session v DB, pak vyčistí localStorage
export async function logoutApi(): Promise<void> {
  const token = getToken();
  if (token) {
    try {
      await fetch(buildApiUrl('/auth/logout'), {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {
      // Offline nebo chyba sítě — pokračujeme v odhlášení lokálně
    }
  }
  clearAuthState();
}

// ==================== REVIZE ====================
export const revizeApi = {
  async getAll() {
    return fetch(buildApiUrl('/revize'), {
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },

  async getById(id: string) {
    return fetch(buildApiUrl(`/revize/${id}`), {
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },

  async create(data: any) {
    return fetch(buildApiUrl('/revize'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  async update(id: string, data: any) {
    return fetch(buildApiUrl(`/revize/${id}`), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  async delete(id: string) {
    return fetch(buildApiUrl(`/revize/${id}`), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },
};

// ==================== ROZVADECE ====================
export const rozvadeceApi = {
  async getByRevize(revizeId: string) {
    return fetch(buildApiUrl(`/rozvadece/${revizeId}`), {
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },

  async create(data: any) {
    return fetch(buildApiUrl('/rozvadece'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  async delete(id: string) {
    return fetch(buildApiUrl(`/rozvadece/${id}`), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },
};

// ==================== NASTAVENÍ ====================
export const nastaveniApi = {
  async get() {
    return fetch(buildApiUrl('/nastaveni'), {
      headers: getAuthHeaders(),
    }).then(handleResponse);
  },

  async update(data: any) {
    return fetch(buildApiUrl('/nastaveni'), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  async getHistorie(): Promise<import('../types').TechnikHistorie[]> {
    return fetch(buildApiUrl('/technik-historie'), {
      headers: getAuthHeaders(),
    }).then(r => handleResponse<import('../types').TechnikHistorie[]>(r));
  },

  async addHistorie(data: Omit<import('../types').TechnikHistorie, 'id' | 'createdAt'>): Promise<{ id: number }> {
    return fetch(buildApiUrl('/technik-historie'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(r => handleResponse<{ id: number }>(r));
  },

  async deleteHistorie(id: number): Promise<void> {
    return fetch(buildApiUrl(`/technik-historie/${id}`), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(r => handleResponse<void>(r));
  },
};

// ==================== BACKUP ====================
export const backupApi = {
  async download() {
    return fetch(buildApiUrl('/backup'), {
      headers: { 'Content-Type': 'application/json' },
    }).then(handleResponse);
  },

  async import(data: any, mode: 'merge' | 'replace' = 'merge') {
    return fetch(buildApiUrl('/backup/import'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, mode }),
    }).then(handleResponse);
  },
};

// ==================== HEALTH CHECK ====================
export async function checkServerHealth() {
  try {
    const response = await fetch(buildApiUrl('/health'));
    return response.ok;
  } catch {
    return false;
  }
}

// ==================== AI ====================
/** Soubor přiložený ke zprávě v AI chatu (base64 bez prefixu data:). */
export interface AIChatPriloha {
  nazev: string;
  typ: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  data: string;
}

/** Záznam, který AI asistent v aplikaci vytvořil. */
export interface AIChatAkce {
  typ: 'revize' | 'zavada' | 'udalost' | 'zakaznik' | 'rozvadec' | 'okruh' | 'mistnost' | 'zarizeni' | 'odberne_misto';
  id: number;
  popis: string;
  odkaz: string;
}

export interface AIMistnostNavrh {
  nazev: string;
  patro: string;
  plocha: number | null;
  prostredi: 'Normální' | 'Nebezpečné' | 'Zvlášť nebezpečné';
  poznamka: string;
}

export interface AIZarizeniNavrh {
  nazev: string;
  oznaceni: string;
  pocetKs: number;
  trida: 'I' | 'II' | 'III';
  prikonW: number | null;
}

export const aiApi = {
  /** Zkontrolovat, zda je AI nakonfigurováno */
  async getStatus(): Promise<{ configured: boolean }> {
    return fetch(buildApiUrl('/ai/status'), {
      headers: getAuthHeaders(),
    }).then(res => handleResponse<{ configured: boolean }>(res));
  },

  /** Vygenerovat text revizní zprávy z dat revize */
  async generateReport(revizeId: number): Promise<{ text: string }> {
    return fetch(buildApiUrl('/ai/generate-report'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ revizeId }),
    }).then(res => handleResponse<{ text: string }>(res));
  },

  /** Chat s AI asistentem */
  async chat(
    messages: { role: 'user' | 'assistant'; content: string; prilohy?: AIChatPriloha[] }[],
    revizeContext?: { id?: number },
  ): Promise<{ reply: string; akce?: AIChatAkce[] }> {
    return fetch(buildApiUrl('/ai/chat'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ messages, revizeContext }),
    }).then(res => handleResponse<{ reply: string; akce?: AIChatAkce[] }>(res));
  },

  /** Auto-vyplnění pole formuláře */
  async autofill(
    field: string,
    formData: Record<string, any>,
    entityType: string,
    pokyny?: string,
  ): Promise<{ suggestion: Record<string, string> }> {
    return fetch(buildApiUrl('/ai/autofill'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ field, formData, entityType, pokyny }),
    }).then(res => handleResponse<{ suggestion: Record<string, string> }>(res));
  },

  /** Navrhnout místnosti z popisu objektu */
  async navrhMistnosti(popis: string, revizeId?: number): Promise<{ mistnosti: AIMistnostNavrh[] }> {
    return fetch(buildApiUrl('/ai/navrh-mistnosti'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ popis, revizeId }),
    }).then(res => handleResponse<{ mistnosti: AIMistnostNavrh[] }>(res));
  },

  /** Navrhnout zařízení pro místnost */
  async navrhZarizeni(
    mistnost: { nazev: string; patro?: string; prostredi?: string; poznamka?: string },
    popis?: string,
    existujici?: string[],
  ): Promise<{ zarizeni: AIZarizeniNavrh[] }> {
    return fetch(buildApiUrl('/ai/navrh-zarizeni'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ mistnost, popis, existujici }),
    }).then(res => handleResponse<{ zarizeni: AIZarizeniNavrh[] }>(res));
  },

  /** Analyzovat fotografie rozvaděče a navrhnout okruhy */
  async analyzePhotos(
    rozvadecId: number,
    images: string[],
  ): Promise<{ okruhy: { cislo: number; nazev: string; jisticTyp: string; jisticProud: string; pocetFazi: number }[] }> {
    return fetch(buildApiUrl('/ai/analyze-photos'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rozvadecId, images }),
    }).then(res => handleResponse<{ okruhy: { cislo: number; nazev: string; jisticTyp: string; jisticProud: string; pocetFazi: number }[] }>(res));
  },
};
