// ─── FillPage + PrintPage — vyplňovací a tiskový náhled ──────────────────────

import type { Block, SectionBlock, Page, Doc, FillData, RepeatCounts } from './types';
import { DOC, DS } from './styles';
import { BlockRenderer } from './BlockRenderer';
import { groupBlocks } from './utils';

interface FillPageProps {
  pg: Page;
  doc: Doc;
  data: FillData;
  setData: (fn: (prev: FillData) => FillData) => void;
  repeatCounts: RepeatCounts;
  setRepeatCounts: (fn: (prev: RepeatCounts) => RepeatCounts) => void;
  isLast: boolean;
  mode?: 'fill' | 'print';
}

export function FillPage(props: FillPageProps) {
  const { pg, doc, data, setData, repeatCounts, setRepeatCounts, isLast, mode = 'fill' } = props;
  const set = (id: string, v: string | boolean) => setData(p => ({ ...p, [id]: v }));
  const groups = groupBlocks(pg.blocks);

  const isFirst = doc.pages[0] === pg;
  const a4Class = `a4${pg.overflow ? ' overflow' : ''}${isLast ? ' last' : ''}`;

  return (
    <div className={a4Class} style={{
      ...DS.page(pg.overflow, pg.margins),
      boxShadow: mode === 'fill' ? '0 6px 40px rgba(0,0,0,0.55)' : 'none',
      marginBottom: mode === 'fill' ? 32 : 0,
    }}>
      {isFirst && (
        <div style={DS.docHeader}>
          <div style={DS.docTitle}>{doc.name || 'Bez názvu'}</div>
          {doc.description && <div style={DS.docDesc}>{doc.description}</div>}
          <div style={DS.docMeta}>{new Date().toLocaleDateString('cs-CZ')}</div>
        </div>
      )}

      {groups.map(group => {
        if (group.type === 'pair') {
          return (
            <div key={group.left.block.id + '-' + group.right.block.id} style={{ display: 'flex', gap: DOC.secGapX, marginBottom: DOC.secMargin }}>
              <div style={{ flex: '1 1 0' }}><BlockSwitch block={group.left.block}  mode={mode} data={data} set={set} repeatCounts={repeatCounts} setRepeatCounts={setRepeatCounts} setData={setData} /></div>
              <div style={{ flex: '1 1 0' }}><BlockSwitch block={group.right.block} mode={mode} data={data} set={set} repeatCounts={repeatCounts} setRepeatCounts={setRepeatCounts} setData={setData} /></div>
            </div>
          );
        }
        return (
          <div key={group.block.id} style={DS.blockWrap}>
            <BlockSwitch block={group.block} mode={mode} data={data} set={set} repeatCounts={repeatCounts} setRepeatCounts={setRepeatCounts} setData={setData} />
          </div>
        );
      })}
    </div>
  );
}

// ─── BlockSwitch — řeší repeatable sekce, jinak deleguje na BlockRenderer ────

interface BlockSwitchProps {
  block: Block;
  mode: 'fill' | 'print';
  data: FillData;
  set: (id: string, v: string | boolean) => void;
  setData: (fn: (prev: FillData) => FillData) => void;
  repeatCounts: RepeatCounts;
  setRepeatCounts: (fn: (prev: RepeatCounts) => RepeatCounts) => void;
}

function BlockSwitch({ block, mode, data, set, setData, repeatCounts, setRepeatCounts }: BlockSwitchProps) {
  if (block.kind === 'section' && block.repeatable) {
    return <RepeatableSection bl={block} mode={mode} data={data} set={set} setData={setData} repeatCounts={repeatCounts} setRepeatCounts={setRepeatCounts} />;
  }
  return <BlockRenderer block={block} mode={mode} data={data} set={set} keySuffix="" />;
}

// ─── RepeatableSection — N instancí s tlačítky + / − ─────────────────────────

interface RepeatableSectionProps {
  bl: SectionBlock;
  mode: 'fill' | 'print';
  data: FillData;
  set: (id: string, v: string | boolean) => void;
  setData: (fn: (prev: FillData) => FillData) => void;
  repeatCounts: RepeatCounts;
  setRepeatCounts: (fn: (prev: RepeatCounts) => RepeatCounts) => void;
}

function RepeatableSection({ bl, mode, data, set, setData, repeatCounts, setRepeatCounts }: RepeatableSectionProps) {
  const count = repeatCounts[bl.id] ?? 1;

  const addInstance = () => {
    const idx = count;
    setRepeatCounts(p => ({ ...p, [bl.id]: idx + 1 }));
    setData(prev => {
      const next = { ...prev };
      bl.items.forEach(item => {
        if (item.itemKind === 'field') next[`${item.id}_${idx}`] = item.defaultValue ?? '';
        else item.rows.forEach(r => r.cells.forEach(c => { next[`${c.id}_${idx}`] = ''; }));
      });
      return next;
    });
  };

  const removeInstance = () => {
    if (count <= 1) return;
    setRepeatCounts(p => ({ ...p, [bl.id]: count - 1 }));
  };

  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ position: 'relative' }}>
          {count > 1 && (
            <div style={{ fontSize: 10, color: '#888', fontStyle: 'italic', marginBottom: 2, marginTop: i > 0 ? 8 : 0 }}>
              #{i + 1}
            </div>
          )}
          <BlockRenderer block={bl} mode={mode} data={data} set={set} keySuffix={`_${i}`} />
        </div>
      ))}
      {mode === 'fill' && (
        <div className="noprint" style={{ display: 'flex', gap: 8, marginTop: 6, marginBottom: 14 }}>
          <button
            onClick={addInstance}
            style={{ background: 'transparent', border: '1px dashed #4f8ef7', color: '#4f8ef7', padding: '4px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + Přidat {bl.title || 'položku'}
          </button>
          {count > 1 && (
            <button
              onClick={removeInstance}
              style={{ background: 'transparent', border: '1px dashed #e05555', color: '#e05555', padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              − Odebrat poslední
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PrintPage — read-only varianta pro #PRINTROOT ───────────────────────────

interface PrintPageProps {
  pg: Page;
  doc: Doc;
  data: FillData;
  repeatCounts: RepeatCounts;
  isLast: boolean;
}

export function PrintPage({ pg, doc, data, repeatCounts, isLast }: PrintPageProps) {
  return (
    <FillPage
      pg={pg} doc={doc} data={data}
      setData={() => {}}
      repeatCounts={repeatCounts}
      setRepeatCounts={() => {}}
      isLast={isLast}
      mode="print"
    />
  );
}
