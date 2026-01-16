// Draggable Widget komponenta
import { useRef } from 'react';
import Draggable from 'react-draggable';
import type { DraggableData, DraggableEvent } from 'react-draggable';
import { Resizable } from 'react-resizable';
import type { ResizeCallbackData } from 'react-resizable';
import 'react-resizable/css/styles.css';
import type { Widget } from './types';
import { IconCopy, IconSettings, IconTrash, IconLock, IconUnlock } from './icons';

interface DraggableWidgetProps {
  widget: Widget;
  zoom: number;
  scaledWidth: number;
  scaledHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (id: string, e: DraggableEvent, data: DraggableData) => void;
  onResize: (id: string, e: React.SyntheticEvent, data: ResizeCallbackData) => void;
  onDuplicate: (widget: Widget) => void;
  onEdit: (widget: Widget) => void;
  onDelete: (id: string) => void;
  onToggleLock: (id: string) => void;
  renderContent: (widget: Widget) => React.ReactNode;
  snapToGrid: boolean;
  gridSize: number;
}

export function DraggableWidget({
  widget,
  zoom,
  scaledWidth,
  scaledHeight,
  isSelected,
  onSelect,
  onDrag,
  onResize,
  onDuplicate,
  onEdit,
  onDelete,
  onToggleLock,
  renderContent,
  snapToGrid,
  gridSize,
}: DraggableWidgetProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  const grid: [number, number] | undefined = snapToGrid 
    ? [gridSize * zoom, gridSize * zoom] 
    : undefined;

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: widget.x * zoom, y: widget.y * zoom }}
      onStop={(e, data) => {
        if (widget.locked) return;
        onDrag(widget.id, e, { ...data, x: data.x / zoom, y: data.y / zoom });
      }}
      handle=".drag-handle"
      bounds="parent"
      disabled={widget.locked}
      grid={grid}
    >
      <div ref={nodeRef} style={{ position: 'absolute', zIndex: isSelected ? 100 : 10 }}>
        <Resizable
          width={widget.width * zoom}
          height={widget.height * zoom}
          onResize={(e, data) => {
            if (widget.locked) return;
            onResize(widget.id, e, { 
              ...data, 
              size: { 
                width: snapToGrid 
                  ? Math.round(data.size.width / zoom / gridSize) * gridSize
                  : data.size.width / zoom, 
                height: snapToGrid
                  ? Math.round(data.size.height / zoom / gridSize) * gridSize
                  : data.size.height / zoom 
              } 
            });
          }}
          minConstraints={[40 * zoom, 15 * zoom]}
          maxConstraints={[
            scaledWidth - widget.x * zoom, 
            scaledHeight - widget.y * zoom
          ]}
          resizeHandles={widget.locked ? [] : ['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's']}
        >
          <div
            className={`group ${isSelected ? 'ring-2 ring-blue-500' : 'ring-1 ring-transparent hover:ring-blue-300'} ${widget.locked ? 'opacity-90' : ''}`}
            style={{
              width: widget.width * zoom,
              height: widget.height * zoom,
              position: 'relative',
            }}
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
          >
            {/* Widget toolbar */}
            <div 
              className={`drag-handle absolute -top-7 left-0 right-0 h-7 ${widget.locked ? 'bg-gray-500' : 'bg-blue-500'} text-white text-xs px-2 flex items-center justify-between rounded-t cursor-move z-20 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <span className="truncate capitalize flex items-center gap-1">
                {widget.locked && <IconLock className="w-3 h-3" />}
                {widget.type}
              </span>
              <div className="flex gap-0.5">
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleLock(widget.id); }} 
                  className="hover:bg-blue-600 p-0.5 rounded" 
                  title={widget.locked ? 'Odemknout' : 'Zamknout'}
                >
                  {widget.locked ? <IconUnlock className="w-3 h-3" /> : <IconLock className="w-3 h-3" />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDuplicate(widget); }} 
                  className="hover:bg-blue-600 p-0.5 rounded" 
                  title="Duplikovat"
                  disabled={widget.locked}
                >
                  <IconCopy className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(widget); }} 
                  className="hover:bg-blue-600 p-0.5 rounded" 
                  title="Upravit"
                >
                  <IconSettings className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(widget.id); }} 
                  className="hover:bg-red-600 p-0.5 rounded" 
                  title="Smazat"
                  disabled={widget.locked}
                >
                  <IconTrash className="w-3 h-3" />
                </button>
              </div>
            </div>
            
            {/* Widget content */}
            <div 
              style={{ 
                transform: `scale(${zoom})`, 
                transformOrigin: 'top left',
                width: widget.width,
                height: widget.height,
              }}
            >
              {renderContent(widget)}
            </div>
            
            {/* Locked overlay */}
            {widget.locked && (
              <div className="absolute inset-0 bg-gray-500 bg-opacity-10 pointer-events-none" />
            )}
          </div>
        </Resizable>
      </div>
    </Draggable>
  );
}
