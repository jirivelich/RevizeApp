/**
 * Náhled dokumentů jako „list A4 na stole“: výběr dokumentu, zvětšení, tisk, PDF, Word a ZIP.
 * Dokument se nejdřív rozstránkuje mimo obrazovku (bez zoomu) a výsledné HTML se zobrazí.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { DocInstance } from './registry';
import { paginate } from './paginate';
import { createOffscreenRoot } from './export/offscreen';
import { downloadBlob } from './export/zip';
import './doc.css';
import './stul.css';

const ZOOM_KEY = 'revize-nahled-zoom';
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 1.2;
const A4_PX = 794; // 210 mm při 96 dpi

function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 20) / 20));
}

function initialZoom(): number {
  try {
    const saved = parseFloat(localStorage.getItem(ZOOM_KEY) || '');
    if (Number.isFinite(saved)) return clampZoom(saved);
  } catch { /* localStorage nedostupné */ }
  if (typeof window === 'undefined') return 1;
  return clampZoom(Math.min(1, (window.innerWidth - 32) / A4_PX));
}

interface Props {
  docs: DocInstance[];
  loading?: boolean;
  error?: string | null;
  onBack?: () => void;
  /** Základ názvu ZIP souboru (bez přípony). */
  zipName: string;
  /** Kontrola přetečení stránek (vývoj). */
  devCheck?: boolean;
}

export function DocumentViewer({ docs, loading, error, onBack, zipName, devCheck }: Props) {
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [pagesHtml, setPagesHtml] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [overflow, setOverflow] = useState<number[]>([]);
  const [paginating, setPaginating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(initialZoom);
  const previewRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => docs.find(d => d.key === selectedKey) ?? docs[0],
    [docs, selectedKey],
  );

  // Rozstránkování vybraného dokumentu
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const root = createOffscreenRoot();
    setPaginating(true);
    paginate(root, selected.html)
      .then(res => {
        if (cancelled) return;
        setPagesHtml(res.html);
        setPageCount(res.pages);
        setOverflow(res.overflow);
      })
      .catch(err => {
        if (!cancelled) setMessage(`Dokument se nepodařilo připravit: ${err instanceof Error ? err.message : String(err)}`);
      })
      .finally(() => {
        root.remove();
        if (!cancelled) setPaginating(false);
      });
    return () => { cancelled = true; root.remove(); };
  }, [selected]);

  // Označit přetečené listy (vývoj)
  useEffect(() => {
    if (!devCheck || !previewRef.current) return;
    const pages = [...previewRef.current.querySelectorAll(':scope > .page')] as HTMLElement[];
    pages.forEach((p, i) => {
      if (overflow.includes(i) || p.scrollHeight > p.clientHeight + 1) p.setAttribute('data-overflow', '');
    });
  }, [pagesHtml, overflow, devCheck]);

  const changeZoom = (z: number) => {
    const v = clampZoom(z);
    setZoom(v);
    try { localStorage.setItem(ZOOM_KEY, String(v)); } catch { /* ignore */ }
  };

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      setMessage(`${label} se nezdařil: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(null);
    }
  }, []);

  const exportPdf = () => run('Export do PDF', async () => {
    const { renderPdfBlob } = await import('./export/pdf');
    downloadBlob(await renderPdfBlob(pagesHtml), `${selected.fileBase}.pdf`);
  });

  const exportWord = () => run('Export do Wordu', async () => {
    const { renderWordBlob } = await import('./export/word');
    downloadBlob(await renderWordBlob(pagesHtml, selected.title), `${selected.fileBase}.docx`);
  });

  const exportZip = () => run('Export všech dokumentů', async () => {
    const { renderAllZip } = await import('./export/zip');
    const blob = await renderAllZip(docs, (done, total) => setBusy(`Export ${Math.min(done + 1, total)}/${total}`));
    downloadBlob(blob, `${zipName}.zip`);
  });

  const ready = !!selected && !paginating && !!pagesHtml;
  const disabled = !ready || !!busy;
  const pageLabel = pageCount === 1 ? 'strana' : pageCount >= 2 && pageCount <= 4 ? 'strany' : 'stran';

  return (
    <div className="stul-shell">
      <div className="stul-toolbar">
        {onBack && (
          <button type="button" className="stul-btn" onClick={onBack} aria-label="Zpět">← Zpět</button>
        )}
        {docs.length > 1 && (
          <select
            className="stul-select"
            value={selected?.key ?? ''}
            onChange={e => setSelectedKey(e.target.value)}
            aria-label="Dokument"
          >
            {docs.map(d => <option key={d.key} value={d.key}>{d.title}</option>)}
          </select>
        )}
        {docs.length === 1 && <span className="stul-info">{docs[0].title}</span>}
        <span className="stul-zoom">
          <label htmlFor="stul-zoom" className="stul-info">Zvětšení</label>
          <input
            id="stul-zoom"
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.05}
            value={zoom}
            onChange={e => changeZoom(parseFloat(e.target.value))}
          />
          <output htmlFor="stul-zoom">{Math.round(zoom * 100)} %</output>
        </span>
        {ready && <span className="stul-info">{pageCount} {pageLabel}</span>}
        <span className="grow" />
        <button type="button" className="stul-btn" onClick={() => window.print()} disabled={disabled}>Tisk</button>
        <button type="button" className="stul-btn stul-btn--primary" onClick={exportPdf} disabled={disabled}>PDF</button>
        <button type="button" className="stul-btn stul-btn--primary" onClick={exportWord} disabled={disabled}>Word</button>
        {docs.length > 1 && (
          <button type="button" className="stul-btn" onClick={exportZip} disabled={disabled}>Vše (ZIP)</button>
        )}
        {busy && <span className="stul-info" role="status">{busy}…</span>}
        {message && <div className="stul-msg stul-msg--error" role="alert">{message}</div>}
        {devCheck && overflow.length > 0 && (
          <div className="stul-msg stul-msg--warn">Přetečení obsahu na listu: {overflow.map(i => i + 1).join(', ')}</div>
        )}
      </div>

      <div className="stul-scroll">
        {loading && <div className="stul-waiting">Načítání…</div>}
        {!loading && error && <div className="stul-waiting">{error}</div>}
        {!loading && !error && docs.length === 0 && <div className="stul-waiting">Pro tuto revizi nejsou žádné dokumenty.</div>}
        {!loading && !error && selected && (paginating || !pagesHtml) && <div className="stul-waiting">Připravuji stránky…</div>}
        <div
          ref={previewRef}
          className="doc-root"
          data-pages={pageCount}
          data-ready={ready ? '1' : '0'}
          style={{ '--doc-zoom': zoom, display: ready ? undefined : 'none' } as CSSProperties}
          // HTML pochází ze šablon, které všechna uživatelská data escapují (H.esc / H.v)
          dangerouslySetInnerHTML={{ __html: pagesHtml }}
        />
      </div>
    </div>
  );
}
