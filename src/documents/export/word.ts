/**
 * Export do Wordu: stejné HTML jako náhled, zabalené do <!DOCTYPE html> s vloženým CSS.
 * Mezi stránky se vkládá <br clear="all" style="page-break-before:always">.
 * Převod přes html-docx-js (altChunk), okraje ~2 cm.
 */
import { asBlob } from 'html-docx-js-typescript';

// Zjednodušené styly pro Word (Word nezná absolutní pozicování, stíny ani calc)
const WORD_CSS = `
body { font-family: Calibri, Carlito, Arial, sans-serif; font-size: 10pt; line-height: 1.3; color: #000; }
p { margin: 0 0 3pt; }
table { border-collapse: collapse; }
.page-head { width: 100%; border-bottom: 1px solid #b0b0b0; font-size: 8pt; color: #374151; margin-bottom: 10pt; }
.page-head td { padding-bottom: 2pt; }
.page-foot { width: 100%; border-top: 1px solid #b0b0b0; font-size: 8pt; color: #374151; margin-top: 8pt; }
.r { text-align: right; }
.firma { width: 100%; border-bottom: 2px solid #b0b0b0; margin-bottom: 6pt; }
.firma td { vertical-align: top; }
.firma .nazev { font-size: 13pt; font-weight: bold; }
.normy { text-align: center; font-size: 8pt; color: #374151; }
.title { text-align: center; font-size: 22pt; font-weight: bold; text-transform: uppercase; margin-top: 6pt; }
.subtitle { text-align: center; font-size: 10.5pt; font-weight: bold; margin-bottom: 10pt; }
.sec { margin-top: 10pt; }
.sec-title { font-size: 10.5pt; font-weight: bold; border-bottom: 1px solid #b0b0b0; margin-bottom: 4pt; }
.sub-title { font-size: 9.5pt; font-weight: bold; background: #f1f5f9; border-left: 3px solid #b0b0b0; padding: 3pt 6pt; margin-top: 6pt; }
table.kv { width: 100%; font-size: 9.5pt; }
table.kv td { padding: 1pt 4pt 1pt 0; vertical-align: top; }
table.kv td.l { width: 150pt; font-weight: bold; color: #374151; }
table.grid { width: 100%; font-size: 8.5pt; }
table.grid th, table.grid td { padding: 2pt 4pt; vertical-align: top; text-align: left; }
table.grid th { font-weight: bold; color: #ffffff; background: #3e4a5b; border: 1px solid #2d3748; }
table.grid td { border: 1px solid #cbd5e1; }
table.grid td.c, table.grid th.c { text-align: center; }
.result { width: 100%; }
.result td { border: 1.5pt solid #1e293b; padding: 8pt; text-align: center; font-size: 11pt; }
table.sig { width: 100%; margin-top: 30pt; }
table.sig td { width: 50%; text-align: center; vertical-align: top; }
table.sig .line { border-top: 0.75pt dotted #000; }
.small { font-size: 8.5pt; }
.muted { color: #475569; }
.b { font-weight: bold; }
.center { text-align: center; }
img { max-width: 100%; }
`;

/**
 * Styly vložené přímo do prvků (inline). Import HTML do Wordu (a LibreOffice) třídy
 * z <style> respektuje jen částečně – rámečky a šířky tabulek proto vkládáme přímo.
 */
const INLINE_RULES: [string, string][] = [
  ['table', 'border-collapse:collapse;'],
  ['table.page-head, table.kv, table.grid, table.sig, table.result, table.firma, table.page-foot, table.foto', 'width:100%;'],
  ['table.page-head', 'border-bottom:1px solid #b0b0b0;font-size:8pt;color:#374151;margin-bottom:10pt;'],
  ['table.page-foot', 'border-top:1px solid #b0b0b0;font-size:8pt;color:#374151;margin-top:8pt;'],
  ['table.firma', 'border-bottom:2px solid #b0b0b0;margin-bottom:6pt;'],
  ['.r', 'text-align:right;'],
  ['.firma .nazev', 'font-size:13pt;font-weight:bold;'],
  ['.firma .small', 'color:#374151;'],
  ['.normy', 'text-align:center;font-size:8pt;color:#374151;'],
  ['.title', 'text-align:center;font-size:22pt;font-weight:bold;text-transform:uppercase;margin-top:6pt;'],
  ['.subtitle', 'text-align:center;font-size:10.5pt;font-weight:bold;margin-bottom:10pt;'],
  ['.sec-title', 'font-size:10.5pt;font-weight:bold;border-bottom:1px solid #b0b0b0;margin-top:8pt;margin-bottom:3pt;'],
  ['.sub-title', 'font-size:9.5pt;font-weight:bold;background:#f1f5f9;border-left:3px solid #b0b0b0;padding:3pt 6pt;margin-top:6pt;'],
  ['table.kv', 'font-size:9.5pt;'],
  ['table.kv td', 'padding:0 4pt 0 0;vertical-align:top;'],
  ['table.kv td.l', 'width:150pt;font-weight:bold;color:#374151;'],
  ['table.kv4 td.l', 'width:105pt;'],
  ['table.grid', 'font-size:8.5pt;'],
  ['table.grid th, table.grid td', 'padding:2pt 4pt;vertical-align:top;text-align:left;'],
  ['table.grid th', 'font-weight:bold;color:#ffffff;background:#3e4a5b;border:1px solid #2d3748;'],
  ['table.grid td', 'border:1px solid #cbd5e1;'],
  ['table.grid tbody tr:nth-child(even) td', 'background:#f8fafc;'],
  ['table.grid td.c, table.grid th.c', 'text-align:center;'],
  ['table.result td', 'border:1.5pt solid #1e293b;padding:8pt;text-align:center;font-size:11pt;'],
  ['table.sig td', 'width:50%;text-align:center;vertical-align:top;'],
  ['table.sig .line', 'border-top:0.75pt dotted #000;margin-top:24pt;'],
  ['.small', 'font-size:8.5pt;'],
  ['.muted', 'color:#475569;'],
];

function inlineStyles(root: HTMLElement): void {
  for (const [sel, css] of INLINE_RULES) {
    root.querySelectorAll<HTMLElement>(sel).forEach(el => {
      el.setAttribute('style', `${el.getAttribute('style') || ''}${css}`);
    });
  }
  // Atributy tabulek – Word je respektuje i bez CSS
  root.querySelectorAll('table').forEach(t => {
    t.setAttribute('width', '100%');
    t.setAttribute('cellspacing', '0');
    t.setAttribute('cellpadding', t.classList.contains('grid') ? '3' : '1');
    
  });
}

/** Převede finální (rozstránkované) HTML na HTML dokument pro Word. */
export function buildWordHtml(pagesHtml: string, title = 'Dokument'): string {
  const root = document.createElement('div');
  root.innerHTML = pagesHtml;
  const pages = [...root.querySelectorAll(':scope > .page')] as HTMLElement[];
  const parts = pages.map(p => {
    // Obrázky zmenšit na šířku textu (logo menší)
    p.querySelectorAll('img').forEach(img => {
      img.removeAttribute('style');
      if (!img.getAttribute('width')) img.setAttribute('width', img.closest('.firma') ? '110' : '600');
    });
    inlineStyles(p);
    return p.innerHTML;
  });
  const body = parts.join('<br clear="all" style="page-break-before:always">');
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"><title>${title.replace(/[<>&]/g, '')}</title><style>${WORD_CSS}</style></head><body>${body}</body></html>`;
}

/** Vytvoří DOCX z finálního (rozstránkovaného) HTML. */
export async function renderWordBlob(pagesHtml: string, title?: string): Promise<Blob> {
  // Okraje v twipech (1 cm = 567): 2 cm po stranách, 1,5 cm nahoře a dole
  const out = await asBlob(buildWordHtml(pagesHtml, title), {
    orientation: 'portrait',
    margins: { top: 850, bottom: 850, left: 1134, right: 1134, header: 425, footer: 425 },
  });
  return out instanceof Blob ? out : new Blob([out as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
