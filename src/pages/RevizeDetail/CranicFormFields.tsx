import { Input, Select } from '../../components/ui';
import { EditableSelect } from './rozvadeceShared';

export interface CranicFormData {
  cislo: number;
  nazev: string;
  typ: string;
  proud: string;
  citlivostMa: number;
  pocetPolu: number;
  testovacitlacitko?: boolean;
  nevybavovaci?: boolean;
  dotykoveNapeti?: number;
  vybavovacProud?: number;
  casOdpojeni1x?: number;
  casOdpojeni5x?: number;
  casOdpojeni1_4x?: number;
  casOdpojeni2x?: number;
  zkouskaVypnuti2x?: boolean;
  selektivita?: boolean;
  poznamka: string;
}

interface CranicFormFieldsProps {
  data: CranicFormData;
  onChange: (data: CranicFormData) => void;
}

/**
 * Pole formuláře chrániče — sdíleno mezi desktop Modalem a mobilním BottomSheetem
 * v RozvadeceTab, aby se obě varianty nerozcházely (drift mezi kopiemi).
 */
export function CranicFormFields({ data, onChange }: CranicFormFieldsProps) {
  const set = (patch: Partial<CranicFormData>) => onChange({ ...data, ...patch });

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Input type="number" label="Číslo" value={data.cislo} onChange={(e) => set({ cislo: parseInt(e.target.value) || 1 })} required />
        <Input label="Název" value={data.nazev} onChange={(e) => set({ nazev: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <EditableSelect label="Typ chrániče" value={data.typ} onChange={(val) => set({ typ: val })} options={['A', 'AC', 'B', 'F', 'G']} />
        <EditableSelect label="Jmenovitý proud" value={data.proud} onChange={(val) => set({ proud: val })} options={['10A', '16A', '20A', '25A', '32A', '40A', '63A']} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Citlivost IΔn (mA)" value={String(data.citlivostMa)} onChange={(e) => set({ citlivostMa: parseFloat(e.target.value) })} options={[{ value: '10', label: '10 mA' }, { value: '30', label: '30 mA' }, { value: '100', label: '100 mA' }, { value: '300', label: '300 mA' }, { value: '500', label: '500 mA' }]} />
        <Select label="Počet pólů" value={String(data.pocetPolu)} onChange={(e) => set({ pocetPolu: parseInt(e.target.value) })} options={[{ value: '2', label: '2' }, { value: '4', label: '4' }]} />
      </div>
      {/* Měřené hodnoty */}
      <div className="border-t border-[var(--border)] pt-3">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Měřené hodnoty</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox"
              checked={!!data.testovacitlacitko}
              onChange={(e) => set({ testovacitlacitko: e.target.checked || undefined })}
              className="rounded border-[var(--checkbox-border)]" />
            <span>Testovací tlačítko ✓</span>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox"
              checked={!!data.nevybavovaci}
              onChange={(e) => set({ nevybavovaci: e.target.checked || undefined })}
              className="rounded border-[var(--checkbox-border)]" />
            <span>Nevybavení při 0,5×IΔn ✓</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Input type="number" step="0.1" label="Dotykové napětí Uc [V]"
            value={data.dotykoveNapeti ?? ''}
            onChange={(e) => set({ dotykoveNapeti: e.target.value ? parseFloat(e.target.value) : undefined })} />
          <Input type="number" step="0.1" label="Vybavovací proud IΔ [mA]"
            value={data.vybavovacProud ?? ''}
            onChange={(e) => set({ vybavovacProud: e.target.value ? parseFloat(e.target.value) : undefined })} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Input type="number" step="1" label="Čas odpojení tA při 1×IΔn [ms]"
            value={data.casOdpojeni1x ?? ''}
            onChange={(e) => set({ casOdpojeni1x: e.target.value ? parseFloat(e.target.value) : undefined })} />
          {['AC', 'A'].includes(data.typ) && (
            <Input type="number" step="1" label="Čas odpojení tA při 5×IΔn [ms]"
              value={data.casOdpojeni5x ?? ''}
              onChange={(e) => set({ casOdpojeni5x: e.target.value ? parseFloat(e.target.value) : undefined })} />
          )}
          {data.typ === 'F' && (
            <>
              <Input type="number" step="1" label="Čas odpojení tA při 1,4×IΔn [ms]"
                value={data.casOdpojeni1_4x ?? ''}
                onChange={(e) => set({ casOdpojeni1_4x: e.target.value ? parseFloat(e.target.value) : undefined })} />
              <Input type="number" step="1" label="Čas odpojení tA při 2×IΔn [ms]"
                value={data.casOdpojeni2x ?? ''}
                onChange={(e) => set({ casOdpojeni2x: e.target.value ? parseFloat(e.target.value) : undefined })} />
              <label className="flex items-center gap-2 text-xs col-span-2">
                <input type="checkbox"
                  checked={!!data.zkouskaVypnuti2x}
                  onChange={(e) => set({ zkouskaVypnuti2x: e.target.checked || undefined })}
                  className="rounded border-[var(--checkbox-border)]" />
                <span>Zkouška vypnutí 2×IΔn nárůstem proudu ✓</span>
              </label>
            </>
          )}
        </div>
        <div className="mt-3">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox"
              checked={!!data.selektivita}
              onChange={(e) => set({ selektivita: e.target.checked || undefined })}
              className="rounded border-[var(--checkbox-border)]" />
            <span>Selektivita (typ S/G) ✓</span>
          </label>
        </div>
      </div>
      <Input label="Poznámka" value={data.poznamka} onChange={(e) => set({ poznamka: e.target.value })} />
    </>
  );
}
