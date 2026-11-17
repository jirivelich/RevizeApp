import { useEffect, useState } from 'react';
import { Button, Input, Modal, Textarea } from './ui';
import { useCreateZakaznik, useUpdateZakaznik, useZakaznici } from '../hooks/useQueries';
import { aresService } from '../services/aresService';
import type { AresSubjekt } from '../services/aresService';
import type { Zakaznik } from '../types';

type ZakaznikForm = {
  nazev: string;
  adresa: string;
  ico: string;
  dic: string;
  kontaktOsoba: string;
  telefon: string;
  email: string;
  poznamka: string;
};

const PRAZDNY: ZakaznikForm = {
  nazev: '', adresa: '', ico: '', dic: '', kontaktOsoba: '', telefon: '', email: '', poznamka: '',
};

interface ZakaznikFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Upravovaný zákazník; bez něj se vytváří nový. */
  zakaznik?: Zakaznik | null;
  /** Předvyplnění nového zákazníka (např. text z pole Objednatel). */
  vychozi?: Partial<ZakaznikForm>;
  /** Zavolá se po uložení s uloženým zákazníkem (včetně id). */
  onSaved?: (zakaznik: Zakaznik) => void;
}

export function ZakaznikFormModal({ isOpen, onClose, zakaznik, vychozi, onSaved }: ZakaznikFormModalProps) {
  const createZakaznik = useCreateZakaznik();
  const updateZakaznik = useUpdateZakaznik();
  const { data: zakaznici = [] } = useZakaznici();
  const jeNovy = !zakaznik?.id;

  const [form, setForm] = useState<ZakaznikForm>(PRAZDNY);
  const [chyba, setChyba] = useState<string | null>(null);
  const [ukladam, setUkladam] = useState(false);

  const [aresNacitam, setAresNacitam] = useState(false);
  const [aresChyba, setAresChyba] = useState<string | null>(null);
  const [aresInfo, setAresInfo] = useState<string | null>(null);
  const [aresVysledky, setAresVysledky] = useState<AresSubjekt[] | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(zakaznik
      ? {
          nazev: zakaznik.nazev || '', adresa: zakaznik.adresa || '', ico: zakaznik.ico || '', dic: zakaznik.dic || '',
          kontaktOsoba: zakaznik.kontaktOsoba || '', telefon: zakaznik.telefon || '', email: zakaznik.email || '',
          poznamka: zakaznik.poznamka || '',
        }
      : { ...PRAZDNY, ...vychozi });
    setChyba(null);
    setAresChyba(null);
    setAresInfo(null);
    setAresVysledky(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, zakaznik]);

  const set = (pole: keyof ZakaznikForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [pole]: e.target.value }));

  const pouzijSubjekt = (s: AresSubjekt) => {
    setForm(f => ({ ...f, nazev: s.nazev || f.nazev, adresa: s.adresa || f.adresa, ico: s.ico || f.ico, dic: s.dic || f.dic }));
    setAresVysledky(null);
    setAresChyba(null);
    setAresInfo(`Vyplněno z ARES: ${s.nazev}`);
  };

  const nactiPodleIco = async () => {
    setAresChyba(null); setAresInfo(null); setAresVysledky(null);
    if (!form.ico.trim()) { setAresChyba('Vyplňte IČO'); return; }
    setAresNacitam(true);
    try {
      pouzijSubjekt(await aresService.podleIco(form.ico));
    } catch (e) {
      setAresChyba((e as Error).message);
    } finally {
      setAresNacitam(false);
    }
  };

  const hledejPodleNazvu = async () => {
    setAresChyba(null); setAresInfo(null); setAresVysledky(null);
    if (form.nazev.trim().length < 3) { setAresChyba('Pro hledání v ARES zadejte alespoň 3 znaky názvu'); return; }
    setAresNacitam(true);
    try {
      const vysledky = await aresService.hledat(form.nazev);
      if (vysledky.length === 0) setAresChyba('V ARES nebyl nalezen žádný subjekt, zkuste upřesnit název');
      else setAresVysledky(vysledky);
    } catch (e) {
      setAresChyba((e as Error).message);
    } finally {
      setAresNacitam(false);
    }
  };

  const icoNorm = form.ico.replace(/\s+/g, '');
  const duplicita = icoNorm
    ? zakaznici.find(z => z.id !== zakaznik?.id && (z.ico || '').replace(/\s+/g, '') === icoNorm)
    : undefined;

  const ulozit = async () => {
    if (!form.nazev.trim()) return;
    setUkladam(true);
    setChyba(null);
    try {
      const data = { ...form, nazev: form.nazev.trim() };
      let id = zakaznik?.id;
      if (jeNovy) id = await createZakaznik.mutateAsync(data);
      else await updateZakaznik.mutateAsync({ id: id!, data });
      onSaved?.({ ...zakaznik, ...data, id });
      onClose();
    } catch (error) {
      console.error('Chyba při ukládání zákazníka:', error);
      setChyba('Nepodařilo se uložit zákazníka');
    } finally {
      setUkladam(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={jeNovy ? 'Nový zákazník' : 'Upravit zákazníka'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Zrušit</Button>
          <Button onClick={ulozit} disabled={!form.nazev.trim() || ukladam}>
            {ukladam ? 'Ukládám…' : jeNovy ? 'Vytvořit' : 'Uložit'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* ARES */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-accent)] p-3 space-y-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">Rychlé vyplnění z ARES</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="IČO"
                value={form.ico}
                inputMode="numeric"
                placeholder="např. 27074358"
                onChange={set('ico')}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); nactiPodleIco(); } }}
              />
            </div>
            <Button variant="secondary" onClick={nactiPodleIco} disabled={aresNacitam}>
              {aresNacitam ? 'Načítám…' : 'Načíst z ARES'}
            </Button>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Nebo vyplňte název níže a{' '}
            <button type="button" className="underline text-[var(--primary-text)] disabled:opacity-50" onClick={hledejPodleNazvu} disabled={aresNacitam}>
              vyhledejte ho v ARES
            </button>.
          </p>
          {aresChyba && <p role="alert" className="text-xs text-[var(--danger-text)]">{aresChyba}</p>}
          {aresInfo && <p className="text-xs text-[var(--success-text)]">{aresInfo}</p>}
          {aresVysledky && (
            <ul className="max-h-56 overflow-y-auto divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
              {aresVysledky.map(s => (
                <li key={s.ico}>
                  <button type="button" onClick={() => pouzijSubjekt(s)} className="w-full text-left px-3 py-2 hover:bg-[var(--bg-hover)]">
                    <span className="block text-sm font-medium text-[var(--text)]">{s.nazev}</span>
                    <span className="block text-xs text-[var(--text-muted)]">IČO {s.ico}{s.adresa ? ` · ${s.adresa}` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {duplicita && (
          <p className="text-xs text-[var(--warning-text)] bg-[var(--warning-bg)] border border-[var(--warning)]/25 rounded-lg px-3 py-2">
            Zákazník se stejným IČO už v seznamu je: <strong>{duplicita.nazev}</strong>
          </p>
        )}

        <Input label="Název / Jméno *" value={form.nazev} onChange={set('nazev')} required />
        <Input label="Adresa" value={form.adresa} onChange={set('adresa')} />
        <Input label="DIČ" value={form.dic} onChange={set('dic')} />
        <Input label="Kontaktní osoba" value={form.kontaktOsoba} onChange={set('kontaktOsoba')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Telefon" value={form.telefon} onChange={set('telefon')} />
          <Input label="Email" type="email" value={form.email} onChange={set('email')} />
        </div>
        <Textarea label="Poznámka" value={form.poznamka} onChange={set('poznamka')} rows={3} />

        {chyba && (
          <p className="text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger)]/25 rounded-lg px-3 py-2">
            {chyba}
          </p>
        )}
      </div>
    </Modal>
  );
}
