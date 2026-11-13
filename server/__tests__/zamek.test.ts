import { describe, it, expect, vi } from 'vitest';

vi.mock('../database', () => ({ pool: { query: vi.fn() } }));

import { zjistiRevizeId, jeZamceny } from '../zamek';

/** Falešná DB: odpovídá podle textu dotazu. */
const dotaz = async (sql: string, params: unknown[]) => {
  const id = params[0];
  if (sql.includes('FROM rozvadec ')) return { rows: id === 5 ? [{ revizeId: 10 }] : [] };
  if (sql.includes('FROM okruh ')) return { rows: id === 7 ? [{ rozvadecId: 5 }] : [] };
  if (sql.includes('FROM chranic ')) return { rows: id === 8 ? [{ rozvadecId: 5 }] : [] };
  if (sql.includes('FROM mistnost ')) return { rows: id === 3 ? [{ revizeId: 10 }] : [] };
  if (sql.includes('FROM zarizeni ')) return { rows: id === 4 ? [{ mistnostId: 3 }] : [] };
  if (sql.includes('FROM zavada ')) return { rows: id === 9 ? [{ revizeId: 10 }] : [] };
  if (sql.includes('"revizePriloha"')) return { rows: id === 2 ? [{ revizeId: 10 }] : [] };
  if (sql.includes('"revizeRozsahPolozka"')) return { rows: id === 2 ? [{ revizeId: 10 }] : [] };
  if (sql.includes('"revizeDokument"')) return { rows: id === 2 ? [{ revizeId: 10 }] : [] };
  if (sql.includes('"revizePristroj"')) return { rows: id === 6 ? [{ revizeId: 10 }] : [] };
  return { rows: [] };
};
const zjisti = (m: string, p: string, body?: Record<string, any>) => zjistiRevizeId(m, p, body, dotaz);

describe('jeZamceny', () => {
  it('zamyká dokončené a schválené revize', () => {
    expect(jeZamceny('dokončeno')).toBe(true);
    expect(jeZamceny('schváleno')).toBe(true);
    expect(jeZamceny('rozpracováno')).toBe(false);
    expect(jeZamceny(null)).toBe(false);
  });
});

describe('zjistiRevizeId', () => {
  it('čtení (GET) revizi nemění', async () => {
    expect(await zjisti('GET', '/api/revize/10')).toBeNull();
  });

  it('úprava a smazání revize', async () => {
    expect(await zjisti('PUT', '/api/revize/10')).toBe(10);
    expect(await zjisti('DELETE', '/api/revize/10')).toBe(10);
  });

  it('odemknutí, duplikace a fakturace revizi nezamykají', async () => {
    expect(await zjisti('POST', '/api/revize/10/odemknout')).toBeNull();
    expect(await zjisti('POST', '/api/revize/10/duplikovat')).toBeNull();
    expect(await zjisti('POST', '/api/revize/10/faktura')).toBeNull();
  });

  it('podřízené entity vytvořené přes revizi', async () => {
    expect(await zjisti('POST', '/api/revize/10/prilohy')).toBe(10);
    expect(await zjisti('POST', '/api/revize/10/rozsah-polozky')).toBe(10);
    expect(await zjisti('POST', '/api/revize/10/dokumenty')).toBe(10);
  });

  it('rozvaděče, závady, místnosti vytvořené s revizeId v těle', async () => {
    expect(await zjisti('POST', '/api/rozvadece', { revizeId: 10 })).toBe(10);
    expect(await zjisti('POST', '/api/zavady', { revizeId: 10 })).toBe(10);
    expect(await zjisti('POST', '/api/mistnosti', { revizeId: 10 })).toBe(10);
    expect(await zjisti('POST', '/api/revize-pristroje', { revizeId: 10 })).toBe(10);
  });

  it('okruhy, chrániče a zařízení se dohledají přes rodiče', async () => {
    expect(await zjisti('POST', '/api/okruhy', { rozvadecId: 5 })).toBe(10);
    expect(await zjisti('PUT', '/api/okruhy/7')).toBe(10);
    expect(await zjisti('DELETE', '/api/chranice/8')).toBe(10);
    expect(await zjisti('POST', '/api/zarizeni', { mistnostId: 3 })).toBe(10);
    expect(await zjisti('PUT', '/api/zarizeni/4')).toBe(10);
  });

  it('úprava a smazání podle id entity', async () => {
    expect(await zjisti('PUT', '/api/rozvadece/5')).toBe(10);
    expect(await zjisti('PUT', '/api/zavady/9')).toBe(10);
    expect(await zjisti('DELETE', '/api/mistnosti/3')).toBe(10);
    expect(await zjisti('PUT', '/api/prilohy/2')).toBe(10);
    expect(await zjisti('DELETE', '/api/rozsah-polozky/2')).toBe(10);
    expect(await zjisti('DELETE', '/api/dokumenty/2')).toBe(10);
    expect(await zjisti('DELETE', '/api/revize-pristroje/6')).toBe(10);
    expect(await zjisti('DELETE', '/api/revize-pristroje/10/77')).toBe(10);
  });

  it('neexistující entita nebo cizí trasa vrací null', async () => {
    expect(await zjisti('PUT', '/api/zavady/999')).toBeNull();
    expect(await zjisti('POST', '/api/faktury', {})).toBeNull();
    expect(await zjisti('PUT', '/api/nastaveni', {})).toBeNull();
  });
});
