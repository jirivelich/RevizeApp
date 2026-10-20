import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.stubEnv('VITE_API_URL', '/api');

import { fakturyService, cenikService } from '../../services/database';
import { spoctiCelkem } from '../../services/fakturaUtils';

function mockFetchOk(data: unknown) {
  (global.fetch as Mock).mockResolvedValueOnce({
    ok: true, status: 200, json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn();
  localStorage.clear();
  localStorage.setItem('token', 'test-token');
});

describe('fakturyService', () => {
  it('getAll should fetch faktury with filter query', async () => {
    mockFetchOk([{ id: 1, odberatelNazev: 'A', stav: 'koncept', celkem: 100 }]);
    const result = await fakturyService.getAll({ stav: 'vystavena', rok: 2026, zakaznikId: 5 });
    expect(result).toHaveLength(1);
    const url = (global.fetch as Mock).mock.calls[0][0] as string;
    expect(url).toContain('/faktury?');
    expect(url).toContain('stav=vystavena');
    expect(url).toContain('rok=2026');
    expect(url).toContain('zakaznikId=5');
  });

  it('getById should return faktura with polozky', async () => {
    mockFetchOk({ id: 2, odberatelNazev: 'B', polozky: [{ poradi: 1, popis: 'x', mnozstvi: 1, cenaZaJednotku: 10, celkem: 10 }] });
    const result = await fakturyService.getById(2);
    expect(result?.polozky).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/faktury/2'), expect.any(Object));
  });

  it('create should POST and return id', async () => {
    mockFetchOk({ id: 7 });
    const id = await fakturyService.create({ odberatelNazev: 'Nový', formaUhrady: 'prevod', celkem: 0 });
    expect(id).toBe(7);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/faktury'),
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('Nový') }),
    );
  });

  it('update should PUT and return 1', async () => {
    mockFetchOk({ success: true });
    expect(await fakturyService.update(1, { poznamka: 'x' })).toBe(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/faktury/1'), expect.objectContaining({ method: 'PUT' }));
  });

  it('delete should DELETE faktura', async () => {
    mockFetchOk({ success: true });
    await fakturyService.delete(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/faktury/1'), expect.objectContaining({ method: 'DELETE' }));
  });

  it('zmenStav should POST stav', async () => {
    mockFetchOk({ success: true });
    await fakturyService.zmenStav(3, 'zaplacena');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/faktury/3/stav'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ stav: 'zaplacena' }) }),
    );
  });

  it('zmenStav and vytvorZRevize should throw offline', async () => {
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await expect(fakturyService.zmenStav(3, 'vystavena')).rejects.toThrow(/připojení/);
    await expect(fakturyService.vytvorZRevize(1)).rejects.toThrow(/připojení/);
    expect(global.fetch).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('vytvorZRevize should POST and return id', async () => {
    mockFetchOk({ id: 9 });
    const id = await fakturyService.vytvorZRevize(4);
    expect(id).toBe(9);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/revize/4/faktura'), expect.objectContaining({ method: 'POST' }));
  });
});

describe('cenikService', () => {
  it('getAll should fetch cenik', async () => {
    mockFetchOk([{ id: 1, nazev: 'Revize', cena: 1500, aktivni: true }]);
    const result = await cenikService.getAll();
    expect(result[0].nazev).toBe('Revize');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/cenik'), expect.any(Object));
  });

  it('create should POST and return id', async () => {
    mockFetchOk({ id: 2 });
    expect(await cenikService.create({ nazev: 'X', cena: 10, aktivni: true })).toBe(2);
  });

  it('update should PUT', async () => {
    mockFetchOk({ success: true });
    expect(await cenikService.update(2, { cena: 20 })).toBe(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/cenik/2'), expect.objectContaining({ method: 'PUT' }));
  });

  it('delete should DELETE', async () => {
    mockFetchOk({ success: true });
    await cenikService.delete(2);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/cenik/2'), expect.objectContaining({ method: 'DELETE' }));
  });
});

describe('spoctiCelkem', () => {
  it('sums and rounds to 2 decimals', () => {
    expect(spoctiCelkem([])).toBe(0);
    expect(spoctiCelkem([{ mnozstvi: 3, cenaZaJednotku: 0.1 }])).toBe(0.3);
    expect(spoctiCelkem([{ mnozstvi: 1.5, cenaZaJednotku: 1000.33 }])).toBe(1500.5);
  });
});
