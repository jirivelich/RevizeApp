// Frontend service pro Google Calendar integraci
import { buildApiUrl, getAuthHeaders, handleResponse } from './httpClient';

export interface GoogleCalendarStatus {
  /** Jsou na serveru nastavené GOOGLE_CLIENT_ID a GOOGLE_CLIENT_SECRET */
  configured?: boolean;
  connected: boolean;
  calendarId: string | null;
  /** Kalendáře povolené k synchronizaci (nabízí se u zakázek) */
  calendarIds?: string[];
  /** Výchozí kalendář pro zakázky bez vlastního výběru */
  defaultCalendarId?: string;
}

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  primary?: boolean;
}

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  deleted?: number;
  errors: number;
  calendars?: number;
}

/** Text výsledku synchronizace pro uživatele. */
export function popisSynchronizace(r: SyncResult): string {
  const casti = [`${r.created} nových`, `${r.updated} aktualizováno`];
  if (r.deleted) casti.push(`${r.deleted} odebráno`);
  if (r.errors) casti.push(`${r.errors} chyb`);
  const kde = r.calendars && r.calendars > 1 ? ` (${r.calendars} kalendáře)` : '';
  return `Synchronizace dokončena${kde}: ${casti.join(', ')}.`;
}

export const googleCalendarService = {
  // Zjistit stav propojení
  async getStatus(): Promise<GoogleCalendarStatus> {
    const res = await fetch(buildApiUrl('/google/status'), { headers: getAuthHeaders() });
    return handleResponse<GoogleCalendarStatus>(res);
  },

  // Získat URL pro OAuth přihlášení
  async getAuthUrl(): Promise<string> {
    const res = await fetch(buildApiUrl('/google/auth'), { headers: getAuthHeaders() });
    const data = await handleResponse<{ url: string }>(res);
    return data.url;
  },

  // Odpojit Google Calendar
  async disconnect(): Promise<void> {
    const res = await fetch(buildApiUrl('/google/disconnect'), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<{ success: boolean }>(res);
  },

  // Získat seznam kalendářů
  async listCalendars(): Promise<GoogleCalendarItem[]> {
    const res = await fetch(buildApiUrl('/google/calendars'), { headers: getAuthHeaders() });
    const data = await handleResponse<{ calendars: GoogleCalendarItem[] }>(res);
    return data.calendars;
  },

  // Uložit vybrané kalendáře (z odebraných se události aplikace smažou)
  async saveCalendars(calendarIds: string[], defaultCalendarId?: string): Promise<void> {
    const res = await fetch(buildApiUrl('/google/calendar'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ calendarIds, defaultCalendarId }),
    });
    await handleResponse<{ success: boolean }>(res);
  },

  // Spustit synchronizaci zakázek
  async sync(): Promise<SyncResult> {
    const res = await fetch(buildApiUrl('/google/sync'), {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<SyncResult>(res);
  },
};

/**
 * Kalendáře, které lze vybrat u zakázky: povolené kalendáře s názvy a výchozí kalendář.
 * Když Google Kalendář není propojený (nebo nastavený), vrátí connected: false.
 */
export async function nactiKalendareProZakazky(): Promise<{
  connected: boolean;
  kalendare: GoogleCalendarItem[];
  defaultCalendarId: string | null;
}> {
  const status = await googleCalendarService.getStatus();
  if (!status.connected) return { connected: false, kalendare: [], defaultCalendarId: null };
  const vsechny = await googleCalendarService.listCalendars();
  const primaryId = vsechny.find((c) => c.primary)?.id;
  const norm = (id: string) => (id === 'primary' && primaryId ? primaryId : id);
  const povolene = (status.calendarIds ?? [status.calendarId ?? 'primary']).map(norm);
  return {
    connected: true,
    kalendare: vsechny.filter((c) => povolene.includes(c.id)),
    defaultCalendarId: norm(status.defaultCalendarId ?? status.calendarId ?? povolene[0]),
  };
}

/** Událost z Google Kalendáře – v aplikaci jen pro zobrazení. */
export interface GoogleUdalost {
  id: string;
  calendarId: string;
  kalendar: string;
  nazev: string;
  /** ISO datum-čas u časových událostí, YYYY-MM-DD u celodenních */
  start: string;
  /** Konec (u celodenních exkluzivní) */
  end: string;
  celyDen: boolean;
  misto?: string;
  odkaz?: string;
}

/** Události z povolených Google kalendářů v rozsahu dní (včetně). */
export async function nactiGoogleUdalosti(from: string, to: string): Promise<GoogleUdalost[]> {
  const res = await fetch(buildApiUrl(`/google/events?from=${from}&to=${to}`), { headers: getAuthHeaders() });
  const data = await handleResponse<{ events: GoogleUdalost[] }>(res);
  return data.events;
}
