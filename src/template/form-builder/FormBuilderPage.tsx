// ─── Hlavní komponenta Form Builderu ─────────────────────────────────────────

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Doc, Block, SelBlk, FillData } from './types';
import { mkPage, mkSection, mkTable, mkFreetext, defaultDoc } from './factories';
import { load, save, clone } from './persistence';
import { C, T, PRINT_CSS } from './styles';
import { EditPage } from './EditPage';
import { BlockInspector } from './BlockInspector';
import { FillPage, PrintPage } from './FillPage';

export function FormBuilderPage() {
  const [doc,      setDoc]  = useState<Doc>(() => load() ?? defaultDoc());
  const [mode,     setMode] = useState<'edit' | 'fill'>('edit');
  const [selPg,    setSelPg]  = useState(0);
  const [selBlk,   setSelBlk] = useState<SelBlk | null>(null);
  const [formData, setFD]     = useState<FillData>({});

  // Injektuje print CSS do <head> a odstraní ho při unmount
  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = PRINT_CSS;
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  // Autosave do localStorage při každé změně dokumentu
  useEffect(() => { save(doc); }, [doc]);

  // ── Mutace dokumentu ──────────────────────────────────────────────────────

  const updDoc = (fn: (d: Doc) => void) =>
    setDoc(d => { const c = clone(d); fn(c); return c; });

  const addPage  = () => updDoc(d => {
    d.pages.push(mkPage(d.pages.length + 1));
    setSelPg(d.pages.length - 1);
  });
  const delPage  = (i: number) => updDoc(d => {
    if (d.pages.length === 1) return;
    d.pages.splice(i, 1);
    setSelPg(Math.min(i, d.pages.length - 2));
  });
  const movePage = (i: number, dir: -1 | 1) => updDoc(d => {
    const b = d.pages[i + dir];
    if (!b) return;
    d.pages[i + dir] = d.pages[i]; d.pages[i] = b;
    setSelPg(i + dir);
  });
  const updPage  = (pi: number, fn: (p: Doc['pages'][number]) => void) =>
    updDoc(d => fn(d.pages[pi]));

  const addBlock  = (pi: number, blk: Block) => updDoc(d => {
    d.pages[pi].blocks.push(blk);
    setSelBlk({ pgIdx: pi, blkIdx: d.pages[pi].blocks.length - 1 });
  });
  const delBlock  = (pi: number, bi: number) => updDoc(d => {
    d.pages[pi].blocks.splice(bi, 1);
    setSelBlk(null);
  });
  const moveBlock = (pi: number, bi: number, dir: -1 | 1) => updDoc(d => {
    const bl = d.pages[pi].blocks;
    const b = bl[bi + dir];
    if (!b) return;
    bl[bi + dir] = bl[bi]; bl[bi] = b;
    setSelBlk({ pgIdx: pi, blkIdx: bi + dir });
  });
  const updBlock  = (pi: number, bi: number, fn: (b: Block) => void) =>
    updDoc(d => fn(d.pages[pi].blocks[bi]));

  // Inicializuje data formuláře a přepne do fill módu
  const enterFill = () => {
    const fd: FillData = {};
    doc.pages.forEach(pg => pg.blocks.forEach(bl => {
      if (bl.kind === 'section') bl.items.forEach(item => {
        if (item.itemKind === 'field') fd[item.id] = item.defaultValue;
        else item.rows.forEach(r => r.cells.forEach(c => { fd[c.id] = ''; }));
      });
      if (bl.kind === 'table')   bl.rows.forEach(r => r.cells.forEach(c => { fd[c.id] = ''; }));
    }));
    setFD(fd);
    setMode('fill');
  };

  const selBlock = selBlk ? doc.pages[selBlk.pgIdx]?.blocks[selBlk.blkIdx] : null;

  return (
    <div style={T.app}>
      {/* Skrytý print root — portál přímo do document.body, aby fungoval print CSS selector */}
      {createPortal(
        <div id="PRINTROOT" style={{ display: 'none' }}>
          {doc.pages.map((pg, pi) => (
            <PrintPage key={pg.id} pg={pg} doc={doc} data={formData} isLast={pi === doc.pages.length - 1} />
          ))}
        </div>,
        document.body
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={T.hdr} className="noprint">
        <div style={T.hInner}>
          <div style={T.logo}>
            <span style={{ color: C.accent, fontSize: 18 }}>▣</span>
            <span style={T.ltxt}>FormBuilder</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {(['edit', 'fill'] as const).map(m => (
              <button
                key={m}
                style={{ ...T.hTab, ...(mode === m ? T.hTabActive : {}) }}
                onClick={() => m === 'fill' ? enterFill() : setMode(m)}
              >
                {m === 'edit' ? '✏️ Editor' : '📝 Vyplnit'}
              </button>
            ))}
            {mode === 'fill' && (
              <button
                style={{ ...T.hBtn, background: C.success, borderColor: C.success, color: '#fff', fontWeight: 600 }}
                onClick={() => window.print()}
              >
                🖨 Tisk / PDF
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>Uloženo v prohlížeči</div>
        </div>
      </header>

      {/* ── EDIT MÓD ───────────────────────────────────────────────────────── */}
      {mode === 'edit' && (
        <div style={T.editLayout} className="noprint">
          <aside style={T.sidebar}>

            {/* Metadata dokumentu */}
            <div style={T.sSection}>
              <div style={T.sTitle}>Dokument</div>
              <input style={T.sInp} value={doc.name} onChange={e => updDoc(d => { d.name = e.target.value; })} placeholder="Název dokumentu" />
              <input style={{ ...T.sInp, marginTop: 5 }} value={doc.description} onChange={e => updDoc(d => { d.description = e.target.value; })} placeholder="Popis (volitelný)" />
            </div>

            {/* Seznam stránek */}
            <div style={T.sSection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={T.sTitle}>Stránky</div>
                <button style={T.sBtnAdd} onClick={addPage}>+ strana</button>
              </div>
              {doc.pages.map((pg, pi) => (
                <div
                  key={pg.id}
                  style={{ ...T.pgRow, ...(selPg === pi ? T.pgRowSel : {}) }}
                  onClick={() => { setSelPg(pi); setSelBlk(null); }}
                >
                  <span style={{ flex: 1, fontSize: 13, fontWeight: selPg === pi ? 600 : 400 }}>{pg.label || `Strana ${pi + 1}`}</span>
                  <span style={{ fontSize: 10, color: C.muted, marginRight: 4 }}>{pg.overflow ? '∞' : 'A4'}</span>
                  <button style={T.sIconBtn} onClick={e => { e.stopPropagation(); movePage(pi, -1); }}>↑</button>
                  <button style={T.sIconBtn} onClick={e => { e.stopPropagation(); movePage(pi, 1); }}>↓</button>
                  <button style={{ ...T.sIconBtn, color: C.danger }} onClick={e => { e.stopPropagation(); delPage(pi); }}>×</button>
                </div>
              ))}
            </div>

            {/* Nastavení vybrané stránky */}
            {doc.pages[selPg] && (
              <div style={T.sSection}>
                <div style={T.sTitle}>Nastavení strany {selPg + 1}</div>
                <label style={T.lbl}>Název strany</label>
                <input style={T.sInp} value={doc.pages[selPg].label} onChange={e => updPage(selPg, p => { p.label = e.target.value; })} />
                <label style={{ ...T.lbl, marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={doc.pages[selPg].overflow} onChange={e => updPage(selPg, p => { p.overflow = e.target.checked; })} />
                  Přetékání (obsah přechází na další stránku)
                </label>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Přidat blok:</div>
                  <button style={T.sBtnBlk} onClick={() => addBlock(selPg, mkSection())}>＋ Oddíl (sekce s poli)</button>
                  <button style={T.sBtnBlk} onClick={() => addBlock(selPg, mkTable())}>＋ Tabulka</button>
                  <button style={T.sBtnBlk} onClick={() => addBlock(selPg, mkFreetext())}>＋ Nadpis / text</button>
                </div>
              </div>
            )}

            {/* Inspektor vybraného bloku */}
            {selBlk && selBlock && (
              <BlockInspector
                key={`${selBlk.pgIdx}-${selBlk.blkIdx}`}
                block={selBlock}
                onChange={fn => updBlock(selBlk.pgIdx, selBlk.blkIdx, fn)}
                onDelete={() => delBlock(selBlk.pgIdx, selBlk.blkIdx)}
                onMove={dir => moveBlock(selBlk.pgIdx, selBlk.blkIdx, dir)}
              />
            )}
          </aside>

          {/* A4 canvas */}
          <div style={T.canvas}>
            <div style={T.canvasInner}>
              {doc.pages.map((pg, pi) => (
                <div key={pg.id} style={{ marginBottom: 40 }}>
                  <div style={T.pgLabel} className="noprint">
                    <span>Strana {pi + 1}{pg.label ? ` — ${pg.label}` : ''}</span>
                    <span style={{ color: pg.overflow ? C.accent : C.muted, fontSize: 11 }}>
                      {pg.overflow ? 'přetékání povoleno' : 'pevná A4'}
                    </span>
                  </div>
                  <EditPage
                    pg={pg} pi={pi}
                    selBlk={selBlk}
                    onSelBlk={bi => setSelBlk({ pgIdx: pi, blkIdx: bi })}
                    doc={doc}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FILL MÓD ───────────────────────────────────────────────────────── */}
      {mode === 'fill' && (
        <div
          style={{ background: C.bg, minHeight: 'calc(100vh - 52px)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20, paddingBottom: 60 }}
          className="noprint"
        >
          <div style={{ width: 794, display: 'flex', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, color: C.muted }}>Vyplňte formulář. Tisk/PDF zachová přesné rozložení A4.</span>
            <button style={{ ...T.hBtn, background: 'transparent', borderColor: C.border, color: C.muted }} onClick={() => setMode('edit')}>
              ← Zpět do editoru
            </button>
          </div>
          <div>
            {doc.pages.map((pg, pi) => (
              <FillPage key={pg.id} pg={pg} doc={doc} data={formData} setData={setFD} isLast={pi === doc.pages.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
