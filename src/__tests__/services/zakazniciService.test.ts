/**
 * Test 13: zakazniciService – CRUD operace se zákazníky
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.stubEnv('VITE_API_URL', '/api');

import { zakazniciService } from '../../services/database';

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

describe('zakazniciService', () => {
  it('getAll should fetch all zakaznici', async () => {
    const data = [
      { id: 1, nazev: 'Zákazník A', ico: '12345678' },
      { id: 2, nazev: 'Zákazník B', ico: '87654321' },
    ];
    mockFetchOk(data);

    const result = await zakazniciService.getAll();

    expect(result).toHaveLength(2);
    expect(result[0].nazev).toBe('Zákazník A');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/zakaznici'),
      expect.any(Object),
    );
  });

  it('getById should return single zakaznik', async () => {
    const data = { id: 1, nazev: 'Zákazník A' };
    mockFetchOk(data);

    const result = await zakazniciService.getById(1);

    expect(result?.nazev).toBe('Zákazník A');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/zakaznici/1'),
      expect.any(Object),
    );
  });

  it('getRevize should fetch revize for zakaznik', async () => {
    const data = [{ id: 10, nazev: 'Revize zákazníka' }];
    mockFetchOk(data);

    const result = await zakazniciService.getRevize(1);

    expect(result).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/zakaznici/1/revize'),
      expect.any(Object),
    );
  });

  it('create should POST and return id', async () => {
    mockFetchOk({ id: 3 });

    const id = await zakazniciService.create({
      nazev: 'Nový zákazník',
      adresa: 'Praha 1',
      ico: '99999999',
    });

    expect(id).toBe(3);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/zakaznici'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Nový zákazník'),
      }),
    );
  });

  it('update should PUT and return 1', async () => {
    mockFetchOk({ success: true });

    const result = await zakazniciService.update(1, { nazev: 'Změněný' });

    expect(result).toBe(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/zakaznici/1'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('delete should DELETE zakaznik', async () => {
    mockFetchOk({ success: true });

    await zakazniciService.delete(1);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/zakaznici/1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
