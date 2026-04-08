/**
 * Export revizní zprávy (elektro) do DOCX
 * Používá knihovnu `docx` pro programatické generování Wordu
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle,
  Header, Footer, PageNumber,
  ShadingType, VerticalAlign, TableLayoutType,
  convertMillimetersToTwip,
} from 'docx';
import { saveAs } from 'file-saver';
import type { Revize } from '../types';
import type { ReportData } from '../pages/ReportPrint/ReportPrintPage';

/* ═══════════════════════════════════════════
   BARVY & KONSTANTY
   ═══════════════════════════════════════════ */
const BLUE = '1e40af';
const DARK = '1e293b';
const GRAY = '64748b';
const LIGHT_GRAY = 'f1f5f9';
const GREEN = '16a34a';
const RED = 'dc2626';
const AMBER = 'd97706';
const WHITE = 'ffffff';
const BORDER_COLOR = 'cbd5e1';

/* ═══════════════════════════════════════════
   POMOCNÉ FUNKCE (sdílené i pro hromosvod)
   ═══════════════════════════════════════════ */

/** Thin border definition */
export const thinBorder = {
  style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR,
};
const noBorder = { style: BorderStyle.NONE, size: 0, color: WHITE };

/** Formátovat datum */
export function fmtDate(d?: string | Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('cs-CZ');
}

/** Nadpis sekce (modrý text s dolním ohraničením) */
export function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR } },
    children: [
      new TextRun({ text, bold: true, size: 21, color: BLUE, font: 'Segoe UI' }),
    ],
  });
}

/** Běžný text */
export function textParagraph(text: string, opts?: { bold?: boolean; color?: string; size?: number; spacing?: { before?: number; after?: number } }): Paragraph {
  return new Paragraph({
    spacing: opts?.spacing ?? { before: 40, after: 40 },
    children: [
      new TextRun({
        text: text || '—',
        bold: opts?.bold,
        size: opts?.size ?? 19,
        color: opts?.color ?? DARK,
        font: 'Segoe UI',
      }),
    ],
  });
}

/** Key-value řádek (label: value) */
export function kvRow(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [
      new TextRun({ text: `${label}  `, bold: true, size: 19, color: '475569', font: 'Segoe UI' }),
      new TextRun({ text: value || '—', size: 19, color: DARK, font: 'Segoe UI' }),
    ],
  });
}

/** Key-value tabulka (2 sloupce) */
export function kvTable(rows: [string, string][]): Table {
  return new Table({
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
            children: [new TextRun({ text: v || '—', size: 19, color: DARK, font: 'Segoe UI' })],
          })],
          verticalAlign: VerticalAlign.TOP,
        }),
      ],
    })),
  });
}

/** Data tabulka s modrým headerem */
export function dataTable(columns: string[], widths: number[], rows: string[][]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: columns.map((col, i) => new TableCell({
      width: { size: widths[i], type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.SOLID, color: BLUE },
      children: [new Paragraph({
        spacing: { before: 20, after: 20 },
        children: [new TextRun({ text: col, bold: true, size: 16, color: WHITE, font: 'Segoe UI' })],
      })],
      verticalAlign: VerticalAlign.CENTER,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: '1e3a8a' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '1e3a8a' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '1e3a8a' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '1e3a8a' },
      },
    })),
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      width: { size: widths[ci], type: WidthType.PERCENTAGE },
      shading: ri % 2 === 1 ? { type: ShadingType.SOLID, color: 'f8fafc' } : undefined,
      children: [new Paragraph({
        spacing: { before: 20, after: 20 },
        children: [new TextRun({ text: cell || '—', size: 17, color: DARK, font: 'Segoe UI' })],
      })],
      verticalAlign: VerticalAlign.TOP,
      borders: {
        top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder,
      },
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [headerRow, ...dataRows],
  });
}

/** Podnadpis podsekce (šedý pozadí s modrým levým pruhem) */
export function subsectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    shading: { type: ShadingType.SOLID, color: LIGHT_GRAY },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: BLUE } },
    indent: { left: convertMillimetersToTwip(2) },
    children: [
      new TextRun({ text, bold: true, size: 19, color: '334155', font: 'Segoe UI' }),
    ],
  });
}

/** Empty line */
export function emptyLine(): Paragraph {
  return new Paragraph({ spacing: { before: 0, after: 0 }, children: [] });
}

/** Italic placeholder when no data */
export function emptyText(text = 'Nebylo vyplněno'): Paragraph {
  return new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [
      new TextRun({ text, italics: true, size: 18, color: '94a3b8', font: 'Segoe UI' }),
    ],
  });
}

/** tiskSekce helper */
export function parseTiskSekce(revize: Revize): Record<string, boolean> {
  let tiskSekce: Record<string, boolean> = {};
  if (revize.tiskSekce) {
    try { tiskSekce = JSON.parse(revize.tiskSekce); } catch { /* ok */ }
  }
  return tiskSekce;
}
export function isSekceVisible(tiskSekce: Record<string, boolean>, key: string): boolean {
  return tiskSekce[key] !== false;
}

/** Result box */
export function resultBox(label: string, value: string, color: string): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 100, after: 20 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: label, size: 20, color: '475569', font: 'Segoe UI' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 20, after: 100 },
      alignment: AlignmentType.CENTER,
      border: {
        top: { style: BorderStyle.SINGLE, size: 3, color },
        bottom: { style: BorderStyle.SINGLE, size: 3, color },
        left: { style: BorderStyle.SINGLE, size: 3, color },
        right: { style: BorderStyle.SINGLE, size: 3, color },
      },
      children: [
        new TextRun({ text: value, bold: true, size: 28, color, font: 'Segoe UI' }),
      ],
    }),
  ];
}

/** Podpisy */
export function signatureSection(technikJmeno: string, technikCislo: string, objednatel: string, datum: string): Paragraph[] {
  return [
    emptyLine(),
    new Paragraph({
      spacing: { before: 200, after: 60 },
      children: [
        new TextRun({ text: 'Revizní technik:', bold: true, size: 18, color: '475569', font: 'Segoe UI' }),
        new TextRun({ text: `    ${technikJmeno}`, size: 20, color: DARK, font: 'Segoe UI', bold: true }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({ text: `Ev. č.: ${technikCislo}`, size: 16, color: GRAY, font: 'Segoe UI' }),
      ],
    }),
    emptyLine(),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: DARK } },
      children: [new TextRun({ text: '   ', size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 20, after: 120 },
      children: [
        new TextRun({ text: 'Podpis revizního technika', size: 15, color: '94a3b8', font: 'Segoe UI' }),
      ],
    }),
    emptyLine(),
    new Paragraph({
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({ text: 'Objednatel / Provozovatel:', bold: true, size: 18, color: '475569', font: 'Segoe UI' }),
        new TextRun({ text: `    ${objednatel}`, size: 20, color: DARK, font: 'Segoe UI', bold: true }),
      ],
    }),
    emptyLine(),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: DARK } },
      children: [new TextRun({ text: '   ', size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 20, after: 120 },
      children: [
        new TextRun({ text: 'Podpis objednatele', size: 15, color: '94a3b8', font: 'Segoe UI' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 80, after: 0 },
      children: [
        new TextRun({ text: `V ...................... dne ${datum}`, size: 19, color: '475569', font: 'Segoe UI' }),
      ],
    }),
  ];
}

/* ═══════════════════════════════════════════
   HLAVNÍ EXPORT – ELEKTRO REVIZE
   ═══════════════════════════════════════════ */

export async function exportElektroToWord(data: ReportData): Promise<void> {
  const { revize, nastaveni, zakaznik, rozvadece, zavady, mistnosti, pristroje } = data;

  const tiskSekce = parseTiskSekce(revize);
  const isSekce = (key: string) => isSekceVisible(tiskSekce, key);

  let ochranaList: string[] = [];
  if (revize.ochranaOpatreni) {
    try { ochranaList = JSON.parse(revize.ochranaOpatreni); } catch { ochranaList = [revize.ochranaOpatreni]; }
  }

  const typRevizeLabel = revize.typRevize === 'výchozí' ? 'Výchozí revize' :
    revize.typRevize === 'pravidelná' ? 'Pravidelná (periodická) revize' :
    `Mimořádná revize${revize.duvodMimoradne ? ` – ${revize.duvodMimoradne}` : ''}`;

  const vysledekLabel = revize.vysledek === 'schopno' ? 'SCHOPNO BEZPEČNÉHO PROVOZU' :
    revize.vysledek === 'neschopno' ? 'NESCHOPNO BEZPEČNÉHO PROVOZU' :
    revize.vysledek === 'podmíněně schopno' ? 'PODMÍNĚNĚ SCHOPNO BEZPEČNÉHO PROVOZU' : '—';

  const vysledekColor = revize.vysledek === 'schopno' ? GREEN :
    revize.vysledek === 'neschopno' ? RED : AMBER;

  // Obsah dokumentu – sekce
  const children: (Paragraph | Table)[] = [];

  // ── NADPIS ──
  children.push(
    new Paragraph({
      spacing: { before: 200, after: 40 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ', bold: true, size: 28, color: DARK, font: 'Segoe UI' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 200 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: typRevizeLabel, bold: true, size: 22, color: '334155', font: 'Segoe UI' }),
      ],
    }),
  );

  // ── a) PROVOZOVATEL ──
  children.push(sectionTitle('a) Provozovatel (objednatel) revidovaného zařízení'));
  const provozovatelRows: [string, string][] = [
    ['Název / Jméno:', zakaznik?.nazev || revize.objednatel || '—'],
    ['Adresa / Sídlo:', zakaznik?.adresa || '—'],
  ];
  if (zakaznik?.ico) provozovatelRows.push(['IČO:', zakaznik.ico]);
  if (zakaznik?.kontaktOsoba) provozovatelRows.push(['Kontaktní osoba:', zakaznik.kontaktOsoba]);
  if (zakaznik?.telefon) provozovatelRows.push(['Telefon:', zakaznik.telefon]);
  if (zakaznik?.email) provozovatelRows.push(['E-mail:', zakaznik.email]);
  children.push(kvTable(provozovatelRows));

  // ── b) IDENTIFIKACE ──
  children.push(sectionTitle('b) Identifikace revidovaného zařízení a místo umístění'));
  children.push(kvTable([
    ['Název objektu:', revize.nazev],
    ['Adresa objektu:', revize.adresa],
  ]));

  // ── c) ROZSAH REVIZE ──
  if (isSekce('rozsahRevize')) {
    children.push(sectionTitle('c) Vymezení rozsahu revize'));
    if (revize.rozsahRevize) {
      children.push(textParagraph('Předmět revize je:', { bold: true }));
      children.push(textParagraph(revize.rozsahRevize));
    }
    if (revize.predmetNeni) {
      children.push(textParagraph('Předmětem revize není:', { bold: true }));
      children.push(textParagraph(revize.predmetNeni));
    }
    if (!revize.rozsahRevize && !revize.predmetNeni) children.push(emptyText());
  }

  // ── d) REVIZNÍ TECHNIK ──
  children.push(sectionTitle('d) Údaje o revizním technikovi'));
  const technikRows: [string, string][] = [
    ['Jméno:', nastaveni?.reviznniTechnikJmeno || '—'],
    ['Ev. číslo osvědčení:', nastaveni?.reviznniTechnikCisloOpravneni || '—'],
  ];
  if (nastaveni?.reviznniTechnikOsvedceni) technikRows.push(['Osvědčení:', nastaveni.reviznniTechnikOsvedceni]);
  if (nastaveni?.reviznniTechnikAdresa) technikRows.push(['Adresa:', nastaveni.reviznniTechnikAdresa]);
  if (nastaveni?.reviznniTechnikIco) technikRows.push(['IČO:', nastaveni.reviznniTechnikIco]);
  children.push(kvTable(technikRows));

  // ── e) DRUH REVIZE ──
  children.push(sectionTitle('e) Druh revize'));
  children.push(textParagraph(typRevizeLabel, { bold: true }));

  // ── f) DŮLEŽITÁ DATA ──
  children.push(sectionTitle('f) Důležitá data'));
  const dataRows: [string, string][] = [
    ['Datum provedení revize:', fmtDate(revize.datum)],
  ];
  if (revize.datumDokonceni) dataRows.push(['Datum dokončení:', fmtDate(revize.datumDokonceni)]);
  if (revize.datumVypracovani) dataRows.push(['Datum vypracování zprávy:', fmtDate(revize.datumVypracovani)]);
  if (revize.datumPlatnosti) dataRows.push(['Platnost do:', fmtDate(revize.datumPlatnosti)]);
  dataRows.push(['Lhůta příští revize:', `${revize.termin} měsíců`]);
  children.push(kvTable(dataRows));

  // ── CHARAKTERISTIKA ──
  if (isSekce('charakteristika') && (revize.napetovaSoustava || ochranaList.length > 0)) {
    children.push(sectionTitle('Charakteristika revidovaného zařízení'));
    const charRows: [string, string][] = [];
    if (revize.napetovaSoustava) charRows.push(['Napěťová soustava:', revize.napetovaSoustava]);
    if (ochranaList.length > 0) charRows.push(['Ochrana před úrazem:', ochranaList.join(', ')]);
    children.push(kvTable(charRows));
  }

  // ── g) PŘÍSTROJE ──
  if (isSekce('pristroje')) {
    children.push(sectionTitle('g) Soupis použitých měřicích přístrojů'));
    if (pristroje.length > 0) {
      children.push(dataTable(
        ['Název', 'Výrobce / Model', 'Výr. číslo', 'Kalibrace', 'Platnost'],
        [25, 25, 20, 15, 15],
        pristroje.map(p => [
          p.nazev,
          `${p.vyrobce} ${p.model}`.trim(),
          p.vyrobniCislo,
          fmtDate(p.datumKalibrace),
          fmtDate(p.platnostKalibrace),
        ]),
      ));
    } else {
      children.push(emptyText('Žádné přístroje nebyly přiřazeny'));
    }
  }

  // ── h) PODKLADY ──
  if (isSekce('podklady')) {
    children.push(sectionTitle('h) Seznam podkladů použitých k provedení revize'));
    children.push(revize.podklady ? textParagraph(revize.podklady) : emptyText());
  }

  // ── i) PROVEDENÉ ÚKONY ──
  if (isSekce('provedeneUkony')) {
    children.push(sectionTitle('i) Soupis provedených úkonů'));
    children.push(revize.provedeneUkony ? textParagraph(revize.provedeneUkony) : emptyText());
  }

  // ── j) ROZVADĚČE A OKRUHY ──
  children.push(sectionTitle('j) Naměřené hodnoty – Rozvaděče a okruhy'));
  if (rozvadece.length > 0) {
    for (const roz of rozvadece) {
      let title = `${roz.nazev} (${roz.oznaceni}) – ${roz.umisteni}`;
      if (roz.typRozvadece) title += ` | ${roz.typRozvadece}`;
      if (roz.stupenKryti) title += ` | ${roz.stupenKryti}`;
      children.push(subsectionTitle(title));

      if (roz.okruhy.length > 0) {
        children.push(dataTable(
          ['Č.', 'Jistič', 'Název okruhu', 'Vodič', 'Iz [MΩ]', 'Zs [Ω]'],
          [5, 10, 30, 15, 20, 20],
          roz.okruhy.map(o => [
            String(o.cislo),
            `${o.jisticTyp}${o.jisticProud}`,
            o.nazev,
            o.vodic,
            o.izolacniOdpor != null ? String(o.izolacniOdpor) : '—',
            o.impedanceSmycky != null ? String(o.impedanceSmycky) : '—',
          ]),
        ));
      } else {
        children.push(emptyText('Žádné okruhy'));
      }
    }
  } else {
    children.push(emptyText('Žádné rozvaděče'));
  }

  // ── MÍSTNOSTI A ZAŘÍZENÍ ──
  if (mistnosti.length > 0) {
    children.push(sectionTitle('Místnosti a zařízení'));
    for (const m of mistnosti) {
      let title = m.nazev;
      if (m.patro) title += ` (${m.patro})`;
      if (m.typ) title += ` – ${m.typ}`;
      children.push(subsectionTitle(title));

      if (m.zarizeniList.length > 0) {
        children.push(dataTable(
          ['Zařízení', 'Označení', 'Ks', 'Třída', 'Příkon [W]', 'Ochrana', 'Stav'],
          [22, 13, 7, 8, 12, 20, 18],
          m.zarizeniList.map(z => [
            z.nazev,
            z.oznaceni || '—',
            String(z.pocetKs),
            z.trida,
            z.prikonW != null ? String(z.prikonW) : '—',
            z.ochranaPredDotykem || '—',
            z.stav === 'OK' ? '✓ OK' : z.stav === 'závada' ? '✗ Závada' : '—',
          ]),
        ));
      } else {
        children.push(emptyText('Žádná zařízení'));
      }
    }
  }

  // ── k) ZÁVADY ──
  children.push(sectionTitle('k) Přehled zjištěných závad'));
  if (zavady.length > 0) {
    children.push(dataTable(
      ['#', 'Popis závady', 'Závažnost', 'Stav', 'Zjištěna'],
      [5, 45, 15, 15, 20],
      zavady.map((z, i) => [
        String(i + 1),
        z.popis,
        z.zavaznost === 'C1' ? 'C1 – Kritická' : z.zavaznost === 'C2' ? 'C2 – Vážná' : 'C3 – Méně závažná',
        z.stav === 'otevřená' ? 'Otevřená' : z.stav === 'v řešení' ? 'V řešení' : 'Vyřešená',
        fmtDate(z.datumZjisteni),
      ]),
    ));
  } else {
    children.push(textParagraph('Při revizi nebyly zjištěny žádné závady.', { bold: true }));
  }

  // ── m) VYHODNOCENÍ PŘEDCHOZÍCH ──
  if (isSekce('vyhodnoceniPredchozich')) {
    children.push(sectionTitle('m) Vyhodnocení předchozích revizí'));
    children.push(revize.vyhodnoceniPredchozich ? textParagraph(revize.vyhodnoceniPredchozich) : emptyText());
  }

  // ── l) ZÁVĚREČNÉ ZHODNOCENÍ ──
  children.push(sectionTitle('l) Závěrečné zhodnocení'));
  children.push(...resultBox('Revidované elektrické zařízení je:', vysledekLabel, vysledekColor));
  if (isSekce('vysledekOduvodneni') && revize.vysledekOduvodneni) {
    children.push(textParagraph('Odůvodnění:', { bold: true }));
    children.push(textParagraph(revize.vysledekOduvodneni));
  }
  if (isSekce('zaver') && revize.zaver) {
    children.push(textParagraph('Závěr:', { bold: true }));
    children.push(textParagraph(revize.zaver));
  }

  // ── n) LHŮTA ──
  children.push(sectionTitle('n) Doporučená lhůta provedení příští revize'));
  children.push(textParagraph(
    `Příští revize by měla být provedena nejpozději do ${revize.datumPlatnosti ? fmtDate(revize.datumPlatnosti) : `${revize.termin} měsíců od data provedení`}.`,
  ));

  // ── o) PODPISY ──
  children.push(sectionTitle('o) Potvrzení o předání zprávy'));
  children.push(...signatureSection(
    nastaveni?.reviznniTechnikJmeno || '—',
    nastaveni?.reviznniTechnikCisloOpravneni || '—',
    zakaznik?.kontaktOsoba || zakaznik?.nazev || revize.objednatel || '—',
    fmtDate(revize.datumVypracovani) !== '—' ? fmtDate(revize.datumVypracovani) : fmtDate(new Date()),
  ));

  // ── SESTAVIT DOCX ──
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Segoe UI', size: 20 },
        },
      },
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
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR } },
              spacing: { after: 60 },
              children: [
                new TextRun({ text: `Zpráva č. ${revize.cisloRevize}`, bold: true, size: 16, color: BLUE, font: 'Segoe UI' }),
                new TextRun({ text: `     ${revize.nazev} – ${revize.adresa}`, size: 16, color: GRAY, font: 'Segoe UI' }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' } },
              spacing: { before: 60 },
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: nastaveni?.firmaJmeno || '', size: 15, color: '94a3b8', font: 'Segoe UI' }),
                new TextRun({ text: '     Revizní zpráva     Strana ', size: 15, color: '94a3b8', font: 'Segoe UI' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 15, color: '94a3b8', font: 'Segoe UI' }),
                new TextRun({ text: ' / ', size: 15, color: '94a3b8', font: 'Segoe UI' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: '94a3b8', font: 'Segoe UI' }),
              ],
            }),
          ],
        }),
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Revize_${revize.cisloRevize.replace(/[/\\:*?"<>|]/g, '_')}.docx`);
}
