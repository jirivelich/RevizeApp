/**
 * Excel export pro protokol ověření strojního zařízení
 * Používá ExcelJS – plná podpora stylů, ohraničení, barev, merge, tisk
 * Výstup: profesionální formulář vhodný pro předání zákazníkovi
 */
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// ── Barvy (ARGB – ExcelJS s FF prefixem) ──
const DARK = 'FF2A2825';
const WHITE = 'FFFFFFFF';
const ACCENT = 'FFC84B2F';
const GREEN = 'FF4A7C59';
const LABEL_BG = 'FFEDE9E2';
const HDR_BG = 'FFD9D9D9';
const MUTED = 'FF6B6760';
const TEXT_CLR = 'FF1A1816';
const BORDER_CLR = 'FFC8C4BC';
const EVEN_ROW = 'FFFAF9F7';

const thin: ExcelJS.Border = { style: 'thin', color: { argb: BORDER_CLR } };
const allBorders: Partial<ExcelJS.Borders> = { top: thin, bottom: thin, left: thin, right: thin };

// ── ExcelJS Font helpers ──
const fontLabel: Partial<ExcelJS.Font> = { bold: true, size: 9, color: { argb: MUTED }, name: 'Segoe UI' };
const fontValue: Partial<ExcelJS.Font> = { size: 10, color: { argb: TEXT_CLR }, name: 'Segoe UI' };
const fontHdr: Partial<ExcelJS.Font> = { bold: true, size: 9, color: { argb: MUTED }, name: 'Segoe UI' };
const fontSection: Partial<ExcelJS.Font> = { bold: true, size: 11, color: { argb: WHITE }, name: 'Segoe UI' };
const fontTitle: Partial<ExcelJS.Font> = { bold: true, size: 14, color: { argb: WHITE }, name: 'Segoe UI' };
const fontData: Partial<ExcelJS.Font> = { size: 9, color: { argb: TEXT_CLR }, name: 'Segoe UI' };

const fillLabel: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LABEL_BG } };
const fillSection: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
const fillTitle: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
const fillHdr: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HDR_BG } };
const fillEven: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EVEN_ROW } };

const COLS = 6; // Počet sloupců A–F

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function exportStrojniExcel(data: any): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'RevizeApp';
  wb.created = new Date();

  const ws = wb.addWorksheet('Protokol', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
    properties: { defaultRowHeight: 16 },
  });

  // Šířky sloupců
  ws.columns = [
    { width: 36 }, // A
    { width: 24 }, // B
    { width: 20 }, // C
    { width: 20 }, // D
    { width: 14 }, // E
    { width: 20 }, // F
  ];

  let r = 1;

  // ═══════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════

  /** Tmavá sloučená sekce přes celou šířku */
  function sectionRow(title: string) {
    ws.mergeCells(r, 1, r, COLS);
    const cell = ws.getCell(r, 1);
    cell.value = title;
    cell.font = fontSection;
    cell.fill = fillSection;
    cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    cell.border = allBorders;
    ws.getRow(r).height = 22;
    r++;
  }

  /** Label + hodnota key-value řádek */
  function kvRow(label: string, value: string) {
    const cellA = ws.getCell(r, 1);
    cellA.value = label;
    cellA.font = fontLabel;
    cellA.fill = fillLabel;
    cellA.alignment = { vertical: 'middle', wrapText: true };
    cellA.border = allBorders;

    ws.mergeCells(r, 2, r, COLS);
    const cellB = ws.getCell(r, 2);
    cellB.value = value || '';
    cellB.font = fontValue;
    cellB.alignment = { vertical: 'middle', wrapText: true };
    cellB.border = allBorders;

    ws.getRow(r).height = 18;
    r++;
  }

  /** Záhlaví tabulky */
  function tableHeader(headers: string[]) {
    for (let c = 0; c < headers.length; c++) {
      const cell = ws.getCell(r, c + 1);
      cell.value = headers[c];
      cell.font = fontHdr;
      cell.fill = fillHdr;
      cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      cell.border = allBorders;
    }
    // Pokud méně sloupců než COLS, sloučit extras
    if (headers.length < COLS) {
      ws.mergeCells(r, headers.length, r, COLS);
    }
    ws.getRow(r).height = 20;
    r++;
  }

  /** Datový řádek tabulky */
  function tableRow(values: string[], even: boolean) {
    for (let c = 0; c < values.length; c++) {
      const cell = ws.getCell(r, c + 1);
      cell.value = values[c];
      cell.font = fontData;
      if (even) cell.fill = fillEven;
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = allBorders;
    }
    // Merge extras
    if (values.length < COLS) {
      for (let c = values.length + 1; c <= COLS; c++) {
        const cell = ws.getCell(r, c);
        cell.border = allBorders;
        if (even) cell.fill = fillEven;
      }
    }
    r++;
  }

  /** Prázdný oddělovací řádek */
  function emptyRow() {
    ws.getRow(r).height = 8;
    r++;
  }

  // ═══════════════════════════════════════════════
  // TITULEK
  // ═══════════════════════════════════════════════
  ws.mergeCells(r, 1, r, COLS);
  const titleCell = ws.getCell(r, 1);
  titleCell.value = 'ZPRÁVA O OVĚŘENÍ STROJNÍHO ZAŘÍZENÍ';
  titleCell.font = fontTitle;
  titleCell.fill = fillTitle;
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = allBorders;
  ws.getRow(r).height = 30;
  r++;

  kvRow('Číslo protokolu:', data.cisloProtokolu || '');
  emptyRow();

  // ═══════════════════════════════════════════════
  // 01 – REVIZNÍ TECHNIK
  // ═══════════════════════════════════════════════
  sectionRow('01  REVIZNÍ TECHNIK');
  kvRow('Jméno a příjmení', data.rtJmeno);
  kvRow('Číslo oprávnění', data.rtOpravneni);
  kvRow('Číslo osvědčení', data.rtOsvedceni);
  kvRow('Adresa / IČO', data.rtAdresa);
  kvRow('Telefon', data.rtTel);
  kvRow('E-mail', data.rtEmail);
  emptyRow();

  // ═══════════════════════════════════════════════
  // 02 – OBJEDNATEL
  // ═══════════════════════════════════════════════
  sectionRow('02  OBJEDNATEL');
  kvRow('Název / jméno', data.objNazev);
  kvRow('IČO', data.objIco);
  kvRow('Adresa', data.objAdresa);
  kvRow('Kontaktní osoba', data.objKontakt);
  kvRow('Telefon / E-mail', data.objTel);
  emptyRow();

  // ═══════════════════════════════════════════════
  // 03 – MÍSTO OVĚŘENÍ
  // ═══════════════════════════════════════════════
  sectionRow('03  MÍSTO OVĚŘENÍ');
  kvRow('Adresa', data.mistoAdresa);
  kvRow('Hala / pracoviště', data.mistoHala);
  kvRow('Datum ověření', data.mistoDatum
    ? new Date(data.mistoDatum).toLocaleDateString('cs-CZ')
    : '');
  kvRow('Číslo zakázky', data.mistoZakazka);
  emptyRow();

  // ═══════════════════════════════════════════════
  // 04 – IDENTIFIKACE STROJE
  // ═══════════════════════════════════════════════
  sectionRow('04  IDENTIFIKACE STROJNÍHO ZAŘÍZENÍ – ŠTÍTEK');
  kvRow('Název / typ', data.strojNazev);
  kvRow('Výrobní číslo (SN)', data.strojSn);
  kvRow('Výrobce', data.strojVyrobce);
  kvRow('Rok výroby', data.strojRok);
  kvRow('Napájení (V/Hz)', data.strojNapajeni);
  kvRow('Příkon (kW)', data.strojPrikon);
  kvRow('Jmenovitý proud (A)', data.strojProud);
  kvRow('Stupeň ochrany IP', data.strojIp);
  kvRow('Třída ochrany', data.strojTrida);
  kvRow('CE / Prohlášení o shodě', data.strojCe);
  emptyRow();

  // ═══════════════════════════════════════════════
  // 05 – JIŠTĚNÍ
  // ═══════════════════════════════════════════════
  sectionRow('05  JIŠTĚNÍ STROJNÍHO ZAŘÍZENÍ');
  tableHeader(['Prvek jištění', 'Typ / označení', 'Jmenovitá hodnota', 'Charakteristika', 'Stav', 'Poznámka']);
  (data.jisteni || []).forEach((row: { nazev: string; typ: string; hodnota: string; charakteristika: string; stav: string; poznamka: string }, i: number) => {
    tableRow([row.nazev, row.typ, row.hodnota, row.charakteristika, row.stav, row.poznamka], i % 2 === 1);
  });
  emptyRow();

  // ═══════════════════════════════════════════════
  // 06 – IZOLAČNÍ ODPOR
  // ═══════════════════════════════════════════════
  sectionRow('06  MĚŘENÍ IZOLAČNÍHO ODPORU (ČSN EN 60204-1)');
  tableHeader(['Měřené místo / obvod', 'Zkušební napětí (V)', 'Naměřená hodnota (MΩ)', 'Požadavek (min.)', 'Výsledek', 'Poznámka']);
  (data.izolace || []).forEach((row: { misto: string; napeti: string; hodnota: string; pozadavek: string; vysledek: string; poznamka: string }, i: number) => {
    tableRow([row.misto, row.napeti, row.hodnota, row.pozadavek, row.vysledek, row.poznamka], i % 2 === 1);
  });
  emptyRow();

  // ═══════════════════════════════════════════════
  // 07 – SPOJITOST PE
  // ═══════════════════════════════════════════════
  sectionRow('07  MĚŘENÍ SPOJITOSTI OCHRANNÝCH VODIČŮ (PE)');
  tableHeader(['Měřené místo', 'Proud zkoušky (A)', 'Naměřený odpor (Ω)', 'Požadavek', 'Výsledek', 'Poznámka']);
  (data.spojitost || []).forEach((row: { misto: string; proud: string; hodnota: string; pozadavek: string; vysledek: string; poznamka: string }, i: number) => {
    tableRow([row.misto, row.proud, row.hodnota, row.pozadavek, row.vysledek, row.poznamka], i % 2 === 1);
  });
  emptyRow();

  // ═══════════════════════════════════════════════
  // 08 – RCD
  // ═══════════════════════════════════════════════
  sectionRow('08  MĚŘENÍ PROUDOVÝCH CHRÁNIČŮ (RCD)');
  tableHeader(['Označení RCD', 'IΔn (mA)', 'Typ (AC/A/B)', 'Čas vybavení (ms)', 'Limit (ms)', 'Výsledek']);
  (data.rcd || []).forEach((row: { nazev: string; idn: string; typ: string; cas: string; limit: string; vysledek: string }, i: number) => {
    tableRow([row.nazev, row.idn, row.typ, row.cas, row.limit, row.vysledek], i % 2 === 1);
  });
  emptyRow();

  // ═══════════════════════════════════════════════
  // 09 – FUNKČNÍ KONTROLY
  // ═══════════════════════════════════════════════
  sectionRow('09  FUNKČNÍ KONTROLY');
  tableHeader(['Kontrolovaný prvek', 'Výsledek', 'Poznámka']);
  (data.kontroly || []).forEach((row: { nazev: string; vysledek: string; poznamka: string }, i: number) => {
    // Sloučit sloupec Poznámka přes C–F
    const rr = r;
    const cellA = ws.getCell(rr, 1);
    cellA.value = row.nazev;
    cellA.font = fontData;
    if (i % 2 === 1) cellA.fill = fillEven;
    cellA.alignment = { vertical: 'middle', wrapText: true };
    cellA.border = allBorders;

    const cellB = ws.getCell(rr, 2);
    cellB.value = row.vysledek;
    cellB.font = fontData;
    if (i % 2 === 1) cellB.fill = fillEven;
    cellB.alignment = { horizontal: 'center', vertical: 'middle' };
    cellB.border = allBorders;

    ws.mergeCells(rr, 3, rr, COLS);
    const cellC = ws.getCell(rr, 3);
    cellC.value = row.poznamka;
    cellC.font = fontData;
    if (i % 2 === 1) cellC.fill = fillEven;
    cellC.alignment = { vertical: 'middle', wrapText: true };
    cellC.border = allBorders;

    r++;
  });
  emptyRow();

  // ═══════════════════════════════════════════════
  // 10 – MĚŘICÍ PŘÍSTROJE
  // ═══════════════════════════════════════════════
  sectionRow('10  POUŽITÉ MĚŘICÍ PŘÍSTROJE');
  tableHeader(['Přístroj / typ', 'Výrobní číslo', 'Kalibrován do', 'Třída přesnosti', 'Poznámka']);
  (data.pristroje || []).forEach((row: { typ: string; sn: string; kalibrace: string; trida: string; poznamka: string }, i: number) => {
    // 5 hodnot, merge E+F pro Poznámka
    const rr = r;
    const vals = [row.typ, row.sn, row.kalibrace, row.trida];
    for (let c = 0; c < vals.length; c++) {
      const cell = ws.getCell(rr, c + 1);
      cell.value = vals[c];
      cell.font = fontData;
      if (i % 2 === 1) cell.fill = fillEven;
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = allBorders;
    }
    ws.mergeCells(rr, 5, rr, COLS);
    const cellE = ws.getCell(rr, 5);
    cellE.value = row.poznamka;
    cellE.font = fontData;
    if (i % 2 === 1) cellE.fill = fillEven;
    cellE.alignment = { vertical: 'middle', wrapText: true };
    cellE.border = allBorders;
    r++;
  });
  emptyRow();

  // ═══════════════════════════════════════════════
  // 11 – POSUDEK
  // ═══════════════════════════════════════════════
  sectionRow('11  POSUDEK');

  // Verdikt
  const verdictText = data.verdikt === 'pass'
    ? '✓  VYHOVUJE'
    : data.verdikt === 'fail'
      ? '✗  NEVYHOVUJE – vyžadována nápravná opatření'
      : '';
  const verdictColor = data.verdikt === 'pass' ? GREEN : data.verdikt === 'fail' ? ACCENT : MUTED;
  const verdictBg = data.verdikt === 'pass' ? 'FFE8F4EC' : data.verdikt === 'fail' ? 'FFFCECEA' : 'FFF4F2EE';

  ws.mergeCells(r, 1, r, COLS);
  const verdCell = ws.getCell(r, 1);
  verdCell.value = verdictText;
  verdCell.font = { bold: true, size: 13, color: { argb: verdictColor }, name: 'Segoe UI' };
  verdCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: verdictBg } };
  verdCell.alignment = { horizontal: 'center', vertical: 'middle' };
  verdCell.border = {
    top: { style: 'medium', color: { argb: verdictColor } },
    bottom: { style: 'medium', color: { argb: verdictColor } },
    left: { style: 'medium', color: { argb: verdictColor } },
    right: { style: 'medium', color: { argb: verdictColor } },
  };
  ws.getRow(r).height = 28;
  r++;

  kvRow('Zjištěné závady / nedostatky', data.posudekZavady);
  kvRow('Doporučení / termín odstranění závad', data.posudekDoporuceni);
  kvRow('Použité normy a předpisy', data.posudekNormy);
  emptyRow();
  emptyRow();

  // Podpisy
  const cellS1 = ws.getCell(r, 1);
  cellS1.value = '';
  ws.mergeCells(r, 1, r, 3);
  ws.getCell(r, 1).border = { bottom: { style: 'thin', color: { argb: MUTED } } };
  ws.mergeCells(r, 4, r, COLS);
  ws.getCell(r, 4).border = { bottom: { style: 'thin', color: { argb: MUTED } } };
  ws.getRow(r).height = 30;
  r++;

  ws.mergeCells(r, 1, r, 3);
  const signL = ws.getCell(r, 1);
  signL.value = 'Revizní technik – jméno, podpis, razítko';
  signL.font = { size: 8, color: { argb: MUTED }, name: 'Segoe UI' };
  signL.alignment = { horizontal: 'center' };

  ws.mergeCells(r, 4, r, COLS);
  const signR = ws.getCell(r, 4);
  signR.value = 'Zástupce objednatele – jméno, podpis';
  signR.font = { size: 8, color: { argb: MUTED }, name: 'Segoe UI' };
  signR.alignment = { horizontal: 'center' };
  r++;

  // ═══════════════════════════════════════════════
  // TISK: záhlaví / zápatí
  // ═══════════════════════════════════════════════
  ws.headerFooter.oddFooter = '&C&8Strana &P / &N  |  Zpráva o ověření strojního zařízení';

  // ═══════════════════════════════════════════════
  // ULOŽIT
  // ═══════════════════════════════════════════════
  const buffer = await wb.xlsx.writeBuffer();
  const cislo = (data.cisloProtokolu || 'protokol').replace(/[^a-zA-Z0-9\-_]/g, '_');
  const datum = data.mistoDatum || new Date().toISOString().slice(0, 10);
  saveAs(new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }), `Overeni_${cislo}_${datum}.xlsx`);
}
