/**
 * Druhy činnosti pro výdajový paušál – stejné kódy jako server (server/faktura-utils.ts)
 * a fakturace jv-revize.cz. Sazba = procento výdajového paušálu.
 */
export const DRUHY_CINNOSTI = {
  REV: { nazev: 'Revize a zkoušky elektro', sazba: 80 },
  ELE: { nazev: 'Montáže a opravy elektro', sazba: 80 },
  OPR: { nazev: 'Opravy elektrických přístrojů', sazba: 80 },
  POR: { nazev: 'Technické poradenství', sazba: 60 },
  MER: { nazev: 'Samostatné technické měření', sazba: 60 },
  SKO: { nazev: 'Odborná školení', sazba: 60 },
  SW: { nazev: 'Vývoj software', sazba: 60 },
} as const;

export type KodCinnosti = keyof typeof DRUHY_CINNOSTI;

/** Volby pro <Select>: „—“ + všechny druhy činnosti se sazbou. */
export const CINNOST_OPTIONS = [
  { value: '', label: '— neurčeno —' },
  ...(Object.keys(DRUHY_CINNOSTI) as KodCinnosti[]).map(k => ({
    value: k,
    label: `${DRUHY_CINNOSTI[k].nazev} (${DRUHY_CINNOSTI[k].sazba} %)`,
  })),
];

export const nazevCinnosti = (kod?: string | null): string =>
  kod && kod in DRUHY_CINNOSTI ? DRUHY_CINNOSTI[kod as KodCinnosti].nazev : '';

/** Bez kategorie – název skupiny pro položky ceníku bez kategorie. */
export const BEZ_KATEGORIE = 'Bez kategorie';

/** Seskupí položky podle kategorie (abecedně, „Bez kategorie“ na konci). */
export function seskupitPodleKategorie<T extends { kategorie?: string | null }>(polozky: T[]): [string, T[]][] {
  const mapa = new Map<string, T[]>();
  for (const p of polozky) {
    const k = p.kategorie?.trim() || BEZ_KATEGORIE;
    mapa.set(k, [...(mapa.get(k) || []), p]);
  }
  return [...mapa.entries()].sort(([a], [b]) =>
    a === BEZ_KATEGORIE ? 1 : b === BEZ_KATEGORIE ? -1 : a.localeCompare(b, 'cs'));
}
