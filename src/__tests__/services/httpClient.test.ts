/**
 * Testy pro src/services/httpClient.ts – jediný zdroj pravdy pro auth/session.
 * Ověřuje setAuthState/getCurrentUser (včetně poškozeného JSONu) a všechny
 * větve verifySession (bez tokenu, offline-trust, 401-reject, network-error-trust, success).
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

vi.stubEnv('VITE_API_URL', '/api');

import { setAuthState, getCurrentUser, verifySession, getToken } from '../../services/httpClient';

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn();
  localStorage.clear();
});

describe('setAuthState / getCurrentUser', () => {
  it('should persist token and user', () => {
    setAuthState('abc-token', { id: 1, username: 'admin' });
    expect(getToken()).toBe('abc-token');
    expect(getCurrentUser()).toEqual({ id: 1, username: 'admin' });
  });

  it('should return null when no user is stored', () => {
    expect(getCurrentUser()).toBeNull();
  });

  it('should return null instead of throwing on corrupt JSON', () => {
    localStorage.setItem('user', '{not-valid-json');
    expect(getCurrentUser()).toBeNull();
  });
});

describe('verifySession', () => {
  const originalOnLine = navigator.onLine;

  function setOnline(value: boolean) {
    Object.defineProperty(navigator, 'onLine', { value, configurable: true });
  }

  afterEach(() => {
    setOnline(originalOnLine);
  });

  it('should return false when there is no token', async () => {
    setOnline(true);
    expect(await verifySession()).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should trust the cached token when offline without calling fetch', async () => {
    localStorage.setItem('token', 'cached-token');
    setOnline(false);

    expect(await verifySession()).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should clear auth state and return false on 401', async () => {
    localStorage.setItem('token', 'invalid-token');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));
    setOnline(true);
    (global.fetch as Mock).mockResolvedValueOnce({
      status: 401,
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid token' }),
    });

    expect(await verifySession()).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('should trust the cached token on a server error (non-401)', async () => {
    localStorage.setItem('token', 'valid-token');
    setOnline(true);
    (global.fetch as Mock).mockResolvedValueOnce({ status: 503, ok: false });

    expect(await verifySession()).toBe(true);
    expect(localStorage.getItem('token')).toBe('valid-token');
  });

  it('should trust the cached token on a network error', async () => {
    localStorage.setItem('token', 'valid-token');
    setOnline(true);
    (global.fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

    expect(await verifySession()).toBe(true);
  });

  it('should return true when the server confirms the session', async () => {
    localStorage.setItem('token', 'valid-token');
    setOnline(true);
    (global.fetch as Mock).mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ valid: true }),
    });

    expect(await verifySession()).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/verify'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer valid-token' }),
      }),
    );
  });
});
