// ─── Inspektor bloků – pravý panel editoru ───────────────────────────────────

import type { Block, SectionBlock, TableBlock, FreetextBlock, FieldItem, TableItem, FieldType, ImageBlock, SignatureBlock, AutoDateBlock } from './types';
import { C, T } from './styles';
import { mkFieldItem, mkTableItem, mkRow, uid, FIELD_TYPES } from './factories';

// ─── Props ───────────────────────────────────────────────────────────────────

interface BlockInspectorProps {
  block: Block;
  onChange: (fn: (b: Block) => void) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}

interface FreetextInspectorProps {
  b: FreetextBlock;
  upd: (fn: (b: FreetextBlock) => void) => void;
}

interface SectionInspectorProps {
  b: SectionBlock;
  upd: (fn: (b: SectionBlock) => void) => void;
}

interface TableInspectorProps {
  b: TableBlock;
  upd: (fn: (b: TableBlock) => void) => void;
}

// ─── BlockInspector ──────────────────────────────────────────────────────────

export function BlockInspector({ block, onChange, onDelete, onMove }: BlockInspectorProps) {
  // Obalové funkce s přetypováním — bezpečné, protože kind je ověřen
  const updSection  = (fn: (b: SectionBlock)  => void) => onChange(b => fn(b as SectionBlock));
  const updTable    = (fn: (b: TableBlock)    => void) => onChange(b => fn(b as TableBlock));
  const updFreetext = (fn: (b: FreetextBlock) => void) => onChange(b => fn(b as FreetextBlock));
  const updImage    = (fn: (b: ImageBlock)    => void) => onChange(b => fn(b as ImageBlock));
  const updSignature= (fn: (b: SignatureBlock)=> void) => onChange(b => fn(b as SignatureBlock));
  const updAutoDate = (fn: (b: AutoDateBlock) => void) => onChange(b => fn(b as AutoDateBlock));

  const labelMap: Record<Block['kind'], string> = {
    section: '✦ Oddíl',
    table: '▦ Tabulka',
    freetext: 'T Text/Nadpis',
    image: '▤ Obrázek',
    signature: '✍ Podpis',
    pagebreak: '⤵ Zalomení',
    autodate: '📅 Datum',
  };

  return (
    <div style={T.sSection}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={T.sTitle}>{labelMap[block.kind]}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={T.sIconBtn} onClick={() => onMove(-1)}>↑</button>
          <button style={T.sIconBtn} onClick={() => onMove(1)}>↓</button>
          <button style={{ ...T.sIconBtn, color: C.danger }} onClick={onDelete}>×</button>
        </div>
      </div>

      {block.kind === 'freetext'  && <FreetextInspector b={block} upd={updFreetext} />}
      {block.kind === 'section'   && <SectionInspector  b={block} upd={updSection} />}
      {block.kind === 'table'     && <TableInspector    b={block} upd={updTable} />}
      {block.kind === 'image'     && <ImageInspector    b={block} upd={updImage} />}
      {block.kind === 'signature' && <SignatureInspector b={block} upd={updSignature} />}
      {block.kind === 'autodate'  && <AutoDateInspector b={block} upd={updAutoDate} />}
      {block.kind === 'pagebreak' && <div style={{ fontSize: 11, color: C.muted }}>Zalomení stránky — nemá nastavení.</div>}
    </div>
  );
}

// ─── FreetextInspector ───────────────────────────────────────────────────────

function FreetextInspector({ b, upd }: FreetextInspectorProps) {
  return (
    <>
      <label style={T.lbl}>Text / nadpis</label>
      <textarea
        style={{ ...T.sInp, minHeight: 60, resize: 'vertical' }}
        value={b.text}
        onChange={e => upd(x => { x.text = e.target.value; })}
      />
      <label style={T.lbl}>Styl</label>
      <select style={T.sInp} value={b.style} onChange={e => upd(x => { x.style = e.target.value as FreetextBlock['style']; })}>
        <option value="h1">H1 — Velký nadpis</option>
        <option value="h2">H2 — Střední nadpis</option>
        <option value="h3">H3 — Malý nadpis</option>
        <option value="body">Tělo textu</option>
      </select>
    </>
  );
}

// ─── SectionInspector ────────────────────────────────────────────────────────

function SectionInspector({ b, upd }: SectionInspectorProps) {
  const addItem    = () => upd(x => { x.items.push(mkFieldItem({ label: `Pole ${x.items.filter(i => i.itemKind === 'field').length + 1}` })); });
  const addTable   = () => upd(x => { x.items.push(mkTableItem(3, 3)); });
  const delItem    = (ii: number) => upd(x => { x.items.splice(ii, 1); });
  const moveItem   = (ii: number, dir: -1 | 1) => upd(x => {
    const a = x.items;
    if (!a[ii + dir]) return;
    const tmp = a[ii + dir]; a[ii + dir] = a[ii]; a[ii] = tmp;
  });
  const updItem    = (ii: number, k: string, v: unknown) => upd(x => { (x.items[ii] as unknown as Record<string, unknown>)[k] = v; });

  return (
    <>
      <label style={T.lbl}>Název oddílu</label>
      <input style={T.sInp} value={b.title} onChange={e => upd(x => { x.title = e.target.value; })} />
      <label style={{ ...T.lbl, display: 'flex', gap: 5, alignItems: 'center', marginTop: 6 }}>
        <input type="checkbox" checked={b.titleVisible} onChange={e => upd(x => { x.titleVisible = e.target.checked; })} />
        Zobrazit název oddílu
      </label>

      <label style={{ ...T.lbl, display: 'flex', gap: 5, alignItems: 'center', marginTop: 6 }}>
        <input type="checkbox" checked={!!b.repeatable} onChange={e => upd(x => { x.repeatable = e.target.checked || undefined; })} />
        ↻ Opakující se oddíl (ve vyplňování lze přidat kopie)
      </label>

      <label style={T.lbl}>Šířka oddílu</label>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        <button style={{ ...T.colBtn, ...(b.width === 'full' ? T.colBtnSel : {}) }} onClick={() => upd(x => { x.width = 'full'; })}>
          ⬛ Celá šířka
        </button>
        <button style={{ ...T.colBtn, ...(b.width === 'half' ? T.colBtnSel : {}) }} onClick={() => upd(x => { x.width = 'half'; })}>
          ▌ Polovina
        </button>
      </div>

      <label style={T.lbl}>Rozložení polí</label>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {([1, 2, 3] as const).map(n => (
          <button key={n} style={{ ...T.colBtn, ...(b.cols === n ? T.colBtnSel : {}) }} onClick={() => upd(x => { x.cols = n; })}>
            {['1 sloupec', '2 sl.', '3 sl.'][n - 1]}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Položky oddílu:</div>
      {b.items.map((item, ii) => (
        <div key={item.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: 8, marginBottom: 6 }}>
          {item.itemKind === 'table'
            ? <TableItemInspector item={item} ii={ii} upd={upd} onDel={() => delItem(ii)} onMove={dir => moveItem(ii, dir)} />
            : <FieldItemInspector item={item} ii={ii} updItem={updItem} onDel={() => delItem(ii)} onMove={dir => moveItem(ii, dir)} />
          }
        </div>
      ))}

      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button style={T.sBtnAdd} onClick={addItem}>+ Pole</button>
        <button style={T.sBtnAdd} onClick={addTable}>+ Tabulka</button>
      </div>
    </>
  );
}

// ─── FieldItemInspector ───────────────────────────────────────────────────────

interface FieldItemInspectorProps {
  item: FieldItem;
  ii: number;
  updItem: (ii: number, k: string, v: unknown) => void;
  onDel: () => void;
  onMove: (dir: -1 | 1) => void;
}

function FieldItemInspector({ item, ii, updItem, onDel, onMove }: FieldItemInspectorProps) {
  return (
    <>
      <div style={{ display: 'flex', gap: 5, marginBottom: 5, alignItems: 'center' }}>
        <input
          style={{ ...T.sInp, flex: 1, margin: 0 }}
          value={item.label}
          onChange={e => updItem(ii, 'label', e.target.value)}
          placeholder="Název pole"
        />
        <button style={T.sIconBtn} onClick={() => onMove(-1)}>↑</button>
        <button style={T.sIconBtn} onClick={() => onMove(1)}>↓</button>
        <button style={{ ...T.sIconBtn, color: C.danger }} onClick={onDel}>×</button>
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <select
          style={{ ...T.sInp, flex: 1, margin: 0 }}
          value={item.type}
          onChange={e => updItem(ii, 'type', e.target.value as FieldType)}
        >
          {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <label style={{ fontSize: 11, color: C.muted, display: 'flex', gap: 4, alignItems: 'center' }}>
          <input type="checkbox" checked={item.required} onChange={e => updItem(ii, 'required', e.target.checked)} /> *
        </label>
      </div>
      {item.type === 'select' && (
        <input style={{ ...T.sInp, marginTop: 5 }} value={item.options} onChange={e => updItem(ii, 'options', e.target.value)} placeholder="Možnosti: Ano,Ne,Nevím" />
      )}
      <input style={{ ...T.sInp, marginTop: 5 }} value={item.placeholder} onChange={e => updItem(ii, 'placeholder', e.target.value)} placeholder="Placeholder text" />
    </>
  );
}

// ─── TableItemInspector ───────────────────────────────────────────────────────

interface TableItemInspectorProps {
  item: TableItem;
  ii: number;
  upd: (fn: (b: SectionBlock) => void) => void;
  onDel: () => void;
  onMove: (dir: -1 | 1) => void;
}

function TableItemInspector({ item, ii, upd, onDel, onMove }: TableItemInspectorProps) {
  const tbl = (fn: (t: TableItem) => void) => upd(x => fn(x.items[ii] as TableItem));

  const addCol = () => tbl(t => { const id = uid(); t.cols.push({ id, label: `Sl. ${t.cols.length + 1}`, width: 1 }); t.rows.forEach(r => r.cells.push({ id: uid(), value: '' })); });
  const delCol = (ci: number) => tbl(t => { if (t.cols.length <= 1) return; t.cols.splice(ci, 1); t.rows.forEach(r => r.cells.splice(ci, 1)); });
  const addRow = () => tbl(t => { t.rows.push(mkRow(t.cols)); });
  const delRow = () => tbl(t => { if (t.rows.length <= 1) return; t.rows.splice(t.rows.length - 1, 1); });

  return (
    <>
      <div style={{ display: 'flex', gap: 5, marginBottom: 6, alignItems: 'center' }}>
        <span style={{ flex: 1, fontSize: 11, color: C.muted }}>▦ Vložená tabulka</span>
        <button style={T.sIconBtn} onClick={() => onMove(-1)}>↑</button>
        <button style={T.sIconBtn} onClick={() => onMove(1)}>↓</button>
        <button style={{ ...T.sIconBtn, color: C.danger }} onClick={onDel}>×</button>
      </div>
      <input style={T.sInp} value={item.title} onChange={e => tbl(t => { t.title = e.target.value; })} placeholder="Název tabulky" />
      <label style={{ ...T.lbl, display: 'flex', gap: 5, alignItems: 'center', marginTop: 4 }}>
        <input type="checkbox" checked={item.titleVisible} onChange={e => tbl(t => { t.titleVisible = e.target.checked; })} />
        Zobrazit název
      </label>
      <label style={{ ...T.lbl, display: 'flex', gap: 5, alignItems: 'center', marginTop: 4 }}>
        <input type="checkbox" checked={item.hasHeader} onChange={e => tbl(t => { t.hasHeader = e.target.checked; })} />
        Záhlaví sloupců
      </label>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 3, marginTop: 6 }}>Sloupce:</div>
      {item.cols.map((c, ci) => (
        <div key={c.id} style={{ display: 'flex', gap: 4, marginBottom: 3, alignItems: 'center' }}>
          <input style={{ ...T.sInp, flex: 1, margin: 0 }} value={c.label} onChange={e => tbl(t => { t.cols[ci].label = e.target.value; })} />
          <button style={{ ...T.sIconBtn, color: C.danger }} onClick={() => delCol(ci)}>×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
        <button style={T.sBtnAdd} onClick={addCol}>+ Sloupec</button>
        <button style={T.sBtnAdd} onClick={addRow}>+ Řádek</button>
        <button style={{ ...T.sBtnAdd, color: C.danger, borderColor: C.danger }} onClick={delRow}>– Řádek</button>
      </div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{item.rows.length} řádků · {item.cols.length} sloupců</div>
    </>
  );
}

// ─── TableInspector ──────────────────────────────────────────────────────────

function TableInspector({ b, upd }: TableInspectorProps) {
  const addCol = () => upd(x => {
    x.cols.push({ id: uid(), label: `Sl. ${x.cols.length + 1}`, width: 1 });
    x.rows.forEach(r => r.cells.push({ id: uid(), value: '' }));
  });
  const delCol = (ci: number) => upd(x => {
    if (x.cols.length <= 1) return;
    x.cols.splice(ci, 1);
    x.rows.forEach(r => r.cells.splice(ci, 1));
  });
  const addRow = () => upd(x => { x.rows.push(mkRow(x.cols)); });
  const delRow = (ri: number) => upd(x => { if (x.rows.length <= 1) return; x.rows.splice(ri, 1); });

  return (
    <>
      <label style={T.lbl}>Název tabulky</label>
      <input style={T.sInp} value={b.title} onChange={e => upd(x => { x.title = e.target.value; })} />
      <label style={{ ...T.lbl, display: 'flex', gap: 5, alignItems: 'center', marginTop: 6 }}>
        <input type="checkbox" checked={b.titleVisible} onChange={e => upd(x => { x.titleVisible = e.target.checked; })} />
        Zobrazit název
      </label>
      <label style={{ ...T.lbl, display: 'flex', gap: 5, alignItems: 'center', marginTop: 6 }}>
        <input type="checkbox" checked={b.hasHeader} onChange={e => upd(x => { x.hasHeader = e.target.checked; })} />
        Záhlaví (první řádek = popis)
      </label>

      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, marginTop: 8 }}>Sloupce:</div>
      {b.cols.map((c, ci) => (
        <div key={c.id} style={{ display: 'flex', gap: 5, marginBottom: 4, alignItems: 'center' }}>
          <input
            style={{ ...T.sInp, flex: 1, margin: 0 }}
            value={c.label}
            onChange={e => upd(x => { x.cols[ci].label = e.target.value; })}
            placeholder="Název sloupce"
          />
          <button style={{ ...T.sIconBtn, color: C.danger }} onClick={() => delCol(ci)}>×</button>
        </div>
      ))}
      <button style={{ ...T.sBtnAdd, marginBottom: 8 }} onClick={addCol}>+ Přidat sloupec</button>

      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, marginTop: 4 }}>Řádky: {b.rows.length}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={T.sBtnAdd} onClick={addRow}>+ Řádek</button>
        <button style={{ ...T.sBtnAdd, color: C.danger, borderColor: C.danger }} onClick={() => delRow(b.rows.length - 1)}>– Řádek</button>
      </div>
    </>
  );
}

// ─── ImageInspector ──────────────────────────────────────────────────────────

function ImageInspector({ b, upd }: { b: ImageBlock; upd: (fn: (b: ImageBlock) => void) => void }) {
  const onFile = (file: File | null) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => upd(x => { x.src = String(r.result ?? ''); });
    r.readAsDataURL(file);
  };
  return (
    <>
      <label style={T.lbl}>Obrázek</label>
      <input type="file" accept="image/*" onChange={e => onFile(e.target.files?.[0] ?? null)} style={{ ...T.sInp, padding: 4 }} />
      {b.src && (
        <div style={{ marginTop: 6, textAlign: 'center' }}>
          <img src={b.src} alt="" style={{ maxWidth: '100%', maxHeight: 100, border: `1px solid ${C.border}`, borderRadius: 4 }} />
          <button style={{ ...T.sBtnAdd, color: C.danger, borderColor: C.danger, marginTop: 4 }} onClick={() => upd(x => { x.src = ''; })}>× Odstranit</button>
        </div>
      )}
      <label style={T.lbl}>Popisek (volitelný)</label>
      <input style={T.sInp} value={b.caption} onChange={e => upd(x => { x.caption = e.target.value; })} />
      <label style={T.lbl}>Šířka (% stránky)</label>
      <input
        type="range" min={10} max={100} step={5}
        value={b.widthPct}
        onChange={e => upd(x => { x.widthPct = parseInt(e.target.value, 10); })}
        style={{ width: '100%' }}
      />
      <div style={{ fontSize: 10, color: C.muted, textAlign: 'right' }}>{b.widthPct}%</div>
    </>
  );
}

// ─── SignatureInspector ──────────────────────────────────────────────────────

function SignatureInspector({ b, upd }: { b: SignatureBlock; upd: (fn: (b: SignatureBlock) => void) => void }) {
  return (
    <>
      <label style={T.lbl}>Popisek</label>
      <input style={T.sInp} value={b.label} onChange={e => upd(x => { x.label = e.target.value; })} />
      <label style={T.lbl}>Šířka (px)</label>
      <input type="number" min={80} max={500} style={T.sInp} value={b.width} onChange={e => upd(x => { x.width = parseInt(e.target.value, 10) || 280; })} />
      <label style={T.lbl}>Výška (px)</label>
      <input type="number" min={40} max={300} style={T.sInp} value={b.height} onChange={e => upd(x => { x.height = parseInt(e.target.value, 10) || 100; })} />
    </>
  );
}

// ─── AutoDateInspector ───────────────────────────────────────────────────────

function AutoDateInspector({ b, upd }: { b: AutoDateBlock; upd: (fn: (b: AutoDateBlock) => void) => void }) {
  return (
    <>
      <label style={T.lbl}>Prefix textu</label>
      <input style={T.sInp} value={b.prefix} onChange={e => upd(x => { x.prefix = e.target.value; })} placeholder="V Praze dne " />
      <label style={T.lbl}>Formát data</label>
      <select style={T.sInp} value={b.format} onChange={e => upd(x => { x.format = e.target.value as AutoDateBlock['format']; })}>
        <option value="cs">Český (1. května 2026)</option>
        <option value="short">Krátký (01.05.2026)</option>
        <option value="iso">ISO (2026-05-01)</option>
      </select>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>Datum se vyplní automaticky při tisku.</div>
    </>
  );
}
