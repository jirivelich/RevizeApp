import { describe, it, expect } from 'vitest';
import { vypocitejCelkem, vypocitejPolozku, formatCisloFaktury, jePrechodPovolen, pridejDny, numerizuj, toNum } from '../faktura-utils';

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
