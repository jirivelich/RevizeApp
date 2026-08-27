import { useEffect, useRef, useState } from 'react';
import { okruhService } from '../../services/database';
import type { Okruh } from '../../types';
import { TYPY_KABELU, PRUREZY, computeVodic } from './rozvadeceShared';

interface OkruhyInlineTableProps {
  rozvadecId: number;
  okruhy: Okruh[];
  onEdit: (okruh: Okruh) => void;
  onDelete: (okruhId: number) => void;
  onSaved: (okruhy: Okruh[]) => void;
}

/**
 * "Hromadný vstup" – tabulkový draft-řádek s klávesovou navigací (Tab/Enter/Shift+Enter)
 * pro rychlé zadávání okruhů. Plně samostatný blok vyjmutý z RozvadeceTab.
 */
export function OkruhyInlineTable({ rozvadecId, okruhy, onEdit, onDelete, onSaved }: OkruhyInlineTableProps) {
  const [inlineOkruhDraft, setInlineOkruhDraft] = useState({
    cislo: okruhy.length > 0 ? Math.max(...okruhy.map(o => o.cislo)) + 1 : 1,
    nazev: '', jisticTyp: 'B', jisticProud: '16A', pocetFazi: 1,
    typKabelu: 'CYKY', pocetZil: '3', prurez: '2,5',
    izolacniOdpor: '', impedanceSmycky: '',
  });
  const inlineNazevRef = useRef<HTMLInputElement>(null);
  const inlineJisticTypRef = useRef<HTMLSelectElement>(null);
  const inlineJisticProudRef = useRef<HTMLSelectElement>(null);
  const inlinePocetFaziRef = useRef<HTMLSelectElement>(null);
  const inlineTypKabeluRef = useRef<HTMLSelectElement>(null);
  const inlinePocetZilRef = useRef<HTMLSelectElement>(null);
  const inlinePrurezRef = useRef<HTMLSelectElement>(null);
  const inlineIzolacniOdporRef = useRef<HTMLInputElement>(null);
  const inlineImpedanceSmyckyRef = useRef<HTMLInputElement>(null);

  // Auto-focus na název při vstupu do hromadného vstupu (mount komponenty)
  useEffect(() => {
    const t = setTimeout(() => inlineNazevRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const handleInlineOkruhSave = async () => {
    if (!inlineOkruhDraft.nazev.trim()) return;
    const vodic = computeVodic(inlineOkruhDraft.typKabelu, inlineOkruhDraft.pocetZil, inlineOkruhDraft.prurez);
    await okruhService.create({
      rozvadecId,
      cislo: inlineOkruhDraft.cislo,
      nazev: inlineOkruhDraft.nazev,
      jisticTyp: inlineOkruhDraft.jisticTyp,
      jisticProud: inlineOkruhDraft.jisticProud,
      pocetFazi: inlineOkruhDraft.pocetFazi,
      typKabelu: inlineOkruhDraft.typKabelu || undefined,
      pocetZil: inlineOkruhDraft.pocetZil || undefined,
      prurez: inlineOkruhDraft.prurez || undefined,
      vodic: vodic || undefined,
      izolacniOdpor: inlineOkruhDraft.izolacniOdpor || undefined,
      impedanceSmycky: inlineOkruhDraft.impedanceSmycky || undefined,
    });
    const okruhyData = await okruhService.getByRozvadec(rozvadecId);
    onSaved(okruhyData);
    const nextCislo = okruhyData.length > 0 ? Math.max(...okruhyData.map(o => o.cislo)) + 1 : 1;
    setInlineOkruhDraft(d => ({ ...d, cislo: nextCislo, nazev: '', izolacniOdpor: '', impedanceSmycky: '' }));
    setTimeout(() => inlineNazevRef.current?.focus(), 50);
  };

  // Shift+Enter — uloží řádek a zkopíruje tech. data (jistic, kabel) do nového
  const handleInlineOkruhSaveDuplicate = async () => {
    if (!inlineOkruhDraft.nazev.trim()) return;
    const prevDraft = { ...inlineOkruhDraft };
    const vodic = computeVodic(prevDraft.typKabelu, prevDraft.pocetZil, prevDraft.prurez);
    await okruhService.create({
      rozvadecId,
      cislo: prevDraft.cislo,
      nazev: prevDraft.nazev,
      jisticTyp: prevDraft.jisticTyp,
      jisticProud: prevDraft.jisticProud,
      pocetFazi: prevDraft.pocetFazi,
      typKabelu: prevDraft.typKabelu || undefined,
      pocetZil: prevDraft.pocetZil || undefined,
      prurez: prevDraft.prurez || undefined,
      vodic: vodic || undefined,
      izolacniOdpor: prevDraft.izolacniOdpor || undefined,
      impedanceSmycky: prevDraft.impedanceSmycky || undefined,
    });
    const okruhyData = await okruhService.getByRozvadec(rozvadecId);
    onSaved(okruhyData);
    const nextCislo = okruhyData.length > 0 ? Math.max(...okruhyData.map(o => o.cislo)) + 1 : 1;
    // Zachovat všechna data z předchozího řádku, pouze inkrementovat cislo
    setInlineOkruhDraft({ ...prevDraft, cislo: nextCislo });
    setTimeout(() => inlineNazevRef.current?.focus(), 50);
  };

  const handleInlineOkruhKeyDown = (
    e: React.KeyboardEvent,
    field: 'nazev' | 'jisticTyp' | 'jisticProud' | 'pocetFazi' | 'typKabelu' | 'pocetZil' | 'prurez' | 'izolacniOdpor' | 'impedanceSmycky',
  ) => {
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); handleInlineOkruhSaveDuplicate(); return; }
    if (e.key === 'Enter') { e.preventDefault(); handleInlineOkruhSave(); return; }
    if (e.key === 'Tab' && !e.shiftKey) {
      const order = ['nazev', 'jisticTyp', 'jisticProud', 'pocetFazi', 'typKabelu', 'pocetZil', 'prurez', 'izolacniOdpor', 'impedanceSmycky'] as const;
      const refs = [inlineNazevRef, inlineJisticTypRef, inlineJisticProudRef, inlinePocetFaziRef, inlineTypKabeluRef, inlinePocetZilRef, inlinePrurezRef, inlineIzolacniOdporRef, inlineImpedanceSmyckyRef];
      const idx = order.indexOf(field as typeof order[number]);
      if (idx < order.length - 1) {
        e.preventDefault();
        refs[idx + 1].current?.focus();
      } else {
        e.preventDefault();
        handleInlineOkruhSave();
      }
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)] text-xs text-[var(--text-secondary)] uppercase tracking-wide">
            <th className="text-left py-2 pr-2 font-medium w-8">Č.</th>
            <th className="text-left py-2 pr-2 font-medium">Název</th>
            <th className="text-left py-2 pr-2 font-medium w-16">Typ</th>
            <th className="text-left py-2 pr-2 font-medium w-20">Proud</th>
            <th className="text-left py-2 pr-2 font-medium w-14">Fáze</th>
            <th className="text-left py-2 pr-2 font-medium w-20">Kabel</th>
            <th className="text-left py-2 pr-2 font-medium w-14">Žíly</th>
            <th className="text-left py-2 pr-2 font-medium w-16">Průřez</th>
            <th className="text-left py-2 pr-2 font-medium w-20">Iz. odpor</th>
            <th className="text-left py-2 pr-2 font-medium w-20">Imp. smyčky</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {okruhy.sort((a, b) => a.cislo - b.cislo).map((o) => (
            <tr key={o.id} className="border-b border-[var(--border-subtle)] border-l-2 border-l-transparent hover:border-l-[var(--primary)] hover:bg-[var(--bg-hover)] group">
              <td className="py-1.5 pr-2 text-xs font-medium text-[var(--text-secondary)]">{o.cislo}</td>
              <td className="py-1.5 pr-2 text-xs font-medium text-[var(--text)]">{o.nazev}</td>
              <td className="py-1.5 pr-2">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]">{o.jisticTyp}</span>
              </td>
              <td className="py-1.5 pr-2 text-xs text-[var(--text-secondary)]">{o.jisticProud}</td>
              <td className="py-1.5 pr-2 text-xs text-[var(--text-secondary)]">{o.pocetFazi}P</td>
              <td className="py-1.5 pr-2 text-xs text-[var(--text-secondary)]">{o.typKabelu || '—'}</td>
              <td className="py-1.5 pr-2 text-xs text-[var(--text-secondary)]">{o.pocetZil || '—'}</td>
              <td className="py-1.5 pr-2 text-xs text-[var(--text-secondary)]">{o.prurez ? `${o.prurez} mm²` : '—'}</td>
              <td className="py-1.5 pr-2 text-xs text-[var(--text-secondary)]">{o.izolacniOdpor || '—'}</td>
              <td className="py-1.5 pr-2 text-xs text-[var(--text-secondary)]">{o.impedanceSmycky || '—'}</td>
              <td className="py-1.5">
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" title="Upravit" onClick={() => onEdit(o)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] text-xs">✎</button>
                  <button type="button" title="Smazat" onClick={() => onDelete(o.id!)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--danger-bg)] text-[var(--text-secondary)] hover:text-[var(--danger-text)] text-xs">✕</button>
                </div>
              </td>
            </tr>
          ))}
          {/* Draft řádek */}
          <tr className="bg-[var(--bg-accent)] border-b border-blue-500/[0.20]">
            <td className="py-1 pr-2 text-xs font-medium text-[var(--text-secondary)] pl-1">{inlineOkruhDraft.cislo}</td>
            <td className="py-1 pr-2">
              <input ref={inlineNazevRef} type="text" value={inlineOkruhDraft.nazev}
                onChange={(e) => setInlineOkruhDraft(d => ({ ...d, nazev: e.target.value }))}
                onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'nazev')}
                placeholder="Název okruhu..." autoComplete="off"
                className="w-full px-2 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]" />
            </td>
            <td className="py-1 pr-2">
              <select ref={inlineJisticTypRef} value={inlineOkruhDraft.jisticTyp}
                onChange={(e) => setInlineOkruhDraft(d => ({ ...d, jisticTyp: e.target.value }))}
                onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'jisticTyp')}
                className="w-full px-1.5 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]">
                {['B','C','D','gG','aM','IT','IJ','IJV','ITM'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </td>
            <td className="py-1 pr-2">
              <select ref={inlineJisticProudRef} value={inlineOkruhDraft.jisticProud}
                onChange={(e) => setInlineOkruhDraft(d => ({ ...d, jisticProud: e.target.value }))}
                onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'jisticProud')}
                className="w-full px-1.5 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]">
                {['2A','4A','6A','10A','13A','16A','20A','25A','32A','40A','50A','63A','80A','100A','125A','160A'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </td>
            <td className="py-1 pr-2">
              <select ref={inlinePocetFaziRef} value={inlineOkruhDraft.pocetFazi}
                onChange={(e) => setInlineOkruhDraft(d => ({ ...d, pocetFazi: Number(e.target.value) }))}
                onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'pocetFazi')}
                className="w-full px-1.5 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]">
                <option value={1}>1P</option>
                <option value={2}>2P</option>
                <option value={3}>3P</option>
              </select>
            </td>
            <td className="py-1 pr-2">
              <select ref={inlineTypKabeluRef} value={inlineOkruhDraft.typKabelu}
                onChange={(e) => setInlineOkruhDraft(d => ({ ...d, typKabelu: e.target.value }))}
                onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'typKabelu')}
                className="w-full px-1.5 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]">
                {TYPY_KABELU.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </td>
            <td className="py-1 pr-2">
              <select ref={inlinePocetZilRef} value={inlineOkruhDraft.pocetZil}
                onChange={(e) => setInlineOkruhDraft(d => ({ ...d, pocetZil: e.target.value }))}
                onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'pocetZil')}
                className="w-full px-1.5 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]">
                {['1','2','3','4','5'].map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </td>
            <td className="py-1 pr-2">
              <select ref={inlinePrurezRef} value={inlineOkruhDraft.prurez}
                onChange={(e) => setInlineOkruhDraft(d => ({ ...d, prurez: e.target.value }))}
                onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'prurez')}
                className="w-full px-1.5 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]">
                {PRUREZY.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </td>
            <td className="py-1 pr-2">
              <input ref={inlineIzolacniOdporRef} type="text" value={inlineOkruhDraft.izolacniOdpor}
                onChange={(e) => setInlineOkruhDraft(d => ({ ...d, izolacniOdpor: e.target.value }))}
                onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'izolacniOdpor')}
                placeholder="MΩ" autoComplete="off"
                className="w-full px-2 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]" />
            </td>
            <td className="py-1 pr-2">
              <input ref={inlineImpedanceSmyckyRef} type="text" value={inlineOkruhDraft.impedanceSmycky}
                onChange={(e) => setInlineOkruhDraft(d => ({ ...d, impedanceSmycky: e.target.value }))}
                onKeyDown={(e) => handleInlineOkruhKeyDown(e, 'impedanceSmycky')}
                placeholder="Ω" autoComplete="off"
                className="w-full px-2 py-1 border border-[var(--border-input)] rounded bg-[var(--bg-input)] text-[var(--text)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring-color)]" />
            </td>
            <td className="py-1">
              <button type="button" title="Uložit (Enter)" onClick={() => handleInlineOkruhSave()}
                disabled={!inlineOkruhDraft.nazev.trim()}
                className="w-7 h-7 flex items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-base">↵</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-[var(--text-secondary)] mt-2 select-none">
        <kbd className="px-1 bg-[var(--bg-hover)] rounded border border-[var(--border-medium)] text-[10px]">Tab</kbd> přechod &nbsp;·&nbsp;
        <kbd className="px-1 bg-[var(--bg-hover)] rounded border border-[var(--border-medium)] text-[10px]">Enter</kbd> uložit řádek &nbsp;·&nbsp;
        <kbd className="px-1 bg-[var(--bg-hover)] rounded border border-[var(--border-medium)] text-[10px]">Shift+Enter</kbd> uložit + zkopírovat celý řádek &nbsp;·&nbsp;
        ✎ upravit vč. poznámky
      </p>
    </div>
  );
}
