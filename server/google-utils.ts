// Čisté pomocné funkce pro propojení s Google Kalendářem (bez DB a sítě – testovatelné).
import { createHmac, timingSafeEqual } from 'crypto';

const STATE_TTL_MS = 15 * 60 * 1000; // odkaz na přihlášení platí 15 minut

/**
 * Podepsaný OAuth `state`: „userId.expirace.podpis“.
 * Bez podpisu by šlo do callbacku podstrčit cizí userId a připojit tak
 * vlastní Google účet k jinému uživateli aplikace.
 */
export function createState(userId: number, secret: string, now = Date.now()): string {
  const payload = `${userId}.${now + STATE_TTL_MS}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** Ověří podpis a platnost `state`; vrátí userId, nebo null. */
export function verifyState(state: string, secret: string, now = Date.now()): number | null {
  const parts = String(state ?? '').split('.');
  if (parts.length !== 3) return null;
  const [uid, exp, sig] = parts;
  const expected = sign(`${uid}.${exp}`, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!/^\d+$/.test(exp) || Number(exp) < now) return null;
  const userId = Number(uid);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/**
 * Kam se po přihlášení vrátit: FRONTEND_URL, jinak adresa, na které běží callback
 * (frontend i API jsou na stejné doméně), jinak adresa požadavku.
 */
export function frontendBase(env: NodeJS.ProcessEnv, requestOrigin: string): string {
  if (env.FRONTEND_URL) return env.FRONTEND_URL.replace(/\/+$/, '');
  if (env.GOOGLE_REDIRECT_URI) {
    try { return new URL(env.GOOGLE_REDIRECT_URI).origin; } catch { /* neplatná URL */ }
  }
  return requestOrigin;
}

export interface ZakazkaForSync {
  id: number;
  nazev: string;
  klient: string;
  adresa: string;
  datumPlanovany: string;
  casPlanovany?: string | null;
  casKonec?: string | null;
  celyDen?: boolean | null;
  datumDokonceni?: string | null;
  datumyRealizace?: string[];
  datumOdevzdaniZpravy?: string | null;
  stav: string;
  priorita: string;
  poznamka?: string | null;
  googleCalendarId?: string | null;
}

/** Klíč, podle kterého se událost v kalendáři páruje se zakázkou. */
export const eventKey = (zakazkaId: number) => `revizeapp-zakazka-${zakazkaId}`;

const ymd = (d: string) => String(d).slice(0, 10);

/** Den po zadaném dni (YYYY-MM-DD) – konec celodenní události je v Google exkluzivní. */
export function nextDay(date: string): string {
  const d = new Date(`${ymd(date)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Přičte minuty k času HH:MM na daném dni; přetečení přes půlnoc posune datum. */
export function addMinutes(date: string, time: string, minutes: number): { date: string; time: string } {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(`${ymd(date)}T00:00:00Z`);
  d.setUTCMinutes(h * 60 + m + minutes);
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Sestaví událost Google Kalendáře ze zakázky. */
export function buildEventData(z: ZakazkaForSync, reminderDaysBefore?: number) {
  const prioritaEmoji = z.priorita === 'vysoká' ? '🔴' : z.priorita === 'střední' ? '🟡' : '🟢';
  const summary = `${prioritaEmoji} ${z.nazev}${z.klient ? ` – ${z.klient}` : ''}`;

  const dny = (z.datumyRealizace || []).map(ymd).filter(Boolean).sort();
  const startDate = dny[0] || ymd(z.datumPlanovany);
  const endDate = dny[dny.length - 1] || ymd(z.datumDokonceni || z.datumPlanovany);

  const sCasem = !z.celyDen && !!z.casPlanovany && TIME_RE.test(z.casPlanovany) && dny.length <= 1;
  let start: { date?: string; dateTime?: string; timeZone?: string };
  let end: typeof start;

  if (sCasem) {
    const od = z.casPlanovany!;
    // Konec: zadaný čas konce (musí být po začátku), jinak 2 hodiny
    const konec = z.casKonec && TIME_RE.test(z.casKonec) && z.casKonec > od
      ? { date: startDate, time: z.casKonec }
      : addMinutes(startDate, od, 120);
    start = { dateTime: `${startDate}T${od}:00`, timeZone: 'Europe/Prague' };
    end = { dateTime: `${konec.date}T${konec.time}:00`, timeZone: 'Europe/Prague' };
  } else {
    start = { date: startDate };
    end = { date: nextDay(endDate < startDate ? startDate : endDate) };
  }

  const description = [
    z.adresa && `📍 ${z.adresa}`,
    z.poznamka && `📝 ${z.poznamka}`,
    z.datumOdevzdaniZpravy && `📋 Odevzdání zprávy: ${ymd(z.datumOdevzdaniZpravy)}`,
    '\n— Synchronizováno z aplikace ReVeli —',
  ].filter(Boolean).join('\n');

  const reminderMinutes = reminderDaysBefore && reminderDaysBefore > 0
    ? Math.min(reminderDaysBefore * 24 * 60, 40320) // Google povoluje max. 4 týdny
    : undefined;

  return {
    summary,
    description,
    location: z.adresa || undefined,
    start,
    end,
    colorId: z.priorita === 'vysoká' ? '11' : z.priorita === 'střední' ? '5' : '2',
    reminders: reminderMinutes
      ? { useDefault: false, overrides: [{ method: 'popup', minutes: reminderMinutes }, { method: 'email', minutes: reminderMinutes }] }
      : { useDefault: true },
  };
}

/** Přeloží chybu Google API na srozumitelnou zprávu. */
export function popisChybyGoogle(err: unknown): string {
  const e = err as { message?: string; response?: { data?: { error?: string } } };
  const kod = e?.response?.data?.error || e?.message || '';
  if (/invalid_grant/i.test(kod)) {
    return 'Propojení s Googlem vypršelo nebo bylo zrušeno. Odpojte a znovu připojte Google Kalendář.';
  }
  return e?.message || 'Neznámá chyba Google API';
}

/** Nejvýše tolik kalendářů lze vybrat k synchronizaci. */
export const MAX_KALENDARU = 10;

/**
 * Vybrané kalendáře uživatele: sloupec calendar_ids (JSON pole), jinak starší
 * calendar_id, jinak hlavní kalendář.
 */
export function parseCalendarIds(calendarIdsJson: unknown, calendarId: unknown): string[] {
  if (typeof calendarIdsJson === 'string' && calendarIdsJson.trim()) {
    try {
      const ids = normalizeCalendarIds(JSON.parse(calendarIdsJson));
      if (ids && ids.length) return ids;
    } catch { /* poškozený JSON – použít calendar_id */ }
  }
  return [typeof calendarId === 'string' && calendarId.trim() ? calendarId.trim() : 'primary'];
}

/** Ověří vstup z klienta: neprázdné pole unikátních řetězců (max. MAX_KALENDARU); jinak null. */
export function normalizeCalendarIds(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const ids = [...new Set(input.filter((x): x is string => typeof x === 'string').map(x => x.trim()).filter(Boolean))];
  if (ids.length === 0 || ids.length > MAX_KALENDARU || ids.some(id => id.length > 255)) return null;
  return ids;
}

/**
 * Cílový kalendář zakázky: její vlastní, pokud je mezi povolenými,
 * jinak výchozí (a když ani ten není povolený, první povolený).
 */
export function cilovyKalendar(zakazkaCalendarId: string | null | undefined, povolene: string[], vychozi: string | null | undefined): string {
  if (zakazkaCalendarId && povolene.includes(zakazkaCalendarId)) return zakazkaCalendarId;
  if (vychozi && povolene.includes(vychozi)) return vychozi;
  return povolene[0];
}
