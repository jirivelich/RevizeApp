import React, { useRef, useEffect, useState } from 'react';

type SymbolType = 'jimaec' | 'svod' | 'uzemneni';
type Tool = SymbolType | 'select' | 'vedeni' | 'obdelnik' | 'pero' | 'text' | 'guma';

interface LpsSymbol {
  id: string;
  type: SymbolType;
  x: number;
  y: number;
  rotation: number;
}

// Vector objects drawn above the raster layer: selectable, movable, resizable.
// text uses (x1, y1) as its baseline-left position; (x2, y2) are unused.
interface Shape {
  id: string;
  kind: 'rect' | 'line' | 'text';
  x1: number; y1: number; x2: number; y2: number;
  color: string;
  lw: number;
  text?: string;
  size?: number;
}

type Pt = { x: number; y: number };
type HandleKey = 'x1' | 'x2';
type HandleKeyY = 'y1' | 'y2';

interface StoredV2 {
  v: 2;
  full: string;  // composite PNG – for printing (bg + shapes + symbols)
  bg: string;    // clean bg PNG (pen/eraser strokes, legacy drawings) – for editing
  symbols: LpsSymbol[];
  shapes?: Shape[];
}

interface HistoryEntry {
  bg: ImageData;
  symbols: LpsSymbol[];
  shapes: Shape[];
}

interface Props {
  value?: string;
  onChange: (data: string) => void;
}

const W = 900;
const H = 550;
const GUMA_R = 14;
const HIT_R = 32;
const MAX_HIST = 40;

// ─── symbol renderers ────────────────────────────────────────────────────────

function drawJimaec(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate((rot * Math.PI) / 180);
  ctx.strokeStyle = '#1e3a8a'; ctx.fillStyle = '#1e3a8a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(0, -16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-5, -12); ctx.lineTo(0, -24); ctx.lineTo(5, -12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, 24); ctx.lineTo(10, 24); ctx.stroke();
  ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('J', 0, 36);
  ctx.restore();
}

function drawSvod(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate((rot * Math.PI) / 180);
  ctx.strokeStyle = '#166534'; ctx.fillStyle = '#166534'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, -9); ctx.stroke();
  ctx.strokeRect(-8, -9, 16, 13);
  ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 24); ctx.stroke();
  ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('S', 0, 36);
  ctx.restore();
}

function drawUzemneni(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate((rot * Math.PI) / 180);
  ctx.strokeStyle = '#7c2d12'; ctx.fillStyle = '#7c2d12'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 0); ctx.stroke();
  [18, 13, 8].forEach((w, i) => { ctx.beginPath(); ctx.moveTo(-w / 2, i * 6); ctx.lineTo(w / 2, i * 6); ctx.stroke(); });
  ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('E', 0, 26);
  ctx.restore();
}

function drawSym(ctx: CanvasRenderingContext2D, s: LpsSymbol) {
  if (s.type === 'jimaec')   drawJimaec(ctx, s.x, s.y, s.rotation);
  if (s.type === 'svod')     drawSvod(ctx, s.x, s.y, s.rotation);
  if (s.type === 'uzemneni') drawUzemneni(ctx, s.x, s.y, s.rotation);
}

function drawAllSymbols(ctx: CanvasRenderingContext2D, syms: LpsSymbol[], selId: string | null) {
  for (const s of syms) {
    drawSym(ctx, s);
    if (s.id === selId) {
      ctx.save(); ctx.translate(s.x, s.y);
      ctx.strokeStyle = '#2B88FF'; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(-26, -34, 52, 76);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.save(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += 25) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
}

// ─── shapes ──────────────────────────────────────────────────────────────────

const textSizeFor = (lw: number) => (lw <= 1 ? 12 : lw <= 2 ? 14 : 18);
const SHAPE_HIT = 8;
const HANDLE_R = 6;

let measureCtx: CanvasRenderingContext2D | null = null;
function textBox(s: Shape) {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  const size = s.size ?? 14;
  if (measureCtx) measureCtx.font = `${size}px sans-serif`;
  const w = measureCtx ? measureCtx.measureText(s.text ?? '').width : 40;
  return { x: s.x1, y: s.y1 - size, w, h: size + 4 };
}

function drawShape(ctx: CanvasRenderingContext2D, s: Shape) {
  ctx.save();
  ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.lw; ctx.lineCap = 'round';
  if (s.kind === 'line') {
    ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
  } else if (s.kind === 'rect') {
    ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
  } else {
    ctx.font = `${s.size ?? 14}px sans-serif`;
    ctx.fillText(s.text ?? '', s.x1, s.y1);
  }
  ctx.restore();
}

function handlesOf(s: Shape): { x: number; y: number; kx: HandleKey; ky: HandleKeyY }[] {
  if (s.kind === 'line') return [
    { x: s.x1, y: s.y1, kx: 'x1', ky: 'y1' },
    { x: s.x2, y: s.y2, kx: 'x2', ky: 'y2' },
  ];
  if (s.kind === 'rect') return [
    { x: s.x1, y: s.y1, kx: 'x1', ky: 'y1' },
    { x: s.x2, y: s.y1, kx: 'x2', ky: 'y1' },
    { x: s.x2, y: s.y2, kx: 'x2', ky: 'y2' },
    { x: s.x1, y: s.y2, kx: 'x1', ky: 'y2' },
  ];
  return [];
}

function drawAllShapes(ctx: CanvasRenderingContext2D, shapes: Shape[], selId: string | null) {
  for (const s of shapes) {
    drawShape(ctx, s);
    if (s.id !== selId) continue;
    ctx.save();
    ctx.strokeStyle = '#2B88FF'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 1.5;
    if (s.kind === 'text') {
      const b = textBox(s);
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
    } else {
      for (const h of handlesOf(s)) {
        ctx.beginPath(); ctx.rect(h.x - 4, h.y - 4, 8, 8); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function distToSegment(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function hitShape(s: Shape, p: Pt, interior: boolean): boolean {
  if (s.kind === 'line') {
    return !interior && distToSegment(p, { x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }) <= Math.max(SHAPE_HIT, s.lw / 2 + 4);
  }
  if (s.kind === 'text') {
    if (interior) return false;
    const b = textBox(s);
    return p.x >= b.x - 4 && p.x <= b.x + b.w + 4 && p.y >= b.y - 4 && p.y <= b.y + b.h + 4;
  }
  const minX = Math.min(s.x1, s.x2), maxX = Math.max(s.x1, s.x2);
  const minY = Math.min(s.y1, s.y2), maxY = Math.max(s.y1, s.y2);
  if (interior) return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
  const inX = p.x >= minX - SHAPE_HIT && p.x <= maxX + SHAPE_HIT;
  const inY = p.y >= minY - SHAPE_HIT && p.y <= maxY + SHAPE_HIT;
  return (inY && (Math.abs(p.x - minX) <= SHAPE_HIT || Math.abs(p.x - maxX) <= SHAPE_HIT)) ||
         (inX && (Math.abs(p.y - minY) <= SHAPE_HIT || Math.abs(p.y - maxY) <= SHAPE_HIT));
}

// Topmost shape under the point: edges/lines/text first, then rectangle interiors
function findShapeAt(shapes: Shape[], p: Pt): Shape | null {
  for (let i = shapes.length - 1; i >= 0; i--) if (hitShape(shapes[i], p, false)) return shapes[i];
  for (let i = shapes.length - 1; i >= 0; i--) if (hitShape(shapes[i], p, true)) return shapes[i];
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const HromosvodNacrtCanvas: React.FC<Props> = ({ value, onChange }) => {
  const visRef  = useRef<HTMLCanvasElement>(null);         // visible canvas
  const bgElRef = useRef<HTMLCanvasElement | null>(null);  // offscreen bg (no symbols)

  const [tool, setTool]         = useState<Tool>('vedeni');
  const [color, setColor]       = useState('#c00000');
  const [lineWidth, setLineWidth] = useState(2);
  const [newSymRot, setNewSymRot] = useState(0); // rotation for next placed symbol
  const [symbols, setSymbols]   = useState<LpsSymbol[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [textOverlay, setTextOverlay] = useState<{ x: number; y: number; val: string } | null>(null);

  // Mutable refs for event handlers (avoid stale closures)
  const symRef    = useRef<LpsSymbol[]>([]);
  const selRef    = useRef<string | null>(null);
  const toolRef   = useRef<Tool>('vedeni');
  const colorRef  = useRef('#c00000');
  const lwRef     = useRef(2);
  const rotRef    = useRef(0);

  useEffect(() => { symRef.current  = symbols;    }, [symbols]);
  useEffect(() => { selRef.current  = selectedId; }, [selectedId]);
  useEffect(() => { toolRef.current = tool;        }, [tool]);
  useEffect(() => { colorRef.current = color;     }, [color]);
  useEffect(() => { lwRef.current   = lineWidth;  }, [lineWidth]);
  useEffect(() => { rotRef.current  = newSymRot;  }, [newSymRot]);

  const [shapes, setShapesState] = useState<Shape[]>([]);
  const shapesRef = useRef<Shape[]>([]);
  const setShapes = (arr: Shape[]) => { shapesRef.current = arr; setShapesState(arr); };
  // Active drag of a selected shape: whole-shape move or a single resize handle
  const dragShape = useRef<{ id: string; orig: Shape; start: Pt; handle?: { kx: HandleKey; ky: HandleKeyY } } | null>(null);
  const deleteRef = useRef<() => void>(() => {});
  const undoRef = useRef<() => void>(() => {});

  const history = useRef<HistoryEntry[]>([]);
  const readyRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const changedRef = useRef(false); // did the current drag actually change something

  // Drag state
  const dragging   = useRef(false);
  const startPt    = useRef({ x: 0, y: 0 });
  const prevPt     = useRef({ x: 0, y: 0 });
  const dragSnap   = useRef<ImageData | null>(null); // full vis-canvas snapshot for line/rect live preview
  const dragSymId  = useRef<string | null>(null);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const peroPath   = useRef<{ x: number; y: number }[]>([]);

  const isSymTool = (t: Tool): t is SymbolType => t === 'jimaec' || t === 'svod' || t === 'uzemneni';

  const getBg  = () => bgElRef.current?.getContext('2d') ?? null;
  const getVis = () => visRef.current?.getContext('2d') ?? null;

  // Render: white + (screen-only grid) + bgCanvas + symbols on top.
  // The grid is never part of bg, so it does not leak into the printed `full` PNG.
  function paint(syms: LpsSymbol[], selId: string | null, grid: boolean) {
    const vis = getVis();
    const bg  = bgElRef.current;
    if (!vis || !bg) return;
    vis.fillStyle = '#ffffff';
    vis.fillRect(0, 0, W, H);
    if (grid) drawGrid(vis);
    vis.drawImage(bg, 0, 0);
    drawAllShapes(vis, shapesRef.current, selId);
    drawAllSymbols(vis, syms, selId);
  }

  function fullRedraw(selId: string | null) {
    paint(symRef.current, selId, true);
  }

  // Save current state to history
  function snapshot(syms: LpsSymbol[]) {
    const bg = getBg();
    if (!bg) return;
    history.current.push({ bg: bg.getImageData(0, 0, W, H), symbols: [...syms], shapes: [...shapesRef.current] });
    if (history.current.length > MAX_HIST) history.current.shift();
    setHistoryCount(history.current.length);
  }

  // Emit: composite PNG + clean bg + symbols as JSON
  function emitState(syms: LpsSymbol[], selId: string | null) {
    const visEl   = visRef.current;
    const bgEl    = bgElRef.current;
    // Never overwrite stored data before it was loaded successfully
    if (!visEl || !bgEl || !readyRef.current) return;
    // Clean render (no selection box, no grid) for printing
    paint(syms, null, false);
    const fullPng = visEl.toDataURL('image/png');
    const bgPng   = bgEl.toDataURL('image/png');
    const stored: StoredV2 = { v: 2, full: fullPng, bg: bgPng, symbols: syms, shapes: shapesRef.current };
    onChange(JSON.stringify(stored));
    // Restore on-screen view with grid and selection
    paint(syms, selId, true);
  }

  // ─── Init ────────────────────────────────────────────────────────────────
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const bgEl   = document.createElement('canvas');
    bgEl.width   = W; bgEl.height = H;
    bgElRef.current = bgEl;
    const bgCtx = bgEl.getContext('2d')!;  // transparent; grid is drawn on screen only

    const boot = (loadedSyms: LpsSymbol[], loadedShapes: Shape[] = []) => {
      readyRef.current = true;
      setStatus('ready');
      setShapes(loadedShapes);
      setSymbols(loadedSyms); symRef.current = loadedSyms;
      snapshot(loadedSyms);
      fullRedraw(null);
    };
    // Loading failed: keep the stored value untouched (editor stays read-only)
    const fail = () => { fullRedraw(null); setStatus('error'); };

    const loadImage = (src: string, syms: LpsSymbol[], shp: Shape[] = []) => {
      const img = new Image();
      img.onload = () => { bgCtx.drawImage(img, 0, 0); boot(syms, shp); };
      img.onerror = fail;
      img.src = src;
    };

    if (value) {
      if (value.startsWith('{')) {
        try {
          const parsed = JSON.parse(value) as StoredV2;
          if (parsed.v === 2 && parsed.bg) {
            loadImage(parsed.bg, parsed.symbols ?? [], parsed.shapes ?? []);
            return;
          }
        } catch { /* fall through */ }
        fail();
        return;
      }
      // Legacy: plain PNG — load into bg layer
      loadImage(value, []);
    } else {
      boot([]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Actions ─────────────────────────────────────────────────────────────

  function undo() {
    if (history.current.length <= 1) return;
    history.current.pop();
    const prev = history.current[history.current.length - 1];
    getBg()?.putImageData(prev.bg, 0, 0);
    const syms = [...prev.symbols];
    setSymbols(syms); symRef.current = syms;
    setShapes([...prev.shapes]);
    setSelectedId(null); selRef.current = null;
    setHistoryCount(history.current.length);
    fullRedraw(null);
    emitState(syms, null);
  }

  function clearAll() {
    const bgCtx = getBg();
    if (!bgCtx || !readyRef.current) return;
    if (!window.confirm('Opravdu smazat celý náčrt? (lze vrátit tlačítkem Zpět)')) return;
    bgCtx.clearRect(0, 0, W, H);
    setShapes([]);
    setSymbols([]); symRef.current = [];
    setSelectedId(null); selRef.current = null;
    snapshot([]);
    fullRedraw(null);
    emitState([], null);
  }

  function rotateSelected(delta: number) {
    const id = selRef.current;
    if (!id) return;
    const newSyms = symRef.current.map(s =>
      s.id === id ? { ...s, rotation: ((s.rotation + delta) % 360 + 360) % 360 } : s
    );
    setSymbols(newSyms); symRef.current = newSyms;
    snapshot(newSyms);
    fullRedraw(id);
    emitState(newSyms, id);
  }

  function deleteSelected() {
    const id = selRef.current;
    if (!id || !readyRef.current) return;
    const newSyms = symRef.current.filter(s => s.id !== id);
    setSymbols(newSyms); symRef.current = newSyms;
    setShapes(shapesRef.current.filter(s => s.id !== id));
    setSelectedId(null); selRef.current = null;
    snapshot(newSyms);
    fullRedraw(null);
    emitState(newSyms, null);
  }

  // ─── Input helpers ───────────────────────────────────────────────────────

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = visRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = W / rect.width, sy = H / rect.height;
    if ('touches' in e) {
      const t = (e as React.TouchEvent).touches[0] ?? (e as React.TouchEvent).changedTouches[0];
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy };
    }
    const m = e as React.MouseEvent;
    return { x: (m.clientX - rect.left) * sx, y: (m.clientY - rect.top) * sy };
  }

  function findSym(pt: { x: number; y: number }): LpsSymbol | null {
    let best: LpsSymbol | null = null, bestD = HIT_R;
    for (const s of symRef.current) {
      const d = Math.hypot(pt.x - s.x, pt.y - s.y);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  // ─── Mouse / touch handlers ──────────────────────────────────────────────

  function onDown(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!readyRef.current) return;
    const pt  = getPos(e);
    const t   = toolRef.current;
    const vis = getVis();
    changedRef.current = false;

    if (t === 'text') {
      setTextOverlay({ x: pt.x, y: pt.y, val: '' });
      return;
    }

    if (t === 'select') {
      // 1) resize handle of the currently selected rectangle / line
      const cur = shapesRef.current.find(s => s.id === selRef.current);
      if (cur) {
        const sc = visRef.current ? W / visRef.current.getBoundingClientRect().width : 1;
        const h = handlesOf(cur).find(h => Math.hypot(pt.x - h.x, pt.y - h.y) <= HANDLE_R * 1.6 * sc);
        if (h) {
          dragging.current = true;
          dragShape.current = { id: cur.id, orig: cur, start: pt, handle: { kx: h.kx, ky: h.ky } };
          return;
        }
      }
      // 2) symbols (drawn on top), 3) shapes
      const sym = findSym(pt);
      const shp = sym ? null : findShapeAt(shapesRef.current, pt);
      if (shp) {
        setSelectedId(shp.id); selRef.current = shp.id;
        fullRedraw(shp.id);
        dragging.current = true;
        dragShape.current = { id: shp.id, orig: shp, start: pt };
      } else if (sym) {
        setSelectedId(sym.id); selRef.current = sym.id;
        fullRedraw(sym.id);
        dragging.current  = true;
        dragSymId.current = sym.id;
        dragOffset.current = { dx: pt.x - sym.x, dy: pt.y - sym.y };
      } else {
        setSelectedId(null); selRef.current = null;
        fullRedraw(null);
      }
      return;
    }

    if (isSymTool(t)) {
      const newSym: LpsSymbol = {
        id: crypto.randomUUID(),
        type: t,
        x: pt.x, y: pt.y,
        rotation: rotRef.current,
      };
      const newSyms = [...symRef.current, newSym];
      setSymbols(newSyms); symRef.current = newSyms;
      snapshot(newSyms);
      fullRedraw(null);
      emitState(newSyms, null);
      return;
    }

    // Background drawing tools
    dragging.current  = true;
    startPt.current   = pt;
    prevPt.current    = pt;

    if (t === 'vedeni' || t === 'obdelnik') {
      // Capture current visible canvas for live drag preview
      if (vis) dragSnap.current = vis.getImageData(0, 0, W, H);
    }
    if (t === 'pero') {
      peroPath.current = [pt];
    }
  }

  function onMove(e: React.MouseEvent | React.TouchEvent) {
    if (!dragging.current) return;
    e.preventDefault();
    const pt  = getPos(e);
    const t   = toolRef.current;
    const vis = getVis();
    if (!vis) return;

    if (t === 'select' && dragShape.current) {
      const d = dragShape.current;
      const dx = pt.x - d.start.x, dy = pt.y - d.start.y;
      if (!changedRef.current && Math.hypot(dx, dy) < 2) return; // ignore click jitter
      changedRef.current = true;
      const moved: Shape = d.handle
        ? { ...d.orig, [d.handle.kx]: pt.x, [d.handle.ky]: pt.y }
        : { ...d.orig, x1: d.orig.x1 + dx, y1: d.orig.y1 + dy, x2: d.orig.x2 + dx, y2: d.orig.y2 + dy };
      setShapes(shapesRef.current.map(s => s.id === d.id ? moved : s));
      fullRedraw(d.id);
      return;
    }

    if (t === 'select' && dragSymId.current) {
      changedRef.current = true;
      const nx = pt.x - dragOffset.current.dx;
      const ny = pt.y - dragOffset.current.dy;
      const newSyms = symRef.current.map(s =>
        s.id === dragSymId.current ? { ...s, x: nx, y: ny } : s
      );
      setSymbols(newSyms); symRef.current = newSyms;
      fullRedraw(dragSymId.current);
      return;
    }

    if ((t === 'vedeni' || t === 'obdelnik') && dragSnap.current) {
      vis.putImageData(dragSnap.current, 0, 0);
      vis.save();
      vis.strokeStyle = colorRef.current;
      vis.lineWidth   = lwRef.current + (t === 'vedeni' ? 1 : 0);
      vis.lineCap     = 'round';
      if (t === 'vedeni') {
        vis.beginPath();
        vis.moveTo(startPt.current.x, startPt.current.y);
        vis.lineTo(pt.x, pt.y);
        vis.stroke();
      } else {
        vis.strokeRect(startPt.current.x, startPt.current.y, pt.x - startPt.current.x, pt.y - startPt.current.y);
      }
      vis.restore();
      prevPt.current = pt;
      return;
    }

    if (t === 'pero') {
      changedRef.current = true;
      peroPath.current.push(pt);
      vis.save();
      vis.strokeStyle = colorRef.current;
      vis.lineWidth = lwRef.current;
      vis.lineCap = 'round'; vis.lineJoin = 'round';
      vis.beginPath();
      vis.moveTo(prevPt.current.x, prevPt.current.y);
      vis.lineTo(pt.x, pt.y);
      vis.stroke();
      vis.restore();
    }

    if (t === 'guma') {
      const bgCtx = getBg();
      if (!bgCtx) return;
      changedRef.current = true;
      bgCtx.save();
      bgCtx.globalCompositeOperation = 'destination-out';
      bgCtx.beginPath(); bgCtx.arc(pt.x, pt.y, GUMA_R, 0, Math.PI * 2); bgCtx.fill();
      bgCtx.restore();
      fullRedraw(selRef.current);
    }

    prevPt.current = pt;
  }

  function onUp(e: React.MouseEvent | React.TouchEvent) {
    if (!dragging.current) return;
    finishDrag(getPos(e));
  }

  // Mouse left the canvas / touch was cancelled: commit what was drawn so far
  function onLeave() {
    if (!dragging.current) return;
    finishDrag(prevPt.current);
  }

  function finishDrag(pt: { x: number; y: number }) {
    dragging.current = false;
    const t     = toolRef.current;
    const bgCtx = getBg();

    if (t === 'select' && (dragSymId.current || dragShape.current)) {
      // Commit symbol / shape drag (only if it really moved)
      dragSymId.current = null;
      dragShape.current = null;
      if (changedRef.current) {
        snapshot(symRef.current);
        emitState(symRef.current, selRef.current);
      }
      return;
    }

    if (bgCtx) {
      if ((t === 'vedeni' || t === 'obdelnik') &&
          (Math.abs(pt.x - startPt.current.x) > 1 || Math.abs(pt.y - startPt.current.y) > 1)) {
        changedRef.current = true;
        // Vector object (selectable / movable), not baked into the raster layer
        setShapes([...shapesRef.current, {
          id: crypto.randomUUID(),
          kind: t === 'vedeni' ? 'line' : 'rect',
          x1: startPt.current.x, y1: startPt.current.y, x2: pt.x, y2: pt.y,
          color: colorRef.current,
          lw: lwRef.current + (t === 'vedeni' ? 1 : 0),
        }]);
      }
      dragSnap.current = null;

      if (t === 'pero' && peroPath.current.length > 1) {
        // Replay full path on bgCanvas
        bgCtx.save();
        bgCtx.strokeStyle = colorRef.current;
        bgCtx.lineWidth = lwRef.current;
        bgCtx.lineCap = 'round'; bgCtx.lineJoin = 'round';
        bgCtx.beginPath();
        bgCtx.moveTo(peroPath.current[0].x, peroPath.current[0].y);
        for (let i = 1; i < peroPath.current.length; i++) bgCtx.lineTo(peroPath.current[i].x, peroPath.current[i].y);
        bgCtx.stroke();
        bgCtx.restore();
      }
      peroPath.current = [];
    }

    fullRedraw(selRef.current);
    if (!changedRef.current) return; // nothing drawn – no history step, no save
    snapshot(symRef.current);
    emitState(symRef.current, selRef.current);
  }

  function confirmText() {
    if (!textOverlay?.val.trim()) { setTextOverlay(null); return; }
    setShapes([...shapesRef.current, {
      id: crypto.randomUUID(), kind: 'text',
      x1: textOverlay.x, y1: textOverlay.y, x2: textOverlay.x, y2: textOverlay.y,
      color: colorRef.current, lw: 1, text: textOverlay.val,
      size: textSizeFor(lwRef.current),
    }]);
    setTextOverlay(null);
    snapshot(symRef.current);
    fullRedraw(selRef.current);
    emitState(symRef.current, selRef.current);
  }

  // Apply colour / width to the selected shape (if any); `commit` = save + history step
  function styleSelected(patch: { color?: string; width?: number }, commit: boolean) {
    const id = selRef.current;
    const cur = shapesRef.current.find(s => s.id === id);
    if (!cur || !readyRef.current) return;
    const next: Shape = { ...cur };
    if (patch.color) next.color = patch.color;
    if (patch.width) {
      if (cur.kind === 'text') next.size = textSizeFor(patch.width);
      else next.lw = patch.width + (cur.kind === 'line' ? 1 : 0);
    }
    setShapes(shapesRef.current.map(s => s.id === id ? next : s));
    fullRedraw(id);
    if (commit) { snapshot(symRef.current); emitState(symRef.current, id); }
  }

  // Keyboard: Delete removes the selection, Ctrl+Z undoes (ignored while typing in a field)
  useEffect(() => {
    deleteRef.current = deleteSelected;
    undoRef.current = undo;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selRef.current) {
        e.preventDefault(); deleteRef.current();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault(); undoRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ─── Toolbar config ──────────────────────────────────────────────────────

  const toolDefs: { id: Tool; label: string; title: string }[] = [
    { id: 'select',   label: '↖ Výběr',    title: 'Výběr – kliknutím vyberte symbol, čáru, obdélník nebo text; táhněte pro přesun, úchyty mění velikost, Delete maže' },
    { id: 'jimaec',   label: '⚡ Jímač',   title: 'Jímač (tyčový) – kliknutím umístíte symbol' },
    { id: 'svod',     label: '🔌 Svod',     title: 'Svod (svodové vedení) – kliknutím umístíte symbol' },
    { id: 'uzemneni', label: '⏚ Uzemnění', title: 'Uzemnění (zemní elektroda) – kliknutím umístíte symbol' },
    { id: 'vedeni',   label: '━ Vedení',   title: 'Vedení hromosvodu – tažením nakreslete vodič' },
    { id: 'obdelnik', label: '▭ Obdélník', title: 'Obdélník – tažením nakreslete obrys objektu' },
    { id: 'pero',     label: '✏ Pero',     title: 'Pero – volné kreslení' },
    { id: 'text',     label: 'T Text',     title: 'Text – kliknutím přidejte popisek' },
    { id: 'guma',     label: '◻ Guma',     title: 'Guma – maže jen kresbu perem; čáry, obdélníky a texty smažte nástrojem Výběr (Delete)' },
  ];

  const cursorMap: Record<Tool, string> = {
    select: 'default', jimaec: 'crosshair', svod: 'crosshair', uzemneni: 'crosshair',
    vedeni: 'crosshair', obdelnik: 'crosshair', pero: 'crosshair', text: 'text', guma: 'cell',
  };

  // For selected symbol: show its current rotation; for new-symbol tools: show placement rotation
  const selectedSym   = selectedId ? symbols.find(s => s.id === selectedId) : null;
  const selectedShape = selectedId ? shapes.find(s => s.id === selectedId) : null;
  const showRotCtrls  = isSymTool(tool) || (tool === 'select' && selectedSym != null);
  const rotDisplay    = tool === 'select' && selectedSym ? selectedSym.rotation : newSymRot;

  function rotateBtn(delta: number) {
    if (tool === 'select' && selectedId) {
      rotateSelected(delta);
    } else {
      setNewSymRot(r => ((r + delta) % 360 + 360) % 360);
    }
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
        {/* Tools */}
        <div className="flex flex-wrap gap-1">
          {toolDefs.map(td => (
            <button
              key={td.id}
              title={td.title}
              type="button"
              onClick={() => { setTool(td.id); if (td.id !== 'select') { setSelectedId(null); selRef.current = null; } }}
              className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors ${
                tool === td.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >{td.label}</button>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1 hidden sm:block" />

        {/* Color */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--text-muted)] hidden sm:inline">Barva:</span>
          {['#1a1a1a', '#c00000', '#1d4ed8', '#166534'].map(c => (
            <button key={c} type="button" title={c} onClick={() => { setColor(c); styleSelected({ color: c }, true); }}
              style={{ backgroundColor: c }}
              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${color === c ? 'border-slate-700 scale-110' : 'border-white shadow-sm'}`}
            />
          ))}
          <input type="color" value={color}
            onChange={e => { setColor(e.target.value); styleSelected({ color: e.target.value }, false); }}
            onBlur={() => styleSelected({}, true)}
            className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0" title="Vlastní barva" />
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1 hidden sm:block" />

        {/* Line width */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--text-muted)] hidden sm:inline">Tloušťka:</span>
          {([1, 2, 4] as const).map(w => (
            <button key={w} type="button" onClick={() => { setLineWidth(w); styleSelected({ width: w }, true); }}
              className={`px-2 py-1 text-xs rounded border ${
                lineWidth === w ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >{w === 1 ? 'tenká' : w === 2 ? 'střední' : 'silná'}</button>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1 hidden sm:block" />

        {/* Rotation controls — for symbol placement or selected symbol */}
        {showRotCtrls && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--text-muted)]">Otočení:</span>
            <button type="button" onClick={() => rotateBtn(-90)} title="Otočit doleva o 90°"
              className="px-2 py-1 text-xs rounded border bg-white text-slate-700 border-slate-300 hover:border-slate-400">↺</button>
            <span className="text-xs font-medium text-slate-700 w-8 text-center">{rotDisplay}°</span>
            <button type="button" onClick={() => rotateBtn(90)} title="Otočit doprava o 90°"
              className="px-2 py-1 text-xs rounded border bg-white text-slate-700 border-slate-300 hover:border-slate-400">↻</button>
          </div>
        )}
        {tool === 'select' && selectedId && (
          <button type="button" onClick={deleteSelected}
            className="px-2 py-1 text-xs rounded border bg-white text-red-600 border-red-200 hover:bg-red-50"
            title="Smazat vybraný objekt (klávesa Delete)">✕ Smazat</button>
        )}

        <div className="ml-auto flex gap-1">
          <button type="button" onClick={undo} disabled={historyCount <= 1}
            className="px-2.5 py-1.5 text-xs font-medium rounded border bg-white text-slate-700 border-slate-300 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Zpět">↩ Zpět</button>
          <button type="button" onClick={clearAll}
            className="px-2.5 py-1.5 text-xs font-medium rounded border bg-white text-red-600 border-red-200 hover:bg-red-50"
            title="Smazat vše">🗑 Smazat vše</button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative border border-slate-300 rounded-lg overflow-hidden shadow-inner bg-white"
        style={{ cursor: cursorMap[tool] }}>
        <canvas
          ref={visRef}
          width={W}
          height={H}
          className="w-full block"
          style={{ touchAction: 'none' }}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onLeave}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
          onTouchCancel={onLeave}
        />

        {status !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-center px-4">
            {status === 'loading'
              ? 'Načítám náčrt…'
              : 'Uložený náčrt se nepodařilo načíst. Původní data zůstala beze změny a editor je zablokován.'}
          </div>
        )}

        {/* Floating text input */}
        {textOverlay && (
          <div className="absolute" style={{
            left: `${(textOverlay.x / W) * 100}%`,
            top: `${(textOverlay.y / H) * 100}%`,
            transform: 'translate(-2px, -14px)',
          }}>
            <input
              autoFocus
              type="text"
              value={textOverlay.val}
              onChange={e => setTextOverlay(prev => prev ? { ...prev, val: e.target.value } : null)}
              onKeyDown={e => { if (e.key === 'Enter') confirmText(); if (e.key === 'Escape') setTextOverlay(null); }}
              onBlur={confirmText}
              className="border border-blue-500 rounded px-1 py-0.5 text-sm shadow-lg bg-white/95 min-w-28"
              placeholder="Popisek..."
            />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-2 bg-slate-50 rounded border border-slate-100 text-xs text-[var(--text-muted)]">
        <span>Legenda LPS (ČSN EN 62305):</span>
        <span className="font-medium text-blue-800">J = Jímač</span>
        <span className="font-medium text-green-800">S = Svod</span>
        <span className="font-medium text-orange-900">E = Uzemnění</span>
        <span>━ = Vedení</span>
        {tool === 'select' && selectedSym && <span className="text-blue-600 font-medium">Symbol vybrán – táhněte nebo otočte ↺↻, smažte ✕</span>}
        {tool === 'select' && selectedShape && <span className="text-blue-600 font-medium">Objekt vybrán – táhněte pro přesun{selectedShape.kind !== 'text' ? ', úchyty mění velikost' : ''}, barvu a tloušťku změníte v liště, smažte ✕ / Delete</span>}
      </div>

      <p className="text-xs text-[var(--text-secondary)]">
        Schéma se automaticky ukládá do revize a bude vytisknuto jako příloha zprávy.
      </p>
    </div>
  );
};