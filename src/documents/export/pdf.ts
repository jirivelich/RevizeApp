/**
 * Export do PDF: každá stránka se nasnímá přes html2canvas (scale 2, bílé pozadí)
 * a vloží do jsPDF jako JPEG přes celou A4 (0, 0, 210, 297).
 */
import { createOffscreenRoot } from './offscreen';
import { waitForAssets } from '../paginate';

/** Vytvoří PDF z finálního (rozstránkovaného) HTML. */
export async function renderPdfBlob(pagesHtml: string): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const root = createOffscreenRoot();
  root.classList.add('doc-export');
  // html2canvas 1.4.1 měří účaří písma pomocí <img> vloženého do <body>. Tailwind (preflight)
  // dává obrázkům display:block, takže měření vyjde špatně a text v PDF je posunutý dolů.
  const fix = document.createElement('style');
  fix.textContent = 'body > div:not(.doc-root) > img { display: inline !important; }';
  document.head.appendChild(fix);
  try {
    root.innerHTML = pagesHtml;
    await waitForAssets(root);
    const pages = [...root.querySelectorAll(':scope > .page')] as HTMLElement[];
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      if (i > 0) pdf.addPage('a4', 'portrait');
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }
    return pdf.output('blob');
  } finally {
    fix.remove();
    root.remove();
  }
}
