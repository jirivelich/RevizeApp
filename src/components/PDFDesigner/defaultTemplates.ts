// Výchozí šablony pro PDF Designer
import type { DesignerTemplate, Widget, PageTemplate } from './types';
import { DEFAULT_WIDGET_STYLE, TABLE_COLUMNS } from './constants';

// Generování ID
const generateId = () => `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generatePageId = () => `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Konverze mm na px (96 DPI)
const MM = 3.78;

// Helper pro vytvoření widgetu - pozice a rozměry v mm
const createWidget = (
  overrides: Partial<Widget> & { type: Widget['type']; x: number; y: number; width: number; height: number }
): Widget => ({
  id: generateId(),
  name: '',
  content: '',
  locked: false,
  zone: 'content',
  pageId: '',
  zIndex: 0,
  style: { ...DEFAULT_WIDGET_STYLE },
  ...overrides,
  // Konverze mm na px
  x: Math.round(overrides.x * MM),
  y: Math.round(overrides.y * MM),
  width: Math.round(overrides.width * MM),
  height: Math.round(overrides.height * MM),
});

// ============================================================
// ŠABLONA 1: Revizní zpráva - Klasická
// ============================================================
export const createRevizniZpravaTemplate = (): DesignerTemplate => {
  const page1Id = generatePageId();
  const page2Id = generatePageId();
  const now = new Date().toISOString();
  
  // Strana 1 - Titulní strana
  const page1Widgets: Widget[] = [
    // === HEADER ===
    // Logo vlevo
    createWidget({
      type: 'image',
      name: 'Logo firmy',
      content: '{{firma.logo}}',
      x: 15,
      y: 5,
      width: 50,
      height: 25,
      zone: 'header',
      pageId: page1Id,
      zIndex: 1,
    }),
    // Název firmy vpravo nahoře
    createWidget({
      type: 'variable',
      name: 'Název firmy',
      content: 'firma.nazev',
      x: 100,
      y: 5,
      width: 95,
      height: 12,
      zone: 'header',
      pageId: page1Id,
      zIndex: 2,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 14, fontWeight: 'bold', textAlign: 'right' },
    }),
    // Adresa firmy
    createWidget({
      type: 'variable',
      name: 'Adresa firmy',
      content: 'firma.adresa',
      x: 100,
      y: 17,
      width: 95,
      height: 10,
      zone: 'header',
      pageId: page1Id,
      zIndex: 3,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 9, textAlign: 'right', color: '#666666' },
    }),

    // === CONTENT ===
    // Čára pod hlavičkou
    createWidget({
      type: 'line',
      name: 'Oddělovací čára',
      content: '',
      x: 15,
      y: 5,
      width: 180,
      height: 2,
      zone: 'content',
      pageId: page1Id,
      zIndex: 4,
      style: { ...DEFAULT_WIDGET_STYLE, borderWidth: 2, borderColor: '#1e40af', borderStyle: 'solid' },
    }),

    // Hlavní nadpis
    createWidget({
      type: 'text',
      name: 'Hlavní nadpis',
      content: 'REVIZNÍ ZPRÁVA',
      x: 15,
      y: 20,
      width: 180,
      height: 18,
      zone: 'content',
      pageId: page1Id,
      zIndex: 5,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 26, fontWeight: 'bold', textAlign: 'center', color: '#1e40af' },
    }),

    // Podtitul - typ revize
    createWidget({
      type: 'text',
      name: 'Podtitul',
      content: 'elektrického zařízení',
      x: 15,
      y: 38,
      width: 180,
      height: 12,
      zone: 'content',
      pageId: page1Id,
      zIndex: 6,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 14, textAlign: 'center', color: '#4b5563' },
    }),

    // Číslo revize
    createWidget({
      type: 'text',
      name: 'Label číslo',
      content: 'Číslo revize:',
      x: 50,
      y: 60,
      width: 50,
      height: 12,
      zone: 'content',
      pageId: page1Id,
      zIndex: 7,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 12, fontWeight: 'bold', textAlign: 'right' },
    }),
    createWidget({
      type: 'variable',
      name: 'Číslo revize',
      content: 'revize.cisloRevize',
      x: 105,
      y: 60,
      width: 55,
      height: 12,
      zone: 'content',
      pageId: page1Id,
      zIndex: 8,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 14, fontWeight: 'bold', textAlign: 'left', color: '#1e40af' },
    }),

    // Rámeček s údaji o objektu
    createWidget({
      type: 'box',
      name: 'Box objekt',
      content: '',
      x: 15,
      y: 82,
      width: 180,
      height: 55,
      zone: 'content',
      pageId: page1Id,
      zIndex: 9,
      style: { ...DEFAULT_WIDGET_STYLE, borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'solid', borderRadius: 4, backgroundColor: '#f9fafb' },
    }),

    // Název objektu
    createWidget({
      type: 'text',
      name: 'Label objekt',
      content: 'Objekt:',
      x: 20,
      y: 88,
      width: 35,
      height: 10,
      zone: 'content',
      pageId: page1Id,
      zIndex: 10,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 10, color: '#6b7280' },
    }),
    createWidget({
      type: 'variable',
      name: 'Název objektu',
      content: 'revize.nazev',
      x: 55,
      y: 88,
      width: 135,
      height: 10,
      zone: 'content',
      pageId: page1Id,
      zIndex: 11,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 12, fontWeight: 'bold' },
    }),

    // Adresa
    createWidget({
      type: 'text',
      name: 'Label adresa',
      content: 'Adresa:',
      x: 20,
      y: 100,
      width: 35,
      height: 10,
      zone: 'content',
      pageId: page1Id,
      zIndex: 12,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 10, color: '#6b7280' },
    }),
    createWidget({
      type: 'variable',
      name: 'Adresa objektu',
      content: 'revize.adresa',
      x: 55,
      y: 100,
      width: 135,
      height: 10,
      zone: 'content',
      pageId: page1Id,
      zIndex: 13,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 11 },
    }),

    // Objednatel
    createWidget({
      type: 'text',
      name: 'Label objednatel',
      content: 'Objednatel:',
      x: 20,
      y: 112,
      width: 35,
      height: 10,
      zone: 'content',
      pageId: page1Id,
      zIndex: 14,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 10, color: '#6b7280' },
    }),
    createWidget({
      type: 'variable',
      name: 'Objednatel',
      content: 'revize.objednatel',
      x: 55,
      y: 112,
      width: 135,
      height: 10,
      zone: 'content',
      pageId: page1Id,
      zIndex: 15,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 11 },
    }),

    // Typ revize
    createWidget({
      type: 'text',
      name: 'Label typ',
      content: 'Typ revize:',
      x: 20,
      y: 124,
      width: 35,
      height: 10,
      zone: 'content',
      pageId: page1Id,
      zIndex: 16,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 10, color: '#6b7280' },
    }),
    createWidget({
      type: 'variable',
      name: 'Typ revize',
      content: 'revize.typRevize',
      x: 55,
      y: 124,
      width: 60,
      height: 10,
      zone: 'content',
      pageId: page1Id,
      zIndex: 17,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 11 },
    }),

    // Datum revize
    createWidget({
      type: 'text',
      name: 'Label datum',
      content: 'Datum:',
      x: 115,
      y: 124,
      width: 25,
      height: 10,
      zone: 'content',
      pageId: page1Id,
      zIndex: 18,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 10, color: '#6b7280' },
    }),
    createWidget({
      type: 'variable',
      name: 'Datum revize',
      content: 'revize.datum',
      x: 140,
      y: 124,
      width: 50,
      height: 10,
      zone: 'content',
      pageId: page1Id,
      zIndex: 19,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 11 },
    }),

    // Sekce výsledek
    createWidget({
      type: 'text',
      name: 'Label výsledek',
      content: 'VÝSLEDEK REVIZE',
      x: 15,
      y: 150,
      width: 180,
      height: 14,
      zone: 'content',
      pageId: page1Id,
      zIndex: 20,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 14, fontWeight: 'bold', textAlign: 'center', color: '#1e40af' },
    }),

    // Box s výsledkem
    createWidget({
      type: 'box',
      name: 'Box výsledek',
      content: '',
      x: 40,
      y: 166,
      width: 130,
      height: 28,
      zone: 'content',
      pageId: page1Id,
      zIndex: 21,
      style: { ...DEFAULT_WIDGET_STYLE, borderWidth: 2, borderColor: '#16a34a', borderStyle: 'solid', borderRadius: 6, backgroundColor: '#f0fdf4' },
    }),
    createWidget({
      type: 'variable',
      name: 'Výsledek',
      content: 'revize.vysledek',
      x: 40,
      y: 170,
      width: 130,
      height: 20,
      zone: 'content',
      pageId: page1Id,
      zIndex: 22,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#16a34a', verticalAlign: 'middle' },
    }),

    // Platnost
    createWidget({
      type: 'text',
      name: 'Label platnost',
      content: 'Platnost do:',
      x: 65,
      y: 200,
      width: 40,
      height: 10,
      zone: 'content',
      pageId: page1Id,
      zIndex: 23,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 11, textAlign: 'right' },
    }),
    createWidget({
      type: 'variable',
      name: 'Platnost do',
      content: 'revize.datumPlatnosti',
      x: 108,
      y: 200,
      width: 45,
      height: 10,
      zone: 'content',
      pageId: page1Id,
      zIndex: 24,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 11, fontWeight: 'bold' },
    }),

    // Technik
    createWidget({
      type: 'text',
      name: 'Sekce technik',
      content: 'REVIZNÍ TECHNIK',
      x: 15,
      y: 220,
      width: 85,
      height: 12,
      zone: 'content',
      pageId: page1Id,
      zIndex: 25,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 11, fontWeight: 'bold', color: '#4b5563' },
    }),
    createWidget({
      type: 'variable',
      name: 'Jméno technika',
      content: 'technik.jmeno',
      x: 15,
      y: 233,
      width: 85,
      height: 10,
      zone: 'content',
      pageId: page1Id,
      zIndex: 26,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 12, fontWeight: 'bold' },
    }),
    createWidget({
      type: 'text',
      name: 'Label oprávnění',
      content: 'Číslo oprávnění:',
      x: 15,
      y: 245,
      width: 40,
      height: 8,
      zone: 'content',
      pageId: page1Id,
      zIndex: 27,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 9, color: '#6b7280' },
    }),
    createWidget({
      type: 'variable',
      name: 'Číslo oprávnění',
      content: 'technik.cisloOpravneni',
      x: 55,
      y: 245,
      width: 45,
      height: 8,
      zone: 'content',
      pageId: page1Id,
      zIndex: 28,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 9 },
    }),

    // Podpis technika
    createWidget({
      type: 'signature',
      name: 'Podpis technika',
      content: 'Podpis technika',
      x: 110,
      y: 225,
      width: 85,
      height: 35,
      zone: 'content',
      pageId: page1Id,
      zIndex: 29,
    }),

    // === FOOTER ===
    createWidget({
      type: 'line',
      name: 'Čára patička',
      content: '',
      x: 15,
      y: 5,
      width: 180,
      height: 1,
      zone: 'footer',
      pageId: page1Id,
      zIndex: 30,
      style: { ...DEFAULT_WIDGET_STYLE, borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'solid' },
    }),
    createWidget({
      type: 'variable',
      name: 'Firma patička',
      content: 'firma.nazev',
      x: 15,
      y: 10,
      width: 90,
      height: 8,
      zone: 'footer',
      pageId: page1Id,
      zIndex: 31,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 8, color: '#9ca3af' },
    }),
    createWidget({
      type: 'page-number',
      name: 'Číslo stránky',
      content: 'Strana X z Y',
      x: 155,
      y: 10,
      width: 40,
      height: 8,
      zone: 'footer',
      pageId: page1Id,
      zIndex: 32,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 8, textAlign: 'right', color: '#9ca3af' },
    }),
  ];

  // Strana 2 - Detaily a tabulky
  const page2Widgets: Widget[] = [
    // === HEADER ===
    createWidget({
      type: 'variable',
      name: 'Číslo revize header',
      content: 'revize.cisloRevize',
      x: 15,
      y: 8,
      width: 60,
      height: 10,
      zone: 'header',
      pageId: page2Id,
      zIndex: 1,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 10, fontWeight: 'bold' },
    }),
    createWidget({
      type: 'variable',
      name: 'Název revize header',
      content: 'revize.nazev',
      x: 80,
      y: 8,
      width: 115,
      height: 10,
      zone: 'header',
      pageId: page2Id,
      zIndex: 2,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 10, textAlign: 'right', color: '#6b7280' },
    }),

    // === CONTENT ===
    // Sekce: Předmět revize
    createWidget({
      type: 'text',
      name: 'Nadpis předmět',
      content: '1. Předmět revize',
      x: 15,
      y: 5,
      width: 180,
      height: 12,
      zone: 'content',
      pageId: page2Id,
      zIndex: 3,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 13, fontWeight: 'bold', color: '#1e40af' },
    }),
    createWidget({
      type: 'variable',
      name: 'Rozsah revize',
      content: 'revize.rozsahRevize',
      x: 15,
      y: 18,
      width: 180,
      height: 25,
      zone: 'content',
      pageId: page2Id,
      zIndex: 4,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 10, lineHeight: 1.5 },
    }),

    // Sekce: Napěťová soustava
    createWidget({
      type: 'text',
      name: 'Label napětí',
      content: 'Napěťová soustava:',
      x: 15,
      y: 48,
      width: 50,
      height: 10,
      zone: 'content',
      pageId: page2Id,
      zIndex: 5,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 10, fontWeight: 'bold' },
    }),
    createWidget({
      type: 'variable',
      name: 'Napěťová soustava',
      content: 'revize.napetovaSoustava',
      x: 65,
      y: 48,
      width: 130,
      height: 10,
      zone: 'content',
      pageId: page2Id,
      zIndex: 6,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 10 },
    }),

    // Sekce: Rozvaděče
    createWidget({
      type: 'text',
      name: 'Nadpis rozvaděče',
      content: '2. Rozvaděče',
      x: 15,
      y: 65,
      width: 180,
      height: 12,
      zone: 'content',
      pageId: page2Id,
      zIndex: 7,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 13, fontWeight: 'bold', color: '#1e40af' },
    }),
    // Tabulka rozvaděčů
    createWidget({
      type: 'table',
      name: 'Tabulka rozvaděčů',
      content: '',
      x: 15,
      y: 78,
      width: 180,
      height: 50,
      zone: 'content',
      pageId: page2Id,
      zIndex: 8,
      autoGrow: true, // Automatické stránkování
      overflowBehavior: 'continue',
      tableConfig: {
        type: 'rozvadece',
        columns: [...TABLE_COLUMNS.rozvadece],
        showHeader: true,
        borderStyle: 'all',
        alternateRowColor: '#f9fafb',
        repeatHeaderOnNewPage: true, // Opakovat hlavičku na nových stránkách
      },
    }),

    // Sekce: Závady
    createWidget({
      type: 'text',
      name: 'Nadpis závady',
      content: '3. Zjištěné závady',
      x: 15,
      y: 135,
      width: 180,
      height: 12,
      zone: 'content',
      pageId: page2Id,
      zIndex: 9,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 13, fontWeight: 'bold', color: '#1e40af' },
    }),
    // Tabulka závad
    createWidget({
      type: 'table',
      name: 'Tabulka závad',
      content: '',
      x: 15,
      y: 148,
      width: 180,
      height: 45,
      zone: 'content',
      pageId: page2Id,
      zIndex: 10,
      autoGrow: true, // Automatické stránkování
      overflowBehavior: 'continue',
      tableConfig: {
        type: 'zavady',
        columns: [...TABLE_COLUMNS.zavady],
        showHeader: true,
        borderStyle: 'all',
        alternateRowColor: '#fef2f2',
        repeatHeaderOnNewPage: true,
      },
    }),

    // Sekce: Závěr
    createWidget({
      type: 'text',
      name: 'Nadpis závěr',
      content: '4. Závěr',
      x: 15,
      y: 200,
      width: 180,
      height: 12,
      zone: 'content',
      pageId: page2Id,
      zIndex: 11,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 13, fontWeight: 'bold', color: '#1e40af' },
    }),
    createWidget({
      type: 'variable',
      name: 'Závěr',
      content: 'revize.zaver',
      x: 15,
      y: 213,
      width: 180,
      height: 35,
      zone: 'content',
      pageId: page2Id,
      zIndex: 12,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 10, lineHeight: 1.5 },
    }),

    // === FOOTER ===
    createWidget({
      type: 'line',
      name: 'Čára patička',
      content: '',
      x: 15,
      y: 5,
      width: 180,
      height: 1,
      zone: 'footer',
      pageId: page2Id,
      zIndex: 13,
      style: { ...DEFAULT_WIDGET_STYLE, borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'solid' },
    }),
    createWidget({
      type: 'variable',
      name: 'Firma patička',
      content: 'firma.nazev',
      x: 15,
      y: 10,
      width: 90,
      height: 8,
      zone: 'footer',
      pageId: page2Id,
      zIndex: 14,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 8, color: '#9ca3af' },
    }),
    createWidget({
      type: 'page-number',
      name: 'Číslo stránky',
      content: 'Strana X z Y',
      x: 155,
      y: 10,
      width: 40,
      height: 8,
      zone: 'footer',
      pageId: page2Id,
      zIndex: 15,
      style: { ...DEFAULT_WIDGET_STYLE, fontSize: 8, textAlign: 'right', color: '#9ca3af' },
    }),
  ];

  const page1: PageTemplate = {
    id: page1Id,
    name: 'Titulní strana',
    size: 'a4',
    orientation: 'portrait',
    widgets: page1Widgets,
  };

  const page2: PageTemplate = {
    id: page2Id,
    name: 'Detaily',
    size: 'a4',
    orientation: 'portrait',
    widgets: page2Widgets,
  };

  return {
    id: `template_revizni_zprava`,
    name: 'Revizní zpráva - Klasická',
    description: 'Standardní šablona revizní zprávy s titulní stranou, tabulkami rozvaděčů a závad',
    pages: [page1, page2],
    headerHeight: 30,
    footerHeight: 20,
    gridSize: 5,
    snapToGrid: true,
    createdAt: now,
    updatedAt: now,
  };
};

// Seznam všech dostupných výchozích šablon
export const DEFAULT_TEMPLATES = [
  {
    id: 'revizni_zprava',
    name: 'Revizní zpráva - Klasická',
    description: 'Standardní šablona revizní zprávy s titulní stranou a detaily',
    create: createRevizniZpravaTemplate,
  },
];

// Export funkce pro vytvoření prázdné šablony
export const createEmptyTemplate = (): DesignerTemplate => ({
  id: `template_${Date.now()}`,
  name: 'Nová šablona',
  description: '',
  pages: [{
    id: generatePageId(),
    name: 'Strana 1',
    size: 'a4',
    orientation: 'portrait',
    widgets: [],
  }],
  headerHeight: 25,
  footerHeight: 20,
  gridSize: 5,
  snapToGrid: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
