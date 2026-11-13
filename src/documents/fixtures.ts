/**
 * Vzorová a prázdná data pro testování šablon (dev stránka /dev/sablony a testy).
 */
import type { Revize, Nastaveni, Zakaznik, Zavada, MericiPristroj, Okruh, Chranic, KategorieRevize } from '../types';
import { createDefaultOdberneMisto } from '../types/odberneMisto';
import { createContext, type DocContext, type RozvadecWithOkruhy, type StrojniPrintData } from './context';

const now = new Date('2026-07-21T08:00:00');

const nastaveni: Nastaveni = {
  firmaJmeno: 'Elektro Revize s.r.o.',
  firmaAdresa: 'Přívozní 7, 431 51 Klášterec nad Ohří',
  firmaIco: '12345678',
  firmaDic: 'CZ12345678',
  reviznniTechnikJmeno: 'Jan Novák',
  reviznniTechnikCisloOpravneni: '15368/5/22/R-EZ-E2A',
  reviznniTechnikOsvedceni: 'IBZ 1234/2022',
  reviznniTechnikAdresa: 'Přívozní 7, 431 51 Klášterec nad Ohří',
  kontaktTelefon: '777 123 456',
  kontaktEmail: 'revize@example.cz',
};

const zakaznik: Zakaznik = {
  id: 1,
  nazev: 'Město Žatec',
  adresa: 'nám. Svobody 1, 438 01 Žatec',
  ico: '00265781',
  kontaktOsoba: 'Ing. Petra Malá',
  telefon: '415 736 111',
};

const pristroje: MericiPristroj[] = [
  { id: 1, nazev: 'Eurotest', vyrobce: 'Metrel', model: 'MI 3125', vyrobniCislo: '13021110', typPristroje: 'jiny', datumKalibrace: '2026-01-10', platnostKalibrace: '2027-01-10', createdAt: now, updatedAt: now },
  { id: 2, nazev: 'Měřič izolačního odporu', vyrobce: 'Megger', model: 'MIT 410', vyrobniCislo: 'MX-2209', typPristroje: 'meger', datumKalibrace: '2026-02-01', platnostKalibrace: '2027-02-01', createdAt: now, updatedAt: now },
];

function baseRevize(kategorie: KategorieRevize, extra: Partial<Revize> = {}): Revize {
  return {
    id: 1,
    cisloRevize: '019/26/JN',
    nazev: 'Odpočinková zóna pro seniory',
    adresa: 'p.p.č. 5617/6, k.ú. Žatec',
    objednatel: 'Město Žatec',
    zakaznikId: 1,
    kategorieRevize: kategorie,
    datum: '2026-07-21',
    datumDokonceni: '2026-07-21',
    datumVypracovani: '2026-08-06',
    datumPlatnosti: '2030-07-21',
    termin: 48,
    typRevize: 'pravidelná',
    stav: 'dokončeno',
    vysledek: 'schopno',
    rozsahRevize: 'Elektrická instalace objektu od hlavního rozvaděče RH včetně všech podružných rozvaděčů a koncových obvodů.',
    predmetNeni: 'Spotřebiče připojené pohyblivým přívodem.',
    popisZarizeni: 'Objekt je napájen kabelovou přípojkou z pilíře PRIS.\nRozvod je proveden kabely CYKY uloženými pod omítkou a v lištách.',
    napetovaSoustava: '3+N+PE AC 50 Hz 400/230 V TN-C-S',
    ochranaOpatreni: JSON.stringify(['zakladni-izolace', 'samocine-odpojeni', 'proudovy-chranic', 'ochrane-pospojovani']),
    podklady: 'Projektová dokumentace skutečného provedení.\nProhlášení o shodě pro instalované výrobky.',
    provedeneUkony: 'Prohlídka, zkoušení a měření dle ČSN 33 2000-6.',
    vyhodnoceniPredchozich: 'Závady uvedené v předchozí revizi byly odstraněny.',
    zaver: 'Elektrická instalace odpovídá platným normám a je schopna bezpečného provozu.',
    rozdelovnik: 'Provozovatel: 2\nRevizní technik: 1',
    druhRozsahu: 'dilci',
    ucelRevize: 'Pravidelná kontrola po 4 letech provozu.',
    datumUvedeniDoProvozu: '2004',
    zdrojUvedeniDoProvozu: 'kolaudační rozhodnutí',
    prilohy: 'Protokol o určení vnějších vlivů',
    rtJmeno: 'Jan Novák',
    rtCisloOpravneni: '15368/5/22/R-EZ-E2A',
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

function okruhy(rozvadecId: number, count: number): Okruh[] {
  return Array.from({ length: count }, (_, i) => ({
    id: rozvadecId * 100 + i,
    rozvadecId,
    cislo: i + 1,
    nazev: i % 3 === 0 ? 'Zásuvky kuchyň' : i % 3 === 1 ? 'Osvětlení chodba a schodiště' : 'Venkovní osvětlení',
    jisticTyp: 'B',
    jisticProud: i % 2 ? '10' : '16',
    pocetFazi: 1,
    typKabelu: 'CYKY',
    pocetZil: '3',
    prurez: i % 2 ? '1,5' : '2,5',
    izolacniOdpor: '>500',
    impedanceSmycky: (0.42 + i * 0.03).toFixed(2),
    jeJisticochranac: i === 2,
    chrTyp: 'A',
    chrCitlivostMa: 30,
  }));
}

const chranic: Chranic = {
  id: 1, rozvadecId: 1, cislo: 1, nazev: 'Proudový chránič zásuvky', typ: 'A', proud: '40', citlivostMa: 30, pocetPolu: 4,
  testovacitlacitko: true, nevybavovaci: true, dotykoveNapeti: 1.2, vybavovacProud: 22, casOdpojeni1x: 24, casOdpojeni5x: 12,
};

function rozvadece(): RozvadecWithOkruhy[] {
  return [1, 2, 3].map(id => ({
    id, revizeId: 1, nazev: id === 1 ? 'Hlavní rozvaděč' : `Podružný rozvaděč ${id - 1}`, oznaceni: id === 1 ? 'RH' : `R${id - 1}`,
    umisteni: id === 1 ? 'Chodba 1.NP' : 'Sklad', typRozvadece: 'Oceloplechový', stupenKryti: 'IP 43',
    createdAt: now, updatedAt: now,
    okruhy: okruhy(id, id === 1 ? 22 : 12),
    chranice: id === 1 ? [chranic, { ...chranic, id: 2, cislo: 2, nazev: 'Chránič osvětlení' }] : [],
  }));
}

function zavady(): Zavada[] {
  return [
    { id: 1, revizeId: 1, popis: 'Chybí označení obvodů v rozvaděči RH.', zavaznost: 'C3', stav: 'otevřená', fotky: [], datumZjisteni: now, poznamka: 'Doplnit štítky.' },
    { id: 2, revizeId: 1, popis: 'Poškozený kryt zásuvky v kuchyni.', zavaznost: 'C2', stav: 'otevřená', fotky: [], datumZjisteni: now },
    { id: 3, revizeId: 1, typ: 'doporuceni', popis: 'Doplnit proudový chránič pro zásuvkové obvody v koupelně.', zavaznost: 'C3', stav: 'otevřená', fotky: [], datumZjisteni: now, zduvodneni: 'Snížení rizika úrazu elektrickým proudem při nepřímém dotyku.' },
  ];
}

const strojni: StrojniPrintData = {
  strojNazev: 'CNC frézka FV 25', strojSn: 'FV-2021-0042', strojVyrobce: 'Kovosvit MAS', strojRok: '2021',
  strojNapajeni: '3×400 V / 50 Hz', strojPrikon: '11', strojProud: '25', strojIp: 'IP 54', strojTrida: 'I', strojCe: 'ano', mistoHala: 'Hala B',
  strojPrivod: 'pevny',
  jisteni: [{ nazev: 'Hlavní jistič', typ: 'LTN-32C-3', hodnota: '32 A', charakteristika: 'C', stav: 'V', poznamka: '' }],
  izolace: [
    { misto: 'L1-L3 → PE', napeti: '500 V', hodnota: '>200', pozadavek: '≥1 MΩ', vysledek: 'V', poznamka: '' },
    { misto: 'Řídicí obvody', napeti: '250 V', hodnota: '120', pozadavek: '≥1 MΩ', vysledek: 'V', poznamka: '' },
    { misto: 'Topné obvody', napeti: '500 V', hodnota: '', pozadavek: '', vysledek: 'NA', poznamka: '' },
  ],
  spojitost: [{ misto: 'Rozvaděč → kostra', proud: '10 A', hodnota: '0,05', pozadavek: '≤0,1 Ω', vysledek: 'V', poznamka: '' }],
  impedance: [{ misto: 'Svorky stroje', hodnota: '0,38', pozadavek: '1,1 Ω', vysledek: 'V', poznamka: '' }],
  rcd: [{ nazev: 'RCD 1', idn: '30', typ: 'A', cas: '22', limit: '300', vysledek: 'V', poznamka: '' }],
  ostatni: [],
  kontroly: [
    { nazev: 'Tlačítko nouzového zastavení (STOP)', vysledek: 'V', poznamka: '' },
    { nazev: 'Bezpečnostní relé', vysledek: 'V', poznamka: '' },
    { nazev: 'Ochranné kryty', vysledek: 'N', poznamka: 'Chybí kryt řemenice' },
  ],
  pristroje: [],
  verdikt: 'pass',
  posudekZavady: '', posudekDoporuceni: 'Doplnit kryt řemenice do 30 dnů.', posudekNormy: 'ČSN EN 60204-1, zákon č. 250/2021 Sb.',
};

/** Vzorový kontext pro kategorii. `empty` = minimum dat (testuje tečky místo prázdných polí). */
export function sampleContext(kategorie: KategorieRevize, empty = false): DocContext {
  if (empty) {
    const revize: Revize = {
      cisloRevize: '', nazev: '', adresa: '', objednatel: '', kategorieRevize: kategorie, datum: '', termin: 0,
      typRevize: 'výchozí', stav: 'rozpracováno', createdAt: now, updatedAt: now,
    };
    return createContext({ revize, nastaveni: null, zakaznik: null, rozvadece: [], mistnosti: [], zavady: [], pristroje: [], prilohy: [] });
  }

  const extra: Partial<Revize> = {};
  if (kategorie === 'hromosvod') {
    Object.assign(extra, {
      hromosvodTridaLps: 'III', hromosvodTypOchrany: 'vnější', hromosvodRokInstalace: '2008', hromosvodNorma: 'ČSN EN 62305-3',
      hromosvodJimaciTyp: 'mřížový', hromosvodJimaciMaterial: 'FeZn', hromosvodJimaciStav: 'vyhovující',
      hromosvodSvodyPocet: 4, hromosvodSvodyMaterial: 'FeZn Ø8', hromosvodSvodyZkusebniSvorky: 4, hromosvodSvodyStav: 'částečně vyhovující',
      hromosvodSvodyPoznamka: 'Uvolněná podpěra svodu S3.',
      hromosvodUzemneniTyp: 'obvodový', hromosvodUzemneniMaterial: 'FeZn 30×4', hromosvodUzemneniStav: 'vyhovující',
      hromosvodSpdStav: 'nenainstalováno',
      hromosvodMereniOdporu: JSON.stringify([1, 2, 3, 4].map(i => ({ bod: `Zkušební svorka S${i}`, hodnota: (3.2 + i).toFixed(1), limit: '10', vyhovuje: true }))),
    } satisfies Partial<Revize>);
  }
  if (kategorie === 'stroje') extra.strojniData = JSON.stringify(strojni);
  if (kategorie === 'odberne_misto') {
    const om = createDefaultOdberneMisto();
    Object.assign(om, {
      distributor: 'ČEZ Distribuce, a. s.', ean: '859182400100123456', cisloElektromeru: '12345678', typPripojeni: 'kabel',
      soustava: '3+PEN AC 400/230 V TN-C', zpusobMereni: 'prime', jisticTyp: 'LTN', jisticProud: '25', jisticCharakteristika: 'B',
      pocetFazi: '3', plombovani: 'ano', rozvadecVyrobce: 'Elektro Kopřiva', rozvadecTyp: 'ER 112', rozvadecIp: 'IP 44',
      smlouvaCislo: '9001234567', smlouvaJistic: '25', smlouvaPrikon: '17', tarif: 'D02d',
      napetiU0: '231',
    });
    om.prohlidka = om.prohlidka.map(r => (r.nazev ? { ...r, vysledek: 'V' as const } : r));
    om.zkouseni = om.zkouseni.map(r => ({ ...r, vysledek: 'V' as const }));
    om.checklist = om.checklist.map((r, i) => ({ ...r, vysledek: i % 7 === 3 ? 'NA' as const : 'V' as const }));
    om.mereni = [{ oznaceni: 'Vývod RE', jisteni: 'B25/3', typKabelu: 'CYKY 4×10', zs: '0,31', u: '231', i: '745', ta: '<400', idn: '', riz: '>500', vysledek: 'V' }];
    extra.odberneMistoData = JSON.stringify(om);
  }

  const isElektro = kategorie === 'elektro';
  return createContext({
    revize: baseRevize(kategorie, extra),
    nastaveni,
    zakaznik,
    rozvadece: isElektro ? rozvadece() : [],
    mistnosti: isElektro ? [{
      id: 1, revizeId: 1, nazev: 'Kuchyň', patro: '1.NP', zarizeniList: [
        { id: 1, mistnostId: 1, nazev: 'Sporák', pocetKs: 1, trida: 'I', prikonW: 7500, ochranaPredDotykem: '0,6 Ω', stav: 'OK' },
        { id: 2, mistnostId: 1, nazev: 'Lednice', pocetKs: 1, trida: 'I', prikonW: 150, stav: 'OK' },
      ],
    }] : [],
    zavady: zavady(),
    pristroje,
    prilohy: [],
    rozsahPolozky: isElektro ? [
      { id: 1, revizeId: 1, typ: 'vyloucenoRozsah', nazev: 'Rozvaděč R3 (sklad nájemce)', duvod: 'Nepřístupný – nájemce nepředal klíče.' },
      { id: 2, revizeId: 1, typ: 'neovereno', nazev: 'Obvody venkovního osvětlení', duvod: 'Nebylo možné vypnout během provozu.' },
    ] : [],
    dokumenty: isElektro ? [
      { id: 1, revizeId: 1, nazev: 'Projekt skutečného provedení', druh: 'projekt', datumDokumentu: '2004', stav: 'predlozeno' },
      { id: 2, revizeId: 1, nazev: 'Předchozí revizní zpráva', druh: 'revize', datumDokumentu: '015/22/JN', stav: 'neaktualni', poznamka: 'Bez měření okruhů R2.' },
    ] : [],
  });
}

export const KATEGORIE_VSECHNY: KategorieRevize[] = ['elektro', 'hromosvod', 'stroje', 'odberne_misto'];
