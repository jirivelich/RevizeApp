/**
 * Vývojová stránka /dev/planovani – pohledy Plánování se vzorovými daty (jen v dev režimu).
 * Parametr ?v=list|week|calendar
 */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Revize, Zakaznik, Zakazka } from '../../types';
import { ListView } from './ListView';
import { WeekView } from './WeekView';
import { CalendarView } from './CalendarView';
import { addDaysLocal, toDateStr, moveZakazka } from './model';
import type { PlanProps } from './shared';

function sample(today: string): Zakazka[] {
  const d = (n: number) => addDaysLocal(today, n);
  const base = { createdAt: new Date(), updatedAt: new Date(), priorita: 'střední' as const, lhutaZpravyDni: 4 };
  return [
    { ...base, id: 1, nazev: 'Bytový dům Svatopluka Čecha 12', klient: 'SVJ Čecha 12', adresa: 'Sv. Čecha 12, Žatec', zakaznikId: 1, datumPlanovany: today, casPlanovany: '08:00', casKonec: '10:30', stav: 'v realizaci', kategorie: 'elektro', revizeId: 10 },
    { ...base, id: 2, nazev: 'Sportovní hala – hromosvod', klient: 'Město Žatec', adresa: 'Husova 2, Žatec', zakaznikId: 2, datumPlanovany: today, casPlanovany: '13:00', casKonec: '15:00', stav: 'plánováno', kategorie: 'hromosvod' },
    { ...base, id: 3, nazev: 'Kovosvit MAS – hala B', klient: 'Kovosvit MAS', adresa: 'Sezimovo Ústí', datumPlanovany: d(-2), datumyRealizace: [d(-1), today], stav: 'v realizaci', kategorie: 'stroje', revizeId: 11, priorita: 'vysoká' },
    { ...base, id: 4, nazev: 'Prodejna Hlavní 8', klient: 'Pekařství Novák', adresa: 'Hlavní 8, Žatec', datumPlanovany: d(-9), casPlanovany: '09:00', stav: 'dokončeno', kategorie: 'elektro', revizeId: 12 },
    { ...base, id: 5, nazev: 'MŠ Lounská', klient: 'Město Žatec', adresa: 'Lounská 1, Žatec', zakaznikId: 2, datumPlanovany: d(3), casPlanovany: '08:00', casKonec: '12:00', stav: 'plánováno', kategorie: 'elektro' },
    { ...base, id: 6, nazev: 'Odběrné místo Písečná 14', klient: 'Jana Horáková', adresa: 'Písečná 14, Žatec', datumPlanovany: d(4), casPlanovany: '10:00', casKonec: '11:30', stav: 'plánováno', kategorie: 'odberne_misto' },
    { ...base, id: 7, nazev: 'Kovosvit MAS – hala C', klient: 'Kovosvit MAS', adresa: 'Sezimovo Ústí', datumPlanovany: d(5), datumyRealizace: [d(6), d(7)], stav: 'plánováno', kategorie: 'stroje' },
    { ...base, id: 8, nazev: 'Sokolovna – hromosvod', klient: 'TJ Sokol Žatec', adresa: 'Nákladní 5, Žatec', datumPlanovany: d(10), casPlanovany: '09:00', stav: 'plánováno', kategorie: 'hromosvod' },
    { ...base, id: 9, nazev: 'RD Kubátovi', klient: 'Petr Kubát', adresa: 'Polní 3, Žatec', datumPlanovany: d(1), celyDen: true, casPlanovany: '08:00', stav: 'plánováno', kategorie: 'elektro' },
    { ...base, id: 10, nazev: 'ZŠ Komenského', klient: 'Město Žatec', adresa: 'Komenského 1, Žatec', datumPlanovany: d(-1), casPlanovany: '08:00', casKonec: '11:00', stav: 'dokončeno', kategorie: 'elektro', revizeId: 13 },
    { ...base, id: 11, nazev: 'Garáže U Nádraží', klient: 'SVJ Nádražní', adresa: 'Nádražní 9, Žatec', datumPlanovany: d(-20), casPlanovany: '10:00', stav: 'dokončeno', datumOdevzdaniZpravy: d(-16), kategorie: 'elektro' },
    { ...base, id: 12, nazev: 'Pila Bezděkov', klient: 'Dřevo s.r.o.', adresa: 'Bezděkov 4', datumPlanovany: d(-3), casPlanovany: '07:00', stav: 'plánováno', kategorie: 'stroje' },
    { ...base, id: 13, nazev: 'Kotelna Husova', klient: 'Město Žatec', adresa: 'Husova 10, Žatec', datumPlanovany: today, casPlanovany: '09:00', casKonec: '11:00', stav: 'plánováno' },
    ...Array.from({ length: 7 }, (_, i) => ({ ...base, id: 20 + i, nazev: `Revize RD č. ${i + 1}`, klient: 'Soukromník', adresa: `Ulice ${i + 1}, Žatec`, datumPlanovany: d(15 + i * 2), casPlanovany: '08:00', stav: 'plánováno' as const, kategorie: (['elektro', 'hromosvod', 'odberne_misto'] as const)[i % 3] })),
  ];
}

export default function DevPlanovani() {
  const [params, setParams] = useSearchParams();
  const v = params.get('v') || 'list';
  const today = toDateStr(new Date());
  const [zakazky, setZakazky] = useState<Zakazka[]>(() => sample(today));
  const update = (id: number, patch: Partial<Zakazka>) => setZakazky(list => list.map(z => (z.id === id ? { ...z, ...patch } : z)));

  const revizeById = useMemo(() => new Map<number, Revize>(), []);
  const zakazniciById = useMemo(() => new Map<number, Zakaznik>([
    [1, { id: 1, nazev: 'SVJ Čecha 12', telefon: '+420 777 123 456' }],
    [2, { id: 2, nazev: 'Město Žatec', telefon: '415 736 111' }],
  ]), []);

  const p: PlanProps = {
    zakazky, revizeById, zakazniciById, today,
    onEdit: z => console.info('upravit', z.id),
    onCreateAt: (d, t) => console.info('nová', d, t),
    onCreateRevize: z => update(z.id!, { revizeId: 99 }),
    onOpenRevize: z => console.info('otevřít revizi', z.revizeId),
    onMarkReportDone: z => update(z.id!, { datumOdevzdaniZpravy: today }),
    onComplete: z => update(z.id!, { stav: 'dokončeno', datumDokonceni: today }),
    onUpdateStav: (id, stav) => update(id, { stav }),
    onDelete: id => setZakazky(list => list.filter(z => z.id !== id)),
    onMove: (z, d, t) => update(z.id!, moveZakazka(z, d, t)),
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)] p-4 md:p-7">
      <div className="flex gap-2 mb-4" role="group" aria-label="Pohled">
        {(['list', 'week', 'calendar'] as const).map(k => (
          <button key={k} type="button" aria-pressed={v === k} onClick={() => setParams({ v: k })}
            className={`min-h-[40px] px-4 rounded-[var(--radius-md)] border text-sm font-semibold ${v === k ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--bg-accent)]' : 'border-[var(--border-input)] text-[var(--text-secondary)]'}`}>
            {k === 'list' ? 'Seznam' : k === 'week' ? 'Týden' : 'Měsíc'}
          </button>
        ))}
      </div>
      {v === 'week' ? <WeekView {...p} /> : v === 'calendar' ? <CalendarView {...p} /> : <ListView {...p} />}
    </div>
  );
}
