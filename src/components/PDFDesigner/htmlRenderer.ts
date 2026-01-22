// htmlRenderer.ts - Renderování šablony do HTML pro náhled
// Generuje samostatné stránky pro správný tisk

import type { DesignerTemplate, Widget } from './types';
import type { PDFRenderData } from './pdfVariables';
import { getVariableValue, resolveVariables } from './pdfVariables';
import { TABLE_COLUMNS, PAGE_SIZES } from './constants';

// Konverze: designer používá px, HTML náhled používá mm pro skutečnou velikost
const PX_TO_MM = 1 / 3.78;

/**
 * Renderuje šablonu do HTML stringu pro náhled
 * Generuje samostatné stránky pro správný tisk
 */
export function renderTemplateToHTML(
  template: DesignerTemplate,
  data: PDFRenderData
): string {
  const firstPage = template.pages[0];
  const pageSize = PAGE_SIZES[firstPage?.size || 'a4'] || PAGE_SIZES.a4;
  const isLandscape = firstPage?.orientation === 'landscape';
  const pageWidthMM = isLandscape ? pageSize.height : pageSize.width;
  const pageHeightMM = isLandscape ? pageSize.width : pageSize.height;
  
  const headerHeightMM = template.headerHeight || 25;
  const footerHeightMM = template.footerHeight || 20;
  const contentStartMM = headerHeightMM;
  const contentEndMM = pageHeightMM - footerHeightMM;
  
  // Header/footer widgety z první stránky
  const headerWidgets = firstPage?.widgets.filter(w => w.zone === 'header') || [];
  const footerWidgets = firstPage?.widgets.filter(w => w.zone === 'footer') || [];
  
  // Sebrat content widgety ze všech stránek S INFORMACÍ O STRÁNCE
  interface WidgetWithPage {
    widget: Widget;
    pageIndex: number; // Na které stránce je widget v designeru (0-based)
  }
  const allContentWidgets: WidgetWithPage[] = [];
  for (let pageIdx = 0; pageIdx < template.pages.length; pageIdx++) {
    const page = template.pages[pageIdx];
    const contentWidgets = page.widgets.filter(w => w.zone === 'content');
    for (const widget of contentWidgets) {
      allContentWidgets.push({ widget, pageIndex: pageIdx });
    }
  }
  
  // Seřadit podle stránky a pak podle Y pozice
  const sortedWidgets = [...allContentWidgets].sort((a, b) => {
    if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex;
    return a.widget.y - b.widget.y;
  });
  
  // === FÁZE 1: Generovat všechny elementy s absolutními pozicemi ===
  interface PositionedElement {
    html: string;
    yMM: number; // Absolutní Y pozice v mm od začátku dokumentu
  }
  
  const allElements: PositionedElement[] = [];
  
  // Informace o repeaterech pro výpočet offsetu
  interface RepeaterInfo {
    pageIndex: number;        // Na které stránce je repeater v designeru
    originalStartYMM: number; // Kde repeater začíná (absolutní pozice)
    originalEndYMM: number;   // Kde repeater končí v designeru
    actualEndYMM: number;     // Kde repeater skutečně končí po renderování
  }
  const repeaterInfos: RepeaterInfo[] = [];
  
  // Sledovat kumulativní růst
  let cumulativeGrowth = 0;
  
  // Mezera mezi stránkami šablony (záhlaví + zápatí)
  const pageGapMM = headerHeightMM + footerHeightMM;
  
  // První průchod - zpracovat repeatery a zjistit jejich růst
  for (const { widget, pageIndex } of sortedWidgets) {
    if (widget.type === 'repeater') {
      // Absolutní pozice = stránka * výška stránky + header + Y widgetu + kumulativní růst
      const pageStartMM = pageIndex * pageHeightMM;
      const originalStartYMM = pageStartMM + headerHeightMM + widget.y * PX_TO_MM;
      const originalEndYMM = pageStartMM + headerHeightMM + (widget.y + widget.height) * PX_TO_MM;
      
      const adjustedStartYMM = originalStartYMM + cumulativeGrowth;
      
      const result = generateRepeaterElements(
        widget, data, widget.x * PX_TO_MM, widget.width * PX_TO_MM,
        pageHeightMM, contentStartMM, contentEndMM, adjustedStartYMM
      );
      
      allElements.push(...result.elements);
      
      const growth = result.endYMM - (originalEndYMM + cumulativeGrowth);
      
      repeaterInfos.push({
        pageIndex,
        originalStartYMM,
        originalEndYMM,
        actualEndYMM: result.endYMM
      });
      
      // Přidat růst do kumulativního růstu
      if (growth > 0) {
        cumulativeGrowth += growth;
      }
      
      console.log(`[htmlRenderer] Repeater "${widget.name}" (page ${pageIndex + 1}): originalEnd=${originalEndYMM.toFixed(1)}mm, actualEnd=${result.endYMM.toFixed(1)}mm, growth=${growth.toFixed(1)}mm, cumGrowth=${cumulativeGrowth.toFixed(1)}mm`);
    }
  }
  
  // Debug info pro widgety
  const widgetDebugInfo: string[] = [];
  
  // Druhý průchod - zpracovat běžné widgety s offsetem
  for (const { widget, pageIndex } of sortedWidgets) {
    if (widget.type === 'repeater') continue; // Už zpracováno
    
    // Absolutní pozice widgetu v designeru
    const pageStartMM = pageIndex * pageHeightMM;
    const originalYMM = pageStartMM + headerHeightMM + widget.y * PX_TO_MM;
    
    // Virtuální tisková stránka widgetu (v originálním designeru)
    const widgetVirtualPage = Math.floor(originalYMM / pageHeightMM);
    
    // Spočítat offset z repeaterů
    // Widget dostane offset pokud je ZA repeaterem (má vyšší Y než PŮVODNÍ konec repeateru)
    let offsetMM = 0;
    for (const ri of repeaterInfos) {
      // Widget je ZA repeaterem pokud jeho absolutní Y >= repeater end
      if (originalYMM >= ri.originalEndYMM) {
        const growth = ri.actualEndYMM - ri.originalEndYMM;
        if (growth > 0) {
          offsetMM += growth;
        }
        
        // Kompenzovat mezeru mezi virtuálními stránkami v designeru
        // Pokud widget je na jiné virtuální stránce než konec repeateru,
        // odečíst záhlaví+zápatí za každou virtuální stránku mezi nimi
        const repeaterEndVirtualPage = Math.floor(ri.originalEndYMM / pageHeightMM);
        if (widgetVirtualPage > repeaterEndVirtualPage) {
          const virtualPagesBetween = widgetVirtualPage - repeaterEndVirtualPage;
          // pageGapMM + 9mm pro správnou mezeru mezi widgety
          offsetMM -= virtualPagesBetween * (pageGapMM + 9);
        }
      }
    }
    
    const x = widget.x * PX_TO_MM;
    const y = originalYMM + offsetMM;
    
    // Sbírat debug info pro zobrazení v náhledu
    const debugLine = `${widget.name} (vp${widgetVirtualPage + 1}): origY=${originalYMM.toFixed(0)}, off=${offsetMM.toFixed(0)}, final=${y.toFixed(0)}`;
    widgetDebugInfo.push(debugLine);
    
    // Log pro debugging
    console.log(`[htmlRenderer] Widget "${widget.name}" (page ${pageIndex + 1}): originalY=${originalYMM.toFixed(1)}mm, offset=${offsetMM.toFixed(1)}mm, finalY=${y.toFixed(1)}mm`);
    
    allElements.push({
      html: renderWidgetAtPosition(widget, data, x, y).html,
      yMM: y
    });
  }
  
  // === FÁZE 2: Určit celkový počet stránek ===
  let maxYMM: number = pageHeightMM;
  for (const el of allElements) {
    maxYMM = Math.max(maxYMM, el.yMM + 10); // +10mm buffer
  }
  const totalPages = Math.max(1, Math.ceil(maxYMM / pageHeightMM));
  
  // Debug alert - zobrazí se při generování náhledu
  const debugInfo = repeaterInfos.map(ri => 
    `Repeater (page ${ri.pageIndex + 1}): end=${ri.originalEndYMM.toFixed(0)}mm, actualEnd=${ri.actualEndYMM.toFixed(0)}mm, growth=${(ri.actualEndYMM - ri.originalEndYMM).toFixed(0)}mm`
  ).join('\n');
  console.log('[htmlRenderer] DEBUG:\n' + debugInfo + '\ntotalPages: ' + totalPages);
  
  // === FÁZE 3: Rozdělit elementy na stránky ===
  const pageElements: PositionedElement[][] = [];
  for (let i = 0; i < totalPages; i++) {
    pageElements.push([]);
  }
  
  for (const el of allElements) {
    const pageIdx = Math.floor(el.yMM / pageHeightMM);
    if (pageIdx < totalPages) {
      // Přepočítat Y pozici relativně ke stránce
      const relativeY = el.yMM - pageIdx * pageHeightMM;
      const adjustedHtml = el.html.replace(
        /top:\s*[\d.]+mm/,
        `top: ${relativeY}mm`
      );
      pageElements[pageIdx].push({
        html: adjustedHtml,
        yMM: relativeY
      });
    }
  }
  
  // === FÁZE 4: Generovat HTML pro každou stránku ===
  const pagesHTML: string[] = [];
  
  for (let i = 0; i < totalPages; i++) {
    // Header widgety
    let headerHTML = '';
    for (const w of headerWidgets) {
      const x = w.x * PX_TO_MM;
      const y = w.y * PX_TO_MM;
      headerHTML += renderWidgetAtPosition(w, data, x, y).html;
    }
    
    // Footer widgety
    let footerHTML = '';
    for (const w of footerWidgets) {
      const x = w.x * PX_TO_MM;
      const y = (pageHeightMM - footerHeightMM) + w.y * PX_TO_MM;
      let html = renderWidgetAtPosition(w, data, x, y).html;
      html = html.replace(/\{page\}/g, String(i + 1));
      html = html.replace(/\{pages\}/g, String(totalPages));
      footerHTML += html;
    }
    
    // Content elementy pro tuto stránku
    const contentHTML = pageElements[i].map(el => el.html).join('\n');
    
    pagesHTML.push(`
      <div class="print-page" style="
        width: ${pageWidthMM}mm;
        height: ${pageHeightMM}mm;
        background: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        position: relative;
        overflow: hidden;
        font-family: 'Roboto', Arial, sans-serif;
        flex-shrink: 0;
      ">
        ${headerHTML}
        ${contentHTML}
        ${footerHTML}
      </div>
      ${i < totalPages - 1 ? `
        <div class="page-separator" style="
          width: ${pageWidthMM}mm;
          height: 0;
          border-top: 2px dashed #94a3b8;
          margin: 5px 0;
        "></div>
      ` : ''}
    `);
  }
  
  // Debug overlay HTML
  const debugOverlay = `
    <div style="
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      color: #0f0;
      padding: 10px;
      font-family: monospace;
      font-size: 11px;
      max-width: 400px;
      max-height: 300px;
      overflow: auto;
      z-index: 9999;
      border-radius: 4px;
    ">
      <strong>DEBUG:</strong><br/>
      ${repeaterInfos.map(ri => 
        `Rep(p${ri.pageIndex + 1}): end=${ri.originalEndYMM.toFixed(0)}, actual=${ri.actualEndYMM.toFixed(0)}, grow=${(ri.actualEndYMM - ri.originalEndYMM).toFixed(0)}`
      ).join('<br/>')}
      <br/><br/>
      ${widgetDebugInfo.join('<br/>')}
    </div>
  `;

  return `
    <div class="html-preview-container" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      background: #525659;
      min-height: 100%;
      gap: 10px;
    ">
      ${debugOverlay}
      ${pagesHTML.join('\n')}
    </div>
  `;
}

/**
 * Generuje elementy repeateru s pozicemi
 */
function generateRepeaterElements(
  widget: Widget,
  data: PDFRenderData,
  xMM: number,
  widthMM: number,
  pageHeightMM: number,
  contentStartMM: number,
  contentEndMM: number,
  absoluteStartYMM: number
): { elements: Array<{html: string; yMM: number}>; endYMM: number } {
  const config = widget.repeaterConfig;
  if (!config) {
    return { 
      elements: [{
        html: `<div style="position: absolute; left: ${xMM}mm; top: ${absoluteStartYMM}mm; color: red;">Repeater bez konfigurace</div>`,
        yMM: absoluteStartYMM
      }],
      endYMM: absoluteStartYMM + 30
    };
  }
  
  const gapMM = (config.gap || 10) * PX_TO_MM;
  const headerMM = 7;
  const infoMM = 7;
  const rowMM = 5;
  const tableHeaderMM = 6;
  const emptyMsgMM = 6;
  
  const elements: Array<{html: string; yMM: number}> = [];
  let currentYMM = absoluteStartYMM;
  
  const checkPageBreak = (neededMM: number) => {
    const currentPage = Math.floor(currentYMM / pageHeightMM);
    const yOnPage = currentYMM - currentPage * pageHeightMM;
    
    if (yOnPage + neededMM > contentEndMM) {
      const nextPage = currentPage + 1;
      currentYMM = nextPage * pageHeightMM + contentStartMM;
    }
  };
  
  if (config.type === 'rozvadece') {
    const rozvadece = data.rozvadece || [];
    
    if (rozvadece.length === 0) {
      elements.push({
        html: `<div style="position: absolute; left: ${xMM}mm; top: ${absoluteStartYMM}mm; padding: 2mm; color: #999;">Žádné rozvaděče</div>`,
        yMM: absoluteStartYMM
      });
      return { elements, endYMM: absoluteStartYMM + 10 };
    }
    
    for (let i = 0; i < rozvadece.length; i++) {
      const rozv = rozvadece[i];
      const okruhy = data.okruhy?.[rozv.id!] || [];
      
      if (i > 0) currentYMM += gapMM;
      
      checkPageBreak(headerMM + infoMM + 20);
      
      // Header rozvaděče
      elements.push({
        html: `<div style="position: absolute; left: ${xMM}mm; top: ${currentYMM}mm; width: ${widthMM}mm; background: #1e40af; color: white; padding: 1.5mm 2.5mm; font-weight: bold; font-size: 10pt; box-sizing: border-box;">
          ${escapeHtml(rozv.oznaceni || `R${i+1}`)} - ${escapeHtml(rozv.nazev || 'Rozvaděč')}
        </div>`,
        yMM: currentYMM
      });
      currentYMM += headerMM;
      
      // Info
      elements.push({
        html: `<div style="position: absolute; left: ${xMM}mm; top: ${currentYMM}mm; width: ${widthMM}mm; background: #f8fafc; border: 0.3mm solid #e2e8f0; font-size: 8pt; display: grid; grid-template-columns: 1fr 1fr 1fr; box-sizing: border-box;">
          <div style="padding: 1mm 2mm; border-right: 0.3mm solid #e2e8f0;"><span style="color: #64748b;">Umístění:</span> ${escapeHtml(rozv.umisteni || '-')}</div>
          <div style="padding: 1mm 2mm; border-right: 0.3mm solid #e2e8f0;"><span style="color: #64748b;">Typ:</span> ${escapeHtml(rozv.typRozvadece || '-')}</div>
          <div style="padding: 1mm 2mm;"><span style="color: #64748b;">Krytí:</span> ${escapeHtml(rozv.stupenKryti || '-')}</div>
        </div>`,
        yMM: currentYMM
      });
      currentYMM += infoMM;
      
      if (okruhy.length > 0) {
        const columns = TABLE_COLUMNS.okruhy.filter(c => c.visible);
        
        checkPageBreak(tableHeaderMM);
        elements.push({
          html: `<div style="position: absolute; left: ${xMM}mm; top: ${currentYMM}mm; width: ${widthMM}mm;">
            <table style="width: 100%; border-collapse: collapse; font-size: 7pt;">
              <thead>
                <tr style="background: #3b82f6; color: white;">
                  ${columns.map(col => `<th style="padding: 0.8mm 0.5mm; text-align: ${col.align}; border: 0.3mm solid #3b82f6;">${escapeHtml(col.label)}</th>`).join('')}
                </tr>
              </thead>
            </table>
          </div>`,
          yMM: currentYMM
        });
        currentYMM += tableHeaderMM;
        
        for (let rowIdx = 0; rowIdx < okruhy.length; rowIdx++) {
          const okruh = okruhy[rowIdx];
          checkPageBreak(rowMM);
          
          elements.push({
            html: `<div style="position: absolute; left: ${xMM}mm; top: ${currentYMM}mm; width: ${widthMM}mm;">
              <table style="width: 100%; border-collapse: collapse; font-size: 7pt;">
                <tbody>
                  <tr style="background: ${rowIdx % 2 === 1 ? '#f9fafb' : '#fff'};">
                    ${columns.map(col => {
                      const key = col.key as keyof typeof okruh;
                      let val = okruh[key];
                      if (typeof val === 'number' && (col.key === 'izolacniOdpor' || col.key === 'impedanceSmycky')) {
                        val = val.toFixed(2) as any;
                      }
                      return `<td style="padding: 0.5mm 0.8mm; text-align: ${col.align}; border: 0.3mm solid #e5e7eb;">${escapeHtml(String(val ?? '-'))}</td>`;
                    }).join('')}
                  </tr>
                </tbody>
              </table>
            </div>`,
            yMM: currentYMM
          });
          currentYMM += rowMM;
        }
      } else {
        elements.push({
          html: `<div style="position: absolute; left: ${xMM}mm; top: ${currentYMM}mm; padding: 1.5mm 2.5mm; color: #999; font-size: 8pt;">Žádné okruhy</div>`,
          yMM: currentYMM
        });
        currentYMM += emptyMsgMM;
      }
    }
  } else if (config.type === 'mistnosti') {
    const mistnosti = data.mistnosti || [];
    
    if (mistnosti.length === 0) {
      elements.push({
        html: `<div style="position: absolute; left: ${xMM}mm; top: ${absoluteStartYMM}mm; padding: 2mm; color: #999;">Žádné místnosti</div>`,
        yMM: absoluteStartYMM
      });
      return { elements, endYMM: absoluteStartYMM + 10 };
    }
    
    for (let i = 0; i < mistnosti.length; i++) {
      const mist = mistnosti[i];
      const zarizeni = data.zarizeni?.[mist.id!] || [];
      
      if (i > 0) currentYMM += gapMM;
      
      checkPageBreak(headerMM + infoMM + 20);
      
      elements.push({
        html: `<div style="position: absolute; left: ${xMM}mm; top: ${currentYMM}mm; width: ${widthMM}mm; background: #22c55e; color: white; padding: 1.5mm 2.5mm; font-weight: bold; font-size: 10pt; box-sizing: border-box;">
          ${escapeHtml(mist.nazev || '-')} (${escapeHtml(mist.typ || '-')})
        </div>`,
        yMM: currentYMM
      });
      currentYMM += headerMM;
      
      elements.push({
        html: `<div style="position: absolute; left: ${xMM}mm; top: ${currentYMM}mm; width: ${widthMM}mm; background: #f0fdf4; border: 0.3mm solid #bbf7d0; font-size: 8pt; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; box-sizing: border-box;">
          <div style="padding: 1mm 2mm; border-right: 0.3mm solid #bbf7d0;"><span style="color: #16a34a;">Patro:</span> ${escapeHtml(mist.patro || '-')}</div>
          <div style="padding: 1mm 2mm; border-right: 0.3mm solid #bbf7d0;"><span style="color: #16a34a;">Plocha:</span> ${mist.plocha ? mist.plocha + ' m²' : '-'}</div>
          <div style="padding: 1mm 2mm; border-right: 0.3mm solid #bbf7d0;"><span style="color: #16a34a;">Prostředí:</span> ${escapeHtml(mist.prostredi || '-')}</div>
          <div style="padding: 1mm 2mm;"><span style="color: #16a34a;">Poznámka:</span> ${escapeHtml(mist.poznamka || '-')}</div>
        </div>`,
        yMM: currentYMM
      });
      currentYMM += infoMM;
      
      if (zarizeni.length > 0) {
        const columns = TABLE_COLUMNS.zarizeni.filter(c => c.visible);
        
        checkPageBreak(tableHeaderMM);
        elements.push({
          html: `<div style="position: absolute; left: ${xMM}mm; top: ${currentYMM}mm; width: ${widthMM}mm;">
            <table style="width: 100%; border-collapse: collapse; font-size: 7pt;">
              <thead>
                <tr style="background: #16a34a; color: white;">
                  ${columns.map(col => `<th style="padding: 0.8mm 0.5mm; text-align: ${col.align}; border: 0.3mm solid #16a34a;">${escapeHtml(col.label)}</th>`).join('')}
                </tr>
              </thead>
            </table>
          </div>`,
          yMM: currentYMM
        });
        currentYMM += tableHeaderMM;
        
        for (let rowIdx = 0; rowIdx < zarizeni.length; rowIdx++) {
          const z = zarizeni[rowIdx];
          checkPageBreak(rowMM);
          
          elements.push({
            html: `<div style="position: absolute; left: ${xMM}mm; top: ${currentYMM}mm; width: ${widthMM}mm;">
              <table style="width: 100%; border-collapse: collapse; font-size: 7pt;">
                <tbody>
                  <tr style="background: ${rowIdx % 2 === 1 ? '#f0fdf4' : '#fff'};">
                    ${columns.map(col => {
                      const key = col.key as keyof typeof z;
                      const val = z[key];
                      return `<td style="padding: 0.5mm 0.8mm; text-align: ${col.align}; border: 0.3mm solid #e5e7eb;">${escapeHtml(String(val ?? '-'))}</td>`;
                    }).join('')}
                  </tr>
                </tbody>
              </table>
            </div>`,
            yMM: currentYMM
          });
          currentYMM += rowMM;
        }
      } else {
        elements.push({
          html: `<div style="position: absolute; left: ${xMM}mm; top: ${currentYMM}mm; padding: 1.5mm 2.5mm; color: #999; font-size: 8pt;">Žádná zařízení</div>`,
          yMM: currentYMM
        });
        currentYMM += emptyMsgMM;
      }
    }
  }
  
  return { elements, endYMM: currentYMM };
}

/**
 * Renderuje widget na konkrétní absolutní pozici
 */
function renderWidgetAtPosition(widget: Widget, data: PDFRenderData, xMM: number, yMM: number): { html: string } {
  const width = widget.width * PX_TO_MM;
  const height = widget.height * PX_TO_MM;
  const style = widget.style || {};
  const fontSizePt = style.fontSize ? (style.fontSize * PX_TO_MM * 2.83) : 10;
  
  const baseStyle = `
    position: absolute;
    left: ${xMM}mm;
    top: ${yMM}mm;
    width: ${width}mm;
    min-height: ${height}mm;
    box-sizing: border-box;
    ${style.backgroundColor && style.backgroundColor !== 'transparent' ? `background-color: ${style.backgroundColor};` : ''}
    ${style.borderWidth ? `border: ${style.borderWidth * PX_TO_MM}mm ${style.borderStyle || 'solid'} ${style.borderColor || '#000'};` : ''}
    ${style.borderRadius ? `border-radius: ${style.borderRadius * PX_TO_MM}mm;` : ''}
    ${style.padding ? `padding: ${style.padding * PX_TO_MM}mm;` : 'padding: 1mm;'}
    font-size: ${fontSizePt}pt;
    ${style.fontWeight ? `font-weight: ${style.fontWeight};` : ''}
    ${style.color ? `color: ${style.color};` : 'color: #000;'}
    ${style.textAlign ? `text-align: ${style.textAlign};` : ''}
    overflow: visible;
  `;
  
  let content = '';
  switch (widget.type) {
    case 'text':
      content = resolveVariables(widget.content || '', data);
      break;
    case 'variable':
      content = getVariableValue(widget.content || '', data);
      break;
    case 'page-number':
      content = widget.content || '{page} / {pages}';
      break;
    case 'date':
      content = new Date().toLocaleDateString('cs-CZ');
      break;
    case 'line':
      return {
        html: `<div style="position: absolute; left: ${xMM}mm; top: ${yMM}mm; width: ${width}mm; border-top: ${(style.borderWidth || 1) * PX_TO_MM}mm solid ${style.borderColor || '#000'};"></div>`
      };
    case 'box':
      return { html: `<div style="${baseStyle}"></div>` };
    case 'image': {
      const src = widget.content || '';
      if (src.startsWith('data:')) {
        return {
          html: `<img src="${src}" style="position: absolute; left: ${xMM}mm; top: ${yMM}mm; width: ${width}mm; height: ${height}mm; object-fit: contain;" />`
        };
      }
      return { html: `<div style="${baseStyle} display: flex; align-items: center; justify-content: center; background: #f0f0f0;"><span style="color: #999;">[Obrázek]</span></div>` };
    }
    case 'group': {
      // Renderovat skupinu - rekurzivně renderovat děti
      const children = widget.children || [];
      if (children.length === 0) {
        return { html: '' }; // Prázdná skupina - nic nerenderovat
      }
      
      // Renderovat každé dítě na jeho relativní pozici uvnitř skupiny
      const childrenHtml = children.map(child => {
        const childXMM = xMM + child.x * PX_TO_MM;
        const childYMM = yMM + child.y * PX_TO_MM;
        return renderWidgetAtPosition(child, data, childXMM, childYMM).html;
      }).join('\n');
      
      return { html: childrenHtml };
    }
    default:
      content = widget.content || '';
  }
  
  return { html: `<div style="${baseStyle}">${escapeHtml(content)}</div>` };
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Otevře HTML náhled v novém okně
 */
export function openHTMLPreview(template: DesignerTemplate, data: PDFRenderData): void {
  // Získat rozměry stránky
  const firstPage = template.pages[0];
  const pageSize = PAGE_SIZES[firstPage?.size || 'a4'] || PAGE_SIZES.a4;
  const isLandscape = firstPage?.orientation === 'landscape';
  const pageWidthMM = isLandscape ? pageSize.height : pageSize.width;
  const pageHeightMM = isLandscape ? pageSize.width : pageSize.height;
  
  const html = renderTemplateToHTML(template, data);
  
  const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Náhled: ${escapeHtml(template.name)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Roboto', Arial, sans-serif; background: #525659; }
    
    /* Tisk - každá stránka na samostatný list */
    @page {
      size: ${pageWidthMM}mm ${pageHeightMM}mm;
      margin: 0;
    }
    
    @media print {
      body { 
        background: white !important; 
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .html-preview-container {
        padding: 0 !important;
        background: white !important;
        gap: 0 !important;
      }
      .print-page {
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
        margin: 0 !important;
      }
      .print-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      /* Skrýt čáry oddělení stránek při tisku */
      .page-separator {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(fullHTML);
    w.document.close();
  }
}
