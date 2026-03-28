/**
 * Test 18: StrojniFormData – serializace/deserializace JSON dat strojního formuláře
 */
import { describe, it, expect } from 'vitest';

// Simulujeme StrojniFormData strukturu dle toho, jak ji StrojniZarizeniTab používá
interface StrojniFormData {
  strojVyrobce: string;
  strojTyp: string;
  strojSn: string;
  strojRokVyroby: string;
  strojNapeti: string;
  strojPrikon: string;
  strojKryti: string;
  strojHmotnost: string;
  strojPopis: string;
  vizualniKontrola: string;
  funkcniZkouska: string;
  bezpecnostniPrvky: string;
  ochranneKryty: string;
  elektrickaInstalace: string;
  izolacniStav: string;
  uzemneni: string;
  oznaceni: string;
  mereniOdporu: { bod: string; hodnota: string; vyhovuje: string }[];
  mereniIzolace: { obvod: string; hodnota: string; vyhovuje: string }[];
  celkovyStav: string;
  celkovyVysledek: 'schopno' | 'neschopno' | 'podmíněně schopno';
  doporuceni: string;
}

function createDefaultStrojniData(): StrojniFormData {
  return {
    strojVyrobce: '',
    strojTyp: '',
    strojSn: '',
    strojRokVyroby: '',
    strojNapeti: '',
    strojPrikon: '',
    strojKryti: '',
    strojHmotnost: '',
    strojPopis: '',
    vizualniKontrola: '',
    funkcniZkouska: '',
    bezpecnostniPrvky: '',
    ochranneKryty: '',
    elektrickaInstalace: '',
    izolacniStav: '',
    uzemneni: '',
    oznaceni: '',
    mereniOdporu: [{ bod: '', hodnota: '', vyhovuje: '' }],
    mereniIzolace: [{ obvod: '', hodnota: '', vyhovuje: '' }],
    celkovyStav: '',
    celkovyVysledek: 'schopno',
    doporuceni: '',
  };
}

describe('StrojniFormData serialization', () => {
  it('should serialize default data to valid JSON', () => {
    const data = createDefaultStrojniData();
    const json = JSON.stringify(data);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should deserialize back to original structure', () => {
    const original = createDefaultStrojniData();
    original.strojVyrobce = 'TestVyrobce';
    original.strojSn = 'SN-123';
    original.mereniOdporu = [{ bod: 'A1', hodnota: '0.5', vyhovuje: 'ano' }];

    const json = JSON.stringify(original);
    const parsed = JSON.parse(json) as StrojniFormData;

    expect(parsed.strojVyrobce).toBe('TestVyrobce');
    expect(parsed.strojSn).toBe('SN-123');
    expect(parsed.mereniOdporu).toHaveLength(1);
    expect(parsed.mereniOdporu[0].bod).toBe('A1');
  });

  it('should handle mereniOdporu array with multiple entries', () => {
    const data = createDefaultStrojniData();
    data.mereniOdporu = [
      { bod: 'Bod 1', hodnota: '0.3', vyhovuje: 'ano' },
      { bod: 'Bod 2', hodnota: '1.5', vyhovuje: 'ne' },
      { bod: 'Bod 3', hodnota: '0.1', vyhovuje: 'ano' },
    ];

    const json = JSON.stringify(data);
    const parsed = JSON.parse(json) as StrojniFormData;

    expect(parsed.mereniOdporu).toHaveLength(3);
    expect(parsed.mereniOdporu[1].vyhovuje).toBe('ne');
  });

  it('should preserve celkovyVysledek enum values', () => {
    const values: StrojniFormData['celkovyVysledek'][] = ['schopno', 'neschopno', 'podmíněně schopno'];

    values.forEach(v => {
      const data = createDefaultStrojniData();
      data.celkovyVysledek = v;
      const parsed = JSON.parse(JSON.stringify(data)) as StrojniFormData;
      expect(parsed.celkovyVysledek).toBe(v);
    });
  });

  it('should handle empty mereniOdporu array', () => {
    const data = createDefaultStrojniData();
    data.mereniOdporu = [];
    const parsed = JSON.parse(JSON.stringify(data)) as StrojniFormData;
    expect(parsed.mereniOdporu).toEqual([]);
  });

  it('should handle Czech characters in values', () => {
    const data = createDefaultStrojniData();
    data.strojPopis = 'Soustruh s elektronickým řízením, přesnost ±0.01mm';
    data.doporuceni = 'Doporučuji výměnu ložisek při další údržbě';

    const parsed = JSON.parse(JSON.stringify(data)) as StrojniFormData;
    expect(parsed.strojPopis).toContain('řízením');
    expect(parsed.doporuceni).toContain('ložisek');
  });

  it('should store as strojniData field on Revize', () => {
    const data = createDefaultStrojniData();
    data.strojVyrobce = 'ABC';

    // Simulate how it's stored in Revize.strojniData
    const revize = {
      id: 1,
      strojniData: JSON.stringify(data),
    };

    const parsedBack = JSON.parse(revize.strojniData) as StrojniFormData;
    expect(parsedBack.strojVyrobce).toBe('ABC');
  });
});
