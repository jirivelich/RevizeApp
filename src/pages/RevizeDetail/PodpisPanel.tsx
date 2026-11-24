/**
 * Elektronický podpis revizní zprávy.
 * Zprávu technik stáhne (náhled → PDF), podepíše mimo aplikaci (bankovní identita, certifikát…)
 * a podepsané PDF nahraje zpět. Server ověří podpis a uloží soubor jako originál zprávy.
 */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal } from '../../components/ui';
import { queryKeys } from '../../hooks/queryKeys';
import { podpisService } from '../../services/podpis';
import type { Revize } from '../../types';

const datumCas = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' }) : '–');

interface PodpisPanelProps {
  revize: Revize;
  /** Revize je dokončená a zamčená – jen tehdy lze nahrát podepsanou zprávu. */
  zamcena: boolean;
}

export function PodpisPanel({ revize, zamcena }: PodpisPanelProps) {
  const revizeId = revize.id!;
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pracuje, setPracuje] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [potvrditOdebrani, setPotvrditOdebrani] = useState(false);

  const podepsano = !!revize.podepsanoAt;
  const { data: zprava } = useQuery({
    queryKey: [...queryKeys.revize.detail(revizeId), 'podpis'],
    queryFn: () => podpisService.get(revizeId),
    enabled: podepsano && navigator.onLine,
  });

  if (!zamcena && !podepsano) return null;

  const obnovit = async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.revize.detail(revizeId) });
    await qc.invalidateQueries({ queryKey: queryKeys.revize.all });
  };

  const akce = async (popis: string, fn: () => Promise<unknown>) => {
    setPracuje(popis);
    setChyba(null);
    try {
      await fn();
    } catch (e) {
      setChyba((e as Error).message);
    } finally {
      setPracuje(null);
    }
  };

  const nahrat = (file: File | undefined) => {
    if (!file) return;
    void akce('Ověřuji podpis…', async () => {
      await podpisService.nahrat(revizeId, file);
      await obnovit();
    });
  };

  const fileInput = (
    <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden"
      onChange={(e) => { nahrat(e.target.files?.[0]); e.target.value = ''; }} />
  );

  const chybaBox = chyba && (
    <p role="alert" className="text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger)]/25 rounded-[var(--radius-md)] px-3 py-2">
      {chyba}
    </p>
  );

  // ── Podepsáno ──
  if (podepsano) {
    const zastarala = !!revize.podpisZastaraly;
    return (
      <div className={`rounded-lg border p-3 text-sm flex flex-col gap-2 ${zastarala
        ? 'border-[var(--warning-text)] bg-[var(--warning-bg)]'
        : 'border-[var(--success)] bg-[var(--success-bg)]'}`}>
        {fileInput}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <span className={`font-semibold ${zastarala ? 'text-[var(--warning-text)]' : 'text-[var(--success-text)]'}`}>
              ✍ Zpráva je elektronicky podepsána{revize.podepsal ? ` – ${revize.podepsal}` : ''}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              Podepsáno {datumCas(revize.podepsanoAt)}
              {zprava?.vydavatel ? ` · certifikát vydal ${zprava.vydavatel}` : ''}
              {zprava && (zprava.kvalifikovany ? ' · kvalifikovaný certifikát' : ' · certifikát není označen jako kvalifikovaný')}
            </span>
            {zprava && !zprava.kvalifikovany && (
              <span className="text-xs text-[var(--warning-text)]">
                Pro předání úřadům se vyžaduje uznávaný podpis (kvalifikovaný certifikát). Ověřte podpis v Adobe Readeru.
              </span>
            )}
            {zastarala && (
              <span className="text-xs text-[var(--warning-text)]">
                Revize byla po podpisu odemčena ({datumCas(revize.podpisZastaraly)}). Podepsaná zpráva nemusí odpovídat
                aktuálnímu obsahu – po dokončení stáhněte novou zprávu, podepište ji a nahrajte znovu.
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={!!pracuje}
              onClick={() => void akce('Stahuji…', () => podpisService.stahnout(revizeId))}>
              Stáhnout podepsaný originál
            </Button>
            {zamcena && (
              <Button size="sm" variant="secondary" disabled={!!pracuje} onClick={() => inputRef.current?.click()}>
                {pracuje === 'Ověřuji podpis…' ? pracuje : 'Nahrát znovu'}
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={!!pracuje} onClick={() => setPotvrditOdebrani(true)}>Odebrat</Button>
          </div>
        </div>
        {chybaBox}
        <Modal isOpen={potvrditOdebrani} onClose={() => setPotvrditOdebrani(false)} title="Odebrat podepsanou zprávu" size="sm"
          footer={<>
            <Button variant="secondary" onClick={() => setPotvrditOdebrani(false)}>Zrušit</Button>
            <Button variant="danger" onClick={() => { setPotvrditOdebrani(false); void akce('Odebírám…', async () => { await podpisService.odebrat(revizeId); await obnovit(); }); }}>
              Odebrat
            </Button>
          </>}>
          <p className="text-sm text-[var(--text)]">Podepsané PDF se z aplikace smaže a revize bude opět čekat na podpis. Pokračovat?</p>
        </Modal>
      </div>
    );
  }

  // ── Čeká na podpis ──
  return (
    <div className="rounded-lg border border-[var(--border-medium)] bg-[var(--bg-surface)] p-3 text-sm flex flex-col gap-2">
      {fileInput}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-[var(--text)]">Zpráva čeká na elektronický podpis</span>
          <span className="text-xs text-[var(--text-secondary)]">
            1. Stáhněte PDF v náhledu · 2. Podepište ho (např. přes bankovní identitu) · 3. Nahrajte podepsaný soubor –
            aplikace ověří podpis a uloží ho jako originál zprávy.
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/revize/${revizeId}/nahled`}
            className="inline-flex items-center px-3 h-8 rounded-[var(--radius-md)] border border-[var(--border-medium)] text-xs font-medium text-[var(--text)] hover:bg-[var(--bg-hover)]">
            1. Stáhnout PDF
          </Link>
          <Button size="sm" disabled={!!pracuje} onClick={() => inputRef.current?.click()}>
            {pracuje ?? '3. Nahrát podepsané PDF'}
          </Button>
        </div>
      </div>
      {chybaBox}
    </div>
  );
}
