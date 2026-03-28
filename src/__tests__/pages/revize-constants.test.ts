/**
 * Testy pro RevizeDetail/constants.ts – předvolené texty
 */
import { describe, it, expect } from 'vitest';
import { PREDVOLENE_TEXTY } from '../../pages/RevizeDetail/constants';

describe('PREDVOLENE_TEXTY', () => {
  const expectedKeys = [
    'popisZarizeni',
    'rozsahRevize',
    'predmetNeni',
    'podklady',
    'provedeneUkony',
    'vyhodnoceniPredchozich',
    'vysledekOduvodneni',
    'zaver',
  ];

  it('should contain all expected sections', () => {
    expectedKeys.forEach((key) => {
      expect(PREDVOLENE_TEXTY).toHaveProperty(key);
    });
  });

  it.each(expectedKeys)('section "%s" should have at least one option', (key) => {
    const options = PREDVOLENE_TEXTY[key];
    expect(options.length).toBeGreaterThanOrEqual(1);
  });

  it.each(expectedKeys)('each option in "%s" should have label and text', (key) => {
    const options = PREDVOLENE_TEXTY[key];
    options.forEach((opt) => {
      expect(opt.label).toBeTruthy();
      expect(opt.text).toBeTruthy();
      expect(typeof opt.label).toBe('string');
      expect(typeof opt.text).toBe('string');
    });
  });

  it('popisZarizeni should include common building types', () => {
    const labels = PREDVOLENE_TEXTY.popisZarizeni.map((o) => o.label);
    expect(labels).toContain('Bytový dům');
    expect(labels).toContain('Rodinný dům');
  });

  it('vysledekOduvodneni should cover all three outcomes', () => {
    const texts = PREDVOLENE_TEXTY.vysledekOduvodneni.map((o) => o.text);
    // Should have schopno, neschopno, podmíněně
    expect(texts.some((t) => t.includes('bez závad') || t.includes('schopno'))).toBe(true);
    expect(texts.some((t) => t.includes('brání'))).toBe(true);
    expect(texts.some((t) => t.includes('podmíněně'))).toBe(true);
  });

  it('zaver should have schopno and neschopno variants', () => {
    const labels = PREDVOLENE_TEXTY.zaver.map((o) => o.label.toLowerCase());
    expect(labels.some((l) => l.includes('schopno'))).toBe(true);
    expect(labels.some((l) => l.includes('neschopno'))).toBe(true);
  });
});
