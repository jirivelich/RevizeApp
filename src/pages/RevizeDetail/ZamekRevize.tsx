import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Modal } from '../../components/ui';
import { buildApiUrl, getAuthHeaders, handleResponse } from '../../services/httpClient';
import { queryKeys } from '../../hooks/queryKeys';

/** Stavy, ve kterých je revize zamčená (musí odpovídat serveru). */
export const ZAMCENE_STAVY = ['dokončeno', 'schváleno'];
export const jeRevizeZamcena = (stav?: string | null): boolean => !!stav && ZAMCENE_STAVY.includes(stav);

const TYPY_BEZ_TEXTU = ['checkbox', 'radio', 'file', 'range', 'color', 'button', 'submit', 'reset'];

/**
 * Převede obsah na režim jen pro čtení: textová pole zůstanou čitelná a jde z nich kopírovat (readOnly),
 * ostatní ovládací prvky se zablokují. Reaguje i na dynamicky přidaný obsah. Při odemknutí vše vrátí.
 * Skutečnou ochranu zajišťuje server, tohle je pouze pohodlí a vizuální zpětná vazba.
 */
export function useZamekDom(ref: RefObject<HTMLElement | null>, zamceno: boolean) {
  useEffect(() => {
    const kontejner = ref.current;
    if (!kontejner || !zamceno) return;
    const upravene: { el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement; atribut: 'readOnly' | 'disabled' }[] = [];

    const aplikuj = () => {
      kontejner.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach(el => {
        const atribut = el instanceof HTMLInputElement && TYPY_BEZ_TEXTU.includes(el.type) ? 'disabled' : 'readOnly';
        if (!el[atribut]) { el[atribut] = true; upravene.push({ el, atribut }); }
      });
      kontejner.querySelectorAll<HTMLSelectElement | HTMLButtonElement>('select, button').forEach(el => {
        if (!el.disabled) { el.disabled = true; upravene.push({ el, atribut: 'disabled' }); }
      });
    };

    aplikuj();
    const pozorovatel = new MutationObserver(aplikuj);
    pozorovatel.observe(kontejner, { childList: true, subtree: true });
    return () => {
      pozorovatel.disconnect();
      upravene.forEach(({ el, atribut }) => {
        if (el.isConnected) (el as unknown as Record<string, boolean>)[atribut] = false;
      });
    };
  }, [ref, zamceno]);
}

interface ZamekPruhProps {
  revizeId: number;
  cisloRevize: string;
  /** Voláno po úspěšném odemčení, aby stránka změnila stav ve formuláři. */
  onOdemceno: () => void;
}

/** Pruh „Revize je zamčena“ s odemknutím opsáním čísla revize. */
export function ZamekPruh({ revizeId, cisloRevize, onOdemceno }: ZamekPruhProps) {
  const qc = useQueryClient();
  const [otevreno, setOtevreno] = useState(false);
  const [opsane, setOpsane] = useState('');
  const [chyba, setChyba] = useState<string | null>(null);
  const [pracuje, setPracuje] = useState(false);

  const souhlasi = opsane.trim() === cisloRevize.trim() && cisloRevize.trim() !== '';

  const zavrit = () => { setOtevreno(false); setOpsane(''); setChyba(null); };

  const odemknout = async () => {
    if (!souhlasi) return;
    setPracuje(true);
    setChyba(null);
    try {
      const res = await fetch(buildApiUrl(`/revize/${revizeId}/odemknout`), {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ cisloRevize: opsane.trim() }),
      });
      await handleResponse<{ success: boolean }>(res);
      await qc.invalidateQueries({ queryKey: queryKeys.revize.detail(revizeId) });
      await qc.invalidateQueries({ queryKey: queryKeys.revize.all });
      onOdemceno();
      zavrit();
    } catch (e) {
      setChyba((e as Error).message);
    } finally {
      setPracuje(false);
    }
  };

  return (
    <>
      <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--warning-text)] bg-[var(--warning-bg)] p-3 text-sm text-[var(--warning-text)]">
        <span>
          <strong>Revize je dokončena a zamčena.</strong> Lze ji pouze číst a kopírovat z ní text. Pro úpravy ji odemkněte.
        </span>
        <Button size="sm" variant="secondary" onClick={() => setOtevreno(true)}>Odemknout</Button>
      </div>

      <Modal isOpen={otevreno} onClose={zavrit} title="Odemknout revizi" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={zavrit}>Zrušit</Button>
            <Button onClick={odemknout} disabled={!souhlasi || pracuje}>{pracuje ? 'Odemykám…' : 'Odemknout'}</Button>
          </>
        }>
        <div className="flex flex-col gap-3 text-sm text-[var(--text)]">
          <p>Dokončenou revizi je možné měnit až po odemčení. Změna se zapíše do historie. Pro potvrzení opište číslo revize:</p>
          <p className="text-center text-lg font-semibold select-all">{cisloRevize}</p>
          <input autoFocus className="w-full px-2.5 py-1.5 min-h-[40px] rounded-[var(--radius-md)] text-sm bg-[var(--bg-input)] text-[var(--text)] border border-[var(--border-input)]"
            value={opsane} onChange={(e) => setOpsane(e.target.value)} placeholder="Číslo revize" aria-label="Číslo revize"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void odemknout(); } }} />
          {chyba && <p role="alert" className="text-[var(--danger-text)]">{chyba}</p>}
        </div>
      </Modal>
    </>
  );
}
