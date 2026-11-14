/**
 * Logika pohledů Plánování (seznam, týden, měsíc) – čisté funkce bez Reactu, kvůli testům.
 * Data jsou v místním čase (YYYY-MM-DD), ne v UTC.
 */
import type { KategorieRevize, Revize, Zakazka } from '../../types';
import { getRealizaceDays, getReportDeadline } from './utils';

// ── Kategorie ──────────────────────────────────────────────

export type KatKey = KategorieRevize | 'neurceno';

export const KAT_META: Record<KatKey, { label: string; color: string; bg: string }> = {
  elektro: { label: 'Elektro', color: 'var(--kat-elektro)', bg: 'var(--kat-elektro-bg)' },
  hromosvod: { label: 'Hromosvod', color: 'var(--kat-hromosvod)', bg: 'var(--kat-hromosvod-bg)' },
  stroje: { label: 'Stroje', color: 'var(--kat-stroje)', bg: 'var(--kat-stroje-bg)' },
  odberne_misto: { label: 'Odběrné místo', color: 'var(--kat-odberne)', bg: 'var(--kat-odberne-bg)' },
  neurceno: { label: 'Neurčeno', color: 'var(--kat-neurceno)', bg: 'var(--kat-neurceno-bg)' },
};

export const KAT_ORDER: KategorieRevize[] = ['elektro', 'hromosvod', 'stroje', 'odberne_misto'];

/** Kategorie zakázky: vlastní, jinak z propojené revize, jinak neurčeno. */
export function kategorieOf(z: Zakazka, revizeById?: Map<number, Revize>): KatKey {
  if (z.kategorie) return z.kategorie;
  const r = z.revizeId ? revizeById?.get(z.revizeId) : undefined;
  return r?.kategorieRevize ?? 'neurceno';
}

// ── Datum a čas ────────────────────────────────────────────

export function toDateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDaysLocal(s: string, n: number): string {
  const d = fromDateStr(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((fromDateStr(a).getTime() - fromDateStr(b).getTime()) / 86400000);
}

/** Pondělí týdne, do kterého datum patří. */
export function mondayOf(s: string): string {
  const d = fromDateStr(s);
  const dow = (d.getDay() + 6) % 7; // Po = 0
  return addDaysLocal(s, -dow);
}

/** „08:30“ → 8.5; neplatné → null. */
export function parseTime(t?: string | null): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  return Number(m[1]) + Number(m[2]) / 60;
}

export function formatTime(x: number): string {
  const h = Math.floor(x);
  const m = Math.round((x - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

const DNY = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
const DNY_DLOUHE = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
export const MESICE = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
/** Měsíce ve 2. pádě („9.–15. listopadu“). */
export const MESICE_GEN = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

/** „Po 16. 11.“ */
export function shortDay(s: string): string {
  const d = fromDateStr(s);
  return `${DNY[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.`;
}

/** „pátek 13. 11.“ */
export function longDay(s: string): string {
  const d = fromDateStr(s);
  return `${DNY_DLOUHE[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.`;
}

// ── Časové umístění zakázky ────────────────────────────────

/** Zakázka bez času nebo vícedenní → řádek „Celý den“. */
export function isAllDay(z: Zakazka): boolean {
  return !!z.celyDen || !parseTime(z.casPlanovany) || getRealizaceDays(z).length > 1;
}

/** Čas od–do (h). Bez konce nebo s koncem dřív než začátek = 1 hodina. */
export function timeRange(z: Zakazka): { from: number; to: number } | null {
  if (isAllDay(z)) return null;
  const from = parseTime(z.casPlanovany)!;
  const end = parseTime(z.casKonec);
  return { from, to: end !== null && end > from ? end : from + 1 };
}

/** Popis času do seznamu: „8:00“ + „do 10:30“, „Celý den“, „St–Pá“… */
export function timeLabel(z: Zakazka, day: string): { main: string; sub: string } {
  const days = getRealizaceDays(z);
  if (days.length > 1) {
    const idx = days.indexOf(day);
    return { main: 'Celý den', sub: idx >= 0 ? `den ${idx + 1} z ${days.length}` : `${days.length} dny` };
  }
  const r = timeRange(z);
  if (!r) return { main: 'Celý den', sub: '' };
  return { main: formatTime(r.from), sub: z.casKonec ? `do ${formatTime(r.to)}` : '' };
}

/** Nejbližší den realizace od dneška (nebo poslední, když už vše proběhlo). */
export function nextDay(z: Zakazka, today: string): string {
  const days = getRealizaceDays(z);
  return days.find(d => d >= today) ?? days[days.length - 1];
}

// ── Seznam: skupiny ────────────────────────────────────────

export type ListGroupKey = 'po-terminu' | 'dnes' | 'zprava' | 'zitra' | 'tento-tyden' | 'pristi-tyden' | 'pozdeji' | 'dokoncene';

export const LIST_GROUPS: { key: ListGroupKey; title: string; tone: 'danger' | 'accent' | 'normal' | 'muted' }[] = [
  { key: 'po-terminu', title: 'Po termínu', tone: 'danger' },
  { key: 'dnes', title: 'Dnes', tone: 'accent' },
  { key: 'zprava', title: 'Čeká na odevzdání zprávy', tone: 'normal' },
  { key: 'zitra', title: 'Zítra', tone: 'normal' },
  { key: 'tento-tyden', title: 'Tento týden', tone: 'normal' },
  { key: 'pristi-tyden', title: 'Příští týden', tone: 'normal' },
  { key: 'pozdeji', title: 'Později', tone: 'normal' },
  { key: 'dokoncene', title: 'Dokončené', tone: 'muted' },
];

export function isClosed(z: Zakazka): boolean {
  return z.stav === 'dokončeno' || z.stav === 'zrušeno';
}

export function groupOf(z: Zakazka, today: string): ListGroupKey {
  const deadline = getReportDeadline(z);
  if (deadline) return deadline < today ? 'po-terminu' : 'zprava';
  if (isClosed(z)) return 'dokoncene';
  const days = getRealizaceDays(z);
  if (days.includes(today)) return 'dnes';
  if (days[days.length - 1] < today) return 'po-terminu';
  const d = nextDay(z, today);
  if (d === addDaysLocal(today, 1)) return 'zitra';
  const monday = mondayOf(today);
  if (d <= addDaysLocal(monday, 6)) return 'tento-tyden';
  if (d <= addDaysLocal(monday, 13)) return 'pristi-tyden';
  return 'pozdeji';
}

/** Rozdělí zakázky do skupin seznamu (prázdné skupiny vynechá), uvnitř podle termínu. */
export function groupForList(zakazky: Zakazka[], today: string): { key: ListGroupKey; items: Zakazka[] }[] {
  const map = new Map<ListGroupKey, Zakazka[]>();
  for (const z of zakazky) {
    const g = groupOf(z, today);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(z);
  }
  const sortKey = (z: Zakazka) => `${nextDay(z, today)} ${timeRange(z) ? String(timeRange(z)!.from).padStart(5, '0') : '00'}`;
  return LIST_GROUPS
    .filter(g => map.has(g.key))
    .map(g => {
      const items = [...map.get(g.key)!].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
      if (g.key === 'dokoncene') items.reverse();
      return { key: g.key, items };
    });
}

// ── Hlavní akce a termín zprávy ────────────────────────────

export type PrimaryAction =
  | { kind: 'create'; label: string; primary: true }
  | { kind: 'open'; label: string; primary: boolean }
  | { kind: 'reportDone'; label: string; primary: true }
  | null;

/** Jedna hlavní akce podle stavu zakázky. */
export function primaryAction(z: Zakazka): PrimaryAction {
  if (z.stav === 'zrušeno') return null;
  if (getReportDeadline(z)) {
    return z.revizeId
      ? { kind: 'open', label: 'Dokončit zprávu', primary: true }
      : { kind: 'reportDone', label: 'Zpráva odevzdána', primary: true };
  }
  if (z.revizeId) return { kind: 'open', label: 'Otevřít revizi', primary: false };
  if (z.stav === 'dokončeno') return null;
  return { kind: 'create', label: 'Založit revizi', primary: true };
}

/** Štítek termínu zprávy: „zpráva dnes“, „o 3 dny pozdě“, „zpráva 20. 11.“. */
export function reportLabel(z: Zakazka, today: string): { text: string; late: boolean } | null {
  const deadline = getReportDeadline(z);
  if (!deadline) return null;
  const diff = diffDays(deadline, today);
  if (diff < 0) {
    const n = -diff;
    return { text: `zpráva o ${n} ${n === 1 ? 'den' : n < 5 ? 'dny' : 'dní'} pozdě`, late: true };
  }
  if (diff === 0) return { text: 'zpráva dnes', late: false };
  const d = fromDateStr(deadline);
  return { text: `zpráva ${d.getDate()}. ${d.getMonth() + 1}.`, late: false };
}

// ── Hledání a filtry ───────────────────────────────────────

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function matchesSearch(z: Zakazka, q: string): boolean {
  const t = norm(q.trim());
  if (!t) return true;
  return norm(`${z.nazev} ${z.klient} ${z.adresa} ${z.poznamka ?? ''}`).includes(t);
}

export type StavFilter = 'aktivni' | Zakazka['stav'] | 'vse';

export function matchesStav(z: Zakazka, f: StavFilter): boolean {
  if (f === 'vse') return true;
  if (f === 'aktivni') return !isClosed(z) || !!getReportDeadline(z);
  return z.stav === f;
}

// ── Týden: řádek „Celý den“ a bloky na časové ose ─────────

export interface AllDayBar { z: Zakazka; start: number; end: number; row: number }

/** Pruhy celodenních / vícedenních zakázek v daném týdnu (sloupce 0–6). Souvislé dny = jeden pruh. */
export function allDayBars(zakazky: Zakazka[], weekDays: string[]): AllDayBar[] {
  const segs: { z: Zakazka; start: number; end: number }[] = [];
  for (const z of zakazky) {
    if (!isAllDay(z)) continue;
    const cols = getRealizaceDays(z).map(d => weekDays.indexOf(d)).filter(i => i >= 0).sort((a, b) => a - b);
    let s = -1, prev = -2;
    for (const c of cols) {
      if (c !== prev + 1) {
        if (s >= 0) segs.push({ z, start: s, end: prev });
        s = c;
      }
      prev = c;
    }
    if (s >= 0) segs.push({ z, start: s, end: prev });
  }
  segs.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const rows: number[] = []; // poslední obsazený sloupec v řádku
  return segs.map(seg => {
    let row = rows.findIndex(last => last < seg.start);
    if (row === -1) { row = rows.length; rows.push(seg.end); } else rows[row] = seg.end;
    return { ...seg, row };
  });
}

export interface TimedBlock { z: Zakazka; from: number; to: number; col: number; cols: number }

/** Bloky na časové ose jednoho dne; překrývající se zakázky vedle sebe. */
export function timedBlocks(zakazky: Zakazka[], day: string): TimedBlock[] {
  const items = zakazky
    .filter(z => !isAllDay(z) && getRealizaceDays(z)[0] === day)
    .map(z => ({ z, ...timeRange(z)! }))
    .sort((a, b) => a.from - b.from || b.to - a.to);
  const out: TimedBlock[] = [];
  let cluster: (typeof items[number] & { col: number })[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map(c => c.col + 1));
    for (const c of cluster) out.push({ z: c.z, from: c.from, to: c.to, col: c.col, cols });
    cluster = [];
  };
  for (const it of items) {
    if (cluster.length && it.from >= clusterEnd) flush();
    const used = new Set(cluster.filter(c => c.to > it.from).map(c => c.col));
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({ ...it, col });
    clusterEnd = Math.max(clusterEnd, it.to);
  }
  if (cluster.length) flush();
  return out;
}

/** Rozsah časové osy: 7–17 h, rozšířený podle zakázek. */
export function hourRange(blocks: TimedBlock[]): { start: number; end: number } {
  let start = 7, end = 17;
  for (const b of blocks) {
    start = Math.min(start, Math.floor(b.from));
    end = Math.max(end, Math.ceil(b.to));
  }
  return { start: Math.max(0, start), end: Math.min(24, end) };
}

// ── Měsíc ──────────────────────────────────────────────────

/** 42 dní mřížky měsíce (od pondělí). */
export function monthGrid(year: number, month: number): string[] {
  const first = toDateStr(new Date(year, month, 1));
  const start = mondayOf(first);
  return Array.from({ length: 42 }, (_, i) => addDaysLocal(start, i));
}

/** Úroveň vytížení dne 0–4 podle počtu zakázek. */
export function loadLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  return Math.min(4, Math.max(0, count)) as 0 | 1 | 2 | 3 | 4;
}

/** Zakázky, které se realizují v daný den. */
export function jobsOnDay(zakazky: Zakazka[], day: string): Zakazka[] {
  return zakazky.filter(z => getRealizaceDays(z).includes(day) && z.stav !== 'zrušeno');
}

/** Zakázky s termínem odevzdání zprávy v daný den. */
export function deadlinesOnDay(zakazky: Zakazka[], day: string): Zakazka[] {
  return zakazky.filter(z => getReportDeadline(z) === day);
}

// ── Odkazy ─────────────────────────────────────────────────

export function mapsUrl(adresa: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresa)}`;
}

export function telHref(tel: string): string {
  return `tel:${tel.replace(/[^\d+]/g, '')}`;
}

// ── Přesun (drag & drop) ───────────────────────────────────

/**
 * Změny zakázky po přetažení na nový den (a čas). Vícedenní zakázka se posune celá.
 * `time` = 'allday' → řádek „Celý den“; jinak „HH:mm“ na časové ose (délka zakázky zůstane).
 */
export function moveZakazka(z: Zakazka, newDate: string, time: string | 'allday'): Partial<Zakazka> {
  const shift = diffDays(newDate, z.datumPlanovany);
  const patch: Partial<Zakazka> = { datumPlanovany: newDate };
  if (z.datumyRealizace?.length) patch.datumyRealizace = z.datumyRealizace.map(d => addDaysLocal(d, shift));
  const multi = getRealizaceDays(z).length > 1;
  if (time === 'allday') {
    if (!multi) patch.celyDen = true;
    return patch;
  }
  if (multi) return patch; // vícedenní zůstává v řádku „Celý den“
  const r = timeRange(z);
  const dur = r ? r.to - r.from : 1;
  const from = parseTime(time)!;
  patch.celyDen = false;
  patch.casPlanovany = time;
  patch.casKonec = z.casKonec || !r ? formatHHmm(Math.min(24, from + dur)) : '';
  return patch;
}

function formatHHmm(x: number): string {
  const h = Math.floor(x);
  const m = Math.round((x - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
