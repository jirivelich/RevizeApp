import { useState, useMemo } from 'react';
import { Button, Modal } from '../../components/ui';
import type { Revize, MericiPristroj, PredvolenyText } from '../../types';
import { useAddPristrojToRevize, useRemovePristrojFromRevize } from '../../hooks/useQueries';
import { TW, SectionHeader, ToggleSectionHeader } from './tw';
import { PredvolenyTextBtn } from './PredvolenyTextBtn';

interface MereniOdporu {
  bod: string;
  hodnota: string;
  limit: string;
  vyhovuje: boolean;
}

interface HromosvodZarizeniTabProps {
  revize: Revize;
  formData: Partial<Revize>;
  setFormData: (data: Partial<Revize>) => void;
  vlastniTexty: PredvolenyText[];
  pouzitePristroje: MericiPristroj[];
  vsechnyPristroje: MericiPristroj[];
  revizeId: number;
  saveNow?: () => void;
}

const STAV_OPTIONS = [
  { value: '', label: '-- Vyberte --' },
  { value: 'vyhovující', label: 'Vyhovující' },
  { value: 'nevyhovující', label: 'Nevyhovující' },
  { value: 'částečně vyhovující', label: 'Částečně vyhovující' },
];

const stavColor = (stav?: string) => {
  switch (stav) {
    case 'vyhovující': return 'text-emerald-700 bg-emerald-50';
    case 'nevyhovující': return 'text-red-700 bg-red-50';
    case 'částečně vyhovující': return 'text-amber-700 bg-amber-50';
    default: return 'text-[var(--text-muted)]';
  }
};

export function HromosvodZarizeniTab({
  revize, formData, setFormData,
  vlastniTexty,
  pouzitePristroje, vsechnyPristroje,
  revizeId,
  saveNow,
}: HromosvodZarizeniTabProps) {
  const [isPristrojModalOpen, setIsPristrojModalOpen] = useState(false);
  const addPristroj = useAddPristrojToRevize();
  const removePristroj = useRemovePristrojFromRevize();

  // Měření odporů
  const mereni: MereniOdporu[] = useMemo(() => {
    try {
      return formData.hromosvodMereniOdporu ? JSON.parse(formData.hromosvodMereniOdporu) : [];
    } catch { return []; }
  }, [formData.hromosvodMereniOdporu]);

  const setMereni = (data: MereniOdporu[]) => {
    setFormData({ ...formData, hromosvodMereniOdporu: JSON.stringify(data) });
  };

  const addMereni = () => {
    setMereni([...mereni, { bod: `Svod ${mereni.length + 1}`, hodnota: '', limit: '15', vyhovuje: true }]);
  };

  const updateMereni = (index: number, field: keyof MereniOdporu, value: string | boolean) => {
    const updated = [...mereni];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-evaluate vyhovuje
    if (field === 'hodnota' || field === 'limit') {
      const hod = parseFloat(updated[index].hodnota);
      const lim = parseFloat(updated[index].limit);
      updated[index].vyhovuje = !isNaN(hod) && !isNaN(lim) && hod <= lim;
    }
    setMereni(updated);
  };

  const removeMereni = (index: number) => {
    setMereni(mereni.filter((_, i) => i !== index));
  };

  // Tisk sekce
  const tiskSekce: Record<string, boolean> = useMemo(
    () => formData.tiskSekce ? JSON.parse(formData.tiskSekce) : {},
    [formData.tiskSekce]
  );
  const isSekceVisible = (key: string) => tiskSekce[key] !== false;
  const toggleSekce = (key: string) => {
    const updated = { ...tiskSekce, [key]: !isSekceVisible(key) };
    setFormData({ ...formData, tiskSekce: JSON.stringify(updated) });
  };

  return (
    <>
    <div className={TW.page}>

      {/* ═══ DŮVOD MIMOŘÁDNÉ ═══ */}
      {(formData.typRevize === 'mimořádná' || revize?.typRevize === 'mimořádná') && (
        <div className={TW.card}>
          <SectionHeader className="bg-amber-600">Důvod mimořádné revize</SectionHeader>
          <div className="p-4">
            <input className={TW.input} value={formData.duvodMimoradne || ''} onChange={(e) => setFormData({ ...formData, duvodMimoradne: e.target.value })} placeholder="Např. po úderu blesku, rekonstrukce střechy..." />
          </div>
        </div>
      )}

      {/* ═══ 01 – ROZSAH REVIZE ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="01" visible={isSekceVisible('rozsahRevize')} onToggle={() => toggleSekce('rozsahRevize')}>
          Rozsah revize
        </ToggleSectionHeader>
        <div className="p-4 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={TW.label}>Předmět revize</label>
              <PredvolenyTextBtn field="rozsahRevize" value={formData.rozsahRevize || ''} onChange={(text) => setFormData({ ...formData, rozsahRevize: text })} vlastniTexty={vlastniTexty} />
            </div>
            <textarea className={TW.textarea} rows={2} placeholder="Systém ochrany před bleskem (LPS) objektu..." value={formData.rozsahRevize || ''} onChange={(e) => setFormData({ ...formData, rozsahRevize: e.target.value })} />
          </div>
          <div>
            <label className={TW.label}>Předmětem revize není/nejsou</label>
            <textarea className={TW.textarea + ' mt-1'} rows={2} placeholder="Elektrická instalace objektu, spotřebiče..." value={formData.predmetNeni || ''} onChange={(e) => setFormData({ ...formData, predmetNeni: e.target.value })} />
          </div>
        </div>
      </div>

      {/* ═══ 02 – JÍMACÍ SOUSTAVA ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="02" visible={isSekceVisible('jimaciSoustava')} onToggle={() => toggleSekce('jimaciSoustava')}>
          1. Jímací soustava
        </ToggleSectionHeader>
        <div className="p-4 space-y-3">
          <div className={TW.grid2}>
            <div className="flex flex-col gap-1">
              <label className={TW.label}>Typ jímače</label>
              <select className={TW.selectFull} value={formData.hromosvodJimaciTyp || ''} onChange={(e) => { setFormData({ ...formData, hromosvodJimaciTyp: e.target.value }); saveNow?.(); }}>
                <option value="">-- Vyberte --</option>
                <option value="tyčový">Tyčový</option>
                <option value="mřížový">Mřížový (Faradayova klec)</option>
                <option value="vodicový">Vodicový (hřebenový)</option>
                <option value="kombinovaný">Kombinovaný</option>
                <option value="aktivní">Aktivní jímač (ESE)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={TW.label}>Materiál</label>
              <select className={TW.selectFull} value={formData.hromosvodJimaciMaterial || ''} onChange={(e) => { setFormData({ ...formData, hromosvodJimaciMaterial: e.target.value }); saveNow?.(); }}>
                <option value="">-- Vyberte --</option>
                <option value="ocel pozinkovaná">Ocel pozinkovaná (FeZn)</option>
                <option value="nerezová ocel">Nerezová ocel</option>
                <option value="hliník">Hliník (Al)</option>
                <option value="měď">Měď (Cu)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={TW.label}>Stav</label>
              <select className={`${TW.selectFull} ${stavColor(formData.hromosvodJimaciStav)}`} value={formData.hromosvodJimaciStav || ''} onChange={(e) => { setFormData({ ...formData, hromosvodJimaciStav: e.target.value as any }); saveNow?.(); }}>
                {STAV_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={TW.label}>Poznámka</label>
            <textarea className={TW.textarea + ' mt-1'} rows={2} placeholder="Stav jímačů, koroze, upevnění..." value={formData.hromosvodJimaciPoznamka || ''} onChange={(e) => setFormData({ ...formData, hromosvodJimaciPoznamka: e.target.value })} />
          </div>
        </div>
      </div>

      {/* ═══ 03 – SVODOVÉ VEDENÍ ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="03" visible={isSekceVisible('svodoveVedeni')} onToggle={() => toggleSekce('svodoveVedeni')}>
          2. Svodové vedení
        </ToggleSectionHeader>
        <div className="p-4 space-y-3">
          <div className={TW.grid3}>
            <div className="flex flex-col gap-1">
              <label className={TW.label}>Počet svodů</label>
              <input type="number" className={TW.input} min={0} value={formData.hromosvodSvodyPocet ?? ''} onChange={(e) => setFormData({ ...formData, hromosvodSvodyPocet: e.target.value ? parseInt(e.target.value) : undefined })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={TW.label}>Materiál</label>
              <select className={TW.selectFull} value={formData.hromosvodSvodyMaterial || ''} onChange={(e) => { setFormData({ ...formData, hromosvodSvodyMaterial: e.target.value }); saveNow?.(); }}>
                <option value="">-- Vyberte --</option>
                <option value="ocel pozinkovaná">Ocel pozinkovaná (FeZn)</option>
                <option value="nerezová ocel">Nerezová ocel</option>
                <option value="hliník">Hliník (Al)</option>
                <option value="měď">Měď (Cu)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={TW.label}>Průřez / profil</label>
              <input className={TW.input} placeholder="např. FeZn Ø8mm, pásek 30×4mm" value={formData.hromosvodSvodyPrurez || ''} onChange={(e) => setFormData({ ...formData, hromosvodSvodyPrurez: e.target.value })} />
            </div>
          </div>
          <div className={TW.grid3}>
            <div className="flex flex-col gap-1">
              <label className={TW.label}>Zkušební svorky</label>
              <div className="flex items-center gap-2">
                <input type="number" className={TW.input} min={0} value={formData.hromosvodSvodyZkusebniSvorky ?? ''} onChange={(e) => setFormData({ ...formData, hromosvodSvodyZkusebniSvorky: e.target.value ? parseInt(e.target.value) : undefined })} />
                <span className="text-xs text-[var(--text-secondary)]">ks</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className={TW.label}>Stav</label>
              <select className={`${TW.selectFull} ${stavColor(formData.hromosvodSvodyStav)}`} value={formData.hromosvodSvodyStav || ''} onChange={(e) => { setFormData({ ...formData, hromosvodSvodyStav: e.target.value as any }); saveNow?.(); }}>
                {STAV_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={TW.label}>Poznámka</label>
            <textarea className={TW.textarea + ' mt-1'} rows={2} placeholder="Vedení svodů, stav úchytek, ochranné trubky..." value={formData.hromosvodSvodyPoznamka || ''} onChange={(e) => setFormData({ ...formData, hromosvodSvodyPoznamka: e.target.value })} />
          </div>
        </div>
      </div>

      {/* ═══ 04 – UZEMŇOVACÍ SOUSTAVA ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="04" visible={isSekceVisible('uzemnovaciSoustava')} onToggle={() => toggleSekce('uzemnovaciSoustava')}>
          3. Uzemňovací soustava
        </ToggleSectionHeader>
        <div className="p-4 space-y-3">
          <div className={TW.grid3}>
            <div className="flex flex-col gap-1">
              <label className={TW.label}>Typ uzemnění</label>
              <select className={TW.selectFull} value={formData.hromosvodUzemneniTyp || ''} onChange={(e) => { setFormData({ ...formData, hromosvodUzemneniTyp: e.target.value }); saveNow?.(); }}>
                <option value="">-- Vyberte --</option>
                <option value="základový">Základový (v fundamentu)</option>
                <option value="obvodový">Obvodový (pásek kolem budovy)</option>
                <option value="tyčový">Tyčový (hloubkový)</option>
                <option value="kombinovaný">Kombinovaný</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={TW.label}>Materiál</label>
              <select className={TW.selectFull} value={formData.hromosvodUzemneniMaterial || ''} onChange={(e) => { setFormData({ ...formData, hromosvodUzemneniMaterial: e.target.value }); saveNow?.(); }}>
                <option value="">-- Vyberte --</option>
                <option value="ocel pozinkovaná">Ocel pozinkovaná (FeZn)</option>
                <option value="měděný pásek">Měděný pásek (Cu)</option>
                <option value="nerezová ocel">Nerezová ocel</option>
                <option value="pozinkovaný pásek">Pozinkovaný pásek 30×4mm</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={TW.label}>Stav</label>
              <select className={`${TW.selectFull} ${stavColor(formData.hromosvodUzemneniStav)}`} value={formData.hromosvodUzemneniStav || ''} onChange={(e) => { setFormData({ ...formData, hromosvodUzemneniStav: e.target.value as any }); saveNow?.(); }}>
                {STAV_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={TW.label}>Poznámka</label>
            <textarea className={TW.textarea + ' mt-1'} rows={2} placeholder="Stav zemničů, koroze, zapojení..." value={formData.hromosvodUzemneniPoznamka || ''} onChange={(e) => setFormData({ ...formData, hromosvodUzemneniPoznamka: e.target.value })} />
          </div>
        </div>
      </div>

      {/* ═══ 05 – OCHRANNÉ POSPOJOVÁNÍ / SPD ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="05" visible={isSekceVisible('spd')} onToggle={() => toggleSekce('spd')}>
          4. Ochranné pospojování a přepěťové ochrany (SPD)
        </ToggleSectionHeader>
        <div className="p-4 space-y-3">
          <div className={TW.grid2}>
            <div className="flex flex-col gap-1">
              <label className={TW.label}>Typ SPD</label>
              <input className={TW.input} placeholder="T1, T2, T1+T2 kombinovaný..." value={formData.hromosvodSpdTyp || ''} onChange={(e) => setFormData({ ...formData, hromosvodSpdTyp: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={TW.label}>Stav SPD</label>
              <select className={`${TW.selectFull} ${formData.hromosvodSpdStav === 'vyhovující' ? 'text-emerald-700 bg-emerald-50' : formData.hromosvodSpdStav === 'nevyhovující' ? 'text-red-700 bg-red-50' : formData.hromosvodSpdStav === 'nenainstalováno' ? 'text-amber-700 bg-amber-50' : ''}`}
                value={formData.hromosvodSpdStav || ''} onChange={(e) => setFormData({ ...formData, hromosvodSpdStav: e.target.value as any })}>
                <option value="">-- Vyberte --</option>
                <option value="vyhovující">Vyhovující</option>
                <option value="nevyhovující">Nevyhovující</option>
                <option value="nenainstalováno">Nenainstalováno</option>
              </select>
            </div>
          </div>
          <div>
            <label className={TW.label}>Ekvipotenciální přípojnice</label>
            <textarea className={TW.textarea + ' mt-1'} rows={2} placeholder="Popis hlavní ekvipotenciální přípojnice (HEP)..." value={formData.hromosvodEkvipotencialni || ''} onChange={(e) => setFormData({ ...formData, hromosvodEkvipotencialni: e.target.value })} />
          </div>
          <div>
            <label className={TW.label}>Poznámka</label>
            <textarea className={TW.textarea + ' mt-1'} rows={2} placeholder="Stav přepěťových ochran, indikátory..." value={formData.hromosvodSpdPoznamka || ''} onChange={(e) => setFormData({ ...formData, hromosvodSpdPoznamka: e.target.value })} />
          </div>
        </div>
      </div>

      {/* ═══ 06 – MĚŘENÍ ODPORŮ UZEMNĚNÍ ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="06" visible={isSekceVisible('mereniOdporu')} onToggle={() => toggleSekce('mereniOdporu')}>
          5. Měření odporů uzemnění
        </ToggleSectionHeader>
        <div className="p-4">
          {mereni.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-slate-200 rounded overflow-hidden">
                <thead>
                  <tr>
                    <th className={TW.th}>Měřicí bod</th>
                    <th className={TW.th + ' w-28'}>Naměřeno [Ω]</th>
                    <th className={TW.th + ' w-28'}>Limit [Ω]</th>
                    <th className={TW.th + ' text-center w-24'}>Výsledek</th>
                    <th className={TW.th + ' text-center w-16'}>Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {mereni.map((m, i) => (
                    <tr key={i} className="border-t border-slate-200">
                      <td className={TW.td}>
                        <input className={TW.tblInput} value={m.bod} onChange={(e) => updateMereni(i, 'bod', e.target.value)} />
                      </td>
                      <td className={TW.td}>
                        <input type="text" className={TW.tblInput + ' text-right'} value={m.hodnota} onChange={(e) => updateMereni(i, 'hodnota', e.target.value)} placeholder="0.00" />
                      </td>
                      <td className={TW.td}>
                        <input type="text" className={TW.tblInput + ' text-right'} value={m.limit} onChange={(e) => updateMereni(i, 'limit', e.target.value)} placeholder="15" />
                      </td>
                      <td className={TW.td + ' text-center'}>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${m.vyhovuje ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {m.vyhovuje ? 'Vyhovuje' : 'Nevyhovuje'}
                        </span>
                      </td>
                      <td className={TW.td + ' text-center'}>
                        <button onClick={() => removeMereni(i)} className="text-red-500 hover:text-red-700 text-xs font-medium cursor-pointer" title="Odebrat">
                          <svg className="w-4 h-4 mx-auto" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">Zatím žádná měření. Přidejte měřicí body tlačítkem níže.</p>
          )}
          <div className="flex items-center justify-between mt-3">
            <Button size="sm" onClick={addMereni}>+ Přidat měřicí bod</Button>
            {mereni.length > 0 && (
              <div className="text-xs text-[var(--text-muted)]">
                {mereni.filter(m => m.vyhovuje).length}/{mereni.length} vyhovuje |
                {mereni.some(m => m.hodnota) && (
                  <> Průměr: {(mereni.filter(m => m.hodnota).reduce((s, m) => s + parseFloat(m.hodnota || '0'), 0) / Math.max(1, mereni.filter(m => m.hodnota).length)).toFixed(2)} Ω</>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 07 – ZÁVĚR ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="07" visible={isSekceVisible('zaver')} onToggle={() => toggleSekce('zaver')}>
          Závěr revize
        </ToggleSectionHeader>
        <div className="p-4">
          <div className="flex justify-end mb-1">
            <PredvolenyTextBtn field="zaver" value={formData.zaver || ''} onChange={(text) => setFormData({ ...formData, zaver: text })} vlastniTexty={vlastniTexty} />
          </div>
          <textarea className={TW.textarea} rows={4} placeholder="Závěr revize hromosvodové soustavy..." value={formData.zaver || ''} onChange={(e) => setFormData({ ...formData, zaver: e.target.value })} />
        </div>
      </div>

      {/* ═══ 08 – POUŽITÉ PŘÍSTROJE ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="08" visible={isSekceVisible('pristroje')} onToggle={() => toggleSekce('pristroje')}>
          Použité měřicí přístroje
        </ToggleSectionHeader>
        <div className="p-4">
          {pouzitePristroje.length > 0 ? (
            <div className="space-y-2">
              {pouzitePristroje.map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded border border-slate-200 text-sm">
                  <div>
                    <span className="font-medium">{p.nazev}</span>
                    <span className="text-[var(--text-secondary)] ml-2">{p.vyrobce} {p.model}</span>
                    <span className="text-[var(--text-secondary)] ml-2">v.č. {p.vyrobniCislo}</span>
                    <span className="text-[var(--text-secondary)] ml-2">Kal. do: {new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ')}</span>
                  </div>
                  <button onClick={() => removePristroj.mutate({ revizeId, pristrojId: p.id! })} className="text-red-500 hover:text-red-700 text-xs font-medium cursor-pointer">Odebrat</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)] py-2">Žádné přístroje nepřiřazeny.</p>
          )}
          <Button size="sm" variant="secondary" onClick={() => setIsPristrojModalOpen(true)} className="mt-2">+ Přidat přístroj</Button>
        </div>
      </div>

      {/* ═══ 09 – PODKLADY ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="09" visible={isSekceVisible('podklady')} onToggle={() => toggleSekce('podklady')}>
          Podklady pro revizi
        </ToggleSectionHeader>
        <div className="p-4">
          <div className="flex justify-end mb-1">
            <PredvolenyTextBtn field="podklady" value={formData.podklady || ''} onChange={(text) => setFormData({ ...formData, podklady: text })} vlastniTexty={vlastniTexty} />
          </div>
          <textarea className={TW.textarea} rows={3} placeholder="Projektová dokumentace, předchozí revize, protokoly měření..." value={formData.podklady || ''} onChange={(e) => setFormData({ ...formData, podklady: e.target.value })} />
        </div>
      </div>

      {/* ═══ 10 – VYHODNOCENÍ PŘEDCHOZÍCH ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="10" visible={isSekceVisible('vyhodnoceniPredchozich')} onToggle={() => toggleSekce('vyhodnoceniPredchozich')}>
          Vyhodnocení předchozích revizí
        </ToggleSectionHeader>
        <div className="p-4">
          <div className="flex justify-end mb-1">
            <PredvolenyTextBtn field="vyhodnoceniPredchozich" value={formData.vyhodnoceniPredchozich || ''} onChange={(text) => setFormData({ ...formData, vyhodnoceniPredchozich: text })} vlastniTexty={vlastniTexty} />
          </div>
          <textarea className={TW.textarea} rows={2} value={formData.vyhodnoceniPredchozich || ''} onChange={(e) => setFormData({ ...formData, vyhodnoceniPredchozich: e.target.value })} placeholder="Předchozí revize nebyla předložena..." />
        </div>
      </div>

    </div>

    {/* ═══ MODAL: Přidat přístroj ═══ */}
    <Modal
      isOpen={isPristrojModalOpen}
      onClose={() => setIsPristrojModalOpen(false)}
      title="Přiřadit měřicí přístroj"
    >
      <div className="space-y-2">
        {vsechnyPristroje.filter(p => !pouzitePristroje.some(pp => pp.id === p.id)).length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Všechny přístroje jsou již přiřazeny nebo nemáte žádné v databázi.</p>
        ) : (
          vsechnyPristroje.filter(p => !pouzitePristroje.some(pp => pp.id === p.id)).map(p => (
            <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded border border-slate-200 hover:bg-slate-50">
              <div className="text-sm">
                <span className="font-medium">{p.nazev}</span>
                <span className="text-[var(--text-secondary)] ml-2">{p.vyrobce} {p.model}</span>
                <span className="text-[var(--text-secondary)] ml-2">v.č. {p.vyrobniCislo}</span>
              </div>
              <Button size="sm" onClick={() => { addPristroj.mutate({ revizeId, pristrojId: p.id! }); setIsPristrojModalOpen(false); }}>Přidat</Button>
            </div>
          ))
        )}
      </div>
    </Modal>
    </>
  );
}
