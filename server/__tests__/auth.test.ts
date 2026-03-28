/**
 * Testy pro server/auth.ts – autentizační modul
 *
 * Testuje: hashPassword, verifyPassword, createToken, authMiddleware
 * Mockuje: pool.query (PostgreSQL), request/response objekty
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database pool
vi.mock('../database', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import { pool } from '../database';
import {
  hashPassword,
  verifyPassword,
  createToken,
  authMiddleware,
  registerUser,
  loginUser,
  type AuthRequest,
} from '../auth';

import type { Response, NextFunction } from 'express';

// ── Helpers ─────────────────────────────────────

function createMockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function createMockReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
  return {
    headers: {},
    body: {},
    ...overrides,
  } as AuthRequest;
}

// ── Setup ───────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════
// hashPassword & verifyPassword
// ═══════════════════════════════════════════

describe('hashPassword', () => {
  it('should return a bcrypt hash', async () => {
    const hash = await hashPassword('testPassword123');

    expect(hash).toBeDefined();
    expect(hash).not.toBe('testPassword123');
    expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix
  });

  it('should produce different hashes for same password (salt)', async () => {
    const hash1 = await hashPassword('samePassword');
    const hash2 = await hashPassword('samePassword');

    expect(hash1).not.toBe(hash2);
  });
});

describe('verifyPassword', () => {
  it('should return true for matching password', async () => {
    const hash = await hashPassword('correct');
    const isValid = await verifyPassword('correct', hash);
    expect(isValid).toBe(true);
  });

  it('should return false for wrong password', async () => {
    const hash = await hashPassword('correct');
    const isValid = await verifyPassword('wrong', hash);
    expect(isValid).toBe(false);
  });
});

// ═══════════════════════════════════════════
// createToken
// ═══════════════════════════════════════════

describe('createToken', () => {
  it('should return a JWT string', () => {
    const token = createToken(1, 'admin', 'admin@test.cz');

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    // JWT format: header.payload.signature
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
  });

  it('should encode user info in payload', () => {
    const token = createToken(42, 'technik', 'technik@test.cz');

    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    expect(payload.id).toBe(42);
    expect(payload.username).toBe('technik');
    expect(payload.email).toBe('technik@test.cz');
    expect(payload.exp).toBeDefined();
  });
});

// ═══════════════════════════════════════════
// authMiddleware
// ═══════════════════════════════════════════

describe('authMiddleware', () => {
  it('should return 401 when no token provided', () => {
    const req = createMockReq({ headers: {} });
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 for invalid token', () => {
    const req = createMockReq({
      headers: { authorization: 'Bearer invalid.token.here' },
    });
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() and set req.user for valid token', () => {
    const token = createToken(1, 'admin', 'admin@test.cz');
    const req = createMockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockRes();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeDefined();
    expect(req.user!.username).toBe('admin');
    expect(req.user!.id).toBe(1);
  });
});

// ═══════════════════════════════════════════
// registerUser
// ═══════════════════════════════════════════

describe('registerUser', () => {
  it('should register a new user', async () => {
    vi.mocked(pool.query)
      // 1st call: check existing user
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      // 2nd call: insert user
      .mockResolvedValueOnce({ rows: [{ id: 10 }] } as any);

    const result = await registerUser({
      username: 'newuser',
      email: 'new@test.cz',
      password: 'password123',
      jmeno: 'Jan Nový',
    });

    expect(result.id).toBe(10);
    expect(result.username).toBe('newuser');
    expect(result.email).toBe('new@test.cz');
  });

  it('should throw when user already exists', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [{ id: 1 }],
      rowCount: 1,
    } as any);

    await expect(
      registerUser({
        username: 'existing',
        email: 'exists@test.cz',
        password: 'pass',
      }),
    ).rejects.toThrow('Uživatel se stejným jménem nebo emailem již existuje');
  });
});

// ═══════════════════════════════════════════
// loginUser
// ═══════════════════════════════════════════

describe('loginUser', () => {
  it('should return token for valid credentials', async () => {
    const hash = await hashPassword('correct-password');

    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [{ id: 1, username: 'admin', email: 'admin@test.cz', password: hash }],
    } as any);

    const result = await loginUser('admin', 'correct-password');

    expect(result.token).toBeDefined();
    expect(result.user.id).toBe(1);
    expect(result.user.username).toBe('admin');
  });

  it('should throw for non-existent user', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);

    await expect(loginUser('noone', 'pass')).rejects.toThrow('Uživatel neexistuje');
  });

  it('should throw for wrong password', async () => {
    const hash = await hashPassword('correct');

    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [{ id: 1, username: 'admin', email: 'admin@test.cz', password: hash }],
    } as any);

    await expect(loginUser('admin', 'wrong')).rejects.toThrow('Nesprávné heslo');
  });
});
