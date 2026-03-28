/**
 * Testy pro typy & interfaces – ověřují, že objekty splňující
 * rozhraní jsou validní a mají požadované vlastnosti.
 *
 * Tyto testy jsou primárně compile-time kontroly + runtime validace tvarů.
 */
import { describe, it, expect } from 'vitest';
import type {
  Revize,
  Zakaznik,
  Firma,
  MericiPristroj,
  Rozvadec,
  Okruh,
  Zavada,
  Mistnost,
  Zarizeni,
  Zakazka,
  Nastaveni,
  ZavadaKatalog,
  PredvolenyText,
  KategorieRevize,
} from '../../types';

/* ═══════════════════════════════════════════
   REVIZE
   ═══════════════════════════════════════════ */
describe('Revize type', () => {
  const validRevize: Revize = {
    id: 1,
    cisloRevize: 'REV-2026-001',
    nazev: 'Revize bytového domu',
    adresa: 'Testovací 123, Praha',
    objednatel: 'Test s.r.o.',
    kategorieRevize: 'elektro',
    datum: '2026-01-15',
    termin: 36,
    typRevize: 'pravidelná',
    stav: 'rozpracováno',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should have required fields', () => {
    expect(validRevize.cisloRevize).toBeDefined();
    expect(validRevize.nazev).toBeDefined();
    expect(validRevize.adresa).toBeDefined();
    expect(validRevize.objednatel).toBeDefined();
    expect(validRevize.datum).toBeDefined();
    expect(validRevize.termin).toBeDefined();
    expect(validRevize.typRevize).toBeDefined();
    expect(validRevize.stav).toBeDefined();
  });

  it('should accept all stav values', () => {
    const stavy: Revize['stav'][] = ['rozpracováno', 'dokončeno', 'schváleno'];
    stavy.forEach((s) => {
      expect(['rozpracováno', 'dokončeno', 'schváleno']).toContain(s);
    });
  });

  it('should accept all typRevize values', () => {
    const typy: Revize['typRevize'][] = ['pravidelná', 'výchozí', 'mimořádná'];
    typy.forEach((t) => {
      expect(['pravidelná', 'výchozí', 'mimořádná']).toContain(t);
    });
  });

  it('should accept all kategorieRevize values', () => {
    const kategorie: KategorieRevize[] = ['elektro', 'hromosvod', 'stroje'];
    kategorie.forEach((k) => {
      expect(['elektro', 'hromosvod', 'stroje']).toContain(k);
    });
  });

  it('should accept optional hromosvod fields', () => {
    const hromosvodRevize: Revize = {
      ...validRevize,
      kategorieRevize: 'hromosvod',
      hromosvodTridaLps: 'III',
      hromosvodTypOchrany: 'vnější',
      hromosvodRokInstalace: '2020',
      hromosvodJimaciStav: 'vyhovující',
      hromosvodSvodyPocet: 4,
      hromosvodSvodyStav: 'vyhovující',
      hromosvodUzemneniStav: 'vyhovující',
    };
    expect(hromosvodRevize.hromosvodTridaLps).toBe('III');
    expect(hromosvodRevize.hromosvodSvodyPocet).toBe(4);
  });

  it('should accept optional strojniData field', () => {
    const strojniRevize: Revize = {
      ...validRevize,
      kategorieRevize: 'stroje',
      strojniData: JSON.stringify({ vyrobce: 'Test', rok: 2020 }),
    };
    expect(strojniRevize.strojniData).toBeTruthy();
    const parsed = JSON.parse(strojniRevize.strojniData!);
    expect(parsed.vyrobce).toBe('Test');
  });

  it('should accept vysledek values', () => {
    const vysledky: Revize['vysledek'][] = ['schopno', 'neschopno', 'podmíněně schopno'];
    vysledky.forEach((v) => {
      expect(['schopno', 'neschopno', 'podmíněně schopno']).toContain(v);
    });
  });
});

/* ═══════════════════════════════════════════
   ZÁKAZNÍK
   ═══════════════════════════════════════════ */
describe('Zakaznik type', () => {
  it('should have required nazev field', () => {
    const zakaznik: Zakaznik = { nazev: 'ABC s.r.o.' };
    expect(zakaznik.nazev).toBe('ABC s.r.o.');
  });

  it('should accept all optional fields', () => {
    const zakaznik: Zakaznik = {
      id: 1,
      nazev: 'ABC s.r.o.',
      adresa: 'Hlavní 1, Praha',
      ico: '12345678',
      dic: 'CZ12345678',
      kontaktOsoba: 'Jan Novák',
      telefon: '+420 123 456 789',
      email: 'jan@abc.cz',
      poznamka: 'VIP zákazník',
      pocetRevizi: 5,
    };
    expect(zakaznik.ico).toBe('12345678');
    expect(zakaznik.pocetRevizi).toBe(5);
  });
});

/* ═══════════════════════════════════════════
   FIRMA
   ═══════════════════════════════════════════ */
describe('Firma type', () => {
  it('should have required fields', () => {
    const firma: Firma = {
      nazev: 'ElektroServis s.r.o.',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(firma.nazev).toBe('ElektroServis s.r.o.');
  });
});

/* ═══════════════════════════════════════════
   MĚŘÍCÍ PŘÍSTROJ
   ═══════════════════════════════════════════ */
describe('MericiPristroj type', () => {
  it('should have required fields', () => {
    const pristroj: MericiPristroj = {
      nazev: 'Fluke 1653',
      vyrobce: 'Fluke',
      model: '1653B',
      vyrobniCislo: 'SN123456',
      typPristroje: 'multimetr',
      datumKalibrace: '2025-06-01',
      platnostKalibrace: '2026-06-01',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(pristroj.typPristroje).toBe('multimetr');
  });

  it('should accept all typPristroje values', () => {
    const typy: MericiPristroj['typPristroje'][] = [
      'multimetr',
      'meger',
      'smyckomer',
      'proudovy_chranic',
      'osciloskop',
      'jiny',
    ];
    expect(typy).toHaveLength(6);
  });
});

/* ═══════════════════════════════════════════
   ROZVADĚČ + OKRUH
   ═══════════════════════════════════════════ */
describe('Rozvadec type', () => {
  it('should have required fields', () => {
    const r: Rozvadec = {
      revizeId: 1,
      nazev: 'RE1',
      oznaceni: 'RE-01',
      umisteni: '1. NP',
      typRozvadece: 'hlavní',
      stupenKryti: 'IP40',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(r.revizeId).toBe(1);
    expect(r.stupenKryti).toBe('IP40');
  });
});

describe('Okruh type', () => {
  it('should have required fields', () => {
    const o: Okruh = {
      rozvadecId: 1,
      cislo: 1,
      nazev: 'Zásuvky kuchyně',
      jisticTyp: 'B',
      jisticProud: '16A',
      pocetFazi: 1,
      vodic: 'CYKY 3x2.5',
    };
    expect(o.cislo).toBe(1);
    expect(o.pocetFazi).toBe(1);
  });
});

/* ═══════════════════════════════════════════
   ZÁVADA
   ═══════════════════════════════════════════ */
describe('Zavada type', () => {
  it('should have required fields', () => {
    const z: Zavada = {
      revizeId: 1,
      popis: 'Chybí ochranný kryt',
      zavaznost: 'C2',
      stav: 'otevřená',
      fotky: [],
      datumZjisteni: new Date(),
    };
    expect(z.zavaznost).toBe('C2');
    expect(z.stav).toBe('otevřená');
  });

  it('should accept zavaznost values C1, C2, C3', () => {
    const values: Zavada['zavaznost'][] = ['C1', 'C2', 'C3'];
    expect(values).toEqual(['C1', 'C2', 'C3']);
  });
});

/* ═══════════════════════════════════════════
   MÍSTNOST + ZAŘÍZENÍ
   ═══════════════════════════════════════════ */
describe('Mistnost type', () => {
  it('should have required fields', () => {
    const m: Mistnost = {
      revizeId: 1,
      nazev: 'Kuchyně',
      typ: 'mokrý provoz',
      prostredi: 'AB5',
    };
    expect(m.nazev).toBe('Kuchyně');
  });
});

describe('Zarizeni type', () => {
  it('should have required fields', () => {
    const z: Zarizeni = {
      mistnostId: 1,
      nazev: 'Sporák',
      pocetKs: 1,
      trida: 'I',
      stav: 'OK',
    };
    expect(z.trida).toBe('I');
    expect(z.stav).toBe('OK');
  });
});

/* ═══════════════════════════════════════════
   ZAKÁZKA
   ═══════════════════════════════════════════ */
describe('Zakazka type', () => {
  it('should have required fields', () => {
    const z: Zakazka = {
      nazev: 'Revize škola',
      klient: 'Město Brno',
      adresa: 'Školní 5, Brno',
      datumPlanovany: '2026-04-01',
      stav: 'plánováno',
      priorita: 'vysoká',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(z.stav).toBe('plánováno');
    expect(z.priorita).toBe('vysoká');
  });
});

/* ═══════════════════════════════════════════
   NASTAVENÍ
   ═══════════════════════════════════════════ */
describe('Nastaveni type', () => {
  it('should have required fields', () => {
    const n: Nastaveni = {
      firmaJmeno: 'RevizeTech s.r.o.',
      firmaAdresa: 'Technická 10, Praha',
      firmaIco: '12345678',
      reviznniTechnikJmeno: 'Ing. Jan Novák',
      reviznniTechnikCisloOpravneni: 'E1A-123456',
    };
    expect(n.firmaJmeno).toBeDefined();
    expect(n.reviznniTechnikCisloOpravneni).toBeDefined();
  });
});

/* ═══════════════════════════════════════════
   KATALOG ZÁVAD
   ═══════════════════════════════════════════ */
describe('ZavadaKatalog type', () => {
  it('should have required fields', () => {
    const zk: ZavadaKatalog = {
      popis: 'Chybí ochranný vodič',
      zavaznost: 'C1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(zk.popis).toBe('Chybí ochranný vodič');
    expect(zk.zavaznost).toBe('C1');
  });

  it('should accept optional norma fields', () => {
    const zk: ZavadaKatalog = {
      popis: 'Nedostatečné krytí',
      zavaznost: 'C2',
      norma: 'ČSN 33 1500',
      clanek: 'čl. 5.3',
      zneniClanku: 'Stupeň krytí musí odpovídat vnějším vlivům.',
      kategorie: 'Rozvaděče',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(zk.norma).toBe('ČSN 33 1500');
  });
});

/* ═══════════════════════════════════════════
   PŘEDVOLENÝ TEXT
   ═══════════════════════════════════════════ */
describe('PredvolenyText type', () => {
  it('should have required fields', () => {
    const pt: PredvolenyText = {
      pole: 'popisZarizeni',
      nazev: 'Bytový dům',
      text: 'Elektrická instalace bytového domu ...',
    };
    expect(pt.pole).toBe('popisZarizeni');
    expect(pt.text).toBeTruthy();
  });
});
