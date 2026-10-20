/** Čistá logika fakturace (bez DB) – testovatelná samostatně. */

export type FakturaStav = 'koncept' | 'vystavena' | 'zaplacena' | 'storno';

export interface PolozkaInput {
  popis?: string;
  mnozstvi?: number | string | null;
  jednotka?: string;
  cenaZaJednotku?: number | string | null;
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
