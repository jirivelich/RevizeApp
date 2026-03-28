/**
 * ═══════════════════════════════════════════════════════════════
 *  Nezávislý testovací skript pro docxtemplater
 *  Spuštění: cd test-template && npx tsx test-docxtemplater.ts
 * ═══════════════════════════════════════════════════════════════
 *
 *  Tento skript:
 *   1) Programaticky vytvoří .docx šablonu s tagy (template.docx)
 *   2) Naplní ji testovacími daty přes docxtemplater
 *   3) Uloží výsledek jako output.docx
 *
 *  Žádné další závislosti – používá jen docx, docxtemplater, pizzip
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, HeadingLevel,
  Header, Footer, PageNumber,
  ShadingType, VerticalAlign, TableLayoutType,
  convertMillimetersToTwip,
} from 'docx';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import * as fs from 'fs';
import * as path from 'path';

/* ═══════════════════════════════════════════
   BARVY
   ═══════════════════════════════════════════ */
const BLUE = '1e40af';
const DARK = '1e293b';
const GRAY = '64748b';
const WHITE = 'ffffff';
const BORDER = 'cbd5e1';
const LIGHT = 'f1f5f9';

const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: BORDER };
const noBorder = { style: BorderStyle.NONE, size: 0, color: WHITE };

/* ═══════════════════════════════════════════
   KROK 1: Vytvořit DOCX šablonu s tagy
   ═══════════════════════════════════════════ */

function createTemplateDocx(): Document {
  /**
   * Šablona používá docxtemplater syntaxi:
   *   {tag}          - jednoduchý placeholder
   *   {#pole}...{/pole} - loop
   *   {#bool}...{/bool} - podmínka (true = zobraz)
   *   {^bool}...{/bool} - inverzní podmínka (false = zobraz)
   */

  // Helper: textový odstavec s tagy
  const p = (text: string, opts?: { bold?: boolean; size?: number; color?: string; alignment?: typeof AlignmentType[keyof typeof AlignmentType]; spacing?: { before?: number; after?: number } }) =>
    new Paragraph({
      alignment: opts?.alignment,
      spacing: opts?.spacing ?? { before: 40, after: 40 },
      children: [new TextRun({
        text,
        bold: opts?.bold,
        size: opts?.size ?? 20,
        color: opts?.color ?? DARK,
        font: 'Segoe UI',
      })],
    });

  // Helper: nadpis sekce
  const section = (text: string) => new Paragraph({
    spacing: { before: 240, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER } },
    children: [new TextRun({ text, bold: true, size: 22, color: BLUE, font: 'Segoe UI' })],
  });

  // Helper: subsection nadpis
  const subsection = (text: string) => new Paragraph({
    spacing: { before: 160, after: 60 },
    shading: { type: ShadingType.SOLID, color: LIGHT },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: BLUE } },
    indent: { left: convertMillimetersToTwip(2) },
    children: [new TextRun({ text, bold: true, size: 20, color: '334155', font: 'Segoe UI' })],
  });

  // Helper: KV řádek
  const kv = (label: string, value: string) => new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [
      new TextRun({ text: `${label}  `, bold: true, size: 19, color: '475569', font: 'Segoe UI' }),
      new TextRun({ text: value, size: 19, color: DARK, font: 'Segoe UI' }),
    ],
  });

  // Helper: tabulka s headerem a jedním datovým řádkem (pro loop)
  const makeTable = (headers: string[], widths: number[], dataRow: string[]) => {
    const headerRow = new TableRow({
      tableHeader: true,
      children: headers.map((h, i) =>
        new TableCell({
          width: { size: widths[i], type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: BLUE },
          children: [new Paragraph({
            spacing: { before: 20, after: 20 },
            children: [new TextRun({ text: h, bold: true, size: 16, color: WHITE, font: 'Segoe UI' })],
          })],
          verticalAlign: VerticalAlign.CENTER,
          borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
        })
      ),
    });

    const row = new TableRow({
      children: dataRow.map((cell, i) =>
        new TableCell({
          width: { size: widths[i], type: WidthType.PERCENTAGE },
          children: [new Paragraph({
            spacing: { before: 20, after: 20 },
            children: [new TextRun({ text: cell, size: 17, color: DARK, font: 'Segoe UI' })],
          })],
          verticalAlign: VerticalAlign.TOP,
          borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
        })
      ),
    });

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [headerRow, row],
    });
  };

  // KV tabulka (key-value, 2 sloupce, bez viditelných hranic)
  const kvTable = (rows: [string, string][]) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
      insideVertical: noBorder,
    },
    rows: rows.map(([k, v]) => new TableRow({
      children: [
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          children: [new Paragraph({
            spacing: { before: 30, after: 30 },
            children: [new TextRun({ text: k, bold: true, size: 19, color: '475569', font: 'Segoe UI' })],
          })],
          verticalAlign: VerticalAlign.TOP,
        }),
        new TableCell({
          width: { size: 65, type: WidthType.PERCENTAGE },
          children: [new Paragraph({
            spacing: { before: 30, after: 30 },
            children: [new TextRun({ text: v, size: 19, color: DARK, font: 'Segoe UI' })],
          })],
          verticalAlign: VerticalAlign.TOP,
        }),
      ],
    })),
  });

  // ── SESTAVIT DOKUMENT ──
  const children: (Paragraph | Table)[] = [
    // NADPIS
    p('ZPRÁVA O REVIZI ELEKTRICKÉHO ZAŘÍZENÍ', {
      bold: true, size: 28, alignment: AlignmentType.CENTER, color: DARK,
      spacing: { before: 200, after: 40 },
    }),
    p('{typRevize}', {
      bold: true, size: 22, alignment: AlignmentType.CENTER, color: '334155',
      spacing: { before: 0, after: 200 },
    }),

    // a) PROVOZOVATEL
    section('a) Provozovatel revidovaného zařízení'),
    kvTable([
      ['Název / Jméno:', '{zakaznik_nazev}'],
      ['Adresa / Sídlo:', '{zakaznik_adresa}'],
      ['IČO:', '{zakaznik_ico}'],
    ]),

    // FIRMA (volitelná)
    p('{#showFirma}', { size: 16, color: 'dc2626', bold: true }),
    section('Firma provádějící revizi'),
    kvTable([
      ['Název firmy:', '{firma_nazev}'],
      ['Adresa:', '{firma_adresa}'],
      ['IČO:', '{firma_ico}'],
    ]),
    p('{/showFirma}', { size: 16, color: 'dc2626', bold: true }),

    // b) IDENTIFIKACE
    section('b) Identifikace revidovaného zařízení'),
    kvTable([
      ['Název objektu:', '{nazev}'],
      ['Adresa objektu:', '{adresa}'],
      ['Číslo zprávy:', '{cisloRevize}'],
    ]),

    // c) ROZSAH (podmíněný)
    p('{#showRozsah}', { size: 16, color: 'dc2626', bold: true }),
    section('c) Vymezení rozsahu revize'),
    p('{rozsahRevize}'),
    p('{/showRozsah}', { size: 16, color: 'dc2626', bold: true }),

    // d) REVIZNÍ TECHNIK
    section('d) Údaje o revizním technikovi'),
    kvTable([
      ['Jméno:', '{technik_jmeno}'],
      ['Ev. číslo:', '{technik_cislo}'],
    ]),

    // e) DRUH REVIZE
    section('e) Druh revize'),
    p('{typRevize}', { bold: true }),

    // f) DATA
    section('f) Důležitá data'),
    kvTable([
      ['Datum provedení:', '{datum}'],
      ['Platnost do:', '{datumPlatnosti}'],
      ['Lhůta:', '{termin} měsíců'],
    ]),

    // g) PŘÍSTROJE (podmíněný)
    p('{#showPristroje}', { size: 16, color: 'dc2626', bold: true }),
    section('g) Soupis měřicích přístrojů'),
    // Tabulka s loop řádky
    // Loop tag musí být v prvním sloupci datového řádku
    makeTable(
      ['Název', 'Výrobce / Model', 'Výr. číslo', 'Kalibrace', 'Platnost'],
      [25, 25, 20, 15, 15],
      ['{#pristroje}{nazev}', '{vyrobce}', '{vyrobniCislo}', '{kalibrace}', '{platnost}{/pristroje}'],
    ),
    p('{/showPristroje}', { size: 16, color: 'dc2626', bold: true }),

    // j) ROZVADĚČE S OKRUHY (vnořený loop)
    section('j) Naměřené hodnoty – Rozvaděče a okruhy'),

    // Vnější loop – rozvaděče
    p('{#rozvadece}', { size: 16, color: 'dc2626', bold: true }),
    subsection('{rozNazev} ({rozOznaceni}) – {rozUmisteni}'),

    // Vnořená tabulka – okruhy
    makeTable(
      ['Č.', 'Jistič', 'Název okruhu', 'Vodič', 'Iz [MΩ]', 'Zs [Ω]'],
      [8, 12, 28, 16, 18, 18],
      ['{#okruhy}{cislo}', '{jistic}', '{nazevOkruhu}', '{vodic}', '{iz}', '{zs}{/okruhy}'],
    ),
    p('{/rozvadece}', { size: 16, color: 'dc2626', bold: true }),

    // Fallback když žádné rozvaděče
    p('{^maRozvadece}', { size: 16, color: 'dc2626', bold: true }),
    p('Žádné rozvaděče nebyly revidovány.', { color: GRAY }),
    p('{/maRozvadece}', { size: 16, color: 'dc2626', bold: true }),

    // k) ZÁVADY
    section('k) Přehled zjištěných závad'),

    p('{#maZavady}', { size: 16, color: 'dc2626', bold: true }),
    makeTable(
      ['#', 'Popis závady', 'Závažnost', 'Stav', 'Zjištěna'],
      [5, 45, 15, 15, 20],
      ['{#zavady}{idx}', '{popis}', '{zavaznost}', '{stav}', '{datumZjisteni}{/zavady}'],
    ),
    p('{/maZavady}', { size: 16, color: 'dc2626', bold: true }),

    p('{^maZavady}', { size: 16, color: 'dc2626', bold: true }),
    p('Při revizi nebyly zjištěny žádné závady.', { bold: true }),
    p('{/maZavady}', { size: 16, color: 'dc2626', bold: true }),

    // VÝSLEDEK
    section('l) Závěrečné zhodnocení'),
    p('Revidované elektrické zařízení je:', {
      alignment: AlignmentType.CENTER, color: '475569',
    }),
    p('{vysledek}', {
      bold: true, size: 28, alignment: AlignmentType.CENTER, color: DARK,
      spacing: { before: 80, after: 120 },
    }),

    // PODPISY
    section('o) Potvrzení o předání zprávy'),
    kv('Revizní technik:', '{technik_jmeno}'),
    kv('Ev. č.:', '{technik_cislo}'),
    p(''),
    new Paragraph({
      spacing: { before: 40, after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: DARK } },
      children: [new TextRun({ text: '   ', size: 20 })],
    }),
    p('Podpis revizního technika', { size: 15, color: '94a3b8' }),
    p(''),
    p('V ...................... dne {datumVypracovani}', { color: '475569' }),
  ];

  return new Document({
    styles: {
      default: { document: { run: { font: 'Segoe UI', size: 20 } } },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertMillimetersToTwip(18),
            bottom: convertMillimetersToTwip(20),
            left: convertMillimetersToTwip(15),
            right: convertMillimetersToTwip(15),
          },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER } },
            children: [
              new TextRun({ text: 'Zpráva č. {cisloRevize}', bold: true, size: 16, color: BLUE, font: 'Segoe UI' }),
              new TextRun({ text: '     {nazev} – {adresa}', size: 16, color: GRAY, font: 'Segoe UI' }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' } },
            children: [
              new TextRun({ text: '{firma_nazev}     Revizní zpráva     Strana ', size: 15, color: '94a3b8', font: 'Segoe UI' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 15, color: '94a3b8', font: 'Segoe UI' }),
              new TextRun({ text: ' / ', size: 15, color: '94a3b8', font: 'Segoe UI' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: '94a3b8', font: 'Segoe UI' }),
            ],
          })],
        }),
      },
      children,
    }],
  });
}

/* ═══════════════════════════════════════════
   KROK 2: Testovací data
   ═══════════════════════════════════════════ */

const TEST_DATA = {
  // Skalární hodnoty
  cisloRevize: 'REV-2026/0042',
  nazev: 'Bytový dům Zahradní 15',
  adresa: 'Zahradní 15, 120 00 Praha 2',
  typRevize: 'Pravidelná (periodická) revize',
  datum: '10.03.2026',
  datumPlatnosti: '10.03.2031',
  datumVypracovani: '11.03.2026',
  termin: '60',

  // Zákazník
  zakaznik_nazev: 'SVJ Zahradní 15',
  zakaznik_adresa: 'Zahradní 15, Praha 2',
  zakaznik_ico: '27456789',

  // Firma (volitelná)
  showFirma: true,
  firma_nazev: 'ElektroRevize s.r.o.',
  firma_adresa: 'Technická 8, Praha 6',
  firma_ico: '12345678',

  // Technik
  technik_jmeno: 'Ing. Jan Novák',
  technik_cislo: '1234/E-5/2020',

  // Podmínky sekcí
  showRozsah: true,
  rozsahRevize: 'Předmětem revize je celá elektroinstalace bytového domu – společné prostory, stoupací vedení, rozvaděče.',

  showPristroje: true,

  // Výsledek
  vysledek: 'SCHOPNO BEZPEČNÉHO PROVOZU',
  vysledekColor: '16a34a',

  // ── DYNAMICKÉ TABULKY ──

  // Přístroje (loop)
  pristroje: [
    { nazev: 'Revizní přístroj', vyrobce: 'Fluke 1664 FC', vyrobniCislo: 'FL-2024-1234', kalibrace: '15.01.2025', platnost: '15.01.2026' },
    { nazev: 'Klešťový ampérmetr', vyrobce: 'Fluke 376 FC', vyrobniCislo: 'FL-2023-5678', kalibrace: '01.06.2025', platnost: '01.06.2026' },
    { nazev: 'Multimetr', vyrobce: 'Fluke 179', vyrobniCislo: 'FL-2022-9012', kalibrace: '20.09.2025', platnost: '20.09.2026' },
  ],

  // Rozvaděče s okruhy (vnořený loop – neznámý počet!)
  maRozvadece: true,
  rozvadece: [
    {
      rozNazev: 'Hlavní rozvaděč',
      rozOznaceni: 'HR1',
      rozUmisteni: '1.PP – Chodba',
      okruhy: [
        { cislo: '1', jistic: 'B25', nazevOkruhu: 'Hlavní přívod', vodic: 'CYKY 5×6', iz: '>200', zs: '0.38' },
        { cislo: '2', jistic: 'B16', nazevOkruhu: 'Osvětlení společné', vodic: 'CYKY 3×1,5', iz: '>200', zs: '0.92' },
        { cislo: '3', jistic: 'B16', nazevOkruhu: 'Zásuvky chodba', vodic: 'CYKY 3×2,5', iz: '185', zs: '1.05' },
        { cislo: '4', jistic: 'C16', nazevOkruhu: 'Výtah', vodic: 'CYKY 5×2,5', iz: '>200', zs: '0.65' },
      ],
    },
    {
      rozNazev: 'Podružný rozvaděč',
      rozOznaceni: 'PR1',
      rozUmisteni: '3.NP – Chodba',
      okruhy: [
        { cislo: '1', jistic: 'B16', nazevOkruhu: 'Osvětlení 3.NP', vodic: 'CYKY 3×1,5', iz: '>200', zs: '1.15' },
        { cislo: '2', jistic: 'B16', nazevOkruhu: 'Zásuvky 3.NP', vodic: 'CYKY 3×2,5', iz: '142', zs: '1.28' },
      ],
    },
    {
      rozNazev: 'Bytový rozvaděč',
      rozOznaceni: 'BR-301',
      rozUmisteni: 'Byt 301, 3.NP',
      okruhy: [
        { cislo: '1', jistic: 'B16', nazevOkruhu: 'Osvětlení', vodic: 'CYKY 3×1,5', iz: '>200', zs: '1.42' },
        { cislo: '2', jistic: 'B16', nazevOkruhu: 'Zásuvky obývák', vodic: 'CYKY 3×2,5', iz: '168', zs: '1.55' },
        { cislo: '3', jistic: 'B16', nazevOkruhu: 'Zásuvky kuchyň', vodic: 'CYKY 3×2,5', iz: '>200', zs: '1.48' },
        { cislo: '4', jistic: 'C16', nazevOkruhu: 'Sporák', vodic: 'CYKY 5×2,5', iz: '>200', zs: '1.35' },
        { cislo: '5', jistic: 'B16', nazevOkruhu: 'Koupelna', vodic: 'CYKY 3×2,5', iz: '195', zs: '1.60' },
      ],
    },
  ],

  // Závady
  maZavady: true,
  zavady: [
    { idx: 1, popis: 'Chybí kryt svorkovnice v rozvaděči HR1', zavaznost: 'C1 – Kritická', stav: 'Otevřená', datumZjisteni: '10.03.2026' },
    { idx: 2, popis: 'Poškozená izolace vodiče u výtahu', zavaznost: 'C2 – Vážná', stav: 'Otevřená', datumZjisteni: '10.03.2026' },
    { idx: 3, popis: 'Chybí označení okruhů v rozvaděči PR1', zavaznost: 'C3 – Méně závažná', stav: 'Otevřená', datumZjisteni: '10.03.2026' },
  ],
};

/** Varianta s prázdnými daty – test chybějících hodnot */
const TEST_DATA_EMPTY = {
  cisloRevize: 'REV-2026/0099',
  nazev: 'Test – prázdná data',
  adresa: 'Testovací 1, Praha',
  typRevize: 'Výchozí revize',
  datum: '11.03.2026',
  datumPlatnosti: '',
  datumVypracovani: '11.03.2026',
  termin: '60',

  zakaznik_nazev: 'Testovací zákazník',
  zakaznik_adresa: '',
  zakaznik_ico: '',

  showFirma: false,  // ← firma se nezobrazí
  firma_nazev: '',
  firma_adresa: '',
  firma_ico: '',

  technik_jmeno: 'Ing. Test',
  technik_cislo: '0000/T',

  showRozsah: false, // ← rozsah se nezobrazí
  rozsahRevize: '',

  showPristroje: false, // ← přístroje se nezobrazí
  pristroje: [],

  maRozvadece: false,
  rozvadece: [],  // ← žádné rozvaděče

  maZavady: false,
  zavady: [],     // ← žádné závady → zobrazí fallback text

  vysledek: 'SCHOPNO BEZPEČNÉHO PROVOZU',
  vysledekColor: '16a34a',
};

/* ═══════════════════════════════════════════
   KROK 3: Spustit test
   ═══════════════════════════════════════════ */

async function main() {
  const outputDir = path.resolve(__dirname);

  console.log('═══════════════════════════════════════════');
  console.log('  docxtemplater test');
  console.log('═══════════════════════════════════════════\n');

  // 1. Vytvořit šablonu
  console.log('1) Vytvářím šablonu (template.docx)...');
  const templateDoc = createTemplateDocx();
  const templateBuffer = await Packer.toBuffer(templateDoc);
  const templatePath = path.join(outputDir, 'template.docx');
  fs.writeFileSync(templatePath, templateBuffer);
  console.log(`   ✓ Šablona uložena: ${templatePath}`);
  console.log(`   ✓ Velikost: ${(templateBuffer.length / 1024).toFixed(1)} KB\n`);

  // 2. Naplnit šablonu PLNÝMI daty
  console.log('2) Vyplňuji šablonu plnými daty...');
  try {
    const zip1 = new PizZip(templateBuffer);
    const doc1 = new Docxtemplater(zip1, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter(part: any) {
        if (part.module === 'loop') return [];
        return '—';
      },
    });
    doc1.render(TEST_DATA);

    const output1 = doc1.getZip().generate({ type: 'nodebuffer' });
    const output1Path = path.join(outputDir, 'output-full.docx');
    fs.writeFileSync(output1Path, output1);
    console.log(`   ✓ Výstup uložen: ${output1Path}`);
    console.log(`   ✓ Velikost: ${(output1.length / 1024).toFixed(1)} KB`);
    console.log(`   ✓ Rozvaděče: ${TEST_DATA.rozvadece.length}`);
    console.log(`   ✓ Okruhy celkem: ${TEST_DATA.rozvadece.reduce((s, r) => s + r.okruhy.length, 0)}`);
    console.log(`   ✓ Závady: ${TEST_DATA.zavady.length}`);
    console.log(`   ✓ Přístroje: ${TEST_DATA.pristroje.length}`);
    console.log(`   ✓ Firma: ${TEST_DATA.showFirma ? 'ANO' : 'NE'}\n`);
  } catch (err: any) {
    console.error('   ✗ CHYBA:', err.message);
    if (err.properties?.errors) {
      for (const e of err.properties.errors) {
        console.error('     -', e.message);
      }
    }
    console.log('');
  }

  // 3. Naplnit šablonu PRÁZDNÝMI daty
  console.log('3) Vyplňuji šablonu prázdnými daty...');
  try {
    const zip2 = new PizZip(templateBuffer);
    const doc2 = new Docxtemplater(zip2, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter(part: any) {
        if (part.module === 'loop') return [];
        return '—';
      },
    });
    doc2.render(TEST_DATA_EMPTY);

    const output2 = doc2.getZip().generate({ type: 'nodebuffer' });
    const output2Path = path.join(outputDir, 'output-empty.docx');
    fs.writeFileSync(output2Path, output2);
    console.log(`   ✓ Výstup uložen: ${output2Path}`);
    console.log(`   ✓ Velikost: ${(output2.length / 1024).toFixed(1)} KB`);
    console.log(`   ✓ Rozvaděče: ${TEST_DATA_EMPTY.rozvadece.length} (žádné)`);
    console.log(`   ✓ Závady: ${TEST_DATA_EMPTY.zavady.length} (žádné – fallback text)`);
    console.log(`   ✓ Firma: ${TEST_DATA_EMPTY.showFirma ? 'ANO' : 'NE – blok skrytý'}`);
    console.log(`   ✓ Rozsah: ${TEST_DATA_EMPTY.showRozsah ? 'ANO' : 'NE – blok skrytý'}`);
    console.log(`   ✓ Přístroje: ${TEST_DATA_EMPTY.showPristroje ? 'ANO' : 'NE – blok skrytý'}\n`);
  } catch (err: any) {
    console.error('   ✗ CHYBA:', err.message);
    if (err.properties?.errors) {
      for (const e of err.properties.errors) {
        console.error('     -', e.message);
      }
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════');
  console.log('  HOTOVO! Otevřete soubory ve Wordu:');
  console.log('');
  console.log('  template.docx     – šablona s {tagy}');
  console.log('  output-full.docx  – plně vyplněná (3 rozvaděče, 3 závady)');
  console.log('  output-empty.docx – prázdná data (bez firmy, bez závad)');
  console.log('═══════════════════════════════════════════');
}

main().catch(console.error);
