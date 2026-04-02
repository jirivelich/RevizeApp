/**
 * Testy offline funkčnosti pro všechny service metody v database.ts
 *
 * Ověřuje, že služby správně:
 * 1. Vrací data z Dexie cache, když je navigator.onLine === false
 * 2. Ukládají data optimisticky do Dexie při offline create/update
 * 3. Řadí požadavky do fronty přes safeApiRequest při offline
 * 4. Fallback na cache, když online fetch selže (try/catch)
 * 5. Mazání z cache při delete
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db';

vi.stubEnv('VITE_API_URL', '/api');

// Mock safeApiRequest — ověříme, že se volá při offline zápisech
vi.mock('../../services/safeApiRequest', () => ({
  safeApiRequest: vi.fn().mockResolvedValue(undefined),
}));

import { safeApiRequest } from '../../services/safeApiRequest';
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
  revizePristrojService,
  nastaveniService,
  zavadaKatalogService,
  predvolenyTextService,
  zakazniciService,
} from '../../services/database';

// ── Helpers ─────────────────────────────────────────

function setOffline() {
  Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
}

function setOnline() {
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
}

function mockFetchReject() {
  (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
}

function mockFetchOk(data: unknown) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  });
}

// ── Setup ───────────────────────────────────────────

beforeEach(async () => {
  vi.restoreAllMocks();
  global.fetch = vi.fn();
  localStorage.clear();
  localStorage.setItem('token', 'test-token');

  // Vyčistit všechny Dexie tabulky
  await Promise.all([
    db.revizeCache.clear(),
    db.rozvadecCache.clear(),
    db.okruhCache.clear(),
    db.mistnostCache.clear(),
    db.zarizeniCache.clear(),
    db.zavadaCache.clear(),
    db.firmaCache.clear(),
    db.zakazkaCache.clear(),
    db.pristrojCache.clear(),
    db.zakaznikCache.clear(),
    db.nastaveniCache.clear(),
    db.zavadaKatalogCache.clear(),
    db.predvolenyTextCache.clear(),
    db.pendingRequests.clear(),
  ]);
});

afterEach(() => {
  setOnline();
});

// ═══════════════════════════════════════════
// REVIZE SERVICE - OFFLINE
// ═══════════════════════════════════════════

describe('revizeService – offline', () => {
  const revize1 = { id: 1, cisloRevize: 'R-001', nazev: 'Revize 1', datum: '2026-01-01', kategorieRevize: 'elektro' as const, adresa: 'Test', objednatel: 'Klient', termin: 36, typRevize: 'pravidelná' as const, stav: 'rozpracováno' as const, createdAt: new Date(), updatedAt: new Date() };
  const revize2 = { id: 2, cisloRevize: 'R-002', nazev: 'Revize 2', datum: '2026-02-01', kategorieRevize: 'elektro' as const, adresa: 'Test2', objednatel: 'Klient2', termin: 36, typRevize: 'pravidelná' as const, stav: 'rozpracováno' as const, createdAt: new Date(), updatedAt: new Date() };

  it('getAll – vrátí data z cache', async () => {
    await db.revizeCache.bulkPut([
      { id: 1, data: revize1, updatedAt: Date.now() },
      { id: 2, data: revize2, updatedAt: Date.now() },
    ]);
    setOffline();

    const result = await revizeService.getAll();

    expect(result).toHaveLength(2);
    expect(result[0].cisloRevize).toBe('R-001');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('getById – vrátí data z cache', async () => {
    await db.revizeCache.put({ id: 1, data: revize1, updatedAt: Date.now() });
    setOffline();

    const result = await revizeService.getById(1);

    expect(result?.cisloRevize).toBe('R-001');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('getById – vrátí undefined pro neexistující ID', async () => {
    setOffline();

    const result = await revizeService.getById(999);

    expect(result).toBeUndefined();
  });

  it('create – uloží do cache s dočasným záporným ID', async () => {
    setOffline();

    const id = await revizeService.create({
      cisloRevize: 'R-NEW', nazev: 'Nová', adresa: 'A', objednatel: 'O',
      kategorieRevize: 'elektro', datum: '2026-01-01', termin: 36,
      typRevize: 'pravidelná', stav: 'rozpracováno',
    } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.revizeCache.get(id);
    expect(cached).toBeDefined();
    expect(cached!.data.cisloRevize).toBe('R-NEW');
    expect(safeApiRequest).toHaveBeenCalled();
  });

  it('update – optimisticky aktualizuje cache', async () => {
    await db.revizeCache.put({ id: 1, data: revize1, updatedAt: Date.now() });
    setOffline();

    await revizeService.update(1, { nazev: 'Aktualizováno' });

    const cached = await db.revizeCache.get(1);
    expect(cached!.data.nazev).toBe('Aktualizováno');
    expect(cached!.data.cisloRevize).toBe('R-001'); // Ostatní data zachována
    expect(safeApiRequest).toHaveBeenCalled();
  });

  it('delete – smaže z cache', async () => {
    await db.revizeCache.put({ id: 1, data: revize1, updatedAt: Date.now() });
    setOffline();

    await revizeService.delete(1);

    const cached = await db.revizeCache.get(1);
    expect(cached).toBeUndefined();
    expect(safeApiRequest).toHaveBeenCalled();
  });

  it('getAll – online fetch fail → fallback na cache', async () => {
    await db.revizeCache.put({ id: 1, data: revize1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await revizeService.getAll();

    expect(result).toHaveLength(1);
    expect(result[0].cisloRevize).toBe('R-001');
  });

  it('getById – online fetch fail → fallback na cache', async () => {
    await db.revizeCache.put({ id: 1, data: revize1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await revizeService.getById(1);

    expect(result?.cisloRevize).toBe('R-001');
  });

  it('getAll – online success → cachuje do Dexie', async () => {
    setOnline();
    mockFetchOk([revize1, revize2]);

    await revizeService.getAll();

    const cached = await db.revizeCache.toArray();
    expect(cached).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════
// ROZVADEC SERVICE - OFFLINE
// ═══════════════════════════════════════════

describe('rozvadecService – offline', () => {
  const roz1 = { id: 10, revizeId: 1, nazev: 'RE1', oznaceni: 'R1', umisteni: '1NP', typRozvadece: 'hlavní', stupenKryti: 'IP40', createdAt: new Date(), updatedAt: new Date() };
  const roz2 = { id: 11, revizeId: 1, nazev: 'RE2', oznaceni: 'R2', umisteni: '2NP', typRozvadece: 'podružný', stupenKryti: 'IP20', createdAt: new Date(), updatedAt: new Date() };
  const roz3 = { id: 12, revizeId: 2, nazev: 'RE3', oznaceni: 'R3', umisteni: '1NP', typRozvadece: 'hlavní', stupenKryti: 'IP40', createdAt: new Date(), updatedAt: new Date() };

  it('getByRevize – vrátí rozvaděče z cache filtrované podle revizeId', async () => {
    await db.rozvadecCache.bulkPut([
      { id: 10, data: roz1, updatedAt: Date.now() },
      { id: 11, data: roz2, updatedAt: Date.now() },
      { id: 12, data: roz3, updatedAt: Date.now() },
    ]);
    setOffline();

    const result = await rozvadecService.getByRevize(1);

    expect(result).toHaveLength(2);
    expect(result.map(r => r.nazev)).toEqual(['RE1', 'RE2']);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('create – uloží do cache offline', async () => {
    setOffline();

    const id = await rozvadecService.create({
      revizeId: 1, nazev: 'NOVÝ', oznaceni: 'X', umisteni: 'sklep',
      typRozvadece: 'hlavní', stupenKryti: 'IP40',
    } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.rozvadecCache.get(id);
    expect(cached!.data.nazev).toBe('NOVÝ');
  });

  it('update – optimisticky aktualizuje cache', async () => {
    await db.rozvadecCache.put({ id: 10, data: roz1, updatedAt: Date.now() });
    setOffline();

    await rozvadecService.update(10, { nazev: 'Upravený' });

    const cached = await db.rozvadecCache.get(10);
    expect(cached!.data.nazev).toBe('Upravený');
    expect(cached!.data.oznaceni).toBe('R1');
  });

  it('delete – smaže z cache', async () => {
    await db.rozvadecCache.put({ id: 10, data: roz1, updatedAt: Date.now() });
    setOffline();

    await rozvadecService.delete(10);

    expect(await db.rozvadecCache.get(10)).toBeUndefined();
  });

  it('getByRevize – online fetch fail → fallback na cache', async () => {
    await db.rozvadecCache.put({ id: 10, data: roz1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await rozvadecService.getByRevize(1);

    expect(result).toHaveLength(1);
    expect(result[0].nazev).toBe('RE1');
  });
});

// ═══════════════════════════════════════════
// OKRUH SERVICE - OFFLINE
// ═══════════════════════════════════════════

describe('okruhService – offline', () => {
  const okruh1 = { id: 20, rozvadecId: 10, cislo: 1, nazev: 'Zásuvky', jisticTyp: 'B', jisticProud: '16A', pocetFazi: 1, vodic: '3x2,5' };
  const okruh2 = { id: 21, rozvadecId: 10, cislo: 2, nazev: 'Světla', jisticTyp: 'B', jisticProud: '10A', pocetFazi: 1, vodic: '3x1,5' };
  const okruh3 = { id: 22, rozvadecId: 11, cislo: 1, nazev: 'Jiný', jisticTyp: 'C', jisticProud: '20A', pocetFazi: 3, vodic: '5x4' };

  it('getByRozvadec – vrátí okruhy z cache filtrované podle rozvadecId', async () => {
    await db.okruhCache.bulkPut([
      { id: 20, data: okruh1, updatedAt: Date.now() },
      { id: 21, data: okruh2, updatedAt: Date.now() },
      { id: 22, data: okruh3, updatedAt: Date.now() },
    ]);
    setOffline();

    const result = await okruhService.getByRozvadec(10);

    expect(result).toHaveLength(2);
    expect(result.map(o => o.nazev)).toEqual(['Zásuvky', 'Světla']);
  });

  it('create – uloží do cache s tempId', async () => {
    setOffline();

    const id = await okruhService.create({
      rozvadecId: 10, cislo: 3, nazev: 'Nový okruh',
      jisticTyp: 'B', jisticProud: '16A', pocetFazi: 1, vodic: '3x2,5',
    } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.okruhCache.get(id);
    expect(cached!.data.nazev).toBe('Nový okruh');
  });

  it('update – optimisticky aktualizuje cache', async () => {
    await db.okruhCache.put({ id: 20, data: okruh1, updatedAt: Date.now() });
    setOffline();

    await okruhService.update(20, { nazev: 'Změněno' });

    const cached = await db.okruhCache.get(20);
    expect(cached!.data.nazev).toBe('Změněno');
    expect(cached!.data.jisticTyp).toBe('B');
  });

  it('delete – smaže z cache', async () => {
    await db.okruhCache.put({ id: 20, data: okruh1, updatedAt: Date.now() });
    setOffline();

    await okruhService.delete(20);

    expect(await db.okruhCache.get(20)).toBeUndefined();
  });

  it('getByRozvadec – online fetch fail → fallback', async () => {
    await db.okruhCache.put({ id: 20, data: okruh1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await okruhService.getByRozvadec(10);

    expect(result).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════
// MISTNOST SERVICE - OFFLINE
// ═══════════════════════════════════════════

describe('mistnostService – offline', () => {
  const mist1 = { id: 30, revizeId: 1, nazev: 'Obývák', patro: '1NP', typ: 'obytný prostor', prostredi: 'normální' };
  const mist2 = { id: 31, revizeId: 1, nazev: 'Kuchyně', patro: '1NP', typ: 'obytný prostor', prostredi: 'normální' };
  const mist3 = { id: 32, revizeId: 2, nazev: 'Koupelna', patro: '2NP', typ: 'mokrý prostor', prostredi: 'vlhko' };

  it('getByRevize – vrátí místnosti z cache filtrované podle revizeId', async () => {
    await db.mistnostCache.bulkPut([
      { id: 30, data: mist1, updatedAt: Date.now() },
      { id: 31, data: mist2, updatedAt: Date.now() },
      { id: 32, data: mist3, updatedAt: Date.now() },
    ]);
    setOffline();

    const result = await mistnostService.getByRevize(1);

    expect(result).toHaveLength(2);
    expect(result.map(m => m.nazev)).toEqual(['Obývák', 'Kuchyně']);
  });

  it('create – uloží do cache offline', async () => {
    setOffline();

    const id = await mistnostService.create({
      revizeId: 1, nazev: 'Nová místnost', typ: 'obytný prostor', prostredi: 'normální',
    } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.mistnostCache.get(id);
    expect(cached!.data.nazev).toBe('Nová místnost');
  });

  it('update – optimisticky aktualizuje cache', async () => {
    await db.mistnostCache.put({ id: 30, data: mist1, updatedAt: Date.now() });
    setOffline();

    await mistnostService.update(30, { nazev: 'Přejmenováno' });

    const cached = await db.mistnostCache.get(30);
    expect(cached!.data.nazev).toBe('Přejmenováno');
    expect(cached!.data.patro).toBe('1NP');
  });

  it('delete – smaže z cache', async () => {
    await db.mistnostCache.put({ id: 30, data: mist1, updatedAt: Date.now() });
    setOffline();

    await mistnostService.delete(30);

    expect(await db.mistnostCache.get(30)).toBeUndefined();
  });

  it('getByRevize – online fetch fail → fallback', async () => {
    await db.mistnostCache.put({ id: 30, data: mist1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await mistnostService.getByRevize(1);

    expect(result).toHaveLength(1);
    expect(result[0].nazev).toBe('Obývák');
  });
});

// ═══════════════════════════════════════════
// ZARIZENI SERVICE - OFFLINE
// ═══════════════════════════════════════════

describe('zarizeniService – offline', () => {
  const zar1 = { id: 40, mistnostId: 30, nazev: 'Pračka', pocetKs: 1, trida: 'I' as const, stav: 'OK' as const };
  const zar2 = { id: 41, mistnostId: 30, nazev: 'Lednice', pocetKs: 1, trida: 'I' as const, stav: 'OK' as const };
  const zar3 = { id: 42, mistnostId: 31, nazev: 'Myčka', pocetKs: 1, trida: 'II' as const, stav: 'OK' as const };

  it('getByMistnost – vrátí zařízení z cache filtrované podle mistnostId', async () => {
    await db.zarizeniCache.bulkPut([
      { id: 40, data: zar1, updatedAt: Date.now() },
      { id: 41, data: zar2, updatedAt: Date.now() },
      { id: 42, data: zar3, updatedAt: Date.now() },
    ]);
    setOffline();

    const result = await zarizeniService.getByMistnost(30);

    expect(result).toHaveLength(2);
    expect(result.map(z => z.nazev)).toEqual(['Pračka', 'Lednice']);
  });

  it('create – uloží do cache offline', async () => {
    setOffline();

    const id = await zarizeniService.create({
      mistnostId: 30, nazev: 'Nový spotřebič', pocetKs: 1, trida: 'I', stav: 'nekontrolováno',
    } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.zarizeniCache.get(id);
    expect(cached!.data.nazev).toBe('Nový spotřebič');
  });

  it('update – optimisticky aktualizuje cache', async () => {
    await db.zarizeniCache.put({ id: 40, data: zar1, updatedAt: Date.now() });
    setOffline();

    await zarizeniService.update(40, { stav: 'závada' });

    const cached = await db.zarizeniCache.get(40);
    expect(cached!.data.stav).toBe('závada');
    expect(cached!.data.nazev).toBe('Pračka');
  });

  it('delete – smaže z cache', async () => {
    await db.zarizeniCache.put({ id: 40, data: zar1, updatedAt: Date.now() });
    setOffline();

    await zarizeniService.delete(40);

    expect(await db.zarizeniCache.get(40)).toBeUndefined();
  });

  it('getByMistnost – online fetch fail → fallback', async () => {
    await db.zarizeniCache.put({ id: 40, data: zar1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await zarizeniService.getByMistnost(30);

    expect(result).toHaveLength(1);
    expect(result[0].nazev).toBe('Pračka');
  });
});

// ═══════════════════════════════════════════
// ZAVADA SERVICE - OFFLINE
// ═══════════════════════════════════════════

describe('zavadaService – offline', () => {
  const zav1 = { id: 50, revizeId: 1, popis: 'Chybí kryt', zavaznost: 'C2' as const, stav: 'otevřená' as const, fotky: [], datumZjisteni: new Date() };
  const zav2 = { id: 51, revizeId: 2, popis: 'Poškozený kabel', zavaznost: 'C1' as const, stav: 'otevřená' as const, fotky: [], datumZjisteni: new Date() };

  it('getByRevize – vrátí závady z cache filtrované', async () => {
    await db.zavadaCache.bulkPut([
      { id: 50, data: zav1, updatedAt: Date.now() },
      { id: 51, data: zav2, updatedAt: Date.now() },
    ]);
    setOffline();

    const result = await zavadaService.getByRevize(1);

    expect(result).toHaveLength(1);
    expect(result[0].popis).toBe('Chybí kryt');
  });

  it('create – uloží do cache offline', async () => {
    setOffline();

    const id = await zavadaService.create({
      revizeId: 1, popis: 'Nová závada', zavaznost: 'C3', stav: 'otevřená',
      fotky: [], datumZjisteni: new Date(),
    } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.zavadaCache.get(id);
    expect(cached!.data.popis).toBe('Nová závada');
  });

  it('update – optimisticky aktualizuje cache', async () => {
    await db.zavadaCache.put({ id: 50, data: zav1, updatedAt: Date.now() });
    setOffline();

    await zavadaService.update(50, { stav: 'vyřešená' });

    const cached = await db.zavadaCache.get(50);
    expect(cached!.data.stav).toBe('vyřešená');
    expect(cached!.data.popis).toBe('Chybí kryt');
  });

  it('delete – smaže z cache', async () => {
    await db.zavadaCache.put({ id: 50, data: zav1, updatedAt: Date.now() });
    setOffline();

    await zavadaService.delete(50);

    expect(await db.zavadaCache.get(50)).toBeUndefined();
  });

  it('getByRevize – online fetch fail → fallback', async () => {
    await db.zavadaCache.put({ id: 50, data: zav1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await zavadaService.getByRevize(1);

    expect(result).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════
// FIRMA SERVICE - OFFLINE
// ═══════════════════════════════════════════

describe('firmaService – offline', () => {
  const firma1 = { id: 60, nazev: 'ACME s.r.o.', adresa: 'Praha 1', ico: '12345678', createdAt: new Date(), updatedAt: new Date() };
  const firma2 = { id: 61, nazev: 'Beta a.s.', adresa: 'Brno', ico: '87654321', createdAt: new Date(), updatedAt: new Date() };

  it('getAll – vrátí firmy z cache', async () => {
    await db.firmaCache.bulkPut([
      { id: 60, data: firma1, updatedAt: Date.now() },
      { id: 61, data: firma2, updatedAt: Date.now() },
    ]);
    setOffline();

    const result = await firmaService.getAll();

    expect(result).toHaveLength(2);
    expect(result[0].nazev).toBe('ACME s.r.o.');
  });

  it('getById – vrátí firmu z cache', async () => {
    await db.firmaCache.put({ id: 60, data: firma1, updatedAt: Date.now() });
    setOffline();

    const result = await firmaService.getById(60);

    expect(result?.nazev).toBe('ACME s.r.o.');
  });

  it('getById – vrátí undefined pro neexistující', async () => {
    setOffline();

    const result = await firmaService.getById(999);

    expect(result).toBeUndefined();
  });

  it('create – uloží do cache offline', async () => {
    setOffline();

    const id = await firmaService.create({ nazev: 'Nová firma', adresa: 'Ostrava' } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.firmaCache.get(id);
    expect(cached!.data.nazev).toBe('Nová firma');
  });

  it('update – optimisticky aktualizuje cache', async () => {
    await db.firmaCache.put({ id: 60, data: firma1, updatedAt: Date.now() });
    setOffline();

    await firmaService.update(60, { nazev: 'ACME Updated' });

    const cached = await db.firmaCache.get(60);
    expect(cached!.data.nazev).toBe('ACME Updated');
    expect(cached!.data.ico).toBe('12345678');
  });

  it('delete – smaže z cache', async () => {
    await db.firmaCache.put({ id: 60, data: firma1, updatedAt: Date.now() });
    setOffline();

    await firmaService.delete(60);

    expect(await db.firmaCache.get(60)).toBeUndefined();
  });

  it('getAll – online fetch fail → fallback', async () => {
    await db.firmaCache.put({ id: 60, data: firma1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await firmaService.getAll();

    expect(result).toHaveLength(1);
  });

  it('getById – online fetch fail → fallback', async () => {
    await db.firmaCache.put({ id: 60, data: firma1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await firmaService.getById(60);

    expect(result?.nazev).toBe('ACME s.r.o.');
  });
});

// ═══════════════════════════════════════════
// ZAKAZKA SERVICE - OFFLINE
// ═══════════════════════════════════════════

describe('zakazkaService – offline', () => {
  const zak1 = { id: 70, nazev: 'Zakázka 1', klient: 'ACME', adresa: 'Praha', datumPlanovany: '2026-03-01', stav: 'plánováno' as const, priorita: 'střední' as const, createdAt: new Date(), updatedAt: new Date() };

  it('getAll – vrátí z cache', async () => {
    await db.zakazkaCache.put({ id: 70, data: zak1, updatedAt: Date.now() });
    setOffline();

    const result = await zakazkaService.getAll();

    expect(result).toHaveLength(1);
    expect(result[0].nazev).toBe('Zakázka 1');
  });

  it('getById – deleguje na getAll, vrátí z cache', async () => {
    await db.zakazkaCache.put({ id: 70, data: zak1, updatedAt: Date.now() });
    setOffline();

    const result = await zakazkaService.getById(70);

    expect(result?.nazev).toBe('Zakázka 1');
  });

  it('create – uloží do cache offline', async () => {
    setOffline();

    const id = await zakazkaService.create({
      nazev: 'Nová zakázka', klient: 'Test', adresa: 'Brno',
      datumPlanovany: '2026-04-01', stav: 'plánováno', priorita: 'nizká',
    } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.zakazkaCache.get(id);
    expect(cached!.data.nazev).toBe('Nová zakázka');
  });

  it('update – optimisticky aktualizuje cache', async () => {
    await db.zakazkaCache.put({ id: 70, data: zak1, updatedAt: Date.now() });
    setOffline();

    await zakazkaService.update(70, { stav: 'v realizaci' });

    const cached = await db.zakazkaCache.get(70);
    expect(cached!.data.stav).toBe('v realizaci');
  });

  it('delete – smaže z cache', async () => {
    await db.zakazkaCache.put({ id: 70, data: zak1, updatedAt: Date.now() });
    setOffline();

    await zakazkaService.delete(70);

    expect(await db.zakazkaCache.get(70)).toBeUndefined();
  });

  it('getAll – online fetch fail → fallback', async () => {
    await db.zakazkaCache.put({ id: 70, data: zak1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await zakazkaService.getAll();

    expect(result).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════
// PRISTROJ SERVICE - OFFLINE
// ═══════════════════════════════════════════

describe('pristrojService – offline', () => {
  const pristroj1 = { id: 80, nazev: 'Multimetr', vyrobce: 'Fluke', model: '175', vyrobniCislo: 'SN001', typPristroje: 'multimetr' as const, datumKalibrace: '2025-01-01', platnostKalibrace: '2026-01-01', createdAt: new Date(), updatedAt: new Date() };
  const pristroj2 = { id: 81, nazev: 'Meger', vyrobce: 'Sonel', model: 'MIC-2510', vyrobniCislo: 'SN002', typPristroje: 'meger' as const, datumKalibrace: '2025-06-01', platnostKalibrace: '2026-06-01', createdAt: new Date(), updatedAt: new Date() };

  it('getAll – vrátí z cache', async () => {
    await db.pristrojCache.bulkPut([
      { id: 80, data: pristroj1, updatedAt: Date.now() },
      { id: 81, data: pristroj2, updatedAt: Date.now() },
    ]);
    setOffline();

    const result = await pristrojService.getAll();

    expect(result).toHaveLength(2);
    expect(result[0].nazev).toBe('Multimetr');
  });

  it('getById – vrátí z cache', async () => {
    await db.pristrojCache.put({ id: 80, data: pristroj1, updatedAt: Date.now() });
    setOffline();

    const result = await pristrojService.getById(80);

    expect(result?.nazev).toBe('Multimetr');
  });

  it('getExpiring – funguje offline (deleguje na getAll)', async () => {
    await db.pristrojCache.put({ id: 80, data: pristroj1, updatedAt: Date.now() });
    setOffline();

    const result = await pristrojService.getExpiring(365);

    expect(result).toHaveLength(1);
  });

  it('create – uloží do cache offline', async () => {
    setOffline();

    const id = await pristrojService.create({
      nazev: 'Nový', vyrobce: 'Test', model: 'M1',
      vyrobniCislo: 'SN999', typPristroje: 'multimetr',
      datumKalibrace: '2026-01-01', platnostKalibrace: '2027-01-01',
    } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.pristrojCache.get(id);
    expect(cached!.data.nazev).toBe('Nový');
  });

  it('update – optimisticky aktualizuje cache', async () => {
    await db.pristrojCache.put({ id: 80, data: pristroj1, updatedAt: Date.now() });
    setOffline();

    await pristrojService.update(80, { nazev: 'Upravený multimetr' });

    const cached = await db.pristrojCache.get(80);
    expect(cached!.data.nazev).toBe('Upravený multimetr');
    expect(cached!.data.vyrobce).toBe('Fluke');
  });

  it('delete – smaže z cache', async () => {
    await db.pristrojCache.put({ id: 80, data: pristroj1, updatedAt: Date.now() });
    setOffline();

    await pristrojService.delete(80);

    expect(await db.pristrojCache.get(80)).toBeUndefined();
  });

  it('getAll – online fetch fail → fallback', async () => {
    await db.pristrojCache.put({ id: 80, data: pristroj1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await pristrojService.getAll();

    expect(result).toHaveLength(1);
  });

  it('getById – online fetch fail → fallback', async () => {
    await db.pristrojCache.put({ id: 80, data: pristroj1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await pristrojService.getById(80);

    expect(result?.nazev).toBe('Multimetr');
  });
});

// ═══════════════════════════════════════════
// REVIZE-PRISTROJ SERVICE - OFFLINE
// ═══════════════════════════════════════════

describe('revizePristrojService – offline', () => {
  const pristroj1 = { id: 80, nazev: 'Multimetr', vyrobce: 'Fluke', model: '175', vyrobniCislo: 'SN001', typPristroje: 'multimetr' as const, datumKalibrace: '2025-01-01', platnostKalibrace: '2026-01-01', createdAt: new Date(), updatedAt: new Date() };

  it('getByRevize – vrátí přístroje z pristrojCache offline', async () => {
    await db.pristrojCache.put({ id: 80, data: pristroj1, updatedAt: Date.now() });
    setOffline();

    const result = await revizePristrojService.getByRevize(1);

    expect(result).toHaveLength(1);
    expect(result[0].nazev).toBe('Multimetr');
  });

  it('addToRevize – offline zařadí do fronty', async () => {
    setOffline();

    const id = await revizePristrojService.addToRevize(1, 80);

    expect(id).toBeLessThan(0);
    expect(safeApiRequest).toHaveBeenCalled();
  });

  it('removeFromRevize – offline zařadí do fronty', async () => {
    setOffline();

    await revizePristrojService.removeFromRevize(1, 80);

    expect(safeApiRequest).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════
// NASTAVENI SERVICE - OFFLINE
// ═══════════════════════════════════════════

describe('nastaveniService – offline', () => {
  const nastaveni = { id: 1, firmaJmeno: 'RevizeFirma', firmaAdresa: 'Praha', firmaIco: '11111111', reviznniTechnikJmeno: 'Jan Novák', reviznniTechnikCisloOpravneni: 'EL-001' };

  it('get – vrátí nastavení z cache', async () => {
    await db.nastaveniCache.put({ id: 1, data: nastaveni, updatedAt: Date.now() });
    setOffline();

    const result = await nastaveniService.get();

    expect(result?.firmaJmeno).toBe('RevizeFirma');
  });

  it('get – vrátí undefined pokud cache prázdná', async () => {
    setOffline();

    const result = await nastaveniService.get();

    expect(result).toBeUndefined();
  });

  it('save – optimisticky aktualizuje cache', async () => {
    await db.nastaveniCache.put({ id: 1, data: nastaveni, updatedAt: Date.now() });
    setOffline();

    await nastaveniService.save({ firmaJmeno: 'Nový název' });

    const cached = await db.nastaveniCache.get(1);
    expect(cached!.data.firmaJmeno).toBe('Nový název');
    expect(cached!.data.firmaAdresa).toBe('Praha');
    expect(safeApiRequest).toHaveBeenCalled();
  });

  it('save – vytvoří cache pokud neexistuje', async () => {
    setOffline();

    await nastaveniService.save({ firmaJmeno: 'Úplně nová' });

    const cached = await db.nastaveniCache.get(1);
    expect(cached!.data.firmaJmeno).toBe('Úplně nová');
  });

  it('get – online fetch fail → fallback', async () => {
    await db.nastaveniCache.put({ id: 1, data: nastaveni, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await nastaveniService.get();

    expect(result?.firmaJmeno).toBe('RevizeFirma');
  });
});

// ═══════════════════════════════════════════
// ZAVADA KATALOG SERVICE - OFFLINE
// ═══════════════════════════════════════════

describe('zavadaKatalogService – offline', () => {
  const kat1 = { id: 90, popis: 'Chybí ochranný kryt', zavaznost: 'C2' as const, kategorie: 'Rozvaděče', createdAt: new Date(), updatedAt: new Date() };
  const kat2 = { id: 91, popis: 'Poškozená izolace', zavaznost: 'C1' as const, kategorie: 'Vedení', createdAt: new Date(), updatedAt: new Date() };

  it('getAll – vrátí z cache', async () => {
    await db.zavadaKatalogCache.bulkPut([
      { id: 90, data: kat1, updatedAt: Date.now() },
      { id: 91, data: kat2, updatedAt: Date.now() },
    ]);
    setOffline();

    const result = await zavadaKatalogService.getAll();

    expect(result).toHaveLength(2);
  });

  it('getById – funguje offline (deleguje na getAll)', async () => {
    await db.zavadaKatalogCache.put({ id: 90, data: kat1, updatedAt: Date.now() });
    setOffline();

    const result = await zavadaKatalogService.getById(90);

    expect(result?.popis).toBe('Chybí ochranný kryt');
  });

  it('getByKategorie – funguje offline', async () => {
    await db.zavadaKatalogCache.bulkPut([
      { id: 90, data: kat1, updatedAt: Date.now() },
      { id: 91, data: kat2, updatedAt: Date.now() },
    ]);
    setOffline();

    const result = await zavadaKatalogService.getByKategorie('Rozvaděče');

    expect(result).toHaveLength(1);
    expect(result[0].popis).toBe('Chybí ochranný kryt');
  });

  it('getByZavaznost – funguje offline', async () => {
    await db.zavadaKatalogCache.bulkPut([
      { id: 90, data: kat1, updatedAt: Date.now() },
      { id: 91, data: kat2, updatedAt: Date.now() },
    ]);
    setOffline();

    const result = await zavadaKatalogService.getByZavaznost('C1');

    expect(result).toHaveLength(1);
    expect(result[0].popis).toBe('Poškozená izolace');
  });

  it('create – uloží do cache offline', async () => {
    setOffline();

    const id = await zavadaKatalogService.create({
      popis: 'Nová závada', zavaznost: 'C3',
    } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.zavadaKatalogCache.get(id);
    expect(cached!.data.popis).toBe('Nová závada');
  });

  it('update – optimisticky aktualizuje cache', async () => {
    await db.zavadaKatalogCache.put({ id: 90, data: kat1, updatedAt: Date.now() });
    setOffline();

    await zavadaKatalogService.update(90, { popis: 'Upravený text' });

    const cached = await db.zavadaKatalogCache.get(90);
    expect(cached!.data.popis).toBe('Upravený text');
  });

  it('delete – smaže z cache', async () => {
    await db.zavadaKatalogCache.put({ id: 90, data: kat1, updatedAt: Date.now() });
    setOffline();

    await zavadaKatalogService.delete(90);

    expect(await db.zavadaKatalogCache.get(90)).toBeUndefined();
  });

  it('getAll – online fetch fail → fallback', async () => {
    await db.zavadaKatalogCache.put({ id: 90, data: kat1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await zavadaKatalogService.getAll();

    expect(result).toHaveLength(1);
  });

  it('getDefaultZavady – vrátí statická data vždy', () => {
    const result = zavadaKatalogService.getDefaultZavady();

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].popis).toBeTruthy();
  });
});

// ═══════════════════════════════════════════
// PREDVOLENY TEXT SERVICE - OFFLINE
// ═══════════════════════════════════════════

describe('predvolenyTextService – offline', () => {
  const text1 = { id: 100, pole: 'rozsahRevize', nazev: 'Standardní', text: 'Předmět revize...', poradi: 1 };
  const text2 = { id: 101, pole: 'popisZarizeni', nazev: 'Bytový dům', text: 'Popis...', poradi: 1 };
  const text3 = { id: 102, pole: 'rozsahRevize', nazev: 'Rozšířený', text: 'Rozšířený rozsah...', poradi: 2 };

  it('getAll – vrátí z cache', async () => {
    await db.predvolenyTextCache.bulkPut([
      { id: 100, data: text1, updatedAt: Date.now() },
      { id: 101, data: text2, updatedAt: Date.now() },
    ]);
    setOffline();

    const result = await predvolenyTextService.getAll();

    expect(result).toHaveLength(2);
  });

  it('getByPole – vrátí filtrované z cache', async () => {
    await db.predvolenyTextCache.bulkPut([
      { id: 100, data: text1, updatedAt: Date.now() },
      { id: 101, data: text2, updatedAt: Date.now() },
      { id: 102, data: text3, updatedAt: Date.now() },
    ]);
    setOffline();

    const result = await predvolenyTextService.getByPole('rozsahRevize');

    expect(result).toHaveLength(2);
    expect(result.map(t => t.nazev)).toEqual(['Standardní', 'Rozšířený']);
  });

  it('create – uloží do cache offline', async () => {
    setOffline();

    const id = await predvolenyTextService.create({
      pole: 'podklady', nazev: 'Nový', text: 'Text...',
    });

    expect(id).toBeLessThan(0);
    const cached = await db.predvolenyTextCache.get(id);
    expect(cached!.data.nazev).toBe('Nový');
  });

  it('update – optimisticky aktualizuje cache', async () => {
    await db.predvolenyTextCache.put({ id: 100, data: text1, updatedAt: Date.now() });
    setOffline();

    await predvolenyTextService.update(100, { nazev: 'Přejmenováno', text: 'Nový text', poradi: 5 });

    const cached = await db.predvolenyTextCache.get(100);
    expect(cached!.data.nazev).toBe('Přejmenováno');
    expect(cached!.data.text).toBe('Nový text');
  });

  it('delete – smaže z cache', async () => {
    await db.predvolenyTextCache.put({ id: 100, data: text1, updatedAt: Date.now() });
    setOffline();

    await predvolenyTextService.delete(100);

    expect(await db.predvolenyTextCache.get(100)).toBeUndefined();
  });

  it('getAll – online fetch fail → fallback', async () => {
    await db.predvolenyTextCache.put({ id: 100, data: text1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await predvolenyTextService.getAll();

    expect(result).toHaveLength(1);
  });

  it('getByPole – online fetch fail → fallback', async () => {
    await db.predvolenyTextCache.bulkPut([
      { id: 100, data: text1, updatedAt: Date.now() },
      { id: 101, data: text2, updatedAt: Date.now() },
    ]);
    setOnline();
    mockFetchReject();

    const result = await predvolenyTextService.getByPole('rozsahRevize');

    expect(result).toHaveLength(1);
    expect(result[0].nazev).toBe('Standardní');
  });
});

// ═══════════════════════════════════════════
// ZAKAZNICI SERVICE - OFFLINE
// ═══════════════════════════════════════════

describe('zakazniciService – offline', () => {
  const zak1 = { id: 110, nazev: 'Zákazník A', adresa: 'Praha', ico: '11111111', pocetRevizi: 3, createdAt: new Date(), updatedAt: new Date() };
  const zak2 = { id: 111, nazev: 'Zákazník B', adresa: 'Brno', ico: '22222222', pocetRevizi: 1, createdAt: new Date(), updatedAt: new Date() };

  it('getAll – vrátí z cache', async () => {
    await db.zakaznikCache.bulkPut([
      { id: 110, data: zak1, updatedAt: Date.now() },
      { id: 111, data: zak2, updatedAt: Date.now() },
    ]);
    setOffline();

    const result = await zakazniciService.getAll();

    expect(result).toHaveLength(2);
    expect(result[0].nazev).toBe('Zákazník A');
  });

  it('getById – vrátí z cache', async () => {
    await db.zakaznikCache.put({ id: 110, data: zak1, updatedAt: Date.now() });
    setOffline();

    const result = await zakazniciService.getById(110);

    expect(result?.nazev).toBe('Zákazník A');
  });

  it('getRevize – vrátí revize z revizeCache filtrované podle zakaznikId', async () => {
    const rev = { id: 1, zakaznikId: 110, cisloRevize: 'R-001', nazev: 'Rev', datum: '2026-01-01', kategorieRevize: 'elektro', adresa: 'A', objednatel: 'O', termin: 36, typRevize: 'pravidelná', stav: 'rozpracováno', createdAt: new Date(), updatedAt: new Date() };
    await db.revizeCache.put({ id: 1, data: rev, updatedAt: Date.now() });
    setOffline();

    const result = await zakazniciService.getRevize(110);

    expect(result).toHaveLength(1);
    expect(result[0].cisloRevize).toBe('R-001');
  });

  it('create – uloží do cache offline', async () => {
    setOffline();

    const id = await zakazniciService.create({ nazev: 'Nový zákazník', adresa: 'Ostrava' } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.zakaznikCache.get(id);
    expect(cached!.data.nazev).toBe('Nový zákazník');
    expect(cached!.data.pocetRevizi).toBe(0);
  });

  it('update – optimisticky aktualizuje cache', async () => {
    await db.zakaznikCache.put({ id: 110, data: zak1, updatedAt: Date.now() });
    setOffline();

    await zakazniciService.update(110, { nazev: 'Přejmenovaný' });

    const cached = await db.zakaznikCache.get(110);
    expect(cached!.data.nazev).toBe('Přejmenovaný');
    expect(cached!.data.ico).toBe('11111111');
  });

  it('delete – smaže z cache', async () => {
    await db.zakaznikCache.put({ id: 110, data: zak1, updatedAt: Date.now() });
    setOffline();

    await zakazniciService.delete(110);

    expect(await db.zakaznikCache.get(110)).toBeUndefined();
  });

  it('getAll – online fetch fail → fallback', async () => {
    await db.zakaznikCache.put({ id: 110, data: zak1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await zakazniciService.getAll();

    expect(result).toHaveLength(1);
  });

  it('getById – online fetch fail → fallback', async () => {
    await db.zakaznikCache.put({ id: 110, data: zak1, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await zakazniciService.getById(110);

    expect(result?.nazev).toBe('Zákazník A');
  });

  it('getRevize – online fetch fail → fallback', async () => {
    const rev = { id: 1, zakaznikId: 110, cisloRevize: 'R-001', nazev: 'Rev', datum: '2026-01-01', kategorieRevize: 'elektro', adresa: 'A', objednatel: 'O', termin: 36, typRevize: 'pravidelná', stav: 'rozpracováno', createdAt: new Date(), updatedAt: new Date() };
    await db.revizeCache.put({ id: 1, data: rev, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await zakazniciService.getRevize(110);

    expect(result).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════
// NETWORK ERROR WHILE ONLINE (DNS fail apod.)
// Ověří, že create/update fungují i s navigator.onLine=true
// ale fetch vyhodí Error (ERR_NAME_NOT_RESOLVED apod.)
// ═══════════════════════════════════════════

describe('revizeService – online network error fallback', () => {
  it('create – fetch selže → vrátí záporný tempId a uloží do cache', async () => {
    setOnline();
    mockFetchReject();

    const id = await revizeService.create({ cisloRevize: 'R-NET', nazev: 'Net', datum: '2026-01-01', kategorieRevize: 'elektro', adresa: 'A', objednatel: 'O', termin: 36, typRevize: 'pravidelná', stav: 'rozpracováno' } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.revizeCache.get(id);
    expect(cached).toBeDefined();
    expect(cached!.data.cisloRevize).toBe('R-NET');
  });

  it('update – fetch selže → aktualizuje cache a vrátí 1', async () => {
    await db.revizeCache.put({ id: 5, data: { id: 5, cisloRevize: 'R-005' } as any, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await revizeService.update(5, { nazev: 'Updated' });

    expect(result).toBe(1);
    const cached = await db.revizeCache.get(5);
    expect(cached!.data.nazev).toBe('Updated');
  });
});

describe('rozvadecService – online network error fallback', () => {
  it('create – fetch selže → vrátí záporný tempId a uloží do cache', async () => {
    setOnline();
    mockFetchReject();

    const id = await rozvadecService.create({ revizeId: 1, nazev: 'R-Net', oznaceni: 'RX' } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.rozvadecCache.get(id);
    expect(cached).toBeDefined();
    expect(cached!.data.nazev).toBe('R-Net');
  });

  it('update – fetch selže → aktualizuje cache a vrátí 1', async () => {
    await db.rozvadecCache.put({ id: 10, data: { id: 10, revizeId: 1, nazev: 'Old' } as any, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await rozvadecService.update(10, { nazev: 'New' });

    expect(result).toBe(1);
    const cached = await db.rozvadecCache.get(10);
    expect(cached!.data.nazev).toBe('New');
  });
});

describe('okruhService – online network error fallback', () => {
  it('create – fetch selže → vrátí záporný tempId a uloží do cache', async () => {
    setOnline();
    mockFetchReject();

    const id = await okruhService.create({ rozvadecId: 1, nazev: 'O-Net', cislo: '1' } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.okruhCache.get(id);
    expect(cached).toBeDefined();
    expect(cached!.data.nazev).toBe('O-Net');
  });

  it('update – fetch selže → aktualizuje cache a vrátí 1', async () => {
    await db.okruhCache.put({ id: 20, data: { id: 20, rozvadecId: 1, nazev: 'Old' } as any, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await okruhService.update(20, { nazev: 'New' });

    expect(result).toBe(1);
    const cached = await db.okruhCache.get(20);
    expect(cached!.data.nazev).toBe('New');
  });
});

describe('mistnostService – online network error fallback', () => {
  it('create – fetch selže → vrátí záporný tempId a uloží do cache', async () => {
    setOnline();
    mockFetchReject();

    const id = await mistnostService.create({ revizeId: 1, nazev: 'M-Net' } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.mistnostCache.get(id);
    expect(cached).toBeDefined();
    expect(cached!.data.nazev).toBe('M-Net');
  });

  it('update – fetch selže → aktualizuje cache a vrátí 1', async () => {
    await db.mistnostCache.put({ id: 30, data: { id: 30, revizeId: 1, nazev: 'Old' } as any, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await mistnostService.update(30, { nazev: 'New' });

    expect(result).toBe(1);
    const cached = await db.mistnostCache.get(30);
    expect(cached!.data.nazev).toBe('New');
  });
});

describe('zarizeniService – online network error fallback', () => {
  it('create – fetch selže → vrátí záporný tempId a uloží do cache', async () => {
    setOnline();
    mockFetchReject();

    const id = await zarizeniService.create({ mistnostId: 1, nazev: 'Z-Net' } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.zarizeniCache.get(id);
    expect(cached).toBeDefined();
    expect(cached!.data.nazev).toBe('Z-Net');
  });

  it('update – fetch selže → aktualizuje cache a vrátí 1', async () => {
    await db.zarizeniCache.put({ id: 40, data: { id: 40, mistnostId: 1, nazev: 'Old' } as any, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await zarizeniService.update(40, { nazev: 'New' });

    expect(result).toBe(1);
    const cached = await db.zarizeniCache.get(40);
    expect(cached!.data.nazev).toBe('New');
  });
});

describe('zavadaService – online network error fallback', () => {
  it('create – fetch selže → vrátí záporný tempId a uloží do cache', async () => {
    setOnline();
    mockFetchReject();

    const id = await zavadaService.create({ revizeId: 1, popis: 'Závada-Net' } as any);

    expect(id).toBeLessThan(0);
    const cached = await db.zavadaCache.get(id);
    expect(cached).toBeDefined();
    expect(cached!.data.popis).toBe('Závada-Net');
  });

  it('update – fetch selže → aktualizuje cache a vrátí 1', async () => {
    await db.zavadaCache.put({ id: 50, data: { id: 50, revizeId: 1, popis: 'Old' } as any, updatedAt: Date.now() });
    setOnline();
    mockFetchReject();

    const result = await zavadaService.update(50, { popis: 'New' });

    expect(result).toBe(1);
    const cached = await db.zavadaCache.get(50);
    expect(cached!.data.popis).toBe('New');
  });
});
