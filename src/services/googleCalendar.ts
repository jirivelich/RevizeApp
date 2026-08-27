// Frontend service pro Google Calendar integraci
import { buildApiUrl, getAuthHeaders, handleResponse } from './httpClient';

export interface GoogleCalendarStatus {
  connected: boolean;
  calendarId: string | null;
}

export interface GoogleCalendarItem {
  id: string;
  summary: string;
}

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  errors: number;
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

  // Uložit vybraný kalendář
  async saveCalendar(calendarId: string): Promise<void> {
    const res = await fetch(buildApiUrl('/google/calendar'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ calendarId }),
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
