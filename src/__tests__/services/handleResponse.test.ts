/**
 * Test 8: handleResponse – přesměrování při 401 a správné parsování chyb
 * Testujeme interně přes database service volání.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.stubEnv('VITE_API_URL', '/api');

import { revizeService } from '../../services/database';

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn();
  localStorage.clear();
  localStorage.setItem('token', 'test-token');
});

describe('handleResponse', () => {
  it('should clear token on 401 response', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });

    await expect(revizeService.getAll()).rejects.toThrow('Sezení vypršelo');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should clear user on 401 response', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 1 }));

    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });

    await expect(revizeService.getAll()).rejects.toThrow();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('should redirect to /login on 401', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    });

    await expect(revizeService.getAll()).rejects.toThrow();
    expect(window.location.href).toBe('/login');
  });

  it('should throw error message from API on non-401 error', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Databáze nedostupná' }),
    });

    await expect(revizeService.getAll()).rejects.toThrow('Databáze nedostupná');
  });

  it('should throw default message when error body cannot be parsed', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not JSON')),
    });

    await expect(revizeService.getAll()).rejects.toThrow('Neznámá chyba');
  });

  it('should return parsed JSON on success', async () => {
    const data = [{ id: 1, nazev: 'Test' }];
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    });

    const result = await revizeService.getAll();
    expect(result).toEqual(data);
  });
});
