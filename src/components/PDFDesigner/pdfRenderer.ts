// pdfRenderer.ts - Renderování šablony do PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DesignerTemplate, Widget } from './types';
import type { Revize, Nastaveni, Rozvadec, Okruh, Zavada, Mistnost, Zarizeni, MericiPristroj, Zakaznik } from '../../types';
import { addCzechFont, t } from '../../services/fontUtils';

// Rozšíření jsPDF o autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

// Data pro renderování PDF
export interface PDFRenderData {
  revize: Revize;
  nastaveni: Nastaveni | null;
  rozvadece?: Rozvadec[];
  okruhy?: Record<number, Okruh[]>; // rozvadecId -> okruhy
  zavady?: Zavada[];
  mistnosti?: Mistnost[];
  zarizeni?: Record<number, Zarizeni[]>; // mistnostId -> zarizeni
  pouzitePristroje?: MericiPristroj[];
  zakaznik?: Zakaznik | null;
}

// Konverze px na mm (používáme 3.78 px/mm v designeru)
const PX_TO_MM = 1 / 3.78;

/**
 * Nahradí proměnné v textu skutečnými hodnotami
 */
function resolveVariables(text: string, data: PDFRenderData): string {
  if (!text) return '';
  
  let resolved = text;
  
  // Najdi všechny ${...} proměnné
  const varRegex = /\$\{([^}]+)\}/g;
  let match;
  
  while ((match = varRegex.exec(text)) !== null) {
    const varPath = match[1];
    const value = getVariableValue(varPath, data);
    resolved = resolved.replace(match[0], value);
  }
  
  return resolved;
}

/**
 * Získá hodnotu proměnné podle cesty
 */
function getVariableValue(path: string, data: PDFRenderData): string {
  const { revize, nastaveni, zakaznik, rozvadece, zavady, mistnosti, pouzitePristroje } = data;
  
  // Revize
  if (path.startsWith('revize.')) {
    const field = path.replace('revize.', '') as keyof Revize;
    let val = revize[field];
    
    // Formátování dat
    if (field === 'datum' || field === 'datumDokonceni' || field === 'datumPlatnosti' || field === 'datumVypracovani') {
      return val ? new Date(val as string).toLocaleDateString('cs-CZ') : '-';
    }
    
    return val?.toString() || '-';
  }
  
  // Nastavení (firma a technik)
  if (path.startsWith('nastaveni.')) {
    const field = path.replace('nastaveni.', '') as keyof Nastaveni;
    if (!nastaveni) return '-';
    return nastaveni[field]?.toString() || '-';
  }
  
  // Zákazník
  if (path.startsWith('zakaznik.')) {
    const field = path.replace('zakaznik.', '') as keyof Zakaznik;
    if (!zakaznik) return '-';
    return zakaznik[field]?.toString() || '-';
  }
  
  // Statistiky
  if (path === 'stats.pocetRozvadecu') {
    return rozvadece?.length.toString() || '0';
  }
  if (path === 'stats.pocetZavad') {
    return zavady?.length.toString() || '0';
  }
  if (path === 'stats.pocetMistnosti') {
    return mistnosti?.length.toString() || '0';
  }
  if (path === 'stats.pocetPristroju') {
    return pouzitePristroje?.length.toString() || '0';
  }
  
  // Speciální
  if (path === 'today') {
    return new Date().toLocaleDateString('cs-CZ');
  }
  if (path === 'currentPage') {
    return '${currentPage}'; // Bude nahrazeno při renderování stránky
  }
  if (path === 'totalPages') {
    return '${totalPages}'; // Bude nahrazeno při renderování stránky
  }
  
  return '-';
}

/**
 * Renderuje šablonu do PDF
 */
export async function renderTemplateToPDF(
  template: DesignerTemplate,
  data: PDFRenderData
): Promise<jsPDF> {
  // Vytvořit dokument - použít první stránku pro určení orientace a velikosti
  const firstPage = template.pages[0];
  const orientation = firstPage?.orientation === 'landscape' ? 'l' : 'p';
  const format = firstPage?.size === 'a5' ? 'a5' : firstPage?.size === 'letter' ? 'letter' : 'a4';
  
  const doc = new jsPDF(orientation, 'mm', format);
  
  // Přidat font
  await addCzechFont(doc);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Renderovat každou stránku šablony
  for (let pageIndex = 0; pageIndex < template.pages.length; pageIndex++) {
    const page = template.pages[pageIndex];
    
    if (pageIndex > 0) {
      doc.addPage();
    }
    
    // Renderovat všechny widgety na stránce
    const widgets = [...page.widgets].sort((a, b) => a.zIndex - b.zIndex);
    
    for (const widget of widgets) {
      await renderWidget(doc, widget, data, template, pageIndex, pageWidth, pageHeight);
    }
  }
  
  // Nahradit čísla stránek
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Toto je placeholder - jsPDF nemá přímou podporu pro nahrazení textu
  }
  
  return doc;
}

/**
 * Renderuje jeden widget
 */
async function renderWidget(
  doc: jsPDF,
  widget: Widget,
  data: PDFRenderData,
  template: DesignerTemplate,
  pageIndex: number,
  _pageWidth: number,
  _pageHeight: number
): Promise<void> {
  // Převod pozice z px na mm
  const x = widget.x * PX_TO_MM;
  const y = widget.y * PX_TO_MM;
  const width = widget.width * PX_TO_MM;
  const height = widget.height * PX_TO_MM;
  
  const style = widget.style || {};
  
  // Nastavit font
  doc.setFontSize(style.fontSize || 10);
  doc.setFont('Roboto', style.fontWeight === 'bold' ? 'bold' : 'normal');
  
  // Nastavit barvu textu
  if (style.color) {
    const rgb = hexToRgb(style.color);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  } else {
    doc.setTextColor(0, 0, 0);
  }
  
  switch (widget.type) {
    case 'text':
    case 'variable':
      renderTextWidget(doc, widget, x, y, width, height, data);
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
      
    case 'repeater':
      await renderRepeaterWidget(doc, widget, x, y, width, data, template);
      break;
      
    case 'signature':
      renderSignatureWidget(doc, widget, x, y, width, height);
      break;
  }
}

/**
 * Renderuje textový widget
 */
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
  const content = widget.type === 'variable' 
    ? resolveVariables(widget.content, data)
    : widget.content;
  
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
  
  // Text
  const padding = style.padding || 2;
  const textX = x + padding;
  const fontSize = style.fontSize || 10;
  
  // Vertikální zarovnání
  let textY: number;
  const lineHeight = fontSize * 0.4; // Přibližná výška řádku v mm
  
  switch (style.verticalAlign) {
    case 'bottom':
      textY = y + height - padding;
      break;
    case 'middle':
      textY = y + height / 2 + lineHeight / 2;
      break;
    default: // top
      textY = y + padding + lineHeight;
  }
  
  // Horizontální zarovnání
  let align: 'left' | 'center' | 'right' = 'left';
  let actualTextX = textX;
  
  if (style.textAlign === 'center') {
    align = 'center';
    actualTextX = x + width / 2;
  } else if (style.textAlign === 'right') {
    align = 'right';
    actualTextX = x + width - padding;
  }
  
  // Rozdělení na řádky pokud text přetéká
  const maxWidth = width - 2 * padding;
  const lines = doc.splitTextToSize(t(content), maxWidth);
  
  doc.text(lines, actualTextX, textY, { align });
}

/**
 * Renderuje box widget (obdélník)
 */
function renderBoxWidget(
  doc: jsPDF,
  widget: Widget,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const style = widget.style || {};
  
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
}

/**
 * Renderuje čáru
 */
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

/**
 * Renderuje obrázek
 */
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
  
  // Speciální případy
  if (widget.content === '${nastaveni.logo}' && data.nastaveni?.logo) {
    imageData = data.nastaveni.logo;
  }
  
  if (!imageData || !imageData.startsWith('data:image')) {
    // Placeholder pro chybějící obrázek
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(x, y, width, height);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Obrázek', x + width / 2, y + height / 2, { align: 'center' });
    return;
  }
  
  try {
    // Detekce formátu
    let format: 'PNG' | 'JPEG' = 'PNG';
    if (imageData.includes('image/jpeg') || imageData.includes('image/jpg')) {
      format = 'JPEG';
    }
    
    doc.addImage(imageData, format, x, y, width, height);
  } catch (error) {
    console.error('Failed to add image:', error);
    // Fallback - zkusit jiný formát
    try {
      doc.addImage(imageData, 'JPEG', x, y, width, height);
    } catch {
      // Ignorovat chybu, nechat prázdné místo
    }
  }
}

/**
 * Renderuje tabulku
 */
function renderTableWidget(
  doc: jsPDF,
  widget: Widget,
  x: number,
  y: number,
  width: number,
  data: PDFRenderData
): void {
  const config = widget.tableConfig;
  if (!config) return;
  
  const tableData = getTableData(config.type, data);
  if (tableData.length === 0) return;
  
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
      acc[idx] = { cellWidth: col.width ? col.width * PX_TO_MM : 'auto' };
      return acc;
    }, {} as Record<number, { cellWidth: number | 'auto' }>),
  });
}

/**
 * Získá data pro tabulku
 */
function getTableData(type: string, data: PDFRenderData): Record<string, unknown>[] {
  switch (type) {
    case 'rozvadece':
      return (data.rozvadece || []).map(r => ({
        nazev: r.nazev,
        oznaceni: r.oznaceni,
        umisteni: r.umisteni,
        typRozvadece: r.typRozvadece,
        stupenKryti: r.stupenKryti,
      }));
      
    case 'okruhy':
      // Všechny okruhy ze všech rozvaděčů
      const allOkruhy: Okruh[] = [];
      if (data.okruhy) {
        Object.values(data.okruhy).forEach(okruhyList => {
          allOkruhy.push(...okruhyList);
        });
      }
      return allOkruhy.map(o => ({
        cislo: o.cislo,
        nazev: o.nazev,
        jisticTyp: o.jisticTyp,
        jisticProud: o.jisticProud,
        vodic: o.vodic,
        izolacniOdpor: o.izolacniOdpor,
        impedanceSmycky: o.impedanceSmycky,
      }));
      
    case 'zavady':
      return (data.zavady || []).map(z => ({
        popis: z.popis,
        zavaznost: z.zavaznost,
        stav: z.stav,
        poznamka: z.poznamka || '-',
      }));
      
    case 'mistnosti':
      return (data.mistnosti || []).map(m => ({
        nazev: m.nazev,
        typ: m.typ,
        plocha: m.plocha,
        patro: m.patro || '-',
      }));
      
    case 'pristroje':
      return (data.pouzitePristroje || []).map(p => ({
        nazev: p.nazev,
        vyrobce: p.vyrobce,
        vyrobniCislo: p.vyrobniCislo,
        platnostDo: p.platnostKalibrace ? new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ') : '-',
      }));
      
    default:
      return [];
  }
}

/**
 * Renderuje číslo stránky
 */
function renderPageNumberWidget(
  doc: jsPDF,
  widget: Widget,
  x: number,
  y: number,
  currentPage: number,
  totalPages: number
): void {
  const style = widget.style || {};
  const template = widget.content || 'Stránka ${currentPage} z ${totalPages}';
  
  const text = template
    .replace('${currentPage}', currentPage.toString())
    .replace('${totalPages}', totalPages.toString());
  
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

/**
 * Renderuje datum
 */
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

/**
 * Renderuje repeater widget (opakující se skupina)
 */
async function renderRepeaterWidget(
  doc: jsPDF,
  widget: Widget,
  x: number,
  startY: number,
  width: number,
  data: PDFRenderData,
  _template: DesignerTemplate
): Promise<void> {
  const config = widget.repeaterConfig;
  if (!config) return;
  
  let currentY = startY;
  const gap = config.gap || 10;
  
  // Podle typu repeateru získat data
  if (config.type === 'rozvadece') {
    const rozvadece = data.rozvadece || [];
    
    for (const rozvadec of rozvadece) {
      // Pro každý rozvaděč renderovat šablonu
      const okruhyRozvadece = data.okruhy?.[rozvadec.id!] || [];
      
      // Renderovat jednotlivé položky šablony
      for (const item of config.template) {
        const itemX = x + (item.relativeX || 0) * PX_TO_MM;
        const itemY = currentY + (item.relativeY || 0) * PX_TO_MM;
        const itemHeight = (item.height || 20) * PX_TO_MM;
        
        // Pro repeater items používáme jiný přístup - interpretujeme 'text' jako nadpis, 'box' jako info
        if (item.type === 'text' && item.name?.toLowerCase().includes('nadpis')) {
          // Nadpis rozvaděče
          doc.setFillColor(59, 130, 246); // blue-500
          doc.rect(itemX, itemY, width, itemHeight, 'F');
          doc.setFontSize(item.style?.fontSize || 12);
          doc.setFont('Roboto', 'bold');
          doc.setTextColor(255, 255, 255);
          const headingText = (item.content || '')
            .replace('${nazev}', rozvadec.nazev)
            .replace('${oznaceni}', rozvadec.oznaceni);
          doc.text(t(headingText), itemX + 4, itemY + itemHeight - 4);
        } else if (item.type === 'box' || (item.type === 'text' && item.name?.toLowerCase().includes('info'))) {
          // Info box s detaily rozvaděče
          doc.setFillColor(243, 244, 246); // gray-100
          doc.rect(itemX, itemY, width, itemHeight, 'F');
          doc.setDrawColor(209, 213, 219); // gray-300
          doc.setLineWidth(0.3);
          doc.rect(itemX, itemY, width, itemHeight);
          
          doc.setFontSize(9);
          doc.setFont('Roboto', 'normal');
          doc.setTextColor(55, 65, 81); // gray-700
          
          const infoLines = [
            `Umístění: ${rozvadec.umisteni || '-'}`,
            `Typ: ${rozvadec.typRozvadece || '-'}`,
            `Krytí: ${rozvadec.stupenKryti || '-'}`,
          ];
          
          let infoY = itemY + 5;
          for (const line of infoLines) {
            doc.text(t(line), itemX + 4, infoY);
            infoY += 5;
          }
        } else if (item.type === 'table') {
          // Tabulka okruhů
          if (okruhyRozvadece.length > 0) {
            autoTable(doc, {
              startY: itemY,
              head: [['Č.', 'Název', 'Jistič', 'Proud', 'Vodič', 'Riz [MΩ]', 'Zs [Ω]']],
              body: okruhyRozvadece.map(o => [
                o.cislo?.toString() || '-',
                o.nazev || '-',
                o.jisticTyp || '-',
                  o.jisticProud || '-',
                  o.vodic || '-',
                  o.izolacniOdpor?.toFixed(2) || '-',
                  o.impedanceSmycky?.toFixed(2) || '-',
                ]),
                margin: { left: itemX },
                tableWidth: width,
                styles: {
                  font: 'Roboto',
                  fontSize: 8,
                  cellPadding: 2,
                },
                headStyles: {
                  fillColor: [59, 130, 246],
                  textColor: [255, 255, 255],
                  fontStyle: 'bold',
                },
                alternateRowStyles: {
                  fillColor: [249, 250, 251],
                },
              });
              
              // Aktualizovat Y pozici podle výšky tabulky
              if (doc.lastAutoTable) {
                currentY = doc.lastAutoTable.finalY;
              }
            }
          }
        }
      }

      currentY += gap;
    }

  // Podobně pro mistnosti...
  if (config.type === 'mistnosti') {
    const mistnosti = data.mistnosti || [];
    
    for (const mistnost of mistnosti) {
      const zarizeniMistnosti = data.zarizeni?.[mistnost.id!] || [];
      
      for (const item of config.template) {
        const itemX = x + (item.relativeX || 0) * PX_TO_MM;
        const itemY = currentY + (item.relativeY || 0) * PX_TO_MM;
        const itemHeight = (item.height || 20) * PX_TO_MM;
        
        if (item.type === 'text' && item.name?.toLowerCase().includes('nadpis')) {
          doc.setFillColor(34, 197, 94); // green-500
          doc.rect(itemX, itemY, width, itemHeight, 'F');
          doc.setFontSize(item.style?.fontSize || 12);
          doc.setFont('Roboto', 'bold');
          doc.setTextColor(255, 255, 255);
          const headingText = (item.content || '')
            .replace('${nazev}', mistnost.nazev || '-')
            .replace('${typ}', mistnost.typ || '-');
          doc.text(t(headingText), itemX + 4, itemY + itemHeight - 4);
        } else if (item.type === 'table') {
          if (zarizeniMistnosti.length > 0) {
            autoTable(doc, {
              startY: itemY,
              head: [['Název', 'Třída', 'Stav', 'Poznámka']],
              body: zarizeniMistnosti.map((z: Zarizeni) => [
                z.nazev || '-',
                z.trida || '-',
                z.stav || '-',
                z.poznamka || '-',
              ]),
              margin: { left: itemX },
              tableWidth: width,
              styles: {
                font: 'Roboto',
                fontSize: 8,
                cellPadding: 2,
              },
              headStyles: {
                fillColor: [34, 197, 94],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
              },
            });
            
            if (doc.lastAutoTable) {
              currentY = doc.lastAutoTable.finalY;
            }
          }
        }
      }
      
      currentY += gap;
    }
  }
}

/**
 * Renderuje podpisový widget
 */
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

/**
 * Převede hex barvu na RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

/**
 * Otevře PDF náhled v novém okně
 */
export async function openPDFPreview(
  template: DesignerTemplate,
  data: PDFRenderData
): Promise<void> {
  try {
    const doc = await renderTemplateToPDF(template, data);
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
    
    // Uvolnit URL po chvíli
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (error) {
    console.error('Failed to generate PDF preview:', error);
    throw error;
  }
}

/**
 * Stáhne PDF
 */
export async function downloadPDF(
  template: DesignerTemplate,
  data: PDFRenderData,
  filename?: string
): Promise<void> {
  try {
    const doc = await renderTemplateToPDF(template, data);
    const name = filename || `${template.name.replace(/\s+/g, '_')}.pdf`;
    doc.save(name);
  } catch (error) {
    console.error('Failed to download PDF:', error);
    throw error;
  }
}
