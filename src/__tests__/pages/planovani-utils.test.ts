/**
 * Testy pro Planovani utils – čisté utility funkce
 */
import { describe, it, expect } from 'vitest';
import {
  emptyFormData,
  getStatusColor,
  getPriorityColor,
  zakazkaToFormData,
  STAV_OPTIONS,
  PRIORITA_OPTIONS,
} from '../../pages/Planovani/utils';
import type { Zakazka } from '../../types';

describe('emptyFormData', () => {
  it('should have correct defaults', () => {
    expect(emptyFormData.nazev).toBe('');
    expect(emptyFormData.klient).toBe('');
    expect(emptyFormData.stav).toBe('plánováno');
    expect(emptyFormData.priorita).toBe('střední');
    expect(emptyFormData.casPlanovany).toBe('08:00');
    expect(emptyFormData.revizeId).toBeUndefined();
  });

  it('should have today date as datumPlanovany', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(emptyFormData.datumPlanovany).toBe(today);
  });
});

describe('getStatusColor', () => {
  // Barvy jsou vázané na CSS proměnné z theme.ts (--primary/--warning-*/--success-*),
  // aby se badge správně přizpůsoboval světlému i tmavému motivu.
  it('should return primary (info) tone for plánováno', () => {
    expect(getStatusColor('plánováno')).toContain('--primary');
  });

  it('should return warning tone for v realizaci', () => {
    expect(getStatusColor('v realizaci')).toContain('--warning');
  });

  it('should return success tone for dokončeno', () => {
    expect(getStatusColor('dokončeno')).toContain('--success');
  });

  it('should return neutral tone for zrušeno', () => {
    expect(getStatusColor('zrušeno')).toContain('--text-secondary');
  });

  it('should return default (neutral) for unknown status', () => {
    expect(getStatusColor('neznámý' as any)).toContain('--text-secondary');
  });
});

describe('getPriorityColor', () => {
  it('should return danger tone for vysoká', () => {
    expect(getPriorityColor('vysoká')).toContain('--danger');
  });

  it('should return warning tone for střední', () => {
    expect(getPriorityColor('střední')).toContain('--warning');
  });

  it('should return primary (info) tone for nizká', () => {
    expect(getPriorityColor('nizká')).toContain('--primary');
  });

  it('should return default (neutral) for unknown priority', () => {
    expect(getPriorityColor('neznámá' as any)).toContain('--text-secondary');
  });
});

describe('zakazkaToFormData', () => {
  it('should convert Zakazka to form data', () => {
    const zakazka: Zakazka = {
      id: 1,
      nazev: 'Test zakázka',
      klient: 'Klient A',
      adresa: 'Adresa 1',
      datumPlanovany: '2026-04-01',
      casPlanovany: '10:30',
      stav: 'plánováno',
      priorita: 'vysoká',
      revizeId: 5,
      poznamka: 'Poznámka',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const formData = zakazkaToFormData(zakazka);

    expect(formData.nazev).toBe('Test zakázka');
    expect(formData.klient).toBe('Klient A');
    expect(formData.casPlanovany).toBe('10:30');
    expect(formData.stav).toBe('plánováno');
    expect(formData.priorita).toBe('vysoká');
    expect(formData.revizeId).toBe(5);
    expect(formData.poznamka).toBe('Poznámka');
  });

  it('should default casPlanovany to 08:00 when missing', () => {
    const zakazka: Zakazka = {
      nazev: 'Test',
      klient: 'K',
      adresa: 'A',
      datumPlanovany: '2026-01-01',
      stav: 'plánováno',
      priorita: 'nizká',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const formData = zakazkaToFormData(zakazka);
    expect(formData.casPlanovany).toBe('08:00');
  });

  it('should default poznamka to empty string when undefined', () => {
    const zakazka: Zakazka = {
      nazev: 'Test',
      klient: 'K',
      adresa: 'A',
      datumPlanovany: '2026-01-01',
      stav: 'plánováno',
      priorita: 'nizká',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const formData = zakazkaToFormData(zakazka);
    expect(formData.poznamka).toBe('');
  });
});

describe('STAV_OPTIONS', () => {
  it('should have 4 options', () => {
    expect(STAV_OPTIONS).toHaveLength(4);
  });

  it('should have correct values', () => {
    const values = STAV_OPTIONS.map((o) => o.value);
    expect(values).toEqual(['plánováno', 'v realizaci', 'dokončeno', 'zrušeno']);
  });

  it('should have labels for all values', () => {
    STAV_OPTIONS.forEach((opt) => {
      expect(opt.label).toBeTruthy();
    });
  });
});

describe('PRIORITA_OPTIONS', () => {
  it('should have 3 options', () => {
    expect(PRIORITA_OPTIONS).toHaveLength(3);
  });

  it('should be in ascending order (nizká → střední → vysoká)', () => {
    const values = PRIORITA_OPTIONS.map((o) => o.value);
    expect(values).toEqual(['nizká', 'střední', 'vysoká']);
  });
});
