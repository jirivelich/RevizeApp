/**
 * Vitest setup file – globální konfigurace pro frontend testy.
 *
 * - Rozšíří expect o jest-dom matchery (toBeInTheDocument, toHaveTextContent, …)
 * - Nastaví globální mocky (localStorage, fetch, import.meta.env)
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Po každém testu automaticky unmountovat React stromy
afterEach(() => {
  cleanup();
});

// ── Mock localStorage ──────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ── Mock window.location ────────────────────────────────────────────
const locationMock = {
  href: 'http://localhost:5173/',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};
Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true,
});
