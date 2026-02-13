// pdfRenderer.ts - Generování PDF z HTML šablon
// Používá STEJNÝ renderFullDocument() jako živý náhled (iframe)
// → PDF má identické stránkování, layout i styling
// Každá stránka se zachytí html2canvas → obraz → jsPDF

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  processTemplate,
  createTemplateContext,
  renderFullDocument,
} from './templateEngine';
import type { PageOptions } from './templateEngine';
import type { PDFRenderData } from './pdfVariables';

// Re-export pro kompatibilitu
export type { PDFRenderData } from './pdfVariables';
export type { PageOptions } from './templateEngine';

// Rozměry stránek v mm
const PAGE_DIMS: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  letter: { width: 216, height: 279 },
};

// ============================================================
// PDF GENEROVÁNÍ — renderFullDocument v iframe → html2canvas → jsPDF
// ============================================================

/**
 * Generuje PDF blob z HTML šablony + dat.
 *
 * Postup:
 * 1. Zavolá renderFullDocument() → kompletní HTML se stránkovacím JS
 * 2. Načte ho do skrytého iframe (stejný rendering jako živý náhled)
 * 3. Inline JS v iframe vytvoří .page-sheet divy (identická paginace)
 * 4. Každou stránku naklonuje do hlavního dokumentu
 * 5. html2canvas zachytí každou stránku → canvas → obrázek
 * 6. Obrázky se vloží do jsPDF → výsledné PDF
 */
export async function generatePDFFromTemplate(
  templateHtml: string,
  templateCss: string,
  data: PDFRenderData,
  options: PageOptions
): Promise<Blob> {
  const context = createTemplateContext(data);
  const renderedBody = processTemplate(templateHtml, context);

  const dim = PAGE_DIMS[options.pageSize] || PAGE_DIMS.a4;
  const isLandscape = options.orientation === 'landscape';
  const pageW = isLandscape ? dim.height : dim.width;
  const pageH = isLandscape ? dim.width : dim.height;

  // Vygenerovat kompletní HTML dokument (stejný jako v iframe náhledu)
  const fullHtml = renderFullDocument(renderedBody, templateCss, options, 'PDF Export');

  // ── 1. Vytvořit skrytý iframe ──
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    position: fixed;
    left: 0; top: 0;
    width: ${pageW}mm;
    height: ${pageH * 3}mm;
    opacity: 0;
    pointer-events: none;
    z-index: -9999;
    border: none;
  `;
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow!.document;
    iframeDoc.open();
    iframeDoc.write(fullHtml);
    iframeDoc.close();

    // ── 2. Počkat na rendering + stránkovací JS ──
    // Inline script v renderFullDocument vytvoří .page-sheet divy
    await new Promise<void>(resolve => {
      const onLoad = () => resolve();
      iframe.addEventListener('load', onLoad, { once: true });
      // Fallback timeout pokud onload nefire
      setTimeout(onLoad, 4000);
    });

    // Extra čas pro: fonty, pagination JS, relayout
    await new Promise(r => setTimeout(r, 1500));
    try { await iframeDoc.fonts.ready; } catch { /* ok */ }
    await new Promise(r => setTimeout(r, 500));

    // ── 3. Získat vytvořené stránky ──
    const sheets = Array.from(
      iframeDoc.querySelectorAll('.page-sheet')
    ) as HTMLElement[];

    if (sheets.length === 0) {
      throw new Error('Generování PDF selhalo — stránkovací skript nevytvořil žádné stránky');
    }

    // Získat CSS z iframe pro klonování
    const iframeStyles = Array.from(iframeDoc.querySelectorAll('style'))
      .map(s => s.textContent || '')
      .join('\n');

    // ── 4. Pro každou stránku: klonovat → html2canvas → PDF ──
    const doc = new jsPDF({
      unit: 'mm',
      format: [pageW, pageH],
      orientation: isLandscape ? 'landscape' : 'portrait',
    });

    for (let i = 0; i < sheets.length; i++) {
      if (i > 0) doc.addPage();

      // Klonovat stránku do hlavního dokumentu (html2canvas potřebuje main document)
      const captureWrapper = document.createElement('div');
      captureWrapper.style.cssText = `
        position: fixed;
        left: 0; top: 0;
        z-index: -9998;
        opacity: 0;
        pointer-events: none;
      `;

      // Zkopírovat font link
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap';
      captureWrapper.appendChild(fontLink);

      // Zkopírovat styly z iframe
      const captureStyle = document.createElement('style');
      captureStyle.textContent = iframeStyles;
      captureWrapper.appendChild(captureStyle);

      // Klonovat page-sheet
      const clonedSheet = sheets[i].cloneNode(true) as HTMLElement;
      // Upravit pro PDF (bez stínu, bez marginu)
      clonedSheet.style.boxShadow = 'none';
      clonedSheet.style.margin = '0';
      captureWrapper.appendChild(clonedSheet);

      document.body.appendChild(captureWrapper);

      // Počkat na relayout a fonty
      await new Promise(r => setTimeout(r, 150));

      // html2canvas zachytí stránku
      const canvas = await html2canvas(clonedSheet, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: clonedSheet.offsetWidth,
        height: clonedSheet.offsetHeight,
      });

      // Vložit zachycený obrázek do PDF stránky (na celou stránku)
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      doc.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);

      document.body.removeChild(captureWrapper);
    }

    return doc.output('blob');
  } finally {
    document.body.removeChild(iframe);
  }
}

// ============================================================
// HTML NÁHLED — používá renderFullDocument (stejné jako iframe)
// ============================================================

/**
 * Otevře HTML náhled v novém okně — používá STEJNÝ rendering jako iframe
 */
export function openHTMLPreview(
  templateHtml: string,
  templateCss: string,
  data: PDFRenderData,
  options: PageOptions
): void {
  const context = createTemplateContext(data);
  const body = processTemplate(templateHtml, context);
  const fullHtml = renderFullDocument(body, templateCss, options, 'Náhled - Revizní zpráva');

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(fullHtml);
    win.document.close();
  }
}

// ============================================================
// EXPORT FUNKCE
// ============================================================

/**
 * Otevře náhled PDF v novém okně
 */
export async function openPDFPreview(
  templateHtml: string,
  templateCss: string,
  data: PDFRenderData,
  options: PageOptions
): Promise<void> {
  const blob = await generatePDFFromTemplate(templateHtml, templateCss, data, options);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

/**
 * Stáhne PDF soubor
 */
export async function downloadPDF(
  templateHtml: string,
  templateCss: string,
  data: PDFRenderData,
  options: PageOptions,
  filename: string
): Promise<void> {
  const blob = await generatePDFFromTemplate(templateHtml, templateCss, data, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

