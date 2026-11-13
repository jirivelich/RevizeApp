import type { Revize, RevizeDokument, RozsahPolozka, Zavada } from '../types';
import { zkontrolujRozsahAPodklady, type UrovenZjisteni } from './rozsahKontrola';

export type ZalozkaRevize = 'info' | 'dokumentace' | 'rozsah' | 'zavady' | 'hromosvod_zarizeni' | 'strojni_zarizeni' | 'odberne_misto';

export interface ZjisteniKontroly {
  uroven: UrovenZjisteni;
  kod: string;
  text: string;
  /** Záložka, kde lze zjištění opravit. */
  zalozka: ZalozkaRevize;
}

export interface VstupKontroly {
  revize: Partial<Revize>;
  zavady: Zavada[];
  rozsahPolozky: RozsahPolozka[];
  dokumenty: RevizeDokument[];
  /** Počet použitých měřicích přístrojů přiřazených k revizi. */
  pocetPristroju: number;
}

const prazdne = (v: unknown) => typeof v !== 'string' || v.trim() === '';

/** Závada, která podle zadání brání bezpečnému provozu: ne doporučení, C1/C2, dosud nevyřešená. */
export const jeBlokujiciZavada = (z: Zavada) =>
  z.typ !== 'doporuceni' && (z.zavaznost === 'C1' || z.zavaznost === 'C2') && z.stav !== 'vyřešená';

const datum = (v: unknown): number | null => {
  if (!v) return null;
  const t = new Date(v as string).getTime();
  return Number.isNaN(t) ? null : t;
};

/**
 * Kontrola před dokončením revize. Čistá a vysvětlitelná funkce: každé zjištění má kód, text a záložku.
 * Nic nerozhoduje za technika ani nic nedoplňuje, jen upozorňuje na to, co je třeba posoudit.
 */
export function zkontrolujPredDokoncenim(v: VstupKontroly): ZjisteniKontroly[] {
  const { revize: r, zavady, rozsahPolozky, dokumenty } = v;
  const z: ZjisteniKontroly[] = [];
  const add = (uroven: UrovenZjisteni, kod: string, zalozka: ZalozkaRevize, text: string) =>
    z.push({ uroven, kod, zalozka, text });

  // Identifikace
  if (prazdne(r.cisloRevize)) add('kriticka', 'ID_CISLO', 'info', 'Chybí číslo revize.');
  if (prazdne(r.nazev)) add('upozorneni', 'ID_NAZEV', 'info', 'Chybí název revize.');
  if (prazdne(r.adresa)) add('upozorneni', 'ID_ADRESA', 'info', 'Chybí adresa revidovaného objektu.');
  if (prazdne(r.objednatel)) add('upozorneni', 'ID_OBJEDNATEL', 'info', 'Chybí objednatel.');

  // Technik
  if (prazdne(r.rtJmeno)) add('kriticka', 'RT_JMENO', 'info', 'Není uvedeno jméno revizního technika.');
  if (prazdne(r.rtCisloOpravneni) && prazdne(r.rtCisloOsvedceni)) {
    add('kriticka', 'RT_OPRAVNENI', 'info', 'Není uvedeno číslo oprávnění ani osvědčení revizního technika.');
  }
  const datumRevize = datum(r.datum);
  const platnostOpr = datum(r.rtPlatnostOpravneni);
  if (platnostOpr !== null && datumRevize !== null && platnostOpr < datumRevize) {
    add('upozorneni', 'RT_OPRAVNENI_PLATNOST', 'info', 'Platnost oprávnění technika skončila před datem revize. Ověřte údaj.');
  }
  const platnostOsv = datum(r.rtPlatnostOsvedceni);
  if (platnostOsv !== null && datumRevize !== null && platnostOsv < datumRevize) {
    add('upozorneni', 'RT_OSVEDCENI_PLATNOST', 'info', 'Platnost osvědčení technika skončila před datem revize. Ověřte údaj.');
  }

  // Data
  if (datumRevize === null) add('kriticka', 'DATUM_REVIZE', 'info', 'Chybí datum zahájení revize.');
  const dokonceni = datum(r.datumDokonceni);
  if (dokonceni === null) {
    add('upozorneni', 'DATUM_DOKONCENI', 'info', 'Chybí datum dokončení revize. Při dokončení se použije dnešní datum.');
  } else if (datumRevize !== null && dokonceni < datumRevize) {
    add('kriticka', 'DATUM_POREADI', 'info', 'Datum dokončení je dřívější než datum zahájení revize.');
  }
  if (r.typRevize === 'mimořádná' && prazdne(r.duvodMimoradne)) {
    add('upozorneni', 'MIMORADNA_DUVOD', 'info', 'U mimořádné revize není uveden důvod.');
  }

  // Měřicí přístroje (týká se měření, u strojů nikoli)
  if (r.kategorieRevize !== 'stroje' && v.pocetPristroju === 0) {
    add('upozorneni', 'PRISTROJE', r.kategorieRevize === 'hromosvod' ? 'hromosvod_zarizeni' : 'dokumentace',
      'K revizi není přiřazen žádný měřicí přístroj. Zpráva bez uvedení použitých přístrojů je hůře obhajitelná.');
  }

  // Rozsah a podklady (stejná pravidla jako v záložce)
  const rozsah = zkontrolujRozsahAPodklady(r.druhRozsahu, rozsahPolozky, dokumenty);
  for (const f of rozsah) add(f.uroven, f.kod, 'rozsah', f.text);

  // Závady
  const blokujici = zavady.filter(jeBlokujiciZavada);
  const otevreneC3 = zavady.filter(zv => zv.typ !== 'doporuceni' && zv.zavaznost === 'C3' && zv.stav !== 'vyřešená');
  for (const zv of zavady) {
    if (prazdne(zv.popis)) add('upozorneni', 'ZAVADA_BEZ_POPISU', 'zavady', 'Je evidována závada bez popisu.');
  }
  for (const zv of zavady.filter(x => x.typ === 'doporuceni' && prazdne(x.zduvodneni))) {
    add('doporuceni', 'DOPORUCENI_BEZ_ZDUVODNENI', 'zavady', `U doporučení „${zv.popis || 'bez popisu'}“ chybí zdůvodnění.`);
  }

  // Závěr
  if (!r.vysledek) {
    add('kriticka', 'ZAVER_CHYBI', 'zavady', 'Není určen celkový výsledek revize (schopno / neschopno provozu). Rozhodnutí je na technikovi.');
  } else if (r.vysledek === 'schopno') {
    if (blokujici.length > 0) {
      add('kriticka', 'ZAVER_SCHOPNO_S_ZAVADOU', 'zavady',
        `Výsledek je „schopno provozu“, ale existuje ${blokujici.length} nevyřešených závad C1/C2. Změňte výsledek, nebo závady vyřešte či přeřaďte.`);
    }
    if (rozsah.some(f => f.kod === 'ROZSAH_CELKOVA_NEOVERENO' || f.kod === 'DOK_CHYBI_BRANI_OVERENI')) {
      add('kriticka', 'ZAVER_SCHOPNO_S_OMEZENIM', 'rozsah',
        'Výsledek je „schopno provozu“, ale rozsah obsahuje neověřené části nebo chybí dokumentace nutná k ověření. Zvažte omezení závěru.');
    }
    if (otevreneC3.length > 0) {
      add('doporuceni', 'ZAVER_C3', 'zavady', `Zbývá ${otevreneC3.length} nevyřešených závad C3. Ověřte, že jsou ve zprávě uvedeny a že závěr odpovídá.`);
    }
  } else if (r.vysledek === 'neschopno') {
    if (prazdne(r.vysledekOduvodneni)) {
      add('upozorneni', 'ZAVER_NESCHOPNO_BEZ_ODUVODNENI', 'info', 'Výsledek je „neschopno provozu“, ale chybí odůvodnění.');
    }
    if (blokujici.length === 0) {
      add('upozorneni', 'ZAVER_NESCHOPNO_BEZ_ZAVADY', 'zavady', 'Výsledek je „neschopno provozu“, ale není evidována žádná nevyřešená závada C1/C2. Ověřte, že závěr je zdůvodněn.');
    }
  }
  if (prazdne(r.zaver)) add('upozorneni', 'ZAVER_TEXT', 'info', 'Chybí slovní závěr revize.');

  return z;
}

export type NavrhZaveru = 'A' | 'B' | 'C';

export interface VysledekNavrhu {
  navrh: NavrhZaveru;
  popis: string;
  /** Důvody návrhu, aby byl vysvětlitelný a technik mohl posoudit, zda s nimi souhlasí. */
  duvody: string[];
  /** Hodnota pole výsledek, kterou lze nastavit. U C je null: nedostatečně ověřeno nemá samostatnou hodnotu. */
  vysledek: 'schopno' | 'neschopno' | null;
}

/**
 * Návrh závěru A (vyhovující) / B (nevyhovující) / C (nedostatečně ověřeno).
 * Pouze doporučení: nikdy nic nezapisuje samo. Kladný závěr A se nenavrhne, pokud existuje
 * závada C1/C2, neověřená část, chybějící dokumentace nutná k ověření nebo jiný kritický rozpor.
 */
export function navrhniZaver(v: VstupKontroly): VysledekNavrhu {
  const blokujici = v.zavady.filter(jeBlokujiciZavada);
  const rozsah = zkontrolujRozsahAPodklady(v.revize.druhRozsahu, v.rozsahPolozky, v.dokumenty);
  const omezeni: string[] = [];
  const neovereno = v.rozsahPolozky.filter(p => p.typ === 'neovereno');
  if (neovereno.length > 0) omezeni.push(`Neověřené části: ${neovereno.map(p => p.nazev).join(', ')}.`);
  if (v.revize.druhRozsahu === 'nedokoncena') omezeni.push('Revize je označena jako nedokončená.');
  for (const f of rozsah) if (f.kod === 'DOK_CHYBI_BRANI_OVERENI') omezeni.push(f.text);

  if (blokujici.length > 0) {
    const duvody = [`Nevyřešené závady C1/C2: ${blokujici.length}.`, ...blokujici.slice(0, 5).map(z => `${z.zavaznost}: ${z.popis || 'bez popisu'}`)];
    if (omezeni.length > 0) duvody.push('Zároveň existují omezení ověření (viz níže), uveďte je ve zprávě:', ...omezeni);
    return { navrh: 'B', popis: 'Nevyhovující: zařízení nesplňuje požadavky pro bezpečný provoz.', duvody, vysledek: 'neschopno' };
  }
  if (omezeni.length > 0) {
    return {
      navrh: 'C', popis: 'Nedostatečně ověřeno: rozsah ověření neumožňuje vydat kladný závěr.',
      duvody: omezeni, vysledek: null,
    };
  }
  const c3 = v.zavady.filter(z => z.typ !== 'doporuceni' && z.zavaznost === 'C3' && z.stav !== 'vyřešená').length;
  const duvody = ['Žádná nevyřešená závada C1/C2.', 'Rozsah neobsahuje neověřené části ani chybějící dokumentaci bránící ověření.'];
  if (c3 > 0) duvody.push(`Zbývá ${c3} závad C3, uveďte je ve zprávě.`);
  return { navrh: 'A', popis: 'Vyhovující: podle evidovaných údajů nebrání provozu nic z toho, co kontrola sleduje.', duvody, vysledek: 'schopno' };
}

export const POCET_UROVNI =(z: ZjisteniKontroly[]) => ({
  kriticka: z.filter(x => x.uroven === 'kriticka').length,
  upozorneni: z.filter(x => x.uroven === 'upozorneni').length,
  doporuceni: z.filter(x => x.uroven === 'doporuceni').length,
});
