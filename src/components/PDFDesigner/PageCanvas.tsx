// Page Canvas - plátno stránky s header/content/footer zónami
import React, { useRef, useCallback } from 'react';
import Draggable, { type DraggableData, type DraggableEvent } from 'react-draggable';
import { Resizable, type ResizeCallbackData } from 'react-resizable';
import type { Widget, PageTemplate } from './types';
import type { Revize, Nastaveni } from '../../types';
import { renderWidgetContent } from './WidgetRenderer';
import { PAGE_SIZES } from './constants';
import { LockIcon } from './icons';

// Barvy pro zóny
const ZONE_COLORS = {
  header: { bg: 'rgba(59, 130, 246, 0.05)', border: 'rgba(59, 130, 246, 0.3)' },
  content: { bg: 'transparent', border: 'transparent' },
  footer: { bg: 'rgba(16, 185, 129, 0.05)', border: 'rgba(16, 185, 129, 0.3)' },
};

interface SingleWidgetProps {
  widget: Widget;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<Widget>) => void;
  onToggleLock: (id: string) => void;
  snapToGrid: boolean;
  gridSize: number;
  scale: number;
  revize: Revize | null;
  nastaveni: Nastaveni | null;
  currentPage: number;
  totalPages: number;
}

// Jednotlivý widget na plátně
function CanvasWidget({
  widget,
  isSelected,
  onSelect,
  onUpdate,
  onToggleLock,
  snapToGrid,
  gridSize,
  scale,
  revize,
  nastaveni,
  currentPage,
  totalPages,
}: SingleWidgetProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleDrag = useCallback((_e: DraggableEvent, data: DraggableData) => {
    let x = data.x;
    let y = data.y;
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }
    onUpdate(widget.id, { x, y });
  }, [widget.id, onUpdate, snapToGrid, gridSize]);

  const handleResize = useCallback(
    (_e: React.SyntheticEvent, { size }: ResizeCallbackData) => {
      let w = size.width;
      let h = size.height;
      if (snapToGrid) {
        w = Math.round(w / gridSize) * gridSize;
        h = Math.round(h / gridSize) * gridSize;
      }
      onUpdate(widget.id, { width: w, height: h });
    },
    [widget.id, onUpdate, snapToGrid, gridSize]
  );

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  }, [onSelect]);

  const handleLockClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleLock(widget.id);
  }, [widget.id, onToggleLock]);

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: widget.x, y: widget.y }}
      onDrag={handleDrag}
      disabled={widget.locked}
      scale={scale}
      bounds="parent"
    >
      <div ref={nodeRef} style={{ position: 'absolute', zIndex: widget.zIndex }}>
        <Resizable
          width={widget.width}
          height={widget.height}
          onResize={handleResize}
          resizeHandles={widget.locked ? [] : ['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's']}
          minConstraints={[30, 20]}
        >
          <div
            onClick={handleClick}
            style={{
              width: widget.width,
              height: widget.height,
              cursor: widget.locked ? 'default' : 'move',
              outline: isSelected ? '2px solid #3b82f6' : '1px dashed #d1d5db',
              outlineOffset: '-1px',
              position: 'relative',
              backgroundColor: widget.locked ? 'rgba(0,0,0,0.02)' : 'transparent',
            }}
          >
            {/* Lock indikátor */}
            {widget.locked && (
              <div
                onClick={handleLockClick}
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  width: 16,
                  height: 16,
                  backgroundColor: '#fbbf24',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                }}
                title="Odemknout widget"
              >
                <LockIcon size={10} />
              </div>
            )}
            
            {/* Obsah widgetu */}
            {renderWidgetContent({
              widget,
              revize,
              nastaveni,
              currentPage,
              totalPages,
            })}
            
            {/* Selection handles - pouze pokud je vybraný a není uzamčený */}
            {isSelected && !widget.locked && (
              <>
                <div style={{ position: 'absolute', top: -4, left: -4, width: 8, height: 8, backgroundColor: '#3b82f6', borderRadius: 2 }} />
                <div style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, backgroundColor: '#3b82f6', borderRadius: 2 }} />
                <div style={{ position: 'absolute', bottom: -4, left: -4, width: 8, height: 8, backgroundColor: '#3b82f6', borderRadius: 2 }} />
                <div style={{ position: 'absolute', bottom: -4, right: -4, width: 8, height: 8, backgroundColor: '#3b82f6', borderRadius: 2 }} />
              </>
            )}
          </div>
        </Resizable>
      </div>
    </Draggable>
  );
}

interface PageCanvasProps {
  page: PageTemplate;
  pageIndex: number;
  totalPages: number;
  widgets: Widget[];
  selectedWidgetIds: string[];
  onSelectWidget: (id: string | null, multi?: boolean) => void;
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void;
  onToggleLockWidget: (id: string) => void;
  onDeselectAll: () => void;
  snapToGrid: boolean;
  gridSize: number;
  showGrid: boolean;
  showZones: boolean;
  scale: number;
  revize: Revize | null;
  nastaveni: Nastaveni | null;
  headerHeight: number;
  footerHeight: number;
}

export function PageCanvas({
  page,
  pageIndex,
  totalPages,
  widgets,
  selectedWidgetIds,
  onSelectWidget,
  onUpdateWidget,
  onToggleLockWidget,
  onDeselectAll,
  snapToGrid,
  gridSize,
  showGrid,
  showZones,
  scale,
  revize,
  nastaveni,
  headerHeight,
  footerHeight,
}: PageCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Velikost stránky v mm převedená na px (přibližně 1mm = 3.78px při 96dpi)
  const pageSize = PAGE_SIZES[page.size];
  const pxPerMm = 3.78;
  const pageWidth = pageSize.width * pxPerMm;
  const pageHeight = pageSize.height * pxPerMm;
  
  // Zóny - headerHeight/footerHeight jsou v mm, převedeme na px
  const headerZoneHeight = headerHeight * pxPerMm;
  const footerZoneHeight = footerHeight * pxPerMm;
  const contentZoneTop = headerZoneHeight;

  // Widgety podle zón
  const headerWidgets = widgets.filter(w => w.zone === 'header');
  const contentWidgets = widgets.filter(w => w.zone === 'content');
  const footerWidgets = widgets.filter(w => w.zone === 'footer');

  // Kliknutí na prázdné místo => deselect
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.zone) {
      onDeselectAll();
    }
  }, [onDeselectAll]);

  // Render widgetů pro zónu
  const renderZoneWidgets = (zoneWidgets: Widget[], zoneTop: number) => {
    return zoneWidgets.map(widget => (
      <CanvasWidget
        key={widget.id}
        widget={{ ...widget, y: widget.y + zoneTop }}
        isSelected={selectedWidgetIds.includes(widget.id)}
        onSelect={() => onSelectWidget(widget.id)}
        onUpdate={(id, updates) => {
          // Přepočítat Y zpět vzhledem k zóně
          if (updates.y !== undefined) {
            updates.y = updates.y - zoneTop;
          }
          onUpdateWidget(id, updates);
        }}
        onToggleLock={onToggleLockWidget}
        snapToGrid={snapToGrid}
        gridSize={gridSize}
        scale={scale}
        revize={revize}
        nastaveni={nastaveni}
        currentPage={pageIndex + 1}
        totalPages={totalPages}
      />
    ));
  };

  return (
    <div
      style={{
        marginBottom: 20,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      {/* Číslo stránky */}
      <div
        style={{
          backgroundColor: '#374151',
          color: '#fff',
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        Strana {pageIndex + 1} / {totalPages}
        {page.name && ` - ${page.name}`}
      </div>
      
      {/* Plátno stránky */}
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          position: 'relative',
          width: pageWidth,
          height: pageHeight,
          backgroundColor: '#fff',
          backgroundImage: showGrid
            ? `linear-gradient(to right, #f0f0f0 1px, transparent 1px),
               linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)`
            : undefined,
          backgroundSize: showGrid ? `${gridSize}px ${gridSize}px` : undefined,
          overflow: 'hidden',
        }}
      >
        {/* Header zóna */}
        {showZones && headerZoneHeight > 0 && (
          <div
            data-zone="header"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: headerZoneHeight,
              backgroundColor: ZONE_COLORS.header.bg,
              borderBottom: `1px dashed ${ZONE_COLORS.header.border}`,
              pointerEvents: 'none',
            }}
          >
            <span style={{
              position: 'absolute',
              top: 4,
              left: 4,
              fontSize: 10,
              color: '#3b82f6',
              opacity: 0.7,
            }}>
              ZÁHLAVÍ
            </span>
          </div>
        )}
        
        {/* Footer zóna */}
        {showZones && footerZoneHeight > 0 && (
          <div
            data-zone="footer"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: footerZoneHeight,
              backgroundColor: ZONE_COLORS.footer.bg,
              borderTop: `1px dashed ${ZONE_COLORS.footer.border}`,
              pointerEvents: 'none',
            }}
          >
            <span style={{
              position: 'absolute',
              bottom: 4,
              left: 4,
              fontSize: 10,
              color: '#10b981',
              opacity: 0.7,
            }}>
              ZÁPATÍ
            </span>
          </div>
        )}
        
        {/* Header widgety */}
        {renderZoneWidgets(headerWidgets, 0)}
        
        {/* Content widgety */}
        {renderZoneWidgets(contentWidgets, contentZoneTop)}
        
        {/* Footer widgety */}
        {renderZoneWidgets(footerWidgets, pageHeight - footerZoneHeight)}
      </div>
    </div>
  );
}

export default PageCanvas;
