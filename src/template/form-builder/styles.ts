// ─── Barevné tokeny, UI styly, dokument-style tokeny, Print CSS ──────────────

import type { CSSProperties } from 'react';

// ─── Barvy (UI editoru) ──────────────────────────────────────────────────────
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

// ─── DOC — sdílené tokeny pro renderování dokumentu ──────────────────────────
// Hodnoty v px (pro screen). Při tisku Chrome převede 1px = 1/96in fyzicky.
// A4 = 794×1123 px (96dpi). Pro WYSIWYG používáme STEJNÉ hodnoty v editoru,
// fill módu i tisku.
export const DOC = {
  pageWidth:    794,
  pageHeight:   1123,
  marginTop:    64,
  marginRight:  72,
  marginBottom: 64,
  marginLeft:   72,

  fontFamily:   "'Georgia','Times New Roman',serif",
  fontSize:     13,
  lineHeight:   1.55,
  textColor:    '#111',
  fieldUnderline: '1px solid #aaa',

  docTitleSize: 20,
  docMetaSize:  11,

  secTitleSize: 12,
  secMargin:    16,
  secGapY:      10,
  secGapX:      18,

  fieldLabelSize: 10,

  ft: {
    h1:   { size: 20, weight: 700, mt: 8, mb: 4, italic: false },
    h2:   { size: 16, weight: 700, mt: 6, mb: 3, italic: false },
    h3:   { size: 13, weight: 700, mt: 5, mb: 2, italic: true  },
    body: { size: 13, weight: 400, mt: 3, mb: 3, italic: false },
  },

  tableHeaderBg:   '#f0f0f0',
  tableBorder:     '1px solid #bbb',
  tableHeaderSize: 10,
  tableCellSize:   12,
} as const;

// ─── DS — sdílené document styly (objekt → spread do inline style) ───────────
export const DS = {
  page: (overflow: boolean, margins?: { top: number; right: number; bottom: number; left: number }): CSSProperties => ({
    width: DOC.pageWidth,
    minHeight: overflow ? 'auto' : DOC.pageHeight,
    background: '#fff',
    color: DOC.textColor,
    fontFamily: DOC.fontFamily,
    fontSize: DOC.fontSize,
    lineHeight: DOC.lineHeight,
    padding: `${margins?.top ?? DOC.marginTop}px ${margins?.right ?? DOC.marginRight}px ${margins?.bottom ?? DOC.marginBottom}px ${margins?.left ?? DOC.marginLeft}px`,
    boxSizing: 'border-box',
  }),
  docHeader: { textAlign: 'center', marginBottom: 20, borderBottom: '1px solid #ccc', paddingBottom: 12 } as CSSProperties,
  docTitle:  { fontSize: DOC.docTitleSize, fontWeight: 700 } as CSSProperties,
  docDesc:   { fontSize: DOC.docMetaSize, color: '#888', marginTop: 3 } as CSSProperties,
  docMeta:   { fontSize: DOC.docMetaSize, color: '#999', marginTop: 4 } as CSSProperties,

  blockWrap: { marginBottom: DOC.secMargin } as CSSProperties,
  secTitle:  { fontSize: DOC.secTitleSize, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1.5px solid #222', paddingBottom: 5, marginBottom: 10 } as CSSProperties,
  fieldsGrid: (cols: 1 | 2 | 3): CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: ['1fr', '1fr 1fr', '1fr 1fr 1fr'][cols - 1] ?? '1fr',
    gap: `${DOC.secGapY}px ${DOC.secGapX}px`,
  }),
  fieldLabel: { fontSize: DOC.fieldLabelSize, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 3 } as CSSProperties,
  fieldInput: {
    width: '100%', border: 'none', borderBottom: DOC.fieldUnderline,
    background: 'transparent', color: DOC.textColor, fontSize: DOC.fontSize,
    padding: '3px 2px', outline: 'none',
    fontFamily: DOC.fontFamily, boxSizing: 'border-box',
  } as CSSProperties,
  fieldStatic: {
    borderBottom: DOC.fieldUnderline, minHeight: 22, padding: '3px 2px',
    fontSize: DOC.fontSize, color: DOC.textColor, boxSizing: 'border-box',
  } as CSSProperties,
};

// ─── UI tokeny (editor chrome — sidebar, header) ─────────────────────────────
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

// ─── Print CSS ───────────────────────────────────────────────────────────────
// Minimální: jen page size + hide UI + page-break. Vizuální styly přebírá
// inline z DS (DOC_STYLES) → garantovaný WYSIWYG s editorem a fill módem.
export const PRINT_CSS = `
@page { size: A4 portrait; margin: 0; }
@media print {
  html, body { margin: 0; padding: 0; background: white; }
  body > * { display: none !important; }
  #PRINTROOT { display: block !important; }
  .noprint { display: none !important; }
  .a4 {
    page-break-after: always;
    break-after: page;
    box-shadow: none !important;
    margin: 0 !important;
  }
  .a4.overflow,
  .a4.last { page-break-after: auto; break-after: auto; min-height: unset !important; }
  .pagebreak { page-break-after: always; break-after: page; height: 0; }
  input, textarea, select {
    -webkit-appearance: none;
    appearance: none;
    background: transparent !important;
  }
  input[type="checkbox"] { -webkit-appearance: checkbox; appearance: checkbox; }
}`;
// ─── Barevné tokeny, UI styly, Print CSS ─────────────────────────────────────

