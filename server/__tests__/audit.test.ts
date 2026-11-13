import { describe, it, expect, vi } from 'vitest';

vi.mock('../database', () => ({ pool: { query: vi.fn() } }));

import { diffZmen } from '../audit';

describe('diffZmen', () => {
  it('vrací jen skutečně změněná pole', () => {
    const r = diffZmen({ nazev: 'A', adresa: 'X' }, { nazev: 'B', adresa: 'X' });
    expect(r).toEqual([{ pole: 'nazev', puvodni: 'A', nova: 'B' }]);
  });

  it('ignoruje updatedAt a rozdíl null vs. prázdný řetězec', () => {
    expect(diffZmen({ poznamka: null }, { poznamka: '', updatedAt: 'x' })).toEqual([]);
  });

  it('nezahrnuje dlouhé hodnoty (base64) do auditu', () => {
    const dlouha = 'a'.repeat(1000);
    const r = diffZmen({ hromosvodNacrt: null }, { hromosvodNacrt: dlouha });
    expect(r).toHaveLength(1);
    expect(String(r[0].nova)).toContain('1000');
    expect(String(r[0].nova)).not.toContain('aaaa');
  });

  it('porovnává čísla a řetězce stejně (např. 36 vs "36")', () => {
    expect(diffZmen({ termin: 36 }, { termin: '36' })).toEqual([]);
  });
});
