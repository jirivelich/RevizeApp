/**
 * Testy pro src/hooks/queryKeys.ts
 *
 * Ověřujeme strukturu query klíčů – hierarchie, unikátnost, factory funkce.
 */
import { describe, it, expect } from 'vitest';
import { queryKeys } from '../../hooks/queryKeys';

describe('queryKeys', () => {
  describe('revize', () => {
    it('all should be ["revize"]', () => {
      expect(queryKeys.revize.all).toEqual(['revize']);
    });

    it('detail should include id', () => {
      expect(queryKeys.revize.detail(5)).toEqual(['revize', 5]);
    });

    it('detail key should start with all prefix (hierarchical invalidation)', () => {
      const allKey = queryKeys.revize.all;
      const detailKey = queryKeys.revize.detail(1);
      expect(detailKey[0]).toBe(allKey[0]);
    });
  });

  describe('rozvadece', () => {
    it('byRevize should include revize id', () => {
      expect(queryKeys.rozvadece.byRevize(10)).toEqual(['rozvadece', 'byRevize', 10]);
    });
  });

  describe('okruhy', () => {
    it('byRozvadec should include rozvadec id', () => {
      expect(queryKeys.okruhy.byRozvadec(3)).toEqual(['okruhy', 'byRozvadec', 3]);
    });
  });

  describe('zavady', () => {
    it('byRevize should include revize id', () => {
      expect(queryKeys.zavady.byRevize(7)).toEqual(['zavady', 'byRevize', 7]);
    });
  });

  describe('mistnosti', () => {
    it('byRevize should include revize id', () => {
      expect(queryKeys.mistnosti.byRevize(2)).toEqual(['mistnosti', 'byRevize', 2]);
    });
  });

  describe('zarizeni', () => {
    it('byMistnost should include mistnost id', () => {
      expect(queryKeys.zarizeni.byMistnost(8)).toEqual(['zarizeni', 'byMistnost', 8]);
    });
  });

  describe('pristroje', () => {
    it('all should be ["pristroje"]', () => {
      expect(queryKeys.pristroje.all).toEqual(['pristroje']);
    });

    it('byRevize should include revize id', () => {
      expect(queryKeys.pristroje.byRevize(4)).toEqual(['pristroje', 'byRevize', 4]);
    });
  });

  describe('firmy', () => {
    it('all should be ["firmy"]', () => {
      expect(queryKeys.firmy.all).toEqual(['firmy']);
    });
  });

  describe('zakaznici', () => {
    it('all should be ["zakaznici"]', () => {
      expect(queryKeys.zakaznici.all).toEqual(['zakaznici']);
    });
  });

  describe('uniqueness', () => {
    it('top-level keys should be unique', () => {
      const topLevelKeys = [
        queryKeys.revize.all[0],
        queryKeys.rozvadece.byRevize(1)[0],
        queryKeys.okruhy.byRozvadec(1)[0],
        queryKeys.zavady.byRevize(1)[0],
        queryKeys.mistnosti.byRevize(1)[0],
        queryKeys.zarizeni.byMistnost(1)[0],
        queryKeys.pristroje.all[0],
        queryKeys.firmy.all[0],
        queryKeys.zakaznici.all[0],
      ];
      const unique = new Set(topLevelKeys);
      expect(unique.size).toBe(topLevelKeys.length);
    });
  });
});
