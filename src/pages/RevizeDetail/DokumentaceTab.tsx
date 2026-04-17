import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal } from '../../components/ui';
import type { Revize, MericiPristroj, PredvolenyText } from '../../types';
import { useAddPristrojToRevize, useRemovePristrojFromRevize } from '../../hooks/useQueries';
import { aiApi } from '../../services/api';
import { AIAutofillButton } from '../../components/AIAutofillButton';
import { TW, SectionHeader, ToggleSectionHeader } from './tw';
import { PredvolenyTextBtn } from './PredvolenyTextBtn';
import { DEFAULT_NORMY_SOULAD } from './constants';

interface DokumentaceTabProps {
  revize: Revize;
  formData: Partial<Revize>;
  setFormData: (data: Partial<Revize>) => void;
  vlastniTexty: PredvolenyText[];
  pouzitePristroje: MericiPristroj[];
  vsechnyPristroje: MericiPristroj[];
  revizeId: number;
  saveNow?: () => void;
}

export function DokumentaceTab({
  revize, formData, setFormData,
  vlastniTexty,
  pouzitePristroje, vsechnyPristroje,
  revizeId,
  saveNow,
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
    <div className={TW.page}>

      {/* ═══ 01 – NORMY / SOULAD ═══ */}
      <div className={TW.card}>
        <SectionHeader num="01">Normy / soulad</SectionHeader>
        <div className="p-4">
          <input
            className={TW.input}
            value={formData.normySoulad ?? DEFAULT_NORMY_SOULAD}
            onChange={(e) => setFormData({ ...formData, normySoulad: e.target.value })}
            placeholder="Normy, podle kterých je revize provedena"
          />
        </div>
      </div>

      {/* ═══ DŮVOD MIMOŘÁDNÉ ═══ */}
      {(formData.typRevize === 'mimořádná' || revize?.typRevize === 'mimořádná') && (
        <div className={TW.card}>
          <SectionHeader className="bg-amber-600">📋 Důvod mimořádné revize</SectionHeader>
          <div className="p-4">
            <input
              className={TW.input}
              value={formData.duvodMimoradne || ''}
              onChange={(e) => setFormData({ ...formData, duvodMimoradne: e.target.value })}
              placeholder="Např. havárie, rekonstrukce..."
            />
          </div>
        </div>
      )}

      {/* ═══ 02 – POPIS ZAŘÍZENÍ ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="02" visible={isSekceVisible('popisZarizeni')} onToggle={() => toggleSekce('popisZarizeni')}>
          Popis revidovaného zařízení
        </ToggleSectionHeader>
        {isSekceVisible('popisZarizeni') && (
        <div className="p-4">
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
            className={TW.textarea}
            rows={4}
            value={formData.popisZarizeni || ''}
            onChange={(e) => setFormData({ ...formData, popisZarizeni: e.target.value })}
            placeholder="Popis revidovaného elektrického zařízení, jeho rozsah, účel, stáří, stav..."
          />
        </div>
        )}
      </div>

      {/* ═══ 03 – ROZSAH REVIZE ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="03" visible={isSekceVisible('rozsahRevize')} onToggle={() => toggleSekce('rozsahRevize')}>
          1. Vymezení rozsahu revize
        </ToggleSectionHeader>
        {isSekceVisible('rozsahRevize') && (
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={TW.label}>1.1 Předmětem revize je</label>
              <div className="flex gap-1">
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
            </div>
            <textarea
              className={TW.textarea}
              rows={3}
              value={formData.rozsahRevize || ''}
              onChange={(e) => setFormData({ ...formData, rozsahRevize: e.target.value })}
              placeholder="Elektrická instalace objektu, rozváděče, obvody..."
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={TW.label}>1.2 Předmětem revize není/nejsou</label>
              <PredvolenyTextBtn
                field="predmetNeni"
                value={formData.predmetNeni || ''}
                onChange={(val) => setFormData({ ...formData, predmetNeni: val })}
                vlastniTexty={vlastniTexty}
              />
            </div>
            <textarea
              className={TW.textarea}
              rows={3}
              value={formData.predmetNeni || ''}
              onChange={(e) => setFormData({ ...formData, predmetNeni: e.target.value })}
              placeholder="Spotřebiče, zařízení dodaná nájemci, hromosvod..."
            />
          </div>
        </div>
        )}
      </div>

      {/* ═══ 04 – CHARAKTERISTIKA ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="04" visible={isSekceVisible('charakteristika')} onToggle={() => toggleSekce('charakteristika')}>
          2. Charakteristika zařízení
        </ToggleSectionHeader>
        {isSekceVisible('charakteristika') && (
        <div className="p-4 space-y-4">
          {/* 2.1 Napěťová soustava */}
          <div>
            <label className={TW.label}>2.1 Napěťová soustava</label>
            <select
              className={TW.selectFull + ' mt-1'}
              value={formData.napetovaSoustava || ''}
              onChange={(e) => { setFormData({ ...formData, napetovaSoustava: e.target.value }); saveNow?.(); }}
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
          </div>

          {/* 2.2 Ochrana */}
          <div>
            <label className={TW.label}>2.2 Ochrana před úrazem elektrickým proudem</label>
            <p className="text-xs text-[var(--text-secondary)] mt-1 mb-2">Zaškrtněte opatření použitá v objektu:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {[
                { id: 'zakladni-izolace', label: 'Základní izolace živých částí' },
                { id: 'kryty-pricka', label: 'Přepážky nebo kryty' },
                { id: 'zamezeni-dotyk', label: 'Zábrany nebo ochrana polohou' },
                { id: 'selv', label: 'Ochrana malým napětím SELV' },
                { id: 'pelv', label: 'Ochrana malým napětím PELV' },
                { id: 'ochrane-pospojovani', label: 'Ochranné pospojování' },
                { id: 'samocine-odpojeni', label: 'Automatické odpojeni od zdroje' },
                { id: 'proudovy-chranic', label: 'Doplňková ochrana proudovým chráničem' },
                { id: 'ochranne-oddeleni', label: 'Ochranné oddělení obvodů' },
                { id: 'dvojita-izolace', label: 'Dvojitá nebo zesílená izolace' },
                { id: 'nevodive-prostredi', label: 'Nevodivé prostředí' },
                { id: 'neuzemene-pospojeni', label: 'Neuzemeného místního pospojování' },
              ].map((opatreni) => {
                const isChecked = ochranaOpatreni.includes(opatreni.id);
                return (
                  <label key={opatreni.id} className="flex items-center gap-2 px-2 py-1.5 bg-[var(--bg-surface)] rounded hover:bg-[var(--bg-hover)] cursor-pointer">
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
                        saveNow?.();
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-[var(--checkbox-border)]"
                    />
                    <span className="text-sm text-[var(--text)]">{opatreni.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* ═══ 05 – MĚŘICÍ PŘÍSTROJE ═══ */}
      <div className={TW.card}>
        <SectionHeader
          num="05"
          right={
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
          }
        >
          <span className={!isSekceVisible('pristroje') ? 'opacity-50 line-through' : ''}>2.3 Použité měřicí přístroje</span>
        </SectionHeader>

        {isSekceVisible('pristroje') && (
        <div>
          {pouzitePristroje.length > 0 ? (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className={TW.th}>Název</th>
                  <th className={TW.th}>Výrobce/Model</th>
                  <th className={TW.th}>Výrobní číslo</th>
                  <th className={TW.th + ' text-center'}>Platnost kalibrace</th>
                  <th className={TW.th + ' text-center w-16'}>Akce</th>
                </tr>
              </thead>
              <tbody>
                {pouzitePristroje.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border-subtle)] border-l-2 border-l-transparent hover:border-l-[#C00606] hover:bg-[rgba(192,6,6,0.03)] group">
                    <td className={TW.td + ' font-medium'}>{p.nazev}</td>
                    <td className={TW.td}>{p.vyrobce} {p.model}</td>
                    <td className={TW.td + ' font-mono'}>{p.vyrobniCislo}</td>
                    <td className={TW.td + ' text-center'}>{new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ')}</td>
                    <td className={TW.td + ' text-center'}>
                      <Button variant="danger" size="sm" onClick={() => { if (p.id) { removePristroj.mutate({ revizeId, pristrojId: p.id }); } }}>✕</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-4 text-center text-[var(--text-muted)]">Zatím nejsou přiřazeny žádné měřící přístroje.</p>
          )}
        </div>
        )}
      </div>

      {/* ═══ 06 – PODKLADY ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="06" visible={isSekceVisible('podklady')} onToggle={() => toggleSekce('podklady')}>
          2.4 Podklady pro provedení revize
        </ToggleSectionHeader>
        {isSekceVisible('podklady') && (
        <div className="p-4">
          <div className="flex justify-end mb-1">
            <PredvolenyTextBtn
              field="podklady"
              value={formData.podklady || ''}
              onChange={(val) => setFormData({ ...formData, podklady: val })}
              vlastniTexty={vlastniTexty}
            />
          </div>
          <textarea
            className={TW.textarea}
            rows={4}
            value={formData.podklady || ''}
            onChange={(e) => setFormData({ ...formData, podklady: e.target.value })}
            placeholder="Projekty, předchozí revize, protokoly o měření..."
          />
        </div>
        )}
      </div>

      {/* ═══ 07 – PROVEDENÉ ÚKONY ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="07" visible={isSekceVisible('provedeneUkony')} onToggle={() => toggleSekce('provedeneUkony')}>
          3. Soupis provedených úkonů
        </ToggleSectionHeader>
        {isSekceVisible('provedeneUkony') && (
        <div className="p-4">
          <div className="flex justify-end mb-1">
            <PredvolenyTextBtn
              field="provedeneUkony"
              value={formData.provedeneUkony || ''}
              onChange={(val) => setFormData({ ...formData, provedeneUkony: val })}
              vlastniTexty={vlastniTexty}
            />
          </div>
          <textarea
            className={TW.textarea}
            rows={4}
            value={formData.provedeneUkony || ''}
            onChange={(e) => setFormData({ ...formData, provedeneUkony: e.target.value })}
            placeholder="Prohlídka, měření izolačního odporu, impedance smyčky, funkce proudových chráničů..."
          />
        </div>
        )}
      </div>

      {/* ═══ 08 – VYHODNOCENÍ PŘEDCHOZÍCH ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="08" visible={isSekceVisible('vyhodnoceniPredchozich')} onToggle={() => toggleSekce('vyhodnoceniPredchozich')}>
          4. Vyhodnocení předchozích revizí
        </ToggleSectionHeader>
        {isSekceVisible('vyhodnoceniPredchozich') && (
        <div className="p-4">
          <div className="flex justify-end mb-1">
            <PredvolenyTextBtn
              field="vyhodnoceniPredchozich"
              value={formData.vyhodnoceniPredchozich || ''}
              onChange={(val) => setFormData({ ...formData, vyhodnoceniPredchozich: val })}
              vlastniTexty={vlastniTexty}
            />
          </div>
          <textarea
            className={TW.textarea}
            rows={3}
            value={formData.vyhodnoceniPredchozich || ''}
            onChange={(e) => setFormData({ ...formData, vyhodnoceniPredchozich: e.target.value })}
            placeholder="Výsledky předchozí revize, stav odstranění zjištěných závad..."
          />
        </div>
        )}
      </div>

      {/* ═══ 09 – VÝSLEDEK + ODŮVODNĚNÍ ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="09" visible={isSekceVisible('vysledekOduvodneni')} onToggle={() => toggleSekce('vysledekOduvodneni')}>
          5. Výsledek revize — odůvodnění
        </ToggleSectionHeader>
        {isSekceVisible('vysledekOduvodneni') && (
        <div className="p-4 space-y-3">
          <div className={TW.grid2}>
            <div className="flex flex-col gap-1">
              <label className={TW.label}>Výsledek</label>
              <select
                className={TW.select}
                value={formData.vysledek || ''}
                onChange={(e) => { setFormData({ ...formData, vysledek: e.target.value as any }); saveNow?.(); }}
              >
                <option value="">-- Nevyplněno --</option>
                <option value="schopno">Schopno provozu</option>
                <option value="neschopno">Neschopno provozu</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={TW.label}>Odůvodnění</label>
              <PredvolenyTextBtn
                field="vysledekOduvodneni"
                value={formData.vysledekOduvodneni || ''}
                onChange={(val) => setFormData({ ...formData, vysledekOduvodneni: val })}
                vlastniTexty={vlastniTexty}
              />
            </div>
            <textarea
              className={TW.textarea}
              rows={3}
              value={formData.vysledekOduvodneni || ''}
              onChange={(e) => setFormData({ ...formData, vysledekOduvodneni: e.target.value })}
              placeholder="Odůvodnění výsledku revize, pokud zařízení není schopno provozu..."
            />
          </div>
        </div>
        )}
      </div>

      {/* ═══ 10 – ZÁVĚR ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="10" visible={isSekceVisible('zaver')} onToggle={() => toggleSekce('zaver')}>
          6. Závěr revize
        </ToggleSectionHeader>
        {isSekceVisible('zaver') && (
        <div className="p-4">
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
            className={TW.textarea}
            rows={4}
            value={formData.zaver || ''}
            onChange={(e) => setFormData({ ...formData, zaver: e.target.value })}
            placeholder="Celkové shrnutí a závěr revizní zprávy..."
          />
        </div>
        )}
      </div>

      {/* ═══ 11 – ROZDĚLOVNÍK ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="11" visible={isSekceVisible('rozdelovnik')} onToggle={() => toggleSekce('rozdelovnik')}>
          Rozdělovník
        </ToggleSectionHeader>
        {isSekceVisible('rozdelovnik') && (
        <div className="p-4">
          <p className="text-xs text-[var(--text-muted)] mb-2">Seznam příjemců zprávy – každý příjemce na nový řádek, např.:<br /><code>Revizní technik: 1ks</code><br /><code>Objednávatel: 2ks</code></p>
          <textarea
            className={TW.textarea}
            rows={4}
            value={formData.rozdelovnik || ''}
            onChange={(e) => setFormData({ ...formData, rozdelovnik: e.target.value })}
            placeholder={`Revizní technik: 1ks\nObjednávatel: 2ks\nArchiv: 1ks`}
          />
        </div>
        )}
      </div>

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
                className="flex items-center justify-between p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-medium)] hover:border-[var(--border-strong)] cursor-pointer"
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
                  <p className="text-sm text-[var(--text-muted)]">
                    {p.vyrobce} {p.model} • V.č.: {p.vyrobniCislo}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Platnost kalibrace: {new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ')}
                  </p>
                </div>
                <span className="text-blue-600">+ Přidat</span>
              </div>
            ))
        ) : (
          <div className="text-center py-4">
            <p className="text-[var(--text-muted)] mb-2">
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
