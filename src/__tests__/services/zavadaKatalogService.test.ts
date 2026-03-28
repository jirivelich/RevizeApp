/**
 * Test 10: zavadaKatalogService – CRUD, filtrování a defaultní závady
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.stubEnv('VITE_API_URL', '/api');

import { zavadaKatalogService } from '../../services/database';

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

const mockKatalog = [
  { id: 1, popis: 'Chybí označení', zavaznost: 'C2', kategorie: 'Rozvaděče' },
  { id: 2, popis: 'Poškozená izolace', zavaznost: 'C1', kategorie: 'Vedení' },
  { id: 3, popis: 'Chybí revizní zpráva', zavaznost: 'C2', kategorie: 'Dokumentace' },
  { id: 4, popis: 'Nezajištěný kryt', zavaznost: 'C3', kategorie: 'Rozvaděče' },
];

describe('zavadaKatalogService', () => {
  it('getAll should fetch all katalog items', async () => {
    mockFetchOk(mockKatalog);

    const result = await zavadaKatalogService.getAll();

    expect(result).toHaveLength(4);
  });

  it('getById should return specific item', async () => {
    mockFetchOk(mockKatalog);

    const result = await zavadaKatalogService.getById(2);

    expect(result?.popis).toBe('Poškozená izolace');
  });

  it('getByKategorie should filter by kategorie', async () => {
    mockFetchOk(mockKatalog);

    const result = await zavadaKatalogService.getByKategorie('Rozvaděče');

    expect(result).toHaveLength(2);
    expect(result.every(z => z.kategorie === 'Rozvaděče')).toBe(true);
  });

  it('getByZavaznost should filter by severity', async () => {
    mockFetchOk(mockKatalog);

    const result = await zavadaKatalogService.getByZavaznost('C2');

    expect(result).toHaveLength(2);
    expect(result.every(z => z.zavaznost === 'C2')).toBe(true);
  });

  it('create should POST and return id', async () => {
    mockFetchOk({ id: 5 });

    const id = await zavadaKatalogService.create({
      popis: 'Nová závada',
      zavaznost: 'C1',
      kategorie: 'Vedení',
    } as any);

    expect(id).toBe(5);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/zavady-katalog'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('getKategorie should return unique categories', async () => {
    mockFetchOk(mockKatalog);

    const categories = await zavadaKatalogService.getKategorie();

    expect(categories).toContain('Rozvaděče');
    expect(categories).toContain('Vedení');
    expect(categories).toContain('Dokumentace');
    expect(categories).toHaveLength(3);
  });

  it('getDefaultZavady should return non-empty array', () => {
    const defaults = zavadaKatalogService.getDefaultZavady();

    expect(defaults.length).toBeGreaterThan(0);
    defaults.forEach(d => {
      expect(d.popis).toBeTruthy();
      expect(['C1', 'C2', 'C3']).toContain(d.zavaznost);
      expect(d.kategorie).toBeTruthy();
    });
  });

  it('getDefaultZavady should have norma and clanek', () => {
    const defaults = zavadaKatalogService.getDefaultZavady();

    defaults.forEach(d => {
      expect(d.norma).toBeTruthy();
      expect(d.clanek).toBeTruthy();
    });
  });
});
