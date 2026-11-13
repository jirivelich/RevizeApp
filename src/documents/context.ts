/**
 * Kontext dokumentu – jeden objekt se všemi daty, která šablona smí použít.
 * Šablony nesahají nikam jinam než do ctx.
 */
import type { Revize, Rozvadec, Okruh, Chranic, Zavada, Mistnost, Zarizeni, MericiPristroj, Nastaveni, Zakaznik } from '../types';
import { parseOdberneMisto, type OdberneMistoData } from '../types/odberneMisto';
import type { PrilohaPrintItem } from '../services/prilohyUtils';
import { H, type Helpers } from './helpers';

export interface RozvadecWithOkruhy extends Rozvadec {
  okruhy: Okruh[];
  chranice: Chranic[];
}

export interface MistnostWithZarizeni extends Mistnost {
  zarizeniList: Zarizeni[];
}

// ── Strojní zařízení – tvar dat uložených v revize.strojniData (JSON) ──
type Stav = '' | 'V' | 'N' | 'NA';
export interface StrojniPrintData {
  strojNazev: string; strojSn: string; strojVyrobce: string; strojRok: string;
  strojNapajeni: string; strojPrikon: string; strojProud: string; strojIp: string;
  strojTrida: string; strojCe: string; mistoHala: string;
  strojPrivod?: '' | 'pevny' | 'pohyblivy';
  jisteni: { nazev: string; typ: string; hodnota: string; charakteristika: string; stav: Stav; poznamka: string }[];
  izolace: { misto: string; napeti: string; hodnota: string; pozadavek: string; vysledek: Stav; poznamka: string }[];
  spojitost: { misto: string; proud: string; hodnota: string; pozadavek: string; vysledek: Stav; poznamka: string }[];
  impedance?: { misto: string; hodnota: string; pozadavek: string; vysledek: Stav; poznamka: string }[];
  rcd: { nazev: string; idn: string; typ: string; cas: string; limit: string; vysledek: Stav; poznamka: string }[];
  ostatni?: { nazev: string; misto: string; hodnota: string; jednotka: string; pozadavek: string; vysledek: Stav; poznamka: string }[];
  kontroly: { nazev: string; vysledek: Stav; poznamka: string; editable?: boolean }[];
  pristroje: { typ: string; sn: string; kalibrace: string; trida: string; poznamka: string }[];
  verdikt: '' | 'pass' | 'fail';
  posudekZavady: string; posudekDoporuceni: string; posudekNormy: string;
}

/** Data načtená z databáze (bez odvozených polí). */
export interface DocData {
  revize: Revize;
  nastaveni: Nastaveni | null;
  zakaznik: Zakaznik | null;
  rozvadece: RozvadecWithOkruhy[];
  mistnosti: MistnostWithZarizeni[];
  zavady: Zavada[];
  pristroje: MericiPristroj[];
  prilohy: PrilohaPrintItem[];
}

export interface DocContext extends DocData {
  /** Strojní data (jen kategorie „stroje“), jinak null. */
  strojni: StrojniPrintData | null;
  /** Data odběrného místa (vždy objekt, prázdný když nejsou vyplněna). */
  om: OdberneMistoData;
  /** Je sekce viditelná v tisku? (revize.tiskSekce, výchozí true) */
  vis: (key: string) => boolean;
  firma: { nazev: string; adresa: string; ico: string; dic: string; telefon: string; email: string; logo: string };
  technik: { jmeno: string; opravneni: string; osvedceni: string; adresa: string; ico: string };
  provozovatel: { nazev: string; adresa: string; ico: string; kontakt: string; telefon: string; email: string };
  typRevizeLabel: string;
  /** Prvek skupiny pro šablony se scope „group“ (např. rozvaděč). */
  group?: unknown;
  H: Helpers;
}

function parseJson<T>(json: string | undefined | null, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

/** Sestaví kontext z načtených dat (čistá funkce – používá se i pro vzorová data). */
export function createContext(data: DocData): DocContext {
  const { revize, nastaveni, zakaznik } = data;
  const tiskSekce = parseJson<Record<string, boolean>>(revize.tiskSekce, {});
  return {
    ...data,
    strojni: parseJson<StrojniPrintData | null>(revize.strojniData, null),
    om: parseOdberneMisto(revize.odberneMistoData),
    vis: (key: string) => tiskSekce[key] !== false,
    firma: {
      nazev: revize.firmaJmeno || nastaveni?.firmaJmeno || '',
      adresa: revize.firmaAdresa || nastaveni?.firmaAdresa || '',
      ico: revize.firmaIco || nastaveni?.firmaIco || '',
      dic: revize.firmaDic || nastaveni?.firmaDic || '',
      telefon: nastaveni?.kontaktTelefon || '',
      email: nastaveni?.kontaktEmail || '',
      logo: nastaveni?.logo || '',
    },
    technik: {
      jmeno: revize.rtJmeno || nastaveni?.reviznniTechnikJmeno || '',
      opravneni: revize.rtCisloOpravneni || nastaveni?.reviznniTechnikCisloOpravneni || '',
      osvedceni: revize.rtCisloOsvedceni || nastaveni?.reviznniTechnikOsvedceni || '',
      adresa: nastaveni?.reviznniTechnikAdresa || '',
      ico: nastaveni?.reviznniTechnikIco || '',
    },
    provozovatel: {
      nazev: zakaznik?.nazev || revize.objednatel || '',
      adresa: zakaznik?.adresa || '',
      ico: zakaznik?.ico || '',
      kontakt: zakaznik?.kontaktOsoba || '',
      telefon: zakaznik?.telefon || '',
      email: zakaznik?.email || '',
    },
    typRevizeLabel: revize.typRevize === 'výchozí' ? 'Výchozí revize'
      : revize.typRevize === 'pravidelná' ? 'Pravidelná revize'
      : 'Mimořádná revize',
    H,
  };
}

/** Načte z databáze všechna data revize a vrátí kontext dokumentu. */
export async function buildContext(revizeId: number): Promise<DocContext> {
  const db = await import('../services/database');
  const { loadPrilohyForPrint } = await import('../services/prilohyUtils');

  const revize = await db.revizeService.getById(revizeId);
  if (!revize) throw new Error('Revize nebyla nalezena');

  const kategorie = String(revize.kategorieRevize || 'elektro').trim().toLowerCase();
  const isElektro = kategorie === 'elektro' || !['hromosvod', 'stroje', 'odberne_misto'].includes(kategorie);

  const [rozvadeceRaw, zavady, mistnostiRaw, pristroje, nastaveni] = await Promise.all([
    isElektro ? db.rozvadecService.getByRevize(revizeId) : Promise.resolve([]),
    db.zavadaService.getByRevize(revizeId),
    isElektro ? db.mistnostService.getByRevize(revizeId) : Promise.resolve([]),
    db.revizePristrojService.getByRevize(revizeId),
    db.nastaveniService.get(),
  ]);

  const rozvadece: RozvadecWithOkruhy[] = await Promise.all(
    rozvadeceRaw.map(async r => ({
      ...r,
      okruhy: r.id ? await db.okruhService.getByRozvadec(r.id) : [],
      chranice: r.id ? await db.cranicService.getByRozvadec(r.id) : [],
    })),
  );

  const mistnosti: MistnostWithZarizeni[] = await Promise.all(
    mistnostiRaw.map(async m => ({
      ...m,
      zarizeniList: m.id ? await db.zarizeniService.getByMistnost(m.id) : [],
    })),
  );

  let zakaznik: Zakaznik | null = null;
  if (revize.zakaznikId) {
    try {
      const all = await db.zakazniciService.getAll();
      zakaznik = all.find(z => z.id === revize.zakaznikId) || null;
    } catch { /* zákazník není nutný */ }
  }

  const prilohy = await loadPrilohyForPrint(revizeId);

  return createContext({
    revize: { ...revize, kategorieRevize: (isElektro ? 'elektro' : kategorie) as Revize['kategorieRevize'] },
    nastaveni: nastaveni || null,
    zakaznik,
    rozvadece,
    mistnosti,
    zavady,
    pristroje,
    prilohy,
  });
}
