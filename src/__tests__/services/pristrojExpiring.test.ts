/**
 * Test 11: pristrojService.getExpiring – filtrování přístrojů s končící kalibrací
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.stubEnv('VITE_API_URL', '/api');

import { pristrojService } from '../../services/database';

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

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

describe('pristrojService.getExpiring', () => {
  it('should return pristroje expiring within given days', async () => {
    const pristroje = [
      { id: 1, nazev: 'Fluke', platnostKalibrace: daysFromNow(10) },   // expires in 10 days
      { id: 2, nazev: 'METREL', platnostKalibrace: daysFromNow(60) },  // expires in 60 days
      { id: 3, nazev: 'Chauvin', platnostKalibrace: daysFromNow(25) }, // expires in 25 days
    ];
    mockFetchOk(pristroje);

    const result = await pristrojService.getExpiring(30);

    // Only instruments expiring within 30 days: Fluke (10d) and Chauvin (25d)
    expect(result).toHaveLength(2);
    expect(result.map((p: any) => p.nazev)).toContain('Fluke');
    expect(result.map((p: any) => p.nazev)).toContain('Chauvin');
  });

  it('should return empty array when nothing expiring', async () => {
    const pristroje = [
      { id: 1, nazev: 'Fluke', platnostKalibrace: daysFromNow(365) },
    ];
    mockFetchOk(pristroje);

    const result = await pristrojService.getExpiring(30);

    expect(result).toHaveLength(0);
  });

  it('should include already expired pristroje', async () => {
    const pristroje = [
      { id: 1, nazev: 'Expired', platnostKalibrace: daysFromNow(-10) },  // expired 10 days ago
      { id: 2, nazev: 'Valid', platnostKalibrace: daysFromNow(365) },
    ];
    mockFetchOk(pristroje);

    const result = await pristrojService.getExpiring(30);

    expect(result).toHaveLength(1);
    expect(result[0].nazev).toBe('Expired');
  });

  it('should default to 30 days', async () => {
    const pristroje = [
      { id: 1, nazev: 'Soon', platnostKalibrace: daysFromNow(15) },
      { id: 2, nazev: 'Far', platnostKalibrace: daysFromNow(60) },
    ];
    mockFetchOk(pristroje);

    const result = await pristrojService.getExpiring();

    expect(result).toHaveLength(1);
    expect(result[0].nazev).toBe('Soon');
  });

  it('should create new pristroj', async () => {
    mockFetchOk({ id: 99 });

    const id = await pristrojService.create({
      nazev: 'Nový přístroj',
      vyrobce: 'TestVyrobce',
      model: 'Model-X',
      vyrobniCislo: 'SN-001',
      typPristroje: 'multimetr',
      datumKalibrace: '2025-01-01',
      platnostKalibrace: '2026-01-01',
    } as any);

    expect(id).toBe(99);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/pristroje'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('should delete pristroj', async () => {
    mockFetchOk({ success: true });

    await pristrojService.delete(5);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/pristroje/5'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
