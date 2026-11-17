// ==================== ARES (Administrativní registr ekonomických subjektů) ====================
// Veřejné REST API MF ČR v3: https://ares.gov.cz/swagger-ui/
// Volá se přes backend, protože ARES nepovoluje CORS z prohlížeče.

const ARES_BASE = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest';
const TIMEOUT_MS = 8000;

/** Část odpovědi ARES, kterou používáme. */
interface AresSidlo {
  textovaAdresa?: string;
  nazevUlice?: string;
  nazevCastiObce?: string;
  nazevObce?: string;
  cisloDomovni?: number | string;
  cisloOrientacni?: number | string;
  cisloOrientacniPismeno?: string;
  psc?: number | string;
}
interface AresEkonomickySubjekt {
  ico?: string;
  obchodniJmeno?: string;
  dic?: string;
  sidlo?: AresSidlo;
}

export interface AresSubjekt {
  ico: string;
  nazev: string;
  adresa: string;
  dic: string;
}

/** Ověří IČO (8 číslic, kontrolní součet mod 11). Kratší IČO doplní nulami zleva. */
export function normalizujIco(vstup: string): string | null {
  const cisla = String(vstup ?? '').replace(/\s+/g, '');
  if (!/^\d{1,8}$/.test(cisla)) return null;
  const ico = cisla.padStart(8, '0');
  let soucet = 0;
  for (let i = 0; i < 7; i++) soucet += Number(ico[i]) * (8 - i);
  const zbytek = soucet % 11;
  const kontrola = zbytek === 0 ? 1 : zbytek === 1 ? 0 : 11 - zbytek;
  return kontrola === Number(ico[7]) ? ico : null;
}

/** Sestaví adresu ze sídla ARES (preferuje textovaAdresa). */
export function formatujAdresu(sidlo: AresSidlo | undefined | null): string {
  if (!sidlo) return '';
  if (typeof sidlo.textovaAdresa === 'string' && sidlo.textovaAdresa.trim()) {
    return sidlo.textovaAdresa.trim();
  }
  const ulice = sidlo.nazevUlice || sidlo.nazevCastiObce || sidlo.nazevObce || '';
  let cislo = '';
  if (sidlo.cisloDomovni) cislo = String(sidlo.cisloDomovni);
  if (sidlo.cisloOrientacni) cislo += `/${sidlo.cisloOrientacni}${sidlo.cisloOrientacniPismeno || ''}`;
  const prvni = [ulice, cislo].filter(Boolean).join(' ');
  const psc = sidlo.psc ? String(sidlo.psc).replace(/^(\d{3})(\d{2})$/, '$1 $2') : '';
  const obec = [psc, sidlo.nazevObce].filter(Boolean).join(' ');
  return [prvni, obec].filter(Boolean).join(', ');
}

/** Převede ekonomický subjekt z ARES na zjednodušený tvar pro zákazníka. */
export function mapujSubjekt(s: AresEkonomickySubjekt | undefined | null): AresSubjekt {
  return {
    ico: String(s?.ico ?? ''),
    nazev: String(s?.obchodniJmeno ?? '').trim(),
    adresa: formatujAdresu(s?.sidlo),
    dic: String(s?.dic ?? ''),
  };
}

export class AresChyba extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function aresFetch(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
  } catch {
    throw new AresChyba('ARES je momentálně nedostupný', 502);
  } finally {
    clearTimeout(timer);
  }
}

export async function najdiPodleIco(vstup: string): Promise<AresSubjekt> {
  const ico = normalizujIco(vstup);
  if (!ico) throw new AresChyba('Neplatné IČO', 400);
  const res = await aresFetch(`${ARES_BASE}/ekonomicke-subjekty/${ico}`);
  if (res.status === 404) throw new AresChyba('Subjekt s tímto IČO nebyl v ARES nalezen', 404);
  if (!res.ok) throw new AresChyba(`ARES vrátil chybu ${res.status}`, 502);
  return mapujSubjekt(await res.json());
}

export async function hledejPodleNazvu(nazev: string, pocet = 10): Promise<AresSubjekt[]> {
  const dotaz = String(nazev ?? '').trim();
  if (dotaz.length < 3) throw new AresChyba('Zadejte alespoň 3 znaky názvu', 400);
  const res = await aresFetch(`${ARES_BASE}/ekonomicke-subjekty/vyhledat`, {
    method: 'POST',
    body: JSON.stringify({ obchodniJmeno: dotaz, start: 0, pocet: Math.min(Math.max(pocet, 1), 50) }),
  });
  // ARES vrací 400 např. při příliš mnoha výsledcích – nebereme jako chybu serveru
  if (res.status === 400) return [];
  if (!res.ok) throw new AresChyba(`ARES vrátil chybu ${res.status}`, 502);
  const data = (await res.json()) as { ekonomickeSubjekty?: AresEkonomickySubjekt[] };
  return (data?.ekonomickeSubjekty ?? []).map(s => mapujSubjekt(s));
}
