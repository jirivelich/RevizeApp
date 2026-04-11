import React, { useRef, useEffect, useState } from 'react';

type Tool = 'jimaec' | 'svod' | 'uzemneni' | 'vedeni' | 'obdelnik' | 'pero' | 'text' | 'guma';

interface Props {
  value?: string; // base64 PNG data URL
  onChange: (dataUrl: string) => void;
}

const CANVAS_W = 900;
const CANVAS_H = 550;
const GUMA_R = 12;

// ─── LPS symbol renderers ───────────────────────────────────────────────────

function drawJimaec(ctx: CanvasRenderingContext2D, x: number, y: number, rotDeg = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotDeg * Math.PI) / 180);
  ctx.strokeStyle = '#1e3a8a';
  ctx.fillStyle = '#1e3a8a';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(0, -16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-5, -12); ctx.lineTo(0, -24); ctx.lineTo(5, -12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, 24); ctx.lineTo(10, 24); ctx.stroke();
  ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('J', 0, 36);
  ctx.restore();
}

function drawSvod(ctx: CanvasRenderingContext2D, x: number, y: number, rotDeg = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotDeg * Math.PI) / 180);
  ctx.strokeStyle = '#166534';
  ctx.fillStyle = '#166534';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, -9); ctx.stroke();
  ctx.strokeRect(-8, -9, 16, 13);
  ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 24); ctx.stroke();
  ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('S', 0, 36);
  ctx.restore();
}

function drawUzemneni(ctx: CanvasRenderingContext2D, x: number, y: number, rotDeg = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotDeg * Math.PI) / 180);
  ctx.strokeStyle = '#7c2d12';
  ctx.fillStyle = '#7c2d12';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 0); ctx.stroke();
  const bars = [18, 13, 8];
  for (let i = 0; i < bars.length; i++) {
    const hw = bars[i] / 2;
    const yy = i * 6;
    ctx.beginPath(); ctx.moveTo(-hw, yy); ctx.lineTo(hw, yy); ctx.stroke();
  }
  ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('E', 0, 26);
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= CANVAS_W; x += 25) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_H; y += 25) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
  }
  ctx.restore();
}

// ─── Component ───────────────────────────────────────────────────────────────

export const HromosvodNacrtCanvas: React.FC<Props> = ({ value, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('vedeni');
  const [color, setColor] = useState('#c00000');
  const [lineWidth, setLineWidth] = useState(2);
  const [historyCount, setHistoryCount] = useState(0);
  const [symbolRotation, setSymbolRotation] = useState<0 | 90 | 180 | 270>(0);

  const isSymbolTool = tool === 'jimaec' || tool === 'svod' || tool === 'uzemneni';

  function rotateLeft()  { setSymbolRotation(r => ((r - 90 + 360) % 360) as 0 | 90 | 180 | 270); }
  function rotateRight() { setSymbolRotation(r => ((r + 90) % 360) as 0 | 90 | 180 | 270); }

  // Drag state
  const isDragging = useRef(false);
  const startPt = useRef({ x: 0, y: 0 });
  const prevPt = useRef({ x: 0, y: 0 });
  const dragSnapshot = useRef<ImageData | null>(null);

  // History (ImageData stack)
  const history = useRef<ImageData[]>([]);
  const MAX_HIST = 40;

  // Text overlay
  const [textOverlay, setTextOverlay] = useState<{ x: number; y: number; visible: boolean; val: string } | null>(null);
  const textRef = useRef<HTMLInputElement>(null);

  // Initialize canvas
  const initialized = useRef(false);
  useEffect(() => {
    if (!canvasRef.current || initialized.current) return;
    initialized.current = true;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawGrid(ctx);
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        snapshot();
      };
      img.src = value;
    } else {
      snapshot();
    }
  }, []); // intentionally empty — runs once

  function snapshot() {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    history.current.push(data);
    if (history.current.length > MAX_HIST) history.current.shift();
    setHistoryCount(history.current.length);
  }

  function emit() {
    const url = canvasRef.current?.toDataURL('image/png');
    if (url) onChange(url);
  }

  function undo() {
    if (history.current.length <= 1) return;
    history.current.pop();
    const prev = history.current[history.current.length - 1];
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && prev) ctx.putImageData(prev, 0, 0);
    setHistoryCount(history.current.length);
    emit();
  }

  function clearAll() {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawGrid(ctx);
    snapshot();
    emit();
  }

  function getPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = CANVAS_W / rect.width;
    const sy = CANVAS_H / rect.height;
    if ('touches' in e) {
      const t = e.touches[0] ?? (e as React.TouchEvent).changedTouches[0];
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy };
    }
    const me = e as React.MouseEvent;
    return { x: (me.clientX - rect.left) * sx, y: (me.clientY - rect.top) * sy };
  }

  function onDown(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const pt = getPos(e);
    const ctx = canvasRef.current!.getContext('2d')!;

    if (tool === 'text') {
      setTextOverlay({ x: pt.x, y: pt.y, visible: true, val: '' });
      return;
    }

    // One-click symbol tools
    if (tool === 'jimaec')   { snapshot(); drawJimaec(ctx, pt.x, pt.y, symbolRotation);   emit(); return; }
    if (tool === 'svod')     { snapshot(); drawSvod(ctx, pt.x, pt.y, symbolRotation);     emit(); return; }
    if (tool === 'uzemneni') { snapshot(); drawUzemneni(ctx, pt.x, pt.y, symbolRotation); emit(); return; }

    // Drag-based tools
    isDragging.current = true;
    startPt.current = pt;
    prevPt.current = pt;

    if (tool === 'vedeni' || tool === 'obdelnik') {
      dragSnapshot.current = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    }
    if (tool === 'pero') {
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    }
  }

  function onMove(e: React.MouseEvent | React.TouchEvent) {
    if (!isDragging.current) return;
    e.preventDefault();
    const pt = getPos(e);
    const ctx = canvasRef.current!.getContext('2d')!;

    if (tool === 'vedeni' && dragSnapshot.current) {
      ctx.putImageData(dragSnapshot.current, 0, 0);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth + 1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startPt.current.x, startPt.current.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.restore();
    } else if (tool === 'obdelnik' && dragSnapshot.current) {
      ctx.putImageData(dragSnapshot.current, 0, 0);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.strokeRect(
        startPt.current.x, startPt.current.y,
        pt.x - startPt.current.x, pt.y - startPt.current.y,
      );
      ctx.restore();
    } else if (tool === 'pero') {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(prevPt.current.x, prevPt.current.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.restore();
    } else if (tool === 'guma') {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, GUMA_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Redraw grid only in the erased region
      ctx.save();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, GUMA_R + 1, 0, Math.PI * 2);
      ctx.clip();
      drawGrid(ctx);
      ctx.restore();
    }

    prevPt.current = pt;
  }

  function onUp(e: React.MouseEvent | React.TouchEvent) {
    if (!isDragging.current) return;
    isDragging.current = false;
    const pt = getPos(e);
    const ctx = canvasRef.current!.getContext('2d')!;

    if (tool === 'vedeni' && dragSnapshot.current) {
      ctx.putImageData(dragSnapshot.current, 0, 0);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth + 1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startPt.current.x, startPt.current.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.restore();
      dragSnapshot.current = null;
    } else if (tool === 'obdelnik' && dragSnapshot.current) {
      ctx.putImageData(dragSnapshot.current, 0, 0);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.strokeRect(
        startPt.current.x, startPt.current.y,
        pt.x - startPt.current.x, pt.y - startPt.current.y,
      );
      ctx.restore();
      dragSnapshot.current = null;
    }

    snapshot();
    emit();
  }

  function onLeave() {
    if (!isDragging.current) return;
    isDragging.current = false;
    dragSnapshot.current = null;
    snapshot();
    emit();
  }

  function confirmText() {
    if (!textOverlay) return;
    if (textOverlay.val.trim()) {
      const ctx = canvasRef.current!.getContext('2d')!;
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = `${lineWidth <= 1 ? 12 : lineWidth <= 2 ? 14 : 18}px sans-serif`;
      ctx.fillText(textOverlay.val, textOverlay.x, textOverlay.y);
      ctx.restore();
      snapshot();
      emit();
    }
    setTextOverlay(null);
  }

  const toolDefs: { id: Tool; label: string; title: string }[] = [
    { id: 'jimaec',   label: '⚡ Jímač',   title: 'Jímač (tyčový) — kliknutím umístíte symbol' },
    { id: 'svod',     label: '🔌 Svod',     title: 'Svod (svodové vedení) — kliknutím umístíte symbol se zkušební svorkou' },
    { id: 'uzemneni', label: '⏚ Uzemnění', title: 'Uzemnění (zemní elektroda) — kliknutím umístíte symbol' },
    { id: 'vedeni',   label: '━ Vedení',   title: 'Vedení hromosvodu — tažením nakreslíte vodič' },
    { id: 'obdelnik', label: '▭ Obdélník', title: 'Obdélník — tažením nakreslíte obdélník (půdorys objektu)' },
    { id: 'pero',     label: '✏ Pero',     title: 'Pero — volné kreslení (obrysy objektu, popisy)' },
    { id: 'text',     label: 'T Text',     title: 'Text — kliknutím přidáte textový popisek' },
    { id: 'guma',     label: '◻ Guma',     title: 'Guma — vymazání (zachovává mřížku)' },
  ];

  const cursorMap: Record<Tool, string> = {
    jimaec: 'crosshair', svod: 'crosshair', uzemneni: 'crosshair',
    vedeni: 'crosshair', obdelnik: 'crosshair', pero: 'crosshair', text: 'text', guma: 'cell',
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
        {/* Tool buttons */}
        <div className="flex flex-wrap gap-1">
          {toolDefs.map(t => (
            <button
              key={t.id}
              title={t.title}
              type="button"
              onClick={() => setTool(t.id)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors ${
                tool === t.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1 hidden sm:block" />

        {/* Color swatches */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500 hidden sm:inline">Barva:</span>
          {['#1a1a1a', '#c00000', '#1d4ed8', '#166534'].map(c => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${color === c ? 'border-slate-700 scale-110' : 'border-white shadow-sm'}`}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0"
            title="Vlastní barva"
          />
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1 hidden sm:block" />

        {/* Line width */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500 hidden sm:inline">Tloušťka:</span>
          {([1, 2, 4] as const).map(w => (
            <button
              key={w}
              type="button"
              onClick={() => setLineWidth(w)}
              className={`px-2 py-1 text-xs rounded border ${
                lineWidth === w ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              {w === 1 ? 'tenká' : w === 2 ? 'střední' : 'silná'}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1 hidden sm:block" />

        {/* Undo / Clear */}
        <button
          type="button"
          onClick={undo}
          disabled={historyCount <= 1}
          className="px-2.5 py-1.5 text-xs font-medium rounded border bg-white text-slate-700 border-slate-300 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Zpět (Ctrl+Z)"
        >
          ↩ Zpět
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="px-2.5 py-1.5 text-xs font-medium rounded border bg-white text-red-600 border-red-200 hover:bg-red-50"
          title="Smazat vše"
        >
          🗑 Smazat vše
        </button>
        {/* Symbol rotation — visible only for symbol tools */}
        {isSymbolTool && (
          <>
            <div className="w-px h-6 bg-slate-300 mx-1" />
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">Otočení:</span>
              <button type="button" onClick={rotateLeft}  title="Otočit doleva o 90°" className="px-2 py-1 text-xs rounded border bg-white text-slate-700 border-slate-300 hover:border-slate-400">↺</button>
              <span className="text-xs font-medium text-slate-700 w-8 text-center">{symbolRotation}°</span>
              <button type="button" onClick={rotateRight} title="Otočit doprava o 90°" className="px-2 py-1 text-xs rounded border bg-white text-slate-700 border-slate-300 hover:border-slate-400">↻</button>
            </div>
          </>
        )}
        <div className="ml-auto text-xs text-slate-400 hidden md:block">
          J = Jímač &nbsp;·&nbsp; S = Svod &nbsp;·&nbsp; E = Uzemnění
        </div>
      </div>

      {/* Canvas wrapper */}
      <div
        className="relative border border-slate-300 rounded-lg overflow-hidden shadow-inner bg-white"
        style={{ cursor: cursorMap[tool] }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
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
        {textOverlay?.visible && (
          <div
            className="absolute"
            style={{
              left: `${(textOverlay.x / CANVAS_W) * 100}%`,
              top: `${(textOverlay.y / CANVAS_H) * 100}%`,
              transform: 'translate(-2px, -14px)',
            }}
          >
            <input
              ref={textRef}
              autoFocus
              type="text"
              value={textOverlay.val}
              onChange={e => setTextOverlay(prev => prev ? { ...prev, val: e.target.value } : null)}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmText();
                if (e.key === 'Escape') setTextOverlay(null);
              }}
              onBlur={confirmText}
              className="border border-blue-500 rounded px-1 py-0.5 text-sm shadow-lg bg-white/95 min-w-28"
              placeholder="Popisek..."
            />
          </div>
        )}
      </div>

      {/* Symbol legend */}
      <div className="flex flex-wrap gap-4 p-2 bg-slate-50 rounded border border-slate-100 text-xs text-slate-500">
        <span>Legenda symbolů LPS (dle ČSN EN 62305):</span>
        <span className="font-medium text-blue-800">J = Jímač (air termination)</span>
        <span className="font-medium text-green-800">S = Svod (down conductor)</span>
        <span className="font-medium text-orange-900">E = Uzemnění (earth termination)</span>
        <span>━ = Vedení hromosvodu (conductor)</span>
      </div>

      <p className="text-xs text-slate-400">
        Schéma se automaticky ukládá do revize a bude vytisknuto jako příloha zprávy.
      </p>
    </div>
  );
};
