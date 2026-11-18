import { google } from 'googleapis';
import { pool } from './database.js';
import { buildEventData, eventKey, type ZakazkaForSync } from './google-utils.js';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
/** Značka událostí vytvořených aplikací (soukromá vlastnost události). */
const APP_MARK = 'revizeapp';

// Vytvoří OAuth2 klienta pro daného uživatele
/** Jsou na serveru nastavené přístupové údaje Google? */
export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

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

// Synchronizovat zakázky do Google Kalendáře.
// Události se párují se zakázkami přes soukromou vlastnost revizeapp_key; události
// zakázek, které už nejsou aktivní (zrušené / smazané), se z kalendáře odeberou.
export async function syncZakazkyToCalendar(
  userId: number,
  calendarId: string,
  zakazky: ZakazkaForSync[],
  reminderDaysBefore?: number
): Promise<{ created: number; updated: number; deleted: number; errors: number }> {
  const auth = await getAuthorizedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let errors = 0;

  const existingEvents = await getExistingRevizeAppEvents(calendar, calendarId);
  const aktivni = new Set<string>();

  for (const z of zakazky) {
    if (z.stav === 'zrušeno') continue;
    const key = eventKey(z.id);
    aktivni.add(key);
    try {
      const eventData = buildEventData(z, reminderDaysBefore);
      const existingEventId = existingEvents.get(key)?.[0];
      if (existingEventId) {
        await calendar.events.update({
          calendarId, eventId: existingEventId,
          requestBody: { ...eventData, extendedProperties: { private: { revizeapp_key: key, [APP_MARK]: '1' } } },
        });
        updated++;
      } else {
        await calendar.events.insert({
          calendarId,
          requestBody: { ...eventData, extendedProperties: { private: { revizeapp_key: key, [APP_MARK]: '1' } } },
        });
        created++;
      }
    } catch (err) {
      console.error(`Chyba při synchronizaci zakázky ${z.id}:`, err);
      errors++;
    }
  }

  // Odebrat události zrušených / smazaných zakázek a duplicity ze starších synchronizací
  for (const [key, ids] of existingEvents) {
    const smazat = aktivni.has(key) ? ids.slice(1) : ids;
    for (const eventId of smazat) {
      try {
        await calendar.events.delete({ calendarId, eventId });
        deleted++;
      } catch (err) {
        console.error(`Chyba při mazání události ${key}:`, err);
        errors++;
      }
    }
  }

  return { created, updated, deleted, errors };
}

// Načíst existující události aplikace z Google Calendar → mapa eventKey → [eventId, …].
// Nové události nesou značku revizeapp=1 (filtr privateExtendedProperty musí mít tvar
// „název=hodnota“). Starší události ji nemají – dohledají se fulltextem podle popisu.
async function getExistingRevizeAppEvents(
  calendar: ReturnType<typeof google.calendar>,
  calendarId: string
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  const add = (event: any) => {
    const key = event.extendedProperties?.private?.revizeapp_key;
    if (!key || !event.id) return;
    const ids = map.get(key) || [];
    if (!ids.includes(event.id)) ids.push(event.id);
    map.set(key, ids);
  };
  const dotazy: Record<string, unknown>[] = [
    { privateExtendedProperty: [`${APP_MARK}=1`] },
    { q: 'Synchronizováno z RevizeApp' },
  ];
  for (const filtr of dotazy) {
    let pageToken: string | undefined;
    do {
      const response: any = await calendar.events.list({
        calendarId, maxResults: 250, pageToken, showDeleted: false, ...filtr,
      });
      for (const event of response.data.items || []) add(event);
      pageToken = response.data.nextPageToken;
    } while (pageToken);
  }
  return map;
}
