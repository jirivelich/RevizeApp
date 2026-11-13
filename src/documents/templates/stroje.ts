/**
 * Strojní zařízení – zpráva o revizi elektrické instalace strojního zařízení.
 * Obsah a pořadí sekcí odpovídá původnímu náhledu (StrojniZarizeniPrintPage).
 * Řádky s N/A a prázdné řádky se netisknou.
 */
import { TPL } from '../registry';
import type { DocContext } from '../context';
import {
  flowPage, firmaHeader, titleBlock, sec, kv, kv4, grid, p, provozovatelRows, technikRows, pristrojeTable,
  zavadyTable, doporuceniBlock, podpisy, resultBox, prilohyPages, lhutaText,
  datumyRevize, zduvodneniNeschopno, ulozeniPodkladu, napravneUkonyBody, NAPRAVNE_UKONY_TITLE,
} from './common';

/** Výsledek V/N jako text do tabulky. */
export function stavText(ctx: DocContext, v: string): string {
  switch (v) {
    case 'V': return 'Vyhovuje';
    case 'N': return '<b>NEVYHOVUJE</b>';
    case 'NA': return 'N/A';
    default: return ctx.H.dots(8);
  }
}

function render(ctx: DocContext): string {
  const { H, revize, zavadyPouze: zavady, pristroje } = ctx;
  const sd = ctx.strojni;
  const s = (v: string) => stavText(ctx, v);
  const has = (...xs: (string | undefined)[]) => xs.some(x => !!x && String(x).trim() !== '');

  const jisteni = (sd?.jisteni || []).filter(r => (has(r.nazev, r.typ) || r.stav) && r.stav !== 'NA');
  const izolace = (sd?.izolace || []).filter(r => (has(r.misto, r.hodnota) || r.vysledek) && r.vysledek !== 'NA');
  const spojitost = (sd?.spojitost || []).filter(r => (has(r.misto, r.hodnota) || r.vysledek) && r.vysledek !== 'NA');
  const impedance = (sd?.impedance || []).filter(r => (has(r.misto, r.hodnota) || r.vysledek) && r.vysledek !== 'NA');
  const rcd = (sd?.rcd || []).filter(r => (has(r.nazev, r.cas) || r.vysledek) && r.vysledek !== 'NA');
  const ostatni = (sd?.ostatni || []).filter(r => (has(r.nazev, r.hodnota) || r.vysledek) && r.vysledek !== 'NA');
  const kontroly = (sd?.kontroly || []).filter(r => has(r.nazev) && r.vysledek && r.vysledek !== 'NA');
  const pristrojeInline = (sd?.pristroje || []).filter(r => has(r.typ));

  const parts: string[] = [
    firmaHeader(ctx),
    titleBlock(ctx, 'Zpráva o revizi elektrické instalace strojního zařízení',
      H.esc(ctx.typRevizeLabel) + (sd?.posudekNormy ? `<div class="small">dle ${H.esc(sd.posudekNormy)}</div>` : '')),
    sec('1. Provozovatel (objednatel)', kv(provozovatelRows(ctx, revize.adresa))),
    sec('2. Místo ověření', kv([
      ['Adresa:', H.v(revize.adresa)],
      ['Datum ověření:', H.v(H.d(revize.datum), 14)],
      ...(sd?.mistoHala ? [['Hala / pracoviště:', H.esc(sd.mistoHala)] as [string, string]] : []),
    ])),
  ];

  if (sd) {
    parts.push(sec('3. Identifikace strojního zařízení – štítek', kv4([
      [['Název / typ stroje:', H.v(sd.strojNazev, 14)], ['Výrobce:', H.v(sd.strojVyrobce, 14)]],
      [['Výrobní číslo (SN):', H.v(sd.strojSn, 14)], ['Rok výroby:', H.v(sd.strojRok, 8)]],
      [['Napájení:', H.v(sd.strojNapajeni, 14)], ['Příkon:', sd.strojPrikon ? `${H.esc(sd.strojPrikon)} kW` : H.dots(8)]],
      [['Jmenovitý proud:', sd.strojProud ? `${H.esc(sd.strojProud)} A` : H.dots(8)], ['Stupeň ochrany:', H.v(sd.strojIp, 8)]],
      [['Třída ochrany:', H.v(sd.strojTrida, 8)], ['CE / Prohlášení o shodě:', H.v(sd.strojCe, 8)]],
      [['Připojení stroje:', sd.strojPrivod === 'pevny' ? 'Pevný přívod' : sd.strojPrivod === 'pohyblivy' ? 'Pohyblivý přívod' : H.dots(14)], null],
    ])));
  }

  parts.push(
    sec('4. Revizní technik', kv(technikRows(ctx))),
    sec('5. Důležitá data', kv4([
      ...datumyRevize(ctx),
      [['Lhůta příštího ověření:', revize.lhutaText?.trim() ? H.esc(revize.lhutaText.trim()) : revize.termin ? `${H.esc(revize.termin)} měsíců` : H.dots(14)],
        !revize.lhutaText?.trim() && revize.datumPlatnosti ? ['Platnost do:', H.esc(H.d(revize.datumPlatnosti))] : null],
    ]), ulozeniPodkladu(ctx)),
  );

  if (revize.typRevize === 'mimořádná' && revize.duvodMimoradne) {
    parts.push(sec('5a. Odůvodnění mimořádné revize', H.paras(revize.duvodMimoradne)));
  }

  if (jisteni.length) parts.push(sec('6. Jištění strojního zařízení', grid(
    ['Prvek jištění', 'Typ / označení', 'Jmen. hodnota', 'Charakteristika', 'Stav', 'Pozn.'],
    ['24%', '22%', '14%', '16%', '14%', '10%'],
    jisteni.map(r => [H.v(r.nazev, 8), H.v(r.typ, 6), H.v(r.hodnota, 6), H.v(r.charakteristika, 6), s(r.stav), H.esc(r.poznamka)]))));

  if (izolace.length) parts.push(sec('7. Měření izolačního odporu (ČSN EN 60204-1)', grid(
    ['Měřené místo / obvod', 'Zkuš. napětí', 'Naměřeno (MΩ)', 'Požadavek', 'Výsledek', 'Pozn.'],
    ['30%', '14%', '16%', '14%', '14%', '12%'],
    izolace.map(r => [H.v(r.misto, 8), H.v(r.napeti, 6), H.v(r.hodnota, 6), H.v(r.pozadavek, 6), s(r.vysledek), H.esc(r.poznamka)]))));

  if (spojitost.length) parts.push(sec('8. Měření spojitosti ochranných vodičů (PE)', grid(
    ['Měřené místo', 'Proud zkoušky', 'Naměřeno (Ω)', 'Požadavek', 'Výsledek', 'Pozn.'],
    ['30%', '14%', '16%', '14%', '14%', '12%'],
    spojitost.map(r => [H.v(r.misto, 8), H.v(r.proud, 6), H.v(r.hodnota, 6), H.v(r.pozadavek, 6), s(r.vysledek), H.esc(r.poznamka)]))));

  if (impedance.length) parts.push(sec('9. Měření impedance poruchové smyčky', grid(
    ['Měřené místo', 'Naměřeno (Ω)', 'Požadavek (max.)', 'Výsledek', 'Pozn.'],
    ['30%', '20%', '20%', '14%', '16%'],
    impedance.map(r => [H.v(r.misto, 8), H.v(r.hodnota, 6), H.v(r.pozadavek, 6), s(r.vysledek), H.esc(r.poznamka)]))));

  if (rcd.length) parts.push(sec('10. Měření proudových chráničů (RCD)', grid(
    ['Označení RCD', 'IΔn (mA)', 'Typ', 'Čas (ms)', 'Limit (ms)', 'Výsledek', 'Pozn.'],
    ['18%', '10%', '12%', '14%', '12%', '14%', '20%'],
    rcd.map(r => [H.v(r.nazev, 6), H.v(r.idn, 4), H.v(r.typ, 4), H.v(r.cas, 4), H.v(r.limit, 4), s(r.vysledek), H.esc(r.poznamka)]))));

  if (ostatni.length) parts.push(sec('10a. Ostatní měření', grid(
    ['Měření', 'Místo', 'Naměřeno', 'Požadavek', 'Výsledek', 'Pozn.'],
    ['24%', '20%', '16%', '14%', '12%', '14%'],
    ostatni.map(r => [H.v(r.nazev, 6), H.v(r.misto, 6), r.hodnota ? H.esc(`${r.hodnota}${r.jednotka ? ` ${r.jednotka}` : ''}`) : H.dots(6), H.v(r.pozadavek, 6), s(r.vysledek), H.esc(r.poznamka)]))));

  if (kontroly.length) parts.push(sec('11. Funkční kontroly', grid(
    ['Kontrolovaný prvek', 'Výsledek', 'Poznámka'], ['50%', '20%', '30%'],
    kontroly.map(r => [H.esc(r.nazev), s(r.vysledek), H.esc(r.poznamka)]))));

  parts.push(sec('12. Soupis použitých měřicích přístrojů',
    pristroje.length ? pristrojeTable(ctx)
      : pristrojeInline.length ? grid(
          ['Přístroj / typ', 'Výrobní číslo', 'Kalibrován do', 'Třída přesnosti', 'Poznámka'],
          ['30%', '20%', '18%', '16%', '16%'],
          pristrojeInline.map(r => [H.esc(r.typ), H.v(r.sn, 6), H.v(r.kalibrace, 6), H.v(r.trida, 4), H.esc(r.poznamka)]))
        : p(ctx, 'Žádné přístroje nebyly přiřazeny.')));

  parts.push(sec('13. Přehled zjištěných závad',
    zavady.length ? zavadyTable(ctx)
      : sd?.posudekZavady ? `<p class="keep"><b>Zjištěné nedostatky:</b></p>${H.paras(sd.posudekZavady)}`
      : '<p><b>Při ověření nebyly zjištěny žádné závady.</b></p>',
    doporuceniBlock(ctx),
    sd?.posudekDoporuceni ? `<p class="keep"><b>Doporučení / termín odstranění závad:</b></p>${H.paras(sd.posudekDoporuceni)}` : ''));
  if (revize.napravneUkony?.trim()) parts.push(sec(NAPRAVNE_UKONY_TITLE, napravneUkonyBody(ctx)));

  parts.push(sec('14. Vyhodnocení',
    resultBox(`Revidované strojní zařízení ${H.vn(sd?.verdikt, ['je', 'není'])} z hlediska zajištění ochrany před úrazem el. proudem schopno provozu.`),
    zduvodneniNeschopno(ctx, sd?.verdikt === 'fail'),
    '<p class="small"><i>Tato revize nemůže nahradit kontrolu bezpečnosti provozu strojního zařízení podle nařízení vlády č.&nbsp;378/2001&nbsp;Sb.</i></p>'));

  parts.push(sec('15. Doporučená lhůta provedení příštího ověření',
    `<p>Příští ověření by mělo být provedeno nejpozději do <b>${lhutaText(ctx, true)}</b>.</p>`));
  parts.push(sec('16. Potvrzení o předání protokolu', podpisy(ctx, 'Ev. č.')));
  parts.push(prilohyPages(ctx));

  return flowPage(ctx, 'Zpráva o revizi elektrické instalace strojního zařízení', parts.join(''));
}

TPL.register({
  id: 'stroje-zprava',
  name: 'Zpráva o revizi strojního zařízení',
  scope: 'record',
  order: 10,
  kategorie: ['stroje'],
  render,
  fileName: ctx => `${ctx.revize.cisloRevize} ${ctx.provozovatel.nazev} ${ctx.revize.adresa} stroj`,
});
