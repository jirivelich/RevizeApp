// Properties Panel - pravý panel s vlastnostmi
import type { Widget, PageTemplate, DesignerTemplate, PageSize } from './types';
import { PAGE_SIZES } from './constants';
import {
  DeleteIcon,
  CopyIcon,
  LockIcon,
  UnlockIcon,
  HeaderIcon,
  FooterIcon,
  BoxIcon,
} from './icons';

interface PropertiesPanelProps {
  template: DesignerTemplate;
  selectedWidgets: Widget[];
  currentPageIndex: number;
  onUpdateTemplate: (updates: Partial<DesignerTemplate>) => void;
  onUpdatePage: (pageIndex: number, updates: Partial<PageTemplate>) => void;
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void;
  onDeleteWidget: (id: string) => void;
  onDuplicateWidget: (id: string) => void;
  onToggleLockWidget: (id: string) => void;
  onDeletePage: (pageIndex: number) => void;
  onEditWidget: (widget: Widget) => void;
}

export function PropertiesPanel({
  template,
  selectedWidgets,
  currentPageIndex,
  onUpdateTemplate,
  onUpdatePage,
  onUpdateWidget,
  onDeleteWidget,
  onDuplicateWidget,
  onToggleLockWidget,
  onDeletePage,
  onEditWidget,
}: PropertiesPanelProps) {
  const currentPage = template.pages[currentPageIndex];
  const selectedWidget = selectedWidgets.length === 1 ? selectedWidgets[0] : null;

  return (
    <div className="w-72 bg-white border-l border-gray-200 overflow-y-auto">
      {/* Template Settings */}
      <div className="border-b border-gray-200">
        <div className="px-3 py-2 bg-gray-50 font-medium text-sm text-gray-700">
          📄 Nastavení šablony
        </div>
        <div className="p-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Název šablony</label>
            <input
              type="text"
              value={template.name}
              onChange={(e) => onUpdateTemplate({ name: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Záhlaví (px)</label>
              <input
                type="number"
                value={template.headerHeight}
                onChange={(e) => onUpdateTemplate({ headerHeight: parseInt(e.target.value) || 0 })}
                min={0}
                max={200}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Zápatí (px)</label>
              <input
                type="number"
                value={template.footerHeight}
                onChange={(e) => onUpdateTemplate({ footerHeight: parseInt(e.target.value) || 0 })}
                min={0}
                max={200}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="snapToGrid"
              checked={template.snapToGrid}
              onChange={(e) => onUpdateTemplate({ snapToGrid: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="snapToGrid" className="text-sm text-gray-700">Přichytávat k mřížce</label>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Velikost mřížky (px)</label>
            <input
              type="number"
              value={template.gridSize}
              onChange={(e) => onUpdateTemplate({ gridSize: parseInt(e.target.value) || 10 })}
              min={5}
              max={50}
              step={5}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Page Settings */}
      {currentPage && (
        <div className="border-b border-gray-200">
          <div className="px-3 py-2 bg-gray-50 font-medium text-sm text-gray-700 flex items-center justify-between">
            <span>📃 Strana {currentPageIndex + 1}</span>
            {template.pages.length > 1 && (
              <button
                onClick={() => onDeletePage(currentPageIndex)}
                className="text-red-500 hover:text-red-700 text-xs"
                title="Smazat stránku"
              >
                <DeleteIcon size={14} />
              </button>
            )}
          </div>
          <div className="p-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Název stránky</label>
              <input
                type="text"
                value={currentPage.name || ''}
                onChange={(e) => onUpdatePage(currentPageIndex, { name: e.target.value })}
                placeholder="Volitelný název"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Velikost stránky</label>
              <select
                value={currentPage.size}
                onChange={(e) => onUpdatePage(currentPageIndex, { size: e.target.value as PageSize })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {Object.entries(PAGE_SIZES).map(([key, size]) => (
                  <option key={key} value={key}>
                    {key.toUpperCase()} ({size.width}×{size.height} mm)
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Orientace</label>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdatePage(currentPageIndex, { orientation: 'portrait' })}
                  className={`flex-1 py-1.5 text-xs rounded border ${
                    currentPage.orientation === 'portrait'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Na výšku
                </button>
                <button
                  onClick={() => onUpdatePage(currentPageIndex, { orientation: 'landscape' })}
                  className={`flex-1 py-1.5 text-xs rounded border ${
                    currentPage.orientation === 'landscape'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Na šířku
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Widget Properties */}
      {selectedWidget ? (
        <div className="border-b border-gray-200">
          <div className="px-3 py-2 bg-gray-50 font-medium text-sm text-gray-700 flex items-center justify-between">
            <span>🔧 Widget: {selectedWidget.name}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onToggleLockWidget(selectedWidget.id)}
                className="p-1 hover:bg-gray-200 rounded"
                title={selectedWidget.locked ? 'Odemknout' : 'Zamknout'}
              >
                {selectedWidget.locked ? <LockIcon size={14} /> : <UnlockIcon size={14} />}
              </button>
              <button
                onClick={() => onDuplicateWidget(selectedWidget.id)}
                className="p-1 hover:bg-gray-200 rounded"
                title="Duplikovat"
              >
                <CopyIcon size={14} />
              </button>
              <button
                onClick={() => onDeleteWidget(selectedWidget.id)}
                className="p-1 hover:bg-red-100 text-red-500 rounded"
                title="Smazat"
              >
                <DeleteIcon size={14} />
              </button>
            </div>
          </div>
          <div className="p-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Název</label>
              <input
                type="text"
                value={selectedWidget.name}
                onChange={(e) => onUpdateWidget(selectedWidget.id, { name: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Pozice a velikost */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">X</label>
                <input
                  type="number"
                  value={Math.round(selectedWidget.x)}
                  onChange={(e) => onUpdateWidget(selectedWidget.id, { x: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Y</label>
                <input
                  type="number"
                  value={Math.round(selectedWidget.y)}
                  onChange={(e) => onUpdateWidget(selectedWidget.id, { y: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Šířka</label>
                <input
                  type="number"
                  value={Math.round(selectedWidget.width)}
                  onChange={(e) => onUpdateWidget(selectedWidget.id, { width: parseInt(e.target.value) || 50 })}
                  min={30}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Výška</label>
                <input
                  type="number"
                  value={Math.round(selectedWidget.height)}
                  onChange={(e) => onUpdateWidget(selectedWidget.id, { height: parseInt(e.target.value) || 20 })}
                  min={20}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Zóna */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Zóna</label>
              <div className="flex gap-1">
                <button
                  onClick={() => onUpdateWidget(selectedWidget.id, { zone: 'header' })}
                  className={`flex-1 py-1.5 text-xs rounded border flex items-center justify-center gap-1 ${
                    selectedWidget.zone === 'header'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <HeaderIcon size={12} />
                  Záhlaví
                </button>
                <button
                  onClick={() => onUpdateWidget(selectedWidget.id, { zone: 'content' })}
                  className={`flex-1 py-1.5 text-xs rounded border flex items-center justify-center gap-1 ${
                    selectedWidget.zone === 'content'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <BoxIcon size={12} />
                  Obsah
                </button>
                <button
                  onClick={() => onUpdateWidget(selectedWidget.id, { zone: 'footer' })}
                  className={`flex-1 py-1.5 text-xs rounded border flex items-center justify-center gap-1 ${
                    selectedWidget.zone === 'footer'
                      ? 'bg-green-50 border-green-500 text-green-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FooterIcon size={12} />
                  Zápatí
                </button>
              </div>
            </div>

            {/* Z-Index */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vrstva (Z-Index)</label>
              <input
                type="number"
                value={selectedWidget.zIndex}
                onChange={(e) => onUpdateWidget(selectedWidget.id, { zIndex: parseInt(e.target.value) || 0 })}
                min={0}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Tlačítko pro editaci */}
            <button
              onClick={() => onEditWidget(selectedWidget)}
              className="w-full py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Upravit obsah a styl
            </button>
          </div>
        </div>
      ) : selectedWidgets.length > 1 ? (
        <div className="border-b border-gray-200">
          <div className="px-3 py-2 bg-gray-50 font-medium text-sm text-gray-700">
            🔧 Vybráno: {selectedWidgets.length} widgetů
          </div>
          <div className="p-3">
            <p className="text-sm text-gray-500 mb-3">
              Použijte toolbar pro hromadné akce (zarovnání, distribuce, seskupení).
            </p>
            <button
              onClick={() => selectedWidgets.forEach(w => onDeleteWidget(w.id))}
              className="w-full py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Smazat vybrané ({selectedWidgets.length})
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 text-sm text-gray-500 text-center">
          Vyberte widget pro úpravu jeho vlastností
        </div>
      )}

      {/* Seznam widgetů na stránce */}
      <div>
        <div className="px-3 py-2 bg-gray-50 font-medium text-sm text-gray-700">
          📋 Widgety na stránce
        </div>
        <div className="max-h-64 overflow-y-auto">
          {currentPage?.widgets.length === 0 ? (
            <div className="p-3 text-sm text-gray-400 text-center">
              Žádné widgety
            </div>
          ) : (
            currentPage?.widgets.map(widget => (
              <div
                key={widget.id}
                onClick={() => onEditWidget(widget)}
                className={`
                  px-3 py-2 border-b border-gray-100 cursor-pointer flex items-center justify-between
                  hover:bg-gray-50 transition-colors
                  ${selectedWidgets.some(w => w.id === widget.id) ? 'bg-blue-50' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  {widget.locked && <LockIcon size={12} className="text-amber-500" />}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    widget.zone === 'header' ? 'bg-blue-100 text-blue-700' :
                    widget.zone === 'footer' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {widget.zone === 'header' ? 'Z' : widget.zone === 'footer' ? 'P' : 'O'}
                  </span>
                  <span className="text-sm truncate max-w-32">{widget.name}</span>
                </div>
                <span className="text-xs text-gray-400">{widget.type}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default PropertiesPanel;
