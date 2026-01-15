// Základní typy pro RevizeApp

// Kategorie revize - typ kontrolovaného zařízení
export type KategorieRevize = 'elektro' | 'hromosvod' | 'stroje';

export interface Zakaznik {
  id?: number;
  nazev: string;
  adresa?: string;
  ico?: string;
  dic?: string;
  kontaktOsoba?: string;
  telefon?: string;
  email?: string;
  poznamka?: string;
  pocetRevizi?: number; // Počítané pole - kolik má revizí
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Revize {
  id?: number;
  cisloRevize: string;
  nazev: string;
  adresa: string;
  objednatel: string;
  zakaznikId?: number; // Vazba na zákazníka
  kategorieRevize: KategorieRevize; // elektro / hromosvod / stroje
  datum: string;
  datumDokonceni?: string;
  datumPlatnosti?: string;
  termin: number; // počet měsíců platnosti
  datumVypracovani?: string;
  typRevize: 'pravidelná' | 'výchozí' | 'mimořádná';
  duvodMimoradne?: string; // e) Důvod mimořádné revize
  stav: 'rozpracováno' | 'dokončeno' | 'schváleno';
  poznamka?: string;
  vysledek?: 'schopno' | 'neschopno' | 'podmíněně schopno';
  vysledekOduvodneni?: string; // l) Odůvodnění pokud není schopno provozu
  zaver?: string; // Závěr/shrnutí revize
  
  // 1. Vymezení rozsahu revize
  rozsahRevize?: string;        // 1.1 Předmět revize je
  predmetNeni?: string;         // 1.2 Předmětem revize není
  
  // 2. Charakteristika zařízení
  napetovaSoustava?: string;    // 2.1 Napěťová soustava (např. "3+N+PE AC 50Hz 400/230V TN-C-S")
  ochranaOpatreni?: string;     // 2.2 Ochrana před úrazem - JSON pole opatření
  
  // h) Seznam podkladů
  podklady?: string; // Projekty, předchozí revize, atd.
  
  // m) Vyhodnocení předchozích revizí
  vyhodnoceniPredchozich?: string;
  
  // g) Soupis použitých měřicích přístrojů (ID oddělená čárkami)
  pouzitePristroje?: string;
  
  // i) Soupis provedených úkonů
  provedeneUkony?: string;
  
  // Firma provádějící revizi (může být jiná než firma technika)
  firmaJmeno?: string;
  firmaAdresa?: string;
  firmaIco?: string;
  firmaDic?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Rozvadec {
  id?: number;
  revizeId: number;
  nazev: string;
  oznaceni: string;
  umisteni: string;
  typRozvadece: string;
  stupenKryti: string;
  proudovyChranicTyp?: string;
  poznamka?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Okruh {
  id?: number;
  rozvadecId: number;
  cislo: number;
  nazev: string;
  jisticTyp: string;
  jisticProud: string;
  pocetFazi: number;
  vodic: string;
  izolacniOdpor?: number;
  impedanceSmycky?: number;
  proudovyChranicMa?: number;
  casOdpojeni?: number;
  poznamka?: string;
}

export interface Zavada {
  id?: number;
  revizeId: number;
  rozvadecId?: number;
  mistnostId?: number;
  popis: string;
  zavaznost: 'C1' | 'C2' | 'C3';
  stav: 'otevřená' | 'v řešení' | 'vyřešená';
  fotky: string[]; // Base64 encoded images
  datumZjisteni: Date;
  datumVyreseni?: Date;
  poznamka?: string;
}

export interface Mistnost {
  id?: number;
  revizeId: number;
  nazev: string;
  patro?: string;
  plocha?: number;
  typ: string;
  prostredi: string;
  poznamka?: string;
}

// Zařízení v místnosti
export interface Zarizeni {
  id?: number;
  mistnostId: number;
  nazev: string;
  oznaceni?: string;
  pocetKs: number;
  trida: 'I' | 'II' | 'III';
  prikonW?: number;
  ochranaPredDotykem?: string; // I: impedance (např. "0.6 Ω"), II: "izolací", III: "malým napětím"
  stav: 'OK' | 'závada' | 'nekontrolováno';
  poznamka?: string;
}

export interface Zakazka {
  id?: number;
  nazev: string;
  klient: string;
  adresa: string;
  datumPlanovany: string;
  datumDokonceni?: string;
  stav: 'plánováno' | 'v realizaci' | 'dokončeno' | 'zrušeno';
  priorita: 'nizká' | 'střední' | 'vysoká';
  revizeId?: number;
  poznamka?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Firma pro kterou se provádí revize (např. klient který si najme technika)
export interface Firma {
  id?: number;
  nazev: string;
  adresa?: string;
  ico?: string;
  dic?: string;
  kontaktOsoba?: string;
  telefon?: string;
  email?: string;
  poznamka?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Nastaveni {
  id?: number;
  firmaJmeno: string;
  firmaAdresa: string;
  firmaIco: string;
  firmaDic?: string;
  reviznniTechnikJmeno: string;
  reviznniTechnikCisloOpravneni: string;
  kontaktEmail?: string;
  kontaktTelefon?: string;
  logo?: string; // Base64 encoded image
}

// Šablona pro export PDF
export interface SablonaSekce {
  id: string;
  nazev: string;
  enabled: boolean;
  poradi: number;
  parent?: string; // ID rodičovské sekce (pro hierarchii)
}

export interface SablonaSloupecOkruhu {
  id: string;
  nazev: string;
  enabled: boolean;
  poradi: number;
}

// Měřící přístroje
export interface MericiPristroj {
  id?: number;
  nazev: string;
  vyrobce: string;
  model: string;
  vyrobniCislo: string;
  typPristroje: 'multimetr' | 'meger' | 'smyckomer' | 'proudovy_chranic' | 'osciloskop' | 'jiny';
  datumKalibrace: string;
  platnostKalibrace: string;
  kalibracniList?: string; // Base64 encoded PDF/image
  poznamka?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Vazba přístrojů na revizi
export interface RevizePristroj {
  id?: number;
  revizeId: number;
  pristrojId: number;
}

export interface Sablona {
  id?: number;
  nazev: string;
  popis?: string;
  jeVychozi: boolean;
  
  // Záhlaví
  zahlaviZobrazitLogo: boolean;
  zahlaviZobrazitFirmu: boolean;
  zahlaviZobrazitTechnika: boolean;
  zahlaviCustomText?: string;
  
  // Úvodní strana
  uvodniStranaZobrazit: boolean;
  uvodniStranaZobrazitObjekt: boolean;
  uvodniStranaZobrazitTechnika: boolean;
  uvodniStranaZobrazitFirmu: boolean;
  uvodniStranaZobrazitVyhodnoceni: boolean;
  uvodniStranaZobrazitPodpisy: boolean;
  uvodniStranaNadpis?: string;
  uvodniStranaNadpisFontSize?: number;  // Velikost písma nadpisu (výchozí 18)
  uvodniStranaNadpisRamecek?: boolean;  // Zobrazit rámeček kolem nadpisu
  uvodniStranaRamecekUdaje?: boolean;   // Rámeček kolem základních údajů
  uvodniStranaRamecekObjekt?: boolean;  // Rámeček kolem údajů o objektu
  uvodniStranaRamecekVyhodnoceni?: boolean; // Rámeček kolem vyhodnocení
  
  // Sekce dokumentu
  sekce: SablonaSekce[];
  
  // Sloupce tabulky okruhů
  sloupceOkruhu: SablonaSloupecOkruhu[];
  
  // Zápatí
  zapatiZobrazitCisloStranky: boolean;
  zapatiZobrazitDatum: boolean;
  zapatiCustomText?: string;
  
  // Styly
  barvaPrimary: string;
  barvaSecondary: string;
  fontFamily: string;
  fontSize: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// Katalog typických závad (databáze závad pro výběr)
export interface ZavadaKatalog {
  id?: number;
  popis: string;                    // Popis závady
  zavaznost: 'C1' | 'C2' | 'C3';   // Výchozí závažnost
  norma?: string;                   // Název normy nebo zákona (např. "ČSN 33 1500", "Zákon 458/2000 Sb.")
  clanek?: string;                  // Číslo článku nebo paragrafu (např. "čl. 5.3", "§ 28")
  zneniClanku?: string;             // Plné znění článku/paragrafu
  kategorie?: string;               // Kategorie závady (např. "Rozvaděče", "Vedení", "Uzemnění")
  createdAt: Date;
  updatedAt: Date;
}
