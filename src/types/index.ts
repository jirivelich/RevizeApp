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
  lhutaText?: string; // vlastní text místo lhůty (např. "dle určení vnějších vlivů")
  datumVypracovani?: string;
  typRevize: 'pravidelná' | 'výchozí' | 'mimořádná';
  duvodMimoradne?: string; // e) Důvod mimořádné revize
  stav: 'rozpracováno' | 'dokončeno' | 'schváleno';
  poznamka?: string;
  vysledek?: 'schopno' | 'neschopno';
  vysledekOduvodneni?: string; // l) Odůvodnění pokud není schopno provozu
  zaver?: string; // Závěr/shrnutí revize
  
  // 1. Vymezení rozsahu revize
  rozsahRevize?: string;        // 1.1 Předmět revize je
  predmetNeni?: string;         // 1.2 Předmětem revize není
  
  // Popis revidovaného zařízení
  popisZarizeni?: string;
  
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
  
  // Nastavení viditelných sekcí pro tisk/náhled (JSON)
  tiskSekce?: string;

  // Normy – text nad nadpisem revizní zprávy
  normySoulad?: string;

  // === Historie / návaznost revizí ===
  predchoziRevizeId?: number; // FK na předchozí revizi (řetězení)
  skupinaRevizi?: string;     // UUID sdílené celou řadou navazujících revizí
  
  // Snapshot revizního technika platný v době vytvoření zprávy
  rtJmeno?: string;
  rtCisloOpravneni?: string;
  rtPlatnostOpravneni?: string;
  rtCisloOsvedceni?: string;
  rtPlatnostOsvedceni?: string;

  // Firma provádějící revizi (může být jiná než firma technika)
  firmaJmeno?: string;
  firmaAdresa?: string;
  firmaIco?: string;
  firmaDic?: string;

  // ═══ HROMOSVOD - specifická pole ═══
  // Základní popis LPS
  hromosvodTridaLps?: 'I' | 'II' | 'III' | 'IV';
  hromosvodTypOchrany?: 'vnější' | 'vnitřní' | 'kombinovaná';
  hromosvodRokInstalace?: string;
  hromosvodNorma?: string; // např. ČSN EN 62305
  hromosvodPopisLps?: string;

  // Jímací soustava
  hromosvodJimaciTyp?: string;        // tyčový / mřížový / kombinovaný / vodicový
  hromosvodJimaciMaterial?: string;    // ocel pozink / nerez / hliník / měď
  hromosvodJimaciStav?: 'vyhovující' | 'nevyhovující' | 'částečně vyhovující';
  hromosvodJimaciPoznamka?: string;

  // Svodové vedení
  hromosvodSvodyPocet?: number;
  hromosvodSvodyMaterial?: string;
  hromosvodSvodyPrurez?: string;       // např. "FeZn Ø8mm"
  hromosvodSvodyZkusebniSvorky?: number;
  hromosvodSvodyStav?: 'vyhovující' | 'nevyhovující' | 'částečně vyhovující';
  hromosvodSvodyPoznamka?: string;

  // Uzemňovací soustava
  hromosvodUzemneniTyp?: string;       // základový / obvodový / tyčový / kombinovaný
  hromosvodUzemneniMaterial?: string;
  hromosvodUzemneniStav?: 'vyhovující' | 'nevyhovující' | 'částečně vyhovující';
  hromosvodUzemneniPoznamka?: string;

  // Ochranné pospojování (SPD)
  hromosvodSpdTyp?: string;            // typ přepěťové ochrany
  hromosvodSpdStav?: 'vyhovující' | 'nevyhovující' | 'nenainstalováno';
  hromosvodEkvipotencialni?: string;   // popis ekvipotenciálních přípojnic
  hromosvodSpdPoznamka?: string;

  // Měření odporů uzemnění (JSON pole měření)
  hromosvodMereniOdporu?: string;      // JSON: [{bod, hodnota, limit, vyhovuje}]

  // Rozdělovník – seznam příjemců revizní zprávy
  rozdelovnik?: string;                // volný text, jeden příjemce per řádek

  // Náčrt LPS (base64 PNG z canvas editoru)
  hromosvodNacrt?: string;

  // ═══ STROJNÍ ZAŘÍZENÍ - data formuláře (JSON) ═══
  strojniData?: string;                // JSON: StrojniFormData

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
  poradi?: number;
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
  vodic?: string;
  typKabelu?: string;
  pocetZil?: string;
  prurez?: string;
  izolacniOdpor?: string;
  impedanceSmycky?: string;
  poznamka?: string;
}

export interface OkruhNavrh {
  cislo: number;
  nazev: string;
  jisticTyp: string;
  jisticProud: string;
  pocetFazi: number;
  selected: boolean;
  conflictAction: 'add' | 'replace' | 'skip';
}

export interface Chranic {
  id?: number;
  rozvadecId: number;
  cislo: number;
  nazev: string;
  typ: string;
  proud: string;
  citlivostMa: number;
  pocetPolu: number;
  // Měřené hodnoty
  testovacitlacitko?: boolean;
  nevybavovaci?: boolean;
  dotykoveNapeti?: number;
  vybavovacProud?: number;
  casOdpojeni1x?: number;
  casOdpojeni5x?: number;
  casOdpojeni1_4x?: number;
  casOdpojeni2x?: number;
  zkouskaVypnuti2x?: boolean;
  selektivita?: boolean;
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
  typ?: string;
  prostredi?: string;
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
  casPlanovany?: string; // HH:mm format
  datumDokonceni?: string;
  datumyRealizace?: string[]; // konkrétní dny realizace ["YYYY-MM-DD", ...]
  lhutaZpravyDni?: number;   // počet dní po posledním dni pro odevzdání zprávy
  datumOdevzdaniZpravy?: string; // plánované odevzdání zprávy YYYY-MM-DD
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
  reviznniTechnikPlatnostOpravneni?: string;
  reviznniTechnikOsvedceni?: string;
  reviznniTechnikPlatnostOsvedceni?: string;
  reviznniTechnikAdresa?: string;
  reviznniTechnikIco?: string;
  kontaktEmail?: string;
  kontaktTelefon?: string;
  logo?: string; // Base64 encoded image
  upozorneniZakazkaDni?: number;
  upozorneniRevizeDni?: number;
  upozorneniKalibraceDni?: number;
  upozorneniZpravaDni?: number;
  upozorneniTechnikDni?: number;
}

export type NotificationType =
  | 'zakazka_upcoming'
  | 'revize_overdue'
  | 'report_deadline'
  | 'kalibrace_expiring'
  | 'technik_expiry';

export type NotificationSeverity = 'critical' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  description: string;
  daysUntil: number; // záporné = po termínu
  link: string;
}

export interface TechnikHistorie {
  id: number;
  reviznniTechnikJmeno?: string;
  reviznniTechnikCisloOpravneni?: string;
  reviznniTechnikPlatnostOpravneni?: string;
  reviznniTechnikOsvedceni?: string;
  reviznniTechnikPlatnostOsvedceni?: string;
  platOd?: string;
  createdAt: string;
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

// Historie kalibrací měřicího přístroje
export interface Kalibrace {
  id?: number;
  pristrojId: number;
  datumKalibrace: string;
  platnostKalibrace: string;
  kalibracniList?: string;  // Base64 encoded PDF/image
  provedl?: string;         // Kdo provedl kalibraci
  certifikat?: string;      // Číslo certifikátu / protokolu
  poznamka?: string;
  createdAt?: Date;
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

export interface PredvolenyText {
  id?: number;
  pole: string;       // Název pole (popisZarizeni, rozsahRevize, podklady, ...)
  nazev: string;      // Zobrazený název předvolby
  text: string;       // Text předvolby
  poradi?: number;    // Pořadí v seznamu
  createdAt?: Date;
  updatedAt?: Date;
}
