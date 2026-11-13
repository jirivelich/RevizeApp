/**
 * Vývojová stránka /dev/sablony – vykreslí všechny šablony se vzorovými i prázdnými daty.
 * Parametry: ?k=elektro|hromosvod|stroje|odberne_misto&empty=1
 */
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { KategorieRevize } from '../types';
import { TPL } from './templates';
import { sampleContext, KATEGORIE_VSECHNY } from './fixtures';
import { DocumentViewer } from './DocumentViewer';

export default function DevSablony() {
  const [params] = useSearchParams();
  const k = (params.get('k') || 'elektro') as KategorieRevize;
  const empty = params.get('empty') === '1';
  const kategorie = KATEGORIE_VSECHNY.includes(k) ? k : 'elektro';

  const docs = useMemo(() => TPL.instances(sampleContext(kategorie, empty)), [kategorie, empty]);

  return <DocumentViewer docs={docs} zipName={`vzor_${kategorie}`} devCheck />;
}
