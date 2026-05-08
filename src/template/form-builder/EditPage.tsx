// ─── EditPage — A4 náhled v editoru, tenký obal nad BlockRenderer ────────────

import type { CSSProperties } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Block, Page, Doc, SelBlk } from './types';
import { DOC, DS } from './styles';
import { BlockRenderer } from './BlockRenderer';
import { SortableBlock } from './SortableBlock';
import { groupBlocks } from './utils';

interface EditPageProps {
  pg: Page;
  pi: number;
  selBlk: SelBlk | null;
  onSelBlk: (bi: number) => void;
  doc: Doc;
}

export function EditPage({ pg, pi, selBlk, onSelBlk, doc }: EditPageProps) {
  const groups = groupBlocks(pg.blocks);

  const Wrap = ({ block, bi, style }: { block: Block; bi: number; style?: CSSProperties }) => {
    const isSel = selBlk?.pgIdx === pi && selBlk?.blkIdx === bi;
    const label =
      block.kind === 'section'
        ? [block.width === 'half' ? 'Oddíl ½' : 'Oddíl', block.repeatable ? ' ↻' : ''].join('')
        : block.kind === 'table' ? 'Tabulka'
        : block.kind === 'freetext' ? 'Text'
        : block.kind === 'image' ? 'Obrázek'
        : block.kind === 'signature' ? 'Podpis'
        : block.kind === 'pagebreak' ? 'Zalomení'
        : 'Datum';
    return (
      <div
        onClick={() => onSelBlk(bi)}
        style={{
          position: 'relative', cursor: 'pointer',
          outline: isSel ? '2px solid #4f8ef7' : '2px solid transparent',
          borderRadius: 3, transition: 'outline .12s',
          flex: style ? '1 1 0' : undefined,
          ...style,
        }}
      >
        {isSel && (
          <div style={{ position: 'absolute', top: -10, right: -2, background: '#4f8ef7', color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 3, zIndex: 10, pointerEvents: 'none' }}>
            {label}
          </div>
        )}
        <BlockRenderer block={block} mode="edit" />
      </div>
    );
  };

  return (
    <div style={{
      ...DS.page(pg.overflow, pg.margins),
      boxShadow: '0 6px 40px rgba(0,0,0,0.55)',
      position: 'relative',
    }}>
      {pi === 0 && (
        <div style={DS.docHeader}>
          <div style={DS.docTitle}>{doc.name || 'Bez názvu'}</div>
          {doc.description && <div style={DS.docDesc}>{doc.description}</div>}
          <div style={DS.docMeta}>{new Date().toLocaleDateString('cs-CZ')}</div>
        </div>
      )}

      <SortableContext items={pg.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
        {groups.map(group => {
          if (group.type === 'pair') {
            return (
              <div key={group.left.block.id + '-' + group.right.block.id} style={{ display: 'flex', gap: DOC.secGapX, marginBottom: DOC.secMargin }}>
                <SortableBlock id={group.left.block.id}  style={{ flex: '1 1 0' }}><Wrap block={group.left.block}  bi={group.left.bi}  style={{}} /></SortableBlock>
                <SortableBlock id={group.right.block.id} style={{ flex: '1 1 0' }}><Wrap block={group.right.block} bi={group.right.bi} style={{}} /></SortableBlock>
              </div>
            );
          }
          return (
            <SortableBlock key={group.block.id} id={group.block.id} style={DS.blockWrap}>
              <Wrap block={group.block} bi={group.bi} />
            </SortableBlock>
          );
        })}
      </SortableContext>

      {pg.blocks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#bbb', fontSize: 13, border: '1px dashed #ddd', borderRadius: 4 }}>
          Prázdná strana — přidejte blok z levého panelu
        </div>
      )}
    </div>
  );
