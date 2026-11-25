import { lazy, Suspense, useState } from 'react';
import { Input, Select, Modal, Button } from '../../components/ui';
import type { Revize, Zakaznik, KategorieRevize } from '../../types';
import { KATEGORIE_LABELS } from '../../types';
import type { ZakazkaFormData } from './utils';
import { PRIORITA_OPTIONS, STAV_OPTIONS, MAX_DNU_ROZSAHU, dnyMezi, dnyRealizaceZFormulare } from './utils';
import { useQuery } from '@tanstack/react-query';
import { nactiKalendareProZakazky } from '../../services/googleCalendar';
import { NavigaceMenu } from '../../components/Navigace';

// Mapa (Leaflet) se načte až při otevření
const PolohaModal = lazy(() => import('../../components/PolohaModal'));

interface ZakazkaFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** Může vrátit Promise – tlačítko Uložit je pak až do dokončení zablokované. */
  onSubmit: (data: ZakazkaFormData) => void | Promise<unknown>;
  formData: ZakazkaFormData;
  setFormData: React.Dispatch<React.SetStateAction<ZakazkaFormData>>;
  revize: Revize[];
  zakaznici: Zakaznik[];
  isEditing: boolean;
  /** Smazání upravované zakázky (tlačítko se ukáže jen při úpravě). */
  onDelete?: () => void;
}

export function ZakazkaForm({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  revize,
  zakaznici,
  isEditing,
  onDelete,
}: ZakazkaFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [mapaOpen, setMapaOpen] = useState(false);
  const maPolohu = formData.gpsLat != null && formData.gpsLng != null;
  // Google kalendáře, do kterých lze zakázku zapsat (jen při propojeném Google Kalendáři)
  const { data: gKalendare } = useQuery({
    queryKey: ['google', 'kalendare-pro-zakazky'],
    queryFn: nactiKalendareProZakazky,
    enabled: isOpen && typeof navigator !== 'undefined' && navigator.onLine,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const vychoziKalendar = gKalendare?.kalendare.find((c) => c.id === gKalendare.defaultCalendarId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nazev.trim()) {
      setFormError('Zadejte název zakázky');
      return;
    }
    if (!formData.klient.trim()) {
      setFormError('Zadejte klienta');
      return;
    }
    if (!formData.adresa.trim()) {
      setFormError('Zadejte adresu');
      return;
    }
    if (!formData.datumPlanovany) {
      setFormError('Zadejte datum začátku');
      return;
    }
    setFormError(null);
    return onSubmit(formData);
  };

  // Rozsah od–do; jednotlivé dny lze vynechat (víkend, jiná práce)
  const rozsah = dnyMezi(formData.datumPlanovany, formData.datumDo);
  const pocetDnu = dnyRealizaceZFormulare(formData).length;
  const nastavOd = (od: string) => setFormData((prev) => {
    // Posun začátku posune i konec, ať zůstane stejná délka
    const delka = dnyMezi(prev.datumPlanovany, prev.datumDo).length;
    const novyDo = od ? dnyMezi(od, '9999-12-31').slice(0, Math.max(1, delka)).pop() ?? od : prev.datumDo;
    return { ...prev, datumPlanovany: od, datumDo: novyDo, vynechaneDny: [] };
  });
  const nastavDo = (doDne: string) => setFormData((prev) => ({
    ...prev,
    datumDo: doDne && doDne >= prev.datumPlanovany ? doDne : prev.datumPlanovany,
    vynechaneDny: prev.vynechaneDny.filter((d) => d <= doDne),
  }));
  const prepniDen = (d: string) => setFormData((prev) => ({
    ...prev,
    vynechaneDny: prev.vynechaneDny.includes(d) ? prev.vynechaneDny.filter((x) => x !== d) : [...prev.vynechaneDny, d],
  }));
  const bezVikendu = () => setFormData((prev) => ({
    ...prev,
    vynechaneDny: dnyMezi(prev.datumPlanovany, prev.datumDo).filter((d) => { const w = new Date(`${d}T12:00:00`).getDay(); return w === 0 || w === 6; }),
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Upravit zakázku' : 'Nová zakázka'}
      footer={
        <>
          {isEditing && onDelete && (
            <Button variant="danger" onClick={onDelete} className="mr-auto">Smazat</Button>
          )}
          <Button variant="secondary" onClick={onClose}>Zrušit</Button>
          <Button onClick={handleSubmit}>{isEditing ? 'Uložit' : 'Vytvořit'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Název zakázky" value={formData.nazev} onChange={(e) => setFormData((prev) => ({ ...prev, nazev: e.target.value }))} required />
        <Select
          label="Ze zákazníků (volitelné, předvyplní klienta a adresu)"
          value={formData.zakaznikId?.toString() || ''}
          onChange={(e) => {
            const id = e.target.value ? parseInt(e.target.value) : undefined;
            const zakaznik = zakaznici.find((z) => z.id === id);
            setFormData((prev) => ({
              ...prev,
              zakaznikId: id,
              klient: zakaznik?.nazev ?? prev.klient,
              adresa: zakaznik?.adresa ?? prev.adresa,
            }));
          }}
          options={[
            { value: '', label: '-- Bez zákazníka (volný text) --' },
            ...zakaznici.filter((z) => z.id !== undefined).map((z) => ({ value: z.id!.toString(), label: z.nazev })),
          ]}
        />
        <Input label="Klient" value={formData.klient} onChange={(e) => setFormData((prev) => ({ ...prev, klient: e.target.value }))} required />
        <div>
          <Input label="Adresa" value={formData.adresa} onChange={(e) => setFormData((prev) => ({ ...prev, adresa: e.target.value }))} required />
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <button type="button" onClick={() => setMapaOpen(true)} disabled={!formData.adresa.trim() && !maPolohu}
              className="inline-flex items-center gap-1.5 min-h-[36px] font-medium text-[var(--primary-text)] hover:text-[var(--primary-hover)] disabled:opacity-50">
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>
              {maPolohu ? 'Změnit polohu na mapě' : 'Určit polohu na mapě'}
            </button>
            {maPolohu && (
              <>
                <span className="text-xs text-[var(--success-text)]">✓ poloha uložena</span>
                <NavigaceMenu cil={{ adresa: formData.adresa, lat: formData.gpsLat, lng: formData.gpsLng, nazev: formData.nazev }}
                  className="min-h-[36px] text-xs font-medium text-[var(--primary-text)] hover:underline">Navigovat</NavigaceMenu>
                <button type="button" onClick={() => setFormData((prev) => ({ ...prev, gpsLat: null, gpsLng: null }))}
                  className="min-h-[36px] text-xs text-[var(--text-secondary)] hover:text-[var(--danger-text)]">Odebrat</button>
              </>
            )}
          </div>
        </div>
        {mapaOpen && (
          <Suspense fallback={null}>
            <PolohaModal isOpen adresa={formData.adresa} onClose={() => setMapaOpen(false)}
              poloha={maPolohu ? { lat: formData.gpsLat!, lng: formData.gpsLng! } : null}
              onUlozit={(b) => { setFormData((prev) => ({ ...prev, gpsLat: b.lat, gpsLng: b.lng })); setMapaOpen(false); }} />
          </Suspense>
        )}

        {/* Termín: od–do */}
        <div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" label="Od" value={formData.datumPlanovany} onChange={(e) => nastavOd(e.target.value)} required />
            <Input type="date" label="Do" value={formData.datumDo} min={formData.datumPlanovany} onChange={(e) => nastavDo(e.target.value)} />
          </div>
          {rozsah.length > 1 && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                <span>{pocetDnu} {pocetDnu === 1 ? 'den' : pocetDnu < 5 ? 'dny' : 'dní'} realizace · kliknutím den vynecháte</span>
                <button type="button" onClick={bezVikendu} className="font-medium text-[var(--primary-text)] hover:text-[var(--primary-hover)]">Bez víkendů</button>
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dny realizace">
                {rozsah.map((d) => {
                  const dt = new Date(`${d}T12:00:00`);
                  const aktivni = !formData.vynechaneDny.includes(d);
                  return (
                    <button key={d} type="button" aria-pressed={aktivni} onClick={() => prepniDen(d)}
                      className={`min-h-[36px] px-2 rounded-[var(--radius-md)] border text-xs font-semibold tabular-nums ${aktivni
                        ? 'border-[var(--primary)] bg-[var(--bg-accent)] text-[var(--primary-text)]'
                        : 'border-[var(--border-input)] text-[var(--text-muted)] line-through'}`}>
                      {['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'][dt.getDay()]} {dt.getDate()}. {dt.getMonth() + 1}.
                    </button>
                  );
                })}
              </div>
              {rozsah.length >= MAX_DNU_ROZSAHU && (
                <p className="m-0 text-xs text-[var(--warning-text)]">Rozsah je omezený na {MAX_DNU_ROZSAHU} dní.</p>
              )}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--text)] min-h-[40px]">
          <input type="checkbox" className="w-4 h-4 accent-[var(--primary)]" checked={formData.celyDen}
            onChange={(e) => setFormData((prev) => ({ ...prev, celyDen: e.target.checked }))} />
          Celý den (bez konkrétního času)
        </label>
        {!formData.celyDen && (
          <div className="grid grid-cols-2 gap-3">
            <Input type="time" label="Čas od" value={formData.casPlanovany} onChange={(e) => setFormData((prev) => ({ ...prev, casPlanovany: e.target.value }))} />
            <Input type="time" label="Čas do (volitelné)" value={formData.casKonec} onChange={(e) => setFormData((prev) => ({ ...prev, casKonec: e.target.value }))} />
          </div>
        )}

        <Select
          label="Kategorie revize (barva v kalendáři)"
          value={formData.kategorie}
          onChange={(e) => setFormData((prev) => ({ ...prev, kategorie: e.target.value as KategorieRevize | '' }))}
          options={[
            { value: '', label: '-- Neurčeno --' },
            ...(Object.keys(KATEGORIE_LABELS) as KategorieRevize[]).map((k) => ({ value: k, label: KATEGORIE_LABELS[k].plny })),
          ]}
        />

        {gKalendare?.connected && gKalendare.kalendare.length > 0 && (
          <Select
            label="Google kalendář"
            value={formData.googleCalendarId && gKalendare.kalendare.some((c) => c.id === formData.googleCalendarId) ? formData.googleCalendarId : ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, googleCalendarId: e.target.value }))}
            options={[
              { value: '', label: `Výchozí${vychoziKalendar ? ` (${vychoziKalendar.summary})` : ''}` },
              ...gKalendare.kalendare
                .filter((c) => c.id !== gKalendare.defaultCalendarId)
                .map((c) => ({ value: c.id, label: c.summary })),
            ]}
          />
        )}


        <Select label="Stav" value={formData.stav} onChange={(e) => setFormData((prev) => ({ ...prev, stav: e.target.value as ZakazkaFormData['stav'] }))} options={[...STAV_OPTIONS]} />
        <Select label="Priorita" value={formData.priorita} onChange={(e) => setFormData((prev) => ({ ...prev, priorita: e.target.value as ZakazkaFormData['priorita'] }))} options={[...PRIORITA_OPTIONS]} />
        <Select
          label="Propojit s revizí (volitelné)"
          value={formData.revizeId?.toString() || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, revizeId: e.target.value ? parseInt(e.target.value) : undefined }))}
          options={[
            { value: '', label: '-- Bez propojení --' },
            ...revize.map((r) => ({ value: r.id!.toString(), label: `${r.cisloRevize} - ${r.nazev}` })),
          ]}
        />
        <Input label="Poznámka" value={formData.poznamka} onChange={(e) => setFormData((prev) => ({ ...prev, poznamka: e.target.value }))} />

        {formError && (
          <p className="text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] border border-[var(--danger)]/25 rounded-[var(--radius-md)] px-3 py-2">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  );
}
