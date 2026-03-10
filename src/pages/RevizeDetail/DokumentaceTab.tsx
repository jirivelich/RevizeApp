import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal } from '../../components/ui';
import type { Revize, MericiPristroj, PredvolenyText } from '../../types';
import { useAddPristrojToRevize, useRemovePristrojFromRevize } from '../../hooks/useQueries';
import { aiApi } from '../../services/api';
import { AIAutofillButton } from '../../components/AIAutofillButton';
import { SekceHeader } from './SekceHeader';
import { PredvolenyTextBtn } from './PredvolenyTextBtn';

interface DokumentaceTabProps {
  revize: Revize;
  formData: Partial<Revize>;
  setFormData: (data: Partial<Revize>) => void;
  vlastniTexty: PredvolenyText[];
  pouzitePristroje: MericiPristroj[];
  vsechnyPristroje: MericiPristroj[];
  revizeId: number;
}

export function DokumentaceTab({
  revize, formData, setFormData,
  vlastniTexty,
  pouzitePristroje, vsechnyPristroje,
  revizeId,
}: DokumentaceTabProps) {
  const [isPristrojModalOpen, setIsPristrojModalOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const addPristroj = useAddPristrojToRevize();
  const removePristroj = useRemovePristrojFromRevize();

  const handleAIGenerateReport = async () => {
    if (!revizeId) return;
    setAiGenerating(true);
    try {
      const { text } = await aiApi.generateReport(revizeId);
      setFormData({ ...formData, zaver: text });
    } catch (err: any) {
      alert(err.message || 'Chyba AI generování');
    } finally {
      setAiGenerating(false);
    }
  };

  const tiskSekce: Record<string, boolean> = useMemo(
    () => formData.tiskSekce ? JSON.parse(formData.tiskSekce) : {},
    [formData.tiskSekce]
  );

  const isSekceVisible = (key: string) => tiskSekce[key] !== false; // default true

  const toggleSekce = (key: string) => {
    const updated = { ...tiskSekce, [key]: !isSekceVisible(key) };
    setFormData({ ...formData, tiskSekce: JSON.stringify(updated) });
  };

  const ochranaOpatreni: string[] = useMemo(
    () => formData.ochranaOpatreni ? JSON.parse(formData.ochranaOpatreni) : [],
    [formData.ochranaOpatreni]
  );

  return (
    <>
    <div className="bg-white border border-slate-300 rounded-lg shadow-sm max-w-4xl mx-auto">
      {/* Záhlaví */}
      <div className="flex items-center px-4 py-2 bg-slate-50 border-b border-slate-200">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Revidované zařízení</span>
      </div>

      {/* ═══ DŮVOD MIMOŘÁDNÉ ═══ */}
      {(formData.typRevize === 'mimořádná' || revize?.typRevize === 'mimořádná') && (
        <>
          <div className="bg-amber-600 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider">📋 Důvod mimořádné revize</div>
          <div className="px-4 py-3 border-b border-slate-200">
            <input
              className="w-full px-2 py-1.5 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={formData.duvodMimoradne || ''}
              onChange={(e) => setFormData({ ...formData, duvodMimoradne: e.target.value })}
              placeholder="Např. havárie, rekonstrukce..."
            />
          </div>
        </>
      )}

      {/* ═══ POPIS ZAŘÍZENÍ ═══ */}
      <SekceHeader id="popisZarizeni" visible={isSekceVisible('popisZarizeni')} onToggle={() => toggleSekce('popisZarizeni')}>
        Popis revidovaného zařízení
      </SekceHeader>
      {isSekceVisible('popisZarizeni') && (
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex justify-end gap-1 mb-1">
          <AIAutofillButton
            field="popisZarizeni"
            formData={formData as Record<string, any>}
            entityType="revize"
            onApply={(vals) => setFormData({ ...formData, ...vals })}
          />
          <PredvolenyTextBtn
            field="popisZarizeni"
            value={formData.popisZarizeni || ''}
            onChange={(val) => setFormData({ ...formData, popisZarizeni: val })}
            vlastniTexty={vlastniTexty}
          />
        </div>
        <textarea
          className="w-full px-2 py-1.5 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          rows={4}
          value={formData.popisZarizeni || ''}
          onChange={(e) => setFormData({ ...formData, popisZarizeni: e.target.value })}
          placeholder="Popis revidovaného elektrického zařízení, jeho rozsah, účel, stáří, stav..."
        />
      </div>
      )}

      {/* ═══ SEKCE 1: ROZSAH REVIZE ═══ */}
      <SekceHeader id="rozsahRevize" visible={isSekceVisible('rozsahRevize')} onToggle={() => toggleSekce('rozsahRevize')}>
        1. Vymezení rozsahu revize
      </SekceHeader>
      {isSekceVisible('rozsahRevize') && (
      <table className="w-full text-sm border-collapse">
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="w-[180px] px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200 align-top">1.1 Předmětem revize je</td>
            <td className="px-4 py-2">
              <div className="flex justify-end gap-1 mb-1">
                <AIAutofillButton
                  field="rozsahRevize"
                  formData={formData as Record<string, any>}
                  entityType="revize"
                  onApply={(vals) => setFormData({ ...formData, ...vals })}
                />
                <PredvolenyTextBtn
                  field="rozsahRevize"
                  value={formData.rozsahRevize || ''}
                  onChange={(val) => setFormData({ ...formData, rozsahRevize: val })}
                  vlastniTexty={vlastniTexty}
                />
              </div>
              <textarea
                className="w-full px-2 py-1.5 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows={3}
                value={formData.rozsahRevize || ''}
                onChange={(e) => setFormData({ ...formData, rozsahRevize: e.target.value })}
                placeholder="Elektrická instalace objektu, rozváděče, obvody..."
              />
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200 align-top">1.2 Předmětem revize není</td>
            <td className="px-4 py-2">
              <div className="flex justify-end mb-1">
                <PredvolenyTextBtn
                  field="predmetNeni"
                  value={formData.predmetNeni || ''}
                  onChange={(val) => setFormData({ ...formData, predmetNeni: val })}
                  vlastniTexty={vlastniTexty}
                />
              </div>
              <textarea
                className="w-full px-2 py-1.5 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows={3}
                value={formData.predmetNeni || ''}
                onChange={(e) => setFormData({ ...formData, predmetNeni: e.target.value })}
                placeholder="Spotřebiče, zařízení dodaná nájemci, hromosvod..."
              />
            </td>
          </tr>
        </tbody>
      </table>
      )}

      {/* ═══ SEKCE 2: CHARAKTERISTIKA ═══ */}
      <SekceHeader id="charakteristika" visible={isSekceVisible('charakteristika')} onToggle={() => toggleSekce('charakteristika')}>
        2. Charakteristika zařízení
      </SekceHeader>
      {isSekceVisible('charakteristika') && (
      <>
      <table className="w-full text-sm border-collapse">
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="w-[180px] px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">2.1 Napěťová soustava</td>
            <td className="px-4 py-2">
              <select
                className="w-full px-2 py-1.5 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={formData.napetovaSoustava || ''}
                onChange={(e) => setFormData({ ...formData, napetovaSoustava: e.target.value })}
              >
                <option value="">-- Vyberte napěťovou soustavu --</option>
                <option value="3+N+PE AC 50Hz 400/230V TN-C-S">3+N+PE AC 50Hz 400/230V TN-C-S</option>
                <option value="3+N+PE AC 50Hz 400/230V TN-S">3+N+PE AC 50Hz 400/230V TN-S</option>
                <option value="3+PEN AC 50Hz 400/230V TN-C">3+PEN AC 50Hz 400/230V TN-C</option>
                <option value="1+N+PE AC 50Hz 230V TN-S">1+N+PE AC 50Hz 230V TN-S</option>
                <option value="1+N+PE AC 50Hz 230V TN-C-S">1+N+PE AC 50Hz 230V TN-C-S</option>
                <option value="3+PE AC 50Hz 400V TT">3+PE AC 50Hz 400V TT</option>
                <option value="1+PE AC 50Hz 230V TT">1+PE AC 50Hz 230V TT</option>
                <option value="DC 24V SELV">DC 24V SELV</option>
                <option value="DC 48V PELV">DC 48V PELV</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 2.2 Ochrana - tabulka checkboxů */}
      <div className="px-4 py-2 bg-slate-50 border-b border-t border-slate-200">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">2.2 Ochrana před úrazem elektrickým proudem</span>
      </div>
      <div className="px-4 py-3 border-b border-slate-200">
        <p className="text-xs text-slate-500 mb-2">Zaškrtněte opatření použitá v objektu:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {[
            { id: 'zakladni-izolace', label: 'Základní izolace živých částí' },
            { id: 'kryty-pricka', label: 'Přepážky nebo kryty' },
            { id: 'zamezeni-dotyk', label: 'Zábrany nebo ochrana polohou' },
            { id: 'selv', label: 'Ochrana malým napětím SELV' },
            { id: 'pelv', label: 'Ochrana malým napětím PELV' },
            { id: 'ochrane-pospojovani', label: 'Ochranné pospojování' },
            { id: 'samocine-odpojeni', label: 'Samočinné odpojení od zdroje' },
            { id: 'proudovy-chranic', label: 'Doplňková ochrana proudovým chráničem' },
            { id: 'ochranne-oddeleni', label: 'Ochranné oddělení obvodů' },
            { id: 'dvojita-izolace', label: 'Dvojitá nebo zesílená izolace' },
            { id: 'nevodive-prostredi', label: 'Nevodivé prostředí' },
            { id: 'neuzemene-pospojeni', label: 'Neuzemeného místního pospojování' },
          ].map((opatreni) => {
            const isChecked = ochranaOpatreni.includes(opatreni.id);
            return (
              <label key={opatreni.id} className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    let updated = [...ochranaOpatreni];
                    if (e.target.checked) {
                      updated.push(opatreni.id);
                    } else {
                      updated = updated.filter((id: string) => id !== opatreni.id);
                    }
                    setFormData({ ...formData, ochranaOpatreni: JSON.stringify(updated) });
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm">{opatreni.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* ═══ SEKCE 3: MĚŘICÍ PŘÍSTROJE ═══ */}
      </>
      )}

      <div className="bg-slate-800 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
        <span className={!isSekceVisible('pristroje') ? 'opacity-50 line-through' : ''}>2.3 Použité měřicí přístroje</span>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setIsPristrojModalOpen(true)} className="!py-0.5 !px-2 !text-xs bg-white/20 hover:bg-white/30 text-white border-0">+ Přidat</Button>
          <button
            onClick={() => toggleSekce('pristroje')}
            className="flex items-center gap-1 text-[10px] font-normal normal-case tracking-normal opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            title={isSekceVisible('pristroje') ? 'Skrýt v tisku' : 'Zobrazit v tisku'}
          >
            {isSekceVisible('pristroje') ? '🖨️' : '🚫'} <span className="hidden sm:inline">{isSekceVisible('pristroje') ? 'Tisk ✓' : 'Skryto'}</span>
          </button>
        </div>
      </div>

      {isSekceVisible('pristroje') && (
      <>
      <div className="border-b border-slate-200">
        {pouzitePristroje.length > 0 ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border-b border-r border-slate-200 px-4 py-1.5 text-left text-xs font-medium">Název</th>
                <th className="border-b border-r border-slate-200 px-4 py-1.5 text-left text-xs font-medium">Výrobce/Model</th>
                <th className="border-b border-r border-slate-200 px-4 py-1.5 text-left text-xs font-medium">Výrobní číslo</th>
                <th className="border-b border-r border-slate-200 px-4 py-1.5 text-center text-xs font-medium">Platnost kalibrace</th>
                <th className="border-b border-slate-200 px-4 py-1.5 text-center text-xs font-medium w-16">Akce</th>
              </tr>
            </thead>
            <tbody>
              {pouzitePristroje.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="border-b border-r border-slate-200 px-4 py-1.5 font-medium">{p.nazev}</td>
                  <td className="border-b border-r border-slate-200 px-4 py-1.5">{p.vyrobce} {p.model}</td>
                  <td className="border-b border-r border-slate-200 px-4 py-1.5 font-mono">{p.vyrobniCislo}</td>
                  <td className="border-b border-r border-slate-200 px-4 py-1.5 text-center">{new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ')}</td>
                  <td className="border-b border-slate-200 px-4 py-1.5 text-center">
                    <Button variant="danger" size="sm" onClick={() => { if (p.id) { removePristroj.mutate({ revizeId, pristrojId: p.id }); } }}>✕</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-4 text-center text-slate-500">Zatím nejsou přiřazeny žádné měřící přístroje.</p>
        )}
      </div>
      </>
      )}

      {/* ═══ SEKCE 4: PODKLADY ═══ */}
      <SekceHeader id="podklady" visible={isSekceVisible('podklady')} onToggle={() => toggleSekce('podklady')}>
        2.4 Podklady pro provedení revize
      </SekceHeader>
      {isSekceVisible('podklady') && (
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex justify-end mb-1">
          <PredvolenyTextBtn
            field="podklady"
            value={formData.podklady || ''}
            onChange={(val) => setFormData({ ...formData, podklady: val })}
            vlastniTexty={vlastniTexty}
          />
        </div>
        <textarea
          className="w-full px-2 py-1.5 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          rows={4}
          value={formData.podklady || ''}
          onChange={(e) => setFormData({ ...formData, podklady: e.target.value })}
          placeholder="Projekty, předchozí revize, protokoly o měření..."
        />
      </div>
      )}

      {/* ═══ SEKCE 5: PROVEDENÉ ÚKONY ═══ */}
      <SekceHeader id="provedeneUkony" visible={isSekceVisible('provedeneUkony')} onToggle={() => toggleSekce('provedeneUkony')}>
        3. Soupis provedených úkonů
      </SekceHeader>
      {isSekceVisible('provedeneUkony') && (
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex justify-end mb-1">
          <PredvolenyTextBtn
            field="provedeneUkony"
            value={formData.provedeneUkony || ''}
            onChange={(val) => setFormData({ ...formData, provedeneUkony: val })}
            vlastniTexty={vlastniTexty}
          />
        </div>
        <textarea
          className="w-full px-2 py-1.5 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          rows={4}
          value={formData.provedeneUkony || ''}
          onChange={(e) => setFormData({ ...formData, provedeneUkony: e.target.value })}
          placeholder="Prohlídka, měření izolačního odporu, impedance smyčky, funkce proudových chráničů..."
        />
      </div>
      )}

      {/* ═══ SEKCE 6: VYHODNOCENÍ PŘEDCHOZÍCH ═══ */}
      <SekceHeader id="vyhodnoceniPredchozich" visible={isSekceVisible('vyhodnoceniPredchozich')} onToggle={() => toggleSekce('vyhodnoceniPredchozich')}>
        4. Vyhodnocení předchozích revizí
      </SekceHeader>
      {isSekceVisible('vyhodnoceniPredchozich') && (
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex justify-end mb-1">
          <PredvolenyTextBtn
            field="vyhodnoceniPredchozich"
            value={formData.vyhodnoceniPredchozich || ''}
            onChange={(val) => setFormData({ ...formData, vyhodnoceniPredchozich: val })}
            vlastniTexty={vlastniTexty}
          />
        </div>
        <textarea
          className="w-full px-2 py-1.5 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          rows={3}
          value={formData.vyhodnoceniPredchozich || ''}
          onChange={(e) => setFormData({ ...formData, vyhodnoceniPredchozich: e.target.value })}
          placeholder="Výsledky předchozí revize, stav odstranění zjištěných závad..."
        />
      </div>
      )}

      {/* ═══ SEKCE 7: VÝSLEDEK + ODŮVODNĚNÍ ═══ */}
      <SekceHeader id="vysledekOduvodneni" visible={isSekceVisible('vysledekOduvodneni')} onToggle={() => toggleSekce('vysledekOduvodneni')}>
        5. Výsledek revize — odůvodnění
      </SekceHeader>
      {isSekceVisible('vysledekOduvodneni') && (
      <table className="w-full text-sm border-collapse">
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="w-[180px] px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200">Výsledek</td>
            <td className="px-4 py-2">
              <select
                className="px-2 py-1 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={formData.vysledek || ''}
                onChange={(e) => setFormData({ ...formData, vysledek: e.target.value as any })}
              >
                <option value="">-- Nevyplněno --</option>
                <option value="schopno">Schopno provozu</option>
                <option value="neschopno">Neschopno provozu</option>
                <option value="podmíněně schopno">Podmíněně schopno</option>
              </select>
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 border-r border-slate-200 align-top">Odůvodnění</td>
            <td className="px-4 py-2">
              <div className="flex justify-end mb-1">
                <PredvolenyTextBtn
                  field="vysledekOduvodneni"
                  value={formData.vysledekOduvodneni || ''}
                  onChange={(val) => setFormData({ ...formData, vysledekOduvodneni: val })}
                  vlastniTexty={vlastniTexty}
                />
              </div>
              <textarea
                className="w-full px-2 py-1.5 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows={3}
                value={formData.vysledekOduvodneni || ''}
                onChange={(e) => setFormData({ ...formData, vysledekOduvodneni: e.target.value })}
                placeholder="Odůvodnění výsledku revize, pokud zařízení není schopno provozu..."
              />
            </td>
          </tr>
        </tbody>
      </table>
      )}

      {/* ═══ SEKCE 8: ZÁVĚR ═══ */}
      <SekceHeader id="zaver" visible={isSekceVisible('zaver')} onToggle={() => toggleSekce('zaver')}>
        6. Závěr revize
      </SekceHeader>
      {isSekceVisible('zaver') && (
      <div className="px-4 py-3">
        <div className="flex justify-end gap-2 mb-1">
          <button
            onClick={handleAIGenerateReport}
            disabled={aiGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 disabled:opacity-50 transition-colors"
          >
            {aiGenerating ? (
              <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Generuji...</>
            ) : (
              <><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" /></svg> AI Generovat závěr</>
            )}
          </button>
          <PredvolenyTextBtn
            field="zaver"
            value={formData.zaver || ''}
            onChange={(val) => setFormData({ ...formData, zaver: val })}
            vlastniTexty={vlastniTexty}
          />
        </div>
        <textarea
          className="w-full px-2 py-1.5 rounded text-sm border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          rows={4}
          value={formData.zaver || ''}
          onChange={(e) => setFormData({ ...formData, zaver: e.target.value })}
          placeholder="Celkové shrnutí a závěr revizní zprávy..."
        />
      </div>
      )}
    </div>

    {/* Modal pro přidání přístroje k revizi */}
    <Modal
      isOpen={isPristrojModalOpen}
      onClose={() => setIsPristrojModalOpen(false)}
      title="Přidat měřící přístroj"
    >
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {vsechnyPristroje.filter(p => !pouzitePristroje.find(pp => pp.id === p.id)).length > 0 ? (
          vsechnyPristroje
            .filter(p => !pouzitePristroje.find(pp => pp.id === p.id))
            .map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 cursor-pointer"
                onClick={() => {
                  if (p.id) {
                    addPristroj.mutate({ revizeId, pristrojId: p.id }, {
                      onSuccess: () => setIsPristrojModalOpen(false),
                    });
                  }
                }}
              >
                <div className="flex-1">
                  <p className="font-medium">{p.nazev}</p>
                  <p className="text-sm text-slate-500">
                    {p.vyrobce} {p.model} • V.č.: {p.vyrobniCislo}
                  </p>
                  <p className="text-xs text-slate-400">
                    Platnost kalibrace: {new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ')}
                  </p>
                </div>
                <span className="text-blue-600">+ Přidat</span>
              </div>
            ))
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-500 mb-2">
              {vsechnyPristroje.length === 0
                ? 'Nemáte žádné měřící přístroje.'
                : 'Všechny přístroje jsou již přiřazeny.'}
            </p>
            <Link to="/pristroje" className="text-blue-600 hover:underline">
              Přejít na správu přístrojů
            </Link>
          </div>
        )}
      </div>
    </Modal>
    </>
  );
}
