/**
 * Test 14: predvolenyTextService – CRUD operace s předvolenými texty
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.stubEnv('VITE_API_URL', '/api');

import { predvolenyTextService } from '../../services/database';

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

describe('predvolenyTextService', () => {
  it('getAll should fetch all predvolene texty', async () => {
    const data = [
      { id: 1, pole: 'popisZarizeni', nazev: 'Bytový dům', text: 'Elektrická instalace...' },
      { id: 2, pole: 'rozsahRevize', nazev: 'Od elektroměru', text: 'Instalace od...' },
    ];
    mockFetchOk(data);

    const result = await predvolenyTextService.getAll();

    expect(result).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/predvolene-texty'),
      expect.any(Object),
    );
  });

  it('getByPole should fetch texts for specific field', async () => {
    const data = [
      { id: 1, pole: 'popisZarizeni', nazev: 'Bytový dům', text: 'text1' },
    ];
    mockFetchOk(data);

    const result = await predvolenyTextService.getByPole('popisZarizeni');

    expect(result).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/predvolene-texty/popisZarizeni'),
      expect.any(Object),
    );
  });

  it('create should POST and return id', async () => {
    mockFetchOk({ id: 10 });

    const id = await predvolenyTextService.create({
      pole: 'zaver',
      nazev: 'Nový text',
      text: 'Obsah textu',
      poradi: 1,
    });

    expect(id).toBe(10);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/predvolene-texty'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Nový text'),
      }),
    );
  });

  it('update should PUT text data', async () => {
    mockFetchOk({ success: true });

    await predvolenyTextService.update(1, {
      nazev: 'Aktualizovaný',
      text: 'Nový obsah',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/predvolene-texty/1'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('delete should DELETE text', async () => {
    mockFetchOk({ success: true });

    await predvolenyTextService.delete(1);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/predvolene-texty/1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
