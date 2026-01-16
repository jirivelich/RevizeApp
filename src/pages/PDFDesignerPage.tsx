import { useState, useEffect, useRef, useCallback } from 'react';
import Draggable from 'react-draggable';
import type { DraggableData, DraggableEvent } from 'react-draggable';
import { Resizable } from 'react-resizable';
import type { ResizeCallbackData } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { Button, Input, Select, Modal } from '../components/ui';
import { revizeService, nastaveniService } from '../services/database';
import type { Revize, Nastaveni } from '../types';

// Typy pro designer
interface Widget {
  id: string;
  type: 'text' | 'variable' | 'table' | 'image' | 'line' | 'box';
  content: string;
  style: WidgetStyle;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface WidgetStyle {
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  backgroundColor?: string;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  padding?: number;
}

interface DesignerTemplate {
  id?: number;
  name: string;
  pageSize: 'A4' | 'A5' | 'Letter';
  orientation: 'portrait' | 'landscape';
  widgets: Widget[];
}

// Dostupné proměnné
const VARIABLES = [
  { key: 'revize.cisloRevize', label: 'Číslo revize' },
  { key: 'revize.nazev', label: 'Název revize' },
  { key: 'revize.datum', label: 'Datum revize' },
  { key: 'revize.vysledek', label: 'Výsledek' },
  { key: 'revize.zaver', label: 'Závěr' },
  { key: 'revize.objednatel', label: 'Objednatel' },
  { key: 'revize.adresaObjektu', label: 'Adresa objektu' },
  { key: 'revize.rozsahRevize', label: 'Rozsah revize' },
  { key: 'technik.jmeno', label: 'Jméno technika' },
  { key: 'technik.cisloOpravneni', label: 'Číslo oprávnění' },
  { key: 'technik.telefon', label: 'Telefon technika' },
  { key: 'firma.nazev', label: 'Název firmy' },
  { key: 'firma.adresa', label: 'Adresa firmy' },
  { key: 'datum.dnes', label: 'Dnešní datum' },
];

// SVG Ikony
const IconText = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>;
const IconVariable = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M7 8l-4 4 4 4M17 8l4 4-4 4M14 4l-4 16"/></svg>;
const IconTable = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>;
const IconImage = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;
const IconLine = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconBox = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
const IconTrash = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
const IconSettings = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const IconSave = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>;
const IconDownload = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>;
const IconEye = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconCopy = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;

// A4 dimensions in mm - konverze na px při 96 DPI
const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  Letter: { width: 216, height: 279 },
};

// Konverze mm na px (96 DPI)
const MM_TO_PX = 3.78;

export default function PDFDesignerPage() {
  const [template, setTemplate] = useState<DesignerTemplate>({
    name: 'Nová šablona',
    pageSize: 'A4',
    orientation: 'portrait',
    widgets: [],
  });
  
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [revize, setRevize] = useState<Revize | null>(null);
  const [nastaveni, setNastaveni] = useState<Nastaveni | null>(null);
  const [zoom, setZoom] = useState(0.8);
  const [savedTemplates, setSavedTemplates] = useState<DesignerTemplate[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    loadSavedTemplates();
  }, []);

  const loadData = async () => {
    try {
      const [nastaveniData, revizeList] = await Promise.all([
        nastaveniService.get(),
        revizeService.getAll(),
      ]);
      setNastaveni(nastaveniData || null);
      if (revizeList.length > 0) {
        const fullRevize = await revizeService.getById(revizeList[0].id!);
        setRevize(fullRevize || null);
      }
    } catch (error) {
      console.error('Chyba při načítání dat:', error);
    }
  };

  const loadSavedTemplates = () => {
    const saved = localStorage.getItem('pdfDesignerTemplates');
    if (saved) {
      try {
        setSavedTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Chyba při načítání šablon:', e);
      }
    }
  };

  const saveTemplate = () => {
    const newTemplates = [...savedTemplates];
    const existingIndex = newTemplates.findIndex(t => t.name === template.name);
    if (existingIndex >= 0) {
      newTemplates[existingIndex] = template;
    } else {
      newTemplates.push(template);
    }
    setSavedTemplates(newTemplates);
    localStorage.setItem('pdfDesignerTemplates', JSON.stringify(newTemplates));
    alert('Šablona uložena!');
  };

  const loadTemplate = (t: DesignerTemplate) => {
    setTemplate(t);
    setSelectedWidget(null);
  };

  const getPageDimensions = useCallback(() => {
    const size = PAGE_SIZES[template.pageSize];
    if (template.orientation === 'landscape') {
      return { width: size.height * MM_TO_PX, height: size.width * MM_TO_PX };
    }
    return { width: size.width * MM_TO_PX, height: size.height * MM_TO_PX };
  }, [template.pageSize, template.orientation]);

  const addWidget = (type: Widget['type']) => {
    const pageDim = getPageDimensions();
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type,
      content: type === 'text' ? 'Nový text' 
             : type === 'variable' ? 'revize.cisloRevize'
             : type === 'line' ? ''
             : type === 'box' ? ''
             : type === 'table' ? 'rozvadece'
             : '',
      style: {
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#000000',
        backgroundColor: type === 'box' ? '#f0f0f0' : 'transparent',
        borderWidth: type === 'line' || type === 'box' ? 1 : 0,
        borderColor: '#000000',
        borderStyle: type === 'line' || type === 'box' ? 'solid' : 'none',
        padding: 8,
      },
      position: { x: 50, y: 50 },
      size: { 
        width: type === 'line' ? pageDim.width - 100 : 200, 
        height: type === 'line' ? 2 : 40 
      },
    };
    
    setTemplate(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
    }));
    setSelectedWidget(newWidget.id);
  };

  const handleDrag = (id: string, _e: DraggableEvent, data: DraggableData) => {
    setTemplate(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === id ? { ...w, position: { x: data.x, y: data.y } } : w
      ),
    }));
  };

  const handleResize = (id: string, _e: React.SyntheticEvent, data: ResizeCallbackData) => {
    setTemplate(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === id ? { ...w, size: { width: data.size.width, height: data.size.height } } : w
      ),
    }));
  };

  const deleteWidget = (id: string) => {
    setTemplate(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== id),
    }));
    if (selectedWidget === id) setSelectedWidget(null);
  };

  const duplicateWidget = (widget: Widget) => {
    const newWidget: Widget = {
      ...widget,
      id: `widget-${Date.now()}`,
      position: { x: widget.position.x + 20, y: widget.position.y + 20 },
    };
    setTemplate(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
    }));
    setSelectedWidget(newWidget.id);
  };

  const saveWidgetEdit = (widget: Widget) => {
    setTemplate(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => w.id === widget.id ? widget : w),
    }));
    setEditingWidget(null);
  };

  const getVariableValue = (key: string): string => {
    if (!revize && !nastaveni) return `{{${key}}}`;
    
    const parts = key.split('.');
    if (parts[0] === 'revize' && revize) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return String((revize as any)[parts[1]] || `{{${key}}}`);
    }
    if (parts[0] === 'technik' && nastaveni) {
      const map: Record<string, string> = {
        jmeno: nastaveni.reviznniTechnikJmeno || '',
        cisloOpravneni: nastaveni.reviznniTechnikCisloOpravneni || '',
        telefon: nastaveni.kontaktTelefon || '',
      };
      return map[parts[1]] || `{{${key}}}`;
    }
    if (parts[0] === 'firma' && nastaveni) {
      const map: Record<string, string> = {
        nazev: nastaveni.firmaJmeno || '',
        adresa: nastaveni.firmaAdresa || '',
      };
      return map[parts[1]] || `{{${key}}}`;
    }
    if (key === 'datum.dnes') {
      return new Date().toLocaleDateString('cs-CZ');
    }
    return `{{${key}}}`;
  };

  const replaceVariables = (text: string): string => {
    if (!text) return '';
    // Nahradí {{klíč}} hodnotou
    let result = text.replace(/\{\{([^}]+)\}\}/g, (_, key) => getVariableValue(key.trim()));
    // Pokud je to jen klíč proměnné, vrátí přímo hodnotu
    if (VARIABLES.some(v => v.key === text)) return getVariableValue(text);
    return result;
  };

  const renderWidgetContent = (widget: Widget, forExport = false) => {
    const style: React.CSSProperties = {
      fontSize: widget.style.fontSize,
      fontWeight: widget.style.fontWeight,
      fontStyle: widget.style.fontStyle,
      textAlign: widget.style.textAlign as React.CSSProperties['textAlign'],
      color: widget.style.color,
      backgroundColor: widget.style.backgroundColor === 'transparent' ? undefined : widget.style.backgroundColor,
      padding: widget.style.padding,
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden',
      fontFamily: 'Arial, sans-serif',
    };

    if (widget.type === 'line') {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
        }}>
          <div style={{
            width: '100%',
            borderTop: `${widget.style.borderWidth}px ${widget.style.borderStyle} ${widget.style.borderColor}`,
          }} />
        </div>
      );
    }

    if (widget.type === 'box') {
      return (
        <div style={{
          ...style,
          border: `${widget.style.borderWidth}px ${widget.style.borderStyle} ${widget.style.borderColor}`,
        }} />
      );
    }

    if (widget.type === 'variable' || widget.type === 'text') {
      const content = widget.type === 'variable' ? replaceVariables(widget.content) : widget.content;
      return <div style={style}>{content}</div>;
    }

    if (widget.type === 'table') {
      return (
        <div style={{ ...style, fontSize: 11, padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#e5e7eb' }}>
                <th style={{ border: '1px solid #ccc', padding: '4px' }}>Rozvaděč</th>
                <th style={{ border: '1px solid #ccc', padding: '4px' }}>Okruhy</th>
                <th style={{ border: '1px solid #ccc', padding: '4px' }}>Stav</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px' }}>HR1</td>
                <td style={{ border: '1px solid #ccc', padding: '4px' }}>12</td>
                <td style={{ border: '1px solid #ccc', padding: '4px' }}>OK</td>
              </tr>
              {!forExport && (
                <tr>
                  <td colSpan={3} style={{ border: '1px solid #ccc', padding: '4px', color: '#9ca3af', textAlign: 'center' }}>
                    ... data z revize
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    if (widget.type === 'image') {
      return (
        <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: widget.content ? 'transparent' : '#f3f4f6' }}>
          {widget.content ? (
            <img src={widget.content} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ color: '#9ca3af' }}>📷 Obrázek</span>
          )}
        </div>
      );
    }

    return null;
  };

  const exportToPDF = async () => {
    if (!previewRef.current) return;
    
    const html2pdf = (await import('html2pdf.js')).default;
    
    const opt = {
      margin: 0,
      filename: `${template.name}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { 
        unit: 'mm' as const, 
        format: template.pageSize.toLowerCase() as 'a4' | 'a5' | 'letter', 
        orientation: template.orientation 
      },
    };
    
    html2pdf().set(opt).from(previewRef.current).save();
  };

  const pageDim = getPageDimensions();
  const scaledWidth = pageDim.width * zoom;
  const scaledHeight = pageDim.height * zoom;

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-4 flex-wrap">
        <h1 className="text-lg font-semibold">📄 PDF Designer</h1>
        
        <div className="h-6 border-l border-gray-300" />
        
        {/* Widget buttons */}
        <div className="flex items-center gap-1">
          <button onClick={() => addWidget('text')} className="p-2 hover:bg-gray-100 rounded flex items-center gap-1 text-sm" title="Přidat text">
            <IconText /> <span className="hidden lg:inline">Text</span>
          </button>
          <button onClick={() => addWidget('variable')} className="p-2 hover:bg-gray-100 rounded flex items-center gap-1 text-sm" title="Přidat proměnnou">
            <IconVariable /> <span className="hidden lg:inline">Proměnná</span>
          </button>
          <button onClick={() => addWidget('table')} className="p-2 hover:bg-gray-100 rounded flex items-center gap-1 text-sm" title="Přidat tabulku">
            <IconTable /> <span className="hidden lg:inline">Tabulka</span>
          </button>
          <button onClick={() => addWidget('image')} className="p-2 hover:bg-gray-100 rounded flex items-center gap-1 text-sm" title="Přidat obrázek">
            <IconImage /> <span className="hidden lg:inline">Obrázek</span>
          </button>
          <button onClick={() => addWidget('line')} className="p-2 hover:bg-gray-100 rounded flex items-center gap-1 text-sm" title="Přidat čáru">
            <IconLine /> <span className="hidden lg:inline">Čára</span>
          </button>
          <button onClick={() => addWidget('box')} className="p-2 hover:bg-gray-100 rounded flex items-center gap-1 text-sm" title="Přidat box">
            <IconBox /> <span className="hidden lg:inline">Box</span>
          </button>
        </div>

        <div className="h-6 border-l border-gray-300" />

        {/* Zoom */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Zoom:</span>
          <input 
            type="range" 
            min="0.3" 
            max="1.5" 
            step="0.1" 
            value={zoom} 
            onChange={(e) => setZoom(parseFloat(e.target.value))} 
            className="w-20" 
          />
          <span className="text-sm text-gray-600 w-10">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <Button size="sm" variant="secondary" onClick={() => setShowPreview(true)}>
          <IconEye /> Náhled
        </Button>
        <Button size="sm" variant="secondary" onClick={exportToPDF}>
          <IconDownload /> PDF
        </Button>
        <Button size="sm" onClick={saveTemplate}>
          <IconSave /> Uložit
        </Button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 overflow-auto p-8 flex justify-center bg-gray-200">
          <div
            ref={canvasRef}
            className="relative bg-white shadow-xl"
            style={{
              width: scaledWidth,
              height: scaledHeight,
              minWidth: scaledWidth,
              minHeight: scaledHeight,
            }}
            onClick={() => setSelectedWidget(null)}
          >
            {template.widgets.map(widget => {
              const nodeRef = useRef<HTMLDivElement>(null);
              return (
                <Draggable
                  key={widget.id}
                  nodeRef={nodeRef}
                  position={{ x: widget.position.x * zoom, y: widget.position.y * zoom }}
                  onStop={(_e, data) => handleDrag(widget.id, _e, { ...data, x: data.x / zoom, y: data.y / zoom })}
                  handle=".drag-handle"
                  bounds="parent"
                >
                  <div ref={nodeRef} style={{ position: 'absolute' }}>
                    <Resizable
                      width={widget.size.width * zoom}
                      height={widget.size.height * zoom}
                      onResize={(_e, data) => handleResize(widget.id, _e, { ...data, size: { width: data.size.width / zoom, height: data.size.height / zoom } })}
                      minConstraints={[50 * zoom, 20 * zoom]}
                      maxConstraints={[scaledWidth - widget.position.x * zoom, scaledHeight - widget.position.y * zoom]}
                    >
                      <div
                        className={`group ${selectedWidget === widget.id ? 'ring-2 ring-blue-500' : 'ring-1 ring-transparent hover:ring-blue-300'}`}
                        style={{
                          width: widget.size.width * zoom,
                          height: widget.size.height * zoom,
                          position: 'relative',
                        }}
                        onClick={(e) => { e.stopPropagation(); setSelectedWidget(widget.id); }}
                      >
                        {/* Widget toolbar */}
                        <div className={`drag-handle absolute -top-7 left-0 right-0 h-7 bg-blue-500 text-white text-xs px-2 flex items-center justify-between rounded-t cursor-move z-20 ${selectedWidget === widget.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <span className="truncate capitalize">{widget.type}</span>
                          <div className="flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); duplicateWidget(widget); }} className="hover:bg-blue-600 p-0.5 rounded" title="Duplikovat">
                              <IconCopy />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setEditingWidget(widget); }} className="hover:bg-blue-600 p-0.5 rounded" title="Upravit">
                              <IconSettings />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); deleteWidget(widget.id); }} className="hover:bg-red-600 p-0.5 rounded" title="Smazat">
                              <IconTrash />
                            </button>
                          </div>
                        </div>
                        
                        {/* Widget content */}
                        <div 
                          style={{ 
                            transform: `scale(${zoom})`, 
                            transformOrigin: 'top left',
                            width: widget.size.width,
                            height: widget.size.height,
                          }}
                        >
                          {renderWidgetContent(widget)}
                        </div>
                      </div>
                    </Resizable>
                  </div>
                </Draggable>
              );
            })}
          </div>
        </div>

        {/* Properties panel */}
        <div className="w-72 bg-white border-l overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b">
            <h3 className="font-semibold">📋 Nastavení stránky</h3>
          </div>
          <div className="p-4 space-y-4">
            <Input 
              label="Název šablony" 
              value={template.name} 
              onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))} 
            />
            <Select
              label="Velikost stránky"
              value={template.pageSize}
              onChange={(e) => setTemplate(prev => ({ ...prev, pageSize: e.target.value as 'A4' | 'A5' | 'Letter' }))}
              options={[
                { value: 'A4', label: 'A4 (210×297 mm)' }, 
                { value: 'A5', label: 'A5 (148×210 mm)' }, 
                { value: 'Letter', label: 'Letter (216×279 mm)' }
              ]}
            />
            <Select
              label="Orientace"
              value={template.orientation}
              onChange={(e) => setTemplate(prev => ({ ...prev, orientation: e.target.value as 'portrait' | 'landscape' }))}
              options={[
                { value: 'portrait', label: 'Na výšku' }, 
                { value: 'landscape', label: 'Na šířku' }
              ]}
            />
          </div>

          {/* Selected widget info */}
          {selectedWidget && (
            <>
              <div className="p-4 border-t border-b bg-blue-50">
                <h3 className="font-semibold">🎯 Vybraný widget</h3>
              </div>
              <div className="p-4 space-y-3">
                {(() => {
                  const widget = template.widgets.find(w => w.id === selectedWidget);
                  if (!widget) return null;
                  return (
                    <>
                      <div className="text-sm">
                        <span className="text-gray-500">Typ:</span>{' '}
                        <span className="font-medium capitalize">{widget.type}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Pozice:</span>{' '}
                        <span className="font-medium">{Math.round(widget.position.x)} × {Math.round(widget.position.y)} px</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Velikost:</span>{' '}
                        <span className="font-medium">{Math.round(widget.size.width)} × {Math.round(widget.size.height)} px</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={() => setEditingWidget(widget)} className="flex-1">
                          <IconSettings /> Upravit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => deleteWidget(widget.id)}>
                          <IconTrash />
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </>
          )}

          {/* Saved templates */}
          {savedTemplates.length > 0 && (
            <>
              <div className="p-4 border-t">
                <h3 className="font-semibold mb-2">💾 Uložené šablony</h3>
                <div className="space-y-1">
                  {savedTemplates.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => loadTemplate(t)}
                      className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 truncate"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Variables list */}
          <div className="p-4 border-t">
            <h3 className="font-semibold mb-2">📝 Dostupné proměnné</h3>
            <div className="space-y-1 text-xs max-h-48 overflow-y-auto">
              {VARIABLES.map(v => (
                <div key={v.key} className="flex justify-between p-1.5 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200">
                  <span className="text-gray-600">{v.label}</span>
                  <code className="text-blue-600 text-[10px]">{v.key}</code>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Použijte <code className="bg-gray-100 px-1 rounded">{'{{'}</code>klíč<code className="bg-gray-100 px-1 rounded">{'}}'}</code> v textu
            </p>
          </div>
        </div>
      </div>

      {/* Widget Edit Modal */}
      <Modal isOpen={!!editingWidget} onClose={() => setEditingWidget(null)} title="Upravit widget">
        {editingWidget && (
          <div className="space-y-4">
            {(editingWidget.type === 'text' || editingWidget.type === 'variable') && (
              <>
                {editingWidget.type === 'variable' ? (
                  <Select
                    label="Proměnná"
                    value={editingWidget.content}
                    onChange={(e) => setEditingWidget({ ...editingWidget, content: e.target.value })}
                    options={VARIABLES.map(v => ({ value: v.key, label: v.label }))}
                  />
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Obsah textu</label>
                    <textarea
                      className="w-full border rounded-lg p-2 min-h-[100px] text-sm"
                      value={editingWidget.content}
                      onChange={(e) => setEditingWidget({ ...editingWidget, content: e.target.value })}
                      placeholder="Text může obsahovat proměnné: {{revize.cisloRevize}}"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Velikost písma (px)"
                    type="number"
                    value={editingWidget.style.fontSize || 14}
                    onChange={(e) => setEditingWidget({
                      ...editingWidget,
                      style: { ...editingWidget.style, fontSize: parseInt(e.target.value) }
                    })}
                  />
                  <Select
                    label="Tučnost"
                    value={editingWidget.style.fontWeight || 'normal'}
                    onChange={(e) => setEditingWidget({
                      ...editingWidget,
                      style: { ...editingWidget.style, fontWeight: e.target.value as 'normal' | 'bold' }
                    })}
                    options={[{ value: 'normal', label: 'Normální' }, { value: 'bold', label: 'Tučné' }]}
                  />
                </div>
                
                <Select
                  label="Zarovnání textu"
                  value={editingWidget.style.textAlign || 'left'}
                  onChange={(e) => setEditingWidget({
                    ...editingWidget,
                    style: { ...editingWidget.style, textAlign: e.target.value as 'left' | 'center' | 'right' }
                  })}
                  options={[
                    { value: 'left', label: 'Vlevo' }, 
                    { value: 'center', label: 'Na střed' }, 
                    { value: 'right', label: 'Vpravo' }
                  ]}
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Barva textu</label>
                    <input
                      type="color"
                      value={editingWidget.style.color || '#000000'}
                      onChange={(e) => setEditingWidget({
                        ...editingWidget,
                        style: { ...editingWidget.style, color: e.target.value }
                      })}
                      className="w-full h-10 rounded border cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Barva pozadí</label>
                    <input
                      type="color"
                      value={editingWidget.style.backgroundColor === 'transparent' ? '#ffffff' : (editingWidget.style.backgroundColor || '#ffffff')}
                      onChange={(e) => setEditingWidget({
                        ...editingWidget,
                        style: { ...editingWidget.style, backgroundColor: e.target.value }
                      })}
                      className="w-full h-10 rounded border cursor-pointer"
                    />
                  </div>
                </div>

                <Input
                  label="Padding (px)"
                  type="number"
                  value={editingWidget.style.padding || 8}
                  onChange={(e) => setEditingWidget({
                    ...editingWidget,
                    style: { ...editingWidget.style, padding: parseInt(e.target.value) }
                  })}
                />
              </>
            )}

            {(editingWidget.type === 'line' || editingWidget.type === 'box') && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Tloušťka čáry (px)"
                    type="number"
                    value={editingWidget.style.borderWidth || 1}
                    onChange={(e) => setEditingWidget({
                      ...editingWidget,
                      style: { ...editingWidget.style, borderWidth: parseInt(e.target.value) }
                    })}
                  />
                  <Select
                    label="Styl čáry"
                    value={editingWidget.style.borderStyle || 'solid'}
                    onChange={(e) => setEditingWidget({
                      ...editingWidget,
                      style: { ...editingWidget.style, borderStyle: e.target.value as 'solid' | 'dashed' | 'dotted' }
                    })}
                    options={[
                      { value: 'solid', label: 'Plná' },
                      { value: 'dashed', label: 'Čárkovaná' },
                      { value: 'dotted', label: 'Tečkovaná' },
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Barva čáry</label>
                    <input
                      type="color"
                      value={editingWidget.style.borderColor || '#000000'}
                      onChange={(e) => setEditingWidget({
                        ...editingWidget,
                        style: { ...editingWidget.style, borderColor: e.target.value }
                      })}
                      className="w-full h-10 rounded border cursor-pointer"
                    />
                  </div>
                  {editingWidget.type === 'box' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Barva výplně</label>
                      <input
                        type="color"
                        value={editingWidget.style.backgroundColor === 'transparent' ? '#f0f0f0' : (editingWidget.style.backgroundColor || '#f0f0f0')}
                        onChange={(e) => setEditingWidget({
                          ...editingWidget,
                          style: { ...editingWidget.style, backgroundColor: e.target.value }
                        })}
                        className="w-full h-10 rounded border cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {editingWidget.type === 'image' && (
              <>
                <Input
                  label="URL obrázku"
                  value={editingWidget.content}
                  onChange={(e) => setEditingWidget({ ...editingWidget, content: e.target.value })}
                  placeholder="https://example.com/image.png"
                />
                <p className="text-xs text-gray-500">
                  Zadejte URL obrázku nebo base64 data URL (data:image/...)
                </p>
              </>
            )}

            {editingWidget.type === 'table' && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <p className="font-medium mb-2">Tabulka zobrazí data z revize:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Rozvaděče s počtem okruhů</li>
                  <li>Měřené hodnoty</li>
                  <li>Seznam závad</li>
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={() => setEditingWidget(null)}>Zrušit</Button>
              <Button onClick={() => saveWidgetEdit(editingWidget)}>Uložit změny</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Náhled PDF">
        <div className="overflow-auto max-h-[70vh] bg-gray-200 p-4 -mx-6 -mt-2">
          <div
            ref={previewRef}
            style={{
              width: pageDim.width,
              height: pageDim.height,
              backgroundColor: 'white',
              position: 'relative',
              margin: '0 auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          >
            {template.widgets.map(widget => (
              <div
                key={widget.id}
                style={{
                  position: 'absolute',
                  left: widget.position.x,
                  top: widget.position.y,
                  width: widget.size.width,
                  height: widget.size.height,
                }}
              >
                {renderWidgetContent(widget, true)}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="secondary" onClick={() => setShowPreview(false)}>Zavřít</Button>
          <Button onClick={exportToPDF}>
            <IconDownload /> Stáhnout PDF
          </Button>
        </div>
      </Modal>
    </div>
  );
}
