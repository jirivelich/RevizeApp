import { useState, useMemo } from 'react';
import { Button, Card } from '../../components/ui';
import type { Revize, MericiPristroj, PredvolenyText } from '../../types';
import { useAddPristrojToRevize, useRemovePristrojFromRevize } from '../../hooks/useQueries';
import { SekceHeader } from './SekceHeader';
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
    default: return 'text-slate-500';
  }
};

export function HromosvodZarizeniTab({
  revize, formData, setFormData,
  vlastniTexty,
  pouzitePristroje, vsechnyPristroje,
  revizeId,
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

  const inputCls = "w-full px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const textareaCls = `${inputCls} resize-y`;
  const selectCls = "px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none";

  return (
    <>
    <div className="bg-white border border-slate-300 rounded-lg shadow-sm max-w-4xl mx-auto">
      {/* Záhlaví */}
      <div className="flex items-center px-4 py-2 bg-slate-50 border-b border-slate-200">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Revidované zařízení — Hromosvod</span>
      </div>

      {/* ═══ DŮVOD MIMOŘÁDNÉ ═══ */}
      {(formData.typRevize === 'mimořádná' || revize?.typRevize === 'mimořádná') && (
        <>
          <div className="bg-amber-600 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Důvod mimořádné revize</div>
          <div className="px-4 py-3 border-b border-slate-200">
            <input className={inputCls} value={formData.duvodMimoradne || ''} onChange={(e) => setFormData({ ...formData, duvodMimoradne: e.target.value })} placeholder="Např. po úderu blesku, rekonstrukce střechy..." />
          </div>
        </>
      )}

      {/* ═══ ROZSAH REVIZE ═══ */}
      <SekceHeader id="rozsahRevize" visible={isSekceVisible('rozsahRevize')} onToggle={() => toggleSekce('rozsahRevize')}>
        Rozsah revize
      </SekceHeader>
      <div className="px-4 py-3 border-b border-slate-200 space-y-2">
        <div>
          <label className="text-xs font-medium text-slate-500">Předmět revize</label>
          <PredvolenyTextBtn field="rozsahRevize" value={formData.rozsahRevize || ''} onChange={(text) => setFormData({ ...formData, rozsahRevize: text })} vlastniTexty={vlastniTexty} />
          <textarea className={textareaCls} rows={2} placeholder="Systém ochrany před bleskem (LPS) objektu..." value={formData.rozsahRevize || ''} onChange={(e) => setFormData({ ...formData, rozsahRevize: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Předmětem revize není</label>
          <textarea className={textareaCls} rows={2} placeholder="Elektrická instalace objektu, spotřebiče..." value={formData.predmetNeni || ''} onChange={(e) => setFormData({ ...formData, predmetNeni: e.target.value })} />
        </div>
      </div>

      {/* ═══ 1. JÍMACÍ SOUSTAVA ═══ */}
      <SekceHeader id="jimaciSoustava" visible={isSekceVisible('jimaciSoustava')} onToggle={() => toggleSekce('jimaciSoustava')}>
        1. Jímací soustava
      </SekceHeader>
      <table className="w-full text-sm border-collapse">
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="w-[180px] px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Typ jímače</td>
            <td className="px-4 py-2">
              <select className={selectCls} value={formData.hromosvodJimaciTyp || ''} onChange={(e) => setFormData({ ...formData, hromosvodJimaciTyp: e.target.value })}>
                <option value="">-- Vyberte --</option>
                <option value="tyčový">Tyčový</option>
                <option value="mřížový">Mřížový (Faradayova klec)</option>
                <option value="vodicový">Vodicový (hřebenový)</option>
                <option value="kombinovaný">Kombinovaný</option>
                <option value="aktivní">Aktivní jímač (ESE)</option>
              </select>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Materiál</td>
            <td className="px-4 py-2">
              <select className={selectCls} value={formData.hromosvodJimaciMaterial || ''} onChange={(e) => setFormData({ ...formData, hromosvodJimaciMaterial: e.target.value })}>
                <option value="">-- Vyberte --</option>
                <option value="ocel pozinkovaná">Ocel pozinkovaná (FeZn)</option>
                <option value="nerezová ocel">Nerezová ocel</option>
                <option value="hliník">Hliník (Al)</option>
                <option value="měď">Měď (Cu)</option>
              </select>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Stav</td>
            <td className="px-4 py-2">
              <select className={`${selectCls} ${stavColor(formData.hromosvodJimaciStav)}`} value={formData.hromosvodJimaciStav || ''} onChange={(e) => setFormData({ ...formData, hromosvodJimaciStav: e.target.value as any })}>
                {STAV_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Poznámka</td>
            <td className="px-4 py-2">
              <textarea className={textareaCls} rows={2} placeholder="Stav jímačů, koroze, upevnění..." value={formData.hromosvodJimaciPoznamka || ''} onChange={(e) => setFormData({ ...formData, hromosvodJimaciPoznamka: e.target.value })} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══ 2. SVODOVÉ VEDENÍ ═══ */}
      <SekceHeader id="svodoveVedeni" visible={isSekceVisible('svodoveVedeni')} onToggle={() => toggleSekce('svodoveVedeni')}>
        2. Svodové vedení
      </SekceHeader>
      <table className="w-full text-sm border-collapse">
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="w-[180px] px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Počet svodů</td>
            <td className="px-4 py-2">
              <input type="number" className={`${inputCls} w-24`} min={0} value={formData.hromosvodSvodyPocet ?? ''} onChange={(e) => setFormData({ ...formData, hromosvodSvodyPocet: e.target.value ? parseInt(e.target.value) : undefined })} />
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Materiál</td>
            <td className="px-4 py-2">
              <select className={selectCls} value={formData.hromosvodSvodyMaterial || ''} onChange={(e) => setFormData({ ...formData, hromosvodSvodyMaterial: e.target.value })}>
                <option value="">-- Vyberte --</option>
                <option value="ocel pozinkovaná">Ocel pozinkovaná (FeZn)</option>
                <option value="nerezová ocel">Nerezová ocel</option>
                <option value="hliník">Hliník (Al)</option>
                <option value="měď">Měď (Cu)</option>
              </select>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Průřez / profil</td>
            <td className="px-4 py-2">
              <input className={`${inputCls} w-48`} placeholder="např. FeZn Ø8mm, pásek 30×4mm" value={formData.hromosvodSvodyPrurez || ''} onChange={(e) => setFormData({ ...formData, hromosvodSvodyPrurez: e.target.value })} />
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Zkušební svorky</td>
            <td className="px-4 py-2">
              <input type="number" className={`${inputCls} w-24`} min={0} value={formData.hromosvodSvodyZkusebniSvorky ?? ''} onChange={(e) => setFormData({ ...formData, hromosvodSvodyZkusebniSvorky: e.target.value ? parseInt(e.target.value) : undefined })} />
              <span className="text-xs text-slate-400 ml-2">ks</span>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Stav</td>
            <td className="px-4 py-2">
              <select className={`${selectCls} ${stavColor(formData.hromosvodSvodyStav)}`} value={formData.hromosvodSvodyStav || ''} onChange={(e) => setFormData({ ...formData, hromosvodSvodyStav: e.target.value as any })}>
                {STAV_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Poznámka</td>
            <td className="px-4 py-2">
              <textarea className={textareaCls} rows={2} placeholder="Vedení svodů, stav úchytek, ochranné trubky..." value={formData.hromosvodSvodyPoznamka || ''} onChange={(e) => setFormData({ ...formData, hromosvodSvodyPoznamka: e.target.value })} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══ 3. UZEMŇOVACÍ SOUSTAVA ═══ */}
      <SekceHeader id="uzemnovaciSoustava" visible={isSekceVisible('uzemnovaciSoustava')} onToggle={() => toggleSekce('uzemnovaciSoustava')}>
        3. Uzemňovací soustava
      </SekceHeader>
      <table className="w-full text-sm border-collapse">
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="w-[180px] px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Typ uzemnění</td>
            <td className="px-4 py-2">
              <select className={selectCls} value={formData.hromosvodUzemneniTyp || ''} onChange={(e) => setFormData({ ...formData, hromosvodUzemneniTyp: e.target.value })}>
                <option value="">-- Vyberte --</option>
                <option value="základový">Základový (v fundamentu)</option>
                <option value="obvodový">Obvodový (pásek kolem budovy)</option>
                <option value="tyčový">Tyčový (hloubkový)</option>
                <option value="kombinovaný">Kombinovaný</option>
              </select>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Materiál</td>
            <td className="px-4 py-2">
              <select className={selectCls} value={formData.hromosvodUzemneniMaterial || ''} onChange={(e) => setFormData({ ...formData, hromosvodUzemneniMaterial: e.target.value })}>
                <option value="">-- Vyberte --</option>
                <option value="ocel pozinkovaná">Ocel pozinkovaná (FeZn)</option>
                <option value="měděný pásek">Měděný pásek (Cu)</option>
                <option value="nerezová ocel">Nerezová ocel</option>
                <option value="pozinkovaný pásek">Pozinkovaný pásek 30×4mm</option>
              </select>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Stav</td>
            <td className="px-4 py-2">
              <select className={`${selectCls} ${stavColor(formData.hromosvodUzemneniStav)}`} value={formData.hromosvodUzemneniStav || ''} onChange={(e) => setFormData({ ...formData, hromosvodUzemneniStav: e.target.value as any })}>
                {STAV_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Poznámka</td>
            <td className="px-4 py-2">
              <textarea className={textareaCls} rows={2} placeholder="Stav zemničů, koroze, zapojení..." value={formData.hromosvodUzemneniPoznamka || ''} onChange={(e) => setFormData({ ...formData, hromosvodUzemneniPoznamka: e.target.value })} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══ 4. OCHRANNÉ POSPOJOVÁNÍ / SPD ═══ */}
      <SekceHeader id="spd" visible={isSekceVisible('spd')} onToggle={() => toggleSekce('spd')}>
        4. Ochranné pospojování a přepěťové ochrany (SPD)
      </SekceHeader>
      <table className="w-full text-sm border-collapse">
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="w-[180px] px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Typ SPD</td>
            <td className="px-4 py-2">
              <input className={inputCls} placeholder="T1, T2, T1+T2 kombinovaný..." value={formData.hromosvodSpdTyp || ''} onChange={(e) => setFormData({ ...formData, hromosvodSpdTyp: e.target.value })} />
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Stav SPD</td>
            <td className="px-4 py-2">
              <select className={`${selectCls} ${formData.hromosvodSpdStav === 'vyhovující' ? 'text-emerald-700 bg-emerald-50' : formData.hromosvodSpdStav === 'nevyhovující' ? 'text-red-700 bg-red-50' : formData.hromosvodSpdStav === 'nenainstalováno' ? 'text-amber-700 bg-amber-50' : ''}`}
                value={formData.hromosvodSpdStav || ''} onChange={(e) => setFormData({ ...formData, hromosvodSpdStav: e.target.value as any })}>
                <option value="">-- Vyberte --</option>
                <option value="vyhovující">Vyhovující</option>
                <option value="nevyhovující">Nevyhovující</option>
                <option value="nenainstalováno">Nenainstalováno</option>
              </select>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Ekvipotenciální přípojnice</td>
            <td className="px-4 py-2">
              <textarea className={textareaCls} rows={2} placeholder="Popis hlavní ekvipotenciální přípojnice (HEP)..." value={formData.hromosvodEkvipotencialni || ''} onChange={(e) => setFormData({ ...formData, hromosvodEkvipotencialni: e.target.value })} />
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Poznámka</td>
            <td className="px-4 py-2">
              <textarea className={textareaCls} rows={2} placeholder="Stav přepěťových ochran, indikátory..." value={formData.hromosvodSpdPoznamka || ''} onChange={(e) => setFormData({ ...formData, hromosvodSpdPoznamka: e.target.value })} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══ 5. MĚŘENÍ ODPORŮ UZEMNĚNÍ ═══ */}
      <SekceHeader id="mereniOdporu" visible={isSekceVisible('mereniOdporu')} onToggle={() => toggleSekce('mereniOdporu')}>
        5. Měření odporů uzemnění
      </SekceHeader>
      <div className="px-4 py-3 border-b border-slate-200">
        {mereni.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded overflow-hidden">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-3 py-2 text-left font-medium text-slate-600 border-r border-slate-200">Měřicí bod</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 border-r border-slate-200 w-28">Naměřeno [Ω]</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 border-r border-slate-200 w-28">Limit [Ω]</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-600 border-r border-slate-200 w-24">Výsledek</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-600 w-16">Akce</th>
                </tr>
              </thead>
              <tbody>
                {mereni.map((m, i) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="px-3 py-1.5 border-r border-slate-200">
                      <input className="w-full px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" value={m.bod} onChange={(e) => updateMereni(i, 'bod', e.target.value)} />
                    </td>
                    <td className="px-3 py-1.5 border-r border-slate-200">
                      <input type="text" className="w-full px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none text-right" value={m.hodnota} onChange={(e) => updateMereni(i, 'hodnota', e.target.value)} placeholder="0.00" />
                    </td>
                    <td className="px-3 py-1.5 border-r border-slate-200">
                      <input type="text" className="w-full px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none text-right" value={m.limit} onChange={(e) => updateMereni(i, 'limit', e.target.value)} placeholder="15" />
                    </td>
                    <td className="px-3 py-1.5 border-r border-slate-200 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${m.vyhovuje ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {m.vyhovuje ? 'Vyhovuje' : 'Nevyhovuje'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-center">
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
          <p className="text-sm text-slate-400 text-center py-4">Zatím žádná měření. Přidejte měřicí body tlačítkem níže.</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <Button size="sm" onClick={addMereni}>+ Přidat měřicí bod</Button>
          {mereni.length > 0 && (
            <div className="text-xs text-slate-500">
              {mereni.filter(m => m.vyhovuje).length}/{mereni.length} vyhovuje |
              {mereni.some(m => m.hodnota) && (
                <> Průměr: {(mereni.filter(m => m.hodnota).reduce((s, m) => s + parseFloat(m.hodnota || '0'), 0) / Math.max(1, mereni.filter(m => m.hodnota).length)).toFixed(2)} Ω</>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ 6. ZÁVĚR / POZNÁMKA ═══ */}
      <SekceHeader id="zaver" visible={isSekceVisible('zaver')} onToggle={() => toggleSekce('zaver')}>
        Závěr revize
      </SekceHeader>
      <div className="px-4 py-3 border-b border-slate-200 space-y-2">
        <PredvolenyTextBtn field="zaver" value={formData.zaver || ''} onChange={(text) => setFormData({ ...formData, zaver: text })} vlastniTexty={vlastniTexty} />
        <textarea className={textareaCls} rows={4} placeholder="Závěr revize hromosvodové soustavy..." value={formData.zaver || ''} onChange={(e) => setFormData({ ...formData, zaver: e.target.value })} />
      </div>

      {/* ═══ 7. POUŽITÉ PŘÍSTROJE ═══ */}
      <SekceHeader id="pristroje" visible={isSekceVisible('pristroje')} onToggle={() => toggleSekce('pristroje')}>
        Použité měřicí přístroje
      </SekceHeader>
      <div className="px-4 py-3 border-b border-slate-200">
        {pouzitePristroje.length > 0 ? (
          <div className="space-y-2">
            {pouzitePristroje.map(p => (
              <div key={p.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded border border-slate-200 text-sm">
                <div>
                  <span className="font-medium">{p.nazev}</span>
                  <span className="text-slate-400 ml-2">{p.vyrobce} {p.model}</span>
                  <span className="text-slate-400 ml-2">v.č. {p.vyrobniCislo}</span>
                  <span className="text-slate-400 ml-2">Kal. do: {new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ')}</span>
                </div>
                <button onClick={() => removePristroj.mutate({ revizeId, pristrojId: p.id! })} className="text-red-500 hover:text-red-700 text-xs font-medium cursor-pointer">Odebrat</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 py-2">Žádné přístroje nepřiřazeny.</p>
        )}
        <Button size="sm" variant="secondary" onClick={() => setIsPristrojModalOpen(true)} className="mt-2">+ Přidat přístroj</Button>
      </div>

      {/* ═══ 8. PODKLADY ═══ */}
      <SekceHeader id="podklady" visible={isSekceVisible('podklady')} onToggle={() => toggleSekce('podklady')}>
        Podklady pro revizi
      </SekceHeader>
      <div className="px-4 py-3 border-b border-slate-200">
        <PredvolenyTextBtn field="podklady" value={formData.podklady || ''} onChange={(text) => setFormData({ ...formData, podklady: text })} vlastniTexty={vlastniTexty} />
        <textarea className={textareaCls} rows={3} placeholder="Projektová dokumentace, předchozí revize, protokoly měření..." value={formData.podklady || ''} onChange={(e) => setFormData({ ...formData, podklady: e.target.value })} />
      </div>

      {/* ═══ 9. VYHODNOCENÍ PŘEDCHOZÍCH ═══ */}
      <SekceHeader id="vyhodnoceniPredchozich" visible={isSekceVisible('vyhodnoceniPredchozich')} onToggle={() => toggleSekce('vyhodnoceniPredchozich')}>
        Vyhodnocení předchozích revizí
      </SekceHeader>
      <div className="px-4 py-3">
        <PredvolenyTextBtn field="vyhodnoceniPredchozich" value={formData.vyhodnoceniPredchozich || ''} onChange={(text) => setFormData({ ...formData, vyhodnoceniPredchozich: text })} vlastniTexty={vlastniTexty} />
        <textarea className={textareaCls} rows={2} value={formData.vyhodnoceniPredchozich || ''} onChange={(e) => setFormData({ ...formData, vyhodnoceniPredchozich: e.target.value })} placeholder="Předchozí revize nebyla předložena..." />
      </div>
    </div>

    {/* ═══ MODAL: Přidat přístroj ═══ */}
    {isPristrojModalOpen && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setIsPristrojModalOpen(false)}>
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Přiřadit měřicí přístroj</h3>
            <button onClick={() => setIsPristrojModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">X</button>
          </div>
          <div className="p-4 space-y-2">
            {vsechnyPristroje.filter(p => !pouzitePristroje.some(pp => pp.id === p.id)).length === 0 ? (
              <p className="text-sm text-slate-400">Všechny přístroje jsou již přiřazeny nebo nemáte žádné v databázi.</p>
            ) : (
              vsechnyPristroje.filter(p => !pouzitePristroje.some(pp => pp.id === p.id)).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded border border-slate-200 hover:bg-slate-50">
                  <div className="text-sm">
                    <span className="font-medium">{p.nazev}</span>
                    <span className="text-slate-400 ml-2">{p.vyrobce} {p.model}</span>
                    <span className="text-slate-400 ml-2">v.č. {p.vyrobniCislo}</span>
                  </div>
                  <Button size="sm" onClick={() => { addPristroj.mutate({ revizeId, pristrojId: p.id! }); setIsPristrojModalOpen(false); }}>Přidat</Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
