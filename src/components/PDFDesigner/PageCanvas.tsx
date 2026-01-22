// Page Canvas - plátno stránky s header/content/footer zónami
import React, { useRef, useCallback, useState, useEffect } from 'react';
import Draggable, { type DraggableData, type DraggableEvent } from 'react-draggable';
import type { Widget, PageTemplate } from './types';
import type { Revize, Nastaveni } from '../../types';
import type { PDFRenderData } from './pdfVariables';
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
  isInGroup: boolean;
  groupColor?: string;
  onSelect: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onUpdate: (id: string, updates: Partial<Widget>) => void;
  onMultiDrag: (deltaX: number, deltaY: number) => void;
  onToggleLock: (id: string) => void;
  snapToGrid: boolean;
  gridSize: number;
  scale: number;
  revize: Revize | null;
  nastaveni: Nastaveni | null;
  currentPage: number;
  totalPages: number;
  pdfData?: PDFRenderData;
  isMultiSelected: boolean;
}

// Jednotlivý widget na plátně
function CanvasWidget({
  widget,
  isSelected,
  isInGroup,
  groupColor,
  onSelect,
  onDoubleClick,
  onUpdate,
  onMultiDrag,
  onToggleLock,
  snapToGrid,
  gridSize,
  scale,
  revize,
  nastaveni,
  currentPage,
  totalPages,
  pdfData,
  isMultiSelected,
}: SingleWidgetProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number; widgetX: number; widgetY: number } | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = useCallback((_e: DraggableEvent, data: DraggableData) => {
    dragStartPos.current = { x: data.x, y: data.y };
  }, []);

  const handleDrag = useCallback((_e: DraggableEvent, data: DraggableData) => {
    if (isResizing || !dragStartPos.current) return;
    
    let x = data.x;
    let y = data.y;
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }
    
    // Při multi-výběru/skupině posunout všechny relevantní widgety
    if (isMultiSelected) {
      const deltaX = x - dragStartPos.current.x;
      const deltaY = y - dragStartPos.current.y;
      // Aktualizovat start pozici pro kontinuální drag
      dragStartPos.current = { x, y };
      if (deltaX !== 0 || deltaY !== 0) {
        onMultiDrag(deltaX, deltaY);
      }
      // Také aktualizovat tažený widget přímo (jeho pozice je absolutní z data)
      onUpdate(widget.id, { x, y });
    } else {
      onUpdate(widget.id, { x, y });
    }
  }, [widget.id, onUpdate, onMultiDrag, snapToGrid, gridSize, isResizing, isMultiSelected]);

  const handleDragStop = useCallback(() => {
    dragStartPos.current = null;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(e);
  }, [onSelect]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick();
  }, [onDoubleClick]);

  const handleLockClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleLock(widget.id);
  }, [widget.id, onToggleLock]);

  // Vlastní resize logika
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeHandle(handle);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: widget.width,
      height: widget.height,
      widgetX: widget.x,
      widgetY: widget.y,
    };
  }, [widget.width, widget.height, widget.x, widget.y]);

  useEffect(() => {
    if (!isResizing || !resizeHandle) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current) return;
      
      const deltaX = (e.clientX - resizeStartRef.current.x) / scale;
      const deltaY = (e.clientY - resizeStartRef.current.y) / scale;
      
      let newWidth = resizeStartRef.current.width;
      let newHeight = resizeStartRef.current.height;
      let newX = resizeStartRef.current.widgetX;
      let newY = resizeStartRef.current.widgetY;
      
      // Výpočet nových rozměrů podle handle
      if (resizeHandle.includes('e')) {
        newWidth = Math.max(30, resizeStartRef.current.width + deltaX);
      }
      if (resizeHandle.includes('w')) {
        const widthChange = Math.min(deltaX, resizeStartRef.current.width - 30);
        newWidth = resizeStartRef.current.width - widthChange;
        newX = resizeStartRef.current.widgetX + widthChange;
      }
      if (resizeHandle.includes('s')) {
        newHeight = Math.max(20, resizeStartRef.current.height + deltaY);
      }
      if (resizeHandle.includes('n')) {
        const heightChange = Math.min(deltaY, resizeStartRef.current.height - 20);
        newHeight = resizeStartRef.current.height - heightChange;
        newY = resizeStartRef.current.widgetY + heightChange;
      }
      
      // Snap to grid
      if (snapToGrid) {
        newWidth = Math.round(newWidth / gridSize) * gridSize;
        newHeight = Math.round(newHeight / gridSize) * gridSize;
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }
      
      onUpdate(widget.id, { width: newWidth, height: newHeight, x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
      resizeStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeHandle, scale, snapToGrid, gridSize, widget.id, onUpdate]);

  // Resize handle komponenta
  const ResizeHandle = ({ position }: { position: string }) => {
    const positionStyles: Record<string, React.CSSProperties> = {
      'nw': { top: -6, left: -6, cursor: 'nw-resize' },
      'ne': { top: -6, right: -6, cursor: 'ne-resize' },
      'sw': { bottom: -6, left: -6, cursor: 'sw-resize' },
      'se': { bottom: -6, right: -6, cursor: 'se-resize' },
      'n': { top: -6, left: '50%', marginLeft: -6, cursor: 'n-resize' },
      's': { bottom: -6, left: '50%', marginLeft: -6, cursor: 's-resize' },
      'e': { right: -6, top: '50%', marginTop: -6, cursor: 'e-resize' },
      'w': { left: -6, top: '50%', marginTop: -6, cursor: 'w-resize' },
    };

    return (
      <div
        onMouseDown={(e) => handleResizeStart(e, position)}
        style={{
          position: 'absolute',
          width: 12,
          height: 12,
          background: '#3b82f6',
          border: '2px solid white',
          borderRadius: 2,
          zIndex: 1000,
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          ...positionStyles[position],
        }}
      />
    );
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: widget.x, y: widget.y }}
      onStart={handleDragStart}
      onDrag={handleDrag}
      onStop={handleDragStop}
      disabled={widget.locked || isResizing}
      scale={scale}
      bounds="parent"
    >
      <div 
        ref={nodeRef} 
        style={{ position: 'absolute', zIndex: widget.zIndex }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <div
          style={{
            width: widget.width,
            height: widget.height,
            cursor: widget.locked ? 'default' : isResizing ? 'default' : 'move',
            outline: isSelected ? '2px solid #3b82f6' : isInGroup ? `2px solid ${groupColor || '#8b5cf6'}` : '1px dashed #d1d5db',
            outlineOffset: '-1px',
            position: 'relative',
            backgroundColor: widget.locked ? 'rgba(0,0,0,0.02)' : 'transparent',
          }}
        >
          {/* Group indikátor */}
          {isInGroup && !isSelected && (
            <div
              style={{
                position: 'absolute',
                top: -10,
                left: 4,
                backgroundColor: groupColor || '#8b5cf6',
                color: 'white',
                fontSize: 8,
                padding: '1px 4px',
                borderRadius: 2,
                zIndex: 10,
              }}
              title="Součást skupiny"
            >
              ⛓
            </div>
          )}
          
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
            pdfData,
          })}
          
          {/* Resize handles - pouze pokud je vybraný a není uzamčený */}
          {isSelected && !widget.locked && (
            <>
              <ResizeHandle position="nw" />
              <ResizeHandle position="ne" />
              <ResizeHandle position="sw" />
              <ResizeHandle position="se" />
              <ResizeHandle position="n" />
              <ResizeHandle position="s" />
              <ResizeHandle position="e" />
              <ResizeHandle position="w" />
            </>
          )}
        </div>
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
  onEditWidget: (widget: Widget) => void;
  snapToGrid: boolean;
  gridSize: number;
  showGrid: boolean;
  showZones: boolean;
  scale: number;
  revize: Revize | null;
  nastaveni: Nastaveni | null;
  headerHeight: number;
  footerHeight: number;
  pdfData?: PDFRenderData;
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
  onEditWidget,
  snapToGrid,
  gridSize,
  showGrid,
  showZones,
  scale,
  revize,
  nastaveni,
  headerHeight,
  footerHeight,
  pdfData,
}: PageCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Velikost stránky v mm převedená na px (přibližně 1mm = 3.78px při 96dpi)
  const pageSize = PAGE_SIZES[page.size];
  const pxPerMm = 3.78;
  const pageWidth = pageSize.width * pxPerMm;
  const basePageHeight = pageSize.height * pxPerMm;
  
  // Zóny - headerHeight/footerHeight jsou v mm, převedeme na px
  const headerZoneHeight = headerHeight * pxPerMm;
  const footerZoneHeight = footerHeight * pxPerMm;
  const contentZoneTop = headerZoneHeight;
  
  // Dynamická výška canvasu - podle nejnižšího widgetu + nějaký buffer
  // Minimálně jedna A4 stránka
  const contentWidgetsAll = widgets.filter(w => w.zone === 'content');
  const maxWidgetBottom = contentWidgetsAll.reduce((max, w) => {
    return Math.max(max, w.y + w.height);
  }, 0);
  const minContentHeight = basePageHeight - headerZoneHeight - footerZoneHeight;
  const dynamicContentHeight = Math.max(maxWidgetBottom + 200, minContentHeight); // +200px buffer
  const pageHeight = headerZoneHeight + dynamicContentHeight + footerZoneHeight;
  
  // Počet virtuálních stránek
  const virtualPageCount = Math.ceil(pageHeight / basePageHeight);

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
  
  // Handler pro výběr widgetu s podporou Ctrl+klik
  const handleWidgetSelect = useCallback((widgetId: string, e: React.MouseEvent) => {
    const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
    onSelectWidget(widgetId, isMulti);
  }, [onSelectWidget]);
  
  // Handler pro hromadné přesouvání vybraných widgetů
  const handleMultiDrag = useCallback((deltaX: number, deltaY: number, _draggedWidgetId?: string) => {
    // Posunout všechny vybrané widgety o delta
    selectedWidgetIds.forEach(id => {
      const widget = widgets.find(w => w.id === id);
      if (widget && !widget.locked) {
        onUpdateWidget(id, {
          x: widget.x + deltaX,
          y: widget.y + deltaY
        });
      }
    });
  }, [selectedWidgetIds, widgets, onUpdateWidget]);

  // Render widgetů pro zónu
  const renderZoneWidgets = (zoneWidgets: Widget[], zoneTop: number) => {
    return zoneWidgets.map(widget => (
      <CanvasWidget
        key={widget.id}
        widget={{ ...widget, y: widget.y + zoneTop }}
        isSelected={selectedWidgetIds.includes(widget.id)}
        isInGroup={widget.type === 'group'}
        groupColor={widget.type === 'group' ? '#8b5cf6' : undefined}
        isMultiSelected={selectedWidgetIds.length > 1 && selectedWidgetIds.includes(widget.id)}
        onSelect={(e) => handleWidgetSelect(widget.id, e)}
        onDoubleClick={() => {
          // Otevřít editor stylů widgetu
          onEditWidget(widget);
        }}
        onUpdate={(id, updates) => {
          // Přepočítat Y zpět vzhledem k zóně
          if (updates.y !== undefined) {
            updates.y = updates.y - zoneTop;
          }
          onUpdateWidget(id, updates);
        }}
        onMultiDrag={(deltaX, deltaY) => {
          // Přepočítat Y delta pro zónu (delta zůstává stejná)
          handleMultiDrag(deltaX, deltaY, widget.id);
        }}
        onToggleLock={onToggleLockWidget}
        snapToGrid={snapToGrid}
        gridSize={gridSize}
        scale={scale}
        revize={revize}
        nastaveni={nastaveni}
        currentPage={pageIndex + 1}
        totalPages={totalPages}
        pdfData={pdfData}
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
        {/* Header zóna - první stránka */}
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
        
        {/* Header zóny na dalších virtuálních stránkách */}
        {showZones && headerZoneHeight > 0 && Array.from({ length: virtualPageCount - 1 }).map((_, i) => (
          <div
            key={`header-zone-${i}`}
            data-zone="header"
            style={{
              position: 'absolute',
              top: (i + 1) * basePageHeight,
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
              ZÁHLAVÍ (strana {i + 2})
            </span>
          </div>
        ))}
        
        {/* Footer zóna - první stránka */}
        {showZones && footerZoneHeight > 0 && (
          <div
            data-zone="footer"
            style={{
              position: 'absolute',
              top: basePageHeight - footerZoneHeight,
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
        
        {/* Footer zóny na dalších virtuálních stránkách */}
        {showZones && footerZoneHeight > 0 && Array.from({ length: virtualPageCount - 1 }).map((_, i) => (
          <div
            key={`footer-zone-${i}`}
            data-zone="footer"
            style={{
              position: 'absolute',
              top: (i + 2) * basePageHeight - footerZoneHeight,
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
              ZÁPATÍ (strana {i + 2})
            </span>
          </div>
        ))}
        
        {/* Indikátory zalomení stránek - přerušované čáry kde budou fyzické stránky */}
        {Array.from({ length: Math.ceil(pageHeight / basePageHeight) - 1 }).map((_, i) => {
          const lineY = (i + 1) * basePageHeight;
          return (
            <div
              key={`page-break-${i}`}
              style={{
                position: 'absolute',
                top: lineY,
                left: 0,
                right: 0,
                height: 0,
                borderTop: '2px dashed #f59e0b',
                pointerEvents: 'none',
                zIndex: 100,
              }}
            >
              <span style={{
                position: 'absolute',
                top: 2,
                right: 8,
                fontSize: 10,
                color: '#f59e0b',
                backgroundColor: 'rgba(255,255,255,0.9)',
                padding: '1px 4px',
                borderRadius: 2,
              }}>
                ✂️ Strana {i + 2}
              </span>
            </div>
          );
        })}
        
        {/* Header widgety - první stránka */}
        {renderZoneWidgets(headerWidgets, 0)}
        
        {/* Header widgety - opakování na dalších virtuálních stránkách (jen náhled, needitovatelné) */}
        {Array.from({ length: Math.ceil(pageHeight / basePageHeight) - 1 }).map((_, i) => {
          const pageStartY = (i + 1) * basePageHeight;
          return headerWidgets.map(widget => (
            <div
              key={`header-preview-${i}-${widget.id}`}
              style={{
                position: 'absolute',
                left: widget.x,
                top: pageStartY + widget.y,
                width: widget.width,
                height: widget.height,
                opacity: 0.5,
                pointerEvents: 'none',
                backgroundColor: '#e0f2fe',
                border: '1px dashed #60a5fa',
                borderRadius: 2,
                padding: 4,
                fontSize: 10,
                color: '#3b82f6',
                overflow: 'hidden',
              }}
            >
              {widget.content?.substring(0, 30) || widget.name}
            </div>
          ));
        })}
        
        {/* Content widgety */}
        {renderZoneWidgets(contentWidgets, contentZoneTop)}
        
        {/* Footer widgety - první stránka */}
        {renderZoneWidgets(footerWidgets, basePageHeight - footerZoneHeight)}
        
        {/* Footer widgety - opakování na dalších virtuálních stránkách (jen náhled, needitovatelné) */}
        {Array.from({ length: Math.ceil(pageHeight / basePageHeight) - 1 }).map((_, i) => {
          const pageEndY = (i + 2) * basePageHeight;
          return footerWidgets.map(widget => (
            <div
              key={`footer-preview-${i}-${widget.id}`}
              style={{
                position: 'absolute',
                left: widget.x,
                top: pageEndY - footerZoneHeight + widget.y,
                width: widget.width,
                height: widget.height,
                opacity: 0.5,
                pointerEvents: 'none',
                backgroundColor: '#dcfce7',
                border: '1px dashed #4ade80',
                borderRadius: 2,
                padding: 4,
                fontSize: 10,
                color: '#22c55e',
                overflow: 'hidden',
              }}
            >
              {widget.content?.substring(0, 30) || widget.name}
            </div>
          ));
        })}
      </div>
    </div>
  );
}
export default PageCanvas;
