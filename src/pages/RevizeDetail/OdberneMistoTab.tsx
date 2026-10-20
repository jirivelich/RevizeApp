/**
 * OdberneMistoTab – formulář šablony "Odběrné místo (ČEZ)".
 * Data se ukládají do formData.odberneMistoData (JSON) a autosavem do DB.
 * Texty (rozsah, podklady, závěr, přístroje) se vyplňují v záložce "Revidované zařízení".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Revize } from '../../types';
import {
  createDefaultOdberneMisto, parseOdberneMisto, porovnejJistic, TARIFY_DISTRIBUCE,
  type OdberneMistoData, type KontrolaPolozka, type MereniObvodu, type Vysledek,
} from '../../types/odberneMisto';
import { TW, SectionHeader, ToggleSectionHeader, Field } from './tw';

interface Props {
  revize: Revize;
  formData: Partial<Revize>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Revize>>>;
}

type ListKey = 'prohlidka' | 'zkouseni' | 'checklist';

function CB({ val, active, onClick }: { val: Vysledek; active: boolean; onClick: () => void }) {
  const base = 'flex-1 py-1 px-1 text-xs font-semibold border cursor-pointer text-center transition-all select-none rounded';
  const cls = active
    ? val === 'V' ? `${base} bg-emerald-50 border-emerald-500 text-emerald-600`
    : val === 'N' ? `${base} bg-red-50 border-red-500 text-red-600`
    : `${base} bg-[var(--bg-hover-strong)] border-[var(--border-strong)] text-[var(--text)]`
    : `${base} border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text)]`;
  return <button className={cls} onClick={onClick} type="button">{val}</button>;
}

export function OdberneMistoTab({ revize, formData, setFormData }: Props) {
  const [fd, setFd] = useState<OdberneMistoData>(createDefaultOdberneMisto());
  const loadedForRef = useRef<number | undefined>(undefined);

  // Načtení uložených dat jen jednou pro danou revizi
  useEffect(() => {
    if (loadedForRef.current === revize.id) return;
    loadedForRef.current = revize.id;
    setFd(parseOdberneMisto(revize.odberneMistoData || formData.odberneMistoData));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revize.id]);

  // fd → rodičovský formData (autosave)
  useEffect(() => {
    setFormData(prev => {
      const json = JSON.stringify(fd);
      if (prev.odberneMistoData === json) return prev;
      return { ...prev, odberneMistoData: json };
    });
  }, [fd, setFormData]);

  const upd = useCallback(<K extends keyof OdberneMistoData>(key: K, value: OdberneMistoData[K]) => {
    setFd(prev => ({ ...prev, [key]: value }));
  }, []);

  const updItem = useCallback((list: ListKey, idx: number, patch: Partial<KontrolaPolozka>) => {
    setFd(prev => {
      const arr = [...prev[list]];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [list]: arr };
    });
  }, []);

  const toggleItem = (list: ListKey, idx: number, val: Vysledek, current: Vysledek) =>
    updItem(list, idx, { vysledek: current === val ? '' : val });

  const addItem = (list: ListKey) =>
    setFd(prev => ({ ...prev, [list]: [...prev[list], { nazev: '', norma: '', vysledek: '', poznamka: '', editable: true }] }));

  const removeItem = (list: ListKey, idx: number) =>
    setFd(prev => ({ ...prev, [list]: prev[list].filter((_, i) => i !== idx) }));

  const updMereni = (idx: number, patch: Partial<MereniObvodu>) =>
    setFd(prev => {
      const arr = [...prev.mereni];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, mereni: arr };
    });

  const tiskSekce: Record<string, boolean> = useMemo(() => {
    try { return formData.tiskSekce ? JSON.parse(formData.tiskSekce) : {}; } catch { return {}; }
  }, [formData.tiskSekce]);
  const isVisible = (key: string) => tiskSekce[key] !== false;
  const toggleSekce = (key: string) =>
    setFormData(prev => ({ ...prev, tiskSekce: JSON.stringify({ ...tiskSekce, [key]: !isVisible(key) }) }));

  const shoda = porovnejJistic(fd);

  const inp = (key: keyof OdberneMistoData, label: string, opts?: { placeholder?: string; type?: string }) => (
    <Field label={label}>
      <input
        type={opts?.type || 'text'} className={TW.input} placeholder={opts?.placeholder}
        value={String(fd[key] ?? '')} onChange={e => upd(key, e.target.value as never)}
      />
    </Field>
  );

  const checklistCard = (
    list: ListKey, num: string, title: string, sekceKey: string, hint?: string,
  ) => (
    <div className={TW.card}>
      <ToggleSectionHeader num={num} visible={isVisible(sekceKey)} onToggle={() => toggleSekce(sekceKey)}>{title}</ToggleSectionHeader>
      <div className="p-4 space-y-2">
        {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
        <table className="w-full text-sm border-collapse">
          <thead><tr>
            <th className={TW.th}>Kontrolovaná položka</th>
            <th className={TW.th} style={{ width: '22%' }}>Norma / článek</th>
            <th className={TW.th} style={{ width: '17%' }}>Výsledek</th>
            <th className={TW.th} style={{ width: '18%' }}>Poznámka</th>
            <th className={TW.th} style={{ width: '4%' }} />
          </tr></thead>
          <tbody>
            {fd[list].map((r, i) => (
              <tr key={i} className="even:bg-[var(--bg-surface)]">
                <td className={TW.td}><input className={TW.tblInput} value={r.nazev} onChange={e => updItem(list, i, { nazev: e.target.value })} /></td>
                <td className={TW.td}><input className={TW.tblInput} value={r.norma || ''} onChange={e => updItem(list, i, { norma: e.target.value })} /></td>
                <td className={TW.td}><div className="flex gap-1">
                  {(['V', 'N', 'NA'] as Vysledek[]).map(v => (
                    <CB key={v} val={v} active={r.vysledek === v} onClick={() => toggleItem(list, i, v, r.vysledek)} />
                  ))}
                </div></td>
                <td className={TW.td}><input className={TW.tblInput} value={r.poznamka} onChange={e => updItem(list, i, { poznamka: e.target.value })} /></td>
                <td className={TW.td}>
                  <button type="button" className="text-[var(--text-muted)] hover:text-red-500 cursor-pointer" title="Odebrat řádek" onClick={() => removeItem(list, i)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="text-xs text-[var(--primary)] hover:underline cursor-pointer" onClick={() => addItem(list)}>+ Přidat řádek</button>
      </div>
    </div>
  );

  return (
    <div className={TW.page}>

      {/* ═══ 01 – IDENTIFIKACE ODBĚRNÉHO MÍSTA ═══ */}
      <div className={TW.card}>
        <SectionHeader num="01">Identifikace odběrného místa</SectionHeader>
        <div className="p-4">
          <div className={TW.grid3}>
            {inp('distributor', 'Distributor')}
            {inp('ean', 'EAN / OPM', { placeholder: '859182400…' })}
            {inp('cisloElektromeru', 'Číslo elektroměru')}
            {inp('parcela', 'Parcela / č.p. / k. ú.')}
            <Field label="Typ připojení">
              <select className={TW.selectFull} value={fd.typPripojeni} onChange={e => upd('typPripojeni', e.target.value as OdberneMistoData['typPripojeni'])}>
                <option value="">— vyberte —</option>
                <option value="kabel">Kabelová přípojka</option>
                <option value="vzdusne">Vzdušné vedení</option>
                <option value="jine">Jiné</option>
              </select>
            </Field>
            {inp('umisteniRozvadece', 'Umístění rozvaděče', { placeholder: 'např. fasáda objektu, pilíř na hranici pozemku' })}
          </div>
        </div>
      </div>

      {/* ═══ 02 – TECHNICKÉ PARAMETRY ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="02" visible={isVisible('parametry')} onToggle={() => toggleSekce('parametry')}>Technické parametry odběrného místa</ToggleSectionHeader>
        <div className="p-4">
          <div className={TW.grid3}>
            {inp('soustava', 'Napájecí soustava', { placeholder: '3+PEN, 50 Hz, 230/400 V, TN-C' })}
            <Field label="Způsob měření">
              <select className={TW.selectFull} value={fd.zpusobMereni} onChange={e => upd('zpusobMereni', e.target.value as OdberneMistoData['zpusobMereni'])}>
                <option value="">— vyberte —</option>
                <option value="prime">Přímé (do 100 A)</option>
                <option value="neprime">Nepřímé (přes transformátory proudu)</option>
              </select>
            </Field>
            <Field label="Počet fází">
              <select className={TW.selectFull} value={fd.pocetFazi} onChange={e => upd('pocetFazi', e.target.value as OdberneMistoData['pocetFazi'])}>
                <option value="">— vyberte —</option>
                <option value="1">1f</option>
                <option value="3">3f</option>
              </select>
            </Field>
            {inp('jisticTyp', 'Hlavní jistič – typ / výrobce')}
            {inp('jisticProud', 'Hlavní jistič – osazeno (A)')}
            {inp('jisticCharakteristika', 'Charakteristika', { placeholder: 'B / C / E' })}
            <Field label="Plombovatelnost">
              <select className={TW.selectFull} value={fd.plombovani} onChange={e => upd('plombovani', e.target.value as OdberneMistoData['plombovani'])}>
                <option value="">— vyberte —</option>
                <option value="ano">Ano</option>
                <option value="ne">Ne</option>
              </select>
            </Field>
            {inp('rozvadecVyrobce', 'Rozvaděč – výrobce')}
            {inp('rozvadecTyp', 'Rozvaděč – typ')}
            {inp('rozvadecIp', 'Stupeň krytí IP')}
            {inp('rozvadecTrida', 'Třída ochrany')}
            {inp('rozvadecProhlaseni', 'Prohlášení o shodě', { placeholder: 'např. EU PROHLÁŠENÍ O SHODĚ 2023-06' })}
          </div>
        </div>
      </div>

      {/* ═══ 03 – SMLOUVA A TARIF ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="03" visible={isVisible('smlouva')} onToggle={() => toggleSekce('smlouva')}>Smlouva o připojení a tarif odběru</ToggleSectionHeader>
        <div className="p-4 space-y-3">
          <div className={TW.grid3}>
            {inp('smlouvaCislo', 'Číslo smlouvy')}
            {inp('smlouvaDatum', 'Datum uzavření', { type: 'date' })}
            {inp('smlouvaPlatnost', 'Platnost do / prodloužení', { type: 'date' })}
            <Field label="Typ odběru">
              <select className={TW.selectFull} value={fd.smlouvaTypOdberu} onChange={e => upd('smlouvaTypOdberu', e.target.value as OdberneMistoData['smlouvaTypOdberu'])}>
                <option value="">— vyberte —</option>
                <option value="novy">Nový odběr</option>
                <option value="zmena">Změna odběru</option>
                <option value="rozsireni">Rozšíření odběru</option>
              </select>
            </Field>
            {inp('smlouvaUcel', 'Účel odběru', { placeholder: 'domácnost / podnikání / FVE…' })}
            {inp('smlouvaPrikon', 'Rezervovaný příkon dle smlouvy (kW)')}
            {inp('smlouvaJistic', 'Hlavní jistič dle smlouvy (A)')}
            <Field label="Distribuční sazba (tarif)">
              <input className={TW.input} list="odberne-misto-tarify" value={fd.tarif} onChange={e => upd('tarif', e.target.value)} placeholder="např. D02d" />
              <datalist id="odberne-misto-tarify">{TARIFY_DISTRIBUCE.map(t => <option key={t} value={t} />)}</datalist>
            </Field>
            {inp('hdoKod', 'HDO – kód / signál')}
          </div>
          <div className={`text-xs rounded px-3 py-2 border ${
            shoda === 'shoda' ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
            : shoda === 'neshoda' ? 'bg-red-50 border-red-400 text-red-700'
            : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)]'}`}>
            {shoda === 'shoda' && `✓ Osazený hlavní jistič (${fd.jisticProud} A) odpovídá smlouvě.`}
            {shoda === 'neshoda' && `⚠ Osazený hlavní jistič (${fd.jisticProud} A) NEODPOVÍDÁ smlouvě (${fd.smlouvaJistic} A). Uveďte v závěru.`}
            {shoda === 'neurceno' && 'Vyplňte osazený jistič a jistič dle smlouvy pro automatické porovnání.'}
          </div>
          <Field label="Poznámka ke smlouvě / tarifu">
            <textarea className={TW.textarea} rows={2} value={fd.smlouvaPoznamka} onChange={e => upd('smlouvaPoznamka', e.target.value)} />
          </Field>
        </div>
      </div>

      {checklistCard('prohlidka', '04', 'Prohlídka', 'prohlidka')}
      {checklistCard('zkouseni', '05', 'Zkoušení', 'zkouseni')}

      {/* ═══ 06 – MĚŘENÍ ═══ */}
      <div className={TW.card}>
        <ToggleSectionHeader num="06" visible={isVisible('mereni')} onToggle={() => toggleSekce('mereni')}>Měření</ToggleSectionHeader>
        <div className="p-4 space-y-3">
          <div className={TW.grid2}>
            {inp('napetiU0', 'Měřené napětí U0 (V)')}
            {inp('prechodovyOdpor', 'Max. přechodový odpor (Ω)', { placeholder: 'nepřekročeno 0,1' })}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead><tr>
                {['Obvod', 'Jištění', 'Kabel', 'Zs (Ω)', 'U (V)', 'I (A)', 'ta (ms)', 'IΔn (mA)', 'Riz (MΩ)', 'Výsledek', ''].map(h => <th key={h} className={TW.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {fd.mereni.map((m, i) => (
                  <tr key={i} className="even:bg-[var(--bg-surface)]">
                    {(['oznaceni', 'jisteni', 'typKabelu', 'zs', 'u', 'i', 'ta', 'idn', 'riz'] as const).map(f => (
                      <td key={f} className={TW.td}><input className={TW.tblInput} value={m[f]} onChange={e => updMereni(i, { [f]: e.target.value })} /></td>
                    ))}
                    <td className={TW.td}><div className="flex gap-1">
                      {(['V', 'N'] as Vysledek[]).map(v => (
                        <CB key={v} val={v} active={m.vysledek === v} onClick={() => updMereni(i, { vysledek: m.vysledek === v ? '' : v })} />
                      ))}
                    </div></td>
                    <td className={TW.td}>
                      <button type="button" className="text-[var(--text-muted)] hover:text-red-500 cursor-pointer" title="Odebrat řádek"
                        onClick={() => setFd(prev => ({ ...prev, mereni: prev.mereni.filter((_, j) => j !== i) }))}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="text-xs text-[var(--primary)] hover:underline cursor-pointer"
            onClick={() => setFd(prev => ({ ...prev, mereni: [...prev.mereni, { oznaceni: '', jisteni: '', typKabelu: '', zs: '', u: '', i: '', ta: '', idn: '', riz: '', vysledek: '' }] }))}>
            + Přidat obvod
          </button>
        </div>
      </div>

      {checklistCard(
        'checklist', '07', 'Kontrolní seznam dle připojovacích podmínek distributora', 'checklist',
        'Seznam je orientační – upravte položky podle aktuálních podmínek připojení a technických podmínek ČEZ Distribuce.',
      )}
    </div>
  );
}
