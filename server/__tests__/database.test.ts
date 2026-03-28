/**
 * Testy pro server/database.ts – inicializace databáze
 *
 * Testujeme initializeDatabase (CREATE TABLE příkazy),
 * pool konfiguraci a migrace.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pg module
const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
const mockRelease = vi.fn();
const mockConnect = vi.fn().mockResolvedValue({
  query: mockQuery,
  release: mockRelease,
});

vi.mock('pg', () => {
  return {
    default: {
      Pool: vi.fn().mockImplementation(() => ({
        connect: mockConnect,
        query: mockQuery,
      })),
    },
  };
});

// Mock bcryptjs (used in database.ts for default user)
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$10$hashedpassword'),
    compare: vi.fn(),
  },
}));

// Set env before importing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';

describe('database module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export pool object', async () => {
    const { pool } = await import('../database');
    expect(pool).toBeDefined();
    expect(pool.query).toBeDefined();
    expect(pool.connect).toBeDefined();
  });

  it('initializeDatabase should create all required tables', async () => {
    const { initializeDatabase } = await import('../database');

    await initializeDatabase();

    expect(mockConnect).toHaveBeenCalled();
    expect(mockRelease).toHaveBeenCalled();

    // Verify CREATE TABLE statements were called
    const calls = mockQuery.mock.calls.map((c: any[]) => c[0] as string);
    const createTableCalls = calls.filter((sql: string) =>
      typeof sql === 'string' && sql.includes('CREATE TABLE'),
    );

    // Should have tables: users, zakaznik, revize, rozvadec, okruh,
    // mistnost, zarizeni, zavada, zakazka, mericiPristroj, revizePristroj,
    // firma, nastaveni, zavadaKatalog, predvolenyText
    expect(createTableCalls.length).toBeGreaterThanOrEqual(10);

    // Check specific tables exist
    const allSql = createTableCalls.join('\n');
    expect(allSql).toContain('users');
    expect(allSql).toContain('revize');
    expect(allSql).toContain('rozvadec');
    expect(allSql).toContain('okruh');
    expect(allSql).toContain('mistnost');
    expect(allSql).toContain('zarizeni');
    expect(allSql).toContain('zavada');
    expect(allSql).toContain('zakazka');
    expect(allSql).toContain('mericiPristroj');
    expect(allSql).toContain('firma');
  });

  it('initializeDatabase should release client even on error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('SQL error'));

    const { initializeDatabase } = await import('../database');

    await expect(initializeDatabase()).rejects.toThrow();
    expect(mockRelease).toHaveBeenCalled();
  });
});

describe('database pool configuration', () => {
  it('should use DATABASE_URL from environment', async () => {
    const pg = await import('pg');
    const { Pool } = pg.default;

    // Pool constructor should have been called with connection string
    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: expect.any(String),
      }),
    );
  });
});
