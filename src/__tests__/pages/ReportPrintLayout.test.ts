/**
 * Testy pro tiskový náhled revizní zprávy:
 *
 * 1) A4 layout – CSS musí nastavit správné rozměry, @page size A4
 * 2) Page-break pravidla – break-inside, break-after pro sekce/tabulky/podpisy
 * 3) Dynamické prvky – tiskSekce (skrývání/zobrazování sekcí), podmíněné rendery
 * 4) PAGED_CSS – running headers, footers, string-set, page counters
 * 5) Pagedjs lifecycle – Previewer volání, fallback, pageCount
 * 6) Toolbar funkčnost – Tisk, Word, Zpět, page count display
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════
// 1) PRINT CSS – A4 LAYOUT & PAGE-BREAK
// ═══════════════════════════════════════════

// Načteme print.css jako text pro statickou analýzu CSS pravidel
const printCssPath = path.resolve(__dirname, '../../pages/ReportPrint/print.css');
const printCss = fs.readFileSync(printCssPath, 'utf-8');

describe('Print CSS – A4 layout', () => {
  it('should set report-source width to 210mm (A4 width)', () => {
    expect(printCss).toContain('.report-source');
    expect(printCss).toMatch(/\.report-source\s*\{[^}]*width:\s*210mm/);
  });

  it('should hide report-source off-screen (position absolute, left -9999px)', () => {
    expect(printCss).toMatch(/\.report-source\s*\{[^}]*position:\s*absolute/);
    expect(printCss).toMatch(/\.report-source\s*\{[^}]*left:\s*-9999px/);
    expect(printCss).toMatch(/\.report-source\s*\{[^}]*visibility:\s*hidden/);
  });

  it('should set report-print-bg as page background', () => {
    expect(printCss).toMatch(/\.report-print-bg\s*\{[^}]*background:\s*#e2e8f0/);
    expect(printCss).toMatch(/\.report-print-bg\s*\{[^}]*min-height:\s*100vh/);
  });

  it('should hide string-set elements visually but keep in layout', () => {
    // String-set elements must NOT be display:none (pagedjs would ignore them)
    expect(printCss).toMatch(/\.report-string-number[\s\S]*?display:\s*block/);
    expect(printCss).toMatch(/\.report-string-number[\s\S]*?height:\s*0/);
    expect(printCss).toMatch(/\.report-string-number[\s\S]*?overflow:\s*hidden/);
  });
});

describe('Print CSS – page-break pravidla', () => {
  it('should set break-inside: auto on report-section', () => {
    expect(printCss).toMatch(/\.report-section\s*\{[^}]*break-inside:\s*auto/);
  });

  it('should set break-after: avoid on section title (nadpis nesmí být sám dole)', () => {
    expect(printCss).toMatch(/\.report-section-title\s*\{[^}]*break-after:\s*avoid/);
  });

  it('should set break-after: avoid on subsection title', () => {
    expect(printCss).toMatch(/\.report-subsection-title\s*\{[^}]*break-after:\s*avoid/);
  });

  it('should set break-inside: auto on subsection', () => {
    expect(printCss).toMatch(/\.report-subsection\s*\{[^}]*break-inside:\s*auto/);
  });

  it('should set break-inside: auto on data table', () => {
    expect(printCss).toMatch(/\.report-data-table\s*\{[^}]*break-inside:\s*auto/);
  });

  it('should set break-inside: avoid on table rows (řádek se nerozdělí)', () => {
    expect(printCss).toMatch(/\.report-data-table tr\s*\{[^}]*break-inside:\s*avoid/);
  });

  it('should set break-inside: avoid on result box (výsledek nesmí být rozdělen)', () => {
    expect(printCss).toMatch(/\.report-result\s*\{[^}]*break-inside:\s*avoid/);
  });

  it('should set break-inside: avoid on signatures block', () => {
    expect(printCss).toMatch(/\.report-signatures\s*\{[^}]*break-inside:\s*avoid/);
  });

  it('should repeat table header on every page (display: table-header-group)', () => {
    expect(printCss).toMatch(/\.report-data-table thead\s*\{[^}]*display:\s*table-header-group/);
  });
});

describe('Print CSS – @media print pravidla', () => {
  it('should hide toolbar in @media print', () => {
    expect(printCss).toMatch(/@media\s+print[\s\S]*?\.print-hide[\s\S]*?display:\s*none\s*!important/);
  });

  it('should hide report-source in @media print', () => {
    expect(printCss).toMatch(/@media\s+print[\s\S]*?\.report-source[\s\S]*?display:\s*none\s*!important/);
  });

  it('should set white background in @media print', () => {
    expect(printCss).toMatch(/@media\s+print[\s\S]*?background:\s*white\s*!important/);
  });

  it('should preserve print colors (print-color-adjust: exact)', () => {
    expect(printCss).toMatch(/print-color-adjust:\s*exact\s*!important/);
  });

  it('should remove box-shadow from pagedjs pages in print', () => {
    expect(printCss).toMatch(/@media\s+print[\s\S]*?\.pagedjs_page[\s\S]*?box-shadow:\s*none\s*!important/);
  });

  it('should reset padding on preview container in print', () => {
    expect(printCss).toMatch(/@media\s+print[\s\S]*?\.report-preview[\s\S]*?padding:\s*0\s*!important/);
  });
});

describe('Print CSS – pagedjs stránkové kontejnery', () => {
  it('should style pagedjs_page with white background and shadow', () => {
    expect(printCss).toMatch(/\.pagedjs_page\s*\{[^}]*background:\s*white\s*!important/);
    expect(printCss).toMatch(/\.pagedjs_page\s*\{[^}]*box-shadow:/);
  });

  it('should set pagedjs_pages to flex column aligned center', () => {
    expect(printCss).toMatch(/\.pagedjs_pages\s*\{[^}]*display:\s*flex\s*!important/);
    expect(printCss).toMatch(/\.pagedjs_pages\s*\{[^}]*flex-direction:\s*column\s*!important/);
    expect(printCss).toMatch(/\.pagedjs_pages\s*\{[^}]*align-items:\s*center\s*!important/);
  });

  it('should style margin-box top borders', () => {
    expect(printCss).toContain('.pagedjs_margin-top-left');
    expect(printCss).toContain('border-bottom: 1px solid #cbd5e1');
  });

  it('should style margin-box bottom borders', () => {
    expect(printCss).toContain('.pagedjs_margin-bottom-center');
    expect(printCss).toContain('border-top: 1px solid #e2e8f0');
  });
});

// ═══════════════════════════════════════════
// 2) PAGED_CSS (JS string) – @page pravidla
// ═══════════════════════════════════════════

// Načteme ReportPrintPage.tsx a extrahujeme PAGED_CSS konstantu
const reportPrintPagePath = path.resolve(__dirname, '../../pages/ReportPrint/ReportPrintPage.tsx');
const reportPrintPageSource = fs.readFileSync(reportPrintPagePath, 'utf-8');

// Extrahujeme PAGED_CSS obsah mezi backticky
const pagedCssMatch = reportPrintPageSource.match(/const PAGED_CSS = `([\s\S]*?)`;/);
const pagedCss = pagedCssMatch ? pagedCssMatch[1] : '';

describe('PAGED_CSS – @page layout', () => {
  it('should define @page size as A4', () => {
    expect(pagedCss).toMatch(/@page\s*\{[\s\S]*?size:\s*A4/);
  });

  it('should define page margins (18mm top, 15mm sides, 20mm bottom)', () => {
    expect(pagedCss).toMatch(/margin:\s*18mm 15mm 20mm 15mm/);
  });

  it('should define @top-left with report-number string-set', () => {
    expect(pagedCss).toMatch(/@top-left\s*\{[\s\S]*?content:\s*string\(report-number/);
  });

  it('should define @top-right with report-title string-set', () => {
    expect(pagedCss).toMatch(/@top-right\s*\{[\s\S]*?content:\s*string\(report-title/);
  });

  it('should define @bottom-center with page counter', () => {
    expect(pagedCss).toMatch(/@bottom-center\s*\{[\s\S]*?counter\(page\)/);
    expect(pagedCss).toMatch(/@bottom-center\s*\{[\s\S]*?counter\(pages\)/);
  });

  it('should define @bottom-left with firma-name string-set', () => {
    expect(pagedCss).toMatch(/@bottom-left\s*\{[\s\S]*?content:\s*string\(firma-name/);
  });

  it('should define @bottom-right with "Revizní zpráva" label', () => {
    expect(pagedCss).toMatch(/@bottom-right\s*\{[\s\S]*?"Revizní zpráva"/);
  });

  it('should hide top margin-boxes on first page (@page:first)', () => {
    expect(pagedCss).toMatch(/@page:first[\s\S]*?@top-left\s*\{\s*content:\s*none/);
    expect(pagedCss).toMatch(/@page:first[\s\S]*?@top-right\s*\{\s*content:\s*none/);
  });

  it('should define string-set for report-number', () => {
    expect(pagedCss).toMatch(/\.report-string-number\s*\{\s*string-set:\s*report-number\s+content\(\)/);
  });

  it('should define string-set for report-title', () => {
    expect(pagedCss).toMatch(/\.report-string-title\s*\{\s*string-set:\s*report-title\s+content\(\)/);
  });

  it('should define string-set for firma-name', () => {
    expect(pagedCss).toMatch(/\.report-string-firma\s*\{\s*string-set:\s*firma-name\s+content\(\)/);
  });

  it('should use consistent font family across margin-boxes', () => {
    // All 5 margin-boxes should use same font
    const fontMatches = pagedCss.match(/font-family:\s*'Segoe UI'/g);
    expect(fontMatches?.length).toBeGreaterThanOrEqual(5);
  });

  it('should use pt-based font sizes in margin-boxes', () => {
    const fontSizeMatches = pagedCss.match(/font-size:\s*[\d.]+pt/g);
    expect(fontSizeMatches?.length).toBeGreaterThanOrEqual(5);
  });
});

// ═══════════════════════════════════════════
// 3) REPORT CSS – typografie a rozměry
// ═══════════════════════════════════════════

describe('Print CSS – typografická pravidla pro A4', () => {
  it('should set report-page base font-size to 10pt', () => {
    expect(printCss).toMatch(/\.report-page\s*\{[^}]*font-size:\s*10pt/);
  });

  it('should set report-page line-height to 1.45', () => {
    expect(printCss).toMatch(/\.report-page\s*\{[^}]*line-height:\s*1\.45/);
  });

  it('should set report-title to 13pt uppercase', () => {
    expect(printCss).toMatch(/\.report-title\s*\{[^}]*font-size:\s*13pt/);
    expect(printCss).toMatch(/\.report-title\s*\{[^}]*text-transform:\s*uppercase/);
  });

  it('should set section title to 10.5pt', () => {
    expect(printCss).toMatch(/\.report-section-title\s*\{[^}]*font-size:\s*10\.5pt/);
  });

  it('should set data table font to 8.5pt (kompaktní)', () => {
    expect(printCss).toMatch(/\.report-data-table\s*\{[^}]*font-size:\s*8\.5pt/);
  });

  it('should set info table font to 9.5pt', () => {
    expect(printCss).toMatch(/\.report-info-table\s*\{[^}]*font-size:\s*9\.5pt/);
  });

  it('should set label-cell width to 200px', () => {
    expect(printCss).toMatch(/\.label-cell\s*\{[^}]*width:\s*200px/);
  });

  it('should set data table header background to colored', () => {
    expect(printCss).toMatch(/\.report-data-table th\s*\{[^}]*background:\s*#1e40af/);
    expect(printCss).toMatch(/\.report-data-table th\s*\{[^}]*color:\s*white/);
  });

  it('should alternate row background on data table', () => {
    expect(printCss).toMatch(/\.report-data-table tbody tr:nth-child\(even\)\s*\{[^}]*background:\s*#f8fafc/);
  });

  it('should set result value font to 14pt bold', () => {
    expect(printCss).toMatch(/\.report-result-value\s*\{[^}]*font-size:\s*14pt/);
    expect(printCss).toMatch(/\.report-result-value\s*\{[^}]*font-weight:\s*800/);
  });

  it('should set firma name in header to 13pt', () => {
    expect(printCss).toMatch(/\.report-header-firma-name\s*\{[^}]*font-size:\s*13pt/);
  });

  it('should constrain logo dimensions', () => {
    expect(printCss).toMatch(/\.report-logo\s*\{[^}]*max-height:\s*50px/);
    expect(printCss).toMatch(/\.report-logo\s*\{[^}]*max-width:\s*120px/);
  });
});

// ═══════════════════════════════════════════
// 4) HROMOSVOD PAGED_CSS specifika
// ═══════════════════════════════════════════

const hromosvodPagePath = path.resolve(__dirname, '../../pages/HromosvodPrint/HromosvodPrintPage.tsx');
const hromosvodPageSource = fs.readFileSync(hromosvodPagePath, 'utf-8');
const hromosvodPagedMatch = hromosvodPageSource.match(/const PAGED_CSS = `([\s\S]*?)`;/);
const hromosvodPagedCss = hromosvodPagedMatch ? hromosvodPagedMatch[1] : '';

describe('HromosvodPrint PAGED_CSS', () => {
  it('should exist and not be empty', () => {
    expect(hromosvodPagedCss.length).toBeGreaterThan(50);
  });

  it('should define @page size A4 (same as elektro)', () => {
    expect(hromosvodPagedCss).toMatch(/@page\s*\{[\s\S]*?size:\s*A4/);
  });

  it('should define same margins as elektro report', () => {
    expect(hromosvodPagedCss).toMatch(/margin:\s*18mm 15mm 20mm 15mm/);
  });

  it('should label bottom-right as "Revizní zpráva – Hromosvod"', () => {
    expect(hromosvodPagedCss).toContain('Revizní zpráva – Hromosvod');
  });

  it('should hide top margin-boxes on first page', () => {
    expect(hromosvodPagedCss).toMatch(/@page:first[\s\S]*?content:\s*none/);
  });

  it('should define same string-set rules as elektro', () => {
    expect(hromosvodPagedCss).toContain('string-set: report-number content()');
    expect(hromosvodPagedCss).toContain('string-set: report-title content()');
    expect(hromosvodPagedCss).toContain('string-set: firma-name content()');
  });
});
