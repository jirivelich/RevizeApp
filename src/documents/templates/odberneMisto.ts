/**
 * Odběrné místo – zpráva o revizi elektrické instalace odběrného místa.
 * Obsah a pořadí sekcí odpovídá původnímu náhledu (OdberneMistoPrintPage),
 * vyhodnocení je stručně na první straně.
 */
import { TPL } from '../registry';
import type { DocContext } from '../context';
import { porovnejJistic, validujParametry, PPNN_ZDROJ, STAV_LABEL, type KontrolaPolozka, type Vysledek } from '../../types/odberneMisto';
import {
  flowPage, firmaHeader, titleBlock, sec, kv, kv4, grid, provozovatelRows, technikRows, pristrojeTable,
  zavadyTable, doporuceniBlock, uvedeniDoProvozu, podpisy, resultBox, prilohyPages, lhutaText,
} from './common';

/** Řádky s vyplněným výsledkem; N/A se v tisku vynechává. */
const filled = (rows: KontrolaPolozka[]) => rows.filter(r => r.nazev.trim() && r.vysledek && r.vysledek !== 'NA');

function render(ctx: DocContext): string {
  const { H, revize, zavadyPouze: zavady, om, vis } = ctx;
  const stav = (v: Vysledek) => (v === 'N' ? `<b>${STAV_LABEL.N}</b>` : v ? STAV_LABEL[v] : H.dots(8));

  const prohlidka = filled(om.prohlidka);
  const zkouseni = filled(om.zkouseni);
  const checklist = filled(om.checklist);
  const skupiny = checklist.reduce<[string, KontrolaPolozka[]][]>((acc, r) => {
    const nazev = r.skupina || 'Ostatní';
    const ex = acc.find(([sk]) => sk === nazev);
    if (ex) ex[1].push(r); else acc.push([nazev, [r]]);
    return acc;
  }, []);
  const upozorneni = validujParametry(om);
  const mereni = om.mereni.filter(m => m.oznaceni.trim() || m.zs.trim() || m.riz.trim());
  const shoda = porovnejJistic(om);
  const smlouvaVyplnena = !!(om.smlouvaCislo || om.smlouvaJistic || om.smlouvaPrikon || om.tarif);
  const parametryVyplneny = !!(om.soustava || om.jisticProud || om.jisticTyp || om.rozvadecTyp || om.zpusobMereni);

  // Dynamické číslování – sekce 1–5 jsou pevné
  let n = 5;
  const num = (show: boolean) => (show ? ++n : 0);
  const nums = {
    smlouva: num(vis('smlouva') && smlouvaVyplnena),
    parametry: num(vis('parametry') && parametryVyplneny),
    rozsah: num(vis('rozsahRevize')),
    popis: num(vis('popisZarizeni') && !!revize.popisZarizeni),
    podklady: num(vis('podklady') && !!revize.podklady),
    pristroje: num(vis('pristroje')),
    prohlidka: num(vis('prohlidka') && prohlidka.length > 0),
    zkouseni: num(vis('zkouseni') && zkouseni.length > 0),
    mereni: num(vis('mereni') && mereni.length > 0),
    checklist: num(vis('checklist') && checklist.length > 0),
    zavady: num(true),
    vyhodnoceni: num(true),
    zaver: num(vis('zaver') && !!revize.zaver),
    lhuta: num(true),
    rozdelovnik: num(vis('rozdelovnik') && !!revize.rozdelovnik),
    predani: num(true),
  };
  const t = (k: keyof typeof nums, text: string) => `${nums[k]}. ${text}`;
  const vysledek = resultBox(`ELEKTRICKÁ INSTALACE ODBĚRNÉHO MÍSTA ${H.vn(revize.vysledek, ['JE', 'NENÍ'])} Z HLEDISKA BEZPEČNOSTI SCHOPNA PROVOZU`);
  const typPripojeni = om.typPripojeni === 'kabel' ? 'Kabelová přípojka' : om.typPripojeni === 'vzdusne' ? 'Vzdušné vedení' : om.typPripojeni === 'jine' ? 'Jiné' : '';

  const parts: string[] = [
    firmaHeader(ctx),
    titleBlock(ctx, 'Zpráva o revizi elektrické instalace odběrného místa',
      `${H.esc(ctx.typRevizeLabel)}<div class="small">${H.esc(revize.normySoulad?.trim() || 'dle ČSN 33 1500 a ČSN 33 2000-6')}</div>`),
    sec('1. Provozovatel (objednatel)', kv(provozovatelRows(ctx, revize.adresa))),
    sec('2. Identifikace odběrného místa', kv([
      ['Revidovaný objekt:', H.v(revize.nazev)],
      ['Adresa:', H.v(revize.adresa)],
      ...(om.parcela ? [['Parcela / č.p.:', H.esc(om.parcela)] as [string, string]] : []),
      ['Distributor:', H.v(om.distributor)],
      ['EAN / OPM:', H.v(om.ean)],
      ['Číslo elektroměru:', H.v(om.cisloElektromeru)],
      ['Typ připojení:', H.v(typPripojeni)],
      ...(om.umisteniRozvadece ? [['Umístění rozvaděče:', H.esc(om.umisteniRozvadece)] as [string, string]] : []),
    ])),
    sec('3. Revizní technik', kv(technikRows(ctx))),
    sec('4. Důležitá data', kv([
      ['Revize provedena:', H.v(H.d(revize.datum), 14)],
      ['Revize ukončena:', H.v(H.d(revize.datumDokonceni), 14)],
      ['Revize vystavena:', H.v(H.d(revize.datumVypracovani), 14)],
      ...(!revize.lhutaText?.trim() && revize.datumPlatnosti ? [['Platnost do:', H.esc(H.d(revize.datumPlatnosti))] as [string, string]] : []),
    ]), revize.typRevize === 'mimořádná' && revize.duvodMimoradne ? `<p><b>Důvod mimořádné revize:</b> ${H.esc(revize.duvodMimoradne)}</p>` : ''),
    sec('5. Celkové vyhodnocení', vysledek),
    '<div class="pb"></div>',
  ];

  if (nums.smlouva) {
    const typOdberu = om.smlouvaTypOdberu === 'novy' ? 'Nový odběr' : om.smlouvaTypOdberu === 'zmena' ? 'Změna odběru' : om.smlouvaTypOdberu === 'rozsireni' ? 'Rozšíření odběru' : '';
    parts.push(sec(t('smlouva', 'Smlouva o připojení a tarif odběru'),
      kv4([
        [['Číslo smlouvy:', H.v(om.smlouvaCislo, 12)], ['Datum uzavření:', H.v(H.d(om.smlouvaDatum), 12)]],
        [['Platnost do:', H.v(H.d(om.smlouvaPlatnost), 12)], ['Typ odběru:', H.v(typOdberu, 12)]],
        [['Rezervovaný příkon:', om.smlouvaPrikon ? `${H.esc(om.smlouvaPrikon)} kW` : H.dots(10)], ['Hlavní jistič dle smlouvy:', om.smlouvaJistic ? `${H.esc(om.smlouvaJistic)} A` : H.dots(10)]],
        [['Distribuční sazba:', H.v(om.tarif, 10)], ['HDO:', H.v(om.hdoKod, 10)]],
      ]),
      om.smlouvaUcel ? kv([['Účel odběru:', H.esc(om.smlouvaUcel)]]) : '',
      shoda !== 'neurceno' ? `<p><b>Soulad se smlouvou:</b> ${shoda === 'shoda'
        ? `Osazený hlavní jistič (${H.esc(om.jisticProud)} A) odpovídá hodnotě sjednané ve smlouvě.`
        : `Osazený hlavní jistič (${H.esc(om.jisticProud)} A) <b>NEODPOVÍDÁ</b> hodnotě sjednané ve smlouvě (${H.esc(om.smlouvaJistic)} A).`}</p>` : '',
      om.smlouvaPoznamka ? H.paras(om.smlouvaPoznamka) : ''));
  }

  if (nums.parametry) {
    parts.push(sec(t('parametry', 'Technické parametry odběrného místa'),
      kv4([
        [['Napájecí soustava:', H.v(om.soustava || revize.napetovaSoustava, 12)], ['Způsob měření:', H.v(om.zpusobMereni === 'prime' ? 'Přímé' : om.zpusobMereni === 'neprime' ? 'Nepřímé' : '', 12)]],
        [['Hlavní jistič:', H.v([om.jisticTyp, om.jisticProud && `${om.jisticProud} A`, om.jisticCharakteristika].filter(Boolean).join(', '), 12)],
          ['Počet fází / plombovatelnost:', H.v([om.pocetFazi && `${om.pocetFazi}f`, om.plombovani && (om.plombovani === 'ano' ? 'plombovatelný' : 'neplombovatelný')].filter(Boolean).join(', '), 12)]],
        [['Rozvaděč:', H.v([om.rozvadecVyrobce, om.rozvadecTyp].filter(Boolean).join(' '), 12)], ['Krytí / třída ochrany:', H.v([om.rozvadecIp, om.rozvadecTrida].filter(Boolean).join(' / '), 12)]],
      ]),
      om.rozvadecProhlaseni ? kv([['Prohlášení o shodě:', H.esc(om.rozvadecProhlaseni)]]) : ''));
  }

  if (nums.rozsah) parts.push(sec(t('rozsah', 'Všeobecně – rozsah revize'),
    `<p><b>Revize zahrnuje:</b> ${H.v(revize.rozsahRevize, 40)}</p>`,
    revize.predmetNeni ? `<p><b>Revize nezahrnuje:</b> ${H.esc(revize.predmetNeni)}</p>` : ''));
  if (nums.popis) parts.push(sec(t('popis', 'Stručný technický popis'), H.paras(revize.popisZarizeni)));
  if (nums.podklady) parts.push(sec(t('podklady', 'Předložené podklady'), H.paras(revize.podklady), uvedeniDoProvozu(ctx)));
  if (nums.pristroje) parts.push(sec(t('pristroje', 'Použité měřicí přístroje'), pristrojeTable(ctx)));

  const kontrolaGrid = (rows: KontrolaPolozka[], first: string, second: string, widths: string[]) => grid(
    [first, second, 'Výsledek', 'Poznámka'], widths,
    rows.map(r => [H.esc(r.nazev), H.v(r.norma, 6), stav(r.vysledek), H.esc(r.poznamka)]));

  if (nums.prohlidka) parts.push(sec(t('prohlidka', 'Prohlídka'), kontrolaGrid(prohlidka, 'Kontrolovaná položka', 'Norma / článek', ['45%', '25%', '14%', '16%'])));
  if (nums.zkouseni) parts.push(sec(t('zkouseni', 'Zkoušení'), kontrolaGrid(zkouseni, 'Zkouška', 'Norma / článek', ['45%', '25%', '14%', '16%'])));

  if (nums.mereni) {
    parts.push(sec(t('mereni', 'Měření'),
      (om.napetiU0 || om.prechodovyOdpor) ? `<p>${om.napetiU0 ? `Měřené napětí U0 = ${H.esc(om.napetiU0)} V. ` : ''}${om.prechodovyOdpor ? `Při měření přechodových odporů nebyla překročena hodnota ${H.esc(om.prechodovyOdpor)} Ω.` : ''}</p>` : '',
      grid(['Obvod', 'Jištění', 'Kabel', 'Zs (Ω)', 'U (V)', 'I (A)', 'ta (ms)', 'IΔn (mA)', 'Riz (MΩ)', 'Výsl.'],
        ['16%', '14%', '12%', '8%', '8%', '8%', '8%', '8%', '8%', '10%'],
        mereni.map(m => [H.v(m.oznaceni, 6), H.v(m.jisteni, 4), H.v(m.typKabelu, 4), H.v(m.zs, 3), H.v(m.u, 3), H.v(m.i, 3), H.v(m.ta, 3), H.v(m.idn, 3), H.v(m.riz, 3), stav(m.vysledek)]))));
  }

  if (nums.checklist) {
    parts.push(sec(t('checklist', 'Kontrolní seznam dle připojovacích podmínek distributora'),
      `<p class="small">Podle dokumentu: ${H.esc(PPNN_ZDROJ)}.</p>`,
      ...skupiny.map(([skupina, rows]) => `<div class="split"><div class="sub-title keep">${H.esc(skupina)}</div>${kontrolaGrid(rows, 'Požadavek', 'Kapitola', ['52%', '14%', '14%', '20%'])}</div>`)));
  }

  parts.push(sec(t('zavady', 'Přehled zjištěných závad'), zavady.length ? zavadyTable(ctx) : '<p><b>Při revizi nebyly zjištěny žádné závady.</b></p>', doporuceniBlock(ctx)));
  parts.push(sec(t('vyhodnoceni', 'Vyhodnocení provedené revize'),
    vysledek,
    revize.vysledekOduvodneni && vis('vysledekOduvodneni') ? H.paras(revize.vysledekOduvodneni) : '',
    upozorneni.length ? `<p class="keep"><b>Zjištěný nesoulad s Připojovacími podmínkami nn:</b></p><ul>${upozorneni.map(u => `<li>${H.esc(u)}</li>`).join('')}</ul>` : ''));
  if (nums.zaver) parts.push(sec(t('zaver', 'Závěr'), H.paras(revize.zaver)));
  parts.push(sec(t('lhuta', 'Doporučená lhůta příští revize'),
    `<p>Příští revize by měla být provedena nejpozději do <b>${lhutaText(ctx, true)}</b>.</p>`));
  if (nums.rozdelovnik) parts.push(sec(t('rozdelovnik', 'Rozdělovník'), H.paras(revize.rozdelovnik)));
  parts.push(sec(t('predani', 'Potvrzení o předání revizní zprávy'), podpisy(ctx, 'Ev. č.')));
  parts.push(prilohyPages(ctx));

  return flowPage(ctx, 'Zpráva o revizi elektrické instalace odběrného místa', parts.join(''));
}

TPL.register({
  id: 'odberne-misto-zprava',
  name: 'Zpráva o revizi odběrného místa',
  scope: 'record',
  order: 10,
  kategorie: ['odberne_misto'],
  render,
  fileName: ctx => `${ctx.revize.cisloRevize} ${ctx.provozovatel.nazev} ${ctx.revize.adresa} odberne misto`,
});

