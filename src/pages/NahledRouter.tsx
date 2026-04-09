import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { revizeService } from '../services/database';
import { ReportPrintPage } from './ReportPrint';
import { HromosvodPrintPage } from './HromosvodPrint';
import { StrojniZarizeniPrintPage } from './StrojniZarizeniPrint';

const FabButtons = ({ onBack }: { onBack: () => void }) => createPortal(
  <div className="report-fab-group">
    <button className="report-fab report-fab--back" onClick={onBack} title="Zpět" aria-label="Zpět">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      <span>Zpět</span>
    </button>
    <button className="report-fab report-fab--print" onClick={() => window.print()} title="Tisk" aria-label="Tisk">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      <span>Tisk</span>
    </button>
  </div>,
  document.body
);

/**
 * Router-wrapper pro tiskový náhled – podle kategorieRevize
 * deleguje na správný PrintPage komponent.
 */
export function NahledRouter() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [kategorie, setKategorie] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    return <><FabButtons onBack={() => navigate(-1)} /><HromosvodPrintPage /></>;
  }

  if (kategorie === 'stroje') {
    return <><FabButtons onBack={() => navigate(-1)} /><StrojniZarizeniPrintPage /></>;
  }

  return <><FabButtons onBack={() => navigate(-1)} /><ReportPrintPage /></>;
}
