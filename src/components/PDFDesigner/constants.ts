// Konstanty a proměnné pro PDF Designer
import type { TableColumn, WidgetStyle, Variable } from './types';

// Velikosti stránek v mm
export const PAGE_SIZES = {
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  letter: { width: 216, height: 279 },
} as const;

// Konverze mm na px (96 DPI)
export const MM_TO_PX = 3.78;

// Výchozí hodnoty
export const DEFAULT_MARGINS = { top: 15, right: 15, bottom: 15, left: 15 };
export const DEFAULT_HEADER_HEIGHT = 25;
export const DEFAULT_FOOTER_HEIGHT = 20;
export const DEFAULT_GRID_SIZE = 5;

// Výchozí styly widgetů
export const DEFAULT_WIDGET_STYLE: WidgetStyle = {
  fontSize: 12,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'left',
  verticalAlign: 'top',
  color: '#000000',
  backgroundColor: 'transparent',
  borderWidth: 0,
  borderColor: '#000000',
  borderStyle: 'none',
  borderRadius: 0,
  padding: 4,
  opacity: 1,
  lineHeight: 1.4,
};

// Dostupné proměnné - podle skutečné struktury Revize z types/index.ts
export const VARIABLES: Variable[] = [
  // Revize - základní údaje
  { key: 'revize.cisloRevize', label: 'Číslo revize', category: 'Revize' },
  { key: 'revize.nazev', label: 'Název revize', category: 'Revize' },
  { key: 'revize.adresa', label: 'Adresa objektu', category: 'Revize' },
  { key: 'revize.objednatel', label: 'Objednatel', category: 'Revize' },
  { key: 'revize.kategorieRevize', label: 'Kategorie (elektro/hromosvod/stroje)', category: 'Revize' },
  { key: 'revize.typRevize', label: 'Typ revize (pravidelná/výchozí/mimořádná)', category: 'Revize' },
  { key: 'revize.duvodMimoradne', label: 'Důvod mimořádné revize', category: 'Revize' },
  { key: 'revize.stav', label: 'Stav revize', category: 'Revize' },
  { key: 'revize.poznamka', label: 'Poznámka', category: 'Revize' },
  
  // Revize - data
  { key: 'revize.datum', label: 'Datum revize', category: 'Revize' },
  { key: 'revize.datumDokonceni', label: 'Datum dokončení', category: 'Revize' },
  { key: 'revize.datumPlatnosti', label: 'Datum platnosti', category: 'Revize' },
  { key: 'revize.datumVypracovani', label: 'Datum vypracování', category: 'Revize' },
  { key: 'revize.termin', label: 'Termín platnosti (měsíce)', category: 'Revize' },
  
  // Revize - výsledek
  { key: 'revize.vysledek', label: 'Výsledek (schopno/neschopno/podmíněně)', category: 'Výsledek' },
  { key: 'revize.vysledekOduvodneni', label: 'Odůvodnění výsledku', category: 'Výsledek' },
  { key: 'revize.zaver', label: 'Závěr/shrnutí', category: 'Výsledek' },
  
  // Revize - technické údaje
  { key: 'revize.rozsahRevize', label: 'Předmět revize je', category: 'Technické' },
  { key: 'revize.predmetNeni', label: 'Předmětem revize není', category: 'Technické' },
  { key: 'revize.napetovaSoustava', label: 'Napěťová soustava', category: 'Technické' },
  { key: 'revize.ochranaOpatreni', label: 'Ochranná opatření', category: 'Technické' },
  { key: 'revize.podklady', label: 'Podklady', category: 'Technické' },
  { key: 'revize.vyhodnoceniPredchozich', label: 'Vyhodnocení předchozích revizí', category: 'Technické' },
  { key: 'revize.pouzitePristroje', label: 'Použité přístroje', category: 'Technické' },
  { key: 'revize.provedeneUkony', label: 'Provedené úkony', category: 'Technické' },
  
  // Firma v revizi
  { key: 'revize.firmaJmeno', label: 'Firma - název', category: 'Firma v revizi' },
  { key: 'revize.firmaAdresa', label: 'Firma - adresa', category: 'Firma v revizi' },
  { key: 'revize.firmaIco', label: 'Firma - IČO', category: 'Firma v revizi' },
  { key: 'revize.firmaDic', label: 'Firma - DIČ', category: 'Firma v revizi' },
  
  // Technik (z Nastavení)
  { key: 'technik.jmeno', label: 'Jméno technika', category: 'Technik' },
  { key: 'technik.cisloOpravneni', label: 'Číslo oprávnění', category: 'Technik' },
  { key: 'technik.osvedceni', label: 'Osvědčení', category: 'Technik' },
  { key: 'technik.adresa', label: 'Adresa technika', category: 'Technik' },
  { key: 'technik.ico', label: 'IČO technika', category: 'Technik' },
  { key: 'technik.telefon', label: 'Telefon technika', category: 'Technik' },
  { key: 'technik.email', label: 'E-mail technika', category: 'Technik' },
  
  // Firma technika (z Nastavení)
  { key: 'firma.nazev', label: 'Název firmy (nastavení)', category: 'Firma' },
  { key: 'firma.adresa', label: 'Adresa firmy (nastavení)', category: 'Firma' },
  { key: 'firma.ico', label: 'IČO firmy (nastavení)', category: 'Firma' },
  { key: 'firma.dic', label: 'DIČ firmy (nastavení)', category: 'Firma' },
  { key: 'firma.logo', label: 'Logo firmy', category: 'Firma', description: 'Obrázek loga' },
  
  // Stránkování
  { key: 'page.current', label: 'Aktuální stránka', category: 'Stránkování' },
  { key: 'page.total', label: 'Celkem stránek', category: 'Stránkování' },
  { key: 'page.info', label: 'Stránka X z Y', category: 'Stránkování' },
  
  // Datum a čas
  { key: 'datum.dnes', label: 'Dnešní datum', category: 'Datum' },
  { key: 'datum.cas', label: 'Aktuální čas', category: 'Datum' },
  { key: 'datum.rok', label: 'Aktuální rok', category: 'Datum' },
  
  // Rozvaděč (pro repeater - aktuální položka)
  { key: 'item.nazev', label: 'Název rozvaděče', category: 'Rozvaděč (repeater)' },
  { key: 'item.oznaceni', label: 'Označení rozvaděče', category: 'Rozvaděč (repeater)' },
  { key: 'item.umisteni', label: 'Umístění rozvaděče', category: 'Rozvaděč (repeater)' },
  { key: 'item.typRozvadece', label: 'Typ rozvaděče', category: 'Rozvaděč (repeater)' },
  { key: 'item.stupenKryti', label: 'Stupeň krytí', category: 'Rozvaděč (repeater)' },
  { key: 'item.proudovyChranicTyp', label: 'Proudový chránič typ', category: 'Rozvaděč (repeater)' },
  { key: 'item.poznamka', label: 'Poznámka', category: 'Rozvaděč (repeater)' },
  { key: 'item.index', label: 'Pořadové číslo', category: 'Rozvaděč (repeater)' },
  
  // Místnost (pro repeater)
  { key: 'item.patro', label: 'Patro', category: 'Místnost (repeater)' },
  { key: 'item.plocha', label: 'Plocha [m²]', category: 'Místnost (repeater)' },
  { key: 'item.typ', label: 'Typ místnosti', category: 'Místnost (repeater)' },
  { key: 'item.prostredi', label: 'Prostředí', category: 'Místnost (repeater)' },
];

// Definice sloupců pro dynamické tabulky - podle skutečných typů
export const TABLE_COLUMNS: Record<string, TableColumn[]> = {
  rozvadece: [
    { id: 'oznaceni', key: 'oznaceni', label: 'Označení', width: 15, align: 'left', visible: true },
    { id: 'nazev', key: 'nazev', label: 'Název', width: 25, align: 'left', visible: true },
    { id: 'umisteni', key: 'umisteni', label: 'Umístění', width: 20, align: 'left', visible: true },
    { id: 'typRozvadece', key: 'typRozvadece', label: 'Typ', width: 15, align: 'center', visible: true },
    { id: 'stupenKryti', key: 'stupenKryti', label: 'Krytí', width: 10, align: 'center', visible: true },
    { id: 'poznamka', key: 'poznamka', label: 'Poznámka', width: 15, align: 'left', visible: false },
  ],
  okruhy: [
    { id: 'cislo', key: 'cislo', label: 'Č.', width: 6, align: 'center', visible: true },
    { id: 'nazev', key: 'nazev', label: 'Název okruhu', width: 20, align: 'left', visible: true },
    { id: 'jisticTyp', key: 'jisticTyp', label: 'Jistič', width: 8, align: 'center', visible: true },
    { id: 'jisticProud', key: 'jisticProud', label: 'Proud', width: 8, align: 'center', visible: true },
    { id: 'pocetFazi', key: 'pocetFazi', label: 'Fáze', width: 6, align: 'center', visible: true },
    { id: 'vodic', key: 'vodic', label: 'Vodič', width: 10, align: 'center', visible: true },
    { id: 'izolacniOdpor', key: 'izolacniOdpor', label: 'R izol [MΩ]', width: 10, align: 'center', visible: true },
    { id: 'impedanceSmycky', key: 'impedanceSmycky', label: 'Zs [Ω]', width: 10, align: 'center', visible: true },
    { id: 'proudovyChranicMa', key: 'proudovyChranicMa', label: 'I∆n [mA]', width: 10, align: 'center', visible: true },
    { id: 'casOdpojeni', key: 'casOdpojeni', label: 't [ms]', width: 8, align: 'center', visible: true },
  ],
  zavady: [
    { id: 'popis', key: 'popis', label: 'Popis závady', width: 45, align: 'left', visible: true },
    { id: 'zavaznost', key: 'zavaznost', label: 'Závažnost', width: 15, align: 'center', visible: true },
    { id: 'stav', key: 'stav', label: 'Stav', width: 20, align: 'center', visible: true },
    { id: 'poznamka', key: 'poznamka', label: 'Poznámka', width: 20, align: 'left', visible: false },
  ],
  mistnosti: [
    { id: 'nazev', key: 'nazev', label: 'Název', width: 25, align: 'left', visible: true },
    { id: 'patro', key: 'patro', label: 'Patro', width: 15, align: 'center', visible: true },
    { id: 'typ', key: 'typ', label: 'Typ', width: 20, align: 'left', visible: true },
    { id: 'prostredi', key: 'prostredi', label: 'Prostředí', width: 20, align: 'left', visible: true },
    { id: 'plocha', key: 'plocha', label: 'Plocha [m²]', width: 10, align: 'center', visible: true },
    { id: 'poznamka', key: 'poznamka', label: 'Poznámka', width: 10, align: 'left', visible: false },
  ],
  pristroje: [
    { id: 'nazev', key: 'nazev', label: 'Název', width: 20, align: 'left', visible: true },
    { id: 'vyrobce', key: 'vyrobce', label: 'Výrobce', width: 15, align: 'left', visible: true },
    { id: 'model', key: 'model', label: 'Model', width: 15, align: 'left', visible: true },
    { id: 'vyrobniCislo', key: 'vyrobniCislo', label: 'Výr. číslo', width: 15, align: 'left', visible: true },
    { id: 'typPristroje', key: 'typPristroje', label: 'Typ', width: 15, align: 'center', visible: true },
    { id: 'platnostKalibrace', key: 'platnostKalibrace', label: 'Kalibrace do', width: 15, align: 'center', visible: true },
  ],
  zarizeni: [
    { id: 'nazev', key: 'nazev', label: 'Název', width: 25, align: 'left', visible: true },
    { id: 'oznaceni', key: 'oznaceni', label: 'Označení', width: 15, align: 'left', visible: true },
    { id: 'pocetKs', key: 'pocetKs', label: 'Ks', width: 8, align: 'center', visible: true },
    { id: 'trida', key: 'trida', label: 'Třída', width: 10, align: 'center', visible: true },
    { id: 'prikonW', key: 'prikonW', label: 'Příkon [W]', width: 12, align: 'center', visible: true },
    { id: 'stav', key: 'stav', label: 'Stav', width: 15, align: 'center', visible: true },
    { id: 'poznamka', key: 'poznamka', label: 'Poznámka', width: 15, align: 'left', visible: false },
  ],
};

// Kategorie proměnných
export const VARIABLE_CATEGORIES = [
  'Revize',
  'Výsledek',
  'Technické',
  'Firma v revizi',
  'Technik',
  'Firma',
  'Stránkování',
  'Datum',
  'Rozvaděč (repeater)',
  'Místnost (repeater)',
];

// Typy widgetů s popisky
export const WIDGET_TYPES = [
  { type: 'text', label: 'Text', icon: 'text' },
  { type: 'variable', label: 'Proměnná', icon: 'variable' },
  { type: 'table', label: 'Tabulka', icon: 'table' },
  { type: 'repeater', label: 'Opakující se skupina', icon: 'repeat' },
  { type: 'image', label: 'Obrázek', icon: 'image' },
  { type: 'line', label: 'Čára', icon: 'line' },
  { type: 'box', label: 'Box/Rámeček', icon: 'box' },
  { type: 'page-number', label: 'Číslo stránky', icon: 'hash' },
  { type: 'date', label: 'Datum', icon: 'calendar' },
  { type: 'qr-code', label: 'QR kód', icon: 'qr' },
  { type: 'signature', label: 'Podpis', icon: 'pen' },
  { type: 'page-break', label: 'Zalomení stránky', icon: 'page-break' },
] as const;

// Typy tabulek s popisky
export const TABLE_TYPES = [
  { type: 'rozvadece', label: 'Rozvaděče' },
  { type: 'okruhy', label: 'Okruhy' },
  { type: 'zavady', label: 'Závady' },
  { type: 'mistnosti', label: 'Místnosti' },
  { type: 'pristroje', label: 'Měřící přístroje' },
  { type: 'zarizeni', label: 'Zařízení' },
] as const;

// Typy opakujících se skupin (repeater)
export const REPEATER_TYPES = [
  { 
    type: 'rozvadece', 
    label: 'Rozvaděče s okruhy',
    description: 'Pro každý rozvaděč: info o rozvaděči + tabulka okruhů',
  },
  { 
    type: 'mistnosti', 
    label: 'Místnosti se zařízeními',
    description: 'Pro každou místnost: info o místnosti + tabulka zařízení',
  },
] as const;

// Výchozí šablona pro repeater rozvaděčů
export const ROZVADEC_REPEATER_TEMPLATE = [
  {
    id: 'rozvadec_header',
    type: 'text' as const,
    name: 'Nadpis rozvaděče',
    relativeX: 0,
    relativeY: 0,
    width: 180,
    height: 8,
    content: 'Rozvaděč č. {{item.index}}: {{item.oznaceni}} - {{item.nazev}}',
    style: { fontSize: 12, fontWeight: 'bold' as const, color: '#1e40af' },
  },
  {
    id: 'rozvadec_info_box',
    type: 'box' as const,
    name: 'Info box',
    relativeX: 0,
    relativeY: 10,
    width: 180,
    height: 20,
    style: { borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'solid' as const, backgroundColor: '#f9fafb' },
  },
  {
    id: 'rozvadec_umisteni_label',
    type: 'text' as const,
    name: 'Umístění label',
    relativeX: 2,
    relativeY: 12,
    width: 25,
    height: 6,
    content: 'Umístění:',
    style: { fontSize: 9, color: '#6b7280' },
  },
  {
    id: 'rozvadec_umisteni',
    type: 'variable' as const,
    name: 'Umístění',
    relativeX: 28,
    relativeY: 12,
    width: 60,
    height: 6,
    content: 'item.umisteni',
    style: { fontSize: 9 },
  },
  {
    id: 'rozvadec_typ_label',
    type: 'text' as const,
    name: 'Typ label',
    relativeX: 90,
    relativeY: 12,
    width: 15,
    height: 6,
    content: 'Typ:',
    style: { fontSize: 9, color: '#6b7280' },
  },
  {
    id: 'rozvadec_typ',
    type: 'variable' as const,
    name: 'Typ',
    relativeX: 106,
    relativeY: 12,
    width: 35,
    height: 6,
    content: 'item.typRozvadece',
    style: { fontSize: 9 },
  },
  {
    id: 'rozvadec_kryti_label',
    type: 'text' as const,
    name: 'Krytí label',
    relativeX: 143,
    relativeY: 12,
    width: 15,
    height: 6,
    content: 'Krytí:',
    style: { fontSize: 9, color: '#6b7280' },
  },
  {
    id: 'rozvadec_kryti',
    type: 'variable' as const,
    name: 'Krytí',
    relativeX: 159,
    relativeY: 12,
    width: 20,
    height: 6,
    content: 'item.stupenKryti',
    style: { fontSize: 9 },
  },
  {
    id: 'rozvadec_okruhy_label',
    type: 'text' as const,
    name: 'Okruhy nadpis',
    relativeX: 0,
    relativeY: 32,
    width: 180,
    height: 6,
    content: 'Okruhy:',
    style: { fontSize: 10, fontWeight: 'bold' as const },
  },
  {
    id: 'rozvadec_okruhy_table',
    type: 'table' as const,
    name: 'Tabulka okruhů',
    relativeX: 0,
    relativeY: 39,
    width: 180,
    height: 40,
    autoGrow: true,
    tableConfig: {
      type: 'okruhy' as const,
      filterByParentId: true,
      parentIdField: 'rozvadecId',
      showHeader: true,
      borderStyle: 'all' as const,
      alternateRowColor: '#f9fafb',
      repeatHeaderOnNewPage: true,
      columns: [], // Bude doplněno z TABLE_COLUMNS
    },
  },
];
