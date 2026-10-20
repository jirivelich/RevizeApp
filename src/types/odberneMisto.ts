// Datový model a výchozí hodnoty šablony "Odběrné místo (ČEZ)".
// Ukládá se jako JSON do Revize.odberneMistoData.

export type Vysledek = '' | 'V' | 'N' | 'NA';

export interface KontrolaPolozka {
  nazev: string;
  norma?: string;       // odkaz na článek normy / kapitolu Připojovacích podmínek
  vysledek: Vysledek;
  poznamka: string;
  editable?: boolean;   // volitelný řádek, který může uživatel přepsat
  skupina?: string;     // tematická skupina (nadpis v checklistu)
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
  jisticZkratovaSchopnost: string; // kA
  umisteniProstredi: '' | 'vnitrni' | 'venkovni' | 'venkovniKomunikace';
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

export const PPNN_ZDROJ = 'Připojovací podmínky nn, ČEZ Distribuce, a. s., platnost od 1. 9. 2025';

const k = (nazev: string, norma = ''): KontrolaPolozka => ({ nazev, norma, vysledek: '', poznamka: '' });
const kVolna = (skupina?: string): KontrolaPolozka => ({ nazev: '', norma: '', vysledek: '', poznamka: '', editable: true, skupina });
const g = (skupina: string, nazev: string, norma: string): KontrolaPolozka =>
  ({ nazev, norma, skupina, vysledek: '', poznamka: '' });

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

// Checklist podle Připojovacích podmínek nn ČEZ Distribuce (PPnn). Sloupec "norma" odkazuje na kapitolu PPnn.
// Položky jsou v aplikaci editovatelné – při vydání nových podmínek je lze upravit nebo obnovit.
export const DEFAULT_CHECKLIST: KontrolaPolozka[] = [
  g('Umístění a přístupnost', 'Rozváděč je trvale přístupný pracovníkům PDS (u RD na veřejně přístupném místě / hranici pozemku)', 'PPnn 3.1'),
  g('Umístění a přístupnost', 'Volný prostor před rozváděčem min. 800 × 800 mm, dvířka lze otevřít min. o 90°', 'PPnn 3.1'),
  g('Umístění a přístupnost', 'Rozváděč není ve společné skříni s plynoměrem, na rameni schodiště ani na sloupu PDS', 'PPnn 3.1'),
  g('Umístění a přístupnost', 'Instalační výšky dle tab. č. 1 (venku spodní hrana min. 600 mm, jističe a PEN min. 700 mm, zámek max. 1 700 mm, střed elektroměru 1 000–1 700 mm)', 'PPnn 3.1, tab. 1'),

  g('Rozváděč', 'Typově odzkoušený, prohlášení o shodě ES/EU a označení CE, zkratová odolnost min. 10 kA', 'PPnn 3.2.1'),
  g('Rozváděč', 'Krytí po zavření dveří: IP 2XC (vnitřní), IP 43 (venkovní), IP 44 (venkovní u komunikace); po otevření min. IP 20', 'PPnn 3.2.1'),
  g('Rozváděč', 'Dveře s typizovaným zámkem na trnový klíč 6 × 6 mm (průchozí min. 12 mm), bez zámku uživatele', 'PPnn 3.2.1'),
  g('Rozváděč', 'Kabelový prostor oddělen přepážkou, živé části měřeného rozvodu odděleny od prostoru elektroměru', 'PPnn 3.2.1'),
  g('Rozváděč', 'Minimální rozměry pro montáž měřicího zařízení (třífázový elektroměr 200 × 400 × 160 mm), upevnění ve třech bodech', 'PPnn 3.4, tab. 2'),
  g('Rozváděč', 'Štítek a schéma zapojení uvnitř rozváděče (u více než jednoho fakturačního měření)', 'PPnn 3.2.1'),
  g('Rozváděč', 'Provedení bez odnímatelného krytu (masky), případně jen ve výjimkách dle PPnn', 'PPnn 3.2.2'),

  g('Jištění a vypínače', 'Hlavní jistič před elektroměrem má stejný počet pólů jako elektroměr fází a zkratovou schopnost min. 10 kA', 'PPnn 3.4.1'),
  g('Jištění a vypínače', 'Charakteristika jističe B (C/D jen s kladným stanoviskem PDS), hodnota z řady proudů dle PPnn', 'PPnn 3.4.1'),
  g('Jištění a vypínače', 'Jistič ve svislé poloze, páčka v zapnuté poloze nahoře; označena proudová hodnota, charakteristika a zkratová schopnost', 'PPnn 3.4.1'),
  g('Jištění a vypínače', 'Hlavní jistič bez dálkového ovládání a signalizačních kontaktů, u 3f bez rozebíratelné propojky mezi póly', 'PPnn 3.4.1'),
  g('Jištění a vypínače', 'Jistič spínacího prvku (HDO): 2–6 A, min. 10 kA, charakteristika B nebo C, samostatný pro každý spínací prvek', 'PPnn 3.4.1'),
  g('Jištění a vypínače', 'Vypínač instalace na výstupu (nové / rekonstruované OM), označen „Vypínač instalace“, In není menší než u hlavního jističe', 'PPnn 3.4.3'),
  g('Jištění a vypínače', 'Jištění odbočky: min. o jeden stupeň výše než jistič před elektroměrem; odbočka delší než 3 m jištěna v místě odbočení a označena „Jištění odbočky“', 'PPnn 2.1, 2.3'),

  g('Vodiče a značení', 'Přívod v soustavě TN-C, vývod TN-C / TN-C-S; správný sled fází L1, L2, L3', 'PPnn 3.2'),
  g('Vodiče a značení', 'Fázové vodiče a N v přímém zapojení 6–16 mm² Cu, do 6 mm² plná jádra; stejné průřezy přívodních, resp. vývodních fází', 'PPnn 3.4.2, 3.5.2'),
  g('Vodiče a značení', 'Ovládací vodiče a vodiče napájení ovládacích prvků 1 nebo 1,5 mm² Cu', 'PPnn 3.5.2'),
  g('Vodiče a značení', 'Slaněné vodiče ukončeny nalisovanými dutinkami (silové s izolačním límcem, min. délka 18 mm), nepocínované', 'PPnn 3.4.2'),
  g('Vodiče a značení', 'Vodiče označeny L1P/L2P/L3P (přívod), L1/L2/L3 (vývod), N a ovládací dle tab. č. 3 (AKU, PV, TUV, EMO, ATC, TAR…)', 'PPnn 3.4.2, tab. 3'),
  g('Vodiče a značení', 'Svorkovnice PEN spojena s ochrannou svorkou oceloplechového rozváděče', 'PPnn 3.5.1'),

  g('Plombování', 'Zaplombovatelné: kryt svorkovnice elektroměru, kryt hlavního jističe, svorkovnice PEN', 'PPnn 3.9'),
  g('Plombování', 'Zaplombovatelné: kryt svorkovnice a jistič spínacího prvku, vypínač instalace, kryty neměřených částí rozváděče', 'PPnn 3.9'),
  g('Plombování', 'Porušení plomb nezbytné pro revizi bylo předem nahlášeno PDS (Digitální komunikační kanál – „Rozplombování elektroměru“)', 'PPnn 3.9'),

  g('Přepěťové ochrany', 'SPD umístěny přednostně v měřené části; v neměřené části pouze typ T1 s plombovatelným krytem', 'PPnn 2.4'),
  g('Přepěťové ochrany', 'V rozváděči je trvale přístupné jednopólové schéma (SPD v neměřené části, MTP, Total/Central Stop)', 'PPnn 2.4–2.6'),

  g('Označení a podružná měření', 'Trvanlivé označení odběrného místa (č. parcelní/popisné, u více OM číslo); shodně dveře, elektroměr a jističe', 'PPnn 3.4'),
  g('Označení a podružná měření', 'Podružné elektroměry za fakturačním, označené „Podružný elektroměr“; v neměřené části jen povolené prvky', 'PPnn 3.4'),
  g('Označení a podružná měření', 'Neměřený odběr (je-li): jistič max. 6 A, charakteristika B, min. 10 kA, štítek „Neměřený odběr“ s účelem', 'PPnn 3.7.2'),

  g('Výrobna / akumulace (pokud je připojena)', 'Přijímač HDO pro omezování výkonu napájen přímo z DS (pod napětím i po odpojení výrobny) přes jistič 2–6 A', 'PPnn 4.1.5'),
  g('Výrobna / akumulace (pokud je připojena)', 'V blízkosti přijímače HDO je výstražná tabulka „Pozor zpětný proud“', 'PPnn 4.1.5'),
  g('Výrobna / akumulace (pokud je připojena)', 'Jednofázové připojení: instalovaný výkon max. 3,7 kVA na fázi', 'PPnn 4.1.7'),
  g('Výrobna / akumulace (pokud je připojena)', 'K žádosti o trvalý provoz: zpráva o výchozí revizi, protokol o nastavení ochran, instalační dokument', 'PPnn 4.1.9'),

  g('Dokumentace', 'Prohlášení o shodě rozváděče, schéma skutečného provedení, smlouva / souhlas s připojením', ''),
  kVolna('Dokumentace'),
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
    jisticZkratovaSchopnost: '', umisteniProstredi: '',
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

// ── Automatické kontroly hodnot dle PPnn ──

/** Řada jmenovitých proudů hlavního jističe před elektroměrem (PPnn 3.4.1). */
export const RADA_JISTICU = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 300, 315, 320, 400, 500, 630, 800, 1000];

const num = (v: string) => parseFloat((v || '').replace(',', '.'));

/** Vrátí seznam upozornění, kde zadané parametry odporují Připojovacím podmínkám nn. */
export function validujParametry(d: OdberneMistoData): string[] {
  const w: string[] = [];
  const proud = num(d.jisticProud);
  const maProud = isFinite(proud);

  if (maProud && !RADA_JISTICU.includes(proud)) {
    w.push(`Jmenovitý proud hlavního jističe ${proud} A není v řadě dle PPnn (kap. 3.4.1).`);
  }
  if (maProud && d.zpusobMereni === 'prime' && proud > 80) {
    w.push('Přímé měření je přípustné do 80 A včetně; nad 80 A se použije nepřímé měření s MTP (PPnn 3.5.1, 3.6).');
  }
  if (maProud && d.zpusobMereni === 'neprime' && proud <= 80) {
    w.push('Nepřímé měření s MTP se používá nad 80 A; do 80 A je určeno přímé měření (PPnn 3.5.1, 3.6).');
  }
  if (maProud && d.pocetFazi === '1' && proud > 25) {
    w.push('Jednofázový odběr: maximální přípustná hodnota hlavního jističe je 25 A (PPnn 3.4.1).');
  }
  const icn = num(d.jisticZkratovaSchopnost);
  if (isFinite(icn) && icn < 10) {
    w.push(`Zkratová schopnost hlavního jističe ${icn} kA je nižší než požadovaných 10 kA (PPnn 3.4.1).`);
  }
  const ch = d.jisticCharakteristika.trim().toUpperCase();
  if (ch && ch !== 'B') {
    w.push(`Charakteristika ${ch} vyžaduje kladné stanovisko PDS; standardně se používá B (PPnn 3.4.1).`);
  }
  const ip = /IP\s*([0-9X])([0-9X])/i.exec(d.rozvadecIp || '');
  if (ip && d.umisteniProstredi) {
    const a = ip[1].toUpperCase() === 'X' ? NaN : parseInt(ip[1], 10);
    const b = ip[2].toUpperCase() === 'X' ? NaN : parseInt(ip[2], 10);
    if (d.umisteniProstredi === 'vnitrni' && isFinite(a) && a < 2) {
      w.push(`Krytí ${d.rozvadecIp} nevyhovuje pro vnitřní prostor (min. IP 2XC, PPnn 3.2.1).`);
    }
    if (d.umisteniProstredi === 'venkovni' && ((isFinite(a) && a < 4) || (isFinite(b) && b < 3))) {
      w.push(`Krytí ${d.rozvadecIp} nevyhovuje pro venkovní prostor (min. IP 43, PPnn 3.2.1).`);
    }
    if (d.umisteniProstredi === 'venkovniKomunikace' && ((isFinite(a) && a < 4) || (isFinite(b) && b < 4))) {
      w.push(`Krytí ${d.rozvadecIp} nevyhovuje pro umístění u komunikace (min. IP 44, PPnn 3.2.1).`);
    }
  }
  if (porovnejJistic(d) === 'neshoda') {
    w.push(`Osazený hlavní jistič (${d.jisticProud} A) neodpovídá hodnotě ve smlouvě (${d.smlouvaJistic} A).`);
  }
  return w;
}
