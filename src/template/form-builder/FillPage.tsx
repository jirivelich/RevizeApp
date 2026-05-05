// ─── Vyplňovací + tiskový náhled stránek ─────────────────────────────────────

import type { CSSProperties } from 'react';
import type { Block, SectionBlock, TableBlock, TableItem, Page, Doc, FillData, RepeatCounts } from './types';
import { groupBlocks } from './utils';

// ─── Props ───────────────────────────────────────────────────────────────────

interface FillPageProps {
  pg: Page;
  doc: Doc;
  data: FillData;
  setData: (fn: (prev: FillData) => FillData) => void;
  repeatCounts: RepeatCounts;
  setRepeatCounts: (fn: (prev: RepeatCounts) => RepeatCounts) => void;
  isLast: boolean;
}

interface FillBlockProps {
  bl: Block;
  data: FillData;
  set: (id: string, v: string | boolean) => void;
  repeatCounts: RepeatCounts;
  setRepeatCounts: (fn: (prev: RepeatCounts) => RepeatCounts) => void;
}

interface FillSectionProps {
  bl: SectionBlock;
  data: FillData;
  set: (id: string, v: string | boolean) => void;
  repeatCounts: RepeatCounts;
  setRepeatCounts: (fn: (prev: RepeatCounts) => RepeatCounts) => void;
}

interface FillSectionInstanceProps {
  bl: SectionBlock;
  instanceIdx: number;
  data: FillData;
  set: (id: string, v: string | boolean) => void;
}

interface FillTableProps {
  bl: TableBlock;
  data: FillData;
  set: (id: string, v: string | boolean) => void;
}

interface PrintPageProps {
  pg: Page;
  doc: Doc;
  data: FillData;
  repeatCounts: RepeatCounts;
  isLast: boolean;
}

// ─── FillPage ────────────────────────────────────────────────────────────────

export function FillPage({ pg, doc, data, setData, repeatCounts, setRepeatCounts, isLast }: FillPageProps) {
  const set = (id: string, v: string | boolean) => setData(p => ({ ...p, [id]: v }));
  const groups = groupBlocks(pg.blocks);

  return (
    <div className="a4" style={{
      width: 794, minHeight: pg.overflow ? 'auto' : 1123,
      background: '#fff', color: '#111',
      fontFamily: "'Georgia','Times New Roman',serif",
      padding: '64px 72px', boxSizing: 'border-box',
      boxShadow: '0 6px 40px rgba(0,0,0,0.55)',
      marginBottom: 32,
    }}>
      {doc.pages[0] === pg && (
        <div className="doc-header" style={{ textAlign: 'center', marginBottom: 20, borderBottom: '1px solid #ccc', paddingBottom: 12 }}>
          <div className="doc-title" style={{ fontSize: 20, fontWeight: 700 }}>{doc.name || 'Bez názvu'}</div>
          {doc.description && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{doc.description}</div>}
          <div className="doc-meta" style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{new Date().toLocaleDateString('cs-CZ')}</div>
        </div>
      )}

      {groups.map(group => {
        if (group.type === 'pair') {
          return (
            <div key={group.left.block.id + '-' + group.right.block.id} style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: '1 1 0' }}><FillBlock bl={group.left.block}  data={data} set={set} repeatCounts={repeatCounts} setRepeatCounts={setRepeatCounts} /></div>
              <div style={{ flex: '1 1 0' }}><FillBlock bl={group.right.block} data={data} set={set} repeatCounts={repeatCounts} setRepeatCounts={setRepeatCounts} /></div>
            </div>
          );
        }
        return <FillBlock key={group.block.id} bl={group.block} data={data} set={set} repeatCounts={repeatCounts} setRepeatCounts={setRepeatCounts} />;
      })}

      {isLast && (
        <div className="sig-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 44 }}>
          {(['Podpis', 'Datum', 'Razítko'] as const).map((l, i) => {
            const w = [180, 140, 110][i] ?? 120;
            return (
              <div key={l}>
                <div className="sig-label" style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{l}</div>
                <div className="sig-line" style={{ borderBottom: '1px solid #888', height: 24, width: w }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── FillBlock ───────────────────────────────────────────────────────────────

function FillBlock({ bl, data, set, repeatCounts, setRepeatCounts }: FillBlockProps) {
  if (bl.kind === 'freetext') {
    const styleMap: Record<string, CSSProperties> = {
      h1:   { fontSize: 20, fontWeight: 700, margin: '8px 0 4px' },
      h2:   { fontSize: 16, fontWeight: 700, margin: '6px 0 3px' },
      h3:   { fontSize: 13, fontWeight: 700, fontStyle: 'italic', margin: '5px 0 2px' },
      body: { fontSize: 13, margin: '3px 0' },
    };
    return <div className={`ft-${bl.style}`} style={styleMap[bl.style]}>{bl.text}</div>;
  }
  if (bl.kind === 'table') return <FillTable bl={bl} data={data} set={set} />;
  return <FillSection bl={bl} data={data} set={set} repeatCounts={repeatCounts} setRepeatCounts={setRepeatCounts} />;
}

// ─── FillSection ─────────────────────────────────────────────────────────────

function FillSection({ bl, data, set, repeatCounts, setRepeatCounts }: FillSectionProps) {
  if (!bl.repeatable) {
    // Standardní sekce — beze změny
    return <FillSectionInstance bl={bl} instanceIdx={-1} data={data} set={set} />;
  }

  const count = repeatCounts[bl.id] ?? 1;

  const addInstance = () => {
    // Inicializuj prázdné klíče pro novou instanci
    const idx = count;
    setRepeatCounts(p => ({ ...p, [bl.id]: idx + 1 }));
    set('__noop__', ''); // trigger update — skutečná inicializace přes setData níže
    // Inicializuj pole nové instance
    const newEntries: Record<string, string | boolean> = {};
    bl.items.forEach(item => {
      if (item.itemKind === 'field') newEntries[`${item.id}_${idx}`] = '';
      else item.rows.forEach(r => r.cells.forEach(c => { newEntries[`${c.id}_${idx}`] = ''; }));
    });
    // setData není dostupný zde přímo — přidáme ho přes set hack
    Object.entries(newEntries).forEach(([k, v]) => set(k, v));
    setRepeatCounts(p => ({ ...p, [bl.id]: idx + 1 }));
  };

  const removeInstance = () => {
    if (count <= 1) return;
    const idx = count - 1;
    setRepeatCounts(p => ({ ...p, [bl.id]: idx }));
    // Smazání dat poslední instance — ponecháme je v FillData (jsou ignorovány při count poklesu)
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
          <FillSectionInstance bl={bl} instanceIdx={i} data={data} set={set} />
        </div>
      ))}
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
    </div>
  );
}

// ─── FillSectionInstance — jedna konkrétní instance sekce ────────────────────

function FillSectionInstance({ bl, instanceIdx, data, set }: FillSectionInstanceProps) {
  // instanceIdx === -1 → non-repeatable: klíče jsou přímo `item.id`
  const key = (id: string) => instanceIdx === -1 ? id : `${id}_${instanceIdx}`;

  const gridCols = ['1fr', '1fr 1fr', '1fr 1fr 1fr'][bl.cols - 1] ?? '1fr';
  const inpBase: CSSProperties = {
    width: '100%', border: 'none', borderBottom: '1px solid #aaa',
    background: 'transparent', color: '#111', fontSize: 13,
    padding: '3px 2px', outline: 'none',
    fontFamily: "'Georgia',serif", boxSizing: 'border-box',
  };

  return (
    <div style={{ marginBottom: 18 }}>
      {bl.titleVisible && (
        <div className="sec-title" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1.5px solid #222', paddingBottom: 5, marginBottom: 10 }}>
          {bl.title}
        </div>
      )}
      <div className={`fields-grid cols-${bl.cols}`} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '10px 18px' }}>
        {bl.items.map(item => {
          if (item.itemKind === 'table') {
            return <FillInlineTable key={item.id} item={item} data={data} set={set} keyPrefix={instanceIdx === -1 ? '' : `_${instanceIdx}`} />;
          }
          const fk = key(item.id);
          return (
            <div key={item.id} className="f-block" style={{ minWidth: 0 }}>
              <span className="flabel" style={{ fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>
                {item.label}{item.required && <span style={{ color: '#c00' }}> *</span>}
              </span>
              {item.type === 'checkbox'
                ? (
                  <div className="chk" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
                    <div className="chkbox" style={{ width: 13, height: 13, border: '1px solid #555', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#1a6640', fontWeight: 700 }}>
                      {data[fk] ? '✓' : ''}
                    </div>
                    <input
                      type="checkbox"
                      checked={!!data[fk]}
                      onChange={e => set(fk, e.target.checked)}
                      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#2a6496' }}
                    />
                  </div>
                ) : item.type === 'textarea'
                  ? (
                    <textarea
                      className="fvalue ta"
                      style={{ ...inpBase, minHeight: 52, resize: 'vertical' }}
                      value={String(data[fk] ?? '')}
                      placeholder={item.placeholder}
                      onChange={e => set(fk, e.target.value)}
                      rows={3}
                    />
                  ) : item.type === 'select'
                    ? (
                      <select className="fvalue" style={inpBase} value={String(data[fk] ?? '')} onChange={e => set(fk, e.target.value)}>
                        <option value="">— Vyberte —</option>
                        {(item.options || '').split(',').filter(Boolean).map(o => (
                          <option key={o.trim()} value={o.trim()}>{o.trim()}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="fvalue"
                        type={item.type}
                        style={inpBase}
                        value={String(data[fk] ?? '')}
                        placeholder={item.placeholder}
                        onChange={e => set(fk, e.target.value)}
                      />
                    )
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FillInlineTable (tabulka uvnitř oddílu) ─────────────────────────────────

interface FillInlineTableProps {
  item: TableItem;
  data: FillData;
  set: (id: string, v: string | boolean) => void;
  keyPrefix?: string;
}

function FillInlineTable({ item, data, set, keyPrefix = '' }: FillInlineTableProps) {
  const tdBase: CSSProperties = { border: '1px solid #ccc', padding: '3px 5px', verticalAlign: 'top' };
  const inpBase: CSSProperties = { border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 12, fontFamily: "'Georgia',serif", color: '#111' };

  return (
    <div style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
      {item.titleVisible && (
        <div className="tbl-title" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1.5px solid #222', paddingBottom: 4, marginBottom: 6 }}>
          {item.title}
        </div>
      )}
      <table className="ftable" style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        {item.hasHeader && (
          <thead>
            <tr>
              {item.cols.map(c => (
                <th key={c.id} style={{ background: '#f0f0f0', border: '1px solid #bbb', padding: '4px 7px', textAlign: 'left', fontSize: 10, fontWeight: 700 }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {item.rows.map(r => (
            <tr key={r.id}>
              {r.cells.map(c => {
                const ck = `${c.id}${keyPrefix}`;
                return (
                  <td key={c.id} style={tdBase}>
                    <input style={inpBase} value={String(data[ck] ?? '')} onChange={e => set(ck, e.target.value)} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── FillTable ───────────────────────────────────────────────────────────────

function FillTable({ bl, data, set }: FillTableProps) {
  const tdBase: CSSProperties = { border: '1px solid #ccc', padding: '3px 5px', verticalAlign: 'top' };
  const inpBase: CSSProperties = { border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 12, fontFamily: "'Georgia',serif", color: '#111' };

  return (
    <div style={{ marginBottom: 18 }}>
      {bl.titleVisible && (
        <div className="tbl-title" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1.5px solid #222', paddingBottom: 5, marginBottom: 8 }}>
          {bl.title}
        </div>
      )}
      <table className="ftable" style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        {bl.hasHeader && (
          <thead>
            <tr>
              {bl.cols.map(c => (
                <th key={c.id} style={{ background: '#f0f0f0', border: '1px solid #bbb', padding: '4px 7px', textAlign: 'left', fontSize: 10, fontWeight: 700 }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {bl.rows.map(r => (
            <tr key={r.id}>
              {r.cells.map(c => (
                <td key={c.id} style={tdBase}>
                  <input style={inpBase} value={String(data[c.id] ?? '')} onChange={e => set(c.id, e.target.value)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── PrintPage ───────────────────────────────────────────────────────────────
// Obaluje FillPage jako read-only – rendruje se do skrytého #PRINTROOT při tisku

export function PrintPage({ pg, doc, data, repeatCounts, isLast }: PrintPageProps) {
  return <FillPage pg={pg} doc={doc} data={data} setData={_fn => {}} repeatCounts={repeatCounts} setRepeatCounts={_fn => {}} isLast={isLast} />;
}
