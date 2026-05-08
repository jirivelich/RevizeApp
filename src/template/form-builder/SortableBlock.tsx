// ─── SortableBlock — wrapper kolem bloku pro @dnd-kit ────────────────────────

import type { CSSProperties, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableBlockProps {
  id: string;
  children: ReactNode;
  /** Volitelné inline styly aplikované na vnější obal (např. flex pro pair) */
  style?: CSSProperties;
}

export function SortableBlock({ id, children, style }: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const wrapStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    ...style,
  };

  return (
    <div ref={setNodeRef} style={wrapStyle}>
      {/* Drag handle — malý úchyt vlevo od bloku */}
      <div
        {...attributes}
        {...listeners}
        className="noprint"
        title="Přetáhnout"
        style={{
          position: 'absolute', left: -22, top: 4,
          width: 18, height: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'grab', color: '#4f8ef7', fontSize: 16,
          userSelect: 'none', touchAction: 'none',
          opacity: 0.45, transition: 'opacity .12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.45')}
      >
        ⋮⋮
      </div>
      {children}
    </div>
  );
}
