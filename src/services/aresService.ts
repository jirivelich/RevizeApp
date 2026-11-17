import { buildApiUrl, getAuthHeaders } from './httpClient';

export interface AresSubjekt {
  ico: string;
  nazev: string;
  adresa: string;
  dic: string;
}

async function aresGet<T>(path: string): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('ARES není dostupný offline');
  }
  let res: Response;
  try {
    res = await fetch(buildApiUrl(path), { headers: getAuthHeaders() });
  } catch {
    throw new Error('Nepodařilo se spojit se serverem');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Chyba ${res.status}`);
  return data as T;
}

export const aresService = {
  podleIco(ico: string): Promise<AresSubjekt> {
    return aresGet<AresSubjekt>(`/ares/ico/${encodeURIComponent(ico.replace(/\s+/g, ''))}`);
  },
  hledat(nazev: string): Promise<AresSubjekt[]> {
    return aresGet<AresSubjekt[]>(`/ares/hledat?nazev=${encodeURIComponent(nazev.trim())}`);
  },
};
