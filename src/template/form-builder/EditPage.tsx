// ─── Editační náhled A4 stránky (pouze pro čtení, bez interakce s daty) ──────

import type { CSSProperties } from 'react';
import type { Block, SectionBlock, TableBlock, FreetextBlock, TableItem, Page, Doc, SelBlk } from './types';
import { groupBlocks } from './utils';

// ─── Props ───────────────────────────────────────────────────────────────────

interface EditPageProps {
  pg: Page;
  pi: number;
  selBlk: SelBlk | null;
  onSelBlk: (bi: number) => void;
  doc: Doc;
}

interface EditBlockProps   { bl: Block; }
interface EditSectionProps { bl: SectionBlock; }
interface EditTableProps   { bl: TableBlock; }

// ─── EditPage ────────────────────────────────────────────────────────────────

export function EditPage({ pg, pi, selBlk, onSelBlk, doc }: EditPageProps) {
  const groups = groupBlocks(pg.blocks);

  const BlockWrapper = ({ block, bi, style }: { block: Block; bi: number; style?: CSSProperties }) => {
    const isSel = selBlk?.pgIdx === pi && selBlk?.blkIdx === bi;
    const label =
      block.kind === 'section'
        ? (block.width === 'half' ? 'Oddíl ½' : 'Oddíl')
        : block.kind === 'table' ? 'Tabulka' : 'Text';
    return (
      <div
        onClick={() => onSelBlk(bi)}
        style={{
          position: 'relative', cursor: 'pointer',
          outline: isSel ? '2px solid #4f8ef7' : '2px solid transparent',
          borderRadius: 3, transition: 'outline .12s', flex: style ? '1 1 0' : undefined,
          ...style,
        }}
      >
        {isSel && (
          <div style={{ position: 'absolute', top: -10, right: -2, background: '#4f8ef7', color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 3, zIndex: 10, pointerEvents: 'none' }}>
            {label}
          </div>
        )}
        <EditBlock bl={block} />
      </div>
    );
  };

  return (
    <div style={{
      width: 794, minHeight: pg.overflow ? 'auto' : 1123,
      background: '#fff', color: '#111',
      fontFamily: "'Georgia','Times New Roman',serif",
      padding: '64px 72px', boxSizing: 'border-box',
      boxShadow: '0 6px 40px rgba(0,0,0,0.55)',
      position: 'relative',
    }}>
      {pi === 0 && (
        <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '1px solid #ccc', paddingBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{doc.name || 'Bez názvu'}</div>
          {doc.description && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{doc.description}</div>}
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{new Date().toLocaleDateString('cs-CZ')}</div>
        </div>
      )}

      {groups.map(group => {
        if (group.type === 'pair') {
          return (
            <div key={group.left.block.id + '-' + group.right.block.id} style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <BlockWrapper block={group.left.block}  bi={group.left.bi}  style={{}} />
              <BlockWrapper block={group.right.block} bi={group.right.bi} style={{}} />
            </div>
          );
        }
        return (
          <div key={group.block.id} style={{ marginBottom: 16 }}>
            <BlockWrapper block={group.block} bi={group.bi} />
          </div>
        );
      })}

      {pg.blocks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#bbb', fontSize: 13, border: '1px dashed #ddd', borderRadius: 4 }}>
          Prázdná strana — přidejte blok z levého panelu
        </div>
      )}
    </div>
  );
}

// ─── EditBlock ───────────────────────────────────────────────────────────────

function EditBlock({ bl }: EditBlockProps) {
  if (bl.kind === 'freetext') {
    const styleMap: Record<string, CSSProperties> = {
      h1:   { fontSize: 20, fontWeight: 700, margin: '8px 0 4px' },
      h2:   { fontSize: 16, fontWeight: 700, margin: '6px 0 3px' },
      h3:   { fontSize: 13, fontWeight: 700, fontStyle: 'italic', margin: '5px 0 2px' },
      body: { fontSize: 13, margin: '3px 0' },
    };
    return <div style={styleMap[bl.style]}>{bl.text || <span style={{ color: '#bbb' }}>Prázdný text</span>}</div>;
  }
  if (bl.kind === 'table') return <EditTable bl={bl} />;
  return <EditSection bl={bl} />;
}

// ─── EditSection ─────────────────────────────────────────────────────────────

function EditSection({ bl }: EditSectionProps) {
  const gridCols = ['1fr', '1fr 1fr', '1fr 1fr 1fr'][bl.cols - 1] ?? '1fr';
  return (
    <div>
      {bl.titleVisible && (
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1.5px solid #222', paddingBottom: 5, marginBottom: 10 }}>
          {bl.title || 'Oddíl'}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '10px 16px' }}>
        {bl.items.map(item => {
          if (item.itemKind === 'table') {
            return (
              <div key={item.id} style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                <EditInlineTable item={item} />
              </div>
            );
          }
          return (
            <div key={item.id} style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                {item.label}{item.required && <span style={{ color: '#c00' }}> *</span>}
              </div>
              {item.type === 'checkbox'
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <div style={{ width: 13, height: 13, border: '1px solid #888', borderRadius: 1 }} />
                    <span style={{ fontSize: 11, color: '#aaa' }}>zaškrtnutí</span>
                  </div>
                : <div style={{ borderBottom: '1px solid #bbb', minHeight: 18, marginTop: 2, color: item.placeholder ? '#ccc' : 'transparent', fontSize: 13, paddingBottom: 2 }}>
                    {item.placeholder || '–'}
                  </div>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── EditInlineTable ─────────────────────────────────────────────────────────

function EditInlineTable({ item }: { item: TableItem }) {
  return (
    <div>
      {item.titleVisible && (
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid #ccc', paddingBottom: 3, marginBottom: 6 }}>
          {item.title || 'Tabulka'}
        </div>
      )}
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
        {item.hasHeader && (
          <thead>
            <tr>
              {item.cols.map(c => (
                <th key={c.id} style={{ background: '#f5f5f5', border: '1px solid #ddd', padding: '3px 6px', textAlign: 'left', fontSize: 10, fontWeight: 700 }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {item.rows.map(r => (
            <tr key={r.id}>
              {r.cells.map(c => (
                <td key={c.id} style={{ border: '1px solid #ddd', padding: '2px 5px', fontSize: 11, color: '#ccc' }}>–</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── EditTable (samostaný blok stránky) ──────────────────────────────────────