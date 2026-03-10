import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { revizeService } from '../services/database';
import { ReportPrintPage } from './ReportPrint';
import { HromosvodPrintPage } from './HromosvodPrint';

/**
 * Router-wrapper pro tiskový náhled – podle kategorieRevize
 * deleguje na správný PrintPage komponent.
 */
export function NahledRouter() {
  const { id } = useParams<{ id: string }>();
  const [kategorie, setKategorie] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    revizeService.getById(parseInt(id)).then(revize => {
      setKategorie(revize?.kategorieRevize || 'elektro');
    }).catch(() => {
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

  return <ReportPrintPage />;
}
