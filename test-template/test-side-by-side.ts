/**
 * ═══════════════════════════════════════════════════════════════
 *  Test: Dvě tabulky vedle sebe, pravá se skrývá
 *  Spuštění: cd test-template && npx tsx test-side-by-side.ts
 * ═══════════════════════════════════════════════════════════════
 *
 *  Demonstruje:
 *   - Layoutová tabulka (neviditelná) s 2 buňkami vedle sebe
 *   - Levá buňka: Revizní technik (vždy viditelný)
 *   - Pravá buňka: Firma ({#showFirma}...{/showFirma})
 *   - Varianta 1: firma viditelná → dvě tabulky vedle sebe
 *   - Varianta 2: firma skrytá → jen technik na celou šířku
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle,
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
const RED = 'dc2626';
const GREEN = '16a34a';

const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: BORDER };
const noBorder = { style: BorderStyle.NONE, size: 0, color: WHITE };

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

// Nadpis sekce
function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER } },
    children: [new TextRun({ text, bold: true, size: 22, color: BLUE, font: 'Segoe UI' })],
  });
}

// Textový odstavec
function p(text: string, opts?: { bold?: boolean; size?: number; color?: string; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; spacing?: { before?: number; after?: number } }): Paragraph {
  return new Paragraph({
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
}

// Key-value tabulka (viditelná, s ohraničením)
function kvTableVisible(rows: [string, string][], headerBg: string = BLUE, headerColor: string = WHITE): Table {
  const headerRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 2,
        shading: { type: ShadingType.SOLID, color: headerBg },
        children: [new Paragraph({
          spacing: { before: 30, after: 30 },
          children: [new TextRun({ text: rows[0][0], bold: true, size: 18, color: headerColor, font: 'Segoe UI' })],
        })],
        borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
      }),
    ],
  });

  const dataRows = rows.slice(1).map(([k, v]) => new TableRow({
    children: [
      new TableCell({
        width: { size: 40, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          spacing: { before: 20, after: 20 },
          children: [new TextRun({ text: k, bold: true, size: 18, color: '475569', font: 'Segoe UI' })],
        })],
        borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
        verticalAlign: VerticalAlign.TOP,
      }),
      new TableCell({
        width: { size: 60, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          spacing: { before: 20, after: 20 },
          children: [new TextRun({ text: v, size: 18, color: DARK, font: 'Segoe UI' })],
        })],
        borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
        verticalAlign: VerticalAlign.TOP,
      }),
    ],
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [headerRow, ...dataRows],
  });
}

/* ═══════════════════════════════════════════
   ŠABLONA
   ═══════════════════════════════════════════ */

function createTemplate(): Document {
  // ── TECHNIK tabulka (vždy viditelná) ──
  const technikTable = kvTableVisible([
    ['REVIZNÍ TECHNIK', ''],
    ['Jméno:', '{technik_jmeno}'],
    ['Ev. číslo:', '{technik_cislo}'],
    ['Osvědčení:', '{technik_osvedceni}'],
    ['Adresa:', '{technik_adresa}'],
    ['Telefon:', '{technik_telefon}'],
  ]);

  // ── FIRMA tabulka (volitelná) ──
  const firmaTable = kvTableVisible([
    ['FIRMA PROVÁDĚJÍCÍ REVIZI', ''],
    ['Název:', '{firma_nazev}'],
    ['Adresa:', '{firma_adresa}'],
    ['IČO:', '{firma_ico}'],
    ['DIČ:', '{firma_dic}'],
    ['Telefon:', '{firma_telefon}'],
  ], '047857', WHITE); // zelený header pro odlišení

  // ── LAYOUT TABULKA – drží obě tabulky vedle sebe ──
  // Vnější tabulka BEZ ohraničení, 1 řádek, 2 buňky
  const sideBySideLayout = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
      insideHorizontal: noBorder, insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        children: [
          // LEVÁ buňka – Technik (vždy)
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              technikTable,
            ],
            verticalAlign: VerticalAlign.TOP,
          }),
          // Mezera
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [p('')],
          }),
          // PRAVÁ buňka – Firma (podmíněná)
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              p('{#showFirma}', { size: 16, color: RED, bold: true }),
              firmaTable,
              p('{/showFirma}', { size: 16, color: RED, bold: true }),
            ],
            verticalAlign: VerticalAlign.TOP,
          }),
        ],
      }),
    ],
  });

  // ── ZÁKAZNÍK + OBJEKT vedle sebe ──
  const zakaznikTable = kvTableVisible([
    ['OBJEDNATEL / PROVOZOVATEL', ''],
    ['Název:', '{zakaznik_nazev}'],
    ['Adresa:', '{zakaznik_adresa}'],
    ['IČO:', '{zakaznik_ico}'],
    ['Kontakt:', '{zakaznik_kontakt}'],
  ]);

  const objektTable = kvTableVisible([
    ['REVIDOVANÝ OBJEKT', ''],
    ['Název:', '{objekt_nazev}'],
    ['Adresa:', '{objekt_adresa}'],
    ['Typ revize:', '{typRevize}'],
    ['Datum:', '{datum}'],
  ], '7c3aed', WHITE); // fialový header

  const zakaznikObjektLayout = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
      insideHorizontal: noBorder, insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [zakaznikTable],
            verticalAlign: VerticalAlign.TOP,
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [p('')],
          }),
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [objektTable],
            verticalAlign: VerticalAlign.TOP,
          }),
        ],
      }),
    ],
  });

  // ── PODPISY vedle sebe – technik + objednatel ──
  const podpisyLayout = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
      insideHorizontal: noBorder, insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        children: [
          // Levá – technik podpis
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 20 },
                children: [new TextRun({ text: 'Revizní technik:', bold: true, size: 18, color: '475569', font: 'Segoe UI' })],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [new TextRun({ text: '{technik_jmeno}', bold: true, size: 20, color: DARK, font: 'Segoe UI' })],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [new TextRun({ text: 'Ev. č.: {technik_cislo}', size: 16, color: GRAY, font: 'Segoe UI' })],
              }),
              p(''),
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: DARK } },
                children: [new TextRun({ text: '   ', size: 20 })],
              }),
              new Paragraph({
                spacing: { before: 20, after: 0 },
                children: [new TextRun({ text: 'Podpis revizního technika', size: 15, color: '94a3b8', font: 'Segoe UI' })],
              }),
            ],
            verticalAlign: VerticalAlign.TOP,
          }),
          // Mezera
          new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [p('')],
          }),
          // Pravá – objednatel podpis
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 20 },
                children: [new TextRun({ text: 'Objednatel / Provozovatel:', bold: true, size: 18, color: '475569', font: 'Segoe UI' })],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [new TextRun({ text: '{zakaznik_kontakt}', bold: true, size: 20, color: DARK, font: 'Segoe UI' })],
              }),
              p(''),
              p(''),
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: DARK } },
                children: [new TextRun({ text: '   ', size: 20 })],
              }),
              new Paragraph({
                spacing: { before: 20, after: 0 },
                children: [new TextRun({ text: 'Podpis objednatele', size: 15, color: '94a3b8', font: 'Segoe UI' })],
              }),
            ],
            verticalAlign: VerticalAlign.TOP,
          }),
        ],
      }),
    ],
  });

  // ── DOKUMENT ──
  return new Document({
    styles: { default: { document: { run: { font: 'Segoe UI', size: 20 } } } },
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
      children: [
        // NADPIS
        p('ZPRÁVA O REVIZI ELEKTRICKÉHO ZAŘÍZENÍ', {
          bold: true, size: 28, alignment: AlignmentType.CENTER, color: DARK,
          spacing: { before: 200, after: 40 },
        }),
        p('{typRevize}', {
          bold: true, size: 22, alignment: AlignmentType.CENTER, color: '334155',
          spacing: { before: 0, after: 40 },
        }),
        p('Zpráva č. {cisloRevize}', {
          bold: true, size: 20, alignment: AlignmentType.CENTER, color: BLUE,
          spacing: { before: 0, after: 200 },
        }),

        // ── TECHNIK + FIRMA vedle sebe ──
        sectionTitle('Revizní technik a firma'),
        sideBySideLayout,

        // ── ZÁKAZNÍK + OBJEKT vedle sebe ──
        sectionTitle('Objednatel a revidovaný objekt'),
        zakaznikObjektLayout,

        // ── VÝSLEDEK ──
        sectionTitle('Výsledek revize'),
        p('Revidované elektrické zařízení je:', {
          alignment: AlignmentType.CENTER, color: '475569',
          spacing: { before: 100, after: 40 },
        }),
        p('{vysledek}', {
          bold: true, size: 28, alignment: AlignmentType.CENTER, color: DARK,
          spacing: { before: 20, after: 120 },
        }),

        // ── PODPISY vedle sebe ──
        sectionTitle('Potvrzení o předání zprávy'),
        p('V ...................... dne {datumVypracovani}', { color: '475569' }),
        p(''),
        podpisyLayout,
      ],
    }],
  });
}

/* ═══════════════════════════════════════════
   TESTOVACÍ DATA
   ═══════════════════════════════════════════ */

const DATA_WITH_FIRMA = {
  cisloRevize: 'REV-2026/0042',
  typRevize: 'Pravidelná (periodická) revize',
  datum: '10.03.2026',
  datumVypracovani: '11.03.2026',

  // Technik – vždy viditelný
  technik_jmeno: 'Ing. Jan Novák',
  technik_cislo: '1234/E-5/2020',
  technik_osvedceni: 'TIČR – E2A, E2B',
  technik_adresa: 'Revizní 42, Praha 5',
  technik_telefon: '+420 777 123 456',

  // Firma – VIDITELNÁ
  showFirma: true,
  firma_nazev: 'ElektroRevize s.r.o.',
  firma_adresa: 'Technická 8, Praha 6',
  firma_ico: '12345678',
  firma_dic: 'CZ12345678',
  firma_telefon: '+420 222 333 444',

  // Zákazník
  zakaznik_nazev: 'SVJ Zahradní 15',
  zakaznik_adresa: 'Zahradní 15, Praha 2',
  zakaznik_ico: '27456789',
  zakaznik_kontakt: 'Petr Svoboda',

  // Objekt
  objekt_nazev: 'Bytový dům Zahradní 15',
  objekt_adresa: 'Zahradní 15, 120 00 Praha 2',

  vysledek: 'SCHOPNO BEZPEČNÉHO PROVOZU',
};

const DATA_WITHOUT_FIRMA = {
  ...DATA_WITH_FIRMA,
  cisloRevize: 'REV-2026/0099',

  // Firma – SKRYTÁ
  showFirma: false,
  firma_nazev: '',
  firma_adresa: '',
  firma_ico: '',
  firma_dic: '',
  firma_telefon: '',
};

/* ═══════════════════════════════════════════
   SPUŠTĚNÍ
   ═══════════════════════════════════════════ */

async function main() {
  const dir = path.resolve(__dirname);

  console.log('═══════════════════════════════════════════');
  console.log('  Test: tabulky vedle sebe + skrývání');
  console.log('═══════════════════════════════════════════\n');

  // 1. Vytvořit šablonu
  console.log('1) Vytvářím šablonu...');
  const templateDoc = createTemplate();
  const templateBuf = await Packer.toBuffer(templateDoc);
  const templatePath = path.join(dir, 'template-sidebyside.docx');
  fs.writeFileSync(templatePath, templateBuf);
  console.log(`   ✓ ${templatePath} (${(templateBuf.length / 1024).toFixed(1)} KB)\n`);

  // 2. S firmou
  console.log('2) Vyplňuji S FIRMOU...');
  try {
    const zip1 = new PizZip(templateBuf);
    const doc1 = new Docxtemplater(zip1, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter(part: any) {
        if (part.module === 'loop') return [];
        return '—';
      },
    });
    doc1.render(DATA_WITH_FIRMA);
    const out1 = doc1.getZip().generate({ type: 'nodebuffer' });
    const out1Path = path.join(dir, 'output-with-firma.docx');
    fs.writeFileSync(out1Path, out1);
    console.log(`   ✓ ${out1Path} (${(out1.length / 1024).toFixed(1)} KB)`);
    console.log(`   ✓ Firma: VIDITELNÁ (${DATA_WITH_FIRMA.firma_nazev})\n`);
  } catch (err: any) {
    console.error('   ✗ CHYBA:', err.message);
    if (err.properties?.errors) err.properties.errors.forEach((e: any) => console.error('     -', e.message));
  }

  // 3. Bez firmy
  console.log('3) Vyplňuji BEZ FIRMY...');
  try {
    const zip2 = new PizZip(templateBuf);
    const doc2 = new Docxtemplater(zip2, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter(part: any) {
        if (part.module === 'loop') return [];
        return '—';
      },
    });
    doc2.render(DATA_WITHOUT_FIRMA);
    const out2 = doc2.getZip().generate({ type: 'nodebuffer' });
    const out2Path = path.join(dir, 'output-without-firma.docx');
    fs.writeFileSync(out2Path, out2);
    console.log(`   ✓ ${out2Path} (${(out2.length / 1024).toFixed(1)} KB)`);
    console.log(`   ✓ Firma: SKRYTÁ (pravá buňka prázdná)\n`);
  } catch (err: any) {
    console.error('   ✗ CHYBA:', err.message);
    if (err.properties?.errors) err.properties.errors.forEach((e: any) => console.error('     -', e.message));
  }

  console.log('═══════════════════════════════════════════');
  console.log('  HOTOVO! Porovnejte ve Wordu:');
  console.log('');
  console.log('  template-sidebyside.docx  – šablona s {#showFirma}');
  console.log('  output-with-firma.docx    – technik + firma vedle sebe');
  console.log('  output-without-firma.docx – jen technik, firma zmizela');
  console.log('═══════════════════════════════════════════');
}

main().catch(console.error);
