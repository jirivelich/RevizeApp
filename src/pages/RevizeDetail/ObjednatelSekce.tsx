import { useState } from 'react';
import type { Revize, Zakaznik } from '../../types';
import { Input } from '../../components/ui';
import { ZakaznikFormModal } from '../../components/ZakaznikFormModal';
import { TW, SectionHeader, Field } from './tw';

interface ObjednatelSekceProps {
  formData: Partial<Revize>;
  setFormData: (data: Partial<Revize>) => void;
  zakaznici: Zakaznik[];
  selectedZakaznikId: string;
  setSelectedZakaznikId: (id: string) => void;
  saveNow?: () => void;
}

/** Sekce 02 – Objednatel: výběr ze zákazníků nebo rychlé přidání nového (s ARES). */
export function ObjednatelSekce({
  formData, setFormData, zakaznici, selectedZakaznikId, setSelectedZakaznikId, saveNow,
}: ObjednatelSekceProps) {
  const [novyOpen, setNovyOpen] = useState(false);
  // Právě vytvořený zákazník – zobrazí se, i než se seznam znovu načte
  const [novy, setNovy] = useState<Zakaznik | null>(null);

  const seznam = novy?.id && !zakaznici.some(z => z.id === novy.id) ? [...zakaznici, novy] : zakaznici;

  const priradZakaznika = (zakaznik: Zakaznik) => {
    setSelectedZakaznikId(String(zakaznik.id));
    setFormData({ ...formData, objednatel: zakaznik.nazev, zakaznikId: zakaznik.id });
    saveNow?.();
  };

  const zakaznik = selectedZakaznikId ? seznam.find(z => z.id === parseInt(selectedZakaznikId)) : undefined;

  return (
    <div className={TW.card}>
      <SectionHeader num="02">Objednatel / Provozovatel</SectionHeader>
      <div className="p-4 space-y-3">
        <div className={TW.grid2}>
          <Input label="Objednatel" placeholder="Nebo vyberte zákazníka" value={formData.objednatel || ''} onChange={(e) => setFormData({ ...formData, objednatel: e.target.value })} />
          <Field label="Ze zákazníků">
            <div className="flex gap-2">
              <select className={TW.selectFull} value={selectedZakaznikId} onChange={(e) => {
                const id = e.target.value;
                if (id) {
                  const z = seznam.find(z => z.id === parseInt(id));
                  if (z) priradZakaznika(z);
                } else {
                  setSelectedZakaznikId('');
                  setFormData({ ...formData, zakaznikId: undefined });
                  saveNow?.();
                }
              }}>
                <option value="">-- Vyberte zákazníka --</option>
                {seznam.filter(z => z.id !== undefined).map(z => <option key={z.id} value={z.id!.toString()}>{z.nazev}{z.adresa ? ` (${z.adresa})` : ''}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setNovyOpen(true)}
                title="Přidat nového zákazníka (s načtením z ARES)"
                className="shrink-0 px-3 min-h-[40px] rounded-[var(--radius-md)] text-sm font-medium border border-[var(--border-input)] bg-[var(--bg-surface)] text-[var(--text)] hover:bg-[var(--bg-hover)] whitespace-nowrap"
              >
                + Nový
              </button>
            </div>
          </Field>
        </div>
        {zakaznik && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-[var(--text-muted)] bg-[var(--bg-accent)] rounded p-2">
            {zakaznik.adresa && <span>Adresa: {zakaznik.adresa}</span>}
            {zakaznik.ico && <span>IČO: {zakaznik.ico}</span>}
            {zakaznik.kontaktOsoba && <span>Kontakt: {zakaznik.kontaktOsoba}</span>}
            {zakaznik.telefon && <span>Tel: {zakaznik.telefon}</span>}
          </div>
        )}
      </div>

      <ZakaznikFormModal
        isOpen={novyOpen}
        onClose={() => setNovyOpen(false)}
        vychozi={selectedZakaznikId ? undefined : { nazev: formData.objednatel || '' }}
        onSaved={(z) => { setNovy(z); priradZakaznika(z); }}
      />
    </div>
  );
}
