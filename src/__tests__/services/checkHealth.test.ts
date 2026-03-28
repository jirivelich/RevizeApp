/**
 * Test 16: checkServerHealth – kontrola dostupnosti serveru
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.stubEnv('VITE_API_URL', '/api');

import { checkServerHealth } from '../../services/api';

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn();
});

describe('checkServerHealth', () => {
  it('should return true when server responds OK', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: true });

    const result = await checkServerHealth();

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/health'));
  });

  it('should return false when server responds not OK', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: false });

    const result = await checkServerHealth();

    expect(result).toBe(false);
  });

  it('should return false on network error', async () => {
    (global.fetch as Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await checkServerHealth();

    expect(result).toBe(false);
  });

  it('should return false on timeout', async () => {
    (global.fetch as Mock).mockRejectedValueOnce(new Error('AbortError'));

    const result = await checkServerHealth();

    expect(result).toBe(false);
  });
});
