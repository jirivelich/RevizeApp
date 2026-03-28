/** Datové typy pro protokol ověření strojního zařízení */

export interface StrojniFormData {
  // Číslo protokolu
  cisloProtokolu: string;

  // 01 – Revizní technik
  rtJmeno: string;
  rtOpravneni: string;
  rtOsvedceni: string;
  rtAdresa: string;
  rtTel: string;
  rtEmail: string;

  // 02 – Objednatel
  objNazev: string;
  objIco: string;
  objAdresa: string;
  objKontakt: string;
  objTel: string;

  // 03 – Místo ověření
  mistoAdresa: string;
  mistoDatum: string;
  mistoZakazka: string;
  mistoHala: string;

  // 04 – Identifikace stroje
  strojNazev: string;
  strojSn: string;
  strojVyrobce: string;
  strojRok: string;
  strojNapajeni: string;
  strojPrikon: string;
  strojProud: string;
  strojIp: string;
  strojTrida: string;
  strojCe: string;

  // 05 – Jištění
  jisteni: JisteniRow[];

  // 06 – Izolační odpor
  izolace: IzolaceRow[];

  // 07 – Spojitost PE
  spojitost: SpojitostRow[];

  // 08 – RCD
  rcd: RcdRow[];

  // 09 – Funkční kontroly
  kontroly: KontrolaRow[];

  // 10 – Měřicí přístroje
  pristroje: PristrojRow[];

  // 11 – Posudek
  verdikt: 'pass' | 'fail' | '';
  posudekZavady: string;
  posudekDoporuceni: string;
  posudekNormy: string;
}

export interface JisteniRow {
  nazev: string;
  typ: string;
  hodnota: string;
  charakteristika: string;
  stav: 'V' | 'N' | 'NA' | '';
  poznamka: string;
}

export interface IzolaceRow {
  misto: string;
  napeti: string;
  hodnota: string;
  pozadavek: string;
  vysledek: 'V' | 'N' | 'NA' | '';
  poznamka: string;
}

export interface SpojitostRow {
  misto: string;
  proud: string;
  hodnota: string;
  pozadavek: string;
  vysledek: 'V' | 'N' | 'NA' | '';
  poznamka: string;
}

export interface RcdRow {
  nazev: string;
  idn: string;
  typ: string;
  cas: string;
  limit: string;
  vysledek: 'V' | 'N' | 'NA' | '';
  poznamka: string;
}

export interface KontrolaRow {
  nazev: string;
  vysledek: 'V' | 'N' | 'NA' | '';
  poznamka: string;
  editable: boolean; // true pro "Jiné:"
}

export interface PristrojRow {
  typ: string;
  sn: string;
  kalibrace: string;
  trida: string;
  poznamka: string;
}

// ── Výchozí data ──

export const DEFAULT_JISTENI: JisteniRow[] = [
  { nazev: 'Hlavní jistič', typ: '', hodnota: '', charakteristika: '', stav: '', poznamka: '' },
  { nazev: 'Motorový spouštěč', typ: '', hodnota: '', charakteristika: '', stav: '', poznamka: '' },
  { nazev: 'Proudový chránič (RCD)', typ: '', hodnota: '', charakteristika: '', stav: '', poznamka: '' },
  { nazev: 'Přepěťová ochrana (SPD)', typ: '', hodnota: '', charakteristika: '', stav: '', poznamka: '' },
  { nazev: 'Jiné:', typ: '', hodnota: '', charakteristika: '', stav: '', poznamka: '' },
];

export const DEFAULT_IZOLACE: IzolaceRow[] = [
  { misto: 'L1, L2, L3 → PE (napájení)', napeti: '500 V DC', hodnota: '', pozadavek: '≥ 1 MΩ', vysledek: '', poznamka: '' },
  { misto: 'Řídicí obvody → PE', napeti: '250 V DC', hodnota: '', pozadavek: '≥ 1 MΩ', vysledek: '', poznamka: '' },
  { misto: 'Bezpečnostní obvody → PE', napeti: '250 V DC', hodnota: '', pozadavek: '≥ 1 MΩ', vysledek: '', poznamka: '' },
  { misto: 'Topné obvody → PE', napeti: '500 V DC', hodnota: '', pozadavek: '≥ 1 MΩ', vysledek: '', poznamka: '' },
  { misto: 'Jiné:', napeti: '', hodnota: '', pozadavek: '', vysledek: '', poznamka: '' },
];

export const DEFAULT_SPOJITOST: SpojitostRow[] = [
  { misto: 'Rozvaděč → kostra stroje', proud: '≥ 200 mA', hodnota: '', pozadavek: '≤ 0,1 Ω', vysledek: '', poznamka: '' },
  { misto: 'Kostra → pohyblivé části', proud: '≥ 200 mA', hodnota: '', pozadavek: '≤ 0,1 Ω', vysledek: '', poznamka: '' },
  { misto: 'Kostra → kryt motoru', proud: '≥ 200 mA', hodnota: '', pozadavek: '≤ 0,1 Ω', vysledek: '', poznamka: '' },
  { misto: 'Jiné:', proud: '', hodnota: '', pozadavek: '', vysledek: '', poznamka: '' },
];

export const DEFAULT_RCD: RcdRow[] = [
  { nazev: 'RCD 1', idn: '30', typ: '', cas: '', limit: '≤ 300', vysledek: '', poznamka: '' },
  { nazev: 'RCD 2', idn: '30', typ: '', cas: '', limit: '≤ 300', vysledek: '', poznamka: '' },
  { nazev: 'RCD 3', idn: '30', typ: '', cas: '', limit: '≤ 300', vysledek: '', poznamka: '' },
];

export const KONTROLY_LABELS = [
  'STOP tlačítko – nouzové zastavení (Emergency Stop)',
  'STOP tlačítko – provozní zastavení',
  'START tlačítko – funkce a označení',
  'Bezpečnostní relé / modul',
  'Bezpečnostní kryt / dveřní spínač (interlocking)',
  'Světelná závora / bezpečnostní mat',
  'Ovládací panel – označení a čitelnost prvků',
  'Signalizace provozních stavů (indikátory)',
  'Nouzové osvětlení (pokud je součástí stroje)',
  'Uzemňovací svorka stroje – přítomnost a stav',
  'Označení vodičů a svorek',
  'Stav kabelových průchodek a vývodnic',
  'Krytí rozvaděče / el. zařízení (IP)',
  'Jiné:',
];

export const DEFAULT_KONTROLY: KontrolaRow[] = KONTROLY_LABELS.map((label, i) => ({
  nazev: label,
  vysledek: '' as const,
  poznamka: '',
  editable: i === KONTROLY_LABELS.length - 1,
}));

export const DEFAULT_PRISTROJE: PristrojRow[] = [
  { typ: '', sn: '', kalibrace: '', trida: '', poznamka: '' },
  { typ: '', sn: '', kalibrace: '', trida: '', poznamka: '' },
  { typ: '', sn: '', kalibrace: '', trida: '', poznamka: '' },
];

export function createDefaultFormData(): StrojniFormData {
  return {
    cisloProtokolu: '',
    rtJmeno: '',
    rtOpravneni: '',
    rtOsvedceni: '',
    rtAdresa: '',
    rtTel: '',
    rtEmail: '',
    objNazev: '',
    objIco: '',
    objAdresa: '',
    objKontakt: '',
    objTel: '',
    mistoAdresa: '',
    mistoDatum: new Date().toISOString().split('T')[0],
    mistoZakazka: '',
    mistoHala: '',
    strojNazev: '',
    strojSn: '',
    strojVyrobce: '',
    strojRok: '',
    strojNapajeni: '',
    strojPrikon: '',
    strojProud: '',
    strojIp: '',
    strojTrida: '',
    strojCe: '',
    jisteni: DEFAULT_JISTENI.map(r => ({ ...r })),
    izolace: DEFAULT_IZOLACE.map(r => ({ ...r })),
    spojitost: DEFAULT_SPOJITOST.map(r => ({ ...r })),
    rcd: DEFAULT_RCD.map(r => ({ ...r })),
    kontroly: DEFAULT_KONTROLY.map(r => ({ ...r })),
    pristroje: DEFAULT_PRISTROJE.map(r => ({ ...r })),
    verdikt: '',
    posudekZavady: '',
    posudekDoporuceni: '',
    posudekNormy: 'ČSN EN 60204-1, zákon č. 250/2021 Sb.',
  };
}
