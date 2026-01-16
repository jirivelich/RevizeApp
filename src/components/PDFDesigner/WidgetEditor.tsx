// Widget Editor Modal - editace vlastností widgetu
import { useState } from 'react';
import { Button, Input, Select, Modal } from '../ui';
import type { Widget, TableType, WidgetStyle } from './types';
import { VARIABLES, TABLE_COLUMNS, TABLE_TYPES, VARIABLE_CATEGORIES } from './constants';

interface WidgetEditorProps {
  widget: Widget | null;
  onSave: (widget: Widget) => void;
  onClose: () => void;
}

export function WidgetEditor({ widget, onSave, onClose }: WidgetEditorProps) {
  const [editedWidget, setEditedWidget] = useState<Widget | null>(widget);
  const [activeTab, setActiveTab] = useState<'content' | 'style' | 'table'>('content');
  const [selectedCategory, setSelectedCategory] = useState<string>('Revize');

  if (!editedWidget) return null;

  const updateStyle = (key: keyof WidgetStyle, value: unknown) => {
    setEditedWidget({
      ...editedWidget,
      style: { ...editedWidget.style, [key]: value }
    });
  };

  const updateTableConfig = (updates: Partial<typeof editedWidget.tableConfig>) => {
    setEditedWidget({
      ...editedWidget,
      tableConfig: { ...editedWidget.tableConfig!, ...updates }
    });
  };

  const handleSave = () => {
    if (editedWidget) {
      onSave(editedWidget);
    }
  };

  const filteredVariables = VARIABLES.filter(v => v.category === selectedCategory);

  return (
    <Modal isOpen={!!widget} onClose={onClose} title={`Upravit ${editedWidget.type}`}>
      <div className="min-h-[400px]">
        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'content' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('content')}
          >
            Obsah
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'style' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('style')}
          >
            Styl
          </button>
          {editedWidget.type === 'table' && (
            <button
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'table' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('table')}
            >
              Tabulka
            </button>
          )}
        </div>

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            {/* Text widget */}
            {editedWidget.type === 'text' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Obsah textu</label>
                <textarea
                  className="w-full border rounded-lg p-2 min-h-[120px] text-sm font-mono"
                  value={editedWidget.content}
                  onChange={(e) => setEditedWidget({ ...editedWidget, content: e.target.value })}
                  placeholder="Text může obsahovat proměnné: {{revize.cisloRevize}}"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Použijte <code className="bg-gray-100 px-1 rounded">{'{{klíč}}'}</code> pro vložení proměnné
                </p>
              </div>
            )}

            {/* Variable widget */}
            {editedWidget.type === 'variable' && (
              <div className="space-y-3">
                <Select
                  label="Kategorie"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  options={VARIABLE_CATEGORIES.map(c => ({ value: c, label: c }))}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proměnná</label>
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    {filteredVariables.map(v => (
                      <button
                        key={v.key}
                        onClick={() => setEditedWidget({ ...editedWidget, content: v.key })}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex justify-between items-center ${editedWidget.content === v.key ? 'bg-blue-100' : ''}`}
                      >
                        <span>{v.label}</span>
                        <code className="text-xs text-gray-500">{v.key}</code>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Table widget */}
            {editedWidget.type === 'table' && (
              <Select
                label="Typ tabulky"
                value={editedWidget.tableConfig?.type || 'rozvadece'}
                onChange={(e) => {
                  const type = e.target.value as TableType;
                  const columns = TABLE_COLUMNS[type] || [];
                  updateTableConfig({ type, columns: [...columns] });
                }}
                options={TABLE_TYPES.map(t => ({ value: t.type, label: t.label }))}
              />
            )}

            {/* Image widget */}
            {editedWidget.type === 'image' && (
              <>
                <Input
                  label="URL obrázku"
                  value={editedWidget.content}
                  onChange={(e) => setEditedWidget({ ...editedWidget, content: e.target.value })}
                  placeholder="https://example.com/image.png nebo data:image/..."
                />
                <div className="text-xs text-gray-500">
                  Můžete také použít proměnnou: <code>{'{{firma.logo}}'}</code> nebo <code>{'{{technik.podpis}}'}</code>
                </div>
              </>
            )}

            {/* Line/Box widget */}
            {(editedWidget.type === 'line' || editedWidget.type === 'box') && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Tloušťka čáry (px)"
                  type="number"
                  min={0}
                  max={10}
                  value={editedWidget.style.borderWidth || 1}
                  onChange={(e) => updateStyle('borderWidth', parseInt(e.target.value))}
                />
                <Select
                  label="Styl čáry"
                  value={editedWidget.style.borderStyle || 'solid'}
                  onChange={(e) => updateStyle('borderStyle', e.target.value)}
                  options={[
                    { value: 'solid', label: 'Plná' },
                    { value: 'dashed', label: 'Čárkovaná' },
                    { value: 'dotted', label: 'Tečkovaná' },
                  ]}
                />
              </div>
            )}

            {/* Page number */}
            {editedWidget.type === 'page-number' && (
              <Select
                label="Formát"
                value={editedWidget.content || 'X/Y'}
                onChange={(e) => setEditedWidget({ ...editedWidget, content: e.target.value })}
                options={[
                  { value: 'X', label: 'Pouze číslo (1)' },
                  { value: 'X/Y', label: 'Strana X z Y' },
                  { value: 'Strana X', label: 'Strana 1' },
                  { value: 'Strana X z Y', label: 'Strana 1 z 5' },
                ]}
              />
            )}

            {/* Date widget */}
            {editedWidget.type === 'date' && (
              <Select
                label="Formát data"
                value={editedWidget.content || 'DD.MM.YYYY'}
                onChange={(e) => setEditedWidget({ ...editedWidget, content: e.target.value })}
                options={[
                  { value: 'DD.MM.YYYY', label: '16.01.2026' },
                  { value: 'D. M. YYYY', label: '16. 1. 2026' },
                  { value: 'DD/MM/YYYY', label: '16/01/2026' },
                  { value: 'YYYY-MM-DD', label: '2026-01-16' },
                  { value: 'D. MMMM YYYY', label: '16. ledna 2026' },
                ]}
              />
            )}

            {/* Zone selection */}
            <Select
              label="Zóna umístění"
              value={editedWidget.zone}
              onChange={(e) => setEditedWidget({ ...editedWidget, zone: e.target.value as 'header' | 'content' | 'footer' })}
              options={[
                { value: 'header', label: 'Záhlaví (opakuje se)' },
                { value: 'content', label: 'Obsah stránky' },
                { value: 'footer', label: 'Zápatí (opakuje se)' },
              ]}
            />
          </div>
        )}

        {/* Style Tab */}
        {activeTab === 'style' && (
          <div className="space-y-4">
            {/* Text styling - only for text-based widgets */}
            {['text', 'variable', 'page-number', 'date'].includes(editedWidget.type) && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Velikost písma"
                    type="number"
                    min={6}
                    max={72}
                    value={editedWidget.style.fontSize || 12}
                    onChange={(e) => updateStyle('fontSize', parseInt(e.target.value))}
                  />
                  <Select
                    label="Tučnost"
                    value={editedWidget.style.fontWeight || 'normal'}
                    onChange={(e) => updateStyle('fontWeight', e.target.value)}
                    options={[
                      { value: 'normal', label: 'Normální' },
                      { value: 'bold', label: 'Tučné' },
                    ]}
                  />
                  <Select
                    label="Kurzíva"
                    value={editedWidget.style.fontStyle || 'normal'}
                    onChange={(e) => updateStyle('fontStyle', e.target.value)}
                    options={[
                      { value: 'normal', label: 'Ne' },
                      { value: 'italic', label: 'Ano' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Zarovnání (horizontální)"
                    value={editedWidget.style.textAlign || 'left'}
                    onChange={(e) => updateStyle('textAlign', e.target.value)}
                    options={[
                      { value: 'left', label: 'Vlevo' },
                      { value: 'center', label: 'Na střed' },
                      { value: 'right', label: 'Vpravo' },
                      { value: 'justify', label: 'Do bloku' },
                    ]}
                  />
                  <Select
                    label="Zarovnání (vertikální)"
                    value={editedWidget.style.verticalAlign || 'top'}
                    onChange={(e) => updateStyle('verticalAlign', e.target.value)}
                    options={[
                      { value: 'top', label: 'Nahoru' },
                      { value: 'middle', label: 'Na střed' },
                      { value: 'bottom', label: 'Dolů' },
                    ]}
                  />
                </div>

                <Input
                  label="Výška řádku"
                  type="number"
                  step={0.1}
                  min={1}
                  max={3}
                  value={editedWidget.style.lineHeight || 1.4}
                  onChange={(e) => updateStyle('lineHeight', parseFloat(e.target.value))}
                />
              </>
            )}

            {/* Colors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barva textu</label>
                <input
                  type="color"
                  value={editedWidget.style.color || '#000000'}
                  onChange={(e) => updateStyle('color', e.target.value)}
                  className="w-full h-10 rounded border cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barva pozadí</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={editedWidget.style.backgroundColor === 'transparent' ? '#ffffff' : (editedWidget.style.backgroundColor || '#ffffff')}
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                    className="flex-1 h-10 rounded border cursor-pointer"
                  />
                  <button
                    onClick={() => updateStyle('backgroundColor', 'transparent')}
                    className={`px-2 text-xs rounded border ${editedWidget.style.backgroundColor === 'transparent' ? 'bg-blue-100 border-blue-500' : ''}`}
                  >
                    Průhledné
                  </button>
                </div>
              </div>
            </div>

            {/* Border */}
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Tloušťka okraje"
                type="number"
                min={0}
                max={10}
                value={editedWidget.style.borderWidth || 0}
                onChange={(e) => updateStyle('borderWidth', parseInt(e.target.value))}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barva okraje</label>
                <input
                  type="color"
                  value={editedWidget.style.borderColor || '#000000'}
                  onChange={(e) => updateStyle('borderColor', e.target.value)}
                  className="w-full h-10 rounded border cursor-pointer"
                />
              </div>
              <Input
                label="Zaoblení rohů"
                type="number"
                min={0}
                max={50}
                value={editedWidget.style.borderRadius || 0}
                onChange={(e) => updateStyle('borderRadius', parseInt(e.target.value))}
              />
            </div>

            {/* Padding & Opacity */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Vnitřní okraj (padding)"
                type="number"
                min={0}
                max={50}
                value={editedWidget.style.padding || 4}
                onChange={(e) => updateStyle('padding', parseInt(e.target.value))}
              />
              <Input
                label="Průhlednost (%)"
                type="number"
                min={0}
                max={100}
                value={Math.round((editedWidget.style.opacity || 1) * 100)}
                onChange={(e) => updateStyle('opacity', parseInt(e.target.value) / 100)}
              />
            </div>
          </div>
        )}

        {/* Table Tab */}
        {activeTab === 'table' && editedWidget.type === 'table' && editedWidget.tableConfig && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showHeader"
                checked={editedWidget.tableConfig.showHeader}
                onChange={(e) => updateTableConfig({ showHeader: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="showHeader" className="text-sm">Zobrazit záhlaví</label>
            </div>

            <Select
              label="Styl ohraničení"
              value={editedWidget.tableConfig.borderStyle}
              onChange={(e) => updateTableConfig({ borderStyle: e.target.value as 'all' | 'horizontal' | 'vertical' | 'outer' | 'none' })}
              options={[
                { value: 'all', label: 'Všechny čáry' },
                { value: 'horizontal', label: 'Pouze horizontální' },
                { value: 'vertical', label: 'Pouze vertikální' },
                { value: 'outer', label: 'Pouze vnější' },
                { value: 'none', label: 'Bez čar' },
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barva střídavých řádků</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={editedWidget.tableConfig.alternateRowColor || '#f9fafb'}
                  onChange={(e) => updateTableConfig({ alternateRowColor: e.target.value })}
                  className="flex-1 h-10 rounded border cursor-pointer"
                />
                <button
                  onClick={() => updateTableConfig({ alternateRowColor: undefined })}
                  className={`px-2 text-xs rounded border ${!editedWidget.tableConfig.alternateRowColor ? 'bg-blue-100 border-blue-500' : ''}`}
                >
                  Vypnout
                </button>
              </div>
            </div>

            {/* Columns configuration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sloupce</label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left">Zobrazit</th>
                      <th className="px-2 py-1 text-left">Název</th>
                      <th className="px-2 py-1 text-center">Šířka %</th>
                      <th className="px-2 py-1 text-center">Zarovnání</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedWidget.tableConfig.columns.map((col, idx) => (
                      <tr key={col.id} className="border-t">
                        <td className="px-2 py-1">
                          <input
                            type="checkbox"
                            checked={col.visible}
                            onChange={(e) => {
                              const cols = [...editedWidget.tableConfig!.columns];
                              cols[idx] = { ...cols[idx], visible: e.target.checked };
                              updateTableConfig({ columns: cols });
                            }}
                            className="rounded"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={col.label}
                            onChange={(e) => {
                              const cols = [...editedWidget.tableConfig!.columns];
                              cols[idx] = { ...cols[idx], label: e.target.value };
                              updateTableConfig({ columns: cols });
                            }}
                            className="w-full px-1 py-0.5 border rounded text-sm"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min={5}
                            max={100}
                            value={col.width}
                            onChange={(e) => {
                              const cols = [...editedWidget.tableConfig!.columns];
                              cols[idx] = { ...cols[idx], width: parseInt(e.target.value) };
                              updateTableConfig({ columns: cols });
                            }}
                            className="w-16 px-1 py-0.5 border rounded text-sm text-center"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <select
                            value={col.align}
                            onChange={(e) => {
                              const cols = [...editedWidget.tableConfig!.columns];
                              cols[idx] = { ...cols[idx], align: e.target.value as 'left' | 'center' | 'right' };
                              updateTableConfig({ columns: cols });
                            }}
                            className="w-full px-1 py-0.5 border rounded text-sm"
                          >
                            <option value="left">Vlevo</option>
                            <option value="center">Střed</option>
                            <option value="right">Vpravo</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <Button variant="secondary" onClick={onClose}>Zrušit</Button>
          <Button onClick={handleSave}>Uložit změny</Button>
        </div>
      </div>
    </Modal>
  );
}
