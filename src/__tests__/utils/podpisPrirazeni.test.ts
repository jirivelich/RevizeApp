import { describe, it, expect } from 'vitest';
import { najdiRevizi } from '../../utils/podpisPrirazeni';

const rev = (cisloRevize: string) => ({ cisloRevize });

describe('najdiRevizi', () => {
  const revize = [rev('202611241105-001'), rev('202611241105-010'), rev('202611241105-0100'), rev('R/2026/7')];

  it('najde revizi podle čísla v názvu souboru', () => {
    expect(najdiRevizi('202611241105-001_Zprava_o_revizi_signed.pdf', revize)?.cisloRevize).toBe('202611241105-001');
  });
  it('nezamění kratší číslo za delší', () => {
    expect(najdiRevizi('202611241105-0100_Zprava.pdf', revize)?.cisloRevize).toBe('202611241105-0100');
    expect(najdiRevizi('202611241105-010 podepsano.pdf', revize)?.cisloRevize).toBe('202611241105-010');
  });
  it('zvládne čísla s lomítky (v názvu souboru nahrazená podtržítkem)', () => {
    expect(najdiRevizi('R_2026_7_Zprava.pdf', revize)?.cisloRevize).toBe('R/2026/7');
  });
  it('bez shody vrátí null', () => {
    expect(najdiRevizi('faktura.pdf', revize)).toBeNull();
  });
});
