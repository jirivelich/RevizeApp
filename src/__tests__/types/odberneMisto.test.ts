import { describe, it, expect } from 'vitest';
import { createDefaultOdberneMisto, parseOdberneMisto, porovnejJistic, validujParametry } from '../../types/odberneMisto';

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

describe('validujParametry', () => {
  const base = () => ({ ...createDefaultOdberneMisto() });

  it('nehlásí nic pro vyhovující jednofázové OM 25 A', () => {
    const d = { ...base(), jisticProud: '25', pocetFazi: '1' as const, zpusobMereni: 'prime' as const, jisticCharakteristika: 'B', jisticZkratovaSchopnost: '10' };
    expect(validujParametry(d)).toEqual([]);
  });

  it('hlásí jednofázový odběr nad 25 A', () => {
    const d = { ...base(), jisticProud: '32', pocetFazi: '1' as const };
    expect(validujParametry(d).some(w => w.includes('25 A'))).toBe(true);
  });

  it('hlásí přímé měření nad 80 A a nepřímé do 80 A', () => {
    expect(validujParametry({ ...base(), jisticProud: '100', zpusobMereni: 'prime' }).some(w => w.includes('80 A'))).toBe(true);
    expect(validujParametry({ ...base(), jisticProud: '63', zpusobMereni: 'neprime' }).some(w => w.includes('nad 80 A'))).toBe(true);
  });

  it('hlásí hodnotu mimo řadu, charakteristiku jinou než B a nízkou zkratovou schopnost', () => {
    const w = validujParametry({ ...base(), jisticProud: '12', jisticCharakteristika: 'C', jisticZkratovaSchopnost: '6' });
    expect(w).toHaveLength(3);
  });

  it('kontroluje krytí podle prostředí', () => {
    expect(validujParametry({ ...base(), rozvadecIp: 'IP44', umisteniProstredi: 'venkovni' })).toEqual([]);
    expect(validujParametry({ ...base(), rozvadecIp: 'IP20', umisteniProstredi: 'venkovni' })).toHaveLength(1);
    expect(validujParametry({ ...base(), rozvadecIp: 'IP43', umisteniProstredi: 'venkovniKomunikace' })).toHaveLength(1);
    expect(validujParametry({ ...base(), rozvadecIp: 'IP2X', umisteniProstredi: 'vnitrni' })).toEqual([]);
  });

  it('hlásí neshodu jističe se smlouvou', () => {
    expect(validujParametry({ ...base(), jisticProud: '25', smlouvaJistic: '32' }).some(w => w.includes('smlouvě'))).toBe(true);
  });

  it('výchozí checklist je seskupený a obsahuje odkazy na kapitoly PPnn', () => {
    const d = createDefaultOdberneMisto();
    expect(d.checklist.every(r => r.skupina)).toBe(true);
    expect(d.checklist.filter(r => r.norma?.startsWith('PPnn')).length).toBeGreaterThan(30);
  });
});
