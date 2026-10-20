// Datový model a výchozí hodnoty šablony "Odběrné místo (ČEZ)".
// Ukládá se jako JSON do Revize.odberneMistoData.

export type Vysledek = '' | 'V' | 'N' | 'NA';

export interface KontrolaPolozka {
  nazev: string;
  norma?: string;       // odkaz na článek normy / podmínek (volný text)
  vysledek: Vysledek;
  poznamka: string;
  editable?: boolean;   // volitelný řádek, který může uživatel přepsat
}

export interface MereniObvodu {
  oznaceni: string;     // označení obvodu
  jisteni: string;      // jistič: In / charakteristika / výrobce
  typKabelu: string;    // typ a průřez kabelu
  zs: string;           // impedance smyčky Zs (Ω)
  u: string;            // napětí U (V)
  i: string;            // proud I (A)
  ta: string;           // čas odpojení ta (ms)
  idn: string;          // IΔn (mA)
  riz: string;          // izolační odpor (MΩ)
  vysledek: Vysledek;
}

export interface OdberneMistoData {
  // Identifikace odběrného místa
  distributor: string;
  ean: string;
  cisloElektromeru: string;
  parcela: string;
  typPripojeni: '' | 'kabel' | 'vzdusne' | 'jine';
  umisteniRozvadece: string;

  // Technické parametry
  soustava: string;
  zpusobMereni: '' | 'prime' | 'neprime';
  jisticTyp: string;
  jisticProud: string;           // A (osazeno)
  jisticCharakteristika: string;
  pocetFazi: '' | '1' | '3';
  plombovani: '' | 'ano' | 'ne';
  rozvadecVyrobce: string;
  rozvadecTyp: string;
  rozvadecIp: string;
  rozvadecTrida: string;
  rozvadecProhlaseni: string;

  // Smlouva a tarif
  smlouvaCislo: string;
  smlouvaDatum: string;
  smlouvaPlatnost: string;
  smlouvaTypOdberu: '' | 'novy' | 'zmena' | 'rozsireni';
  smlouvaUcel: string;
  smlouvaPrikon: string;         // kW
  smlouvaJistic: string;         // A (dle smlouvy)
  tarif: string;
  hdoKod: string;
  smlouvaPoznamka: string;

  // Prohlídka, zkoušení, checklist, měření
  prohlidka: KontrolaPolozka[];
  zkouseni: KontrolaPolozka[];
  checklist: KontrolaPolozka[];
  mereni: MereniObvodu[];
  napetiU0: string;
  prechodovyOdpor: string;
}

export const TARIFY_DISTRIBUCE = [
  'D01d', 'D02d', 'D25d', 'D26d', 'D27d', 'D35d', 'D45d', 'D55d', 'D56d', 'D57d',
  'C01d', 'C02d', 'C03d', 'C25d', 'C26d', 'C27d', 'C35d', 'C45d', 'C55d', 'C56d', 'C62d',
];

const k = (nazev: string, norma = ''): KontrolaPolozka => ({ nazev, norma, vysledek: '', poznamka: '' });
const kVolna = (): KontrolaPolozka => ({ nazev: '', norma: '', vysledek: '', poznamka: '', editable: true });

// Prohlídka – dle struktury vzorové zprávy OM (kap. 4)
export const DEFAULT_PROHLIDKA: KontrolaPolozka[] = [
  k('Ochrana základní izolací živých částí', 'ČSN 33 2000-4-41 příl. A čl. A.1'),
  k('Ochrana kryty nebo přepážkami (IP kód odpovídá vnějším vlivům)', 'ČSN 33 2000-4-41 příl. A čl. A.2'),
  k('Volba vodičů s ohledem na proudovou zatížitelnost a úbytek napětí', 'ČSN 33 2000-4-43, ČSN 33 2000-5-52'),
  k('Odpovídající způsob spojování vodičů', 'ČSN 33 2000-5-52 čl. 526'),
  k('Označení vodičů, svorek a obvodů', ''),
  kVolna(),
];

// Zkoušení – dle struktury vzorové zprávy OM (kap. 5)
export const DEFAULT_ZKOUSENI: KontrolaPolozka[] = [
  k('Spojitost ochranných vodičů, hlavního a doplňujícího pospojování a kontrola uzemnění', 'ČSN 33 2000-6 čl. 61.3.2'),
  k('Izolační odpor elektrické instalace', 'ČSN 33 2000-6 čl. 61.3.3'),
  k('Automatické odpojení od zdroje', 'ČSN 33 2000-6 čl. 61.3.6.1'),
  k('Zkouška zapojení přístrojů', 'ČSN 33 2000-6 čl. 61.3.8'),
  k('Kontrola sledu fází', 'ČSN 33 2000-6 čl. 61.3.9'),
  k('Funkční a provozní zkouška', 'ČSN 33 2000-6 čl. 61.3.10'),
  k('Ověření úbytků napětí', 'ČSN 33 2000-6 čl. 61.3.11'),
];

// Checklist dle připojovacích podmínek distributora.
// Znění je záměrně obecné a v UI editovatelné – přesné požadavky je nutné ověřit
// v aktuálních dokumentech ČEZ Distribuce (podmínky připojení, technické podmínky).
export const DEFAULT_CHECKLIST: KontrolaPolozka[] = [
  k('Umístění: skříň je veřejně přístupná, na hranici pozemku / objektu, volný přístup distributora'),
  k('Ochranný prostor před skříní a výška osy elektroměru odpovídají požadavkům distributora'),
  k('Typ a krytí skříně (IP, odolnost proti UV / povětrnosti, uzamykání) odpovídá požadavkům distributora'),
  k('Hlavní jistič před elektroměrem je plombovatelný a odpovídá hodnotě ve smlouvě'),
  k('Elektroměrová část je plombovatelná, svorky elektroměru jsou chráněny proti dotyku'),
  k('Kabely: typ a průřez odpovídají jištění, vodiče jsou označené a správně ukončené'),
  k('PEN / PE: nepřerušený vodič PEN, správné místo rozdělení PEN na PE a N (TN-C-S)'),
  k('Uzemnění a pospojování: hlavní uzemňovací svorka, připojení na zemnič, hlavní pospojování'),
  k('Označení: štítek odběrného místa (EAN), popis okruhů, výstražné značky'),
  k('Přepěťová ochrana (SPD) – pokud je požadována'),
  k('Výrobna / FVE / akumulace (pokud jsou připojeny): samostatné měření, ochrany, zpětné toky'),
  k('Doklady: prohlášení o shodě rozvaděče, projekt / schéma skutečného provedení, souhlas s připojením'),
  kVolna(),
];

export const DEFAULT_MERENI: MereniObvodu[] = [
  { oznaceni: '', jisteni: '', typKabelu: '', zs: '', u: '', i: '', ta: '', idn: '', riz: '', vysledek: '' },
  { oznaceni: '', jisteni: '', typKabelu: '', zs: '', u: '', i: '', ta: '', idn: '', riz: '', vysledek: '' },
];

export function createDefaultOdberneMisto(): OdberneMistoData {
  return {
    distributor: 'ČEZ Distribuce, a. s.',
    ean: '', cisloElektromeru: '', parcela: '', typPripojeni: '', umisteniRozvadece: '',
    soustava: '', zpusobMereni: '', jisticTyp: '', jisticProud: '', jisticCharakteristika: '',
    pocetFazi: '', plombovani: '',
    rozvadecVyrobce: '', rozvadecTyp: '', rozvadecIp: '', rozvadecTrida: '', rozvadecProhlaseni: '',
    smlouvaCislo: '', smlouvaDatum: '', smlouvaPlatnost: '', smlouvaTypOdberu: '', smlouvaUcel: '',
    smlouvaPrikon: '', smlouvaJistic: '', tarif: '', hdoKod: '', smlouvaPoznamka: '',
    prohlidka: DEFAULT_PROHLIDKA.map(r => ({ ...r })),
    zkouseni: DEFAULT_ZKOUSENI.map(r => ({ ...r })),
    checklist: DEFAULT_CHECKLIST.map(r => ({ ...r })),
    mereni: DEFAULT_MERENI.map(r => ({ ...r })),
    napetiU0: '', prechodovyOdpor: '',
  };
}

/** Bezpečně načte JSON z Revize.odberneMistoData a doplní výchozí hodnoty. */
export function parseOdberneMisto(json?: string | null): OdberneMistoData {
  const d = createDefaultOdberneMisto();
  if (json) {
    try { Object.assign(d, JSON.parse(json)); } catch { /* poškozený JSON → výchozí */ }
  }
  return d;
}

export type ShodaSmlouvy = 'shoda' | 'neshoda' | 'neurceno';

/** Porovná hodnotu hlavního jističe osazenou v rozvaděči s hodnotou dle smlouvy. */
export function porovnejJistic(d: Pick<OdberneMistoData, 'jisticProud' | 'smlouvaJistic'>): ShodaSmlouvy {
  const a = parseFloat(d.jisticProud.replace(',', '.'));
  const b = parseFloat(d.smlouvaJistic.replace(',', '.'));
  if (!isFinite(a) || !isFinite(b)) return 'neurceno';
  return a === b ? 'shoda' : 'neshoda';
}

export const STAV_LABEL: Record<Vysledek, string> = {
  V: 'Vyhovuje', N: 'NEVYHOVUJE', NA: 'N/A', '': '—',
};
