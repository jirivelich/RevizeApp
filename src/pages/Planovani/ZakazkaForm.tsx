import { Input, Select, Modal, Button } from '../../components/ui';
import type { Revize } from '../../types';
import type { ZakazkaFormData } from './utils';
import { PRIORITA_OPTIONS, STAV_OPTIONS } from './utils';

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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Upravit zakázku' : 'Nová zakázka'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Zrušit
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? 'Uložit' : 'Vytvořit'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Název zakázky"
          value={formData.nazev}
          onChange={(e) => setFormData((prev) => ({ ...prev, nazev: e.target.value }))}
          required
        />
        <Input
          label="Klient"
          value={formData.klient}
          onChange={(e) => setFormData((prev) => ({ ...prev, klient: e.target.value }))}
          required
        />
        <Input
          label="Adresa"
          value={formData.adresa}
          onChange={(e) => setFormData((prev) => ({ ...prev, adresa: e.target.value }))}
          required
        />
        <Input
          type="date"
          label="Plánované datum"
          value={formData.datumPlanovany}
          onChange={(e) => setFormData((prev) => ({ ...prev, datumPlanovany: e.target.value }))}
          required
        />
        <Input
          type="time"
          label="Plánovaný čas"
          value={formData.casPlanovany}
          onChange={(e) => setFormData((prev) => ({ ...prev, casPlanovany: e.target.value }))}
        />
        <Select
          label="Stav"
          value={formData.stav}
          onChange={(e) => setFormData((prev) => ({ ...prev, stav: e.target.value as ZakazkaFormData['stav'] }))}
          options={[...STAV_OPTIONS]}
        />
        <Select
          label="Priorita"
          value={formData.priorita}
          onChange={(e) => setFormData((prev) => ({ ...prev, priorita: e.target.value as ZakazkaFormData['priorita'] }))}
          options={[...PRIORITA_OPTIONS]}
        />
        <Select
          label="Propojit s revizí (volitelné)"
          value={formData.revizeId?.toString() || ''}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              revizeId: e.target.value ? parseInt(e.target.value) : undefined,
            }))
          }
          options={[
            { value: '', label: '-- Bez propojení --' },
            ...revize.map((r) => ({
              value: r.id!.toString(),
              label: `${r.cisloRevize} - ${r.nazev}`,
            })),
          ]}
        />
        <Input
          label="Poznámka"
          value={formData.poznamka}
          onChange={(e) => setFormData((prev) => ({ ...prev, poznamka: e.target.value }))}
        />
      </form>
    </Modal>
  );
}
