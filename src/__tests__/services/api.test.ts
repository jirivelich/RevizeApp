/**
 * Testy pro src/services/api.ts
 *
 * Mockujeme globální fetch a ověřujeme:
 * - správné URL
 * - správné HTTP metody
 * - auth headers
 * - error handling (401 → redirect, jiné HTTP chyby)
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Musíme mock import.meta.env PŘED importem modulu
vi.stubEnv('VITE_API_URL', '/api');

// Import testovaného modulu
import {
  revizeApi,
  rozvadeceApi,
  nastaveniApi,
  backupApi,
  checkServerHealth,
  aiApi,
} from '../../services/api';

// ═══════════════════════════════════════════
// Pomocné funkce
// ═══════════════════════════════════════════

function mockFetchSuccess(data: unknown, status = 200) {
  (global.fetch as Mock).mockResolvedValueOnce({
    ok: true,
    status,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(errorData: { error: string }, status = 400) {
  (global.fetch as Mock).mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve(errorData),
  });
}

// ═══════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn();
  localStorage.clear();
  localStorage.setItem('token', 'test-jwt-token');
});

// ═══════════════════════════════════════════
// REVIZE API
// ═══════════════════════════════════════════

describe('revizeApi', () => {
  describe('getAll', () => {
    it('should fetch all revize with auth header', async () => {
      const mockData = [{ id: 1, nazev: 'Revize 1' }];
      mockFetchSuccess(mockData);

      const result = await revizeApi.getAll();

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/revize'), {
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt-token',
          'Content-Type': 'application/json',
        }),
      });
    });
  });

  describe('getById', () => {
    it('should fetch revize by id', async () => {
      const mockData = { id: 1, nazev: 'Revize 1' };
      mockFetchSuccess(mockData);

      const result = await revizeApi.getById('1');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/revize/1'),
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
  });

  describe('create', () => {
    it('should POST new revize', async () => {
      const newRevize = { nazev: 'Nová revize', adresa: 'Test 1' };
      mockFetchSuccess({ id: 42 });

      const result = await revizeApi.create(newRevize);

      expect(result).toEqual({ id: 42 });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/revize'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newRevize),
        }),
      );
    });
  });

  describe('update', () => {
    it('should PUT updated revize', async () => {
      const updateData = { nazev: 'Aktualizováno' };
      mockFetchSuccess({ success: true });

      const result = await revizeApi.update('1', updateData);

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/revize/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should DELETE revize', async () => {
      mockFetchSuccess({ success: true });

      const result = await revizeApi.delete('3');

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/revize/3'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});

// ═══════════════════════════════════════════
// ROZVADECE API
// ═══════════════════════════════════════════

describe('rozvadeceApi', () => {
  describe('getByRevize', () => {
    it('should fetch rozvadece by revize id', async () => {
      const mockData = [{ id: 1, nazev: 'RE1' }];
      mockFetchSuccess(mockData);

      const result = await rozvadeceApi.getByRevize('5');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rozvadece/5'),
        expect.any(Object),
      );
    });
  });

  describe('create', () => {
    it('should POST new rozvadec', async () => {
      const data = { revizeId: 5, nazev: 'RE2', oznaceni: 'X' };
      mockFetchSuccess({ id: 10 });

      await rozvadeceApi.create(data);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rozvadece'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should DELETE rozvadec', async () => {
      mockFetchSuccess({ success: true });

      await rozvadeceApi.delete('10');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rozvadece/10'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});

// ═══════════════════════════════════════════
// NASTAVENÍ API
// ═══════════════════════════════════════════

describe('nastaveniApi', () => {
  it('should GET nastaveni', async () => {
    const mockData = { firmaJmeno: 'Test s.r.o.' };
    mockFetchSuccess(mockData);

    const result = await nastaveniApi.get();

    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/nastaveni'), expect.any(Object));
  });

  it('should PUT nastaveni', async () => {
    const data = { firmaJmeno: 'Updated s.r.o.' };
    mockFetchSuccess({ success: true });

    await nastaveniApi.update(data);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/nastaveni'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    );
  });
});

// ═══════════════════════════════════════════
// BACKUP API
// ═══════════════════════════════════════════

describe('backupApi', () => {
  it('should download backup', async () => {
    const mockBackup = { revize: [], firmy: [] };
    mockFetchSuccess(mockBackup);

    const result = await backupApi.download();
    expect(result).toEqual(mockBackup);
  });

  it('should import backup with merge mode', async () => {
    const importData = { revize: [{ id: 1 }] };
    mockFetchSuccess({ success: true });

    await backupApi.import(importData, 'merge');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/backup/import'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ data: importData, mode: 'merge' }),
      }),
    );
  });
});

// ═══════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════

describe('checkServerHealth', () => {
  it('should return true when server is healthy', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: true });

    const result = await checkServerHealth();
    expect(result).toBe(true);
  });

  it('should return false when server is down', async () => {
    (global.fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

    const result = await checkServerHealth();
    expect(result).toBe(false);
  });

  it('should return false when response is not ok', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: false });

    const result = await checkServerHealth();
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════
// AI API
// ═══════════════════════════════════════════

describe('aiApi', () => {
  describe('getStatus', () => {
    it('should check AI status', async () => {
      mockFetchSuccess({ configured: true });

      const result = await aiApi.getStatus();
      expect(result).toEqual({ configured: true });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ai/status'),
        expect.any(Object),
      );
    });
  });

  describe('generateReport', () => {
    it('should generate report for revize', async () => {
      mockFetchSuccess({ text: 'Generovaný text zprávy...' });

      const result = await aiApi.generateReport(1);

      expect(result.text).toBe('Generovaný text zprávy...');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ai/generate-report'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ revizeId: 1 }),
        }),
      );
    });
  });

  describe('chat', () => {
    it('should send chat messages', async () => {
      const messages = [{ role: 'user' as const, content: 'Ahoj' }];
      mockFetchSuccess({ reply: 'Dobrý den!' });

      const result = await aiApi.chat(messages);

      expect(result.reply).toBe('Dobrý den!');
    });
  });

  describe('autofill', () => {
    it('should get autofill suggestion', async () => {
      const suggestion = { popisZarizeni: 'Elektrická instalace...' };
      mockFetchSuccess({ suggestion });

      const result = await aiApi.autofill('popisZarizeni', { nazev: 'Test' }, 'revize');

      expect(result.suggestion).toEqual(suggestion);
    });
  });
});

// ═══════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════

describe('Error handling', () => {
  it('should redirect to /login on 401 response', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });

    await expect(revizeApi.getAll()).rejects.toThrow('Sezení vypršelo');
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('user');
  });

  it('should throw error on other HTTP errors', async () => {
    mockFetchError({ error: 'Revize nebyla nalezena' }, 404);

    await expect(revizeApi.getById('999')).rejects.toThrow('Revize nebyla nalezena');
  });

  it('should not include auth header when no token', async () => {
    localStorage.removeItem('token');
    mockFetchSuccess([]);

    await revizeApi.getAll();

    const callHeaders = (global.fetch as Mock).mock.calls[0][1].headers;
    expect(callHeaders.Authorization).toBeUndefined();
  });
});
