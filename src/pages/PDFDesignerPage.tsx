import { useState, useEffect, useCallback } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Input, Select, Modal } from '../components/ui';
import { sablonaService, revizeService, nastaveniService } from '../services/database';
import { generatePDF, previewPDF } from '../services/pdfExport';
import type { Sablona, Revize, Nastaveni } from '../types';

// SVG Ikony
const GripVertical = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="9" cy="5" r="1" fill="currentColor"/>
    <circle cx="9" cy="12" r="1" fill="currentColor"/>
    <circle cx="9" cy="19" r="1" fill="currentColor"/>
    <circle cx="15" cy="5" r="1" fill="currentColor"/>
    <circle cx="15" cy="12" r="1" fill="currentColor"/>
    <circle cx="15" cy="19" r="1" fill="currentColor"/>
  </svg>
);

const Eye = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOff = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const Settings = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const Trash2 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

const Type = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
  </svg>
);

const FileText = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const Save = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
);

const Undo = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
  </svg>
);

const Redo = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/>
  </svg>
);

const TableIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
  </svg>
);

// Typy pro designer
interface DesignerBlock {
  id: string;
  type: 'section' | 'text' | 'table' | 'image' | 'spacer' | 'pagebreak';
  name: string;
  enabled: boolean;
  expanded?: boolean;
  config: BlockConfig;
}

interface BlockConfig {
  // Pro text
  content?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  align?: 'left' | 'center' | 'right';
  color?: string;
  
  // Pro sekce
  sectionId?: string;
  showTitle?: boolean;
  titleFormat?: string;
  
  // Pro tabulky
  columns?: string[];
  
  // Pro obrázky
  src?: string;
  width?: number;
  
  // Pro spacer/obrázky
  height?: number;
  
  // Společné
  marginTop?: number;
  marginBottom?: number;
  condition?: string; // Podmínka pro zobrazení
}

// Dostupné proměnné pro šablonu
const AVAILABLE_VARIABLES = [
  { group: 'Revize', items: [
    { key: '{{revize.cislo}}', label: 'Číslo revize' },
    { key: '{{revize.nazev}}', label: 'Název revize' },
    { key: '{{revize.datum}}', label: 'Datum revize' },
    { key: '{{revize.vysledek}}', label: 'Výsledek' },
    { key: '{{revize.zaver}}', label: 'Závěr' },
  ]},
  { group: 'Zákazník', items: [
    { key: '{{zakaznik.nazev}}', label: 'Název zákazníka' },
    { key: '{{zakaznik.adresa}}', label: 'Adresa' },
    { key: '{{zakaznik.ico}}', label: 'IČO' },
  ]},
  { group: 'Technik', items: [
    { key: '{{technik.jmeno}}', label: 'Jméno technika' },
    { key: '{{technik.cisloOpravneni}}', label: 'Číslo oprávnění' },
    { key: '{{technik.telefon}}', label: 'Telefon' },
  ]},
];

// Předefinované sekce
const PREDEFINED_SECTIONS = [
  { id: 'vymezeni-rozsahu', name: 'Vymezení rozsahu revize' },
  { id: 'charakteristika-zarizeni', name: 'Charakteristika zařízení' },
  { id: 'pristroje', name: 'Měřicí přístroje' },
  { id: 'podklady', name: 'Podklady pro revizi' },
  { id: 'provedene-ukony', name: 'Provedené úkony' },
  { id: 'vyhodnoceni-predchozich', name: 'Vyhodnocení předchozích revizí' },
  { id: 'rozvadece', name: 'Rozvaděče a okruhy' },
  { id: 'mereni', name: 'Naměřené hodnoty' },
  { id: 'mistnosti', name: 'Místnosti' },
  { id: 'zaver', name: 'Závěr revize' },
  { id: 'zavady', name: 'Zjištěné závady' },
];

// Sortable block component
function SortableBlock({ 
  block, 
  onToggle, 
  onEdit, 
  onDelete,
  onExpand,
}: { 
  block: DesignerBlock;
  onToggle: (id: string) => void;
  onEdit: (block: DesignerBlock) => void;
  onDelete: (id: string) => void;
  onExpand: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getBlockIcon = () => {
    switch (block.type) {
      case 'section': return <FileText className="w-4 h-4" />;
      case 'text': return <Type className="w-4 h-4" />;
      case 'table': return <TableIcon className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'spacer': return <div className="w-4 h-4 border-t-2 border-dashed border-gray-400 mt-2" />;
      case 'pagebreak': return <div className="w-4 h-4 border-t-2 border-red-400 mt-2" />;
      default: return null;
    }
  };

  const getBlockColor = () => {
    switch (block.type) {
      case 'section': return 'border-l-blue-500 bg-blue-50';
      case 'text': return 'border-l-green-500 bg-green-50';
      case 'table': return 'border-l-purple-500 bg-purple-50';
      case 'image': return 'border-l-orange-500 bg-orange-50';
      case 'spacer': return 'border-l-gray-400 bg-gray-50';
      case 'pagebreak': return 'border-l-red-500 bg-red-50';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-l-4 rounded-r-lg mb-2 ${getBlockColor()} ${!block.enabled ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2 p-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/50 rounded"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </button>
        
        <button
          onClick={() => onExpand(block.id)}
          className="p-1 hover:bg-white/50 rounded"
        >
          {block.expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>
        
        {getBlockIcon()}
        
        <span className="flex-1 text-sm font-medium truncate">{block.name}</span>
        
        <button
          onClick={() => onToggle(block.id)}
          className="p-1 hover:bg-white/50 rounded"
          title={block.enabled ? 'Skrýt' : 'Zobrazit'}
        >
          {block.enabled ? (
            <Eye className="w-4 h-4 text-green-600" />
          ) : (
            <EyeOff className="w-4 h-4 text-gray-400" />
          )}
        </button>
        
        <button
          onClick={() => onEdit(block)}
          className="p-1 hover:bg-white/50 rounded"
          title="Upravit"
        >
          <Settings className="w-4 h-4 text-gray-500" />
        </button>
        
        {block.type !== 'section' && (
          <button
            onClick={() => onDelete(block.id)}
            className="p-1 hover:bg-red-100 rounded"
            title="Smazat"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        )}
      </div>
      
      {block.expanded && (
        <div className="px-4 pb-3 text-xs text-gray-600 border-t border-white/50 pt-2">
          {block.type === 'text' && block.config.content && (
            <div className="bg-white/50 p-2 rounded">{block.config.content}</div>
          )}
          {block.type === 'section' && (
            <div>Sekce: {block.config.sectionId}</div>
          )}
          {block.config.condition && (
            <div className="mt-1 text-orange-600">Podmínka: {block.config.condition}</div>
          )}
        </div>
      )}
    </div>
  );
}

// Block Editor Modal
function BlockEditorModal({
  block,
  onSave,
  onClose,
}: {
  block: DesignerBlock | null;
  onSave: (block: DesignerBlock) => void;
  onClose: () => void;
}) {
  const [editedBlock, setEditedBlock] = useState<DesignerBlock | null>(block);

  useEffect(() => {
    setEditedBlock(block);
  }, [block]);

  if (!editedBlock) return null;

  const updateConfig = (key: string, value: any) => {
    setEditedBlock({
      ...editedBlock,
      config: { ...editedBlock.config, [key]: value },
    });
  };

  return (
    <Modal isOpen={!!block} onClose={onClose} title={`Upravit: ${editedBlock.name}`}>
      <div className="space-y-4">
        <Input
          label="Název bloku"
          value={editedBlock.name}
          onChange={(e) => setEditedBlock({ ...editedBlock, name: e.target.value })}
        />

        {editedBlock.type === 'text' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Obsah</label>
              <textarea
                className="w-full border rounded-lg p-2 min-h-[100px] text-sm"
                value={editedBlock.config.content || ''}
                onChange={(e) => updateConfig('content', e.target.value)}
                placeholder="Text nebo proměnné jako {{revize.cislo}}"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <Select
                label="Velikost písma"
                value={String(editedBlock.config.fontSize || 10)}
                onChange={(e) => updateConfig('fontSize', parseInt(e.target.value))}
                options={[
                  { value: '8', label: '8pt' },
                  { value: '9', label: '9pt' },
                  { value: '10', label: '10pt' },
                  { value: '11', label: '11pt' },
                  { value: '12', label: '12pt' },
                  { value: '14', label: '14pt' },
                  { value: '16', label: '16pt' },
                ]}
              />
              
              <Select
                label="Tučnost"
                value={editedBlock.config.fontWeight || 'normal'}
                onChange={(e) => updateConfig('fontWeight', e.target.value)}
                options={[
                  { value: 'normal', label: 'Normální' },
                  { value: 'bold', label: 'Tučné' },
                ]}
              />
              
              <Select
                label="Zarovnání"
                value={editedBlock.config.align || 'left'}
                onChange={(e) => updateConfig('align', e.target.value)}
                options={[
                  { value: 'left', label: 'Vlevo' },
                  { value: 'center', label: 'Na střed' },
                  { value: 'right', label: 'Vpravo' },
                ]}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dostupné proměnné
              </label>
              <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                {AVAILABLE_VARIABLES.map((group) => (
                  <div key={group.group} className="mb-2">
                    <div className="text-xs font-semibold text-gray-500 mb-1">{group.group}</div>
                    <div className="flex flex-wrap gap-1">
                      {group.items.map((v) => (
                        <button
                          key={v.key}
                          onClick={() => updateConfig('content', (editedBlock.config.content || '') + v.key)}
                          className="text-xs bg-white border rounded px-2 py-1 hover:bg-blue-50 hover:border-blue-300"
                          title={v.label}
                        >
                          {v.key}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {editedBlock.type === 'section' && (
          <>
            <Select
              label="Sekce"
              value={editedBlock.config.sectionId || ''}
              onChange={(e) => updateConfig('sectionId', e.target.value)}
              options={PREDEFINED_SECTIONS.map((s) => ({ value: s.id, label: s.name }))}
            />
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showTitle"
                checked={editedBlock.config.showTitle !== false}
                onChange={(e) => updateConfig('showTitle', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="showTitle" className="text-sm">Zobrazit nadpis sekce</label>
            </div>
            
            {editedBlock.config.showTitle !== false && (
              <Input
                label="Formát nadpisu"
                value={editedBlock.config.titleFormat || '{{cislo}}. {{nazev}}'}
                onChange={(e) => updateConfig('titleFormat', e.target.value)}
                placeholder="{{cislo}}. {{nazev}}"
              />
            )}
          </>
        )}

        {editedBlock.type === 'spacer' && (
          <Input
            label="Výška mezery (mm)"
            type="number"
            value={editedBlock.config.height || 10}
            onChange={(e) => updateConfig('height', parseInt(e.target.value))}
          />
        )}

        <div className="border-t pt-4">
          <Input
            label="Podmínka zobrazení (volitelné)"
            value={editedBlock.config.condition || ''}
            onChange={(e) => updateConfig('condition', e.target.value)}
            placeholder="např. revize.vysledek === 'neschopno'"
          />
          <p className="text-xs text-gray-500 mt-1">
            Blok se zobrazí pouze pokud je podmínka splněna
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>Zrušit</Button>
          <Button onClick={() => { onSave(editedBlock); onClose(); }}>Uložit</Button>
        </div>
      </div>
    </Modal>
  );
}

// Main Designer Component
export default function PDFDesignerPage() {
  const [blocks, setBlocks] = useState<DesignerBlock[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<DesignerBlock | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sablony, setSablony] = useState<Sablona[]>([]);
  const [selectedSablona, setSelectedSablona] = useState<number | null>(null);
  const [revize, setRevize] = useState<Revize | null>(null);
  const [nastaveni, setNastaveni] = useState<Nastaveni | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [history, setHistory] = useState<DesignerBlock[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sablonaList, nastaveniData] = await Promise.all([
        sablonaService.getAll(),
        nastaveniService.get(),
      ]);
      setSablony(sablonaList);
      setNastaveni(nastaveniData || null);
      
      // Load first sablona
      if (sablonaList.length > 0) {
        setSelectedSablona(sablonaList[0].id!);
        loadSablonaBlocks(sablonaList[0]);
      }
      
      // Load sample revize for preview
      const revizeList = await revizeService.getAll();
      if (revizeList.length > 0) {
        const fullRevize = await revizeService.getById(revizeList[0].id!);
        setRevize(fullRevize || null);
      }
    } catch (error) {
      console.error('Chyba při načítání dat:', error);
    }
  };

  const loadSablonaBlocks = (sablona: Sablona) => {
    // Convert sablona sekce to designer blocks
    const newBlocks: DesignerBlock[] = (sablona.sekce || []).map((s, index) => ({
      id: `section-${s.id}-${index}`,
      type: 'section' as const,
      name: s.nazev,
      enabled: s.enabled,
      expanded: false,
      config: {
        sectionId: s.id,
        showTitle: true,
        titleFormat: '{{cislo}}. {{nazev}}',
      },
    }));
    
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
  };

  const saveToHistory = (newBlocks: DesignerBlock[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newBlocks]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setBlocks([...history[historyIndex - 1]]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setBlocks([...history[historyIndex + 1]]);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      const newBlocks = arrayMove(blocks, oldIndex, newIndex);
      setBlocks(newBlocks);
      saveToHistory(newBlocks);
    }
  };

  const toggleBlock = (id: string) => {
    const newBlocks = blocks.map((b) =>
      b.id === id ? { ...b, enabled: !b.enabled } : b
    );
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
  };

  const expandBlock = (id: string) => {
    setBlocks(blocks.map((b) =>
      b.id === id ? { ...b, expanded: !b.expanded } : b
    ));
  };

  const deleteBlock = (id: string) => {
    const newBlocks = blocks.filter((b) => b.id !== id);
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
  };

  const saveBlock = (block: DesignerBlock) => {
    const newBlocks = blocks.map((b) => (b.id === block.id ? block : b));
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
  };

  const addBlock = (type: DesignerBlock['type']) => {
    const newBlock: DesignerBlock = {
      id: `${type}-${Date.now()}`,
      type,
      name: type === 'text' ? 'Nový text' 
          : type === 'spacer' ? 'Mezera'
          : type === 'pagebreak' ? 'Konec stránky'
          : type === 'section' ? 'Nová sekce'
          : 'Nový blok',
      enabled: true,
      expanded: true,
      config: type === 'spacer' ? { height: 10 } : {},
    };
    
    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
    setShowAddMenu(false);
    setEditingBlock(newBlock);
  };

  const generatePreview = useCallback(async () => {
    if (!revize) return;
    
    setPreviewLoading(true);
    try {
      // Get current sablona and update with designer blocks
      const sablona = sablony.find((s) => s.id === selectedSablona);
      if (!sablona) return;

      // Convert blocks back to sablona format
      const updatedSablona: Sablona = {
        ...sablona,
        sekce: blocks
          .filter((b) => b.type === 'section')
          .map((b, index) => ({
            id: b.config.sectionId || b.id,
            nazev: b.name,
            enabled: b.enabled,
            poradi: index + 1,
          })),
      };

      // Generuj PDF s prázdnými daty pro náhled
      const doc = await generatePDF({
        revize,
        rozvadece: [],
        okruhy: {},
        zavady: [],
        mistnosti: [],
        zarizeni: {},
        nastaveni: nastaveni,
        sablona: updatedSablona,
        pouzitePristroje: [],
        zakaznik: null,
      });
      const url = previewPDF(doc);
      
      // Cleanup old URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      setPreviewUrl(url);
    } catch (error) {
      console.error('Chyba při generování náhledu:', error);
    } finally {
      setPreviewLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, revize, selectedSablona, nastaveni]);

  // Auto-generate preview on block changes (debounced) - only when blocks change
  useEffect(() => {
    if (!revize || !selectedSablona) return;
    
    const timer = setTimeout(() => {
      generatePreview();
    }, 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  const saveSablona = async () => {
    if (!selectedSablona) return;
    
    try {
      const sablona = sablony.find((s) => s.id === selectedSablona);
      if (!sablona) return;

      const updatedSablona: Sablona = {
        ...sablona,
        sekce: blocks
          .filter((b) => b.type === 'section')
          .map((b, index) => ({
            id: b.config.sectionId || b.id,
            nazev: b.name,
            enabled: b.enabled,
            poradi: index + 1,
          })),
      };

      await sablonaService.update(selectedSablona, updatedSablona);
      alert('Šablona uložena!');
    } catch (error) {
      console.error('Chyba při ukládání:', error);
      alert('Chyba při ukládání šablony');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-4">
        <h1 className="text-lg font-semibold">PDF Designer</h1>
        
        <div className="flex items-center gap-2 ml-4">
          <Select
            value={String(selectedSablona || '')}
            onChange={(e) => {
              const id = parseInt(e.target.value);
              setSelectedSablona(id);
              const sablona = sablony.find((s) => s.id === id);
              if (sablona) loadSablonaBlocks(sablona);
            }}
            options={sablony.map((s) => ({ value: String(s.id), label: s.nazev }))}
            className="w-48"
          />
        </div>

        <div className="flex items-center gap-1 ml-4 border-l pl-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Zpět (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Vpřed (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1" />

        <Button variant="secondary" size="sm" onClick={generatePreview}>
          <Eye className="w-4 h-4 mr-1" />
          Obnovit náhled
        </Button>
        
        <Button size="sm" onClick={saveSablona}>
          <Save className="w-4 h-4 mr-1" />
          Uložit šablonu
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Block list */}
        <div className="w-80 border-r bg-gray-50 flex flex-col">
          <div className="p-3 border-b bg-white flex items-center justify-between">
            <span className="font-medium text-sm">Bloky dokumentu</span>
            <div className="relative">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowAddMenu(!showAddMenu)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Přidat
              </Button>
              
              {showAddMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 py-1 min-w-[160px]">
                  <button
                    onClick={() => addBlock('section')}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-blue-500" />
                    Sekce
                  </button>
                  <button
                    onClick={() => addBlock('text')}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Type className="w-4 h-4 text-green-500" />
                    Text
                  </button>
                  <button
                    onClick={() => addBlock('spacer')}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <div className="w-4 h-4 border-t-2 border-dashed border-gray-400 mt-2" />
                    Mezera
                  </button>
                  <button
                    onClick={() => addBlock('pagebreak')}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <div className="w-4 h-4 border-t-2 border-red-400 mt-2" />
                    Konec stránky
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    onToggle={toggleBlock}
                    onEdit={setEditingBlock}
                    onDelete={deleteBlock}
                    onExpand={expandBlock}
                  />
                ))}
              </SortableContext>
              
              <DragOverlay>
                {activeId ? (
                  <div className="bg-white border rounded-lg shadow-lg p-2 opacity-80">
                    {blocks.find((b) => b.id === activeId)?.name}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {blocks.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Žádné bloky</p>
                <p className="text-xs">Klikněte na "Přidat" pro vytvoření</p>
              </div>
            )}
          </div>
        </div>

        {/* Right panel - Preview */}
        <div className="flex-1 bg-gray-200 p-4 overflow-auto">
          <div className="max-w-4xl mx-auto">
            {previewLoading && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-gray-600">Generuji náhled...</p>
              </div>
            )}
            
            {previewUrl && !previewLoading && (
              <iframe
                src={previewUrl}
                className="w-full bg-white shadow-lg rounded"
                style={{ height: 'calc(100vh - 150px)', minHeight: '600px' }}
                title="PDF Preview"
              />
            )}
            
            {!previewUrl && !previewLoading && (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Eye className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">
                  {revize 
                    ? 'Klikněte na "Obnovit náhled" pro zobrazení'
                    : 'Pro náhled je potřeba mít alespoň jednu revizi'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Block Editor Modal */}
      <BlockEditorModal
        block={editingBlock}
        onSave={saveBlock}
        onClose={() => setEditingBlock(null)}
      />
    </div>
  );
}
