import { describe, it, expect } from 'vitest';
import { zkontrolujRozsahAPodklady, navrhTextChybejiciDokumentace, navrhTextRozsahu } from '../../services/rozsahKontrola';
import type { RevizeDokument, RozsahPolozka } from '../../types';

const pol = (typ: RozsahPolozka['typ'], nazev: string, duvod?: string): RozsahPolozka => ({ revizeId: 1, typ, nazev, duvod });
const dok = (nazev: string, stav: RevizeDokument['stav'], extra: Partial<RevizeDokument> = {}): RevizeDokument => ({ revizeId: 1, nazev, stav, ...extra });
const kody = (z: ReturnType<typeof zkontrolujRozsahAPodklady>) => z.map(x => x.kod);

describe('zkontrolujRozsahAPodklady', () => {
  it('upozorní, když není určen druh rozsahu', () => {
    expect(kody(zkontrolujRozsahAPodklady(undefined, [], [dok('Projekt', 'predlozeno')]))).toContain('ROZSAH_DRUH_CHYBI');
  });

  it('celková revize s neověřenou částí je kritický rozpor', () => {
    const z = zkontrolujRozsahAPodklady('celkova', [pol('neovereno', 'Podružný rozvaděč RP2', 'zamčeno')], [dok('Projekt', 'predlozeno')]);
    const rozpor = z.find(x => x.kod === 'ROZSAH_CELKOVA_NEOVERENO');
    expect(rozpor?.uroven).toBe('kriticka');
  });

  it('celková revize s vyloučenou částí je upozornění', () => {
    const z = zkontrolujRozsahAPodklady('celkova', [pol('vyloucenoRozsah', 'Hromosvod', 'samostatná revize')], [dok('Projekt', 'predlozeno')]);
    expect(z.find(x => x.kod === 'ROZSAH_CELKOVA_VYLOUCENO')?.uroven).toBe('upozorneni');
  });

  it('dílčí revize bez revidovaných položek je upozornění', () => {
    expect(kody(zkontrolujRozsahAPodklady('dilci', [], [dok('Projekt', 'predlozeno')]))).toContain('ROZSAH_DILCI_BEZ_POLOZEK');
  });

  it('nedokončená revize bez uvedení neověřených částí je upozornění', () => {
    expect(kody(zkontrolujRozsahAPodklady('nedokoncena', [], [dok('Projekt', 'predlozeno')]))).toContain('ROZSAH_NEDOKONCENA_BEZ_POLOZEK');
  });

  it('vyloučená nebo neověřená položka bez důvodu je upozornění', () => {
    const z = zkontrolujRozsahAPodklady('dilci', [pol('revidovano', 'RE'), pol('vyloucenoRozsah', 'RP1')], [dok('P', 'predlozeno')]);
    expect(kody(z)).toContain('ROZSAH_BEZ_DUVODU');
  });

  it('bezproblémová celková revize nevrací žádné zjištění', () => {
    expect(zkontrolujRozsahAPodklady('celkova', [pol('revidovano', 'Celá instalace')], [dok('Projekt', 'predlozeno')])).toEqual([]);
  });

  it('nepředložený dokument je upozornění, a pokud brání ověření, kritická chyba', () => {
    const bezBrani = zkontrolujRozsahAPodklady('celkova', [], [dok('Projekt', 'nepredlozeno')]).find(x => x.kod === 'DOK_CHYBI');
    expect(bezBrani?.uroven).toBe('upozorneni');
    const sBrani = zkontrolujRozsahAPodklady('celkova', [], [dok('Projekt', 'nepredlozeno', { znemoznujeOvereni: true })]).find(x => x.kod === 'DOK_CHYBI_BRANI_OVERENI');
    expect(sBrani?.uroven).toBe('kriticka');
  });

  it('neaktuální a neodpovídající dokument jsou upozornění, nerelevantní se ignoruje', () => {
    const z = zkontrolujRozsahAPodklady('celkova', [], [dok('A', 'neaktualni'), dok('B', 'neodpovida'), dok('C', 'nerelevantni')]);
    expect(kody(z)).toEqual(['DOK_NEAKTUALNI', 'DOK_NEODPOVIDA']);
  });

  it('bez evidovaných podkladů vrací doporučení', () => {
    const z = zkontrolujRozsahAPodklady('celkova', [pol('revidovano', 'X')], []);
    expect(z).toHaveLength(1);
    expect(z[0].uroven).toBe('doporuceni');
  });
});

describe('navrhTextChybejiciDokumentace', () => {
  it('vrací prázdný text, pokud nic nechybí', () => {
    expect(navrhTextChybejiciDokumentace([dok('Projekt', 'predlozeno')])).toBe('');
  });

  it('vypíše nepředložené dokumenty a co nebylo možné ověřit', () => {
    const t = navrhTextChybejiciDokumentace([
      dok('Projekt', 'nepredlozeno', { znemoznujeOvereni: true, poznamka: 'shoda s projektem' }),
      dok('Výchozí revize', 'nepredlozeno'),
    ]);
    expect(t).toContain('Projekt, Výchozí revize');
    expect(t).toContain('nebylo možné ověřit: shoda s projektem');
  });
});

describe('navrhTextRozsahu', () => {
  it('rozdělí položky podle typu a přidá důvody', () => {
    const t = navrhTextRozsahu([pol('revidovano', 'RE'), pol('vyloucenoRozsah', 'Hromosvod', 'samostatná revize'), pol('neovereno', 'RP2', 'uzamčeno')]);
    expect(t.rozsah).toBe('RE');
    expect(t.predmetNeni).toBe('Hromosvod (samostatná revize)');
    expect(t.neovereno).toBe('RP2 (uzamčeno)');
  });
});
