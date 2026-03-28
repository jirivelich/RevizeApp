/**
 * Testy pro src/hooks/useQueries.ts
 *
 * Testujeme React Query hooks pomocí renderHook + QueryClientProvider.
 * Mockujeme database service a ověřujeme:
 * - správné query keys
 * - cache invalidaci po mutacích
 * - loading/error/success stavy
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock database service
vi.mock('../../services/database', () => ({
  revizeService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  rozvadecService: {
    getByRevize: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  okruhService: {
    getByRozvadec: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mistnostService: {
    getByRevize: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  zarizeniService: {
    getByMistnost: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  zavadaService: {
    getByRevize: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  firmaService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  zakazkaService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  pristrojService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  revizePristrojService: {
    getByRevize: vi.fn(),
    link: vi.fn(),
    unlink: vi.fn(),
  },
  nastaveniService: {
    get: vi.fn(),
    update: vi.fn(),
  },
  zavadaKatalogService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  predvolenyTextService: {
    getAll: vi.fn(),
    getByPole: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  zakazniciService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  backupService: {
    download: vi.fn(),
    import: vi.fn(),
  },
}));

import { revizeService, firmaService, zavadaService } from '../../services/database';
import {
  useRevize,
  useRevizeDetail,
  useCreateRevize,
  useUpdateRevize,
  useDeleteRevize,
} from '../../hooks/useQueries';

// ── Wrapper ─────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { Wrapper, queryClient };
}

// ── Setup ───────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════
// useRevize()
// ═══════════════════════════════════════════

describe('useRevize', () => {
  it('should fetch and return revize list', async () => {
    const mockData = [
      { id: 1, cisloRevize: 'R-001', nazev: 'Revize 1' },
      { id: 2, cisloRevize: 'R-002', nazev: 'Revize 2' },
    ];
    vi.mocked(revizeService.getAll).mockResolvedValue(mockData as any);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRevize(), { wrapper: Wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].cisloRevize).toBe('R-001');
    expect(revizeService.getAll).toHaveBeenCalledOnce();
  });

  it('should handle error', async () => {
    vi.mocked(revizeService.getAll).mockRejectedValue(new Error('Network error'));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRevize(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });
});

// ═══════════════════════════════════════════
// useRevizeDetail()
// ═══════════════════════════════════════════

describe('useRevizeDetail', () => {
  it('should fetch single revize by id', async () => {
    const mockData = { id: 5, cisloRevize: 'R-005', nazev: 'Detail' };
    vi.mocked(revizeService.getById).mockResolvedValue(mockData as any);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRevizeDetail(5), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.cisloRevize).toBe('R-005');
    expect(revizeService.getById).toHaveBeenCalledWith(5);
  });

  it('should not fetch when id is undefined (disabled)', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRevizeDetail(undefined), { wrapper: Wrapper });

    // Query should not be loading since it's disabled
    expect(result.current.fetchStatus).toBe('idle');
    expect(revizeService.getById).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════
// useCreateRevize()
// ═══════════════════════════════════════════

describe('useCreateRevize', () => {
  it('should create revize and invalidate cache', async () => {
    vi.mocked(revizeService.create).mockResolvedValue(42);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateRevize(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        cisloRevize: 'R-NEW',
        nazev: 'Nová',
        adresa: 'Test',
        objednatel: 'X',
        kategorieRevize: 'elektro',
        datum: '2026-01-01',
        termin: 36,
        typRevize: 'pravidelná',
        stav: 'rozpracováno',
      } as any);
    });

    expect(revizeService.create).toHaveBeenCalledOnce();
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['revize'] }),
    );
  });
});

// ═══════════════════════════════════════════
// useUpdateRevize()
// ═══════════════════════════════════════════

describe('useUpdateRevize', () => {
  it('should update revize and invalidate list + detail', async () => {
    vi.mocked(revizeService.update).mockResolvedValue(1);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateRevize(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 5, data: { nazev: 'Updated' } });
    });

    expect(revizeService.update).toHaveBeenCalledWith(5, { nazev: 'Updated' });
    // Should invalidate both all and detail
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['revize'] }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['revize', 5] }),
    );
  });
});

// ═══════════════════════════════════════════
// useDeleteRevize()
// ═══════════════════════════════════════════

describe('useDeleteRevize', () => {
  it('should delete revize and invalidate cache', async () => {
    vi.mocked(revizeService.delete).mockResolvedValue(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteRevize(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(5);
    });

    expect(revizeService.delete).toHaveBeenCalledWith(5);
    expect(invalidateSpy).toHaveBeenCalled();
  });
});
