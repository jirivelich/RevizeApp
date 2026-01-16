// PDFDesignerMain - hlavní komponenta PDF designeru
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Revize, Nastaveni } from '../../types';
import type { Widget, DesignerTemplate } from './types';
import { useDesignerState } from './useDesignerState';
import { Toolbar } from './Toolbar';
import { PageCanvas } from './PageCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { WidgetEditor } from './WidgetEditor';
import { SaveIcon, FolderOpenIcon, ExportIcon, CloseIcon } from './icons';

interface PDFDesignerMainProps {
  revize?: Revize | null;
  nastaveni?: Nastaveni | null;
  onClose?: () => void;
  onExport?: (template: DesignerTemplate) => void;
  initialTemplate?: DesignerTemplate;
}

export function PDFDesignerMain({
  revize = null,
  nastaveni = null,
  onClose,
  onExport,
  initialTemplate,
}: PDFDesignerMainProps) {
  const state = useDesignerState(initialTemplate);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<DesignerTemplate[]>([]);
  const [showTemplateList, setShowTemplateList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Načíst uložené šablony z localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pdfDesignerTemplates');
    if (saved) {
      try {
        setSavedTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    }
  }, []);

  // Uložit šablonu
  const handleSaveTemplate = useCallback(() => {
    const newTemplates = savedTemplates.filter(t => t.id !== state.template.id);
    newTemplates.push({ ...state.template, updatedAt: new Date().toISOString() });
    setSavedTemplates(newTemplates);
    localStorage.setItem('pdfDesignerTemplates', JSON.stringify(newTemplates));
    alert('Šablona byla uložena!');
  }, [state.template, savedTemplates]);

  // Načíst šablonu
  const handleLoadTemplate = useCallback((template: DesignerTemplate) => {
    state.loadTemplate(template);
    setShowTemplateList(false);
  }, [state]);

  // Smazat šablonu
  const handleDeleteTemplate = useCallback((templateId: string) => {
    if (!confirm('Opravdu chcete smazat tuto šablonu?')) return;
    const newTemplates = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(newTemplates);
    localStorage.setItem('pdfDesignerTemplates', JSON.stringify(newTemplates));
  }, [savedTemplates]);

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
    <div ref={containerRef} className="h-full flex flex-col bg-gray-100">
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
            </button>
            
            {showTemplateList && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-2 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-500">Uložené šablony</span>
                </div>
                {savedTemplates.length === 0 ? (
                  <div className="p-3 text-sm text-gray-400 text-center">
                    Žádné uložené šablony
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
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
                )}
                <div className="p-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      state.resetTemplate();
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

          {/* Uložit */}
          <button
            onClick={handleSaveTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            <SaveIcon size={16} />
            Uložit
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            <ExportIcon size={16} />
            Exportovat
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
        activeZone={state.activeZone}
        onSetActiveZone={state.setActiveZone}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Page tabs */}
        <div className="w-16 bg-gray-200 border-r border-gray-300 overflow-y-auto flex-shrink-0">
          {state.template.pages.map((page, index) => (
            <div
              key={page.id}
              onClick={() => state.setCurrentPageIndex(index)}
              className={`
                p-2 cursor-pointer border-b border-gray-300 transition-colors
                ${index === state.currentPageIndex ? 'bg-white' : 'hover:bg-gray-100'}
              `}
            >
              <div className="w-10 h-14 bg-white border border-gray-300 rounded shadow-sm mx-auto flex items-center justify-center text-xs text-gray-500">
                {index + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-300">
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
                snapToGrid={state.template.snapToGrid}
                gridSize={state.template.gridSize}
                showGrid={state.showGrid}
                showZones={state.showZones}
                scale={state.scale}
                revize={revize}
                nastaveni={nastaveni}
                headerHeight={state.template.headerHeight}
                footerHeight={state.template.footerHeight}
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
