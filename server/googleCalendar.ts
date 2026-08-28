import { google } from 'googleapis';
import { pool } from './database.js';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Vytvoří OAuth2 klienta pro daného uživatele
export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID a GOOGLE_CLIENT_SECRET musí být nastaveny v prostředí');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Vygeneruje URL pro přihlášení přes Google
export function getAuthUrl(state: string): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  });
}

// Vyměnění auth code za tokeny a uložení do DB
export async function exchangeCodeAndSave(code: string, userId: number): Promise<void> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  await saveTokens(userId, tokens);
}

// Uložit tokeny do databáze
export async function saveTokens(userId: number, tokens: any): Promise<void> {
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO google_oauth_tokens (user_id, access_token, refresh_token, expiry_date, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, google_oauth_tokens.refresh_token),
       expiry_date = EXCLUDED.expiry_date,
       updated_at = EXCLUDED.updated_at`,
    [userId, tokens.access_token, tokens.refresh_token ?? null, tokens.expiry_date ?? null, now]
  );
}

// Načíst tokeny z databáze
export async function getTokens(userId: number): Promise<any | null> {
  const result = await pool.query(
    'SELECT access_token, refresh_token, expiry_date FROM google_oauth_tokens WHERE user_id = $1',
    [userId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.expiry_date ? Number(row.expiry_date) : undefined,
  };
}

// Smazat tokeny (odpojit Google Calendar)
export async function deleteTokens(userId: number): Promise<void> {
  await pool.query('DELETE FROM google_oauth_tokens WHERE user_id = $1', [userId]);
}

// Vytvořit autorizovaného OAuth2 klienta pro uživatele (s refresh_token)
async function getAuthorizedClient(userId: number) {
  const tokens = await getTokens(userId);
  if (!tokens) throw new Error('Google Calendar není propojen. Nejprve připojte svůj Google účet.');

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);

  // Automaticky uložit nové tokeny pokud došlo k jejich obnovení
  oauth2Client.on('tokens', async (newTokens) => {
    await saveTokens(userId, { ...tokens, ...newTokens });
  });

  return oauth2Client;
}

// Získat seznam kalendářů uživatele
export async function listCalendars(userId: number): Promise<{ id: string; summary: string }[]> {
  const auth = await getAuthorizedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });
  const response = await calendar.calendarList.list();
  return (response.data.items || []).map((c) => ({
    id: c.id!,
    summary: c.summary || c.id!,
  }));
}

interface ZakazkaForSync {
  id: number;
  nazev: string;
  klient: string;
  adresa: string;
  datumPlanovany: string;
  casPlanovany?: string;
  datumDokonceni?: string;
  datumyRealizace?: string[];
  datumOdevzdaniZpravy?: string;
  stav: string;
  priorita: string;
  poznamka?: string;
}

// Synchronizovat zakázky do Google Kalendáře
export async function syncZakazkyToCalendar(
  userId: number,
  calendarId: string,
  zakazky: ZakazkaForSync[],
  reminderDaysBefore?: number
): Promise<{ created: number; updated: number; errors: number }> {
  const auth = await getAuthorizedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  let created = 0;
  let updated = 0;
  let errors = 0;

  // Načíst existující události s prefixem RevizeApp z daného kalendáře
  const existingEvents = await getExistingRevizeAppEvents(calendar, calendarId);

  for (const z of zakazky) {
    // Přeskočit zrušené zakázky
    if (z.stav === 'zrušeno') continue;

    try {
      const eventKey = `revizeapp-zakazka-${z.id}`;
      const existingEventId = existingEvents.get(eventKey);

      const eventData = buildEventData(z, reminderDaysBefore);

      if (existingEventId) {
        await calendar.events.update({
          calendarId,
          eventId: existingEventId,
          requestBody: eventData,
        });
        updated++;
      } else {
        await calendar.events.insert({
          calendarId,
          requestBody: {
            ...eventData,
            extendedProperties: {
              private: { revizeapp_key: eventKey },
            },
          },
        });
        created++;
      }
    } catch (err) {
      console.error(`Chyba při synchronizaci zakázky ${z.id}:`, err);
      errors++;
    }
  }

  return { created, updated, errors };
}

// Načíst existující RevizeApp události z Google Calendar → mapa eventKey → eventId
async function getExistingRevizeAppEvents(
  calendar: ReturnType<typeof google.calendar>,
  calendarId: string
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    let pageToken: string | undefined;
    do {
      const response: any = await calendar.events.list({
        calendarId,
        privateExtendedProperty: ['revizeapp_key'],
        maxResults: 250,
        pageToken,
        showDeleted: false,
      });
      for (const event of response.data.items || []) {
        const key = event.extendedProperties?.private?.revizeapp_key;
        if (key && event.id) {
          map.set(key, event.id);
        }
      }
      pageToken = response.data.nextPageToken;
    } while (pageToken);
  } catch {
    // Ignorovat chybu při načítání existujících (první sync)
  }
  return map;
}

// Sestavit data události Google Calendaru ze zakázky
function buildEventData(z: ZakazkaForSync, reminderDaysBefore?: number): object {
  const prioritaEmoji = z.priorita === 'vysoká' ? '🔴' : z.priorita === 'střední' ? '🟡' : '🟢';
  const title = `${prioritaEmoji} ${z.nazev} – ${z.klient}`;

  // Určit datum zahájení a konce
  const startDate = (z.datumyRealizace && z.datumyRealizace.length > 0)
    ? z.datumyRealizace[0]
    : z.datumPlanovany;
  const endDate = (z.datumyRealizace && z.datumyRealizace.length > 0)
    ? z.datumyRealizace[z.datumyRealizace.length - 1]
    : (z.datumDokonceni || z.datumPlanovany);

  let start: object;
  let end: object;

  if (z.casPlanovany && !z.datumyRealizace?.length) {
    // Zakázka s přesným časem – použít dateTime
    const [hh, mm] = z.casPlanovany.split(':');
    const startDT = `${startDate}T${hh}:${mm}:00`;
    // Výchozí délka 2 hodiny
    const endHour = String(Number(hh) + 2).padStart(2, '0');
    const endDT = `${startDate}T${endHour}:${mm}:00`;
    start = { dateTime: startDT, timeZone: 'Europe/Prague' };
    end = { dateTime: endDT, timeZone: 'Europe/Prague' };
  } else {
    // Celodenní událost
    // Pro vícedenní: end date musí být den po posledním dni
    const endDateObj = new Date(endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const endDateStr = endDateObj.toISOString().split('T')[0];
    start = { date: startDate };
    end = { date: endDateStr };
  }

  const description = [
    z.adresa && `📍 ${z.adresa}`,
    z.poznamka && `📝 ${z.poznamka}`,
    z.datumOdevzdaniZpravy && `📋 Odevzdání zprávy: ${z.datumOdevzdaniZpravy}`,
    `\n— Synchronizováno z RevizeApp —`,
  ]
    .filter(Boolean)
    .join('\n');

  const reminderMinutes = reminderDaysBefore && reminderDaysBefore > 0 ? reminderDaysBefore * 24 * 60 : undefined;

  return {
    summary: title,
    description,
    location: z.adresa || undefined,
    start,
    end,
    colorId: z.priorita === 'vysoká' ? '11' : z.priorita === 'střední' ? '5' : '2',
    reminders: reminderMinutes
      ? {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: reminderMinutes },
            { method: 'email', minutes: reminderMinutes },
          ],
        }
      : undefined,
  };
}
