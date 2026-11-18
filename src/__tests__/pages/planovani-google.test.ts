import { describe, it, expect } from 'vitest';
import { googleCelodenni, googleCasove, googleVeDni, hourRange, type GUdalost } from '../../pages/Planovani/model';

const u = (o: Partial<GUdalost>): GUdalost => ({ id: 'x', nazev: 'Událost', kalendar: 'K', start: '', end: '', celyDen: false, ...o });

describe('události z Google Kalendáře v kalendáři aplikace', () => {
  it('celodenní: konec je exkluzivní, vícedenní zasáhne každý den', () => {
    const dov = u({ celyDen: true, start: '2026-11-21', end: '2026-11-23' });
    expect(googleCelodenni([dov], '2026-11-20')).toHaveLength(0);
    expect(googleCelodenni([dov], '2026-11-21')).toHaveLength(1);
    expect(googleCelodenni([dov], '2026-11-22')).toHaveLength(1);
    expect(googleCelodenni([dov], '2026-11-23')).toHaveLength(0);
  });

  it('časová událost v místním čase', () => {
    const b = googleCasove([u({ start: '2026-11-19T13:00:00', end: '2026-11-19T14:30:00' })], '2026-11-19');
    expect(b).toHaveLength(1);
    expect(b[0].from).toBe(13);
    expect(b[0].to).toBe(14.5);
    expect(googleCasove([u({ start: '2026-11-19T13:00:00', end: '2026-11-19T14:30:00' })], '2026-11-20')).toHaveLength(0);
  });

  it('přes půlnoc se rozdělí do obou dnů; konec přesně o půlnoci další den nezasáhne', () => {
    const noc = u({ start: '2026-11-19T22:00:00', end: '2026-11-20T02:00:00' });
    expect(googleCasove([noc], '2026-11-19')[0]).toMatchObject({ from: 22, to: 24 });
    expect(googleCasove([noc], '2026-11-20')[0]).toMatchObject({ from: 0, to: 2 });
    const doPulnoci = u({ start: '2026-11-19T20:00:00', end: '2026-11-20T00:00:00' });
    expect(googleCasove([doPulnoci], '2026-11-20')).toHaveLength(0);
  });

  it('měsíční přehled spojí celodenní a časové; časová osa se roztáhne', () => {
    const den = googleVeDni([
      u({ id: 'a', celyDen: true, start: '2026-11-19', end: '2026-11-20' }),
      u({ id: 'b', start: '2026-11-19T06:00:00', end: '2026-11-19T07:00:00' }),
    ], '2026-11-19');
    expect(den.map(d => d.cas ?? 'celý den')).toEqual(['celý den', '6:00–7:00']);
    expect(hourRange([{ from: 6, to: 7 }])).toEqual({ start: 6, end: 17 });
    expect(googleVeDni(undefined, '2026-11-19')).toEqual([]);
  });
});
