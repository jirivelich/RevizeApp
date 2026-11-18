/** Model řádků položek dokladu (faktura, cenová nabídka) – viz PolozkyDokladu.tsx. */
import { spoctiCelkem, spoctiPolozku } from '../services/fakturaUtils';
import type { FakturaPolozka } from '../types';

export interface RadekState {
  key: number;
  popis: string;
  mnozstvi: string;
  jednotka: string;
  cena: string;
  /** Druh činnosti (výdajový paušál), '' = neurčeno */
  cinnost: string;
}

/** Číslo z textu (desetinná čárka i mezery jako oddělovač tisíců). */
export const toNumCz = (s: string): number => {
  const n = Number(String(s).replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : 0;
};

let radekCounter = 0;
export const novyRadek = (p?: Partial<RadekState>): RadekState => ({
  key: ++radekCounter, popis: '', mnozstvi: '1', jednotka: 'ks', cena: '0', cinnost: '', ...p,
});

/** Uložené položky → řádky formuláře (aspoň jeden prázdný). */
export function radkyZPolozek(polozky: Pick<FakturaPolozka, 'popis' | 'mnozstvi' | 'jednotka' | 'cenaZaJednotku' | 'cinnost'>[] | undefined): RadekState[] {
  return polozky && polozky.length
    ? polozky.map(p => novyRadek({
        popis: p.popis, mnozstvi: String(p.mnozstvi), jednotka: p.jednotka || '', cena: String(p.cenaZaJednotku), cinnost: p.cinnost || '',
      }))
    : [novyRadek()];
}

/** Řádky formuláře → položky k uložení (prázdné popisy vynechá). */
export function radkyNaPolozky(radky: RadekState[]): FakturaPolozka[] {
  return radky
    .filter(r => r.popis.trim())
    .map((r, i) => ({
      poradi: i + 1,
      popis: r.popis.trim(),
      mnozstvi: toNumCz(r.mnozstvi),
      jednotka: r.jednotka || undefined,
      cenaZaJednotku: toNumCz(r.cena),
      celkem: spoctiPolozku(toNumCz(r.mnozstvi), toNumCz(r.cena)),
      cinnost: r.cinnost || null,
    }));
}

/** Procentuální sleva z textu: 0–100, neplatná = 0. */
export const slevaZTextu = (s: string | number | null | undefined): number => {
  const n = toNumCz(String(s ?? ''));
  return n > 0 ? Math.min(n, 100) : 0;
};

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Rozpis dokladu: mezisoučet, částka slevy a celkem (stejně jako server). */
export function souhrnDokladu(mezisoucet: number, slevaProcent: string | number | null | undefined) {
  const procento = slevaZTextu(slevaProcent);
  const sleva = r2((mezisoucet * procento) / 100);
  return { mezisoucet: r2(mezisoucet), procento, sleva, celkem: r2(mezisoucet - sleva) };
}

/** Celkem za řádky (po případné slevě v %). */
export const celkemRadku = (radky: RadekState[], slevaProcent?: string | number): number =>
  souhrnDokladu(spoctiCelkem(radky.map(r => ({ mnozstvi: toNumCz(r.mnozstvi), cenaZaJednotku: toNumCz(r.cena) }))), slevaProcent).celkem;

