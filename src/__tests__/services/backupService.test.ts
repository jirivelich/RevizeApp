/**
 * Test 12: backupService – export, import, stats, clean
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.stubEnv('VITE_API_URL', '/api');

import { backupService } from '../../services/database';

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

describe('backupService', () => {
  it('exportDatabase should return JSON string', async () => {
    const mockData = { revize: [{ id: 1 }], rozvadece: [] };
    mockFetchOk(mockData);

    const result = await backupService.exportDatabase();

    expect(typeof result).toBe('string');
    const parsed = JSON.parse(result);
    expect(parsed.revize).toHaveLength(1);
  });

  it('importDatabase should send data and return stats', async () => {
    const stats = { imported: 15, errors: 0 };
    mockFetchOk(stats);

    const result = await backupService.importDatabase(
      JSON.stringify({ revize: [] }),
      'merge',
    );

    expect(result.imported).toBe(15);
    expect(result.errors).toBe(0);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/backup/import'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"mode":"merge"'),
      }),
    );
  });

  it('importDatabase should default to replace mode', async () => {
    mockFetchOk({ imported: 5, errors: 0 });

    await backupService.importDatabase(JSON.stringify({}));

    const body = JSON.parse((global.fetch as Mock).mock.calls[0][1].body);
    expect(body.mode).toBe('replace');
  });

  it('getDatabaseStats should return stats and size', async () => {
    const stats = { stats: { revize: 10, rozvadece: 25 }, sizeMB: '12.5' };
    mockFetchOk(stats);

    const result = await backupService.getDatabaseStats();

    expect(result.stats.revize).toBe(10);
    expect(result.sizeMB).toBe('12.5');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/backup/stats'),
      expect.any(Object),
    );
  });

  it('cleanOldData should POST with daysOld', async () => {
    mockFetchOk({ deleted: 3, message: 'Smazáno 3 záznamů' });

    const result = await backupService.cleanOldData(180);

    expect(result.deleted).toBe(3);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/backup/clean'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ daysOld: 180 }),
      }),
    );
  });

  it('cleanOldData should default to 365 days', async () => {
    mockFetchOk({ deleted: 0 });

    await backupService.cleanOldData();

    const body = JSON.parse((global.fetch as Mock).mock.calls[0][1].body);
    expect(body.daysOld).toBe(365);
  });
});
