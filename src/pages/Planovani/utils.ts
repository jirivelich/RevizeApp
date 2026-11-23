import type { Zakazka, KategorieRevize } from '../../types';

export type ZakazkaFormData = {
  nazev: string;
  klient: string;
  adresa: string;
  zakaznikId: number | undefined;
  datumPlanovany: string;
  casPlanovany: string;
  casKonec: string;                // '' = bez konce (blok 1 h)
  celyDen: boolean;
  kategorie: KategorieRevize | '';
  datumyRealizace: string[];       // pole konkrétních dní realizace (bez prvního dne)
  datumDo: string;                 // poslední den rozsahu „od–do“ (jen formulář)
  vynechaneDny: string[];          // dny v rozsahu, kdy se nepracuje (jen formulář)
  lhutaZpravyDni: number;          // počet dní po posledním dni pro zprávu
  datumOdevzdaniZpravy: string;    // plánované odevzdání, '' = nenastaveno
  stav: Zakazka['stav'];
  priorita: Zakazka['priorita'];
  revizeId: number | undefined;
  poznamka: string;
  googleCalendarId: string;        // '' = výchozí Google kalendář
};

export const emptyFormData: ZakazkaFormData = {
  nazev: '',
  klient: '',
  adresa: '',
  zakaznikId: undefined,
  datumPlanovany: new Date().toISOString().split('T')[0],
  casPlanovany: '08:00',
  casKonec: '10:00',
  celyDen: false,
  kategorie: '',
  datumyRealizace: [],
  datumDo: new Date().toISOString().split('T')[0],
  vynechaneDny: [],
  lhutaZpravyDni: 4,
  datumOdevzdaniZpravy: '',
  stav: 'plánováno',
  priorita: 'střední',
  revizeId: undefined,
  poznamka: '',
  googleCalendarId: '',
};

export function getStatusColor(stav: Zakazka['stav']): string {
  switch (stav) {
    case 'plánováno': return 'bg-[var(--bg-secondary-accent)] text-[var(--secondary)]';
    case 'v realizaci': return 'bg-[var(--warning-bg)] text-[var(--warning-text)]';
    case 'dokončeno': return 'bg-[var(--success-bg)] text-[var(--success-text)]';
    case 'zrušeno': return 'bg-[var(--bg-hover)] text-[var(--text-secondary)]';
    default: return 'bg-[var(--bg-hover)] text-[var(--text-secondary)]';
  }
}

export function getPriorityColor(priorita: Zakazka['priorita']): string {
  switch (priorita) {
    case 'vysoká': return 'bg-[var(--danger-bg)] text-[var(--danger-text)]';
    case 'střední': return 'bg-[var(--warning-bg)] text-[var(--warning-text)]';
    case 'nizká': return 'bg-[var(--bg-secondary-accent)] text-[var(--secondary)]';
    default: return 'bg-[var(--bg-hover)] text-[var(--text-secondary)]';
  }
}

/** Data formuláře → zakázka pro uložení (prázdná kategorie = null, celý den = bez konce). */
export function formDataToZakazka(data: ZakazkaFormData): Partial<Zakazka> {
  const { datumDo: _datumDo, vynechaneDny: _vynechane, ...rest } = data;
  void _datumDo; void _vynechane;
  const dny = dnyRealizaceZFormulare(data);
  return {
    ...rest,
    datumPlanovany: dny[0] ?? data.datumPlanovany,
    datumyRealizace: dny.slice(1),
    kategorie: data.kategorie || null,
    casKonec: data.celyDen || !data.casKonec ? null : data.casKonec,
    datumOdevzdaniZpravy: data.datumOdevzdaniZpravy || null,
    poznamka: data.poznamka || null,
    googleCalendarId: data.googleCalendarId || null,
  } as Partial<Zakazka>;
}

export function zakazkaToFormData(z: Zakazka): ZakazkaFormData {
  const dny = getRealizaceDays(z);
  const od = dny[0];
  const doDne = dny[dny.length - 1];
  return {
    nazev: z.nazev,
    klient: z.klient,
    adresa: z.adresa,
    zakaznikId: z.zakaznikId,
    datumPlanovany: z.datumPlanovany,
    casPlanovany: z.casPlanovany || '08:00',
    casKonec: z.casKonec || '',
    celyDen: !!z.celyDen,
    kategorie: z.kategorie || '',
    datumyRealizace: dny.slice(1),
    datumDo: doDne,
    vynechaneDny: dnyMezi(od, doDne).filter(d => !dny.includes(d)),
    lhutaZpravyDni: z.lhutaZpravyDni ?? 4,
    datumOdevzdaniZpravy: z.datumOdevzdaniZpravy || '',
    stav: z.stav,
    priorita: z.priorita,
    revizeId: z.revizeId,
    poznamka: z.poznamka || '',
    googleCalendarId: z.googleCalendarId || '',
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

/** Maximální délka rozsahu „od–do“ ve formuláři (dní). */
export const MAX_DNU_ROZSAHU = 62;

function lokalniDen(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Všechny dny od–do včetně (místní čas). Neplatný / obrácený rozsah → jen `od`. */
export function dnyMezi(od: string, doDne: string): string[] {
  if (!od) return [];
  if (!doDne || doDne <= od) return [od];
  const [y, m, d] = od.split('-').map(Number);
  const cur = new Date(y, m - 1, d);
  const out: string[] = [];
  while (out.length < MAX_DNU_ROZSAHU) {
    const s = lokalniDen(cur);
    if (s > doDne) break;
    out.push(s);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Dny realizace podle formuláře: rozsah od–do bez vynechaných dní (aspoň první den). */
export function dnyRealizaceZFormulare(data: Pick<ZakazkaFormData, 'datumPlanovany' | 'datumDo' | 'vynechaneDny'>): string[] {
  const vse = dnyMezi(data.datumPlanovany, data.datumDo);
  const dny = vse.filter(d => !data.vynechaneDny.includes(d));
  return dny.length ? dny : vse.slice(0, 1);
}

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

/** Vrátí deadline pro odevzdání revizní zprávy, pokud zpráva nebyla odevzdána (dokončeno bez datumOdevzdaniZpravy). */
export function getReportDeadline(z: Zakazka): string | null {
  if (z.stav !== 'dokončeno') return null;
  if (z.datumOdevzdaniZpravy) return null;
  return addDays(getLastDay(z), z.lhutaZpravyDni ?? 4);
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
