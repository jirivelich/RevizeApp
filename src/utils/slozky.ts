/**
 * Složky revizí – seskupení v seznamu revizí podle objednatele → složky (hala, projekt…).
 *
 * Složka je volný text na revizi (`revize.slozka`). U strojních zařízení, která složku
 * nemají vyplněnou, se jako náhrada použije „Hala / pracoviště“ z protokolu stroje.
 */
import type { Revize } from '../types';

export const BEZ_SLOZKY = 'Bez složky';
export const BEZ_OBJEDNATELE = 'Bez objednatele';

const halaZeStrojnichDat = (r: Pick<Revize, 'strojniData'>): string => {
  if (!r.strojniData) return '';
  try {
    const d = JSON.parse(r.strojniData) as { mistoHala?: unknown };
    return typeof d.mistoHala === 'string' ? d.mistoHala.trim() : '';
  } catch {
    return '';
  }
};

/** Název složky revize (prázdný řetězec = bez složky). */
export function slozkaRevize(r: Pick<Revize, 'slozka' | 'strojniData'>): string {
  return (r.slozka ?? '').trim() || halaZeStrojnichDat(r);
}

/** Klíč objednatele pro seskupení (porovnává bez ohledu na velikost písmen a mezery). */
const klic = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('cs');

export const jeHotova = (r: Pick<Revize, 'stav'>) => r.stav === 'dokončeno' || r.stav === 'schváleno';

export interface SkupinaSlozka {
  key: string;
  nazev: string;          // '' = bez složky
  revize: Revize[];
  hotovo: number;
}

export interface SkupinaObjednatel {
  key: string;
  nazev: string;
  slozky: SkupinaSlozka[];
  pocet: number;
  hotovo: number;
}

/**
 * Seskupí revize podle objednatele a v něm podle složky.
 * Pořadí revizí uvnitř složky zůstává podle vstupu (tj. podle zvoleného řazení).
 * Objednatelé i složky jsou abecedně, „Bez složky“ je u objednatele vždy poslední.
 */
export function seskupRevize(revize: Revize[]): SkupinaObjednatel[] {
  const objednatele = new Map<string, SkupinaObjednatel & { mapa: Map<string, SkupinaSlozka> }>();

  for (const r of revize) {
    const objNazev = (r.objednatel ?? '').trim() || BEZ_OBJEDNATELE;
    const objKey = klic(objNazev);
    let obj = objednatele.get(objKey);
    if (!obj) {
      obj = { key: objKey, nazev: objNazev, slozky: [], pocet: 0, hotovo: 0, mapa: new Map() };
      objednatele.set(objKey, obj);
    }
    const sNazev = slozkaRevize(r);
    const sKey = klic(sNazev);
    let sl = obj.mapa.get(sKey);
    if (!sl) {
      sl = { key: `${objKey}::${sKey}`, nazev: sNazev, revize: [], hotovo: 0 };
      obj.mapa.set(sKey, sl);
    }
    sl.revize.push(r);
    obj.pocet++;
    if (jeHotova(r)) { sl.hotovo++; obj.hotovo++; }
  }

  const cmp = (a: string, b: string) => a.localeCompare(b, 'cs', { numeric: true });
  return [...objednatele.values()]
    .map(({ mapa, ...o }) => ({
      ...o,
      slozky: [...mapa.values()].sort((a, b) =>
        a.nazev === '' ? 1 : b.nazev === '' ? -1 : cmp(a.nazev, b.nazev)),
    }))
    .sort((a, b) =>
      a.nazev === BEZ_OBJEDNATELE ? 1 : b.nazev === BEZ_OBJEDNATELE ? -1 : cmp(a.nazev, b.nazev));
}

/**
 * Existující složky pro našeptávání. Když je zadaný objednatel, jsou jeho složky první.
 */
export function navrhySlozek(revize: Revize[], objednatel?: string): string[] {
  const objKey = objednatel ? klic(objednatel) : '';
  const vlastni = new Map<string, string>();
  const ostatni = new Map<string, string>();
  for (const r of revize) {
    const s = slozkaRevize(r);
    if (!s) continue;
    const cil = objKey && klic(r.objednatel ?? '') === objKey ? vlastni : ostatni;
    if (!cil.has(klic(s))) cil.set(klic(s), s);
  }
  const cmp = (a: string, b: string) => a.localeCompare(b, 'cs', { numeric: true });
  const v = [...vlastni.values()].sort(cmp);
  const o = [...ostatni.values()].filter(s => !vlastni.has(klic(s))).sort(cmp);
  return [...v, ...o];
}
