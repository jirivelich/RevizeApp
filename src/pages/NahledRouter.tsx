import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { revizeService } from '../services/database';
import { ReportPrintPage } from './ReportPrint';
import { HromosvodPrintPage } from './HromosvodPrint';
import { StrojniZarizeniPrintPage } from './StrojniZarizeniPrint';
import './ReportPrint/print.css';

/**
 * Router-wrapper pro tiskový náhled.
 * Toolbar je v normálním document flow – PagedJS ho nemůže ovlivnit.
 * Layout: toolbar (flex-shrink:0) + scroll oblast (flex:1) = 100vh.
 */
export function NahledRouter() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [kategorie, setKategorie] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    revizeService.getById(parseInt(id))
      .then(revize => {
        const raw = revize?.kategorieRevize;
        setKategorie(raw ? String(raw).trim().toLowerCase() : 'elektro');
      })
      .catch(() => setKategorie('elektro'))
      .finally(() => setLoading(false));
  }, [id]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="nahled-waiting">
          <span>Načítání...</span>
        </div>
      );
    }
    if (kategorie === 'hromosvod') return <HromosvodPrintPage />;
    if (kategorie === 'stroje') return <StrojniZarizeniPrintPage />;
    return <ReportPrintPage />;
  };

  return (
    <div className="nahled-shell">
      <div className="nahled-toolbar">
        <button
          className="nahled-btn nahled-btn--back"
          onClick={() => navigate(-1)}
          aria-label="Zpět"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Zpět
        </button>
        <div style={{ flex: 1 }} />
        <button
          className="nahled-btn nahled-btn--print"
          onClick={() => window.print()}
          disabled={loading}
          aria-label="Tisk"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Tisk
        </button>
      </div>
      <div className="nahled-scroll">
        {renderContent()}
      </div>
    </div>
  );
}
