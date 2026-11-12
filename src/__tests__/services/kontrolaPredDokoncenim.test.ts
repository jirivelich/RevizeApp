import { describe, it, expect } from 'vitest';
import { zkontrolujPredDokoncenim, jeBlokujiciZavada, type VstupKontroly } from '../../services/kontrolaPredDokoncenim';
import type { Zavada } from '../../types';

const zavada = (p: Partial<Zavada> = {}): Zavada => ({
  revizeId: 1, popis: 'Chybí krytí', zavaznost: 'C2', stav: 'otevřená', fotky: [], datumZjisteni: new Date(), ...p,
});

const kompletni = (): VstupKontroly => ({
  revize: {
    cisloRevize: '2026/001', nazev: 'RD', adresa: 'Ulice 1', objednatel: 'Novák', kategorieRevize: 'elektro',
    datum: '2026-05-01', datumDokonceni: '2026-05-02', typRevize: 'pravidelná', druhRozsahu: 'celkova',
    rtJmeno: 'Jan Technik', rtCisloOpravneni: '123', vysledek: 'schopno', zaver: 'Zařízení je schopno provozu.',
  },
  zavady: [],
  rozsahPolozky: [],
  dokumenty: [{ revizeId: 1, nazev: 'Projekt', druh: 'projekt', stav: 'predlozeno', znemoznujeOvereni: false } as any],
  pocetPristroju: 1,
});

const kody = (v: VstupKontroly) => zkontrolujPredDokoncenim(v).map(z => z.kod);

describe('zkontrolujPredDokoncenim', () => {
  it('kompletní revize nemá žádné zjištění', () => {
    expect(kody(kompletni())).toEqual([]);
  });

  it('chybějící identifikace a technik jsou kritické', () => {
    const v = kompletni();
    v.revize.cisloRevize = ''; v.revize.rtJmeno = ''; v.revize.rtCisloOpravneni = ''; v.revize.datum = '';
    const z = zkontrolujPredDokoncenim(v);
    for (const kod of ['ID_CISLO', 'RT_JMENO', 'RT_OPRAVNENI', 'DATUM_REVIZE']) {
      expect(z.find(x => x.kod === kod)?.uroven).toBe('kriticka');
    }
  });

  it('číslo osvědčení nahradí chybějící oprávnění', () => {
    const v = kompletni();
    v.revize.rtCisloOpravneni = ''; v.revize.rtCisloOsvedceni = 'E-1';
    expect(kody(v)).not.toContain('RT_OPRAVNENI');
  });

  it('datum dokončení před zahájením je kritické', () => {
    const v = kompletni();
    v.revize.datumDokonceni = '2026-04-01';
    expect(kody(v)).toContain('DATUM_POREADI');
  });

  it('prošlá platnost oprávnění je upozornění', () => {
    const v = kompletni();
    v.revize.rtPlatnostOpravneni = '2026-01-01';
    expect(zkontrolujPredDokoncenim(v).find(x => x.kod === 'RT_OPRAVNENI_PLATNOST')?.uroven).toBe('upozorneni');
  });

  it('bez výsledku je závěr kritická chyba, nic se nedoplňuje', () => {
    const v = kompletni();
    v.revize.vysledek = undefined;
    expect(zkontrolujPredDokoncenim(v).find(x => x.kod === 'ZAVER_CHYBI')?.uroven).toBe('kriticka');
  });

  it('kladný závěr s nevyřešenou závadou C1/C2 je kritický rozpor', () => {
    const v = kompletni();
    v.zavady = [zavada({ zavaznost: 'C1' })];
    expect(kody(v)).toContain('ZAVER_SCHOPNO_S_ZAVADOU');
  });

  it('vyřešená závada, doporučení a C3 kladný závěr neblokují', () => {
    const v = kompletni();
    v.zavady = [zavada({ stav: 'vyřešená' }), zavada({ typ: 'doporuceni', zduvodneni: 'x' }), zavada({ zavaznost: 'C3' })];
    expect(kody(v)).not.toContain('ZAVER_SCHOPNO_S_ZAVADOU');
    expect(kody(v)).toContain('ZAVER_C3');
  });

  it('kladný závěr s neověřenými částmi u celkové revize je kritický', () => {
    const v = kompletni();
    v.rozsahPolozky = [{ revizeId: 1, typ: 'neovereno', nazev: 'Půda', duvod: 'zamčeno' } as any];
    expect(kody(v)).toContain('ROZSAH_CELKOVA_NEOVERENO');
    expect(kody(v)).toContain('ZAVER_SCHOPNO_S_OMEZENIM');
  });

  it('neschopno bez odůvodnění a bez závady vyvolá upozornění', () => {
    const v = kompletni();
    v.revize.vysledek = 'neschopno';
    expect(kody(v)).toEqual(expect.arrayContaining(['ZAVER_NESCHOPNO_BEZ_ODUVODNENI', 'ZAVER_NESCHOPNO_BEZ_ZAVADY']));
  });

  it('bez přístrojů upozorní u elektro, u strojů ne', () => {
    const v = kompletni(); v.pocetPristroju = 0;
    expect(kody(v)).toContain('PRISTROJE');
    v.revize.kategorieRevize = 'stroje';
    expect(kody(v)).not.toContain('PRISTROJE');
  });

  it('doporučení bez zdůvodnění je jen doporučení', () => {
    const v = kompletni();
    v.zavady = [zavada({ typ: 'doporuceni', zavaznost: 'C3' })];
    expect(zkontrolujPredDokoncenim(v).find(x => x.kod === 'DOPORUCENI_BEZ_ZDUVODNENI')?.uroven).toBe('doporuceni');
  });
});

describe('jeBlokujiciZavada', () => {
  it('jen C1/C2, nevyřešené a ne doporučení', () => {
    expect(jeBlokujiciZavada(zavada())).toBe(true);
    expect(jeBlokujiciZavada(zavada({ zavaznost: 'C3' }))).toBe(false);
    expect(jeBlokujiciZavada(zavada({ stav: 'vyřešená' }))).toBe(false);
    expect(jeBlokujiciZavada(zavada({ typ: 'doporuceni' }))).toBe(false);
  });
});
