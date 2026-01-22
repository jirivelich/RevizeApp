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
  
  // headerHeight/footerHeight jsou uloženy v MM v šabloně
  const headerZoneHeight = template.headerHeight || 25;  // výchozí 25mm
  const footerZoneHeight = template.footerHeight || 20;  // výchozí 20mm
  
  // Zónové offsety pro widgety (shodné s designerem)
  // Header: widgety začínají od y=0
  // Content: widgety začínají od y=headerZoneHeight
  // Footer: widgety začínají od y=(pageHeight - footerZoneHeight)
  const contentZoneOffset = headerZoneHeight;
  const footerZoneOffset = pageHeight - footerZoneHeight;
  
  // Renderovat každou stránku šablony
  let actualPageNumber = 0;
  for (let pageIndex = 0; pageIndex < template.pages.length; pageIndex++) {
    const page = template.pages[pageIndex];
    
    if (pageIndex > 0) {
      doc.addPage();
    }
    actualPageNumber++;
    
    // Rozdělit widgety podle zóny
    const headerWidgets = page.widgets.filter(w => w.zone === 'header');
    const footerWidgets = page.widgets.filter(w => w.zone === 'footer');
    const contentWidgets = page.widgets.filter(w => w.zone === 'content');
    
    // 1. Vykreslit header widgety (pozice od y=0)
    for (const widget of headerWidgets.sort((a, b) => a.zIndex - b.zIndex)) {
      await renderWidget(doc, widget, data, template, actualPageNumber, pageWidth, pageHeight, 0);
    }
    
    // 2. Vykreslit content widgety seřazené podle Y pozice (flow layout)
    // Content widgety mají Y relativní k content zóně
    const sortedContent = [...contentWidgets].sort((a, b) => a.y - b.y);
    let lastDynamicEndY = 0;  // Skutečná koncová Y pozice posledního dynamického widgetu (v MM od vrchu stránky)
    let lastDynamicDesignEndY = 0;  // Koncová Y pozice posledního dynamického widgetu v designeru (v px)
    let tableCreatedNewPage = false;
    
    for (const widget of sortedContent) {
      const widgetDesignY = widget.y;  // Y widgetu v designeru (px)
      
      // Základní yOffset = contentZoneOffset (aby widget začínal pod headerem)
      let yOffset = contentZoneOffset;
      
      // Pokud existuje dynamický widget a tento widget je v designeru POD ním,
      // přesuneme ho tak, aby byl těsně za skutečným koncem dynamického widgetu
      if (lastDynamicDesignEndY > 0 && widgetDesignY > lastDynamicDesignEndY) {
        // Widget je v designeru pod dynamickým widgetem
        // Původní Y pozice widgetu v PDF by byla: widgetDesignY * PX_TO_MM + contentZoneOffset
        // Chceme ho přesunout na: lastDynamicEndY + malá mezera (3mm)
        const originalY = widgetDesignY * PX_TO_MM + contentZoneOffset;
        const targetY = lastDynamicEndY + 3;  // 3mm mezera za dynamickým widgetem
        // yOffset musí být takový, aby (widgetDesignY * PX_TO_MM) + yOffset = targetY
        yOffset = targetY - (widgetDesignY * PX_TO_MM);
      }
      
      const result = await renderWidget(doc, widget, data, template, actualPageNumber, pageWidth, pageHeight, yOffset);
      
      // Pokud tento widget je dynamický (tabulka/repeater), zapamatovat jeho skutečný konec
      if (result && result.extraHeight >= 0 && (widget.type === 'table' || widget.type === 'repeater')) {
        // Skutečná koncová pozice = startY + výška widgetu + extraHeight
        const widgetStartY = widgetDesignY * PX_TO_MM + yOffset;
        const widgetHeightMM = widget.height * PX_TO_MM;
        lastDynamicEndY = widgetStartY + widgetHeightMM + result.extraHeight;
        lastDynamicDesignEndY = widgetDesignY + widget.height;  // px
      }
      
      if (result?.newPageCreated) {
        tableCreatedNewPage = true;
        // Reset - na nové stránce začínáme od znova
        lastDynamicEndY = 0;
        lastDynamicDesignEndY = 0;
      }
    }
    
    // 3. Vykreslit footer widgety (pozice od y=(pageHeight - footerHeight))
    if (!tableCreatedNewPage) {
      for (const widget of footerWidgets.sort((a, b) => a.zIndex - b.zIndex)) {
        await renderWidget(doc, widget, data, template, actualPageNumber, pageWidth, pageHeight, footerZoneOffset);
      }
    }
  }
  
  // Získat skutečný počet stránek po renderování (může být více kvůli tabulkám)
  const totalPages = doc.getNumberOfPages();
  
  // Vždy aktualizovat čísla stránek na konci (two-pass approach)
  // Toto zajistí správné "Strana X z Y" i pro dynamicky přidané stránky
  updatePageNumbersInDocument(doc, totalPages);
  
  return doc;
}

// ============================================================
// HEADER/FOOTER RENDERING PRO DYNAMICKÉ STRÁNKY
// ============================================================

/**
 * Vykreslí header/footer widget na dynamicky přidané stránce (z tabulky)
 * Tato funkce je synchronní verze pro použití v autoTable callback
 */
function renderHeaderFooterWidget(
  doc: jsPDF,
  widget: Widget,
  data: PDFRenderData,
  template: DesignerTemplate,
  pageNumber: number
): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  // footerHeight je už v MM
  const footerZoneHeight = template.footerHeight || 20;
  
  const x = widget.x * PX_TO_MM;
  // Header widgety mají Y od 0, footer widgety od (pageHeight - footerZoneHeight)
  const zoneOffset = widget.zone === 'footer' ? (pageHeight - footerZoneHeight) : 0;
  const y = widget.y * PX_TO_MM + zoneOffset;
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
      
    case 'page-number':
      // Pro číslo stránky použijeme placeholder - aktualizuje se na konci
      renderPageNumberWidget(doc, widget, x, y, pageNumber, 999);
      break;
      
    case 'date':
      renderDateWidget(doc, widget, x, y);
      break;
      
    // Image a QR jsou async - přeskočíme je v header/footer dynamických stránek
    // nebo bychom museli přepsat na synchronní verzi
    default:
      break;
  }
}

// ============================================================
// WIDGET RENDERING
// ============================================================

interface RenderResult {
  extraHeight: number;  // Extra výška která se přidala (např. tabulka přetekla)
  newPageCreated: boolean;  // Zda se vytvořila nová stránka
}

async function renderWidget(
  doc: jsPDF,
  widget: Widget,
  data: PDFRenderData,
  template: DesignerTemplate,
  pageIndex: number,
  _pageWidth: number,
  _pageHeight: number,
  yOffset: number = 0
): Promise<RenderResult> {
  const x = widget.x * PX_TO_MM;
  const y = (widget.y * PX_TO_MM) + yOffset;  // Přidat Y offset
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
  
  let result: RenderResult = { extraHeight: 0, newPageCreated: false };
  
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
      result = renderTableWidget(doc, widget, x, y, width, height, data, template, undefined);
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
      result = await renderRepeaterWidget(doc, widget, x, y, width, height, data, template);
      break;
      
    case 'signature':
      renderSignatureWidget(doc, widget, x, y, width, height);
      break;
  }
  
  return result;
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
  
  // Padding je v px, konvertujeme na mm
  const paddingPx = style.padding || 4;
  const padding = paddingPx * PX_TO_MM;
  
  // fontSize v CSS je px, v jsPDF pt (1px ≈ 0.75pt při 96dpi)
  const fontSizePx = style.fontSize || 12;
  const fontSizePt = fontSizePx * 0.75;
  
  // Nastavit font
  doc.setFontSize(fontSizePt);
  doc.setFont('Roboto', style.fontWeight === 'bold' ? 'bold' : 'normal');
  
  if (style.color) {
    const rgb = hexToRgb(style.color);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  } else {
    doc.setTextColor(0, 0, 0);
  }
  
  // LineHeight - násobek velikosti fontu v mm
  const lineHeightMultiplier = style.lineHeight || 1.4;
  const lineHeightMm = (fontSizePt / 2.835) * lineHeightMultiplier; // pt to mm: 1pt = 0.3528mm
  
  // Rozdělení na řádky pro výpočet celkové výšky textu
  const maxWidth = width - 2 * padding;
  const lines = doc.splitTextToSize(t(content), maxWidth);
  const totalTextHeight = lines.length * lineHeightMm;
  
  // Vertikální zarovnání
  let textY: number;
  switch (style.verticalAlign) {
    case 'bottom':
      textY = y + height - padding - totalTextHeight + lineHeightMm;
      break;
    case 'middle':
      textY = y + (height - totalTextHeight) / 2 + lineHeightMm;
      break;
    default: // top
      textY = y + padding + lineHeightMm * 0.8;
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
  
  // Omezit počet řádků, aby text nepřetékal mimo widget
  const maxLines = Math.floor((height - 2 * padding) / lineHeightMm);
  const visibleLines = lines.slice(0, Math.max(1, maxLines));
  
  // Vykreslit text s lineHeight
  doc.text(visibleLines, textX, textY, { align, lineHeightFactor: lineHeightMultiplier });
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
  originalHeight: number,
  data: PDFRenderData,
  template: DesignerTemplate,
  repeaterContext?: RepeaterContext
): RenderResult {
  const config = widget.tableConfig;
  if (!config) return { extraHeight: 0, newPageCreated: false };
  
  const tableData = getTableData(config.type, data, repeaterContext);
  if (tableData.length === 0) {
    // Zobrazit prázdnou tabulku s hlavičkou
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Žádná data', x + 5, y + 8);
    return { extraHeight: 0, newPageCreated: false };
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
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Vypočítat zóny pro automatické stránkování (headerHeight/footerHeight jsou v MM)
  const headerZoneHeight = template.headerHeight || 25;
  const footerZoneHeight = template.footerHeight || 20;
  const contentTop = headerZoneHeight + PAGE_MARGINS.top;
  const contentBottom = pageHeight - footerZoneHeight - PAGE_MARGINS.bottom;
  
  // Najít header a footer widgety z první stránky pro opakování
  const firstPage = template.pages[0];
  const headerWidgets = firstPage?.widgets.filter(w => w.zone === 'header') || [];
  const footerWidgets = firstPage?.widgets.filter(w => w.zone === 'footer') || [];
  
  // Zapamatovat počáteční stránku
  const startPage = doc.getNumberOfPages();
  
  autoTable(doc, {
    startY: y,
    head: config.showHeader ? [headers] : [],
    body: rows,
    margin: { 
      left: x, 
      right: pageWidth - x - width,
      top: contentTop,    // Respektovat header zónu při přechodu na novou stránku
      bottom: pageHeight - contentBottom  // Respektovat footer zónu
    },
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
    // Automatické stránkování - opakovat hlavičku tabulky na každé stránce
    showHead: 'everyPage',
    // Callback při přidání nové stránky
    didDrawPage: (pageData) => {
      // Pokud jsme na nové stránce (ne první), vykreslit header/footer widgety
      if (pageData.pageNumber > 1) {
        // Vykreslit header widgety
        for (const hw of headerWidgets) {
          renderHeaderFooterWidget(doc, hw, data, template, pageData.pageNumber);
        }
        // Vykreslit footer widgety
        for (const fw of footerWidgets) {
          renderHeaderFooterWidget(doc, fw, data, template, pageData.pageNumber);
        }
        
        // Přidat "(pokračování)" label
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('(pokračování tabulky)', x, contentTop - 2);
        doc.setTextColor(0, 0, 0);
      }
    },
  });
  
  // Vypočítat skutečnou výšku tabulky
  const finalY = doc.lastAutoTable?.finalY || y;
  const actualHeight = finalY - y;
  const extraHeight = Math.max(0, actualHeight - originalHeight);
  const newPageCreated = doc.getNumberOfPages() > startPage;
  
  return { extraHeight, newPageCreated };
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
  
  // fontSize v CSS je px, v jsPDF pt (1px ≈ 0.75pt při 96dpi)
  const fontSizePt = (style.fontSize || 12) * 0.75;
  doc.setFontSize(fontSizePt);
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
  
  // fontSize v CSS je px, v jsPDF pt (1px ≈ 0.75pt při 96dpi)
  const fontSizePt = (style.fontSize || 12) * 0.75;
  doc.setFontSize(fontSizePt);
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
  width: number,  // už je v MM
  originalHeight: number,  // původní výška widgetu v MM
  data: PDFRenderData,
  template: DesignerTemplate
): Promise<RenderResult> {
  const config = widget.repeaterConfig;
  if (!config) return { extraHeight: 0, newPageCreated: false };
  
  const gap = (config.gap || 10) * PX_TO_MM;
  // width už je v MM, nekonvertovat znovu!
  
  const startPage = doc.getNumberOfPages();
  let finalY = startY;
  
  if (config.type === 'rozvadece') {
    finalY = await renderRozvadeceRepeater(doc, x, startY, width, gap, data, config, template);
  } else if (config.type === 'mistnosti') {
    finalY = await renderMistnostiRepeater(doc, x, startY, width, gap, data, config, template);
  }
  
  const newPageCreated = doc.getNumberOfPages() > startPage;
  
  // Pokud se vytvořila nová stránka, extraHeight nemá smysl (widgety pod repeaterem se neposunou)
  // Pokud zůstáváme na stejné stránce, spočítáme extra výšku
  let extraHeight = 0;
  if (!newPageCreated) {
    const actualHeight = finalY - startY;
    extraHeight = Math.max(0, actualHeight - originalHeight);
  }
  
  return { extraHeight, newPageCreated };
}

async function renderRozvadeceRepeater(
  doc: jsPDF,
  x: number,
  startY: number,
  width: number,
  gap: number,
  data: PDFRenderData,
  config: NonNullable<Widget['repeaterConfig']>,
  template: DesignerTemplate
): Promise<number> {
  const rozvadece = data.rozvadece || [];
  const pageHeight = doc.internal.pageSize.getHeight();
  const headerZoneHeight = template.headerHeight || 25;
  const footerZoneHeight = template.footerHeight || 20;
  const contentBottom = pageHeight - footerZoneHeight - PAGE_MARGINS.bottom;
  const contentTop = headerZoneHeight + PAGE_MARGINS.top;
  
  // Header a footer widgety z první stránky pro opakování
  const firstPage = template.pages[0];
  const headerWidgets = firstPage?.widgets.filter(w => w.zone === 'header') || [];
  const footerWidgets = firstPage?.widgets.filter(w => w.zone === 'footer') || [];
  
  if (rozvadece.length === 0) {
    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Žádné rozvaděče k zobrazení', x, startY + 10);
    return startY + 15;  // Vrátit pozici za textem
  }
  
  let currentY = startY;
  
  for (let i = 0; i < rozvadece.length; i++) {
    const rozvadec = rozvadece[i];
    const okruhy = data.okruhy?.[rozvadec.id!] || [];
    
    // Zkontrolovat zda se minimálně header+info vejde
    if (currentY + 25 > contentBottom) {
      doc.addPage();
      
      // Vykreslit header/footer na nové stránce
      const pageNum = doc.getNumberOfPages();
      for (const hw of headerWidgets) {
        renderHeaderFooterWidget(doc, hw, data, template, pageNum);
      }
      for (const fw of footerWidgets) {
        renderHeaderFooterWidget(doc, fw, data, template, pageNum);
      }
      
      currentY = contentTop;
    }
    
    // Nadpis rozvaděče - tmavě modrá jako v designeru
    const headerHeight = 8;
    doc.setFillColor(30, 64, 175); // #1e40af - tmavě modrá
    doc.rect(x, currentY, width, headerHeight, 'F');
    doc.setFontSize(11);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(255, 255, 255);
    const headerText = `${rozvadec.oznaceni || `R${i + 1}`} - ${rozvadec.nazev || 'Rozvaděč'}`;
    doc.text(t(headerText), x + 3, currentY + headerHeight - 2);
    currentY += headerHeight;
    
    // Info box
    currentY = renderRozvadecInfo(doc, rozvadec, x, currentY, width);
    
    // Tabulka okruhů s automatickým stránkováním
    if (okruhy.length > 0) {
      currentY = renderOkruhyTableWithPagination(doc, okruhy, x, currentY, width, contentBottom, contentTop, template, data);
    } else {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Žádné okruhy', x + 3, currentY + 4);
      currentY += 8;
    }
    
    // Gap jen mezi rozvaděči, ne za posledním
    if (i < rozvadece.length - 1) {
      currentY += gap;
      
      // Separátor
      if (config.showSeparator) {
        renderSeparator(doc, x, currentY - gap / 2, width, config.separatorStyle);
      }
    }
  }
  
  return currentY;  // Vrátit finální Y pozici
}

function renderRozvadecInfo(
  doc: jsPDF,
  rozvadec: Rozvadec,
  x: number,
  y: number,
  width: number
): number {
  // 3 sloupce jako v designeru
  const infoHeight = 6;
  const colWidth = width / 3;
  
  doc.setFontSize(8);
  doc.setFont('Roboto', 'normal');
  
  // Sloupec 1: Umístění
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.rect(x, y, colWidth, infoHeight, 'F');
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.2);
  doc.rect(x, y, colWidth, infoHeight);
  doc.setTextColor(100, 116, 139); // #64748b
  doc.text('Umístění:', x + 2, y + 4);
  doc.setTextColor(31, 41, 55);
  doc.text(rozvadec.umisteni || '-', x + 18, y + 4);
  
  // Sloupec 2: Typ
  doc.setFillColor(248, 250, 252);
  doc.rect(x + colWidth, y, colWidth, infoHeight, 'F');
  doc.rect(x + colWidth, y, colWidth, infoHeight);
  doc.setTextColor(100, 116, 139);
  doc.text('Typ:', x + colWidth + 2, y + 4);
  doc.setTextColor(31, 41, 55);
  doc.text(rozvadec.typRozvadece || '-', x + colWidth + 10, y + 4);
  
  // Sloupec 3: Krytí
  doc.setFillColor(248, 250, 252);
  doc.rect(x + colWidth * 2, y, colWidth, infoHeight, 'F');
  doc.rect(x + colWidth * 2, y, colWidth, infoHeight);
  doc.setTextColor(100, 116, 139);
  doc.text('Krytí:', x + colWidth * 2 + 2, y + 4);
  doc.setTextColor(31, 41, 55);
  doc.text(rozvadec.stupenKryti || '-', x + colWidth * 2 + 12, y + 4);
  
  return y + infoHeight;
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
  contentTop: number,
  template: DesignerTemplate,
  data: PDFRenderData
): number {
  const columns = TABLE_COLUMNS.okruhy.filter(c => c.visible);
  
  // Header a footer widgety z první stránky pro opakování
  const firstPage = template.pages[0];
  const headerWidgets = firstPage?.widgets.filter(w => w.zone === 'header') || [];
  const footerWidgets = firstPage?.widgets.filter(w => w.zone === 'footer') || [];
  
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
    didDrawPage: (pageData) => {
      // Vykreslit header/footer na nových stránkách
      if (pageData.pageNumber > 1) {
        const pageNum = doc.getNumberOfPages();
        
        // Vykreslit header widgety
        for (const hw of headerWidgets) {
          renderHeaderFooterWidget(doc, hw, data, template, pageNum);
        }
        // Vykreslit footer widgety
        for (const fw of footerWidgets) {
          renderHeaderFooterWidget(doc, fw, data, template, pageNum);
        }
        
        // Přidat "(pokračování)" label
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('(pokračování tabulky okruhů)', x + 3, contentTop - 3);
        doc.setTextColor(0, 0, 0);
      }
    },
  });
  
  // Vrátit pozici těsně za tabulkou (minimální padding 1mm)
  return doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 1 : startY + 20;
}

async function renderMistnostiRepeater(
  doc: jsPDF,
  x: number,
  startY: number,
  width: number,
  gap: number,
  data: PDFRenderData,
  config: NonNullable<Widget['repeaterConfig']>,
  template: DesignerTemplate
): Promise<number> {
  const mistnosti = data.mistnosti || [];
  
  if (mistnosti.length === 0) {
    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Žádné místnosti k zobrazení', x, startY + 10);
    return startY + 15;  // Vrátit pozici za textem
  }
  
  let currentY = startY;
  const pageHeight = doc.internal.pageSize.getHeight();
  const headerZoneHeight = template.headerHeight || 25;
  const footerZoneHeight = template.footerHeight || 20;
  const contentBottom = pageHeight - footerZoneHeight - PAGE_MARGINS.bottom;
  const contentTop = headerZoneHeight + PAGE_MARGINS.top;
  
  // Header a footer widgety z první stránky pro opakování
  const firstPage = template.pages[0];
  const headerWidgets = firstPage?.widgets.filter(w => w.zone === 'header') || [];
  const footerWidgets = firstPage?.widgets.filter(w => w.zone === 'footer') || [];
  
  for (let i = 0; i < mistnosti.length; i++) {
    const mistnost = mistnosti[i];
    const zarizeni = data.zarizeni?.[mistnost.id!] || [];
    
    // Kontrola stránkování - potřebujeme alespoň 25mm pro hlavičku + 1 řádek
    if (currentY + 25 > contentBottom) {
      doc.addPage();
      
      // Vykreslit header/footer na nové stránce
      const pageNum = doc.getNumberOfPages();
      for (const hw of headerWidgets) {
        renderHeaderFooterWidget(doc, hw, data, template, pageNum);
      }
      for (const fw of footerWidgets) {
        renderHeaderFooterWidget(doc, fw, data, template, pageNum);
      }
      
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
    
    // Gap jen mezi místnostmi, ne za poslední
    if (i < mistnosti.length - 1) {
      currentY += gap;
      
      // Separátor
      if (config.showSeparator) {
        renderSeparator(doc, x, currentY - gap / 2, width, config.separatorStyle);
      }
    }
  }
  
  return currentY;  // Vrátit finální Y pozici
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

/**
 * Aktualizuje čísla stránek v dokumentu
 * Voláno po dokončení renderování, když známe skutečný počet stránek
 */
function updatePageNumbersInDocument(doc: jsPDF, totalPages: number): void {
  // jsPDF nemá přímou podporu pro nahrazení textu v existujícím dokumentu
  // Proto používáme přístup, kde čísla stránek jsou renderována s aktuálními hodnotami
  // během prvního průchodu.
  // 
  // Pro případy kdy potřebujeme znát celkový počet stránek předem (např. "Strana 1 z 5"),
  // přidáme footer na každou stránku dodatečně.
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Projít všechny stránky a přidat/aktualizovat číslo stránky v patičce
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Přidat diskrétní číslo stránky do pravého dolního rohu pokud nebylo přidáno
    // Toto je fallback - hlavní stránkování by mělo být řešeno přes page-number widget
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${i} / ${totalPages}`,
      pageWidth - 15,
      pageHeight - 8,
      { align: 'right' }
    );
  }
}
