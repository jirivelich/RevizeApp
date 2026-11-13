import { describe, it, expect } from 'vitest';
import type { Zakazka } from '../../types';
import {
  groupOf, groupForList, primaryAction, reportLabel, isAllDay, timeRange, timeLabel, allDayBars, timedBlocks,
  hourRange, monthGrid, mondayOf, kategorieOf, matchesSearch, matchesStav, jobsOnDay, deadlinesOnDay, addDaysLocal, telHref, moveZakazka,
} from '../../pages/Planovani/model';

const TODAY = '2026-11-13'; // pátek
const now = new Date('2026-11-01T00:00:00');

function z(p: Partial<Zakazka>): Zakazka {
  return {
    id: 1, nazev: 'Zakázka', klient: 'Klient', adresa: 'Adresa', datumPlanovany: TODAY, casPlanovany: '08:00',
    stav: 'plánováno', priorita: 'střední', createdAt: now, updatedAt: now, ...p,
  };
}

describe('datum', () => {
  it('pondělí týdne a posun dní v místním čase', () => {
    expect(mondayOf(TODAY)).toBe('2026-11-09');
    expect(mondayOf('2026-11-15')).toBe('2026-11-09');
    expect(mondayOf('2026-11-16')).toBe('2026-11-16');
    expect(addDaysLocal('2026-10-31', 1)).toBe('2026-11-01');
  });
  it('mřížka měsíce začíná pondělím a má 42 dní', () => {
    const g = monthGrid(2026, 10); // listopad
    expect(g).toHaveLength(42);
    expect(g[0]).toBe('2026-10-26');
    expect(g[6]).toBe('2026-11-01');
  });
});

describe('čas zakázky', () => {
  it('celý den: příznak, chybějící čas nebo více dní', () => {
    expect(isAllDay(z({ celyDen: true }))).toBe(true);
    expect(isAllDay(z({ casPlanovany: '' }))).toBe(true);
    expect(isAllDay(z({ datumyRealizace: ['2026-11-14'] }))).toBe(true);
    expect(isAllDay(z({}))).toBe(false);
  });
  it('rozsah času; bez konce 1 hodina', () => {
    expect(timeRange(z({ casPlanovany: '08:00', casKonec: '10:30' }))).toEqual({ from: 8, to: 10.5 });
    expect(timeRange(z({ casPlanovany: '13:00' }))).toEqual({ from: 13, to: 14 });
    expect(timeRange(z({ casPlanovany: '13:00', casKonec: '12:00' }))).toEqual({ from: 13, to: 14 });
  });
  it('popisek času v seznamu', () => {
    expect(timeLabel(z({ casKonec: '10:30' }), TODAY)).toEqual({ main: '8:00', sub: 'do 10:30' });
    expect(timeLabel(z({ datumPlanovany: '2026-11-11', datumyRealizace: ['2026-11-12', TODAY] }), TODAY))
      .toEqual({ main: 'Celý den', sub: 'den 3 z 3' });
  });
});

describe('skupiny seznamu', () => {
  it('rozdělí podle termínu', () => {
    expect(groupOf(z({}), TODAY)).toBe('dnes');
    expect(groupOf(z({ datumPlanovany: '2026-11-14' }), TODAY)).toBe('zitra');
    expect(groupOf(z({ datumPlanovany: '2026-11-15' }), TODAY)).toBe('tento-tyden');
    expect(groupOf(z({ datumPlanovany: '2026-11-18' }), TODAY)).toBe('pristi-tyden');
    expect(groupOf(z({ datumPlanovany: '2026-12-01' }), TODAY)).toBe('pozdeji');
    expect(groupOf(z({ datumPlanovany: '2026-11-10' }), TODAY)).toBe('po-terminu');
  });
  it('dokončené: čeká na zprávu, po termínu zprávy, nebo hotovo', () => {
    expect(groupOf(z({ stav: 'dokončeno', datumPlanovany: '2026-11-12', lhutaZpravyDni: 4 }), TODAY)).toBe('zprava');
    expect(groupOf(z({ stav: 'dokončeno', datumPlanovany: '2026-11-04', lhutaZpravyDni: 4 }), TODAY)).toBe('po-terminu');
    expect(groupOf(z({ stav: 'dokončeno', datumPlanovany: '2026-11-04', datumOdevzdaniZpravy: '2026-11-06' }), TODAY)).toBe('dokoncene');
    expect(groupOf(z({ stav: 'zrušeno' }), TODAY)).toBe('dokoncene');
  });
  it('vícedenní zakázka probíhající dnes je ve skupině Dnes', () => {
    expect(groupOf(z({ datumPlanovany: '2026-11-11', datumyRealizace: ['2026-11-12', TODAY] }), TODAY)).toBe('dnes');
  });
  it('pořadí skupin a řazení uvnitř podle času', () => {
    const groups = groupForList([
      z({ id: 1, datumPlanovany: '2026-11-20' }),
      z({ id: 2, casPlanovany: '13:00' }),
      z({ id: 3, casPlanovany: '08:00' }),
      z({ id: 4, datumPlanovany: '2026-11-02' }),
    ], TODAY);
    expect(groups.map(g => g.key)).toEqual(['po-terminu', 'dnes', 'pristi-tyden']);
    expect(groups[1].items.map(i => i.id)).toEqual([3, 2]);
  });
});

describe('hlavní akce a termín zprávy', () => {
  it('akce podle stavu', () => {
    expect(primaryAction(z({}))?.kind).toBe('create');
    expect(primaryAction(z({ revizeId: 5 }))).toEqual({ kind: 'open', label: 'Otevřít revizi', primary: false });
    expect(primaryAction(z({ stav: 'dokončeno', revizeId: 5 }))?.label).toBe('Dokončit zprávu');
    expect(primaryAction(z({ stav: 'dokončeno' }))?.kind).toBe('reportDone');
    expect(primaryAction(z({ stav: 'dokončeno', datumOdevzdaniZpravy: '2026-11-10' }))).toBeNull();
    expect(primaryAction(z({ stav: 'zrušeno' }))).toBeNull();
  });
  it('štítek termínu zprávy', () => {
    expect(reportLabel(z({ stav: 'dokončeno', datumPlanovany: '2026-11-06', lhutaZpravyDni: 4 }), TODAY)).toEqual({ text: 'zpráva o 3 dny pozdě', late: true });
    expect(reportLabel(z({ stav: 'dokončeno', datumPlanovany: '2026-11-09', lhutaZpravyDni: 4 }), TODAY)).toEqual({ text: 'zpráva dnes', late: false });
    expect(reportLabel(z({ stav: 'dokončeno', datumPlanovany: TODAY, lhutaZpravyDni: 7 }), TODAY)).toEqual({ text: 'zpráva 20. 11.', late: false });
    expect(reportLabel(z({}), TODAY)).toBeNull();
  });
});

describe('týden', () => {
  const week = Array.from({ length: 7 }, (_, i) => addDaysLocal('2026-11-09', i));
  it('vícedenní zakázka je jeden pruh, souběžné pruhy v dalších řádcích', () => {
    const bars = allDayBars([
      z({ id: 1, datumPlanovany: '2026-11-11', datumyRealizace: ['2026-11-12', '2026-11-13'] }),
      z({ id: 2, datumPlanovany: '2026-11-12', celyDen: true }),
      z({ id: 3, datumPlanovany: '2026-11-09', celyDen: true }),
    ], week);
    expect(bars.find(b => b.z.id === 1)).toMatchObject({ start: 2, end: 4, row: 0 });
    expect(bars.find(b => b.z.id === 2)).toMatchObject({ start: 3, end: 3, row: 1 });
    expect(bars.find(b => b.z.id === 3)).toMatchObject({ start: 0, end: 0, row: 0 });
  });
  it('nesouvislé dny = více pruhů; dny mimo týden se oříznou', () => {
    const bars = allDayBars([z({ id: 1, datumPlanovany: '2026-11-06', datumyRealizace: ['2026-11-09', '2026-11-11'] })], week);
    expect(bars.map(b => [b.start, b.end])).toEqual([[0, 0], [2, 2]]);
  });
  it('překrývající se bloky vedle sebe', () => {
    const blocks = timedBlocks([
      z({ id: 1, casPlanovany: '08:00', casKonec: '10:00' }),
      z({ id: 2, casPlanovany: '09:00', casKonec: '11:00' }),
      z({ id: 3, casPlanovany: '13:00' }),
    ], TODAY);
    expect(blocks.find(b => b.z.id === 1)).toMatchObject({ col: 0, cols: 2 });
    expect(blocks.find(b => b.z.id === 2)).toMatchObject({ col: 1, cols: 2 });
    expect(blocks.find(b => b.z.id === 3)).toMatchObject({ col: 0, cols: 1 });
  });
  it('časová osa 7–17 h, rozšířená podle zakázek', () => {
    expect(hourRange([])).toEqual({ start: 7, end: 17 });
    expect(hourRange(timedBlocks([z({ casPlanovany: '06:00', casKonec: '19:30' })], TODAY))).toEqual({ start: 6, end: 20 });
  });
});

describe('kategorie, filtry, den', () => {
  it('kategorie: vlastní, z revize, neurčeno', () => {
    const rev = new Map([[5, { kategorieRevize: 'hromosvod' } as never]]);
    expect(kategorieOf(z({ kategorie: 'stroje', revizeId: 5 }), rev)).toBe('stroje');
    expect(kategorieOf(z({ revizeId: 5 }), rev)).toBe('hromosvod');
    expect(kategorieOf(z({}), rev)).toBe('neurceno');
  });
  it('hledání bez diakritiky a filtr stavu', () => {
    expect(matchesSearch(z({ nazev: 'Sportovní hala' }), 'sportovni')).toBe(true);
    expect(matchesSearch(z({ adresa: 'Husova 2, Žatec' }), 'zatec')).toBe(true);
    expect(matchesSearch(z({}), 'xyz')).toBe(false);
    expect(matchesStav(z({ stav: 'dokončeno', datumPlanovany: '2026-11-12' }), 'aktivni')).toBe(true);
    expect(matchesStav(z({ stav: 'dokončeno', datumOdevzdaniZpravy: '2026-11-12' }), 'aktivni')).toBe(false);
  });
  it('zakázky a termíny zpráv v den', () => {
    const list = [z({ id: 1 }), z({ id: 2, stav: 'zrušeno' }), z({ id: 3, stav: 'dokončeno', datumPlanovany: '2026-11-09', lhutaZpravyDni: 4 })];
    expect(jobsOnDay(list, TODAY).map(j => j.id)).toEqual([1]);
    expect(deadlinesOnDay(list, TODAY).map(j => j.id)).toEqual([3]);
  });
  it('odkaz na telefon', () => {
    expect(telHref('+420 777 123 456')).toBe('tel:+420777123456');
  });
});

describe('přesun zakázky', () => {
  it('na jiný čas: délka zůstane', () => {
    expect(moveZakazka(z({ casPlanovany: '08:00', casKonec: '10:30' }), '2026-11-16', '13:00'))
      .toEqual({ datumPlanovany: '2026-11-16', celyDen: false, casPlanovany: '13:00', casKonec: '15:30' });
  });
  it('bez konce zůstane bez konce', () => {
    expect(moveZakazka(z({ casPlanovany: '08:00' }), TODAY, '09:00')).toMatchObject({ casPlanovany: '09:00', casKonec: '' });
  });
  it('vícedenní se posune celá a zůstane celodenní', () => {
    expect(moveZakazka(z({ datumPlanovany: '2026-11-11', datumyRealizace: ['2026-11-12', '2026-11-13'] }), '2026-11-16', '10:00'))
      .toEqual({ datumPlanovany: '2026-11-16', datumyRealizace: ['2026-11-17', '2026-11-18'] });
  });
  it('do řádku „Celý den“ = celodenní; z něj na čas = 1 h', () => {
    expect(moveZakazka(z({}), TODAY, 'allday')).toEqual({ datumPlanovany: TODAY, celyDen: true });
    expect(moveZakazka(z({ celyDen: true }), TODAY, '10:00')).toMatchObject({ celyDen: false, casPlanovany: '10:00', casKonec: '11:00' });
  });
});
