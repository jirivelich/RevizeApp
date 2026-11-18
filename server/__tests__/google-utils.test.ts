import { describe, it, expect } from 'vitest';
import { createState, verifyState, frontendBase, buildEventData, addMinutes, nextDay, popisChybyGoogle, parseCalendarIds, normalizeCalendarIds, cilovyKalendar } from '../google-utils';

const SECRET = 'tajne';
const base = {
  id: 7, nazev: 'Revize – Kancelář Delta', klient: 'Delta a.s.', adresa: 'Husova 10, Brno',
  datumPlanovany: '2026-11-18', stav: 'plánováno', priorita: 'vysoká',
};

describe('OAuth state', () => {
  it('ověří vlastní podepsaný state a vrátí userId', () => {
    expect(verifyState(createState(42, SECRET), SECRET)).toBe(42);
  });
  it('odmítne podvržené userId, cizí klíč, prošlý a nesmyslný state', () => {
    const s = createState(42, SECRET);
    const [, exp, sig] = s.split('.');
    expect(verifyState(`43.${exp}.${sig}`, SECRET)).toBeNull();
    expect(verifyState(s, 'jiny-klic')).toBeNull();
    expect(verifyState(createState(42, SECRET, 0), SECRET)).toBeNull();
    expect(verifyState(Buffer.from('42').toString('base64'), SECRET)).toBeNull();
    expect(verifyState('', SECRET)).toBeNull();
  });
});

describe('frontendBase', () => {
  it('FRONTEND_URL > origin z GOOGLE_REDIRECT_URI > adresa požadavku', () => {
    expect(frontendBase({ FRONTEND_URL: 'https://a.cz/' }, 'http://x')).toBe('https://a.cz');
    expect(frontendBase({ GOOGLE_REDIRECT_URI: 'https://revizesystemapp.up.railway.app/api/google/callback' }, 'http://x'))
      .toBe('https://revizesystemapp.up.railway.app');
    expect(frontendBase({}, 'http://localhost:3001')).toBe('http://localhost:3001');
  });
});

describe('buildEventData', () => {
  it('zakázka s časem bez konce trvá 2 hodiny', () => {
    const e = buildEventData({ ...base, casPlanovany: '08:00' });
    expect(e.start).toEqual({ dateTime: '2026-11-18T08:00:00', timeZone: 'Europe/Prague' });
    expect(e.end).toEqual({ dateTime: '2026-11-18T10:00:00', timeZone: 'Europe/Prague' });
    expect(e.summary).toBe('🔴 Revize – Kancelář Delta – Delta a.s.');
  });
  it('použije zadaný čas konce', () => {
    const e = buildEventData({ ...base, casPlanovany: '08:00', casKonec: '15:30' });
    expect(e.end).toEqual({ dateTime: '2026-11-18T15:30:00', timeZone: 'Europe/Prague' });
  });
  it('pozdní začátek přeteče do dalšího dne (žádné „25:00“)', () => {
    const e = buildEventData({ ...base, casPlanovany: '23:00' });
    expect(e.end).toEqual({ dateTime: '2026-11-19T01:00:00', timeZone: 'Europe/Prague' });
  });
  it('celý den a vícedenní realizace = celodenní událost s exkluzivním koncem', () => {
    expect(buildEventData({ ...base, casPlanovany: '08:00', celyDen: true }).start).toEqual({ date: '2026-11-18' });
    const e = buildEventData({ ...base, datumyRealizace: ['2026-11-20', '2026-11-18', '2026-11-19'] });
    expect(e.start).toEqual({ date: '2026-11-18' });
    expect(e.end).toEqual({ date: '2026-11-21' });
  });
  it('připomínka max. 4 týdny, jinak výchozí připomínky kalendáře', () => {
    expect(buildEventData(base, 60).reminders).toEqual({ useDefault: false, overrides: [{ method: 'popup', minutes: 40320 }, { method: 'email', minutes: 40320 }] });
    expect(buildEventData(base).reminders).toEqual({ useDefault: true });
  });
  it('pomocné výpočty dat', () => {
    expect(nextDay('2026-12-31')).toBe('2027-01-01');
    expect(addMinutes('2026-11-18', '22:30', 120)).toEqual({ date: '2026-11-19', time: '00:30' });
  });
});

describe('popisChybyGoogle', () => {
  it('invalid_grant → výzva k novému připojení', () => {
    expect(popisChybyGoogle({ message: 'invalid_grant' })).toMatch(/znovu připojte/);
    expect(popisChybyGoogle({ response: { data: { error: 'invalid_grant' } } })).toMatch(/vypršelo/);
    expect(popisChybyGoogle(new Error('Něco jiného'))).toBe('Něco jiného');
  });
});


describe('výběr více kalendářů', () => {
  it('čte calendar_ids, jinak calendar_id, jinak primary', () => {
    expect(parseCalendarIds('["a@x","b@y"]', 'a@x')).toEqual(['a@x', 'b@y']);
    expect(parseCalendarIds(null, 'firma@group')).toEqual(['firma@group']);
    expect(parseCalendarIds('rozbité{', null)).toEqual(['primary']);
    expect(parseCalendarIds('[]', 'c@z')).toEqual(['c@z']);
  });
  it('validuje vstup z klienta', () => {
    expect(normalizeCalendarIds([' a ', 'a', 'b'])).toEqual(['a', 'b']);
    expect(normalizeCalendarIds([])).toBeNull();
    expect(normalizeCalendarIds('a')).toBeNull();
    expect(normalizeCalendarIds(Array.from({ length: 11 }, (_, i) => `k${i}`))).toBeNull();
  });
});

describe('cilovyKalendar', () => {
  const povolene = ['hlavni@x', 'revize@g', 'firma@g'];
  it('vlastní kalendář zakázky, jinak výchozí, jinak první povolený', () => {
    expect(cilovyKalendar('firma@g', povolene, 'revize@g')).toBe('firma@g');
    expect(cilovyKalendar(null, povolene, 'revize@g')).toBe('revize@g');
    expect(cilovyKalendar('odebrany@g', povolene, 'revize@g')).toBe('revize@g');
    expect(cilovyKalendar(null, povolene, 'neni-v-seznamu')).toBe('hlavni@x');
  });
});
