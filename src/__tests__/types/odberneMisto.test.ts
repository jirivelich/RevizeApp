import { describe, it, expect } from 'vitest';
import { createDefaultOdberneMisto, parseOdberneMisto, porovnejJistic } from '../../types/odberneMisto';

describe('odberneMisto', () => {
  it('parseOdberneMisto vrátí výchozí hodnoty pro prázdný nebo poškozený JSON', () => {
    expect(parseOdberneMisto(undefined).distributor).toBe('ČEZ Distribuce, a. s.');
    expect(parseOdberneMisto('{rozbite').checklist.length).toBeGreaterThan(0);
  });

  it('parseOdberneMisto doplní chybějící pole k uloženým datům', () => {
    const d = parseOdberneMisto(JSON.stringify({ ean: '859182400000000001' }));
    expect(d.ean).toBe('859182400000000001');
    expect(d.zkouseni.length).toBe(createDefaultOdberneMisto().zkouseni.length);
  });

  it('porovnejJistic porovná osazený jistič se smlouvou', () => {
    expect(porovnejJistic({ jisticProud: '25', smlouvaJistic: '25' })).toBe('shoda');
    expect(porovnejJistic({ jisticProud: '25', smlouvaJistic: '32' })).toBe('neshoda');
    expect(porovnejJistic({ jisticProud: '', smlouvaJistic: '25' })).toBe('neurceno');
    expect(porovnejJistic({ jisticProud: '25,0', smlouvaJistic: '25' })).toBe('shoda');
  });
});
