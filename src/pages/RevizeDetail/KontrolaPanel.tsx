import { useEffect, useMemo, useState } from 'react';
import type { Revize, RevizeDokument, RozsahPolozka, Zavada } from '../../types';
import { rozsahService, dokumentService } from '../../services/database';
import { POCET_UROVNI, navrhniZaver, zkontrolujPredDokoncenim, type ZalozkaRevize, type ZjisteniKontroly } from '../../services/kontrolaPredDokoncenim';

const STYL: Record<ZjisteniKontroly['uroven'], { stitek: string; barva: string }> = {
  kriticka: { stitek: 'Kritická chyba', barva: 'text-[var(--danger-text)] bg-[var(--danger-bg)] border-[var(--danger)]/30' },
  upozorneni: { stitek: 'Upozornění', barva: 'text-[var(--warning-text)] bg-[var(--warning-bg)] border-[var(--warning-text)]/30' },
  doporuceni: { stitek: 'Doporučení', barva: 'text-[var(--text-secondary)] bg-[var(--bg-hover)] border-[var(--border)]' },
};

const NAZVY_ZALOZEK: Record<ZalozkaRevize, string> = {
  info: 'Základní údaje', dokumentace: 'Revidované zařízení', rozsah: 'Rozsah a podklady', zavady: 'Závady',
  hromosvod_zarizeni: 'Revidované zařízení', strojni_zarizeni: 'Protokol strojního zařízení', odberne_misto: 'Odběrné místo',
};

interface Props {
  revizeId: number;
  formData: Partial<Revize>;
  zavady: Zavada[];
  pocetPristroju: number;
  /** Mění se při přepnutí záložky, aby se rozsah a podklady načetly znovu. */
  aktualniZalozka: string;
  onPrejit: (zalozka: ZalozkaRevize) => void;
  /** Technik potvrdil návrh: nastaví výsledek revize. Změna se zapíše do historie změn. */
  onPouzitVysledek: (vysledek: 'schopno' | 'neschopno') => void;
}

/** Panel „Kontrola před dokončením“: ukáže, co je před dokončením třeba doplnit nebo posoudit. */
export function KontrolaPanel({ revizeId, formData, zavady, pocetPristroju, aktualniZalozka, onPrejit, onPouzitVysledek }: Props) {
  const [polozky, setPolozky] = useState<RozsahPolozka[]>([]);
  const [dokumenty, setDokumenty] = useState<RevizeDokument[]>([]);
  const [nacteno, setNacteno] = useState(false);
  const [otevreno, setOtevreno] = useState(false);

  useEffect(() => {
    let zruseno = false;
    Promise.all([rozsahService.getByRevize(revizeId), dokumentService.getByRevize(revizeId)])
      .then(([p, d]) => { if (!zruseno) { setPolozky(p); setDokumenty(d); setNacteno(true); } })
      .catch(() => { if (!zruseno) setNacteno(false); }); // bez dat o rozsahu kontrolu nevyhodnocujeme
    return () => { zruseno = true; };
  }, [revizeId, aktualniZalozka]);

  const zjisteni = useMemo(
    () => zkontrolujPredDokoncenim({ revize: formData, zavady, rozsahPolozky: polozky, dokumenty, pocetPristroju }),
    [formData, zavady, polozky, dokumenty, pocetPristroju],
  );
  const navrh = useMemo(
    () => navrhniZaver({ revize: formData, zavady, rozsahPolozky: polozky, dokumenty, pocetPristroju }),
    [formData, zavady, polozky, dokumenty, pocetPristroju],
  );
  const pocty = POCET_UROVNI(zjisteni);
  const poradi = { kriticka: 0, upozorneni: 1, doporuceni: 2 } as const;
  const serazena = [...zjisteni].sort((a, b) => poradi[a.uroven] - poradi[b.uroven]);

  const shrnuti = !nacteno
    ? 'Rozsah a podklady se nepodařilo načíst, kontrola je neúplná.'
    : zjisteni.length === 0
      ? 'V pořádku: nebyl nalezen žádný rozpor ani chybějící údaj.'
      : `${pocty.kriticka} kritických, ${pocty.upozorneni} upozornění, ${pocty.doporuceni} doporučení`;
  const barva = pocty.kriticka > 0 ? STYL.kriticka.barva
    : pocty.upozorneni > 0 || !nacteno ? STYL.upozorneni.barva
    : 'text-[var(--success-text,var(--text))] bg-[var(--bg-hover)] border-[var(--border)]';

  return (
    <section aria-label="Kontrola před dokončením" className={`rounded-lg border p-3 text-sm ${barva}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span><strong>Kontrola před dokončením:</strong> {shrnuti}</span>
        {zjisteni.length > 0 && (
          <button type="button" className="underline cursor-pointer" aria-expanded={otevreno} onClick={() => setOtevreno(o => !o)}>
            {otevreno ? 'Skrýt' : 'Zobrazit'}
          </button>
        )}
      </div>
      {otevreno && (
        <ul className="mt-3 flex flex-col gap-2">
          {serazena.map((f, i) => (
            <li key={`${f.kod}-${i}`} className={`flex flex-wrap items-start justify-between gap-2 rounded-md border px-2.5 py-2 ${STYL[f.uroven].barva}`}>
              <span><strong>{STYL[f.uroven].stitek}:</strong> {f.text}</span>
              <button type="button" className="underline cursor-pointer whitespace-nowrap" onClick={() => onPrejit(f.zalozka)}>
                Přejít: {NAZVY_ZALOZEK[f.zalozka]}
              </button>
            </li>
          ))}
        </ul>
      )}
      {nacteno && (
        <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--bg-card,transparent)] p-2.5 text-[var(--text)]">
          <p><strong>Návrh závěru {navrh.navrh}:</strong> {navrh.popis}</p>
          <ul className="mt-1 list-disc pl-5 text-xs text-[var(--text-secondary)]">
            {navrh.duvody.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {navrh.vysledek ? (
              formData.vysledek === navrh.vysledek
                ? <span>Výsledek revize již odpovídá návrhu.</span>
                : <button type="button" className="underline cursor-pointer" onClick={() => onPouzitVysledek(navrh.vysledek!)}>
                    Potvrzuji a nastavit výsledek „{navrh.vysledek === 'schopno' ? 'schopno provozu' : 'neschopno provozu'}“
                  </button>
            ) : (
              <span>Aplikace nemá samostatnou hodnotu „nedostatečně ověřeno“. Výsledek určete sami a omezení uveďte v rozsahu a závěru.</span>
            )}
            <button type="button" className="underline cursor-pointer" onClick={() => onPrejit('rozsah')}>Přejít: Rozsah a podklady</button>
          </div>
        </div>
      )}
      <p className="mt-2 text-xs opacity-80">Kontrola je pomůcka. O obsahu a závěru revize rozhoduje a odpovídá revizní technik.</p>
    </section>
  );
}
