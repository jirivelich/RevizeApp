// ─── BlockRenderer — jednotný renderer bloků (edit / fill / print) ───────────
// Cíl: identický layout v editoru, vyplňovacím náhledu i tisku (WYSIWYG).
// Používá sdílené DOC tokeny + DS styly ze styles.ts.

import type { CSSProperties } from 'react';
import type {
  Block, SectionBlock, TableBlock, FreetextBlock,
  ImageBlock, SignatureBlock, AutoDateBlock,
  TableItem, FillData,
} from './types';
import { DOC, DS } from './styles';

export type RenderMode = 'edit' | 'fill' | 'print';

interface BlockRendererProps {
  block: Block;
  mode: RenderMode;
  /** Data formuláře (jen ve fill/print). V edit režimu ignorováno. */
  data?: FillData;
  /** Setter pro fill mód. V edit/print ignorováno. */
  set?: (id: string, v: string | boolean) => void;
  /** Suffix pro klíče (pro repeatable instance: '_0', '_1', …) */
  keySuffix?: string;
}

export function BlockRenderer({ block, mode, data, set, keySuffix = '' }: BlockRendererProps) {
  switch (block.kind) {
    case 'section':   return <SectionRender bl={block} mode={mode} data={data} set={set} keySuffix={keySuffix} />;
    case 'table':     return <TableRender   bl={block} mode={mode} data={data} set={set} />;
    case 'freetext':  return <FreetextRender bl={block} />;
    case 'image':     return <ImageRender   bl={block} mode={mode} />;
    case 'signature': return <SignatureRender bl={block} />;
    case 'pagebreak': return <PageBreakRender mode={mode} />;
    case 'autodate':  return <AutoDateRender bl={block} />;
  }
}

// ─── SectionRender ────────────────────────────────────────────────────────────

interface SectionRenderProps {
  bl: SectionBlock; mode: RenderMode;
  data?: FillData; set?: (id: string, v: string | boolean) => void;
  keySuffix: string;
}

function SectionRender({ bl, mode, data, set, keySuffix }: SectionRenderProps) {
  const key = (id: string) => `${id}${keySuffix}`;
  return (
    <div>
      {bl.titleVisible && <div style={DS.secTitle}>{bl.title || 'Oddíl'}</div>}
      <div style={DS.fieldsGrid(bl.cols)}>
        {bl.items.map(item => {
          if (item.itemKind === 'table') {
            return (
              <div key={item.id} style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                <InlineTableRender item={item} mode={mode} data={data} set={set} keySuffix={keySuffix} />
              </div>
            );
          }
          const fk = key(item.id);
          const val = data?.[fk];
          return (
            <div key={item.id} style={{ minWidth: 0 }}>
              <span style={DS.fieldLabel}>
                {item.label}{item.required && <span style={{ color: '#c00' }}> *</span>}
              </span>
              <FieldControl item={item} mode={mode} fk={fk} val={val} set={set} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FieldControl — vstup pro jedno pole podle typu + módu ────────────────────

interface FieldControlProps {
  item: import('./types').FieldItem;
  mode: RenderMode;
  fk: string;
  val: string | boolean | undefined;
  set?: (id: string, v: string | boolean) => void;
}

function FieldControl({ item, mode, fk, val, set }: FieldControlProps) {
  // ── Checkbox ──
  if (item.type === 'checkbox') {
    if (mode === 'fill') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
          <input
            type="checkbox"
            checked={!!val}
            onChange={e => set?.(fk, e.target.checked)}
            style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#2a6496' }}
          />
        </div>
      );
    }
    // edit / print → statický rámeček s případným ✓
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
        <div style={{ width: 13, height: 13, border: '1px solid #555', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#1a6640', fontWeight: 700 }}>
          {mode === 'print' && val ? '✓' : ''}
        </div>
        {mode === 'edit' && <span style={{ fontSize: 11, color: '#aaa' }}>zaškrtnutí</span>}
      </div>
    );
  }

  // ── Textarea ──
  if (item.type === 'textarea') {
    if (mode === 'fill') {
      return (
        <textarea
          style={{ ...DS.fieldInput, minHeight: 52, resize: 'vertical' }}
          value={String(val ?? '')}
          placeholder={item.placeholder}
          onChange={e => set?.(fk, e.target.value)}
          rows={3}
        />
      );
    }
    return <div style={{ ...DS.fieldStatic, minHeight: 52, whiteSpace: 'pre-wrap' }}>{mode === 'print' ? String(val ?? '') : (item.placeholder || '\u00a0')}</div>;
  }

  // ── Select ──
  if (item.type === 'select') {
    if (mode === 'fill') {
      return (
        <select style={DS.fieldInput} value={String(val ?? '')} onChange={e => set?.(fk, e.target.value)}>
          <option value="">— Vyberte —</option>
          {(item.options || '').split(',').filter(Boolean).map(o => (
            <option key={o.trim()} value={o.trim()}>{o.trim()}</option>
          ))}
        </select>
      );
    }
    return <div style={DS.fieldStatic}>{mode === 'print' ? String(val ?? '') : (item.placeholder || '\u00a0')}</div>;
  }

  // ── text/number/date ──
  if (mode === 'fill') {
    return (
      <input
        type={item.type}
        style={DS.fieldInput}
        value={String(val ?? '')}
        placeholder={item.placeholder}
        onChange={e => set?.(fk, e.target.value)}
      />
    );
  }
  return <div style={DS.fieldStatic}>{mode === 'print' ? String(val ?? '') : (item.placeholder || '\u00a0')}</div>;
}

// ─── Tabulky ──────────────────────────────────────────────────────────────────

const tableStyles = {
  wrap:    { marginBottom: 4 } as CSSProperties,
  title:   { fontSize: DOC.tableHeaderSize + 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1.5px solid #222', paddingBottom: 4, marginBottom: 6 } as CSSProperties,
  table:   { borderCollapse: 'collapse', width: '100%', fontSize: DOC.tableCellSize } as CSSProperties,
  th:      { background: DOC.tableHeaderBg, border: DOC.tableBorder, padding: '4px 7px', textAlign: 'left', fontSize: DOC.tableHeaderSize, fontWeight: 700 } as CSSProperties,
  td:      { border: DOC.tableBorder, padding: '3px 5px', verticalAlign: 'top', minHeight: 18 } as CSSProperties,
  cellInp: { border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: DOC.tableCellSize, fontFamily: DOC.fontFamily, color: DOC.textColor } as CSSProperties,
};

function InlineTableRender({ item, mode, data, set, keySuffix }: { item: TableItem; mode: RenderMode; data?: FillData; set?: (id: string, v: string | boolean) => void; keySuffix: string }) {
  return (
    <div style={tableStyles.wrap}>
      {item.titleVisible && <div style={tableStyles.title}>{item.title}</div>}
      <table style={tableStyles.table}>
        {item.hasHeader && (
          <thead><tr>{item.cols.map(c => <th key={c.id} style={tableStyles.th}>{c.label}</th>)}</tr></thead>
        )}
        <tbody>
          {item.rows.map(r => (
            <tr key={r.id}>
              {r.cells.map(c => {
                const ck = `${c.id}${keySuffix}`;
                const v = data?.[ck];
                return (
                  <td key={c.id} style={tableStyles.td}>
                    {mode === 'fill'
                      ? <input style={tableStyles.cellInp} value={String(v ?? '')} onChange={e => set?.(ck, e.target.value)} />
                      : <span>{mode === 'print' ? String(v ?? '') : '\u00a0'}</span>}
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

function TableRender({ bl, mode, data, set }: { bl: TableBlock; mode: RenderMode; data?: FillData; set?: (id: string, v: string | boolean) => void }) {
  return (
    <div style={{ marginBottom: DOC.secMargin }}>
      {bl.titleVisible && <div style={tableStyles.title}>{bl.title}</div>}
      <table style={tableStyles.table}>
        {bl.hasHeader && (
          <thead><tr>{bl.cols.map(c => <th key={c.id} style={tableStyles.th}>{c.label}</th>)}</tr></thead>
        )}
        <tbody>
          {bl.rows.map(r => (
            <tr key={r.id}>
              {r.cells.map(c => {
                const v = data?.[c.id];
                return (
                  <td key={c.id} style={tableStyles.td}>
                    {mode === 'fill'
                      ? <input style={tableStyles.cellInp} value={String(v ?? '')} onChange={e => set?.(c.id, e.target.value)} />
                      : <span>{mode === 'print' ? String(v ?? '') : '\u00a0'}</span>}
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

// ─── FreetextRender ───────────────────────────────────────────────────────────

function FreetextRender({ bl }: { bl: FreetextBlock }) {
  const f = DOC.ft[bl.style];
  const style: CSSProperties = {
    fontSize: f.size, fontWeight: f.weight, fontStyle: f.italic ? 'italic' : 'normal',
    margin: `${f.mt}px 0 ${f.mb}px`,
  };
  return <div style={style}>{bl.text || <span style={{ color: '#bbb' }}>Prázdný text</span>}</div>;
}

// ─── ImageRender ──────────────────────────────────────────────────────────────

function ImageRender({ bl, mode }: { bl: ImageBlock; mode: RenderMode }) {
  return (
    <div style={{ textAlign: 'center', margin: '8px 0' }}>
      {bl.src
        ? <img src={bl.src} alt={bl.caption} style={{ maxWidth: `${bl.widthPct}%`, height: 'auto', border: mode === 'edit' ? '1px dashed #ccc' : 'none' }} />
        : <div style={{ width: `${bl.widthPct}%`, height: 120, margin: '0 auto', border: '2px dashed #bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 12 }}>
            {mode === 'edit' ? 'Obrázek (nahraj v inspektoru)' : 'Bez obrázku'}
          </div>}
      {bl.caption && <div style={{ fontSize: 10, color: '#666', marginTop: 4, fontStyle: 'italic' }}>{bl.caption}</div>}
    </div>
  );
}

// ─── SignatureRender ──────────────────────────────────────────────────────────

function SignatureRender({ bl }: { bl: SignatureBlock }) {
  return (
    <div style={{ display: 'inline-block', margin: '8px 12px 8px 0' }}>
      <div style={{ width: bl.width, height: bl.height, borderBottom: '1px solid #444' }} />
      <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{bl.label}</div>
    </div>
  );
}

// ─── PageBreakRender ──────────────────────────────────────────────────────────

function PageBreakRender({ mode }: { mode: RenderMode }) {
  if (mode === 'edit') {
    return (
      <div style={{ borderTop: '2px dashed #4f8ef7', textAlign: 'center', padding: '6px 0', margin: '12px 0', color: '#4f8ef7', fontSize: 11, letterSpacing: '0.1em' }}>
        ⤓ ZALOMENÍ STRÁNKY ⤓
      </div>
    );
  }
  return <div className="pagebreak" style={{ pageBreakAfter: 'always', breakAfter: 'page', height: 0 }} />;
}

// ─── AutoDateRender ───────────────────────────────────────────────────────────

function AutoDateRender({ bl }: { bl: AutoDateBlock }) {
  const d = new Date();
  let text = '';
  if (bl.format === 'iso') text = d.toISOString().slice(0, 10);
  else if (bl.format === 'short') text = d.toLocaleDateString('cs-CZ');
  else {
    const months = ['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince'];
    text = `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  return <div style={{ marginTop: 6, fontSize: DOC.fontSize }}>{bl.prefix}{text}</div>;
}
