import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { revizeService } from '../services/database';
import { ReportPrintPage } from './ReportPrint';
import { HromosvodPrintPage } from './HromosvodPrint';
import { StrojniZarizeniPrintPage } from './StrojniZarizeniPrint';

/**
 * Router-wrapper pro tiskový náhled – podle kategorieRevize
 * deleguje na správný PrintPage komponent.
 */
export function NahledRouter() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [kategorie, setKategorie] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fabRef = useRef<HTMLDivElement | null>(null);

  // Plovoucí tlačítka renderujeme jako imperativní DOM uzel – mimo React strom
  // i mimo PagedJS dosah. PagedJS operuje uvnitř previewRef v PrintPage,
  // ale tento uzel připojujeme přímo na <body> a spravujeme ho ručně.
  useEffect(() => {
    if (loading) return;

    const fabEl = document.createElement('div');
    fabEl.className = 'report-fab-group';

    const backBtn = document.createElement('button');
    backBtn.className = 'report-fab report-fab--back';
    backBtn.title = 'Zpět';
    backBtn.setAttribute('aria-label', 'Zpět');
    backBtn.innerHTML =
      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg><span>Zpět</span>`;
    backBtn.addEventListener('click', () => navigate(-1));

    const printBtn = document.createElement('button');
    printBtn.className = 'report-fab report-fab--print';
    printBtn.title = 'Tisk';
    printBtn.setAttribute('aria-label', 'Tisk');
    printBtn.innerHTML =
      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg><span>Tisk</span>`;
    printBtn.addEventListener('click', () => window.print());

    fabEl.appendChild(backBtn);
    fabEl.appendChild(printBtn);
    document.body.appendChild(fabEl);
    fabRef.current = fabEl;

    return () => {
      document.body.removeChild(fabEl);
      fabRef.current = null;
    };
  }, [loading, navigate]);

  useEffect(() => {
    if (!id) return;
    revizeService.getById(parseInt(id)).then(revize => {
      const raw = revize?.kategorieRevize;
      const kat = raw ? String(raw).trim().toLowerCase() : 'elektro';
      console.log('[NahledRouter] revize id=', id, 'raw kategorieRevize=', JSON.stringify(raw), '→', kat);
      setKategorie(kat);
    }).catch((err) => {
      console.error('[NahledRouter] error loading revize:', err);
      setKategorie('elektro');
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-lg text-slate-600">Načítání...</div>
      </div>
    );
  }

  if (kategorie === 'hromosvod') {
    return <HromosvodPrintPage />;
  }

  if (kategorie === 'stroje') {
    return <StrojniZarizeniPrintPage />;
  }

  return <ReportPrintPage />;
}
