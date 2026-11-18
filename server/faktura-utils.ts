/** Čistá logika fakturace (bez DB) – testovatelná samostatně. */

export type FakturaStav = 'koncept' | 'vystavena' | 'zaplacena' | 'storno';

export interface PolozkaInput {
  popis?: string;
  mnozstvi?: number | string | null;
  jednotka?: string;
  cenaZaJednotku?: number | string | null;
  cinnost?: string | null;
}

/**
 * Druhy činnosti pro výdajový paušál (§ 7 ZDP) – stejné kódy jako ve fakturaci jv-revize.cz.
 * Sazba = procento výdajového paušálu.
 */
export const DRUHY_CINNOSTI: Record<string, { nazev: string; sazba: number }> = {
  REV: { nazev: 'Revize a zkoušky elektro', sazba: 80 },
  ELE: { nazev: 'Montáže a opravy elektro', sazba: 80 },
  OPR: { nazev: 'Opravy elektrických přístrojů', sazba: 80 },
  POR: { nazev: 'Technické poradenství', sazba: 60 },
  MER: { nazev: 'Samostatné technické měření', sazba: 60 },
  SKO: { nazev: 'Odborná školení', sazba: 60 },
  SW: { nazev: 'Vývoj software', sazba: 60 },
};

/** Platný kód druhu činnosti, jinak null. */
export function sanitizeCinnost(kod: unknown): string | null {
  const k = String(kod ?? '').trim().toUpperCase();
  return k && k in DRUHY_CINNOSTI ? k : null;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function vypocitejPolozku(p: PolozkaInput): number {
  return round2(toNum(p.mnozstvi) * toNum(p.cenaZaJednotku));
}

export function vypocitejCelkem(polozky: PolozkaInput[]): number {
  return round2(polozky.reduce((sum, p) => sum + vypocitejPolozku(p), 0));
}

/** Formát čísla faktury: [prefix]RRRR + 4místné pořadí, např. 20260001. */
export function formatCisloFaktury(rok: number, poradi: number, prefix?: string | null): string {
  return `${prefix || ''}${rok}${String(poradi).padStart(4, '0')}`;
}

const PRECHODY: Record<FakturaStav, FakturaStav[]> = {
  koncept: ['vystavena'],
  vystavena: ['zaplacena', 'storno'],
  zaplacena: ['storno'],
  storno: [],
};

export function jePrechodPovolen(z: string, na: string): boolean {
  return (PRECHODY[z as FakturaStav] || []).includes(na as FakturaStav);
}

/** Datum ISO (YYYY-MM-DD) + n dní. */
export function pridejDny(isoDatum: string, dni: number): string {
  const d = new Date(`${isoDatum}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dni);
  return d.toISOString().slice(0, 10);
}

/** Převod NUMERIC sloupců (pg vrací string) na number. */
export function numerizuj<T extends Record<string, any>>(row: T, pole: string[]): T {
  const out: Record<string, any> = { ...row };
  for (const k of pole) {
    if (out[k] !== null && out[k] !== undefined) out[k] = parseFloat(out[k]);
  }
  return out as T;
}

// ==================== CENOVÉ NABÍDKY ====================

export type NabidkaStav = 'koncept' | 'odeslana' | 'prijata' | 'odmitnuta';

/** Povolené změny stavu nabídky. Odeslanou lze vrátit do konceptu (úpravy po domluvě se zákazníkem). */
const NABIDKA_PRECHODY: Record<NabidkaStav, NabidkaStav[]> = {
  koncept: ['odeslana', 'prijata', 'odmitnuta'],
  odeslana: ['koncept', 'prijata', 'odmitnuta'],
  prijata: ['odeslana'],
  odmitnuta: ['odeslana'],
};

export function jePrechodNabidkyPovolen(z: string, na: string): boolean {
  return (NABIDKA_PRECHODY[z as NabidkaStav] ?? []).includes(na as NabidkaStav);
}

/** Nabídku lze upravovat jen jako koncept nebo odeslanou (ne přijatou/odmítnutou). */
export const lzeUpravitNabidku = (stav: string) => stav === 'koncept' || stav === 'odeslana';

/**
 * Je doklad s číslem `cislo` posledním vystaveným v některé roční řadě?
 * Vrátí rok té řady (číslo lze po smazání uvolnit), jinak null.
 */
export function rokPoslednihoCisla(
  cislo: string | null | undefined,
  rady: { rok: number; posledniCislo: number }[],
  prefix?: string | null,
): number | null {
  if (!cislo) return null;
  const r = rady.find(x => x.posledniCislo > 0 && formatCisloFaktury(Number(x.rok), Number(x.posledniCislo), prefix) === cislo);
  return r ? Number(r.rok) : null;
}

// ==================== SLEVA ====================

/** Procentuální sleva na celý doklad: 0–100, dvě desetinná místa; neplatná hodnota = 0. */
export function normalizujSlevu(v: unknown): number {
  const n = toNum(v as number | string | null | undefined);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return round2(Math.min(n, 100));
}

/** Částka slevy z mezisoučtu (zaokrouhleno na haléře). */
export function castkaSlevy(mezisoucet: number, slevaProcent: number): number {
  return round2((mezisoucet * normalizujSlevu(slevaProcent)) / 100);
}

/** Celkem po slevě. */
export function celkemSeSlevou(polozky: PolozkaInput[], slevaProcent: unknown): number {
  const mezisoucet = vypocitejCelkem(polozky);
  return round2(mezisoucet - castkaSlevy(mezisoucet, normalizujSlevu(slevaProcent)));
}
