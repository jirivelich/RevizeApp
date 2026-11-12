import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui';
import { rozsahService, dokumentService } from '../../services/database';
import {
  DRUH_ROZSAHU_LABELS, DOKUMENT_STAV_LABELS,
  zkontrolujRozsahAPodklady, navrhTextChybejiciDokumentace, navrhTextRozsahu,
} from '../../services/rozsahKontrola';
import type { DruhRozsahu, Revize, RevizeDokument, RozsahPolozka } from '../../types';
import { TW, SectionHeader } from './tw';

interface RozsahTabProps {
  revizeId: number;
  formData: Partial<Revize>;
  setFormData: (data: Partial<Revize>) => void;
  saveNow?: () => void;
}

const TYP_LABELS: Record<RozsahPolozka['typ'], { nadpis: string; popis: string; duvodPovinny: boolean }> = {
  revidovano: { nadpis: 'Revidované části', popis: 'Rozvaděče, přívody, obvody a technologie, které jsou předmětem revize.', duvodPovinny: false },
  vyloucenoRozsah: { nadpis: 'Části vyloučené z rozsahu', popis: 'Části, které nejsou předmětem revize. Uveďte důvod omezení rozsahu.', duvodPovinny: true },
  neovereno: { nadpis: 'Části, které nebylo možné ověřit', popis: 'Nepřístupné nebo neověřené části a důvod, proč je nebylo možné posoudit.', duvodPovinny: true },
};

const UROVEN_STYL: Record<string, string> = {
  kriticka: 'border-[var(--danger-text)] bg-[var(--danger-bg)] text-[var(--danger-text)]',
  upozorneni: 'border-[var(--warning-text)] bg-[var(--warning-bg)] text-[var(--warning-text)]',
  doporuceni: 'border-[var(--border-medium)] bg-[var(--bg-faint)] text-[var(--text-secondary)]',
};
const UROVEN_LABEL: Record<string, string> = { kriticka: 'Kritická chyba', upozorneni: 'Upozornění', doporuceni: 'Doporučení' };

const prazdnyDokument = { nazev: '', druh: '', datumDokumentu: '', stav: 'predlozeno' as RevizeDokument['stav'], znemoznujeOvereni: false, poznamka: '' };

export function RozsahTab({ revizeId, formData, setFormData, saveNow }: RozsahTabProps) {
  const [polozky, setPolozky] = useState<RozsahPolozka[]>([]);
  const [dokumenty, setDokumenty] = useState<RevizeDokument[]>([]);
  const [chyba, setChyba] = useState<string | null>(null);
  const [drafty, setDrafty] = useState<Record<string, { nazev: string; duvod: string }>>({});
  const [novyDokument, setNovyDokument] = useState(prazdnyDokument);
  // Úprava existujících záznamů (inline)
  const [upravaPolozky, setUpravaPolozky] = useState<{ id: number; nazev: string; duvod: string } | null>(null);
  const [upravaDokumentu, setUpravaDokumentu] = useState<(typeof prazdnyDokument & { id: number }) | null>(null);

  const nacist = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([rozsahService.getByRevize(revizeId), dokumentService.getByRevize(revizeId)]);
      setPolozky(p);
      setDokumenty(d);
      setChyba(null);
    } catch (e) {
      setChyba((e as Error).message || 'Data se nepodařilo načíst. Záložka vyžaduje připojení k serveru.');
    }
  }, [revizeId]);

  useEffect(() => { void nacist(); }, [nacist]);

  const zjisteni = useMemo(
    () => zkontrolujRozsahAPodklady(formData.druhRozsahu, polozky, dokumenty),
    [formData.druhRozsahu, polozky, dokumenty],
  );
  const navrhDokumentace = useMemo(() => navrhTextChybejiciDokumentace(dokumenty), [dokumenty]);
  const navrhRozsah = useMemo(() => navrhTextRozsahu(polozky), [polozky]);

  const guard = async (fn: () => Promise<unknown>) => {
    try { await fn(); await nacist(); } catch (e) { setChyba((e as Error).message); }
  };

  const pridatPolozku = (typ: RozsahPolozka['typ']) => {
    const d = drafty[typ];
    if (!d?.nazev.trim()) return;
    void guard(async () => {
      await rozsahService.create({ revizeId, typ, nazev: d.nazev, duvod: d.duvod });
      setDrafty(prev => ({ ...prev, [typ]: { nazev: '', duvod: '' } }));
    });
  };

  const pridatDokument = () => {
    if (!novyDokument.nazev.trim()) return;
    void guard(async () => {
      await dokumentService.create({ revizeId, ...novyDokument });
      setNovyDokument(prazdnyDokument);
    });
  };

  /** Přidá návrh na konec pole revize. Text vkládá jen na pokyn technika, nic nepřepisuje. */
  const vlozitDoPole = (pole: 'podklady' | 'rozsahRevize' | 'predmetNeni', text: string) => {
    if (!text.trim()) return;
    const stavajici = (formData[pole] || '').trim();
    setFormData({ ...formData, [pole]: stavajici ? `${stavajici}\n${text}` : text });
    saveNow?.();
  };

  return (
    <div className={TW.page}>
      {chyba && <div role="alert" className="rounded-lg border border-[var(--danger-text)] bg-[var(--danger-bg)] p-3 text-sm text-[var(--danger-text)]">{chyba}</div>}

      {/* Kontrola */}
      <div className={TW.card} id="rozsah-kontrola">
        <SectionHeader>Kontrola rozsahu a podkladů</SectionHeader>
        <div className="p-4 flex flex-col gap-2">
          {zjisteni.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">V pořádku: nebyl zjištěn rozpor mezi druhem revize, rozsahem a evidovanými podklady.</p>
          ) : zjisteni.map((z, i) => (
            <a key={`${z.kod}-${i}`} href={`#rozsah-${z.pole}`}
              className={`block rounded-lg border p-3 text-sm no-underline ${UROVEN_STYL[z.uroven]}`}>
              <strong>{UROVEN_LABEL[z.uroven]}:</strong> {z.text}
            </a>
          ))}
          <p className="text-xs text-[var(--text-muted)]">Kontrola jen upozorňuje na rozpory. Odborné posouzení a závěr zůstává na revizním technikovi.</p>
        </div>
      </div>

      {/* Druh a účel */}
      <div className={TW.card} id="rozsah-druhRozsahu">
        <SectionHeader>Druh a účel revize</SectionHeader>
        <div className="p-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className={TW.label}>Druh revize z hlediska rozsahu *</span>
            <select className={TW.selectFull} value={formData.druhRozsahu || ''}
              onChange={(e) => { setFormData({ ...formData, druhRozsahu: (e.target.value || undefined) as DruhRozsahu | undefined }); saveNow?.(); }}>
              <option value="">– Nevyplněno –</option>
              {(Object.keys(DRUH_ROZSAHU_LABELS) as DruhRozsahu[]).map(k => <option key={k} value={k}>{DRUH_ROZSAHU_LABELS[k]}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={TW.label}>Účel revize (nepovinné)</span>
            <input className={TW.input} value={formData.ucelRevize || ''}
              onChange={(e) => setFormData({ ...formData, ucelRevize: e.target.value })} onBlur={() => saveNow?.()} />
          </label>
        </div>
      </div>

      {/* Položky rozsahu */}
      <div id="rozsah-rozsahPolozky" className="flex flex-col gap-4">
        {(Object.keys(TYP_LABELS) as RozsahPolozka['typ'][]).map(typ => {
          const info = TYP_LABELS[typ];
          const seznam = polozky.filter(p => p.typ === typ);
          const d = drafty[typ] || { nazev: '', duvod: '' };
          return (
            <div key={typ} className={TW.card}>
              <SectionHeader right={<span className="text-xs text-[var(--text-muted)]">{seznam.length}</span>}>{info.nadpis}</SectionHeader>
              <div className="p-4 flex flex-col gap-2">
                <p className="text-xs text-[var(--text-muted)]">{info.popis}</p>
                {seznam.map(p => upravaPolozky?.id === p.id ? (
                  <div key={p.id} className="flex flex-col gap-2 border-b border-[var(--border)] pb-2">
                    <div className={info.duvodPovinny ? TW.grid2 : ''}>
                      <input className={TW.input} aria-label="Název položky" value={upravaPolozky.nazev}
                        onChange={(e) => setUpravaPolozky({ ...upravaPolozky, nazev: e.target.value })} />
                      {info.duvodPovinny && (
                        <input className={TW.input} aria-label="Důvod" placeholder="Důvod *" value={upravaPolozky.duvod}
                          onChange={(e) => setUpravaPolozky({ ...upravaPolozky, duvod: e.target.value })} />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={!upravaPolozky.nazev.trim()} onClick={() => {
                        const u = upravaPolozky;
                        void guard(async () => { await rozsahService.update(u.id, { nazev: u.nazev, duvod: u.duvod }); setUpravaPolozky(null); });
                      }}>Uložit</Button>
                      <Button size="sm" variant="secondary" onClick={() => setUpravaPolozky(null)}>Zrušit</Button>
                    </div>
                  </div>
                ) : (
                  <div key={p.id} className="flex items-start gap-2 text-sm border-b border-[var(--border)] pb-2">
                    <div className="flex-1">
                      <div className="text-[var(--text)]">{p.nazev}</div>
                      {p.duvod && <div className="text-xs text-[var(--text-secondary)]">Důvod: {p.duvod}</div>}
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setUpravaPolozky({ id: p.id!, nazev: p.nazev, duvod: p.duvod || '' })}>Upravit</Button>
                    <Button size="sm" variant="secondary" onClick={() => guard(() => rozsahService.delete(p.id!))}>Smazat</Button>
                  </div>
                ))}
                <div className={info.duvodPovinny ? TW.grid2 : ''}>
                  <input className={TW.input} placeholder="Název (např. Rozvaděč RE, přívod, obvod)" value={d.nazev}
                    onChange={(e) => setDrafty(prev => ({ ...prev, [typ]: { ...d, nazev: e.target.value } }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); pridatPolozku(typ); } }} />
                  {info.duvodPovinny && (
                    <input className={TW.input} placeholder="Důvod *" value={d.duvod}
                      onChange={(e) => setDrafty(prev => ({ ...prev, [typ]: { ...d, duvod: e.target.value } }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); pridatPolozku(typ); } }} />
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={() => pridatPolozku(typ)}>+ Přidat</Button>
                  {seznam.length > 0 && typ === 'revidovano' && (
                    <Button size="sm" variant="secondary" onClick={() => vlozitDoPole('rozsahRevize', navrhRozsah.rozsah)}>Vložit do pole „Předmět revize je“</Button>
                  )}
                  {typ !== 'revidovano' && seznam.length > 0 && (
                    <span className="text-xs text-[var(--text-muted)] self-center">Tisknou se do zprávy automaticky v tabulce, ručně vkládat nemusíte.</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dokumenty */}
      <div className={TW.card} id="rozsah-dokumenty">
        <SectionHeader right={<span className="text-xs text-[var(--text-muted)]">{dokumenty.length}</span>}>Technická dokumentace (podklady)</SectionHeader>
        <div className="p-4 flex flex-col gap-3">
          {dokumenty.map(d => upravaDokumentu?.id === d.id ? (
            <div key={d.id} className="rounded-lg border border-[var(--border)] p-3 flex flex-col gap-2">
              <div className={TW.grid2}>
                <input className={TW.input} aria-label="Název dokumentu" placeholder="Název dokumentu *" value={upravaDokumentu.nazev}
                  onChange={(e) => setUpravaDokumentu({ ...upravaDokumentu, nazev: e.target.value })} />
                <input className={TW.input} aria-label="Druh dokumentu" placeholder="Druh" value={upravaDokumentu.druh}
                  onChange={(e) => setUpravaDokumentu({ ...upravaDokumentu, druh: e.target.value })} />
                <input className={TW.input} aria-label="Datum dokumentu" placeholder="Datum nebo revize dokumentu" value={upravaDokumentu.datumDokumentu}
                  onChange={(e) => setUpravaDokumentu({ ...upravaDokumentu, datumDokumentu: e.target.value })} />
                <select className={TW.selectFull} aria-label="Stav dokumentu" value={upravaDokumentu.stav}
                  onChange={(e) => setUpravaDokumentu({ ...upravaDokumentu, stav: e.target.value as RevizeDokument['stav'] })}>
                  {(Object.keys(DOKUMENT_STAV_LABELS) as RevizeDokument['stav'][]).map(k => <option key={k} value={k}>{DOKUMENT_STAV_LABELS[k]}</option>)}
                </select>
              </div>
              <input className={TW.input} aria-label="Poznámka" placeholder="Poznámka revizního technika" value={upravaDokumentu.poznamka}
                onChange={(e) => setUpravaDokumentu({ ...upravaDokumentu, poznamka: e.target.value })} />
              <label className="flex items-center gap-2 text-sm text-[var(--text)]">
                <input type="checkbox" checked={upravaDokumentu.znemoznujeOvereni}
                  onChange={(e) => setUpravaDokumentu({ ...upravaDokumentu, znemoznujeOvereni: e.target.checked })} />
                Chybějící nebo nevyhovující dokument znemožňuje potřebné ověření
              </label>
              <div className="flex gap-2">
                <Button size="sm" disabled={!upravaDokumentu.nazev.trim()} onClick={() => {
                  const { id: dokId, ...zmeny } = upravaDokumentu;
                  void guard(async () => { await dokumentService.update(dokId, zmeny); setUpravaDokumentu(null); });
                }}>Uložit</Button>
                <Button size="sm" variant="secondary" onClick={() => setUpravaDokumentu(null)}>Zrušit</Button>
              </div>
            </div>
          ) : (
            <div key={d.id} className="flex flex-wrap items-start gap-2 text-sm border-b border-[var(--border)] pb-2">
              <div className="flex-1 min-w-[200px]">
                <div className="text-[var(--text)]">{d.nazev}{d.druh ? ` (${d.druh})` : ''}{d.datumDokumentu ? `, ${d.datumDokumentu}` : ''}</div>
                {d.poznamka && <div className="text-xs text-[var(--text-secondary)]">{d.poznamka}</div>}
                {d.znemoznujeOvereni && <div className="text-xs text-[var(--danger-text)]">Znemožňuje potřebné ověření</div>}
              </div>
              <select className={TW.select} value={d.stav} aria-label={`Stav dokumentu ${d.nazev}`}
                onChange={(e) => guard(() => dokumentService.update(d.id!, { stav: e.target.value as RevizeDokument['stav'] }))}>
                {(Object.keys(DOKUMENT_STAV_LABELS) as RevizeDokument['stav'][]).map(k => <option key={k} value={k}>{DOKUMENT_STAV_LABELS[k]}</option>)}
              </select>
              <Button size="sm" variant="secondary" onClick={() => setUpravaDokumentu({
                id: d.id!, nazev: d.nazev, druh: d.druh || '', datumDokumentu: d.datumDokumentu || '', stav: d.stav,
                znemoznujeOvereni: !!d.znemoznujeOvereni, poznamka: d.poznamka || '',
              })}>Upravit</Button>
              <Button size="sm" variant="secondary" onClick={() => guard(() => dokumentService.delete(d.id!))}>Smazat</Button>
            </div>
          ))}

          <div className="rounded-lg border border-[var(--border)] p-3 flex flex-col gap-2">
            <span className={TW.label}>Přidat dokument</span>
            <div className={TW.grid2}>
              <input className={TW.input} placeholder="Název dokumentu *" value={novyDokument.nazev} onChange={(e) => setNovyDokument({ ...novyDokument, nazev: e.target.value })} />
              <input className={TW.input} placeholder="Druh (např. projekt, předchozí revize)" value={novyDokument.druh} onChange={(e) => setNovyDokument({ ...novyDokument, druh: e.target.value })} />
              <input className={TW.input} placeholder="Datum nebo revize dokumentu" value={novyDokument.datumDokumentu} onChange={(e) => setNovyDokument({ ...novyDokument, datumDokumentu: e.target.value })} />
              <select className={TW.selectFull} value={novyDokument.stav} aria-label="Stav nového dokumentu"
                onChange={(e) => setNovyDokument({ ...novyDokument, stav: e.target.value as RevizeDokument['stav'] })}>
                {(Object.keys(DOKUMENT_STAV_LABELS) as RevizeDokument['stav'][]).map(k => <option key={k} value={k}>{DOKUMENT_STAV_LABELS[k]}</option>)}
              </select>
            </div>
            <input className={TW.input} placeholder="Poznámka revizního technika" value={novyDokument.poznamka} onChange={(e) => setNovyDokument({ ...novyDokument, poznamka: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-[var(--text)]">
              <input type="checkbox" checked={novyDokument.znemoznujeOvereni} onChange={(e) => setNovyDokument({ ...novyDokument, znemoznujeOvereni: e.target.checked })} />
              Chybějící nebo nevyhovující dokument znemožňuje potřebné ověření
            </label>
            <div><Button size="sm" onClick={pridatDokument}>+ Přidat dokument</Button></div>
          </div>

          {navrhDokumentace && (
            <div className="rounded-lg border border-[var(--border-medium)] bg-[var(--bg-faint)] p-3 text-sm flex flex-col gap-2">
              <span className={TW.label}>Návrh textu o chybějící dokumentaci</span>
              <p className="text-[var(--text)]">{navrhDokumentace}</p>
              <p className="text-xs text-[var(--text-muted)]">Pouhé uvedení chybějící dokumentace nenahrazuje potřebné ověření. Text se vloží jen po kliknutí.</p>
              <div><Button size="sm" variant="secondary" onClick={() => vlozitDoPole('podklady', navrhDokumentace)}>Vložit do pole „Podklady“</Button></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
