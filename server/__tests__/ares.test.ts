import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalizujIco, formatujAdresu, mapujSubjekt, najdiPodleIco, hledejPodleNazvu } from '../ares';

afterEach(() => vi.unstubAllGlobals());

describe('ares', () => {
  it('ověřuje IČO kontrolním součtem', () => {
    expect(normalizujIco('27074358')).toBe('27074358');
    expect(normalizujIco(' 2707 4358 ')).toBe('27074358');
    expect(normalizujIco('25596641')).toBe('25596641');
    expect(normalizujIco('27074359')).toBeNull();
    expect(normalizujIco('abc')).toBeNull();
    expect(normalizujIco('')).toBeNull();
    expect(normalizujIco('123456789')).toBeNull();
  });

  it('formátuje adresu', () => {
    expect(formatujAdresu({ textovaAdresa: 'Budějovická 778/3a, 14000 Praha 4' })).toBe('Budějovická 778/3a, 14000 Praha 4');
    expect(formatujAdresu({ nazevUlice: 'Hlavní', cisloDomovni: 12, cisloOrientacni: 3, cisloOrientacniPismeno: 'b', psc: 60200, nazevObce: 'Brno' }))
      .toBe('Hlavní 12/3b, 602 00 Brno');
    expect(formatujAdresu({ nazevObce: 'Lhota', cisloDomovni: 5, psc: 12345 })).toBe('Lhota 5, 123 45 Lhota');
    expect(formatujAdresu(undefined)).toBe('');
  });

  it('mapuje subjekt', () => {
    expect(mapujSubjekt({ ico: '27074358', obchodniJmeno: ' Firma a.s. ', dic: 'CZ27074358', sidlo: { textovaAdresa: 'X 1' } }))
      .toEqual({ ico: '27074358', nazev: 'Firma a.s.', adresa: 'X 1', dic: 'CZ27074358' });
    expect(mapujSubjekt({ ico: '1', obchodniJmeno: 'Fyzická osoba' }).dic).toBe('');
  });

  it('najde subjekt podle IČO', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ico: '27074358', obchodniJmeno: 'Firma', sidlo: { textovaAdresa: 'A' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const s = await najdiPodleIco('27074358');
    expect(s.nazev).toBe('Firma');
    expect(fetchMock.mock.calls[0][0]).toContain('/ekonomicke-subjekty/27074358');
  });

  it('vrací 404 a 400 jako srozumitelné chyby', async () => {
    await expect(najdiPodleIco('123')).rejects.toMatchObject({ status: 400 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));
    await expect(najdiPodleIco('27074358')).rejects.toMatchObject({ status: 404 });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
    await expect(najdiPodleIco('27074358')).rejects.toMatchObject({ status: 502 });
  });

  it('hledá podle názvu', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ pocetCelkem: 1, ekonomickeSubjekty: [{ ico: '1', obchodniJmeno: 'ABC s.r.o.' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await hledejPodleNazvu('ABC');
    expect(r).toHaveLength(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).obchodniJmeno).toBe('ABC');
    await expect(hledejPodleNazvu('ab')).rejects.toMatchObject({ status: 400 });
  });
});
