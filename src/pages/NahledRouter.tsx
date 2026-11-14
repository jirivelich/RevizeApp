import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildContext, type DocContext } from '../documents/context';
import { TPL } from '../documents/templates';
import { H } from '../documents/helpers';
import { DocumentViewer } from '../documents/DocumentViewer';

const TITLE_SUFFIX: Record<string, string> = {
  elektro: 'instalace',
  hromosvod: 'LPS',
  stroje: 'stroj',
  odberne_misto: 'odberne misto',
};

/**
 * Náhled dokumentů revize („list A4 na stole“) s exportem do PDF, Wordu a ZIP.
 * Dokumenty se skládají ze šablon v src/documents/templates podle kategorie revize.
 */
export function NahledRouter() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Výsledek načtení pro konkrétní id; dokud nesedí s aktuálním id, načítá se
  const [state, setState] = useState<{ id: string; ctx: DocContext | null; error: string | null } | null>(null);
  const loading = !!id && state?.id !== id;
  const ctx = loading ? null : state?.ctx ?? null;
  const error = loading ? null : state?.error ?? null;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    buildContext(parseInt(id, 10))
      .then(c => {
        if (cancelled) return;
        setState({ id, ctx: c, error: null });
        // Výchozí název souboru při „Tisk → Uložit jako PDF“
        document.title = [c.revize.cisloRevize, c.provozovatel.nazev, c.revize.adresa, TITLE_SUFFIX[c.revize.kategorieRevize] ?? '']
          .filter(Boolean)
          .join(' - ');
      })
      .catch(err => {
        if (!cancelled) setState({ id, ctx: null, error: err instanceof Error ? err.message : 'Chyba při načítání dat' });
      });
    return () => { cancelled = true; };
  }, [id]);

  const docs = useMemo(() => (ctx ? TPL.instances(ctx) : []), [ctx]);

  return (
    <DocumentViewer
      docs={docs}
      loading={loading}
      error={error}
      onBack={() => navigate(-1)}
      zipName={H.fileName(`${ctx?.revize.cisloRevize || 'revize'} dokumenty`)}
      devCheck={import.meta.env.DEV}
    />
  );
}
