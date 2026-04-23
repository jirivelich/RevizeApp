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

interface StoredV2 {
  v: 2;
  full: string;  // composite PNG – for printing (bg + symbols)
  bg: string;    // clean bg PNG – for editing
  symbols: LpsSymbol[];
}

interface HistoryEntry {
  bg: ImageData;
  symbols: LpsSymbol[];
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
      ctx.strokeStyle = '#92c43b'; ctx.lineWidth = 1.5;
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

  const history = useRef<HistoryEntry[]>([]);

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

  // Render: bgCanvas → visible + symbols on top
  function fullRedraw(selId: string | null) {
    const vis = getVis();
    const bg  = bgElRef.current;
    if (!vis || !bg) return;
    vis.drawImage(bg, 0, 0);
    drawAllSymbols(vis, symRef.current, selId);
  }

  // Save current state to history
  function snapshot(syms: LpsSymbol[]) {
    const bg = getBg();
    if (!bg) return;
    history.current.push({ bg: bg.getImageData(0, 0, W, H), symbols: [...syms] });
    if (history.current.length > MAX_HIST) history.current.shift();
    setHistoryCount(history.current.length);
  }

  // Emit: composite PNG + clean bg + symbols as JSON
  function emitState(syms: LpsSymbol[], selId: string | null) {
    const vis     = getVis();
    const visEl   = visRef.current;
    const bgEl    = bgElRef.current;
    if (!vis || !visEl || !bgEl) return;
    // Clean render (no selection box) for printing
    vis.drawImage(bgEl, 0, 0);
    drawAllSymbols(vis, syms, null);
    const fullPng = visEl.toDataURL('image/png');
    const bgPng   = bgEl.toDataURL('image/png');
    const stored: StoredV2 = { v: 2, full: fullPng, bg: bgPng, symbols: syms };
    onChange(JSON.stringify(stored));
    // Restore with selection
    vis.drawImage(bgEl, 0, 0);
    drawAllSymbols(vis, syms, selId);
  }

  // ─── Init ────────────────────────────────────────────────────────────────
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const bgEl   = document.createElement('canvas');
    bgEl.width   = W; bgEl.height = H;
    bgElRef.current = bgEl;
    const bgCtx = bgEl.getContext('2d')!;
    bgCtx.fillStyle = '#ffffff';
    bgCtx.fillRect(0, 0, W, H);
    drawGrid(bgCtx);

    const boot = (loadedSyms: LpsSymbol[]) => {
      setSymbols(loadedSyms); symRef.current = loadedSyms;
      snapshot(loadedSyms);
      fullRedraw(null);
    };

    if (value) {
      if (value.startsWith('{')) {
        try {
          const parsed = JSON.parse(value) as StoredV2;
          if (parsed.v === 2) {
            const img = new Image();
            img.onload = () => { bgCtx.drawImage(img, 0, 0); boot(parsed.symbols ?? []); };
            img.src = parsed.bg;
            return;
          }
        } catch { /* fall through */ }
      }
      // Legacy: plain PNG — load into bg layer
      const img = new Image();
      img.onload = () => { bgCtx.drawImage(img, 0, 0); boot([]); };
      img.src = value;
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
    setSelectedId(null); selRef.current = null;
    setHistoryCount(history.current.length);
    fullRedraw(null);
    emitState(syms, null);
  }

  function clearAll() {
    const bgCtx = getBg();
    if (!bgCtx) return;
    bgCtx.fillStyle = '#ffffff'; bgCtx.fillRect(0, 0, W, H); drawGrid(bgCtx);
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
    if (!id) return;
    const newSyms = symRef.current.filter(s => s.id !== id);
    setSymbols(newSyms); symRef.current = newSyms;
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
    const pt  = getPos(e);
    const t   = toolRef.current;
    const vis = getVis();

    if (t === 'text') {
      setTextOverlay({ x: pt.x, y: pt.y, val: '' });
      return;
    }

    if (t === 'select') {
      const sym = findSym(pt);
      if (sym) {
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

    if (t === 'select' && dragSymId.current) {
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
      return;
    }

    if (t === 'pero') {
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
      bgCtx.save();
      bgCtx.fillStyle = '#ffffff';
      bgCtx.beginPath(); bgCtx.arc(pt.x, pt.y, GUMA_R, 0, Math.PI * 2); bgCtx.fill();
      bgCtx.beginPath(); bgCtx.arc(pt.x, pt.y, GUMA_R + 1, 0, Math.PI * 2); bgCtx.clip();
      drawGrid(bgCtx);
      bgCtx.restore();
      fullRedraw(selRef.current);
    }

    prevPt.current = pt;
  }

  function onUp(e: React.MouseEvent | React.TouchEvent) {
    if (!dragging.current) return;
    dragging.current = false;
    const pt    = getPos(e);
    const t     = toolRef.current;
    const bgCtx = getBg();

    if (t === 'select' && dragSymId.current) {
      // Commit symbol drag
      dragSymId.current = null;
      snapshot(symRef.current);
      emitState(symRef.current, selRef.current);
      return;
    }

    if (bgCtx) {
      if (t === 'vedeni' || t === 'obdelnik') {
        bgCtx.save();
        bgCtx.strokeStyle = colorRef.current;
        bgCtx.lineWidth   = lwRef.current + (t === 'vedeni' ? 1 : 0);
        bgCtx.lineCap     = 'round';
        if (t === 'vedeni') {
          bgCtx.beginPath();
          bgCtx.moveTo(startPt.current.x, startPt.current.y);
          bgCtx.lineTo(pt.x, pt.y);
          bgCtx.stroke();
        } else {
          bgCtx.strokeRect(startPt.current.x, startPt.current.y, pt.x - startPt.current.x, pt.y - startPt.current.y);
        }
        bgCtx.restore();
        dragSnap.current = null;
      }

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
        peroPath.current = [];
      }
    }

    snapshot(symRef.current);
    fullRedraw(selRef.current);
    emitState(symRef.current, selRef.current);
  }

  function onLeave() {
    if (!dragging.current) return;
    dragging.current  = false;
    dragSnap.current  = null;
    peroPath.current  = [];
    dragSymId.current = null;
    snapshot(symRef.current);
    fullRedraw(selRef.current);
    emitState(symRef.current, selRef.current);
  }

  function confirmText() {
    if (!textOverlay?.val.trim()) { setTextOverlay(null); return; }
    const bgCtx = getBg();
    if (bgCtx) {
      bgCtx.save();
      bgCtx.fillStyle = colorRef.current;
      bgCtx.font = `${lwRef.current <= 1 ? 12 : lwRef.current <= 2 ? 14 : 18}px sans-serif`;
      bgCtx.fillText(textOverlay.val, textOverlay.x, textOverlay.y);
      bgCtx.restore();
    }
    setTextOverlay(null);
    snapshot(symRef.current);
    fullRedraw(selRef.current);
    emitState(symRef.current, selRef.current);
  }

  // ─── Toolbar config ──────────────────────────────────────────────────────

  const toolDefs: { id: Tool; label: string; title: string }[] = [
    { id: 'select',   label: '↖ Výběr',    title: 'Výběr – kliknutím vyberte umístěný symbol; potom ho táhněte nebo potočte' },
    { id: 'jimaec',   label: '⚡ Jímač',   title: 'Jímač (tyčový) – kliknutím umístíte symbol' },
    { id: 'svod',     label: '🔌 Svod',     title: 'Svod (svodové vedení) – kliknutím umístíte symbol' },
    { id: 'uzemneni', label: '⏚ Uzemnění', title: 'Uzemnění (zemní elektroda) – kliknutím umístíte symbol' },
    { id: 'vedeni',   label: '━ Vedení',   title: 'Vedení hromosvodu – tažením nakreslete vodič' },
    { id: 'obdelnik', label: '▭ Obdélník', title: 'Obdélník – tažením nakreslete obrys objektu' },
    { id: 'pero',     label: '✏ Pero',     title: 'Pero – volné kreslení' },
    { id: 'text',     label: 'T Text',     title: 'Text – kliknutím přidejte popisek' },
    { id: 'guma',     label: '◻ Guma',     title: 'Guma – výmazání (zachovává mřížku)' },
  ];

  const cursorMap: Record<Tool, string> = {
    select: 'default', jimaec: 'crosshair', svod: 'crosshair', uzemneni: 'crosshair',
    vedeni: 'crosshair', obdelnik: 'crosshair', pero: 'crosshair', text: 'text', guma: 'cell',
  };

  // For selected symbol: show its current rotation; for new-symbol tools: show placement rotation
  const selectedSym   = selectedId ? symbols.find(s => s.id === selectedId) : null;
  const showRotCtrls  = isSymTool(tool) || (tool === 'select' && selectedId !== null);
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
            <button key={c} type="button" title={c} onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${color === c ? 'border-slate-700 scale-110' : 'border-white shadow-sm'}`}
            />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0" title="Vlastní barva" />
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1 hidden sm:block" />

        {/* Line width */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--text-muted)] hidden sm:inline">Tloušťka:</span>
          {([1, 2, 4] as const).map(w => (
            <button key={w} type="button" onClick={() => setLineWidth(w)}
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
            {tool === 'select' && selectedId && (
              <button type="button" onClick={deleteSelected}
                className="px-2 py-1 text-xs rounded border bg-white text-red-600 border-red-200 hover:bg-red-50"
                title="Smazat vybraný symbol">✕ Smazat</button>
            )}
          </div>
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
        />

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
        {tool === 'select' && selectedId && <span className="text-blue-600 font-medium">Symbol vybrán – táhněte nebo otočte ↺↻, smažte ✕</span>}
      </div>

      <p className="text-xs text-[var(--text-secondary)]">
        Schéma se automaticky ukládá do revize a bude vytisknuto jako příloha zprávy.
      </p>
    </div>
  );
};