/**
 * Položky dokladu (faktura, cenová nabídka): řádky s popisem, druhem činnosti,
 * množstvím, jednotkou a cenou, celková částka a výběr z ceníku podle kategorií.
 */
import { useState } from 'react';
import type React from 'react';
import { Button, Input, Modal } from './ui';
import { spoctiPolozku } from '../services/fakturaUtils';
import { novyRadek, toNumCz, celkemRadku, type RadekState } from './polozkyDokladuModel';
import { formatKc } from '../pages/fakturaUi';
import { CINNOST_OPTIONS, nazevCinnosti, seskupitPodleKategorie } from '../utils/druhyCinnosti';
import type { CenikPolozka } from '../types';

interface Props {
  radky: RadekState[];
  setRadky: React.Dispatch<React.SetStateAction<RadekState[]>>;
  cenik: CenikPolozka[];
  readOnly?: boolean;
}

export function PolozkyDokladu({ radky, setRadky, cenik, readOnly = false }: Props) {
  const [cenikOpen, setCenikOpen] = useState(false);
  const [cenikHledat, setCenikHledat] = useState('');

  const updateRadek = (key: number, patch: Partial<RadekState>) =>
    setRadky(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const pridatZCeniku = (c: CenikPolozka) => {
    setRadky(rs => {
      const novy = novyRadek({ popis: c.nazev, mnozstvi: '1', jednotka: c.jednotka || '', cena: String(c.cena), cinnost: c.cinnost || '' });
      // prázdný výchozí řádek nahradíme
      const jenPrazdny = rs.length === 1 && !rs[0].popis.trim() && toNumCz(rs[0].cena) === 0;
      return jenPrazdny ? [novy] : [...rs, novy];
    });
    setCenikOpen(false);
    setCenikHledat('');
  };

  const aktivniCenik = cenik.filter(c => c.aktivni);
  const cenikSkupiny = seskupitPodleKategorie(aktivniCenik.filter(c => {
    const q = cenikHledat.trim().toLowerCase();
    return !q || c.nazev.toLowerCase().includes(q) || (c.kategorie || '').toLowerCase().includes(q);
  }));

  return (
    <div className="space-y-3">
      <div className="hidden md:grid grid-cols-[1fr_80px_80px_110px_110px_32px] gap-2 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
        <span>Popis</span><span>Množství</span><span>Jednotka</span><span>Cena / j.</span><span className="text-right">Celkem</span><span />
      </div>
      {radky.map((r, idx) => (
        <div key={r.key} className="grid grid-cols-2 md:grid-cols-[1fr_80px_80px_110px_110px_32px] gap-2 items-center" data-testid="radek">
          <div className="col-span-2 md:col-span-1 space-y-1">
            <Input aria-label={`Popis položky ${idx + 1}`} placeholder="Popis" value={r.popis} onChange={(e) => updateRadek(r.key, { popis: e.target.value })} />
            <select aria-label={`Druh činnosti ${idx + 1}`} value={r.cinnost} disabled={readOnly}
              onChange={(e) => updateRadek(r.key, { cinnost: e.target.value })}
              className="w-full min-h-[30px] px-2 text-xs rounded-[var(--radius-sm)] bg-transparent border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              {CINNOST_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value ? o.label : 'Druh činnosti – neurčeno'}</option>)}
            </select>
          </div>
          <Input aria-label={`Množství ${idx + 1}`} inputMode="decimal" value={r.mnozstvi} onChange={(e) => updateRadek(r.key, { mnozstvi: e.target.value })} />
          <Input aria-label={`Jednotka ${idx + 1}`} value={r.jednotka} onChange={(e) => updateRadek(r.key, { jednotka: e.target.value })} />
          <Input aria-label={`Cena za jednotku ${idx + 1}`} inputMode="decimal" value={r.cena} onChange={(e) => updateRadek(r.key, { cena: e.target.value })} />
          <span className="text-sm text-right text-[var(--text)] whitespace-nowrap tabular-nums" data-testid="radek-celkem">
            {formatKc(spoctiPolozku(toNumCz(r.mnozstvi), toNumCz(r.cena)))}
          </span>
          {!readOnly && (
            <Button
              variant="danger"
              size="sm"
              aria-label={`Odebrat položku ${idx + 1}`}
              disabled={radky.length === 1}
              onClick={() => setRadky(rs => rs.filter(x => x.key !== r.key))}
            >
              ×
            </Button>
          )}
        </div>
      ))}
      {!readOnly && (
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => setRadky(rs => [...rs, novyRadek()])}>+ Přidat položku</Button>
          <Button variant="secondary" size="sm" onClick={() => setCenikOpen(true)}>Přidat z ceníku</Button>
        </div>
      )}
      <div className="flex justify-end pt-2 border-t border-[var(--border)]">
        <span className="text-lg font-bold text-[var(--text)] tabular-nums" data-testid="celkem">Celkem: {formatKc(celkemRadku(radky))}</span>
      </div>
      <p className="text-xs text-[var(--text-muted)] text-right">Nejsem plátce DPH.</p>

      <Modal isOpen={cenikOpen} onClose={() => { setCenikOpen(false); setCenikHledat(''); }} title="Přidat z ceníku">
        <div className="space-y-3">
          {aktivniCenik.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] text-center py-4">Ceník je prázdný.</p>
          ) : (
            <>
              <Input placeholder="Hledat v ceníku…" value={cenikHledat} onChange={(e) => setCenikHledat(e.target.value)} autoFocus />
              {cenikSkupiny.length === 0 && <p className="text-xs text-[var(--text-secondary)] text-center py-2">Nic nenalezeno.</p>}
              {cenikSkupiny.map(([kat, polozky]) => (
                <div key={kat} className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">{kat}</p>
                  {polozky.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pridatZCeniku(c)}
                      className="w-full flex justify-between items-center gap-3 p-3 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)] text-left cursor-pointer"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm text-[var(--text)] truncate">{c.nazev}</span>
                        {c.cinnost && <span className="block text-[11px] text-[var(--text-muted)]">{nazevCinnosti(c.cinnost)}</span>}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">{formatKc(c.cena)}{c.jednotka ? ` / ${c.jednotka}` : ''}</span>
                    </button>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
