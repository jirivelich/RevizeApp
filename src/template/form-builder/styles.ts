// ─── Barevné tokeny, UI styly, Print CSS ─────────────────────────────────────

import type { CSSProperties } from 'react';

// ─── Barvy ───────────────────────────────────────────────────────────────────
export const C = {
  bg:      '#0d1117',
  surface: '#161b26',
  card:    '#1c2130',
  border:  '#252d42',
  accent:  '#4f8ef7',
  text:    '#dde2f0',
  muted:   '#6b7490',
  danger:  '#e05555',
  success: '#3ecf8e',
} as const;

// ─── UI tokeny ────────────────────────────────────────────────────────────────
export const T: Record<string, CSSProperties> = {
  app:         { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'IBM Plex Sans','Segoe UI',system-ui,sans-serif" },
  hdr:         { background: C.surface, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 200 },
  hInner:      { maxWidth: 1600, margin: '0 auto', padding: '0 20px', height: 50, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  logo:        { display: 'flex', alignItems: 'center', gap: 8 },
  ltxt:        { fontWeight: 700, fontSize: 15 },
  hTab:        { background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '5px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 13 },
  hTabActive:  { background: C.accent, borderColor: C.accent, color: '#fff', fontWeight: 600 },
  hBtn:        { padding: '5px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 13, border: `1px solid ${C.border}` },

  editLayout:  { display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 'calc(100vh - 50px)' },
  sidebar:     { background: C.surface, borderRight: `1px solid ${C.border}`, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 0 },
  sSection:    { borderBottom: `1px solid ${C.border}`, paddingBottom: 14, marginBottom: 14 },
  sTitle:      { fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 },
  sInp:        { width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 9px', color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box' },
  lbl:         { display: 'flex', alignItems: 'center', fontSize: 11, color: C.muted, marginBottom: 4, gap: 4 },
  sIconBtn:    { background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, padding: '0 3px' },
  sBtnAdd:     { background: 'transparent', color: C.accent, border: `1px dashed ${C.accent}`, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  sBtnBlk:     { background: C.card, border: `1px solid ${C.border}`, color: C.text, padding: '7px 10px', borderRadius: 7, fontSize: 12, cursor: 'pointer', textAlign: 'left' },
  pgRow:       { display: 'flex', alignItems: 'center', gap: 3, padding: '6px 8px', borderRadius: 7, cursor: 'pointer', marginBottom: 3 },
  pgRowSel:    { background: C.card },
  colBtn:      { background: C.bg, border: `1px solid ${C.border}`, color: C.muted, padding: '4px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer' },
  colBtnSel:   { background: C.accent, borderColor: C.accent, color: '#fff', fontWeight: 600 },

  canvas:      { overflowY: 'auto', background: '#1a1a2e', padding: '28px 0' },
  canvasInner: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  pgLabel:     { width: 794, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7490', marginBottom: 6, padding: '0 4px' },
};

// ─── Print CSS (injektovaný do <head> při mountu) ─────────────────────────────
export const PRINT_CSS = `
@page { size:A4 portrait; margin:0; }
@media print {
  html,body { margin:0; padding:0; background:white; }
  body > * { display:none !important; }
  #PRINTROOT { display:block !important; }
  .noprint { display:none !important; }
  .a4 {
    width:210mm; min-height:297mm; padding:16mm 18mm;
    background:white; color:#111;
    font-family:'Georgia','Times New Roman',serif;
    font-size:11pt; line-height:1.55; box-sizing:border-box;
    page-break-after:always; break-after:page;
  }
  .a4.overflow { min-height:unset; page-break-after:auto; break-after:auto; }
  .sec-title { font-size:10.5pt; font-weight:bold; text-transform:uppercase;
    letter-spacing:.07em; border-bottom:1pt solid #222; padding-bottom:3pt; margin:12pt 0 7pt; }
  .fields-grid { display:grid; gap:8pt; }
  .cols-1 { grid-template-columns:1fr; }
  .cols-2 { grid-template-columns:1fr 1fr; }
  .cols-3 { grid-template-columns:1fr 1fr 1fr; }
  .flabel { font-size:7.5pt; font-weight:bold; color:#555;
    text-transform:uppercase; letter-spacing:.05em; display:block; margin-bottom:2pt; }
  .fvalue { border-bottom:.75pt solid #999; min-height:16pt; padding:1pt 2pt;
    font-size:10.5pt; display:block; width:100%; box-sizing:border-box;
    background:transparent; color:#111; font-family:inherit;
    border-top:none; border-left:none; border-right:none; outline:none; }
  .fvalue.ta { min-height:36pt; }
  .chk { display:flex; align-items:center; gap:5pt; margin-top:4pt; }
  .chkbox { width:11pt; height:11pt; border:.75pt solid #444; flex-shrink:0;
    display:inline-flex; align-items:center; justify-content:center; font-size:9pt; font-weight:bold; }
  .doc-title { font-size:17pt; font-weight:bold; text-align:center; margin-bottom:3pt; }
  .doc-meta  { font-size:8.5pt; color:#666; text-align:center;
    border-bottom:.5pt solid #ccc; padding-bottom:7pt; margin-bottom:18pt; }
  .ft-h1 { font-size:16pt; font-weight:bold; margin:10pt 0 4pt; }
  .ft-h2 { font-size:13pt; font-weight:bold; margin:8pt 0 4pt; }
  .ft-h3 { font-size:10.5pt; font-weight:bold; font-style:italic; margin:6pt 0 3pt; }
  .ft-body { font-size:10.5pt; margin:4pt 0; }
  table.ftable { border-collapse:collapse; width:100%; margin:8pt 0; font-size:10pt; }
  table.ftable th { background:#f0f0f0; font-weight:bold; border:.75pt solid #999; padding:3pt 5pt; font-size:9pt; text-align:left; }
  table.ftable td { border:.75pt solid #bbb; padding:2pt 4pt; min-height:16pt; vertical-align:top; }
  table.ftable td input { border:none; outline:none; background:transparent; width:100%; font-size:10pt; font-family:inherit; }
  .tbl-title { font-size:10.5pt; font-weight:bold; text-transform:uppercase;
    letter-spacing:.07em; border-bottom:1pt solid #222; padding-bottom:3pt; margin:12pt 0 5pt; }
  .sig-row { display:flex; justify-content:space-between; margin-top:28pt; }
  .sig-label { font-size:7.5pt; color:#666; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4pt; }
  .sig-line { border-bottom:.75pt solid #888; height:22pt; }
}`;
