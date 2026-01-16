// useDesignerState - hook pro správu stavu designeru
import { useState, useCallback, useMemo } from 'react';
import type { 
  Widget, 
  WidgetType, 
  PageZone, 
  PageTemplate, 
  DesignerTemplate,
  TableType,
} from './types';
import { 
  DEFAULT_WIDGET_STYLE, 
  WIDGET_TYPES, 
  TABLE_COLUMNS,
} from './constants';

// Generování unikátního ID
const generateId = () => `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generatePageId = () => `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Výchozí šablona
const createDefaultTemplate = (): DesignerTemplate => ({
  id: `template_${Date.now()}`,
  name: 'Nová šablona',
  pages: [createDefaultPage()],
  headerHeight: 80,
  footerHeight: 60,
  snapToGrid: true,
  gridSize: 10,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Výchozí stránka
const createDefaultPage = (index: number = 0): PageTemplate => ({
  id: generatePageId(),
  name: index === 0 ? 'Titulní strana' : `Strana ${index + 1}`,
  size: 'a4',
  orientation: 'portrait',
  widgets: [],
});

// Stav historie pro undo/redo
interface HistoryState {
  past: DesignerTemplate[];
  present: DesignerTemplate;
  future: DesignerTemplate[];
}

export function useDesignerState(initialTemplate?: DesignerTemplate) {
  // Historie pro undo/redo
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialTemplate || createDefaultTemplate(),
    future: [],
  });

  // Aktuální šablona
  const template = history.present;

  // Vybraná stránka
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Vybrané widgety
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>([]);

  // Aktivní zóna pro vkládání
  const [activeZone, setActiveZone] = useState<PageZone>('content');

  // Zobrazení
  const [showGrid, setShowGrid] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [scale, setScale] = useState(1);

  // Aktuální stránka
  const currentPage = template.pages[currentPageIndex];

  // Vybrané widgety
  const selectedWidgets = useMemo(() => {
    if (!currentPage) return [];
    return currentPage.widgets.filter(w => selectedWidgetIds.includes(w.id));
  }, [currentPage, selectedWidgetIds]);

  // Update template s historií
  const updateTemplate = useCallback((newTemplate: DesignerTemplate) => {
    setHistory(prev => ({
      past: [...prev.past.slice(-49), prev.present], // max 50 historie
      present: { ...newTemplate, updatedAt: new Date().toISOString() },
      future: [],
    }));
  }, []);

  // Undo
  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  // Redo
  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: prev.future.slice(1),
      };
    });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Update pouze části šablony
  const updateTemplatePartial = useCallback((updates: Partial<DesignerTemplate>) => {
    updateTemplate({ ...template, ...updates });
  }, [template, updateTemplate]);

  // Update stránky
  const updatePage = useCallback((pageIndex: number, updates: Partial<PageTemplate>) => {
    const newPages = [...template.pages];
    newPages[pageIndex] = { ...newPages[pageIndex], ...updates };
    updateTemplate({ ...template, pages: newPages });
  }, [template, updateTemplate]);

  // Přidat stránku
  const addPage = useCallback(() => {
    const newPage = createDefaultPage(template.pages.length);
    updateTemplate({ ...template, pages: [...template.pages, newPage] });
    setCurrentPageIndex(template.pages.length);
  }, [template, updateTemplate]);

  // Smazat stránku
  const deletePage = useCallback((pageIndex: number) => {
    if (template.pages.length <= 1) return;
    const newPages = template.pages.filter((_, i) => i !== pageIndex);
    updateTemplate({ ...template, pages: newPages });
    if (currentPageIndex >= newPages.length) {
      setCurrentPageIndex(newPages.length - 1);
    }
  }, [template, updateTemplate, currentPageIndex]);

  // Přidat widget
  const addWidget = useCallback((type: WidgetType, zone: PageZone = 'content') => {
    const typeInfo = WIDGET_TYPES.find(t => t.type === type);
    const newWidget: Widget = {
      id: generateId(),
      type,
      name: typeInfo?.label || type,
      content: type === 'text' ? 'Nový text' : 
               type === 'page-number' ? 'X/Y' :
               type === 'date' ? 'DD.MM.YYYY' :
               type === 'signature' ? 'Podpis' : '',
      x: 20,
      y: 20,
      width: type === 'table' ? 500 : type === 'line' ? 200 : type === 'image' ? 150 : 150,
      height: type === 'table' ? 200 : type === 'line' ? 2 : type === 'image' ? 100 : 30,
      style: { ...DEFAULT_WIDGET_STYLE },
      zone,
      pageId: currentPage.id,
      zIndex: currentPage.widgets.length,
      locked: false,
      tableConfig: type === 'table' ? {
        type: 'rozvadece' as TableType,
        columns: TABLE_COLUMNS.rozvadece.map(c => ({ ...c })),
        showHeader: true,
        borderStyle: 'all',
      } : undefined,
    };

    const newWidgets = [...currentPage.widgets, newWidget];
    updatePage(currentPageIndex, { widgets: newWidgets });
    setSelectedWidgetIds([newWidget.id]);
    return newWidget;
  }, [currentPage, currentPageIndex, updatePage]);

  // Update widget
  const updateWidget = useCallback((id: string, updates: Partial<Widget>) => {
    const newWidgets = currentPage.widgets.map(w =>
      w.id === id ? { ...w, ...updates } : w
    );
    updatePage(currentPageIndex, { widgets: newWidgets });
  }, [currentPage, currentPageIndex, updatePage]);

  // Smazat widget
  const deleteWidget = useCallback((id: string) => {
    const newWidgets = currentPage.widgets.filter(w => w.id !== id);
    updatePage(currentPageIndex, { widgets: newWidgets });
    setSelectedWidgetIds(prev => prev.filter(wid => wid !== id));
  }, [currentPage, currentPageIndex, updatePage]);

  // Smazat vybrané widgety
  const deleteSelectedWidgets = useCallback(() => {
    const newWidgets = currentPage.widgets.filter(w => !selectedWidgetIds.includes(w.id));
    updatePage(currentPageIndex, { widgets: newWidgets });
    setSelectedWidgetIds([]);
  }, [currentPage, currentPageIndex, selectedWidgetIds, updatePage]);

  // Duplikovat widget
  const duplicateWidget = useCallback((id: string) => {
    const widget = currentPage.widgets.find(w => w.id === id);
    if (!widget) return;

    const newWidget: Widget = {
      ...widget,
      id: generateId(),
      name: `${widget.name} (kopie)`,
      x: widget.x + 20,
      y: widget.y + 20,
      zIndex: currentPage.widgets.length,
      locked: false,
    };

    const newWidgets = [...currentPage.widgets, newWidget];
    updatePage(currentPageIndex, { widgets: newWidgets });
    setSelectedWidgetIds([newWidget.id]);
  }, [currentPage, currentPageIndex, updatePage]);

  // Toggle lock widgetu
  const toggleLockWidget = useCallback((id: string) => {
    const widget = currentPage.widgets.find(w => w.id === id);
    if (widget) {
      updateWidget(id, { locked: !widget.locked });
    }
  }, [currentPage, updateWidget]);

  // Zamknout vybrané
  const lockSelectedWidgets = useCallback(() => {
    selectedWidgetIds.forEach(id => updateWidget(id, { locked: true }));
  }, [selectedWidgetIds, updateWidget]);

  // Odemknout vybrané
  const unlockSelectedWidgets = useCallback(() => {
    selectedWidgetIds.forEach(id => updateWidget(id, { locked: false }));
  }, [selectedWidgetIds, updateWidget]);

  // Vybrat widget
  const selectWidget = useCallback((id: string | null, multi: boolean = false) => {
    if (id === null) {
      setSelectedWidgetIds([]);
    } else if (multi) {
      setSelectedWidgetIds(prev =>
        prev.includes(id) ? prev.filter(wid => wid !== id) : [...prev, id]
      );
    } else {
      setSelectedWidgetIds([id]);
    }
  }, []);

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelectedWidgetIds([]);
  }, []);

  // Zarovnání
  const alignWidgets = useCallback((alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
    if (selectedWidgets.length === 0) return;

    const bounds = {
      left: Math.min(...selectedWidgets.map(w => w.x)),
      right: Math.max(...selectedWidgets.map(w => w.x + w.width)),
      top: Math.min(...selectedWidgets.map(w => w.y)),
      bottom: Math.max(...selectedWidgets.map(w => w.y + w.height)),
    };
    const centerH = (bounds.left + bounds.right) / 2;
    const centerV = (bounds.top + bounds.bottom) / 2;

    selectedWidgets.forEach(widget => {
      let updates: Partial<Widget> = {};
      switch (alignment) {
        case 'left':
          updates.x = bounds.left;
          break;
        case 'center-h':
          updates.x = centerH - widget.width / 2;
          break;
        case 'right':
          updates.x = bounds.right - widget.width;
          break;
        case 'top':
          updates.y = bounds.top;
          break;
        case 'center-v':
          updates.y = centerV - widget.height / 2;
          break;
        case 'bottom':
          updates.y = bounds.bottom - widget.height;
          break;
      }
      updateWidget(widget.id, updates);
    });
  }, [selectedWidgets, updateWidget]);

  // Distribuce
  const distributeWidgets = useCallback((direction: 'horizontal' | 'vertical') => {
    if (selectedWidgets.length < 3) return;

    const sorted = [...selectedWidgets].sort((a, b) =>
      direction === 'horizontal' ? a.x - b.x : a.y - b.y
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSpace = direction === 'horizontal'
      ? (last.x + last.width) - first.x
      : (last.y + last.height) - first.y;
    const totalSize = sorted.reduce((sum, w) =>
      sum + (direction === 'horizontal' ? w.width : w.height), 0
    );
    const gap = (totalSpace - totalSize) / (sorted.length - 1);

    let currentPos = direction === 'horizontal' ? first.x : first.y;
    sorted.forEach(widget => {
      updateWidget(widget.id, direction === 'horizontal' ? { x: currentPos } : { y: currentPos });
      currentPos += (direction === 'horizontal' ? widget.width : widget.height) + gap;
    });
  }, [selectedWidgets, updateWidget]);

  // Z-index operace
  const bringToFront = useCallback(() => {
    const maxZ = Math.max(...currentPage.widgets.map(w => w.zIndex));
    selectedWidgets.forEach((w, i) => {
      updateWidget(w.id, { zIndex: maxZ + i + 1 });
    });
  }, [currentPage, selectedWidgets, updateWidget]);

  const sendToBack = useCallback(() => {
    const minZ = Math.min(...currentPage.widgets.map(w => w.zIndex));
    selectedWidgets.forEach((w, i) => {
      updateWidget(w.id, { zIndex: minZ - selectedWidgets.length + i });
    });
  }, [currentPage, selectedWidgets, updateWidget]);

  const bringForward = useCallback(() => {
    selectedWidgets.forEach(w => {
      updateWidget(w.id, { zIndex: w.zIndex + 1 });
    });
  }, [selectedWidgets, updateWidget]);

  const sendBackward = useCallback(() => {
    selectedWidgets.forEach(w => {
      updateWidget(w.id, { zIndex: Math.max(0, w.zIndex - 1) });
    });
  }, [selectedWidgets, updateWidget]);

  // Seskupení (zatím jednoduché - přiřazení groupId)
  const groupWidgets = useCallback(() => {
    if (selectedWidgets.length < 2) return;
    const groupId = `group_${Date.now()}`;
    selectedWidgets.forEach(w => {
      updateWidget(w.id, { groupId });
    });
  }, [selectedWidgets, updateWidget]);

  const ungroupWidgets = useCallback(() => {
    selectedWidgets.forEach(w => {
      updateWidget(w.id, { groupId: undefined });
    });
  }, [selectedWidgets, updateWidget]);

  // Zoom
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(2, prev + 0.1));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(0.5, prev - 0.1));
  }, []);

  // Toggle grid
  const toggleGrid = useCallback(() => {
    setShowGrid(prev => !prev);
  }, []);

  // Toggle zones
  const toggleZones = useCallback(() => {
    setShowZones(prev => !prev);
  }, []);

  // Load template
  const loadTemplate = useCallback((newTemplate: DesignerTemplate) => {
    setHistory({
      past: [],
      present: newTemplate,
      future: [],
    });
    setCurrentPageIndex(0);
    setSelectedWidgetIds([]);
  }, []);

  // Reset to default
  const resetTemplate = useCallback(() => {
    loadTemplate(createDefaultTemplate());
  }, [loadTemplate]);

  return {
    // State
    template,
    currentPage,
    currentPageIndex,
    selectedWidgetIds,
    selectedWidgets,
    activeZone,
    showGrid,
    showZones,
    scale,
    canUndo,
    canRedo,

    // Setters
    setCurrentPageIndex,
    setActiveZone,
    setShowGrid,
    setShowZones,
    setScale,

    // Template operations
    updateTemplate: updateTemplatePartial,
    loadTemplate,
    resetTemplate,

    // Page operations
    updatePage,
    addPage,
    deletePage,

    // Widget operations
    addWidget,
    updateWidget,
    deleteWidget,
    deleteSelectedWidgets,
    duplicateWidget,
    toggleLockWidget,
    lockSelectedWidgets,
    unlockSelectedWidgets,

    // Selection
    selectWidget,
    deselectAll,

    // Alignment & Distribution
    alignWidgets,
    distributeWidgets,

    // Z-index
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,

    // Grouping
    groupWidgets,
    ungroupWidgets,

    // View
    zoomIn,
    zoomOut,
    toggleGrid,
    toggleZones,

    // History
    undo,
    redo,
  };
}

export default useDesignerState;
