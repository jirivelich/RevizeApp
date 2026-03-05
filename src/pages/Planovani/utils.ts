import type { Zakazka } from '../../types';

export type ZakazkaFormData = {
  nazev: string;
  klient: string;
  adresa: string;
  datumPlanovany: string;
  casPlanovany: string;
  stav: Zakazka['stav'];
  priorita: Zakazka['priorita'];
  revizeId: number | undefined;
  poznamka: string;
};

export const emptyFormData: ZakazkaFormData = {
  nazev: '',
  klient: '',
  adresa: '',
  datumPlanovany: new Date().toISOString().split('T')[0],
  casPlanovany: '08:00',
  stav: 'plánováno',
  priorita: 'střední',
  revizeId: undefined,
  poznamka: '',
};

export function getStatusColor(stav: Zakazka['stav']): string {
  switch (stav) {
    case 'plánováno': return 'bg-blue-100 text-blue-700';
    case 'v realizaci': return 'bg-amber-100 text-amber-700';
    case 'dokončeno': return 'bg-green-100 text-green-700';
    case 'zrušeno': return 'bg-slate-100 text-slate-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

export function getPriorityColor(priorita: Zakazka['priorita']): string {
  switch (priorita) {
    case 'vysoká': return 'bg-red-100 text-red-700';
    case 'střední': return 'bg-amber-100 text-amber-700';
    case 'nizká': return 'bg-green-100 text-green-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

export function zakazkaToFormData(z: Zakazka): ZakazkaFormData {
  return {
    nazev: z.nazev,
    klient: z.klient,
    adresa: z.adresa,
    datumPlanovany: z.datumPlanovany,
    casPlanovany: z.casPlanovany || '08:00',
    stav: z.stav,
    priorita: z.priorita,
    revizeId: z.revizeId,
    poznamka: z.poznamka || '',
  };
}

export const STAV_OPTIONS = [
  { value: 'plánováno', label: 'Plánováno' },
  { value: 'v realizaci', label: 'V realizaci' },
  { value: 'dokončeno', label: 'Dokončeno' },
  { value: 'zrušeno', label: 'Zrušeno' },
] as const;

export const PRIORITA_OPTIONS = [
  { value: 'nizká', label: 'Nízká' },
  { value: 'střední', label: 'Střední' },
  { value: 'vysoká', label: 'Vysoká' },
] as const;
