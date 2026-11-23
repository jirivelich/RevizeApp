import { describe, it, expect } from 'vitest';
import { navigacniOdkazy } from '../../utils/navigace';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120';

describe('navigacniOdkazy', () => {
  it('Android: první je systémový výběr aplikace (geo:)', () => {
    const o = navigacniOdkazy({ adresa: 'Husova 2, Tachov' }, ANDROID);
    expect(o[0].id).toBe('system');
    expect(o[0].url).toBe('geo:0,0?q=Husova%202%2C%20Tachov');
    expect(o.map(x => x.id)).toEqual(['system', 'mapy', 'google', 'waze']);
  });

  it('iPhone: Apple Mapy, bez geo:', () => {
    const ids = navigacniOdkazy({ adresa: 'Tachov' }, IPHONE).map(x => x.id);
    expect(ids).toContain('apple');
    expect(ids).not.toContain('system');
  });

  it('uložená poloha má přednost před adresou', () => {
    const o = navigacniOdkazy({ adresa: 'Tachov', lat: 49.7953123, lng: 12.6336456, nazev: 'Hala' }, ANDROID);
    const byId = Object.fromEntries(o.map(x => [x.id, x.url]));
    expect(byId.system).toBe('geo:49.795312,12.633646?q=49.795312,12.633646(Hala)');
    expect(byId.mapy).toBe('https://mapy.com/fnc/v1/route?end=12.633646,49.795312&routeType=car_fast');
    expect(byId.google).toContain('destination=49.795312%2C12.633646');
    expect(byId.waze).toBe('https://waze.com/ul?ll=49.795312,12.633646&navigate=yes');
  });

  it('počítač: Mapy.com, Google, Waze', () => {
    expect(navigacniOdkazy({ adresa: 'Tachov' }, WINDOWS).map(x => x.id)).toEqual(['mapy', 'google', 'waze']);
  });
});
