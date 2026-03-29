/**
 * Test: Zobrazení jističe v tabulce okruhů
 * Ověřuje formát výstupu "{pocetFazi}/{jisticTyp}{proud}" po uložení okruhu.
 * Formát v tabulce: o.pocetFazi || 1 / o.jisticTyp + o.jisticProud.replace('A','')
 */
import { describe, it, expect } from 'vitest';

// Simuluje formátování jističe tak, jak to dělá RozvadeceTab v tabulce
function formatJistic(okruh: { pocetFazi?: number; jisticTyp: string; jisticProud: string }) {
  return `${okruh.pocetFazi || 1}/${okruh.jisticTyp}${okruh.jisticProud.replace('A', '')}`;
}

describe('Výstup jističe v tabulce okruhů', () => {
  it('1. standardní B16A 1-fázový → "1/B16"', () => {
    expect(formatJistic({ pocetFazi: 1, jisticTyp: 'B', jisticProud: '16A' })).toBe('1/B16');
  });

  it('2. standardní C25A 3-fázový → "3/C25"', () => {
    expect(formatJistic({ pocetFazi: 3, jisticTyp: 'C', jisticProud: '25A' })).toBe('3/C25');
  });

  it('3. standardní D63A 3-fázový → "3/D63"', () => {
    expect(formatJistic({ pocetFazi: 3, jisticTyp: 'D', jisticProud: '63A' })).toBe('3/D63');
  });

  it('4. pojistka gG 32A → "1/gG32"', () => {
    expect(formatJistic({ pocetFazi: 1, jisticTyp: 'gG', jisticProud: '32A' })).toBe('1/gG32');
  });

  it('5. pojistka aM 50A 3-fázová → "3/aM50"', () => {
    expect(formatJistic({ pocetFazi: 3, jisticTyp: 'aM', jisticProud: '50A' })).toBe('3/aM50');
  });

  it('6. vlastní typ "FU" s vlastním proudem "35A" → "1/FU35"', () => {
    expect(formatJistic({ pocetFazi: 1, jisticTyp: 'FU', jisticProud: '35A' })).toBe('1/FU35');
  });

  it('7. vlastní typ "motor" s proudem "100A" → "3/motor100"', () => {
    expect(formatJistic({ pocetFazi: 3, jisticTyp: 'motor', jisticProud: '100A' })).toBe('3/motor100');
  });

  it('8. vlastní proud bez "A" (např. uživatel napíše "15") → "1/B15"', () => {
    // Pokud uživatel zadá vlastní proud bez "A", replace('A','') nic nezmění
    expect(formatJistic({ pocetFazi: 1, jisticTyp: 'B', jisticProud: '15' })).toBe('1/B15');
  });

  it('9. pocetFazi undefined → výchozí 1, "1/C10"', () => {
    expect(formatJistic({ jisticTyp: 'C', jisticProud: '10A' })).toBe('1/C10');
  });

  it('10. ITM s 160A 3-fázový → "3/ITM160"', () => {
    expect(formatJistic({ pocetFazi: 3, jisticTyp: 'ITM', jisticProud: '160A' })).toBe('3/ITM160');
  });
});
