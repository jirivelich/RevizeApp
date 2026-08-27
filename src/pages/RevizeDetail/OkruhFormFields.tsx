import { Input, Select } from '../../components/ui';
import { EditableSelect, TYPY_KABELU, PRUREZY } from './rozvadeceShared';

export interface OkruhFormData {
  cislo: number;
  nazev: string;
  jisticTyp: string;
  jisticProud: string;
  pocetFazi: number;
  typKabelu: string;
  pocetZil: string;
  prurez: string;
  izolacniOdpor: string;
  impedanceSmycky: string;
  impedanceSmyckyMax: boolean;
  poznamka: string;
  jeJisticochranac: boolean;
  chrTyp: string;
  chrCitlivostMa: number;
  chrPocetPolu: number;
  chrTestovacitlacitko?: boolean;
  chrNevybavovaci?: boolean;
  chrDotykoveNapeti?: number;
  chrVybavovacProud?: number;
  chrCasOdpojeni1x?: number;
  chrCasOdpojeni5x?: number;
  chrCasOdpojeni1_4x?: number;
  chrCasOdpojeni2x?: number;
  chrZkouskaVypnuti2x?: boolean;
  chrSelektivita?: boolean;
}

interface OkruhFormFieldsProps {
  data: OkruhFormData;
  onChange: (data: OkruhFormData) => void;
}

/**
 * Pole formuláře okruhu — sdíleno mezi desktop Modalem a mobilním BottomSheetem
 * v RozvadeceTab, aby se obě varianty nerozcházely (drift mezi kopiemi).
 */
export function OkruhFormFields({ data, onChange }: OkruhFormFieldsProps) {
  const set = (patch: Partial<OkruhFormData>) => onChange({ ...data, ...patch });

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Input type="number" label="Číslo okruhu" value={data.cislo} onChange={(e) => set({ cislo: parseInt(e.target.value) })} required />
        <Input label="Název" value={data.nazev} onChange={(e) => set({ nazev: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <EditableSelect label="Typ jištění" value={data.jisticTyp} onChange={(val) => set({ jisticTyp: val })} options={['B', 'C', 'D', 'gG', 'aM', 'IT', 'IJ', 'IJV', 'ITM']} />
        <EditableSelect label="Proud jističe" value={data.jisticProud} onChange={(val) => set({ jisticProud: val })} options={['2A','4A','6A','10A','13A','16A','20A','25A','32A','40A','50A','63A','80A','100A','125A','160A']} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Počet fází" value={data.pocetFazi.toString()} onChange={(e) => set({ pocetFazi: parseInt(e.target.value) })} options={[{ value: '1', label: '1P' }, { value: '2', label: '2P' }, { value: '3', label: '3P' }]} />
        <EditableSelect label="Typ kabelu" value={data.typKabelu} onChange={(val) => set({ typKabelu: val })} options={TYPY_KABELU} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Počet žil (volitelné)" value={data.pocetZil} onChange={(e) => set({ pocetZil: e.target.value })} placeholder="např. 3" />
        <EditableSelect label="Průřez (mm²)" value={data.prurez} onChange={(val) => set({ prurez: val })} options={PRUREZY} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Izolační odpor (MΩ)" value={data.izolacniOdpor} onChange={(e) => set({ izolacniOdpor: e.target.value })} />
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input label="Impedance smyčky (Ω)" value={data.impedanceSmycky} onChange={(e) => set({ impedanceSmycky: e.target.value })} />
          </div>
          <label className="flex items-center gap-1.5 pb-2 cursor-pointer select-none">
            <input type="checkbox" checked={data.impedanceSmyckyMax} onChange={(e) => set({ impedanceSmyckyMax: e.target.checked })} className="rounded border-[var(--checkbox-border)]" />
            <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">max.</span>
          </label>
        </div>
      </div>
      {/* Jississochranič (RCBO) */}
      <div className="border-t border-[var(--border)] pt-3">
        <label className="flex items-center gap-2 cursor-pointer select-none mb-3">
          <input type="checkbox" checked={data.jeJisticochranac} onChange={(e) => set({ jeJisticochranac: e.target.checked })} className="rounded border-[var(--checkbox-border)]" />
          <span className="text-sm font-medium text-[var(--text)]">Jississochranič (vestavěný chránič, RCBO)</span>
        </label>
        {data.jeJisticochranac && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-3">
              <EditableSelect label="Typ chrániče" value={data.chrTyp} onChange={(val) => set({ chrTyp: val })} options={['A', 'AC', 'B', 'F', 'G']} />
              <Select label="Citlivost IΔn (mA)" value={String(data.chrCitlivostMa)} onChange={(e) => set({ chrCitlivostMa: parseFloat(e.target.value) })} options={[{ value: '10', label: '10 mA' }, { value: '30', label: '30 mA' }, { value: '100', label: '100 mA' }, { value: '300', label: '300 mA' }, { value: '500', label: '500 mA' }]} />
              <Select label="Počet pólů" value={String(data.chrPocetPolu)} onChange={(e) => set({ chrPocetPolu: parseInt(e.target.value) })} options={[{ value: '2', label: '2' }, { value: '4', label: '4' }]} />
            </div>
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Měřené hodnoty chrániče</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={!!data.chrTestovacitlacitko} onChange={(e) => set({ chrTestovacitlacitko: e.target.checked || undefined })} className="rounded border-[var(--checkbox-border)]" />
                <span>Testovací tlačítko ✓</span>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={!!data.chrNevybavovaci} onChange={(e) => set({ chrNevybavovaci: e.target.checked || undefined })} className="rounded border-[var(--checkbox-border)]" />
                <span>Nevybavení při 0,5×IΔn ✓</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Input type="number" step="0.1" label="Dotykové napětí Uc [V]" value={data.chrDotykoveNapeti ?? ''} onChange={(e) => set({ chrDotykoveNapeti: e.target.value ? parseFloat(e.target.value) : undefined })} />
              <Input type="number" step="0.1" label="Vybavovací proud IΔ [mA]" value={data.chrVybavovacProud ?? ''} onChange={(e) => set({ chrVybavovacProud: e.target.value ? parseFloat(e.target.value) : undefined })} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Input type="number" step="1" label="Čas odpojení tA při 1×IΔn [ms]" value={data.chrCasOdpojeni1x ?? ''} onChange={(e) => set({ chrCasOdpojeni1x: e.target.value ? parseFloat(e.target.value) : undefined })} />
              {['AC', 'A'].includes(data.chrTyp) && (
                <Input type="number" step="1" label="Čas odpojení tA při 5×IΔn [ms]" value={data.chrCasOdpojeni5x ?? ''} onChange={(e) => set({ chrCasOdpojeni5x: e.target.value ? parseFloat(e.target.value) : undefined })} />
              )}
              {data.chrTyp === 'F' && (
                <>
                  <Input type="number" step="1" label="Čas odpojení tA při 1,4×IΔn [ms]" value={data.chrCasOdpojeni1_4x ?? ''} onChange={(e) => set({ chrCasOdpojeni1_4x: e.target.value ? parseFloat(e.target.value) : undefined })} />
                  <Input type="number" step="1" label="Čas odpojení tA při 2×IΔn [ms]" value={data.chrCasOdpojeni2x ?? ''} onChange={(e) => set({ chrCasOdpojeni2x: e.target.value ? parseFloat(e.target.value) : undefined })} />
                  <label className="flex items-center gap-2 text-xs col-span-2">
                    <input type="checkbox" checked={!!data.chrZkouskaVypnuti2x} onChange={(e) => set({ chrZkouskaVypnuti2x: e.target.checked || undefined })} className="rounded border-[var(--checkbox-border)]" />
                    <span>Zkouška vypnutí při 2×IΔn ✓</span>
                  </label>
                </>
              )}
            </div>
            <div className="mt-3">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={!!data.chrSelektivita} onChange={(e) => set({ chrSelektivita: e.target.checked || undefined })} className="rounded border-[var(--checkbox-border)]" />
                <span>Selektivita (typ S/G) ✓</span>
              </label>
            </div>
          </>
        )}
      </div>
    </>
  );
}
