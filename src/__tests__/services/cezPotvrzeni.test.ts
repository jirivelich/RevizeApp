import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { hodnotyCez, rozlozAdresu, datumCesky, vyplnPdfCez, POLE, POLE_1F, POLE_3F } from '../../services/cezPotvrzeni';
import { parseOdberneMisto } from '../../types/odberneMisto';

const publicDir = path.resolve(__dirname, '../../../public');
const sablona = Uint8Array.from(fs.readFileSync(path.join(publicDir, 'sablony/cez-potvrzeni-revize-om.pdf')));
const font = Uint8Array.from(fs.readFileSync(path.join(publicDir, 'fonts/LiberationSans-Regular.ttf')));

describe('rozlozAdresu', () => {
  it('rozloží ulici, číslo, PSČ a obec', () => {
    expect(rozlozAdresu('Teplická 874/8, 405 02 Děčín')).toEqual({ ulice: 'Teplická', cisloDomu: '874/8', psc: '405 02', obec: 'Děčín' });
    expect(rozlozAdresu('Lipová 5, Brno')).toEqual({ ulice: 'Lipová', cisloDomu: '5', psc: '', obec: 'Brno' });
    expect(rozlozAdresu('Horní Lhota 12')).toEqual({ ulice: '', cisloDomu: '12', psc: '', obec: 'Horní Lhota' });
    expect(rozlozAdresu('')).toEqual({ ulice: '', cisloDomu: '', psc: '', obec: '' });
  });
});

describe('hodnotyCez', () => {
  const revize = {
    cisloRevize: '202611200930', adresa: 'Teplická 874/8, 405 02 Děčín', objednatel: 'Objednatel z revize',
    datum: '2026-11-18', datumVypracovani: '2026-11-20', rtJmeno: 'Ing. Pavel Žluťoučký', rtCisloOsvedceni: 'UTI/1/E2',
  };
  const om = parseOdberneMisto(JSON.stringify({ ean: '859182400123456789', parcela: '1234/5', jisticProud: '25 A', pocetFazi: '3', cez: { tuvKw: '2.2', obec: 'Děčín IV' } }));

  it('doplní výchozí hodnoty z revize, zákazníka a nastavení a respektuje přepsání', () => {
    const { pole, faze } = hodnotyCez(revize, om,
      { nazev: 'Jiří Řehoř', ico: '12345678', dic: 'CZ12345678', telefon: '777', email: 'a@b.cz' },
      { reviznniTechnikIco: '87654321', kontaktTelefon: '603', kontaktEmail: 't@b.cz' });
    expect(faze).toBe('3');
    expect(pole).toMatchObject({
      zakaznikJmeno: 'Jiří Řehoř', zakaznikIco: '12345678', zakaznikDic: '12345678',
      ean: '859182400123456789', parcela: '1234/5', jistic: '25',
      ulice: 'Teplická', cisloDomu: '874/8', psc: '405 02', obec: 'Děčín IV',
      tuvKw: '2,2', technikJmeno: 'Ing. Pavel Žluťoučký', technikOsvedceni: 'UTI/1/E2',
      vypracovano: '20. 11. 2026', cisloZpravy: '202611200930', technikIco: '87654321',
    });
  });

  it('bez zákazníka vezme objednatele z revize', () => {
    expect(hodnotyCez(revize, om, null, null).pole.zakaznikJmeno).toBe('Objednatel z revize');
    expect(datumCesky('2026-01-05')).toBe('5. 1. 2026');
  });
});

describe('vyplnPdfCez', () => {
  it('vyplní pole originálního formuláře včetně diakritiky a zaškrtne 3f', async () => {
    const om = parseOdberneMisto(JSON.stringify({ ean: '859182400123456789', pocetFazi: '3', jisticProud: '25' }));
    const { pole, faze } = hodnotyCez({ cisloRevize: 'R1', adresa: 'Žižkova 1, 110 00 Praha', objednatel: 'Řehoř Čížek' }, om, null, null);
    const bytes = await vyplnPdfCez(sablona, font, pole, faze, null);

    const pdf = await PDFDocument.load(bytes);
    const form = pdf.getForm();
    expect(form.getTextField(POLE.zakaznikJmeno).getText()).toBe('Řehoř Čížek');
    expect(form.getTextField(POLE.ulice).getText()).toBe('Žižkova');
    expect(form.getTextField(POLE.ean).getText()).toBe('859182400123456789');
    expect(form.getTextField(POLE.jistic).getText()).toBe('25');
    expect(form.getCheckBox(POLE_3F).isChecked()).toBe(true);
    expect(form.getCheckBox(POLE_1F).isChecked()).toBe(false);
    expect(pdf.getPageCount()).toBe(1);
  });
});
