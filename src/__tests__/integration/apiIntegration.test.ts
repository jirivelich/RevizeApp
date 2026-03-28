/**
 * Test 20: Integrace – cross-cutting chování celé API vrstvy
 * Ověřuje chování sdílené napříč službami: auth headers, HTTP metody, URL formáty.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.stubEnv('VITE_API_URL', '/api');

import {
  revizeService,
  rozvadecService,
  okruhService,
  zavadaService,
  firmaService,
  zakazkaService,
  pristrojService,
  zakazniciService,
  nastaveniService,
} from '../../services/database';

function mockFetchOk(data: unknown) {
  (global.fetch as Mock).mockResolvedValueOnce({
    ok: true, status: 200, json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn();
  localStorage.clear();
  localStorage.setItem('token', 'integration-token');
});

describe('API Integration – URL patterns', () => {
  const services = [
    { name: 'revize', fn: () => revizeService.getAll(), url: '/revize' },
    { name: 'firmy', fn: () => firmaService.getAll(), url: '/firmy' },
    { name: 'zakazky', fn: () => zakazkaService.getAll(), url: '/zakazky' },
    { name: 'pristroje', fn: () => pristrojService.getAll(), url: '/pristroje' },
    { name: 'zakaznici', fn: () => zakazniciService.getAll(), url: '/zakaznici' },
    { name: 'nastaveni', fn: () => nastaveniService.get(), url: '/nastaveni' },
    { name: 'zavady', fn: () => zavadaService.getAll(), url: '/zavady' },
  ];

  it.each(services)('$name.getAll should call $url', async ({ fn, url }) => {
    mockFetchOk([]);
    await fn();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(url), expect.any(Object));
  });
});

describe('API Integration – Auth headers consistency', () => {
  it('all services should include Bearer token', async () => {
    const calls = [
      () => revizeService.getAll(),
      () => firmaService.getAll(),
      () => zakazkaService.getAll(),
      () => pristrojService.getAll(),
    ];

    for (const callFn of calls) {
      mockFetchOk([]);
      await callFn();
    }

    const fetchMock = global.fetch as Mock;
    for (let i = 0; i < calls.length; i++) {
      const headers = fetchMock.mock.calls[i][1].headers;
      expect(headers['Authorization']).toBe('Bearer integration-token');
      expect(headers['Content-Type']).toBe('application/json');
    }
  });
});

describe('API Integration – CRUD consistency', () => {
  it('create methods should use POST', async () => {
    mockFetchOk({ id: 1 });
    await revizeService.create({ cisloRevize: 'X', nazev: 'Y' } as any);
    expect((global.fetch as Mock).mock.calls[0][1].method).toBe('POST');
  });

  it('update methods should use PUT', async () => {
    mockFetchOk({});
    await revizeService.update(1, { nazev: 'Z' });
    expect((global.fetch as Mock).mock.calls[0][1].method).toBe('PUT');
  });

  it('delete methods should use DELETE', async () => {
    mockFetchOk({});
    await revizeService.delete(1);
    expect((global.fetch as Mock).mock.calls[0][1].method).toBe('DELETE');
  });

  it('update should include body as JSON', async () => {
    mockFetchOk({});
    await firmaService.update(5, { nazev: 'Nová firma' });
    const body = JSON.parse((global.fetch as Mock).mock.calls[0][1].body);
    expect(body.nazev).toBe('Nová firma');
  });
});

describe('API Integration – Parameterized URLs', () => {
  it('rozvadece should include revizeId in URL', async () => {
    mockFetchOk([]);
    await rozvadecService.getByRevize(42);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rozvadece/42'), expect.any(Object));
  });

  it('okruhy should include rozvadecId in URL', async () => {
    mockFetchOk([]);
    await okruhService.getByRozvadec(17);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/okruhy/17'), expect.any(Object));
  });

  it('zavady by revize should use correct URL pattern', async () => {
    mockFetchOk([]);
    await zavadaService.getByRevize(8);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/zavady/revize/8'), expect.any(Object));
  });

  it('zakaznici getRevize should use nested URL', async () => {
    mockFetchOk([]);
    await zakazniciService.getRevize(3);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/zakaznici/3/revize'), expect.any(Object));
  });
});

describe('API Integration – No token behavior', () => {
  it('should not include Authorization header when no token', async () => {
    localStorage.removeItem('token');
    mockFetchOk([]);

    await revizeService.getAll();

    const headers = (global.fetch as Mock).mock.calls[0][1].headers;
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['Content-Type']).toBe('application/json');
  });
});
