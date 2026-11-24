import { describe, it, expect } from 'vitest';
import type { Revize } from '../../types';
import { seskupRevize, slozkaRevize, navrhySlozek, BEZ_OBJEDNATELE } from '../../utils/slozky';

let id = 0;
const rev = (p: Partial<Revize>): Revize => ({
  id: ++id, cisloRevize: `R${id}`, nazev: `Stroj ${id}`, adresa: '', objednatel: 'Firma ABC',
  kategorieRevize: 'stroje', datum: '2026-11-24', termin: 12, typRevize: 'pravidelná', stav: 'rozpracováno',
  ...p,
} as Revize);

describe('slozkaRevize', () => {
  it('vrací vyplněnou složku', () => {
    expect(slozkaRevize({ slozka: '  Hala A ' })).toBe('Hala A');
  });
  it('bez složky použije halu z protokolu stroje', () => {
    expect(slozkaRevize({ slozka: null, strojniData: JSON.stringify({ mistoHala: 'Hala B' }) })).toBe('Hala B');
  });
  it('vydrží poškozený JSON', () => {
    expect(slozkaRevize({ strojniData: '{nejde' })).toBe('');
  });
});

describe('seskupRevize', () => {
  it('seskupí podle objednatele a složky a spočítá hotové', () => {
    const data = [
      rev({ slozka: 'Hala 10', stav: 'dokončeno' }),
      rev({ slozka: 'Hala 2' }),
      rev({ slozka: 'hala 2', stav: 'schváleno' }),
      rev({}),
      rev({ objednatel: ' firma abc ', slozka: 'Hala 2' }),
      rev({ objednatel: '' }),
      rev({ objednatel: 'Alfa s.r.o.' }),
    ];
    const g = seskupRevize(data);
    expect(g.map(o => o.nazev)).toEqual(['Alfa s.r.o.', 'Firma ABC', BEZ_OBJEDNATELE]);
    const abc = g[1];
    expect(abc.pocet).toBe(5);
    expect(abc.hotovo).toBe(2);
    // přirozené řazení čísel, „bez složky“ poslední
    expect(abc.slozky.map(s => s.nazev)).toEqual(['Hala 2', 'Hala 10', '']);
    expect(abc.slozky[0].revize).toHaveLength(3);
    expect(abc.slozky[0].hotovo).toBe(1);
  });

  it('zachová pořadí revizí ze vstupu', () => {
    const a = rev({ slozka: 'X' }), b = rev({ slozka: 'X' });
    expect(seskupRevize([b, a])[0].slozky[0].revize).toEqual([b, a]);
  });
});

describe('navrhySlozek', () => {
  it('složky objednatele jsou první, bez duplicit', () => {
    const data = [
      rev({ objednatel: 'Jiná', slozka: 'Aula' }),
      rev({ slozka: 'Hala B' }),
      rev({ slozka: 'hala b' }),
      rev({ objednatel: 'Jiná', slozka: 'Hala B' }),
    ];
    expect(navrhySlozek(data, 'Firma ABC')).toEqual(['Hala B', 'Aula']);
  });
});
