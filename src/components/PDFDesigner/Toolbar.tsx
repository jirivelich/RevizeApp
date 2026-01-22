// Toolbar - panel nástrojů pro přidávání widgetů a akce
import React from 'react';
import type { WidgetType, PageZone } from './types';
import { WIDGET_TYPES } from './constants';
import {
  TextIcon,
  VariableIcon,
  TableIcon,
  ImageIcon,
  LineIcon,
  BoxIcon,
  PageNumberIcon,
  DateIcon,
  QRCodeIcon,
  SignatureIcon,
  RepeatIcon,
  PageBreakIcon,
  UndoIcon,
  RedoIcon,
  AlignLeftIcon,
  AlignCenterHIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignCenterVIcon,
  AlignBottomIcon,
  DistributeHIcon,
  DistributeVIcon,
  GroupIcon,
  UngroupIcon,
  LockIcon,
  UnlockIcon,
  LayerUpIcon,
  LayerDownIcon,
  LayerTopIcon,
  LayerBottomIcon,
  CopyIcon,
  DeleteIcon,
  GridIcon,
  ZoomInIcon,
  ZoomOutIcon,
  HeaderIcon,
  FooterIcon,
} from './icons';

interface ToolbarProps {
  onAddWidget: (type: WidgetType, zone?: PageZone) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onAlign: (alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => void;
  onDistribute: (direction: 'horizontal' | 'vertical') => void;
  onGroup: () => void;
  onUngroup: () => void;
  onLockSelected: () => void;
  onUnlockSelected: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleGrid: () => void;
  showGrid: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  scale: number;
  onAddPage: () => void;
  selectedCount: number;
  hasGroupSelection?: boolean;
  activeZone: PageZone;
  onSetActiveZone: (zone: PageZone) => void;
}

// Ikona podle typu widgetu
const getWidgetIcon = (type: WidgetType) => {
  const icons: Record<WidgetType, React.ReactNode> = {
    'text': <TextIcon />,
    'variable': <VariableIcon />,
    'table': <TableIcon />,
    'repeater': <RepeatIcon />,
    'image': <ImageIcon />,
    'line': <LineIcon />,
    'box': <BoxIcon />,
    'page-number': <PageNumberIcon />,
    'date': <DateIcon />,
    'qr-code': <QRCodeIcon />,
    'signature': <SignatureIcon />,
    'page-break': <PageBreakIcon />,
    'group': <GroupIcon />,
  };
  return icons[type] || <BoxIcon />;
};

interface ToolButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolButton({ onClick, disabled, active, title, children }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-2 rounded transition-colors
        ${active ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-gray-200 mx-1" />;
}

export function Toolbar({
  onAddWidget,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAlign,
  onDistribute,
  onGroup,
  onUngroup,
  onLockSelected,
  onUnlockSelected,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onDuplicate,
  onDelete,
  onToggleGrid,
  showGrid,
  onZoomIn,
  onZoomOut,
  scale,
  onAddPage: _onAddPage,
  selectedCount,
  hasGroupSelection,
  activeZone,
  onSetActiveZone,
}: ToolbarProps) {
  const hasSelection = selectedCount > 0;
  const hasMultiSelection = selectedCount > 1;

  return (
    <div className="bg-white border-b border-gray-200 px-2 py-1">
      {/* První řádek - widgety a základní akce */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* Přidat widgety */}
        <div className="flex items-center gap-0.5 bg-gray-50 rounded p-1">
          {WIDGET_TYPES.map(type => (
            <ToolButton
              key={type.type}
              onClick={() => onAddWidget(type.type, activeZone)}
              title={`Přidat: ${type.label}`}
            >
              {getWidgetIcon(type.type)}
            </ToolButton>
          ))}
        </div>

        <Divider />

        {/* Undo/Redo */}
        <ToolButton onClick={onUndo} disabled={!canUndo} title="Zpět (Ctrl+Z)">
          <UndoIcon />
        </ToolButton>
        <ToolButton onClick={onRedo} disabled={!canRedo} title="Vpřed (Ctrl+Y)">
          <RedoIcon />
        </ToolButton>

        <Divider />

        {/* Zarovnání */}
        <div className="flex items-center gap-0.5">
          <ToolButton onClick={() => onAlign('left')} disabled={!hasSelection} title="Zarovnat vlevo">
            <AlignLeftIcon />
          </ToolButton>
          <ToolButton onClick={() => onAlign('center-h')} disabled={!hasSelection} title="Zarovnat na střed horizontálně">
            <AlignCenterHIcon />
          </ToolButton>
          <ToolButton onClick={() => onAlign('right')} disabled={!hasSelection} title="Zarovnat vpravo">
            <AlignRightIcon />
          </ToolButton>
          <ToolButton onClick={() => onAlign('top')} disabled={!hasSelection} title="Zarovnat nahoru">
            <AlignTopIcon />
          </ToolButton>
          <ToolButton onClick={() => onAlign('center-v')} disabled={!hasSelection} title="Zarovnat na střed vertikálně">
            <AlignCenterVIcon />
          </ToolButton>
          <ToolButton onClick={() => onAlign('bottom')} disabled={!hasSelection} title="Zarovnat dolů">
            <AlignBottomIcon />
          </ToolButton>
        </div>

        <Divider />

        {/* Distribuce */}
        <ToolButton onClick={() => onDistribute('horizontal')} disabled={!hasMultiSelection} title="Rozložit horizontálně">
          <DistributeHIcon />
        </ToolButton>
        <ToolButton onClick={() => onDistribute('vertical')} disabled={!hasMultiSelection} title="Rozložit vertikálně">
          <DistributeVIcon />
        </ToolButton>

        <Divider />

        {/* Vrstvy */}
        <ToolButton onClick={onBringToFront} disabled={!hasSelection} title="Do popředí">
          <LayerTopIcon />
        </ToolButton>
        <ToolButton onClick={onBringForward} disabled={!hasSelection} title="O vrstvu výš">
          <LayerUpIcon />
        </ToolButton>
        <ToolButton onClick={onSendBackward} disabled={!hasSelection} title="O vrstvu níž">
          <LayerDownIcon />
        </ToolButton>
        <ToolButton onClick={onSendToBack} disabled={!hasSelection} title="Do pozadí">
          <LayerBottomIcon />
        </ToolButton>

        <Divider />

        {/* Seskupení a zámek */}
        <ToolButton onClick={onGroup} disabled={!hasMultiSelection} title="Seskupit">
          <GroupIcon />
        </ToolButton>
        <ToolButton onClick={onUngroup} disabled={!hasGroupSelection} title="Rozdělit skupinu">
          <UngroupIcon />
        </ToolButton>
        <ToolButton onClick={onLockSelected} disabled={!hasSelection} title="Zamknout">
          <LockIcon />
        </ToolButton>
        <ToolButton onClick={onUnlockSelected} disabled={!hasSelection} title="Odemknout">
          <UnlockIcon />
        </ToolButton>

        <Divider />

        {/* Kopírovat a smazat */}
        <ToolButton onClick={onDuplicate} disabled={!hasSelection} title="Duplikovat (Ctrl+D)">
          <CopyIcon />
        </ToolButton>
        <ToolButton onClick={onDelete} disabled={!hasSelection} title="Smazat (Delete)">
          <DeleteIcon />
        </ToolButton>

        <Divider />

        {/* Mřížka a zoom */}
        <ToolButton onClick={onToggleGrid} active={showGrid} title="Zobrazit mřížku">
          <GridIcon />
        </ToolButton>
        <ToolButton onClick={onZoomOut} disabled={scale <= 0.5} title="Oddálit">
          <ZoomOutIcon />
        </ToolButton>
        <span className="text-xs text-gray-600 w-12 text-center">{Math.round(scale * 100)}%</span>
        <ToolButton onClick={onZoomIn} disabled={scale >= 2} title="Přiblížit">
          <ZoomInIcon />
        </ToolButton>

      </div>

      {/* Druhý řádek - zóny */}
      <div className="flex items-center gap-2 mt-1 pt-1 border-t border-gray-100">
        <span className="text-xs text-gray-500">Vložit do zóny:</span>
        <button
          onClick={() => onSetActiveZone('header')}
          className={`
            flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors
            ${activeZone === 'header' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
          `}
        >
          <HeaderIcon size={14} />
          Záhlaví
        </button>
        <button
          onClick={() => onSetActiveZone('content')}
          className={`
            flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors
            ${activeZone === 'content' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
          `}
        >
          <BoxIcon size={14} />
          Obsah
        </button>
        <button
          onClick={() => onSetActiveZone('footer')}
          className={`
            flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors
            ${activeZone === 'footer' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
          `}
        >
          <FooterIcon size={14} />
          Zápatí
        </button>
        
        {activeZone !== 'content' && (
          <span className="text-xs text-gray-400 ml-2">
            (widgety v {activeZone === 'header' ? 'záhlaví' : 'zápatí'} se opakují na všech stránkách)
          </span>
        )}
      </div>
    </div>
  );
}

export default Toolbar;
