/**
 * Testy pro src/services/database.ts
 *
 * Database service je frontend wrapper nad REST API.
 * Mockujeme fetch a ověřujeme správnost volání.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.stubEnv('VITE_API_URL', '/api');

import {
  revizeService,
  rozvadecService,
  okruhService,
  mistnostService,
  zarizeniService,
  zavadaService,
  firmaService,
  zakazkaService,
  pristrojService,
  nastaveniService,
} from '../../services/database';
import { db } from '../../db';

// ── Helpers ─────────────────────────────────────────

function mockFetchOk(data: unknown) {
  (global.fetch as Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  });
}

function mockFetch401() {
  (global.fetch as Mock).mockResolvedValueOnce({
    ok: false,
    status: 401,
    json: () => Promise.resolve({ error: 'Unauthorized' }),
  });
}

function mockFetchServerError(msg = 'Internal Server Error') {
  (global.fetch as Mock).mockResolvedValueOnce({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ error: msg }),
  });
}

// ── Setup ───────────────────────────────────────────

beforeEach(async () => {
  vi.restoreAllMocks();
  global.fetch = vi.fn();
  localStorage.clear();
  localStorage.setItem('token', 'db-test-token');
  // Vyčistit všechny Dexie cache tabulky
  await Promise.all(db.tables.map(t => t.clear()));
});

// ═══════════════════════════════════════════
// REVIZE SERVICE
// ═══════════════════════════════════════════

describe('revizeService', () => {
  it('getAll should return array of revize', async () => {
    const data = [
      { id: 1, cisloRevize: 'R-001', nazev: 'Revize 1' },
      { id: 2, cisloRevize: 'R-002', nazev: 'Revize 2' },
    ];
    mockFetchOk(data);

    const result = await revizeService.getAll();

    expect(result).toHaveLength(2);
    expect(result[0].cisloRevize).toBe('R-001');
  });

  it('getById should return single revize', async () => {
    const data = { id: 1, cisloRevize: 'R-001', nazev: 'Revize 1' };
    mockFetchOk(data);

    const result = await revizeService.getById(1);

    expect(result?.cisloRevize).toBe('R-001');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/revize/1'),
      expect.any(Object),
    );
  });

  it('create should return new id', async () => {
    mockFetchOk({ id: 42 });

    const id = await revizeService.create({
      cisloRevize: 'R-042',
      nazev: 'Nova',
      adresa: 'Test',
      objednatel: 'Klient',
      kategorieRevize: 'elektro',
      datum: '2026-01-01',
      termin: 36,
      typRevize: 'pravidelná',
      stav: 'rozpracováno',
    } as any);

    expect(id).toBe(42);
  });

  it('update should return 1 on success', async () => {
    mockFetchOk({ success: true });

    const result = await revizeService.update(1, { nazev: 'Updated' });

    expect(result).toBe(1);
  });

  it('delete should not throw on success', async () => {
    mockFetchOk({ success: true });

    await expect(revizeService.delete(1)).resolves.toBeUndefined();
  });

  it('should fallback to empty cache on 401', async () => {
    mockFetch401();
    const result = await revizeService.getAll();
    expect(result).toEqual([]);
  });

  it('should fallback to empty cache on server error', async () => {
    mockFetchServerError('DB connection failed');
    const result = await revizeService.getAll();
    expect(result).toEqual([]);
  });
});

// ═══════════════════════════════════════════
// ROZVADEC SERVICE
// ═══════════════════════════════════════════

describe('rozvadecService', () => {
  it('getByRevize should return array', async () => {
    const data = [{ id: 1, nazev: 'RE1', revizeId: 5 }];
    mockFetchOk(data);

    const result = await rozvadecService.getByRevize(5);

    expect(result).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/rozvadece/5'),
      expect.any(Object),
    );
  });

  it('create should return id', async () => {
    mockFetchOk({ id: 10 });

    const id = await rozvadecService.create({
      revizeId: 1,
      nazev: 'RE-NEW',
      oznaceni: 'X',
      umisteni: '1NP',
      typRozvadece: 'hlavní',
      stupenKryti: 'IP40',
    } as any);

    expect(id).toBe(10);
  });
});

// ═══════════════════════════════════════════
// OKRUH SERVICE
// ═══════════════════════════════════════════

describe('okruhService', () => {
  it('getByRozvadec should fetch okruhy', async () => {
    const data = [{ id: 1, cislo: 1, nazev: 'Zásuvky' }];
    mockFetchOk(data);

    const result = await okruhService.getByRozvadec(3);

    expect(result).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/okruhy/3'),
      expect.any(Object),
    );
  });
});

// ═══════════════════════════════════════════
// MÍSTNOST SERVICE
// ═══════════════════════════════════════════

describe('mistnostService', () => {
  it('getByRevize should fetch mistnosti', async () => {
    const data = [{ id: 1, nazev: 'Kuchyně', revizeId: 2 }];
    mockFetchOk(data);

    const result = await mistnostService.getByRevize(2);

    expect(result).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════
// ZARIZENI SERVICE
// ═══════════════════════════════════════════

describe('zarizeniService', () => {
  it('getByMistnost should fetch zarizeni', async () => {
    const data = [{ id: 1, nazev: 'Sporák', mistnostId: 5 }];
    mockFetchOk(data);

    const result = await zarizeniService.getByMistnost(5);

    expect(result).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════
// ZÁVADA SERVICE
// ═══════════════════════════════════════════

describe('zavadaService', () => {
  it('getByRevize should fetch zavady', async () => {
    const data = [{ id: 1, popis: 'Závada A', revizeId: 1 }];
    mockFetchOk(data);

    const result = await zavadaService.getByRevize(1);

    expect(result).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════
// FIRMA SERVICE
// ═══════════════════════════════════════════

describe('firmaService', () => {
  it('getAll should fetch firmy', async () => {
    const data = [{ id: 1, nazev: 'ElektroTech' }];
    mockFetchOk(data);

    const result = await firmaService.getAll();

    expect(result).toHaveLength(1);
    expect(result[0].nazev).toBe('ElektroTech');
  });
});

// ═══════════════════════════════════════════
// ZAKAZKA SERVICE
// ═══════════════════════════════════════════

describe('zakazkaService', () => {
  it('getAll should fetch zakazky', async () => {
    const data = [{ id: 1, nazev: 'Zakázka A' }];
    mockFetchOk(data);

    const result = await zakazkaService.getAll();

    expect(result).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════
// PŘÍSTROJ SERVICE
// ═══════════════════════════════════════════

describe('pristrojService', () => {
  it('getAll should fetch pristroje', async () => {
    const data = [{ id: 1, nazev: 'Fluke 1653', typPristroje: 'multimetr' }];
    mockFetchOk(data);

    const result = await pristrojService.getAll();

    expect(result).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════
// NASTAVENÍ SERVICE
// ═══════════════════════════════════════════

describe('nastaveniService', () => {
  it('get should fetch nastaveni', async () => {
    const data = { firmaJmeno: 'TestFirma' };
    mockFetchOk(data);

    const result = await nastaveniService.get();

    expect(result?.firmaJmeno).toBe('TestFirma');
  });

  it('save should send data via PUT', async () => {
    mockFetchOk({ success: true });

    await nastaveniService.save({ firmaJmeno: 'Updated' } as any);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/nastaveni'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});

// ═══════════════════════════════════════════
// AUTH HEADERS
// ═══════════════════════════════════════════

describe('Auth headers', () => {
  it('should include Bearer token when present', async () => {
    mockFetchOk([]);

    await revizeService.getAll();

    const headers = (global.fetch as Mock).mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer db-test-token');
  });

  it('should not include Authorization when no token', async () => {
    localStorage.removeItem('token');
    mockFetchOk([]);

    await revizeService.getAll();

    const headers = (global.fetch as Mock).mock.calls[0][1].headers;
    expect(headers['Authorization']).toBeUndefined();
  });
});
