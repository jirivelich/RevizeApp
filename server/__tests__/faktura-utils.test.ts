import { describe, it, expect } from 'vitest';
import { vypocitejCelkem, vypocitejPolozku, formatCisloFaktury, jePrechodPovolen, pridejDny, numerizuj, toNum, jePrechodNabidkyPovolen, lzeUpravitNabidku, rokPoslednihoCisla, normalizujSlevu, castkaSlevy, celkemSeSlevou } from '../faktura-utils';

describe('faktura-utils', () => {
  it('počítá položku a celkem se zaokrouhlením na 2 des.', () => {
    expect(vypocitejPolozku({ mnozstvi: 3, cenaZaJednotku: 1.115 })).toBe(3.35);
    expect(vypocitejCelkem([{ mnozstvi: 2, cenaZaJednotku: 100 }, { mnozstvi: '1,5', cenaZaJednotku: '10.10' }])).toBe(215.15);
    expect(vypocitejCelkem([])).toBe(0);
    expect(toNum('abc')).toBe(0);
  });

  it('formátuje číslo faktury', () => {
    expect(formatCisloFaktury(2026, 1)).toBe('20260001');
    expect(formatCisloFaktury(2026, 123, 'F')).toBe('F20260123');
  });

  it('validuje přechody stavů', () => {
    expect(jePrechodPovolen('koncept', 'vystavena')).toBe(true);
    expect(jePrechodPovolen('vystavena', 'zaplacena')).toBe(true);
    expect(jePrechodPovolen('vystavena', 'storno')).toBe(true);
    expect(jePrechodPovolen('zaplacena', 'storno')).toBe(true);
    expect(jePrechodPovolen('koncept', 'zaplacena')).toBe(false);
    expect(jePrechodPovolen('koncept', 'storno')).toBe(false);
    expect(jePrechodPovolen('storno', 'vystavena')).toBe(false);
    expect(jePrechodPovolen('zaplacena', 'vystavena')).toBe(false);
    expect(jePrechodPovolen('x', 'y')).toBe(false);
  });

  it('přičítá dny k datu', () => {
    expect(pridejDny('2026-01-20', 14)).toBe('2026-02-03');
    expect(pridejDny('2026-12-25', 14)).toBe('2027-01-08');
  });

  it('převádí NUMERIC řetězce na čísla', () => {
    expect(numerizuj({ celkem: '12.50', a: 'x', b: null }, ['celkem', 'b'])).toEqual({ celkem: 12.5, a: 'x', b: null });
  });
});


describe('cenové nabídky', () => {
  it('povolené přechody stavů', () => {
    expect(jePrechodNabidkyPovolen('koncept', 'odeslana')).toBe(true);
    expect(jePrechodNabidkyPovolen('odeslana', 'prijata')).toBe(true);
    expect(jePrechodNabidkyPovolen('odeslana', 'koncept')).toBe(true);
    expect(jePrechodNabidkyPovolen('prijata', 'koncept')).toBe(false);
    expect(jePrechodNabidkyPovolen('odmitnuta', 'prijata')).toBe(false);
    expect(jePrechodNabidkyPovolen('nesmysl', 'odeslana')).toBe(false);
  });
  it('upravovat lze koncept a odeslanou', () => {
    expect(lzeUpravitNabidku('koncept')).toBe(true);
    expect(lzeUpravitNabidku('odeslana')).toBe(true);
    expect(lzeUpravitNabidku('prijata')).toBe(false);
  });
});

describe('uvolnění čísla po smazání', () => {
  const rady = [{ rok: 2025, posledniCislo: 12 }, { rok: 2026, posledniCislo: 3 }];
  it('pozná poslední číslo v řadě (i s prefixem)', () => {
    expect(rokPoslednihoCisla('20260003', rady)).toBe(2026);
    expect(rokPoslednihoCisla('20250012', rady)).toBe(2025);
    expect(rokPoslednihoCisla('N20260003', rady, 'N')).toBe(2026);
  });
  it('jiné než poslední číslo, koncept bez čísla → null', () => {
    expect(rokPoslednihoCisla('20260002', rady)).toBeNull();
    expect(rokPoslednihoCisla(null, rady)).toBeNull();
    expect(rokPoslednihoCisla('N20260003', rady)).toBeNull();
  });
});

describe('procentuální sleva', () => {
  it('normalizace hodnoty', () => {
    expect(normalizujSlevu('10')).toBe(10);
    expect(normalizujSlevu('7,5')).toBe(7.5);
    expect(normalizujSlevu(-5)).toBe(0);
    expect(normalizujSlevu(150)).toBe(100);
    expect(normalizujSlevu('abc')).toBe(0);
    expect(normalizujSlevu(null)).toBe(0);
  });
  it('výpočet celkem po slevě', () => {
    const p = [{ mnozstvi: 1, cenaZaJednotku: 3500 }, { mnozstvi: 25, cenaZaJednotku: 60 }];
    expect(castkaSlevy(5000, 10)).toBe(500);
    expect(celkemSeSlevou(p, 10)).toBe(4500);
    expect(celkemSeSlevou(p, 0)).toBe(5000);
    expect(castkaSlevy(999, 7.5)).toBe(74.93);
    expect(celkemSeSlevou([{ mnozstvi: 1, cenaZaJednotku: 999 }], 7.5)).toBe(924.07);
  });
});
