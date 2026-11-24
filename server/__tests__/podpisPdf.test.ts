import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { overPodpisPdf } from '../podpisPdf';

const fixture = (n: string) => readFileSync(fileURLToPath(new URL(`./fixtures/${n}`, import.meta.url)));

describe('overPodpisPdf', () => {
  it('ověří platný podpis s kvalifikovaným certifikátem (RSA)', () => {
    const r = overPodpisPdf(fixture('podepsane-rsa-qc.pdf'));
    expect(r.duvod).toBeUndefined();
    expect(r.ok).toBe(true);
    expect(r.hlavni?.podepsal).toBe('Jan Revizní Testovací');
    expect(r.hlavni?.kvalifikovany).toBe(true);
    expect(r.hlavni?.otiskSouhlasi).toBe(true);
    expect(r.hlavni?.podpisPlatny).toBe(true);
    expect(r.hlavni?.casPodpisu).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('ověří ECDSA podpis, certifikát bez QC není kvalifikovaný', () => {
    const r = overPodpisPdf(fixture('podepsane-ecdsa.pdf'));
    expect(r.ok).toBe(true);
    expect(r.hlavni?.podepsal).toBe('EC Tester');
    expect(r.hlavni?.kvalifikovany).toBe(false);
    expect(r.hlavni?.podpisPlatny).toBe(true);
  });

  it('pozná změnu dokumentu po podpisu', () => {
    const pdf = Buffer.from(fixture('podepsane-rsa-qc.pdf'));
    const i = pdf.indexOf('/Count 0');
    pdf[i + 7] = '1'.charCodeAt(0);
    const r = overPodpisPdf(pdf);
    expect(r.ok).toBe(false);
    expect(r.hlavni?.otiskSouhlasi).toBe(false);
    expect(r.duvod).toMatch(/změněn/);
  });

  it('pozná data připsaná za podpis', () => {
    const pdf = Buffer.concat([fixture('podepsane-rsa-qc.pdf'), Buffer.from('\n% dopsano\n')]);
    const r = overPodpisPdf(pdf);
    expect(r.ok).toBe(false);
    expect(r.duvod).toMatch(/připsány/);
  });

  it('nepodepsané PDF a jiný soubor odmítne', () => {
    expect(overPodpisPdf(fixture('nepodepsane.pdf'))).toMatchObject({ jePdf: true, ok: false });
    expect(overPodpisPdf(Buffer.from('ahoj'))).toMatchObject({ jePdf: false, ok: false });
  });
});
