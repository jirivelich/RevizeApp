/**
 * Test 19: exportService – wrapper nad backupService pro zpětnou kompatibilitu
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.stubEnv('VITE_API_URL', '/api');

import { exportService } from '../../services/database';

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

describe('exportService', () => {
  it('exportAll should call backup endpoint and return JSON string', async () => {
    const data = { revize: [{ id: 1 }], firmy: [] };
    mockFetchOk(data);

    const result = await exportService.exportAll();

    expect(typeof result).toBe('string');
    expect(JSON.parse(result)).toEqual(data);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/backup'),
      expect.any(Object),
    );
  });

  it('importAll should call backup import with replace mode', async () => {
    mockFetchOk({ imported: 5, errors: 0 });

    await exportService.importAll(JSON.stringify({ revize: [] }));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/backup/import'),
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const body = JSON.parse((global.fetch as Mock).mock.calls[0][1].body);
    expect(body.mode).toBe('replace');
  });
});
