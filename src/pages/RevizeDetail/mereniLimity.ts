/**
 * Vyhodnocení naměřených hodnot okruhů a proudových chráničů vůči limitům.
 *
 * - Izolační odpor: R_iso ≥ 1 MΩ (ČSN 33 2000-6, obvody do 500 V).
 * - Impedance smyčky: Z_s ≤ U0 / Ia, kde Ia je proud zaručující samočinné odpojení
 *   (charakteristika B = 5×In, C = 10×In, D = 20×In), U0 = 230 V.
 * - Proudový chránič: IΔ v rozmezí 0,5–1×IΔn, tA při 1×IΔn ≤ 300 ms (selektivní ≤ 500 ms),
 *   tA při 5×IΔn ≤ 40 ms (selektivní ≤ 150 ms), dotykové napětí Uc ≤ 50 V.
 */
import type { Okruh, Chranic } from '../../types';

export const U0 = 230;
export const RISO_MIN = 1;

export type StavMereni = 'nezmereno' | 'ok' | 'limit' | 'fail';

/** Převede textovou hodnotu měření ("0,86", "max. 1,2", ">200", "200 MΩ") na číslo. */
export function parseMereni(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const m = value.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

const NASOBEK_IA: Record<string, number> = { B: 5, C: 10, D: 20 };

/** Maximální impedance smyčky pro daný jistič, nebo null pokud ji nelze určit (pojistky, neznámý typ). */
export function zsMax(jisticTyp: string | undefined, jisticProud: string | undefined): number | null {
  const nasobek = NASOBEK_IA[(jisticTyp || '').trim().toUpperCase()];
  const proud = parseMereni(jisticProud);
  if (!nasobek || !proud || proud <= 0) return null;
  return U0 / (nasobek * proud);
}

export interface VyhodnoceniOkruhu {
  stav: StavMereni;
  riso: number | null;
  /** true = R_iso zadán a vyhovuje (i zápis typu ">200"). */
  risoOk: boolean | null;
  zs: number | null;
  zsMax: number | null;
  /** Poměr Zs / Zs max (0–∞), null když nelze spočítat. */
  zsPomer: number | null;
}

export function vyhodnotOkruh(o: Pick<Okruh, 'izolacniOdpor' | 'impedanceSmycky' | 'jisticTyp' | 'jisticProud'>): VyhodnoceniOkruhu {
  const riso = parseMereni(o.izolacniOdpor);
  const zs = parseMereni(o.impedanceSmycky);
  const max = zsMax(o.jisticTyp, o.jisticProud);
  const risoOk = riso === null ? null : riso >= RISO_MIN;
  const zsPomer = zs !== null && max ? zs / max : null;

  let stav: StavMereni;
  if (riso === null && zs === null) stav = 'nezmereno';
  else if (risoOk === false || (zsPomer !== null && zsPomer > 1)) stav = 'fail';
  else if (riso === null || zs === null) stav = 'nezmereno';
  else if (zsPomer !== null && zsPomer > 0.8) stav = 'limit';
  else stav = 'ok';

  return { stav, riso, risoOk, zs, zsMax: max, zsPomer };
}

export interface HodnotaChranice {
  klic: string;
  label: string;
  hodnota: number | null;
  jednotka: string;
  limit: string;
  ok: boolean | null;
}

export interface VyhodnoceniChranice {
  stav: StavMereni;
  hodnoty: HodnotaChranice[];
  chybi: number;
}

export function vyhodnotChranic(c: Chranic): VyhodnoceniChranice {
  const idn = c.citlivostMa || 30;
  const selektivni = !!c.selektivita || /^(S|G)$/i.test(c.typ || '');
  const max1x = selektivni ? 500 : 300;
  const max5x = selektivni ? 150 : 40;
  const check = (v: number | undefined | null, f: (n: number) => boolean) => (v === undefined || v === null ? null : f(v));

  const hodnoty: HodnotaChranice[] = [
    { klic: 'id', label: 'IΔ', hodnota: c.vybavovacProud ?? null, jednotka: 'mA', limit: `${idn / 2}–${idn}`, ok: check(c.vybavovacProud, n => n >= idn / 2 && n <= idn) },
    { klic: 't1', label: 'tA 1×IΔn', hodnota: c.casOdpojeni1x ?? null, jednotka: 'ms', limit: `≤ ${max1x}`, ok: check(c.casOdpojeni1x, n => n <= max1x) },
  ];
  if (c.typ === 'F') {
    hodnoty.push({ klic: 't2', label: 'tA 2×IΔn', hodnota: c.casOdpojeni2x ?? null, jednotka: 'ms', limit: `≤ ${selektivni ? 200 : 150}`, ok: check(c.casOdpojeni2x, n => n <= (selektivni ? 200 : 150)) });
  } else {
    hodnoty.push({ klic: 't5', label: 'tA 5×IΔn', hodnota: c.casOdpojeni5x ?? null, jednotka: 'ms', limit: `≤ ${max5x}`, ok: check(c.casOdpojeni5x, n => n <= max5x) });
  }
  hodnoty.push({ klic: 'uc', label: 'Uc', hodnota: c.dotykoveNapeti ?? null, jednotka: 'V', limit: '≤ 50', ok: check(c.dotykoveNapeti, n => n <= 50) });

  const chybi = hodnoty.filter(h => h.hodnota === null).length;
  let stav: StavMereni;
  if (hodnoty.some(h => h.ok === false)) stav = 'fail';
  else if (chybi === hodnoty.length) stav = 'nezmereno';
  else if (chybi > 0) stav = 'limit';
  else stav = 'ok';
  return { stav, hodnoty, chybi };
}

/** Formát čísla s desetinnou čárkou. */
export function fmtCislo(n: number | null, desetin = 2): string {
  if (n === null) return '—';
  return n.toFixed(desetin).replace('.', ',');
}
