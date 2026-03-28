/**
 * Test 17: aiApi – AI endpointy (status, generateReport, chat, autofill)
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.stubEnv('VITE_API_URL', '/api');

import { aiApi } from '../../services/api';

function mockFetchOk(data: unknown) {
  (global.fetch as Mock).mockResolvedValueOnce({
    ok: true, status: 200, json: () => Promise.resolve(data),
  });
}

function mockFetchError(error: string, status = 400) {
  (global.fetch as Mock).mockResolvedValueOnce({
    ok: false, status,
    json: () => Promise.resolve({ error }),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn();
  localStorage.clear();
  localStorage.setItem('token', 'test-token');
});

describe('aiApi', () => {
  describe('getStatus', () => {
    it('should return configured status', async () => {
      mockFetchOk({ configured: true });

      const result = await aiApi.getStatus();

      expect(result.configured).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai/status'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        }),
      );
    });

    it('should return false when AI not configured', async () => {
      mockFetchOk({ configured: false });

      const result = await aiApi.getStatus();

      expect(result.configured).toBe(false);
    });
  });

  describe('generateReport', () => {
    it('should POST revizeId and return text', async () => {
      mockFetchOk({ text: 'Generovaný text revizní zprávy...' });

      const result = await aiApi.generateReport(42);

      expect(result.text).toContain('Generovaný text');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai/generate-report'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ revizeId: 42 }),
        }),
      );
    });
  });

  describe('chat', () => {
    it('should send messages and return reply', async () => {
      mockFetchOk({ reply: 'Odpověď asistenta' });

      const messages = [
        { role: 'user' as const, content: 'Ahoj' },
      ];
      const result = await aiApi.chat(messages);

      expect(result.reply).toBe('Odpověď asistenta');
    });

    it('should include revize context when provided', async () => {
      mockFetchOk({ reply: 'OK' });

      const messages = [{ role: 'user' as const, content: 'Test' }];
      const context = { id: 1, nazev: 'Revize 1' };

      await aiApi.chat(messages, context);

      const body = JSON.parse((global.fetch as Mock).mock.calls[0][1].body);
      expect(body.revizeContext).toEqual(context);
    });
  });

  describe('autofill', () => {
    it('should send field data and return suggestion', async () => {
      mockFetchOk({ suggestion: { popisZarizeni: 'Automatický popis' } });

      const result = await aiApi.autofill('popisZarizeni', { nazev: 'Test' }, 'revize');

      expect(result.suggestion.popisZarizeni).toBe('Automatický popis');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai/autofill'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            field: 'popisZarizeni',
            formData: { nazev: 'Test' },
            entityType: 'revize',
          }),
        }),
      );
    });
  });

  it('should throw on API error', async () => {
    mockFetchError('AI service unavailable', 503);

    await expect(aiApi.getStatus()).rejects.toThrow('AI service unavailable');
  });
});
