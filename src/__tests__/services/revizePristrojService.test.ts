/**
 * Test 9: revizePristrojService – vazby přístrojů na revize
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.stubEnv('VITE_API_URL', '/api');

import { revizePristrojService } from '../../services/database';

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

describe('revizePristrojService', () => {
  it('getByRevize should fetch pristroje for revize', async () => {
    const data = [
      { id: 1, nazev: 'Fluke 1653', vyrobce: 'Fluke' },
      { id: 2, nazev: 'METREL Eurotest', vyrobce: 'METREL' },
    ];
    mockFetchOk(data);

    const result = await revizePristrojService.getByRevize(5);

    expect(result).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/revize-pristroje/5'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('addToRevize should POST and return id', async () => {
    mockFetchOk({ id: 10 });

    const result = await revizePristrojService.addToRevize(5, 3);

    expect(result).toBe(10);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/revize-pristroje'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ revizeId: 5, pristrojId: 3 }),
      }),
    );
  });

  it('removeFromRevize should DELETE', async () => {
    mockFetchOk({ success: true });

    await revizePristrojService.removeFromRevize(5, 3);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/revize-pristroje/5/3'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
