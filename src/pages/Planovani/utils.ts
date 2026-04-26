import type { Zakazka } from '../../types';

export type ZakazkaFormData = {
  nazev: string;
  klient: string;
  adresa: string;
  datumPlanovany: string;
  casPlanovany: string;
  datumyRealizace: string[];       // pole konkrétních dní realizace
  lhutaZpravyDni: number;          // počet dní po posledním dni pro zprávu
  datumOdevzdaniZpravy: string;    // plánované odevzdání, '' = nenastaveno
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
  datumyRealizace: [],
  lhutaZpravyDni: 4,
  datumOdevzdaniZpravy: '',
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
    datumyRealizace: z.datumyRealizace || [],
    lhutaZpravyDni: z.lhutaZpravyDni ?? 4,
    datumOdevzdaniZpravy: z.datumOdevzdaniZpravy || '',
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

// ========== Helpery pro vícedenní zakázky ==========

/** Vrátí seřazené dny realizace. Vždy zahrnuje datumPlanovany + případné extra dny. */
export function getRealizaceDays(z: Zakazka): string[] {
  const extra = z.datumyRealizace && z.datumyRealizace.length > 0 ? z.datumyRealizace : [];
  const all = [z.datumPlanovany, ...extra];
  return [...new Set(all)].sort();
}

/** Vrátí poslední den realizace. */
export function getLastDay(z: Zakazka): string {
  const days = getRealizaceDays(z);
  return days[days.length - 1];
}

/** Vrátí deadline pro odevzdání revizní zprávy – jen pokud je po termínu a zpráva nebyla odevzdána. */
export function getReportDeadline(z: Zakazka): string | null {
  if (z.stav !== 'dokončeno') return null;
  if (z.datumOdevzdaniZpravy) return null;
  const deadline = addDays(getLastDay(z), z.lhutaZpravyDni ?? 4);
  if (!isOverdue(deadline)) return null;
  return deadline;
}

/** Vrátí true pokud se zakázka realizuje v daný den. */
export function isZakazkaOnDay(z: Zakazka, dateStr: string): boolean {
  return getRealizaceDays(z).includes(dateStr);
}

/** Přidá n dní k date stringu YYYY-MM-DD. */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/** Vrátí true pokud je datum v minulosti. */
export function isOverdue(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

/** Formátuje datum jako "Po 7.4." */
export function formatDayShort(dateStr: string): string {
  const d = new Date(dateStr);
  const dayNames = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  return `${dayNames[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`;
}
