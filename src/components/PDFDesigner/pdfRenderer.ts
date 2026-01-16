// pdfRenderer.ts - Hlavní modul pro renderování šablony do PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import type { DesignerTemplate, Widget } from './types';
import type { Rozvadec, Okruh, Zarizeni } from '../../types';
import { addCzechFont, t } from '../../services/fontUtils';
import { 
  getVariableValue, 
  resolveVariables, 
  getTableData 
} from './pdfVariables';
import type { PDFRenderData, RepeaterContext } from './pdfVariables';
import { TABLE_COLUMNS } from './constants';

// Re-export pro kompatibilitu
export type { PDFRenderData, RepeaterContext } from './pdfVariables';

// Rozšíření jsPDF o autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

// Konverze px na mm (používáme 3.78 px/mm v designeru)
const PX_TO_MM = 1 / 3.78;

// Marginy stránky v mm
const PAGE_MARGINS = { top: 10, bottom: 15, left: 10, right: 10 };

// ============================================================
// HLAVNÍ EXPORT FUNKCE
// ============================================================

/**
 * Otevře náhled PDF v novém okně
 */
export async function openPDFPreview(
  template: DesignerTemplate,
  data: PDFRenderData
): Promise<void> {
  const doc = await renderTemplateToPDF(template, data);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

/**
 * Stáhne PDF soubor
 */
export async function downloadPDF(
  template: DesignerTemplate,
  data: PDFRenderData,
  filename: string
): Promise<void> {
  const doc = await renderTemplateToPDF(template, data);
  doc.save(filename);
}

/**
 * Renderuje šablonu do PDF dokumentu
 */
export async function renderTemplateToPDF(
  template: DesignerTemplate,
  data: PDFRenderData
): Promise<jsPDF> {
  const firstPage = template.pages[0];
  const orientation = firstPage?.orientation === 'landscape' ? 'l' : 'p';
  const format = firstPage?.size === 'a5' ? 'a5' : firstPage?.size === 'letter' ? 'letter' : 'a4';
  
  const doc = new jsPDF(orientation, 'mm', format);
  await addCzechFont(doc);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Renderovat každou stránku šablony
  for (let pageIndex = 0; pageIndex < template.pages.length; pageIndex++) {
    const page = template.pages[pageIndex];
    
    if (pageIndex > 0) {
      doc.addPage();
    }
    
    // Seřadit widgety podle zIndex
    const widgets = [...page.widgets].sort((a, b) => a.zIndex - b.zIndex);
    
    for (const widget of widgets) {
      await renderWidget(doc, widget, data, template, pageIndex, pageWidth, pageHeight);
    }
  }
  
  // Nahradit placeholder stránkování
  const totalPages = doc.getNumberOfPages();
  replacePageNumbers(doc, totalPages);
  
  return doc;
}

// ============================================================
// WIDGET RENDERING
// ============================================================

async function renderWidget(
  doc: jsPDF,
  widget: Widget,
  data: PDFRenderData,
  template: DesignerTemplate,
  pageIndex: number,
  _pageWidth: number,
  _pageHeight: number
): Promise<void> {
  const x = widget.x * PX_TO_MM;
  const y = widget.y * PX_TO_MM;
  const width = widget.width * PX_TO_MM;
  const height = widget.height * PX_TO_MM;
  
  const style = widget.style || {};
  
  // Nastavit základní font
  doc.setFontSize(style.fontSize || 10);
  doc.setFont('Roboto', style.fontWeight === 'bold' ? 'bold' : 'normal');
  
  if (style.color) {
    const rgb = hexToRgb(style.color);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  } else {
    doc.setTextColor(0, 0, 0);
  }
  
  switch (widget.type) {
    case 'text':
      renderTextWidget(doc, widget, x, y, width, height, data);
      break;
      
    case 'variable':
      renderVariableWidget(doc, widget, x, y, width, height, data);
      break;
      
    case 'box':
      renderBoxWidget(doc, widget, x, y, width, height);
      break;
      
    case 'line':
      renderLineWidget(doc, widget, x, y, width, height);
      break;
      
    case 'image':
      await renderImageWidget(doc, widget, x, y, width, height, data);
      break;
      
    case 'table':
      renderTableWidget(doc, widget, x, y, width, data);
      break;
      
    case 'page-number':
      renderPageNumberWidget(doc, widget, x, y, pageIndex + 1, template.pages.length);
      break;
      
    case 'date':
      renderDateWidget(doc, widget, x, y);
      break;
      
    case 'qr-code':
      await renderQRCodeWidget(doc, widget, x, y, width, height, data);
      break;
      
    case 'repeater':
      await renderRepeaterWidget(doc, widget, x, y, width, data);
      break;
      
    case 'signature':
      renderSignatureWidget(doc, widget, x, y, width, height);
      break;
  }
}

// ============================================================
// JEDNOTLIVÉ WIDGETY
// ============================================================

function renderTextWidget(
  doc: jsPDF,
  widget: Widget,
  x: number,
  y: number,
  width: number,
  height: number,
  data: PDFRenderData
): void {
  const style = widget.style || {};
  const content = resolveVariables(widget.content, data);
  
  renderTextContent(doc, content, x, y, width, height, style);
}

function renderVariableWidget(
  doc: jsPDF,
  widget: Widget,
  x: number,
  y: number,
  width: number,
  height: number,
  data: PDFRenderData,
  repeaterContext?: RepeaterContext
): void {
  const style = widget.style || {};
  // Widget.content je přímo cesta k proměnné (např. "revize.cisloRevize")
  const content = getVariableValue(widget.content, data, repeaterContext);
  
  renderTextContent(doc, content, x, y, width, height, style);
}

function renderTextContent(
  doc: jsPDF,
  content: string,
  x: number,
  y: number,
  width: number,
  height: number,
  style: Widget['style']
): void {
  // Pozadí
  if (style.backgroundColor && style.backgroundColor !== 'transparent') {
    const bgRgb = hexToRgb(style.backgroundColor);
    doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
    doc.rect(x, y, width, height, 'F');
  }
  
  // Rámeček
  if (style.borderWidth && style.borderWidth > 0 && style.borderStyle !== 'none') {
    const borderRgb = hexToRgb(style.borderColor || '#000000');
    doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
    doc.setLineWidth(style.borderWidth * 0.35);
    doc.rect(x, y, width, height);
  }
  
  // Nastavit font
  doc.setFontSize(style.fontSize || 10);
  doc.setFont('Roboto', style.fontWeight === 'bold' ? 'bold' : 'normal');
  
  if (style.color) {
    const rgb = hexToRgb(style.color);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  } else {
    doc.setTextColor(0, 0, 0);
  }
  
  const padding = style.padding || 2;
  const fontSize = style.fontSize || 10;
  const lineHeight = fontSize * 0.4;
  
  // Vertikální zarovnání
  let textY: number;
  switch (style.verticalAlign) {
    case 'bottom':
      textY = y + height - padding;
      break;
    case 'middle':
      textY = y + height / 2 + lineHeight / 2;
      break;
    default:
      textY = y + padding + lineHeight;
  }
  
  // Horizontální zarovnání
  let align: 'left' | 'center' | 'right' = 'left';
  let textX = x + padding;
  
  if (style.textAlign === 'center') {
    align = 'center';
    textX = x + width / 2;
  } else if (style.textAlign === 'right') {
    align = 'right';
    textX = x + width - padding;
  }
  
  // Rozdělení na řádky
  const maxWidth = width - 2 * padding;
  const lines = doc.splitTextToSize(t(content), maxWidth);
  
  doc.text(lines, textX, textY, { align });
}

function renderBoxWidget(
  doc: jsPDF,
  widget: Widget,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const style = widget.style || {};
  
  if (style.backgroundColor && style.backgroundColor !== 'transparent') {
    const bgRgb = hexToRgb(style.backgroundColor);
    doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
    doc.rect(x, y, width, height, 'F');
  }
  
  if (style.borderWidth && style.borderWidth > 0 && style.borderStyle !== 'none') {
    const borderRgb = hexToRgb(style.borderColor || '#000000');
    doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
    doc.setLineWidth(style.borderWidth * 0.35);
    doc.rect(x, y, width, height);
  }
}

function renderLineWidget(
  doc: jsPDF,
  widget: Widget,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const style = widget.style || {};
  const color = hexToRgb(style.borderColor || style.color || '#000000');
  
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth((style.borderWidth || 1) * 0.35);
  
  // Horizontální nebo vertikální čára
  if (width > height) {
    doc.line(x, y + height / 2, x + width, y + height / 2);
  } else {
    doc.line(x + width / 2, y, x + width / 2, y + height);
  }
}

async function renderImageWidget(
  doc: jsPDF,
  widget: Widget,
  x: number,
  y: number,
  width: number,
  height: number,
  data: PDFRenderData
): Promise<void> {
  let imageData = widget.content;
  
  // Pokud je content proměnná (např. firma.logo)
  if (imageData && !imageData.startsWith('data:')) {
    imageData = getVariableValue(imageData, data);
  }
  
  if (!imageData || imageData === '-' || !imageData.startsWith('data:')) {
    // Nakreslit placeholder
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(x, y, width, height);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Obrázek', x + width / 2, y + height / 2, { align: 'center' });
    return;
  }
  
  try {
    const format = imageData.includes('image/png') ? 'PNG' : 'JPEG';
    doc.addImage(imageData, format, x, y, width, height);
  } catch {
    // Fallback
    try {
      doc.addImage(imageData, 'JPEG', x, y, width, height);
    } catch {
      // Ignorovat
    }
  }
}

function renderTableWidget(
  doc: jsPDF,
  widget: Widget,
  x: number,
  y: number,
  width: number,
  data: PDFRenderData,
  repeaterContext?: RepeaterContext
): void {
  const config = widget.tableConfig;
  if (!config) return;
  
  const tableData = getTableData(config.type, data, repeaterContext);
  if (tableData.length === 0) {
    // Zobrazit prázdnou tabulku s hlavičkou
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Žádná data', x + 5, y + 8);
    return;
  }
  
  const columns = config.columns.filter(c => c.visible);
  const headers = columns.map(c => c.label);
  
  const rows = tableData.map(row => 
    columns.map(col => {
      const value = row[col.key as keyof typeof row];
      return value?.toString() || '-';
    })
  );
  
  const style = widget.style || {};
  
  autoTable(doc, {
    startY: y,
    head: config.showHeader ? [headers] : [],
    body: rows,
    margin: { left: x },
    tableWidth: width,
    styles: {
      font: 'Roboto',
      fontSize: style.fontSize || 9,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: hexToRgb(config.headerStyle?.backgroundColor || '#3b82f6'),
      textColor: hexToRgb(config.headerStyle?.color || '#ffffff'),
      fontStyle: 'bold',
    },
    alternateRowStyles: config.alternateRowColor ? {
      fillColor: hexToRgb(config.alternateRowColor),
    } : undefined,
    columnStyles: columns.reduce((acc, col, idx) => {
      acc[idx] = { 
        cellWidth: col.width ? (col.width / 100) * width : 'auto',
        halign: col.align as 'left' | 'center' | 'right',
      };
      return acc;
    }, {} as Record<number, { cellWidth: number | 'auto'; halign: 'left' | 'center' | 'right' }>),
  });
}

function renderPageNumberWidget(
  doc: jsPDF,
  widget: Widget,
  x: number,
  y: number,
  currentPage: number,
  totalPages: number
): void {
  const style = widget.style || {};
  const template = widget.content || 'Strana {{PAGE}} z {{PAGES}}';
  
  // Nahradit placeholder skutečnými hodnotami
  const text = template
    .replace(/\{\{PAGE\}\}/g, String(currentPage))
    .replace(/\{\{PAGES\}\}/g, String(totalPages))
    .replace(/X/g, String(currentPage))
    .replace(/Y/g, String(totalPages));
  
  doc.setFontSize(style.fontSize || 10);
  doc.setFont('Roboto', style.fontWeight === 'bold' ? 'bold' : 'normal');
  
  if (style.color) {
    const rgb = hexToRgb(style.color);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  } else {
    doc.setTextColor(100, 100, 100);
  }
  
  let align: 'left' | 'center' | 'right' = 'left';
  if (style.textAlign === 'center') align = 'center';
  else if (style.textAlign === 'right') align = 'right';
  
  doc.text(t(text), x, y + 4, { align });
}

function renderDateWidget(
  doc: jsPDF,
  widget: Widget,
  x: number,
  y: number
): void {
  const style = widget.style || {};
  const format = widget.content || 'DD.MM.YYYY';
  
  const now = new Date();
  let dateStr: string;
  
  switch (format) {
    case 'DD.MM.YYYY':
      dateStr = now.toLocaleDateString('cs-CZ');
      break;
    case 'DD. MMMM YYYY':
      dateStr = now.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
      break;
    case 'YYYY-MM-DD':
      dateStr = now.toISOString().split('T')[0];
      break;
    default:
      dateStr = now.toLocaleDateString('cs-CZ');
  }
  
  doc.setFontSize(style.fontSize || 10);
  doc.setFont('Roboto', style.fontWeight === 'bold' ? 'bold' : 'normal');
  
  if (style.color) {
    const rgb = hexToRgb(style.color);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  } else {
    doc.setTextColor(0, 0, 0);
  }
  
  doc.text(t(dateStr), x, y + 4);
}

async function renderQRCodeWidget(
  doc: jsPDF,
  widget: Widget,
  x: number,
  y: number,
  width: number,
  height: number,
  data: PDFRenderData
): Promise<void> {
  // Obsah QR kódu - může být proměnná nebo přímý text
  let content = widget.content || '';
  
  // Pokud obsah obsahuje proměnnou, nahradit
  if (content.includes('{{') || content.includes('${')) {
    content = resolveVariables(content, data);
  } else if (!content.startsWith('http') && !content.includes(' ')) {
    // Zkusit jako proměnnou
    const resolved = getVariableValue(content, data);
    if (resolved !== '-') content = resolved;
  }
  
  // Výchozí obsah - URL revize
  if (!content) {
    content = `Revize: ${data.revize?.cisloRevize || 'N/A'}`;
  }
  
  try {
    // Generovat QR kód jako data URL
    const qrDataUrl = await QRCode.toDataURL(content, {
      width: Math.min(width, height) * 10, // Vyšší rozlišení
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    
    // Vložit do PDF jako obrázek
    const size = Math.min(width, height);
    const offsetX = (width - size) / 2;
    const offsetY = (height - size) / 2;
    doc.addImage(qrDataUrl, 'PNG', x + offsetX, y + offsetY, size, size);
  } catch (error) {
    console.error('QR code generation failed:', error);
    // Fallback - nakreslit placeholder
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(x, y, width, height);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('QR', x + width / 2, y + height / 2, { align: 'center' });
  }
}

function renderSignatureWidget(
  doc: jsPDF,
  widget: Widget,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  // Čára pro podpis
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(x, y + height - 8, x + width, y + height - 8);
  
  // Popisek
  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(t(widget.content || 'Podpis'), x + width / 2, y + height - 3, { align: 'center' });
}

// ============================================================
// REPEATER WIDGET - ROZVADĚČE A MÍSTNOSTI
// ============================================================

async function renderRepeaterWidget(
  doc: jsPDF,
  widget: Widget,
  x: number,
  startY: number,
  width: number,
  data: PDFRenderData
): Promise<void> {
  const config = widget.repeaterConfig;
  if (!config) return;
  
  let currentY = startY;
  const gap = (config.gap || 10) * PX_TO_MM;
  const widthMM = width * PX_TO_MM;
  
  if (config.type === 'rozvadece') {
    await renderRozvadeceRepeater(doc, x, currentY, widthMM, gap, data, config);
  } else if (config.type === 'mistnosti') {
    await renderMistnostiRepeater(doc, x, currentY, widthMM, gap, data, config);
  }
}

async function renderRozvadeceRepeater(
  doc: jsPDF,
  x: number,
  startY: number,
  width: number,
  gap: number,
  data: PDFRenderData,
  config: NonNullable<Widget['repeaterConfig']>
): Promise<void> {
  const rozvadece = data.rozvadece || [];
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentBottom = pageHeight - PAGE_MARGINS.bottom - 15; // 15mm pro zápatí
  const contentTop = PAGE_MARGINS.top + 10; // 10mm pro záhlaví
  
  if (rozvadece.length === 0) {
    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Žádné rozvaděče k zobrazení', x, startY + 10);
    return;
  }
  
  let currentY = startY;
  
  for (let i = 0; i < rozvadece.length; i++) {
    const rozvadec = rozvadece[i];
    const okruhy = data.okruhy?.[rozvadec.id!] || [];
    
    // Zkontrolovat zda se minimálně header+info vejde
    if (currentY + 25 > contentBottom) {
      doc.addPage();
      currentY = contentTop;
    }
    
    // Nadpis rozvaděče
    const headerHeight = 8;
    doc.setFillColor(59, 130, 246);
    doc.rect(x, currentY, width, headerHeight, 'F');
    doc.setFontSize(11);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(255, 255, 255);
    const headerText = `Rozvaděč č. ${i + 1}: ${rozvadec.oznaceni || '-'} - ${rozvadec.nazev || '-'}`;
    doc.text(t(headerText), x + 3, currentY + headerHeight - 2);
    currentY += headerHeight + 2;
    
    // Info box
    currentY = renderRozvadecInfo(doc, rozvadec, x, currentY, width);
    
    // Tabulka okruhů s automatickým stránkováním
    if (okruhy.length > 0) {
      currentY = renderOkruhyTableWithPagination(doc, okruhy, x, currentY, width, contentBottom, contentTop);
    } else {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Žádné okruhy', x + 3, currentY + 4);
      currentY += 8;
    }
    
    currentY += gap;
    
    // Separátor
    if (config.showSeparator && i < rozvadece.length - 1) {
      renderSeparator(doc, x, currentY - gap / 2, width, config.separatorStyle);
    }
  }
}

function renderRozvadecInfo(
  doc: jsPDF,
  rozvadec: Rozvadec,
  x: number,
  y: number,
  width: number
): number {
  const infoHeight = 12;
  
  doc.setFillColor(249, 250, 251);
  doc.rect(x, y, width, infoHeight, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, infoHeight);
  
  doc.setFontSize(8);
  
  // Řádek 1
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Umístění:', x + 3, y + 4);
  doc.setTextColor(31, 41, 55);
  doc.text(rozvadec.umisteni || '-', x + 22, y + 4);
  
  doc.setTextColor(107, 114, 128);
  doc.text('Typ:', x + width * 0.4, y + 4);
  doc.setTextColor(31, 41, 55);
  doc.text(rozvadec.typRozvadece || '-', x + width * 0.4 + 10, y + 4);
  
  // Řádek 2
  doc.setTextColor(107, 114, 128);
  doc.text('Krytí:', x + 3, y + 9);
  doc.setTextColor(31, 41, 55);
  doc.text(rozvadec.stupenKryti || '-', x + 15, y + 9);
  
  doc.setTextColor(107, 114, 128);
  doc.text('Proudový chránič:', x + width * 0.4, y + 9);
  doc.setTextColor(31, 41, 55);
  doc.text(rozvadec.proudovyChranicTyp || '-', x + width * 0.4 + 35, y + 9);
  
  return y + infoHeight + 2;
}

/**
 * Renderuje tabulku okruhů s automatickým stránkováním
 */
function renderOkruhyTableWithPagination(
  doc: jsPDF,
  okruhy: Okruh[],
  x: number,
  startY: number,
  width: number,
  contentBottom: number,
  contentTop: number
): number {
  const columns = TABLE_COLUMNS.okruhy.filter(c => c.visible);
  
  // Použít autoTable s automatickým stránkováním
  autoTable(doc, {
    startY: startY,
    head: [columns.map(c => c.label)],
    body: okruhy.map(o => columns.map(col => {
      const key = col.key as keyof Okruh;
      let val = o[key];
      
      // Formátování
      if (key === 'izolacniOdpor' && typeof val === 'number') {
        return val.toFixed(2);
      }
      if (key === 'impedanceSmycky' && typeof val === 'number') {
        return val.toFixed(2);
      }
      
      return val?.toString() || '-';
    })),
    margin: { left: x, right: 10, top: contentTop, bottom: doc.internal.pageSize.getHeight() - contentBottom },
    tableWidth: width,
    styles: {
      font: 'Roboto',
      fontSize: 8,
      cellPadding: 1.5,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: columns.reduce((acc, col, idx) => {
      acc[idx] = { 
        cellWidth: (col.width / 100) * width,
        halign: col.align as 'left' | 'center' | 'right',
      };
      return acc;
    }, {} as Record<number, { cellWidth: number; halign: 'left' | 'center' | 'right' }>),
    // Automatické stránkování - opakovat hlavičku na každé stránce
    showHead: 'everyPage',
    // Callback při přechodu na novou stránku
    didDrawPage: (data) => {
      // Zde můžeme přidat header/footer na nové stránky
      if (data.pageNumber > 1) {
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('(pokračování tabulky okruhů)', x + 3, contentTop - 3);
      }
    },
  });
  
  return doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 3 : startY + 20;
}

async function renderMistnostiRepeater(
  doc: jsPDF,
  x: number,
  startY: number,
  width: number,
  gap: number,
  data: PDFRenderData,
  config: NonNullable<Widget['repeaterConfig']>
): Promise<void> {
  const mistnosti = data.mistnosti || [];
  
  if (mistnosti.length === 0) {
    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Žádné místnosti k zobrazení', x, startY + 10);
    return;
  }
  
  let currentY = startY;
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentBottom = pageHeight - PAGE_MARGINS.bottom - 15;
  const contentTop = PAGE_MARGINS.top + 10;
  
  for (let i = 0; i < mistnosti.length; i++) {
    const mistnost = mistnosti[i];
    const zarizeni = data.zarizeni?.[mistnost.id!] || [];
    
    // Kontrola stránkování - potřebujeme alespoň 25mm pro hlavičku + 1 řádek
    if (currentY + 25 > contentBottom) {
      doc.addPage();
      currentY = contentTop;
    }
    
    // Nadpis místnosti
    const headerHeight = 8;
    doc.setFillColor(34, 197, 94);
    doc.rect(x, currentY, width, headerHeight, 'F');
    doc.setFontSize(11);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(255, 255, 255);
    const headerText = `${mistnost.nazev || '-'} (${mistnost.typ || '-'})`;
    doc.text(t(headerText), x + 3, currentY + headerHeight - 2);
    currentY += headerHeight + 2;
    
    // Tabulka zařízení s automatickým stránkováním
    if (zarizeni.length > 0) {
      currentY = renderZarizeniTableWithPagination(doc, zarizeni, x, currentY, width, contentBottom, contentTop);
    } else {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Žádná zařízení', x + 3, currentY + 4);
      currentY += 8;
    }
    
    currentY += gap;
    
    // Separátor
    if (config.showSeparator && i < mistnosti.length - 1) {
      renderSeparator(doc, x, currentY - gap / 2, width, config.separatorStyle);
    }
  }
}

/**
 * Renderuje tabulku zařízení s automatickým stránkováním
 */
function renderZarizeniTableWithPagination(
  doc: jsPDF,
  zarizeni: Zarizeni[],
  x: number,
  startY: number,
  width: number,
  contentBottom: number,
  contentTop: number
): number {
  const columns = TABLE_COLUMNS.zarizeni.filter(c => c.visible);
  
  autoTable(doc, {
    startY: startY,
    head: [columns.map(c => c.label)],
    body: zarizeni.map(z => columns.map(col => {
      const key = col.key as keyof Zarizeni;
      const val = z[key];
      return val?.toString() || '-';
    })),
    margin: { left: x, right: 10, top: contentTop, bottom: doc.internal.pageSize.getHeight() - contentBottom },
    tableWidth: width,
    styles: {
      font: 'Roboto',
      fontSize: 8,
      cellPadding: 1.5,
    },
    headStyles: {
      fillColor: [34, 197, 94],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },
    showHead: 'everyPage',
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('(pokračování tabulky zařízení)', x + 3, contentTop - 3);
      }
    },
  });
  
  return doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 3 : startY + 20;
}

function renderSeparator(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  style?: Partial<Widget['style']>
): void {
  if (style?.borderStyle === 'dashed') {
    doc.setLineDashPattern([2, 2], 0);
  }
  
  const color = hexToRgb(style?.borderColor || '#e5e7eb');
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth((style?.borderWidth || 1) * 0.3);
  doc.line(x, y, x + width, y);
  doc.setLineDashPattern([], 0);
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

function replacePageNumbers(_doc: jsPDF, _totalPages: number): void {
  // Tato funkce by měla projít dokument a nahradit {{PAGE}} a {{PAGES}}
  // Bohužel jsPDF nemá přímou podporu pro nahrazení textu
  // Řešení: používáme postProcessing nebo jiný přístup
  // Pro teď necháme placeholder - budoucí vylepšení
}
