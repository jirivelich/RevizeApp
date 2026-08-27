import { useState } from 'react';
import { Input, Select, Modal, Button } from '../../components/ui';
import type { Revize } from '../../types';
import type { ZakazkaFormData } from './utils';
import { PRIORITA_OPTIONS, STAV_OPTIONS, addDays } from './utils';

interface ZakazkaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ZakazkaFormData) => void;
  formData: ZakazkaFormData;
  setFormData: React.Dispatch<React.SetStateAction<ZakazkaFormData>>;
  revize: Revize[];
  isEditing: boolean;
}

export function ZakazkaForm({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  revize,
  isEditing,
}: ZakazkaFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

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
      setFormError('Zadejte 1. den realizace');
      return;
    }
    setFormError(null);
    onSubmit(formData);
  };

  const sortedExtra = [...formData.datumyRealizace].sort();

  const addExtraDay = () => {
    const lastDay = sortedExtra.length > 0
      ? sortedExtra[sortedExtra.length - 1]
      : formData.datumPlanovany;
    const next = addDays(lastDay, 1);
    if (!formData.datumyRealizace.includes(next)) {
      setFormData((prev) => ({ ...prev, datumyRealizace: [...prev.datumyRealizace, next] }));
    }
  };

  const removeExtraDay = (day: string) => {
    setFormData((prev) => ({ ...prev, datumyRealizace: prev.datumyRealizace.filter((d) => d !== day) }));
  };

  const updateExtraDay = (oldDay: string, newDay: string) => {
    setFormData((prev) => ({
      ...prev,
      datumyRealizace: prev.datumyRealizace.map((d) => (d === oldDay ? newDay : d)),
    }));
  };

  const allDays = [formData.datumPlanovany, ...formData.datumyRealizace].sort();
  const lastDay = allDays[allDays.length - 1];
  const deadlineZpravy = lastDay ? addDays(lastDay, formData.lhutaZpravyDni || 4) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Upravit zakázku' : 'Nová zakázka'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Zrušit</Button>
          <Button onClick={handleSubmit}>{isEditing ? 'Uložit' : 'Vytvořit'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Název zakázky" value={formData.nazev} onChange={(e) => setFormData((prev) => ({ ...prev, nazev: e.target.value }))} required />
        <Input label="Klient" value={formData.klient} onChange={(e) => setFormData((prev) => ({ ...prev, klient: e.target.value }))} required />
        <Input label="Adresa" value={formData.adresa} onChange={(e) => setFormData((prev) => ({ ...prev, adresa: e.target.value }))} required />

        {/* Dny realizace */}
        <div>
          <Input
            type="date"
            label="1. den realizace"
            value={formData.datumPlanovany}
            onChange={(e) => setFormData((prev) => ({ ...prev, datumPlanovany: e.target.value }))}
            required
          />
          {sortedExtra.length > 0 && (
            <div className="mt-2 space-y-2">
              {sortedExtra.map((day) => (
                <div key={day} className="flex items-center gap-2">
                  <input
                    type="date"
                    value={day}
                    onChange={(e) => updateExtraDay(day, e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeExtraDay(day)}
                    className="text-[var(--text-secondary)] hover:text-red-500 transition-colors px-2 py-1 text-lg leading-none"
                    title="Odebrat den"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={addExtraDay}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            + Přidat další den realizace
          </button>
        </div>

        <Input type="time" label="Plánovaný čas (1. den)" value={formData.casPlanovany} onChange={(e) => setFormData((prev) => ({ ...prev, casPlanovany: e.target.value }))} />

        {/* Revizní zpráva */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Revizní zpráva</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                type="number"
                label="Lhůta pro zprávu (dní od dokončení)"
                value={String(formData.lhutaZpravyDni)}
                onChange={(e) => setFormData((prev) => ({ ...prev, lhutaZpravyDni: parseInt(e.target.value) || 4 }))}
              />
            </div>
            {deadlineZpravy && (
              <div className="mb-2 text-xs text-amber-600 font-medium whitespace-nowrap">
                → do {new Date(deadlineZpravy).toLocaleDateString('cs-CZ')}
              </div>
            )}
          </div>
          <Input
            type="date"
            label="Plánované odevzdání zprávy (volitelné)"
            value={formData.datumOdevzdaniZpravy}
            onChange={(e) => setFormData((prev) => ({ ...prev, datumOdevzdaniZpravy: e.target.value }))}
          />
        </div>

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
          <p className="text-xs font-medium text-[var(--danger)] bg-red-500/[0.10] border border-red-500/[0.25] rounded-lg px-3 py-2">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  );
}
