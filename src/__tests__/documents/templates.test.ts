import { describe, it, expect } from 'vitest';
import { TPL } from '../../documents/templates';
import { sampleContext, KATEGORIE_VSECHNY } from '../../documents/fixtures';
import { createContext, type DocContext } from '../../documents/context';
import type { KategorieRevize, Revize } from '../../types';

/** Text dokumentu bez HTML značek. */
function text(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

/** Kontext se vzorovými daty a upravenou revizí. */
function ctxWith(k: KategorieRevize, patch: Partial<Revize>): DocContext {
  const base = sampleContext(k);
  return createContext({ ...base, revize: { ...base.revize, ...patch } });
}

function zprava(ctx: DocContext): string {
  const doc = TPL.instances(ctx).find(d => d.templateId.endsWith('-zprava'));
  if (!doc) throw new Error('Zpráva nenalezena');
  return doc.html;
}

describe('Registr šablon', () => {
  it('každá kategorie má hlavní zprávu', () => {
    for (const k of KATEGORIE_VSECHNY) {
      expect(TPL.list(k).some(t => t.scope === 'record'), k).toBe(true);
    }
  });

  it('elektro vytvoří protokol měření pro každý rozvaděč', () => {
    const docs = TPL.instances(sampleContext('elektro'));
    const protokoly = docs.filter(d => d.templateId === 'elektro-protokol-mereni');
    expect(protokoly).toHaveLength(3);
    expect(protokoly.map(d => d.title)).toEqual([
      'Protokol o měření – RH',
      'Protokol o měření – R1',
      'Protokol o měření – R2',
    ]);
  });

  it('bez rozvaděčů se protokol měření nevytvoří', () => {
    expect(TPL.instances(sampleContext('elektro', true)).map(d => d.templateId)).toEqual(['elektro-zprava']);
  });

  it('názvy souborů jsou bez diakritiky', () => {
    for (const d of TPL.instances(sampleContext('elektro'))) {
      expect(d.fileBase).toMatch(/^[A-Za-z0-9._-]+$/);
    }
  });
});

describe('Všechny šablony – vzorová i prázdná data', () => {
  for (const k of KATEGORIE_VSECHNY) {
    for (const empty of [false, true]) {
      it(`${k}${empty ? ' (prázdná data)' : ''}: žádné undefined/null a stránky s data-flow`, () => {
        for (const d of TPL.instances(sampleContext(k, empty))) {
          expect(d.html).toContain('class="page"');
          expect(text(d.html)).not.toMatch(/undefined|null|NaN|\[object/);
        }
      });
    }
  }

  it('prázdná data se tisknou jako tečky', () => {
    const html = zprava(sampleContext('elektro', true));
    expect(html).toContain('class="dotline"');
  });
});

describe('Escapování uživatelských dat', () => {
  it('HTML v datech se nevykoná', () => {
    const html = zprava(ctxWith('elektro', { nazev: '<img src=x onerror=alert(1)>', zaver: '<script>x()</script>' }));
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});

describe('Elektro – obsah zprávy', () => {
  it('závěr: ustálená formulace „je (není) z hlediska bezpečnosti schopno provozu“', () => {
    for (const k of ['elektro', 'odberne_misto'] as KategorieRevize[]) {
      expect(text(zprava(ctxWith(k, { vysledek: 'schopno' }))), k)
        .toContain('Revidované vyhrazené elektrické zařízení je z hlediska bezpečnosti schopno provozu.');
      expect(text(zprava(ctxWith(k, { vysledek: 'neschopno' }))), k)
        .toContain('Revidované vyhrazené elektrické zařízení není z hlediska bezpečnosti schopno provozu.');
    }
  });

  it('závěr bez vyplněného výsledku → tečky k ručnímu doplnění', () => {
    const html = zprava(ctxWith('elektro', { vysledek: undefined }));
    expect(html).toMatch(/elektrické zařízení <span class="dotline">\.+<\/span> z hlediska bezpečnosti/);
  });

  it('žádná zpráva neobsahuje přeškrtnutí', () => {
    for (const k of KATEGORIE_VSECHNY) {
      for (const d of TPL.instances(sampleContext(k))) expect(d.html, d.key).not.toContain('strike');
    }
  });

  it('tiskSekce skryje sekci a přečísluje následující', () => {
    const vse = text(zprava(sampleContext('elektro')));
    expect(vse).toContain('8. Vymezení rozsahu revize');
    expect(vse).toContain('10. Soupis použitých měřicích přístrojů');

    const bez = text(zprava(ctxWith('elektro', { tiskSekce: JSON.stringify({ rozsahRevize: false, pristroje: false }) })));
    expect(bez).not.toContain('Vymezení rozsahu revize');
    expect(bez).not.toContain('Soupis použitých měřicích přístrojů');
    expect(bez).toContain('8. Charakteristika revidovaného zařízení');
  });

  it('neplatný JSON v tiskSekce = vše viditelné', () => {
    expect(text(zprava(ctxWith('elektro', { tiskSekce: '{nevalidní' })))).toContain('Vymezení rozsahu revize');
  });

  it('ochrana před úrazem: JSON pole i prostý text', () => {
    expect(text(zprava(sampleContext('elektro')))).toContain('Doplňková ochrana proudovým chráničem');
    expect(text(zprava(ctxWith('elektro', { ochranaOpatreni: 'vlastní text' })))).toContain('vlastní text');
  });

  it('typ revize a důvod mimořádné revize', () => {
    const t = text(zprava(ctxWith('elektro', { typRevize: 'mimořádná', duvodMimoradne: 'Po požáru' })));
    expect(t).toContain('Mimořádná revize');
    expect(t).toContain('Odůvodnění mimořádné revize');
    expect(t).toContain('Po požáru');
  });

  it('okruhy obsahují jistič s chráničem a naměřené hodnoty', () => {
    const t = text(zprava(sampleContext('elektro')));
    expect(t).toContain('B/16/1 +A/30mA');
    expect(t).toContain('CYKY 3x2,5');
  });

  it('úvodní strana končí vynuceným zalomením', () => {
    const html = zprava(sampleContext('elektro'));
    expect(html.indexOf('6. Potvrzení o předání zprávy')).toBeLessThan(html.indexOf('<div class="pb"></div>'));
  });
});

describe('Hromosvod', () => {
  it('tiskSekce skryje jímací soustavu', () => {
    const t = text(zprava(ctxWith('hromosvod', { tiskSekce: JSON.stringify({ jimaciSoustava: false }) })));
    expect(t).not.toContain('Jímací soustava');
    expect(t).toContain('9. Svodové vedení');
  });

  it('popisky stavu a třídy LPS', () => {
    const t = text(zprava(sampleContext('hromosvod')));
    expect(t).toContain('III — Standardní ochrana');
    expect(t).toContain('Částečně vyhovující');
    expect(t).toContain('Celkem bodů: 4');
  });
});

describe('Strojní zařízení', () => {
  it('řádky s N/A se netisknou', () => {
    const t = text(zprava(sampleContext('stroje')));
    expect(t).toContain('L1-L3 → PE');
    expect(t).not.toContain('Topné obvody');
  });

  it('verdikt přeškrtne neplatnou variantu', () => {
    const html = zprava(sampleContext('stroje'));
    expect(html).toContain('Revidované strojní zařízení <b>je</b> z hlediska');
    expect(html).not.toContain('<b>není</b>');
  });

  it('bez strojních dat chybí sekce identifikace stroje', () => {
    expect(text(zprava(ctxWith('stroje', { strojniData: undefined })))).not.toContain('Identifikace strojního zařízení');
  });
});

describe('Odběrné místo', () => {
  it('vyhodnocení je na první straně (před zalomením)', () => {
    const html = zprava(sampleContext('odberne_misto'));
    expect(html.indexOf('5. Celkové vyhodnocení')).toBeLessThan(html.indexOf('<div class="pb"></div>'));
  });

  it('dynamické číslování sekcí za první stranou', () => {
    const t = text(zprava(sampleContext('odberne_misto')));
    expect(t).toContain('6. Smlouva o připojení a tarif odběru');
    expect(t).toContain('7. Technické parametry odběrného místa');
  });

  it('kontrolní seznam vynechá položky N/A', () => {
    const ctx = sampleContext('odberne_misto');
    const na = ctx.om.checklist.find(r => r.vysledek === 'NA');
    expect(na).toBeDefined();
    expect(text(zprava(ctx))).not.toContain(na!.nazev);
  });
});

describe('Doporučení (dark-pro)', () => {
  it('elektro: doporučení nejsou v tabulce závad a mají vlastní sekci', () => {
    const ctx = sampleContext('elektro');
    const t = text(zprava(ctx));
    expect(ctx.doporuceni).toHaveLength(1);
    expect(t).toContain('Doplnit proudový chránič pro zásuvkové obvody v koupelně.');
    expect(t).toContain('Snížení rizika úrazu elektrickým proudem');
    const zavadyIdx = t.indexOf('Přehled zjištěných závad');
    const dopIdx = t.indexOf('Doporučení (nesoulad se současnými normami)');
    expect(dopIdx).toBeGreaterThan(zavadyIdx);
    // Tabulka závad končí legendou dřív, než začne sekce doporučení
    expect(t.slice(zavadyIdx, dopIdx)).not.toContain('Doplnit proudový chránič');
  });

  it('elektro: sekce doporučení posune číslování dalších sekcí', () => {
    const s = text(zprava(sampleContext('elektro')));
    const nDop = parseInt(/(\d+)\. Doporučení \(nesoulad/.exec(s)![1], 10);
    expect(s).toContain(`${nDop + 1}. Vyhodnocení předchozích revizí`);

    const bez = sampleContext('elektro');
    const ctx = createContext({ ...bez, zavady: bez.zavady.filter(z => z.typ !== 'doporuceni') });
    const s2 = text(zprava(ctx));
    expect(s2).not.toContain('Doporučení (nesoulad');
    expect(s2).toContain(`${nDop}. Vyhodnocení předchozích revizí`);
  });

  for (const k of ['hromosvod', 'stroje', 'odberne_misto'] as KategorieRevize[]) {
    it(`${k}: doporučení jako blok v sekci závad`, () => {
      const t = text(zprava(sampleContext(k)));
      expect(t).toContain('Doporučení (nesoulad se současnými normami)');
      expect(t).toContain('Doplnit proudový chránič');
    });
  }
});

describe('Rozsah a podklady (dark-pro)', () => {
  it('elektro: druh rozsahu, účel a tabulky vyloučených/neověřených částí', () => {
    const t = text(zprava(sampleContext('elektro')));
    expect(t).toContain('Druh revize z hlediska rozsahu: Dílčí revize');
    expect(t).toContain('Účel revize: Pravidelná kontrola po 4 letech provozu.');
    expect(t).toContain('Části vyloučené z rozsahu revize:');
    expect(t).toContain('Rozvaděč R3 (sklad nájemce)');
    expect(t).toContain('Části, které nebylo možné ověřit:');
    expect(t).toContain('Obvody venkovního osvětlení');
  });

  it('elektro: tabulka dokumentů se stavem a uvedení do provozu', () => {
    const t = text(zprava(sampleContext('elektro')));
    expect(t).toContain('Projekt skutečného provedení');
    expect(t).toContain('Neaktuální');
    expect(t).toContain('Zařízení bylo uvedeno do provozu: 2004 (zjištěno na základě: kolaudační rozhodnutí).');
  });

  it('hromosvod a odběrné místo: uvedení do provozu v podkladech', () => {
    for (const k of ['hromosvod', 'odberne_misto'] as KategorieRevize[]) {
      expect(text(zprava(sampleContext(k))), k).toContain('Zařízení bylo uvedeno do provozu: 2004');
    }
  });
});

describe('Pevné šířky sloupců', () => {
  it('mřížka se šířkami má colgroup a třídu fixcols', () => {
    const html = zprava(sampleContext('elektro'));
    expect(html).toContain('<table class="grid fixcols"><colgroup><col style="width:25%">');
  });
});

describe('Náležitosti zprávy dle ČSN 33 1500', () => {
  it('data zahájení, ukončení, vypracování a předání ve všech zprávách', () => {
    for (const k of KATEGORIE_VSECHNY) {
      const t = text(zprava(sampleContext(k)));
      expect(t, k).toMatch(/(Zahájení revize|Revize zahájena):21\. 07\. 2026/);
      expect(t, k).toMatch(/(Předání zprávy|Zpráva předána):07\. 08\. 2026/);
    }
  });

  it('závady uvádějí ustanovení, se kterým jsou v rozporu, a riziko', () => {
    const t = text(zprava(sampleContext('elektro')));
    expect(t).toContain('V rozporu s: ČSN 33 2000-5-51 čl. 514.1');
    expect(t).toContain('Riziko: Záměna obvodů při odpojování.');
  });

  it('závada bez ustanovení → tečky k doplnění', () => {
    const base = sampleContext('elektro');
    const ctx = createContext({ ...base, zavady: base.zavady.map(z => ({ ...z, norma: undefined })) });
    expect(zprava(ctx)).toMatch(/V rozporu s: <span class="dotline">/);
  });

  it('„není schopno“ → zdůvodnění přímo v závěru (i prázdné jako tečky)', () => {
    const s1 = text(zprava(ctxWith('elektro', { vysledek: 'neschopno', vysledekOduvodneni: 'Chybí ochrana automatickým odpojením (ČSN 33 2000-4-41 čl. 411).' })));
    const iZaver = s1.indexOf('5. Vyhodnocení');
    expect(s1.indexOf('Zdůvodnění, proč zařízení nelze provozovat')).toBeGreaterThan(iZaver);
    expect(s1.indexOf('Chybí ochrana automatickým odpojením')).toBeLessThan(s1.indexOf('6. Potvrzení o předání zprávy'));
    expect(zprava(ctxWith('elektro', { vysledek: 'neschopno', vysledekOduvodneni: '' }))).toContain('Zdůvodnění, proč zařízení nelze provozovat');
  });

  it('hromosvod: závěr o souladu s normou z doby zřízení a funkčním stavu, bez „schopno provozu“', () => {
    const t = text(zprava(sampleContext('hromosvod')));
    expect(t).toContain('Provedení ochrany před bleskem odpovídá normě platné v době jejího zřízení (ČSN 34 1390) a její součásti jsou v dobrém funkčním stavu.');
    expect(t).not.toContain('schopno provozu');
    const ne = text(zprava(ctxWith('hromosvod', { hromosvodOdpovidaNorme: 'ne', hromosvodFunkcniStav: 'ne' })));
    expect(ne).toContain('neodpovídá normě platné v době jejího zřízení');
    expect(ne).toContain('nejsou v dobrém funkčním stavu');
    expect(ne).toContain('Zdůvodnění, proč zařízení nelze provozovat');
  });

  it('místo uložení podkladů a drobné nápravné úkony', () => {
    for (const k of ['elektro', 'hromosvod', 'odberne_misto', 'stroje'] as KategorieRevize[]) {
      const t = text(zprava(sampleContext(k)));
      expect(t, k).toContain('Podklady jsou uloženy: u provozovatele – kancelář správy budovy');
      expect(t, k).toContain('Drobné nápravné úkony provedené revizním technikem');
      expect(t, k).toContain('Dotažení svorek v rozvaděči RH.');
    }
  });
});
