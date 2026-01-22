// PDFDesignerMain - hlavní komponenta PDF designeru
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Revize, Nastaveni, Rozvadec, Okruh, Zavada, Mistnost, Zarizeni, MericiPristroj, Zakaznik } from '../../types';
import type { Widget, DesignerTemplate } from './types';
import { useDesignerState } from './useDesignerState';
import { Toolbar } from './Toolbar';
import { PageCanvas } from './PageCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { WidgetEditor } from './WidgetEditor';
import { SaveIcon, FolderOpenIcon, ExportIcon, CloseIcon, PreviewIcon, PDFIcon } from './icons';
import { openPDFPreview, downloadPDF } from './pdfRenderer';
import { openHTMLPreview } from './htmlRenderer';
import { pdfSablonyApi } from '../../services/api';
import type { PDFRenderData } from './pdfRenderer';

// Typ pro šablonu z databáze
interface DbPdfSablona {
  id: number;
  nazev: string;
  popis?: string;
  jeVychozi: number;
  userId?: number;
  template: DesignerTemplate;
  createdAt: string;
  updatedAt: string;
}

interface PDFDesignerMainProps {
  revize?: Revize | null;
  nastaveni?: Nastaveni | null;
  // Rozšířená data pro náhled
  rozvadece?: Rozvadec[];
  okruhy?: Record<number, Okruh[]>;
  zavady?: Zavada[];
  mistnosti?: Mistnost[];
  zarizeni?: Record<number, Zarizeni[]>;
  pouzitePristroje?: MericiPristroj[];
  zakaznik?: Zakaznik | null;
  // Callbacks
  onClose?: () => void;
  onExport?: (template: DesignerTemplate) => void;
  initialTemplate?: DesignerTemplate;
}

export function PDFDesignerMain({
  revize = null,
  nastaveni = null,
  rozvadece = [],
  okruhy = {},
  zavady = [],
  mistnosti = [],
  zarizeni = {},
  pouzitePristroje = [],
  zakaznik = null,
  onClose,
  onExport,
  initialTemplate,
}: PDFDesignerMainProps) {
  // Načíst uloženou šablonu z localStorage při startu
  const getInitialTemplate = (): DesignerTemplate | undefined => {
    if (initialTemplate) return initialTemplate;
    try {
      const saved = localStorage.getItem('pdfDesignerCurrentTemplate');
      if (saved) {
        console.log('Načítám aktuální šablonu z localStorage');
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Chyba při načítání šablony:', e);
    }
    return undefined;
  };
  
  const state = useDesignerState(getInitialTemplate());
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<DesignerTemplate[]>([]);
  const [dbTemplates, setDbTemplates] = useState<DbPdfSablona[]>([]);
  const [currentDbId, setCurrentDbId] = useState<number | null>(null);
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Automaticky ukládat aktuální šablonu při každé změně
  useEffect(() => {
    try {
      const templateJson = JSON.stringify(state.template);
      localStorage.setItem('pdfDesignerCurrentTemplate', templateJson);
    } catch (e) {
      console.error('Chyba při automatickém ukládání:', e);
    }
  }, [state.template]);

  // Demo data pro náhled pokud není revize
  const demoRevize: Revize = {
    id: 0,
    cisloRevize: 'DEMO-2024-001',
    nazev: 'Elektrická instalace - demo',
    adresa: 'Ukázková ulice 123, 110 00 Praha',
    objednatel: 'Demo zákazník s.r.o.',
    kategorieRevize: 'elektro',
    datum: new Date().toISOString(),
    datumDokonceni: new Date().toISOString(),
    datumPlatnosti: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    termin: 60,
    typRevize: 'pravidelná',
    stav: 'dokončeno',
    vysledek: 'schopno',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Data pro PDF renderování - použít reálná nebo demo data
  const pdfData: PDFRenderData = {
    revize: revize || demoRevize,
    nastaveni,
    rozvadece,
    okruhy,
    zavady,
    mistnosti,
    zarizeni,
    pouzitePristroje,
    zakaznik,
  };

  // Debug: Zobrazit počet načtených dat
  useEffect(() => {
    console.log('📊 PDF Data načtena:', {
      revize: revize?.cisloRevize || demoRevize.cisloRevize,
      rozvadece: rozvadece.length,
      okruhy: Object.keys(okruhy).length > 0 ? Object.values(okruhy).flat().length : 0,
      zavady: zavady.length,
      mistnosti: mistnosti.length,
      zarizeni: Object.keys(zarizeni).length > 0 ? Object.values(zarizeni).flat().length : 0,
      pouzitePristroje: pouzitePristroje.length,
      zakaznik: zakaznik?.nazev || null,
    });
  }, [revize, rozvadece, okruhy, zavady, mistnosti, zarizeni, pouzitePristroje, zakaznik]);

  // Načíst uložené šablony z localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pdfDesignerTemplates');
    console.log('Načítám šablony z localStorage:', saved ? `${saved.length} bytes` : 'nic');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('Načteno šablon:', parsed.length, parsed.map((t: DesignerTemplate) => t.name));
        setSavedTemplates(parsed);
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    }
  }, []);

  // Načíst šablony z databáze
  useEffect(() => {
    loadDbTemplates();
  }, []);

  const loadDbTemplates = async () => {
    try {
      setIsLoading(true);
      const templates = await pdfSablonyApi.getAll() as DbPdfSablona[];
      console.log('Načteno šablon z DB:', templates.length);
      setDbTemplates(templates);
    } catch (error) {
      console.error('Chyba při načítání šablon z DB:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Náhled HTML (pro rychlé debugování)
  const handlePreview = useCallback(() => {
    try {
      openHTMLPreview(state.template, pdfData);
    } catch (error) {
      console.error('Failed to generate HTML preview:', error);
      alert('Nepodařilo se vygenerovat HTML náhled.');
    }
  }, [state.template, pdfData]);

  // Náhled PDF
  const handlePDFPreview = useCallback(async () => {
    setIsGeneratingPDF(true);
    try {
      await openPDFPreview(state.template, pdfData);
    } catch (error) {
      console.error('Failed to generate preview:', error);
      alert('Nepodařilo se vygenerovat náhled PDF.');
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [state.template, pdfData]);

  // Stáhnout PDF
  const handleDownloadPDF = useCallback(async () => {
    if (!pdfData || !revize) {
      alert('Pro stažení je potřeba načíst revizi.');
      return;
    }
    
    setIsGeneratingPDF(true);
    try {
      const filename = `${revize.cisloRevize || 'revize'}_${state.template.name.replace(/\s+/g, '_')}.pdf`;
      await downloadPDF(state.template, pdfData, filename);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Nepodařilo se stáhnout PDF.');
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [state.template, pdfData, revize]);

  // Helper funkce pro serializaci widgetu (rekurzivní pro skupiny)
  const serializeWidget = useCallback((widget: Widget): any => {
    const serialized: any = {
      id: widget.id,
      type: widget.type,
      name: widget.name,
      content: widget.content,
      x: widget.x,
      y: widget.y,
      width: widget.width,
      height: widget.height,
      style: { ...widget.style },
      locked: widget.locked,
      zone: widget.zone,
      pageId: widget.pageId,
      zIndex: widget.zIndex,
      tableConfig: widget.tableConfig ? { ...widget.tableConfig } : undefined,
      repeaterConfig: widget.repeaterConfig ? { ...widget.repeaterConfig } : undefined,
      groupId: widget.groupId,
      autoGrow: widget.autoGrow,
      overflowBehavior: widget.overflowBehavior,
      minHeight: widget.minHeight,
    };
    
    // Rekurzivně serializovat children pro skupiny
    if (widget.children && widget.children.length > 0) {
      serialized.children = widget.children.map(child => serializeWidget(child));
    }
    
    return serialized;
  }, []);

  // Uložit šablonu
  const handleSaveTemplate = useCallback(() => {
    try {
      // Vytvořit čistou kopii šablony bez neserializovatelných dat
      const templateToSave = {
        ...state.template,
        updatedAt: new Date().toISOString(),
        pages: state.template.pages.map(page => ({
          ...page,
          widgets: page.widgets.map(widget => serializeWidget(widget)),
        })),
      };
      
      const newTemplates = savedTemplates.filter(t => t.id !== state.template.id);
      newTemplates.push(templateToSave);
      
      const jsonString = JSON.stringify(newTemplates);
      localStorage.setItem('pdfDesignerTemplates', jsonString);
      setSavedTemplates(newTemplates);
      
      console.log('Šablona uložena:', templateToSave.name, 'Velikost:', jsonString.length, 'bytes');
      alert('Šablona byla uložena lokálně!');
    } catch (error) {
      console.error('Chyba při ukládání šablony:', error);
      alert('Nepodařilo se uložit šablonu: ' + (error instanceof Error ? error.message : 'Neznámá chyba'));
    }
  }, [state.template, savedTemplates, serializeWidget]);

  // Uložit šablonu do databáze
  const handleSaveToDb = useCallback(async () => {
    try {
      setIsSaving(true);
      
      // Vytvořit čistou kopii šablony
      const templateToSave = {
        ...state.template,
        updatedAt: new Date().toISOString(),
        pages: state.template.pages.map(page => ({
          ...page,
          widgets: page.widgets.map(widget => serializeWidget(widget)),
        })),
      };
      
      const sablonaData = {
        nazev: state.template.name,
        popis: state.template.description || '',
        jeVychozi: false,
        template: templateToSave,
      };
      
      if (currentDbId) {
        // Aktualizovat existující
        await pdfSablonyApi.update(currentDbId, sablonaData);
        console.log('Šablona aktualizována v DB:', currentDbId);
      } else {
        // Vytvořit novou
        const result = await pdfSablonyApi.create(sablonaData) as DbPdfSablona;
        setCurrentDbId(result.id);
        console.log('Šablona vytvořena v DB:', result.id);
      }
      
      // Znovu načíst seznam šablon
      await loadDbTemplates();
      alert('Šablona byla uložena do databáze!');
    } catch (error) {
      console.error('Chyba při ukládání do DB:', error);
      alert('Nepodařilo se uložit šablonu do databáze: ' + (error instanceof Error ? error.message : 'Neznámá chyba'));
    } finally {
      setIsSaving(false);
    }
  }, [state.template, currentDbId, serializeWidget]);

  // Načíst šablonu
  const handleLoadTemplate = useCallback((template: DesignerTemplate) => {
    state.loadTemplate(template);
    setCurrentDbId(null);
    setShowTemplateList(false);
  }, [state]);

  // Načíst šablonu z databáze
  const handleLoadDbTemplate = useCallback((dbSablona: DbPdfSablona) => {
    const template = typeof dbSablona.template === 'string' 
      ? JSON.parse(dbSablona.template) 
      : dbSablona.template;
    state.loadTemplate(template);
    setCurrentDbId(dbSablona.id);
    setShowTemplateList(false);
    console.log('Načtena šablona z DB:', dbSablona.id, dbSablona.nazev);
  }, [state]);

  // Smazat šablonu
  const handleDeleteTemplate = useCallback((templateId: string) => {
    if (!confirm('Opravdu chcete smazat tuto šablonu?')) return;
    const newTemplates = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(newTemplates);
    localStorage.setItem('pdfDesignerTemplates', JSON.stringify(newTemplates));
  }, [savedTemplates]);

  // Smazat šablonu z databáze
  const handleDeleteDbTemplate = useCallback(async (dbId: number) => {
    if (!confirm('Opravdu chcete smazat tuto šablonu z databáze?')) return;
    try {
      await pdfSablonyApi.delete(dbId);
      if (currentDbId === dbId) {
        setCurrentDbId(null);
      }
      await loadDbTemplates();
    } catch (error) {
      console.error('Chyba při mazání z DB:', error);
      alert('Nepodařilo se smazat šablonu.');
    }
  }, [currentDbId]);

  // Export
  const handleExport = useCallback(() => {
    if (onExport) {
      onExport(state.template);
    } else {
      // Export jako JSON
      const blob = new Blob([JSON.stringify(state.template, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${state.template.name.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [state.template, onExport]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorovat pokud je focus v inputu
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+Z - Undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        state.undo();
      }
      // Ctrl+Y nebo Ctrl+Shift+Z - Redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        state.redo();
      }
      // Delete - smazat vybrané
      if (e.key === 'Delete' && state.selectedWidgetIds.length > 0) {
        e.preventDefault();
        state.deleteSelectedWidgets();
      }
      // Ctrl+D - duplikovat
      if (e.ctrlKey && e.key === 'd' && state.selectedWidgetIds.length === 1) {
        e.preventDefault();
        state.duplicateWidget(state.selectedWidgetIds[0]);
      }
      // Ctrl+G - seskupit
      if (e.ctrlKey && e.key === 'g' && !e.shiftKey && state.selectedWidgets.length > 1) {
        e.preventDefault();
        state.groupWidgets();
      }
      // Ctrl+Shift+G - rozdělit skupinu
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        state.ungroupWidgets();
      }
      // Escape - deselect
      if (e.key === 'Escape') {
        state.deselectAll();
        setEditingWidget(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state]);

  // Otevřít editor widgetu
  const handleEditWidget = useCallback((widget: Widget) => {
    setEditingWidget(widget);
  }, []);

  // Uložit změny widgetu z editoru
  const handleSaveWidget = useCallback((updates: Partial<Widget>) => {
    if (editingWidget) {
      state.updateWidget(editingWidget.id, updates);
    }
    setEditingWidget(null);
  }, [editingWidget, state]);

  return (
    <div ref={containerRef} className="flex flex-col bg-gray-100" style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-800">
            📐 PDF Designer
          </h1>
          <span className="text-sm text-gray-500">
            {state.template.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Načíst šablonu */}
          <div className="relative">
            <button
              onClick={() => setShowTemplateList(!showTemplateList)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              <FolderOpenIcon size={16} />
              Načíst
              {isLoading && <span className="ml-1 text-xs">...</span>}
            </button>
            
            {showTemplateList && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {/* Šablony z databáze */}
                <div className="p-2 border-b border-gray-100 bg-blue-50">
                  <span className="text-xs font-medium text-blue-600">📦 Šablony z databáze</span>
                </div>
                {dbTemplates.length === 0 ? (
                  <div className="p-3 text-sm text-gray-400 text-center">
                    Žádné šablony v databázi
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {dbTemplates.map(dbTemplate => (
                      <div
                        key={dbTemplate.id}
                        className={`flex items-center justify-between px-3 py-2 hover:bg-blue-50 cursor-pointer ${
                          currentDbId === dbTemplate.id ? 'bg-blue-100' : ''
                        }`}
                      >
                        <div 
                          className="flex-1"
                          onClick={() => handleLoadDbTemplate(dbTemplate)}
                        >
                          <div className="text-sm font-medium flex items-center gap-1">
                            {dbTemplate.nazev}
                            {dbTemplate.jeVychozi ? <span className="text-xs text-green-600">★</span> : null}
                            {currentDbId === dbTemplate.id && <span className="text-xs text-blue-500">(aktivní)</span>}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(dbTemplate.updatedAt).toLocaleDateString('cs-CZ')}
                            {dbTemplate.popis && ` • ${dbTemplate.popis}`}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDbTemplate(dbTemplate.id);
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <CloseIcon size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Lokální šablony */}
                {savedTemplates.length > 0 && (
                  <>
                    <div className="p-2 border-b border-t border-gray-100 bg-gray-50">
                      <span className="text-xs font-medium text-gray-500">💾 Lokální šablony (localStorage)</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {savedTemplates.map(template => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <div 
                            className="flex-1"
                            onClick={() => handleLoadTemplate(template)}
                          >
                            <div className="text-sm font-medium">{template.name}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(template.updatedAt).toLocaleDateString('cs-CZ')}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <CloseIcon size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="p-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      state.resetTemplate();
                      setCurrentDbId(null);
                      setShowTemplateList(false);
                    }}
                    className="w-full px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  >
                    + Nová prázdná šablona
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Uložit lokálně */}
          <button
            onClick={handleSaveTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            title="Uložit lokálně (do prohlížeče)"
          >
            <SaveIcon size={16} />
            Lokálně
          </button>

          {/* Uložit do databáze */}
          <button
            onClick={handleSaveToDb}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
              isSaving 
                ? 'bg-blue-300 text-white cursor-wait' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            title="Uložit do databáze (na server)"
          >
            <SaveIcon size={16} />
            {isSaving ? 'Ukládám...' : currentDbId ? 'Aktualizovat' : 'Do databáze'}
          </button>

          {/* Separator */}
          <div className="w-px h-6 bg-gray-300" />

          {/* Náhled HTML (rychlý) */}
          <button
            onClick={handlePreview}
            disabled={!revize}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
              !revize
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-purple-500 text-white hover:bg-purple-600'
            }`}
            title={!revize ? 'Načtěte revizi pro náhled' : 'HTML náhled (rychlý)'}
          >
            <PreviewIcon size={16} />
            Náhled
          </button>

          {/* Náhled PDF */}
          <button
            onClick={handlePDFPreview}
            disabled={!revize || isGeneratingPDF}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
              !revize || isGeneratingPDF
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
            title={!revize ? 'Načtěte revizi pro náhled' : 'Náhled PDF'}
          >
            <PDFIcon size={16} />
            {isGeneratingPDF ? 'Generuji...' : 'PDF náhled'}
          </button>

          {/* Stáhnout PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={!revize || isGeneratingPDF}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
              !revize || isGeneratingPDF
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
            title={!revize ? 'Načtěte revizi pro stažení' : 'Stáhnout PDF'}
          >
            <PDFIcon size={16} />
            Stáhnout PDF
          </button>

          {/* Separator */}
          <div className="w-px h-6 bg-gray-300" />

          {/* Export JSON */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            title="Export šablony jako JSON"
          >
            <ExportIcon size={16} />
            Export JSON
          </button>

          {/* Zavřít */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Zavřít"
            >
              <CloseIcon size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        onAddWidget={state.addWidget}
        onUndo={state.undo}
        onRedo={state.redo}
        canUndo={state.canUndo}
        canRedo={state.canRedo}
        onAlign={state.alignWidgets}
        onDistribute={state.distributeWidgets}
        onGroup={state.groupWidgets}
        onUngroup={state.ungroupWidgets}
        onLockSelected={state.lockSelectedWidgets}
        onUnlockSelected={state.unlockSelectedWidgets}
        onBringForward={state.bringForward}
        onSendBackward={state.sendBackward}
        onBringToFront={state.bringToFront}
        onSendToBack={state.sendToBack}
        onDuplicate={() => {
          if (state.selectedWidgetIds.length === 1) {
            state.duplicateWidget(state.selectedWidgetIds[0]);
          }
        }}
        onDelete={state.deleteSelectedWidgets}
        onToggleGrid={state.toggleGrid}
        showGrid={state.showGrid}
        onZoomIn={state.zoomIn}
        onZoomOut={state.zoomOut}
        scale={state.scale}
        onAddPage={state.addPage}
        selectedCount={state.selectedWidgetIds.length}
        hasGroupSelection={state.selectedWidgets.some(w => w.type === 'group')}
        activeZone={state.activeZone}
        onSetActiveZone={state.setActiveZone}
      />

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Page tabs */}
        <div className="w-16 bg-gray-200 border-r border-gray-300 overflow-y-auto flex-shrink-0">
          {state.template.pages.map((page, index) => (
            <div
              key={page.id}
              onClick={() => state.setCurrentPageIndex(index)}
              className={`
                p-2 cursor-pointer border-b border-gray-300 transition-colors relative group
                ${index === state.currentPageIndex ? 'bg-white' : 'hover:bg-gray-100'}
              `}
            >
              <div className="w-10 h-14 bg-white border border-gray-300 rounded shadow-sm mx-auto flex items-center justify-center text-xs text-gray-500">
                {index + 1}
              </div>
              {/* Delete page button - only show if more than 1 page */}
              {state.template.pages.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Opravdu chcete smazat stránku ${index + 1}?`)) {
                      state.deletePage(index);
                    }
                  }}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  title={`Smazat stránku ${index + 1}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-300 min-h-0">
          <div 
            style={{ 
              transform: `scale(${state.scale})`, 
              transformOrigin: 'top left',
              display: 'inline-block',
            }}
          >
            {state.currentPage && (
              <PageCanvas
                page={state.currentPage}
                pageIndex={state.currentPageIndex}
                totalPages={state.template.pages.length}
                widgets={state.currentPage.widgets}
                selectedWidgetIds={state.selectedWidgetIds}
                onSelectWidget={state.selectWidget}
                onUpdateWidget={state.updateWidget}
                onToggleLockWidget={state.toggleLockWidget}
                onDeselectAll={state.deselectAll}
                onEditWidget={handleEditWidget}
                snapToGrid={state.template.snapToGrid}
                gridSize={state.template.gridSize}
                showGrid={state.showGrid}
                showZones={state.showZones}
                scale={state.scale}
                revize={revize}
                nastaveni={nastaveni}
                headerHeight={state.template.headerHeight}
                footerHeight={state.template.footerHeight}
                pdfData={pdfData}
              />
            )}
          </div>
        </div>

        {/* Properties panel */}
        <PropertiesPanel
          template={state.template}
          selectedWidgets={state.selectedWidgets}
          currentPageIndex={state.currentPageIndex}
          onUpdateTemplate={state.updateTemplate}
          onUpdatePage={state.updatePage}
          onUpdateWidget={state.updateWidget}
          onDeleteWidget={state.deleteWidget}
          onDuplicateWidget={state.duplicateWidget}
          onToggleLockWidget={state.toggleLockWidget}
          onDeletePage={state.deletePage}
          onEditWidget={handleEditWidget}
        />
      </div>

      {/* Widget Editor Modal */}
      {editingWidget && (
        <WidgetEditor
          widget={editingWidget}
          onSave={handleSaveWidget}
          onClose={() => setEditingWidget(null)}
        />
      )}

      {/* Template list backdrop */}
      {showTemplateList && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowTemplateList(false)}
        />
      )}
    </div>
  );
}

export default PDFDesignerMain;
