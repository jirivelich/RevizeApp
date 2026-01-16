// Pagination utilities for PDF export
// Zajišťuje automatické stránkování pro tabulky a dlouhé texty
import type { Widget, PageTemplate, DesignerTemplate, TableConfig } from './types';
import { PAGE_SIZES } from './constants';

// Konverze mm na px
const MM_TO_PX = 3.78;

// Výška řádku tabulky v px (přibližně)
const TABLE_ROW_HEIGHT = 24;
const TABLE_HEADER_HEIGHT = 28;

// Výška řádku textu v px (přibližně, závisí na fontSize)
const getTextLineHeight = (fontSize: number, lineHeight: number = 1.4) => fontSize * lineHeight;

interface PaginationResult {
  pages: PageTemplate[];
  // Mapování původních widgetů na nové (pro zachování referencí)
  widgetMap: Map<string, string[]>;
}

interface ContentChunk {
  widgetId: string;
  pageIndex: number;
  startRow?: number;
  endRow?: number;
  startLine?: number;
  endLine?: number;
}

/**
 * Spočítá kolik řádků tabulky se vejde na stránku
 */
export function calculateTableRowsPerPage(
  widget: Widget,
  pageTemplate: PageTemplate,
  headerHeight: number,
  footerHeight: number
): number {
  const pageSize = PAGE_SIZES[pageTemplate.size];
  const pageHeightPx = (pageTemplate.orientation === 'portrait' ? pageSize.height : pageSize.width) * MM_TO_PX;
  
  // Dostupná výška pro content zónu
  const contentHeight = pageHeightPx - (headerHeight * MM_TO_PX) - (footerHeight * MM_TO_PX);
  
  // Výška widgetu na stránce (od pozice Y do konce content zóny)
  const availableHeight = contentHeight - widget.y;
  
  // Odečteme hlavičku tabulky pokud je zobrazena
  let usableHeight = availableHeight;
  if (widget.tableConfig?.showHeader) {
    usableHeight -= TABLE_HEADER_HEIGHT;
  }
  
  // Počet řádků
  return Math.floor(usableHeight / TABLE_ROW_HEIGHT);
}

/**
 * Rozdělí tabulku na více částí pokud má více řádků než se vejde
 */
export function splitTableWidget(
  widget: Widget,
  totalRows: number,
  rowsPerPage: number,
  startPageIndex: number
): { chunks: ContentChunk[]; pagesNeeded: number } {
  const chunks: ContentChunk[] = [];
  let currentRow = 0;
  let pageIndex = startPageIndex;
  
  while (currentRow < totalRows) {
    const endRow = Math.min(currentRow + rowsPerPage, totalRows);
    chunks.push({
      widgetId: widget.id,
      pageIndex,
      startRow: currentRow,
      endRow,
    });
    currentRow = endRow;
    pageIndex++;
  }
  
  return {
    chunks,
    pagesNeeded: chunks.length,
  };
}

/**
 * Vytvoří kopii tabulkového widgetu pro konkrétní chunk dat
 */
export function createTableChunkWidget(
  originalWidget: Widget,
  chunk: ContentChunk,
  newPageId: string,
  isFirstChunk: boolean
): Widget {
  const newWidget: Widget = {
    ...originalWidget,
    id: `${originalWidget.id}_chunk_${chunk.pageIndex}`,
    pageId: newPageId,
    // Na nových stránkách začíná tabulka nahoře
    y: isFirstChunk ? originalWidget.y : 0,
    // Přidáme info o chunku pro renderování
    tableConfig: originalWidget.tableConfig ? {
      ...originalWidget.tableConfig,
      // Vnitřní metadata pro renderování
      _chunkStartRow: chunk.startRow,
      _chunkEndRow: chunk.endRow,
      _isFirstChunk: isFirstChunk,
    } as TableConfig & { _chunkStartRow?: number; _chunkEndRow?: number; _isFirstChunk?: boolean } : undefined,
  };
  
  return newWidget;
}

/**
 * Spočítá kolik řádků textu se vejde do widgetu
 */
export function calculateTextLinesPerWidget(widget: Widget): number {
  const fontSize = widget.style.fontSize || 12;
  const lineHeight = widget.style.lineHeight || 1.4;
  const padding = widget.style.padding || 4;
  
  const usableHeight = widget.height - (padding * 2);
  const lineHeightPx = getTextLineHeight(fontSize, lineHeight);
  
  return Math.floor(usableHeight / lineHeightPx);
}

/**
 * Hlavní funkce pro zpracování automatického stránkování
 * Tato funkce se volá při exportu PDF
 */
export function processPagination(
  template: DesignerTemplate,
  tableData: Record<string, unknown[]> // Data pro tabulky (rozvadece, zavady, etc.)
): PaginationResult {
  const resultPages: PageTemplate[] = [];
  const widgetMap = new Map<string, string[]>();
  
  for (const page of template.pages) {
    // Widgety které nepotřebují stránkování
    const staticWidgets: Widget[] = [];
    // Widgety které mohou přetékat
    const dynamicWidgets: Widget[] = [];
    
    for (const widget of page.widgets) {
      if (widget.autoGrow && widget.type === 'table' && widget.tableConfig) {
        dynamicWidgets.push(widget);
      } else {
        staticWidgets.push(widget);
      }
    }
    
    if (dynamicWidgets.length === 0) {
      // Žádné dynamické widgety, stránka zůstává beze změny
      resultPages.push(page);
      continue;
    }
    
    // Zpracování dynamických widgetů
    let currentPageWidgets = [...staticWidgets];
    let additionalPages: PageTemplate[] = [];
    
    for (const widget of dynamicWidgets) {
      if (widget.type === 'table' && widget.tableConfig) {
        const tableType = widget.tableConfig.type;
        const data = tableData[tableType] || [];
        const totalRows = data.length;
        
        if (totalRows === 0) {
          // Prázdná tabulka, ponecháme původní widget
          currentPageWidgets.push(widget);
          widgetMap.set(widget.id, [widget.id]);
          continue;
        }
        
        const rowsPerPage = widget.tableConfig.rowsPerPage || 
          calculateTableRowsPerPage(widget, page, template.headerHeight, template.footerHeight);
        
        if (totalRows <= rowsPerPage) {
          // Tabulka se vejde na jednu stránku
          currentPageWidgets.push(widget);
          widgetMap.set(widget.id, [widget.id]);
        } else {
          // Tabulka potřebuje více stránek
          const { chunks } = splitTableWidget(widget, totalRows, rowsPerPage, 0);
          const widgetIds: string[] = [];
          
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            
            if (i === 0) {
              // První chunk na aktuální stránce
              const chunkWidget = createTableChunkWidget(widget, chunk, page.id, true);
              currentPageWidgets.push(chunkWidget);
              widgetIds.push(chunkWidget.id);
            } else {
              // Další chunky na nových stránkách
              const newPageId = `${page.id}_overflow_${i}`;
              const newPage: PageTemplate = {
                id: newPageId,
                name: `${page.name || 'Strana'} (pokrač. ${i})`,
                size: page.size,
                orientation: page.orientation,
                widgets: [],
              };
              
              // Přidáme header/footer widgety na novou stránku (pokud existují)
              const headerFooterWidgets = page.widgets.filter(
                w => w.zone === 'header' || w.zone === 'footer'
              ).map(w => ({
                ...w,
                id: `${w.id}_page_${i}`,
                pageId: newPageId,
              }));
              
              const chunkWidget = createTableChunkWidget(widget, chunk, newPageId, false);
              newPage.widgets = [...headerFooterWidgets, chunkWidget];
              widgetIds.push(chunkWidget.id);
              additionalPages.push(newPage);
            }
          }
          
          widgetMap.set(widget.id, widgetIds);
        }
      }
    }
    
    // Aktualizujeme první stránku
    const updatedPage: PageTemplate = {
      ...page,
      widgets: currentPageWidgets,
    };
    
    resultPages.push(updatedPage);
    resultPages.push(...additionalPages);
  }
  
  return {
    pages: resultPages,
    widgetMap,
  };
}

/**
 * Helper pro zjištění zda widget potřebuje automatické stránkování
 */
export function needsPagination(widget: Widget, dataLength: number, rowsPerPage: number): boolean {
  if (!widget.autoGrow) return false;
  if (widget.type !== 'table') return false;
  return dataLength > rowsPerPage;
}
