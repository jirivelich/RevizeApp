import { describe, it, expect } from 'vitest';
import { parseMereni, zsMax, vyhodnotOkruh, vyhodnotChranic, fmtCislo } from '../../pages/RevizeDetail/mereniLimity';
import type { Chranic } from '../../types';

describe('parseMereni', () => {
  it('parsuje čísla s čárkou, prefixy a jednotkami', () => {
    expect(parseMereni('0,86')).toBe(0.86);
    expect(parseMereni('max. 1,2')).toBe(1.2);
    expect(parseMereni('>200')).toBe(200);
    expect(parseMereni('200 MΩ')).toBe(200);
    expect(parseMereni(3)).toBe(3);
  });
  it('vrací null pro prázdné hodnoty', () => {
    expect(parseMereni('')).toBeNull();
    expect(parseMereni(undefined)).toBeNull();
    expect(parseMereni('—')).toBeNull();
  });
});

describe('zsMax', () => {
  it('počítá U0/Ia podle charakteristiky', () => {
    expect(zsMax('B', '16A')).toBeCloseTo(2.875);
    expect(zsMax('C', '16A')).toBeCloseTo(1.4375);
    expect(zsMax('D', '10A')).toBeCloseTo(1.15);
  });
  it('vrací null pro pojistky a neznámé typy', () => {
    expect(zsMax('gG', '25A')).toBeNull();
    expect(zsMax('B', '')).toBeNull();
  });
});

describe('vyhodnotOkruh', () => {
  const base = { jisticTyp: 'B', jisticProud: '16A' };
  it('nezměřený okruh', () => {
    expect(vyhodnotOkruh({ ...base }).stav).toBe('nezmereno');
  });
  it('vyhovující okruh', () => {
    expect(vyhodnotOkruh({ ...base, izolacniOdpor: '>200', impedanceSmycky: '0,86' }).stav).toBe('ok');
  });
  it('blízko limitu nad 80 %', () => {
    expect(vyhodnotOkruh({ ...base, izolacniOdpor: '150', impedanceSmycky: '2,5' }).stav).toBe('limit');
  });
  it('nevyhovuje při překročení Zs nebo nízkém Riso', () => {
    expect(vyhodnotOkruh({ ...base, izolacniOdpor: '>200', impedanceSmycky: '3,12' }).stav).toBe('fail');
    expect(vyhodnotOkruh({ ...base, izolacniOdpor: '0,5' }).stav).toBe('fail');
  });
  it('jen částečně změřený okruh je nezměřený', () => {
    expect(vyhodnotOkruh({ ...base, izolacniOdpor: '>200' }).stav).toBe('nezmereno');
  });
  it('bez známého limitu Zs rozhoduje jen Riso', () => {
    expect(vyhodnotOkruh({ jisticTyp: 'gG', jisticProud: '25A', izolacniOdpor: '50', impedanceSmycky: '5' }).stav).toBe('ok');
  });
});

describe('vyhodnotChranic', () => {
  const c = (p: Partial<Chranic>): Chranic => ({ rozvadecId: 1, cislo: 1, nazev: 'FI', typ: 'A', proud: '40A', citlivostMa: 30, pocetPolu: 4, ...p } as Chranic);
  it('kompletně vyhovující chránič', () => {
    const v = vyhodnotChranic(c({ vybavovacProud: 21, casOdpojeni1x: 24, casOdpojeni5x: 12, dotykoveNapeti: 0.8 }));
    expect(v.stav).toBe('ok');
    expect(v.chybi).toBe(0);
  });
  it('neúplné měření', () => {
    const v = vyhodnotChranic(c({ vybavovacProud: 24, casOdpojeni1x: 31 }));
    expect(v.stav).toBe('limit');
    expect(v.chybi).toBe(2);
  });
  it('nevyhovuje při pomalém vypnutí', () => {
    expect(vyhodnotChranic(c({ casOdpojeni1x: 350 })).stav).toBe('fail');
  });
  it('selektivní chránič má delší časy', () => {
    expect(vyhodnotChranic(c({ selektivita: true, casOdpojeni1x: 350 })).stav).not.toBe('fail');
  });
  it('typ F používá 2×IΔn', () => {
    expect(vyhodnotChranic(c({ typ: 'F' })).hodnoty.map(h => h.klic)).toContain('t2');
  });
  it('bez hodnot = nezměřeno', () => {
    expect(vyhodnotChranic(c({})).stav).toBe('nezmereno');
  });
});

describe('fmtCislo', () => {
  it('formátuje s čárkou', () => {
    expect(fmtCislo(2.875)).toBe('2,88');
    expect(fmtCislo(null)).toBe('—');
  });
});
