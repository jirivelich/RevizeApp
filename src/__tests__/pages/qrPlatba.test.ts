import { describe, it, expect } from 'vitest';
import { sestavSpayd } from '../../pages/FakturaPrint/qrPlatba';

describe('sestavSpayd', () => {
  it('sestaví základní řetězec', () => {
    expect(
      sestavSpayd({ iban: 'CZ65 0800 0000 1920 0014 5399', castka: 1234.5, vs: '20260001', zprava: 'Faktura 20260001' }),
    ).toBe('SPD*1.0*ACC:CZ6508000000192000145399*AM:1234.50*CC:CZK*X-VS:20260001*MSG:Faktura 20260001');
  });

  it('IBAN převede na velká písmena bez mezer', () => {
    expect(sestavSpayd({ iban: 'cz65 0800', castka: 1 })).toContain('ACC:CZ650800*');
  });

  it('odstraní diakritiku a hvězdičku ze zprávy', () => {
    const s = sestavSpayd({ iban: 'CZ1', castka: 1, zprava: 'Žluťoučký *kůň' });
    expect(s.endsWith('MSG:Zlutoucky kun')).toBe(true);
    expect(s.split('*')).toHaveLength(6);
  });

  it('zprávu ořízne na 60 znaků', () => {
    const s = sestavSpayd({ iban: 'CZ1', castka: 1, zprava: 'a'.repeat(100) });
    expect(s.split('MSG:')[1]).toHaveLength(60);
  });

  it('VS jen číslice, max 10', () => {
    expect(sestavSpayd({ iban: 'CZ1', castka: 1, vs: 'FA-123456789012' })).toContain('X-VS:1234567890');
  });

  it('vynechá prázdný VS a zprávu, respektuje měnu', () => {
    expect(sestavSpayd({ iban: 'CZ1', castka: 10, mena: 'EUR' })).toBe('SPD*1.0*ACC:CZ1*AM:10.00*CC:EUR');
  });
});
