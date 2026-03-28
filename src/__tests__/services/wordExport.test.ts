/**
 * Test 15: wordExport helpers – fmtDate a další utility funkce
 */
import { describe, it, expect } from 'vitest';
import { fmtDate } from '../../services/wordExport';

describe('fmtDate', () => {
  it('should format ISO date string to cs-CZ locale', () => {
    const result = fmtDate('2025-06-15');
    // cs-CZ locale: "15. 6. 2025" or similar
    expect(result).toContain('15');
    expect(result).toContain('2025');
  });

  it('should format Date object', () => {
    const result = fmtDate(new Date('2025-01-01'));
    expect(result).toContain('2025');
  });

  it('should return dash for undefined', () => {
    expect(fmtDate(undefined)).toBe('—');
  });

  it('should return dash for null', () => {
    expect(fmtDate(null)).toBe('—');
  });

  it('should return dash for empty string', () => {
    expect(fmtDate('')).toBe('—');
  });

  it('should handle various date formats', () => {
    const result = fmtDate('2024-12-31T23:59:59');
    expect(result).toContain('2024');
    expect(result).toContain('12');
  });
});
