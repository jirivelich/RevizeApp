/**
 * Elektro – zpráva o revizi elektrické instalace (record)
 * a protokol měření pro každý rozvaděč (group).
 * Obsah a pořadí sekcí odpovídá původnímu náhledu (ReportPrintPage).
 */
import { TPL } from '../registry';
import type { DocContext, RozvadecWithOkruhy } from '../context';
import type { Okruh, Chranic } from '../../types';
import { DEFAULT_NORMY_SOULAD } from '../../pages/RevizeDetail/constants';
import {
  flowPage, firmaHeader, titleBlock, sec, kv, kv4, grid, p, provozovatelRows, technikRows, pristrojeTable,
  zavadyTable, ZAVADY_LEGENDA, rozdelovnikTable, podpisy, resultBox, fotoZavad, prilohyPages, seznamPriloh, lhutaText,
} from './common';

export const OCHRANA_LABELS: Record<string, string> = {
  'zakladni-izolace': 'Základní izolace živých částí',
  'kryty-pricka': 'Přepážky nebo kryty',
  'zamezeni-dotyk': 'Zábrany nebo ochrana polohou',
  'selv': 'Ochrana malým napětím SELV',
  'pelv': 'Ochrana malým napětím PELV',
  'ochrane-pospojovani': 'Ochranné pospojování',
  'samocine-odpojeni': 'Automatické odpojení od zdroje',
  'proudovy-chranic': 'Doplňková ochrana proudovým chráničem',
  'ochranne-oddeleni': 'Ochranné oddělení obvodů',
  'dvojita-izolace': 'Dvojitá nebo zesílená izolace',
  'nevodive-prostredi': 'Nevodivé prostředí',
  'neuzemene-pospojeni': 'Neuzemeného místního pospojování',
};

function ochranaList(ctx: DocContext): string[] {
  const raw = ctx.revize.ochranaOpatreni;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((k: string) => OCHRANA_LABELS[k] || k) : [String(raw)];
  } catch {
    return [raw];
  }
}

function jisticText(o: Okruh): string {
  return [
    o.jisticTyp,
    o.jisticProud ? `/${o.jisticProud}` : '',
    o.pocetFazi ? `/${o.pocetFazi}` : '',
    o.jeJisticochranac ? ` +${o.chrTyp || 'A'}/${o.chrCitlivostMa ?? 30}mA` : '',
  ].join('').replace(/\/\//g, '/').replace(/\/$/, '');
}

function vodicText(o: Okruh): string {
  return (o.typKabelu || o.pocetZil || o.prurez)
    ? [o.typKabelu, o.pocetZil ? `${o.pocetZil}x${o.prurez ?? ''}` : o.prurez ?? ''].filter(Boolean).join(' ')
    : (o.vodic ?? '');
}

function okruhyTable(ctx: DocContext, roz: RozvadecWithOkruhy): string {
  const { H } = ctx;
  if (roz.okruhy.length === 0) return p(ctx, 'Žádné okruhy.');
  return grid(
    ['Č.', 'Jistič', 'Název okruhu', 'Vodič', 'Iz. odpor [MΩ]', 'Zs [Ω]'],
    ['6%', '14%', '30%', '18%', '16%', '16%'],
    roz.okruhy.map(o => [
      H.esc(o.cislo),
      H.v(jisticText(o), 6),
      H.v(o.nazev, 10),
      H.v(vodicText(o), 6),
      H.v(o.izolacniOdpor, 6),
      H.v(o.impedanceSmycky, 6),
    ]),
    [0, 4, 5],
  );
}

function chraniceTable(ctx: DocContext, chranice: Chranic[]): string {
  const { H } = ctx;
  if (chranice.length === 0) return '';
  const ok = (b: boolean) => (b ? 'ano' : 'ne');
  const rows = chranice.map(c => {
    const details: string[] = [];
    if (c.testovacitlacitko != null) details.push(`T: ${ok(c.testovacitlacitko)}`);
    if (c.nevybavovaci != null) details.push(`NV 0,5×IΔn: ${ok(c.nevybavovaci)}`);
    if (c.dotykoveNapeti != null) details.push(`Uc: ${c.dotykoveNapeti} V`);
    if (c.casOdpojeni5x != null) details.push(`tA 5×IΔn: ${c.casOdpojeni5x} ms`);
    if (c.casOdpojeni1_4x != null) details.push(`tA 1,4×IΔn: ${c.casOdpojeni1_4x} ms`);
    if (c.casOdpojeni2x != null) details.push(`tA 2×IΔn: ${c.casOdpojeni2x} ms`);
    if (c.zkouskaVypnuti2x != null) details.push(`Zkouška 2×IΔn: ${ok(c.zkouskaVypnuti2x)}`);
    if (c.selektivita != null) details.push(`Selektivita: ${ok(c.selektivita)}`);
    const main = `<tr><td class="c">${H.esc(c.cislo)}</td><td>${H.v(c.nazev, 8)}</td><td>${H.v(c.typ, 4)}</td><td>${H.v(c.proud, 4)}</td><td class="c">${H.v(c.citlivostMa, 4)}</td><td class="c">${H.v(c.pocetPolu, 3)}</td><td class="c">${H.v(c.vybavovacProud, 4)}</td><td class="c">${H.v(c.casOdpojeni1x, 4)}</td></tr>`;
    return details.length ? `${main}<tr class="detail"><td colspan="8">${H.esc(details.join('  •  '))}</td></tr>` : main;
  }).join('');
  return `<div class="sub-title keep">Proudové chrániče</div><table class="grid"><thead><tr>
    <th class="c" style="width:6%">Č.</th><th style="width:22%">Název</th><th style="width:9%">Typ</th><th style="width:9%">Proud</th>
    <th class="c" style="width:12%">IΔn [mA]</th><th class="c" style="width:8%">Pólů</th><th class="c" style="width:12%">IΔ [mA]</th><th class="c" style="width:12%">tA 1× [ms]</th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

function rozvadecTitle(ctx: DocContext, roz: RozvadecWithOkruhy): string {
  const { H } = ctx;
  return [
    `${H.esc(roz.nazev)}${roz.oznaceni ? ` (${H.esc(roz.oznaceni)})` : ''}${roz.umisteni ? ` – ${H.esc(roz.umisteni)}` : ''}`,
    roz.typRozvadece && H.esc(roz.typRozvadece),
    roz.stupenKryti && H.esc(roz.stupenKryti),
  ].filter(Boolean).join(' | ');
}

function rozvadecBlock(ctx: DocContext, roz: RozvadecWithOkruhy): string {
  return `<div class="split"><div class="sub-title keep">${rozvadecTitle(ctx, roz)}</div>${okruhyTable(ctx, roz)}${chraniceTable(ctx, roz.chranice)}</div>`;
}

function renderZprava(ctx: DocContext): string {
  const { H, revize, rozvadece, mistnosti, zavady, vis } = ctx;
  const ochrana = ochranaList(ctx);

  // Dynamické číslování – sekce 1–6 jsou pevné
  let n = 6;
  const num = (show: boolean) => (show ? ++n : 0);
  const nums = {
    popisZarizeni: num(vis('popisZarizeni') && !!revize.popisZarizeni),
    rozsahRevize: num(vis('rozsahRevize')),
    oduvodneniMimoradne: num(revize.typRevize === 'mimořádná' && !!revize.duvodMimoradne),
    charakteristika: num(vis('charakteristika') && !!(revize.napetovaSoustava || ochrana.length > 0)),
    pristroje: num(vis('pristroje')),
    podklady: num(vis('podklady')),
    provedeneUkony: num(vis('provedeneUkony')),
    rozvadece: num(true),
    prostory: num(mistnosti.length > 0),
    zavady: num(true),
    vyhodnoceniPredchozich: num(vis('vyhodnoceniPredchozich')),
    lhuta: num(true),
    oduvodneni: num(vis('vysledekOduvodneni') && !!revize.vysledekOduvodneni),
    zaver: num(vis('zaver') && !!revize.zaver),
    rozdelovnik: num(vis('rozdelovnik') && !!revize.rozdelovnik),
    prilohy: num(vis('prilohy') && !!(revize.prilohy || ctx.prilohy.length > 0)),
  };
  const t = (k: keyof typeof nums, text: string) => `${nums[k]}. ${text}`;

  const datumy = kv4([
    [['Datum revize:', H.v(H.d(revize.datum), 14)], ['Vypracování zprávy:', H.v(H.d(revize.datumVypracovani), 14)]],
    ...(revize.datumDokonceni ? [[['Datum dokončení:', H.esc(H.d(revize.datumDokonceni))], null] as [[string, string], null]] : []),
    [['Platnost do:', H.v(H.d(revize.datumPlatnosti), 14)], ['Lhůta příští revize:', revize.termin ? `${H.esc(revize.termin)} měsíců` : H.dots(14)]],
  ]);

  const parts: string[] = [
    firmaHeader(ctx),
    titleBlock(ctx, 'Zpráva o revizi elektrické instalace', H.esc(ctx.typRevizeLabel), revize.normySoulad || DEFAULT_NORMY_SOULAD),
    sec('1. Provozovatel (objednatel) revidovaného zařízení', kv(provozovatelRows(ctx))),
    sec('2. Identifikace objektu', kv([['Název objektu:', H.v(revize.nazev)], ['Adresa objektu:', H.v(revize.adresa)]])),
    sec('3. Revizní technik', kv(technikRows(ctx))),
    sec('4. Data a termíny', datumy),
    sec('5. Vyhodnocení',
      p(ctx, 'Revidované elektrické zařízení je:'),
      resultBox(`ELEKTRICKÁ INSTALACE JE Z HLEDISKA BEZPEČNOSTI ${H.vn(revize.vysledek, ['SCHOPNA', 'NESCHOPNA'])} PROVOZU`)),
    sec('6. Potvrzení o předání zprávy', podpisy(ctx)),
    '<div class="pb"></div>',
  ];

  if (nums.popisZarizeni) parts.push(sec(t('popisZarizeni', 'Popis revidovaného zařízení'), H.paras(revize.popisZarizeni)));
  if (nums.rozsahRevize) {
    const body = (revize.rozsahRevize || revize.predmetNeni)
      ? [
          revize.rozsahRevize ? `<p class="keep"><b>Předmět revize je:</b></p>${H.paras(revize.rozsahRevize)}` : '',
          revize.predmetNeni ? `<p class="keep"><b>Předmětem revize není/nejsou:</b></p>${H.paras(revize.predmetNeni)}` : '',
        ].join('')
      : H.paras('');
    parts.push(sec(t('rozsahRevize', 'Vymezení rozsahu revize'), body));
  }
  if (nums.oduvodneniMimoradne) parts.push(sec(t('oduvodneniMimoradne', 'Odůvodnění mimořádné revize'), H.paras(revize.duvodMimoradne)));
  if (nums.charakteristika) {
    const rows: [string, string][] = [];
    if (revize.napetovaSoustava) rows.push(['Napěťová soustava:', H.esc(revize.napetovaSoustava)]);
    if (ochrana.length) rows.push(['Ochrana před úrazem:', ochrana.map(H.esc).join('<br>')]);
    parts.push(sec(t('charakteristika', 'Charakteristika revidovaného zařízení'), kv(rows)));
  }
  if (nums.pristroje) parts.push(sec(t('pristroje', 'Soupis použitých měřicích přístrojů'), pristrojeTable(ctx)));
  if (nums.podklady) parts.push(sec(t('podklady', 'Seznam podkladů použitých k provedení revize'), H.paras(revize.podklady)));
  if (nums.provedeneUkony) parts.push(sec(t('provedeneUkony', 'Soupis provedených úkonů'), H.paras(revize.provedeneUkony)));

  parts.push(sec(t('rozvadece', 'Naměřené hodnoty – rozvaděče a okruhy'),
    rozvadece.length ? rozvadece.map(r => rozvadecBlock(ctx, r)).join('') : p(ctx, 'Žádné rozvaděče.')));

  if (nums.prostory) {
    parts.push(sec(t('prostory', 'Prostory a zařízení'), mistnosti.map(m => `<div class="split">
      <div class="sub-title keep">${H.esc(m.nazev)}${m.patro ? ` (${H.esc(m.patro)})` : ''}</div>
      ${m.zarizeniList.length ? grid(
        ['Zařízení', 'Označení', 'Ks', 'Třída', 'Příkon [W]', 'Ochrana', 'Stav'],
        ['22%', '13%', '7%', '8%', '12%', '20%', '18%'],
        m.zarizeniList.map(z => [
          H.v(z.nazev, 8), H.v(z.oznaceni, 6), H.esc(z.pocetKs), H.esc(z.trida), H.v(z.prikonW, 4), H.v(z.ochranaPredDotykem, 6),
          z.stav === 'OK' ? 'OK' : z.stav === 'závada' ? '<b>Závada</b>' : H.dots(6),
        ]),
        [2, 3, 4],
      ) : p(ctx, 'Žádná zařízení.')}
    </div>`).join('')));
  }

  const maFotky = zavady.some(z => Array.isArray(z.fotky) && z.fotky.length > 0);
  parts.push(sec(t('zavady', 'Přehled zjištěných závad'),
    zavady.length
      ? zavadyTable(ctx, true) + ZAVADY_LEGENDA + (maFotky ? p(ctx, 'Fotografie k závadám jsou přiloženy na následujících stranách.', 'small') : '')
      : '<p><b>Při revizi nebyly zjištěny žádné závady.</b></p>'));

  if (nums.vyhodnoceniPredchozich) parts.push(sec(t('vyhodnoceniPredchozich', 'Vyhodnocení předchozích revizí'), H.paras(revize.vyhodnoceniPredchozich)));
  parts.push(sec(t('lhuta', 'Doporučená lhůta provedení příští revize'),
    `<p>Příští revize by měla být provedena nejpozději do <b>${lhutaText(ctx)}</b>.</p>`));
  if (nums.oduvodneni) parts.push(sec(t('oduvodneni', 'Odůvodnění'), H.paras(revize.vysledekOduvodneni)));
  if (nums.zaver) parts.push(sec(t('zaver', 'Závěr'), H.paras(revize.zaver)));
  if (nums.rozdelovnik) parts.push(sec(t('rozdelovnik', 'Rozdělovník'), rozdelovnikTable(ctx, revize.rozdelovnik || '')));
  if (nums.prilohy) parts.push(sec(t('prilohy', 'Přílohy'), seznamPriloh(ctx)));

  parts.push(fotoZavad(ctx));
  parts.push(prilohyPages(ctx));

  return flowPage(ctx, 'Zpráva o revizi elektrické instalace', parts.join(''));
}

function renderProtokolMereni(ctx: DocContext): string {
  const { H, revize } = ctx;
  const roz = ctx.group as RozvadecWithOkruhy;
  const parts = [
    firmaHeader(ctx),
    titleBlock(ctx, 'Protokol o měření', `${H.esc(roz.nazev)}${roz.oznaceni ? ` (${H.esc(roz.oznaceni)})` : ''}`),
    sec('Identifikace', kv([
      ['Objekt:', H.v(revize.nazev)],
      ['Adresa:', H.v(revize.adresa)],
      ['Rozvaděč:', H.v(roz.nazev)],
      ['Označení:', H.v(roz.oznaceni)],
      ['Umístění:', H.v(roz.umisteni)],
      ['Typ / krytí:', H.v([roz.typRozvadece, roz.stupenKryti].filter(Boolean).join(' / '))],
      ['Datum měření:', H.v(H.d(revize.datum), 14)],
    ])),
    sec('Naměřené hodnoty – okruhy', okruhyTable(ctx, roz)),
    roz.chranice.length ? sec('Měření proudových chráničů', chraniceTable(ctx, roz.chranice)) : '',
    roz.poznamka ? sec('Poznámka', H.paras(roz.poznamka)) : '',
    sec('Měřicí přístroje', pristrojeTable(ctx)),
    sec('Potvrzení', podpisy(ctx)),
  ];
  return flowPage(ctx, `Protokol o měření – ${roz.nazev}`, parts.join(''));
}

TPL.register({
  id: 'elektro-zprava',
  name: 'Zpráva o revizi elektrické instalace',
  scope: 'record',
  order: 10,
  kategorie: ['elektro'],
  render: renderZprava,
  fileName: ctx => `${ctx.revize.cisloRevize} ${ctx.provozovatel.nazev} ${ctx.revize.adresa} instalace`,
});

TPL.register({
  id: 'elektro-protokol-mereni',
  name: 'Protokol o měření',
  scope: 'group',
  order: 20,
  kategorie: ['elektro'],
  groups: ctx => ctx.rozvadece.map((r, i) => ({ key: String(r.id ?? i), label: r.oznaceni || r.nazev || `Rozvaděč ${i + 1}`, item: r })),
  render: renderProtokolMereni,
  fileName: ctx => `${ctx.revize.cisloRevize} protokol mereni`,
});
