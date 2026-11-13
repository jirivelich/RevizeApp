/**
 * Hromosvod – zpráva o revizi systému ochrany před bleskem (LPS).
 * Obsah a pořadí sekcí odpovídá původnímu náhledu (HromosvodPrintPage).
 */
import { TPL } from '../registry';
import type { DocContext } from '../context';
import {
  flowPage, firmaHeader, titleBlock, sec, kv, kv4, grid, p, provozovatelRows, technikRows, pristrojeTable,
  zavadyTable, doporuceniBlock, uvedeniDoProvozu, ulozeniPodkladu, datumyRevize, napravneUkonyBody, NAPRAVNE_UKONY_TITLE, rozdelovnikTable, podpisy, zaverLps, prilohyPages, lhutaText,
} from './common';

interface MereniOdporu { bod: string; hodnota: string; limit: string; vyhovuje: boolean }

export function stavLabel(stav?: string): string {
  switch (stav) {
    case 'vyhovující': return 'Vyhovující';
    case 'nevyhovující': return '<b>NEVYHOVUJÍCÍ</b>';
    case 'částečně vyhovující': return 'Částečně vyhovující';
    case 'nenainstalováno': return 'Nenainstalováno';
    default: return '';
  }
}

export function tridaLpsLabel(trida?: string): string {
  switch (trida) {
    case 'I': return 'I — Nejvyšší ochrana';
    case 'II': return 'II — Vysoká ochrana';
    case 'III': return 'III — Standardní ochrana';
    case 'IV': return 'IV — Základní ochrana';
    default: return trida || '';
  }
}

export function typOchranyLabel(typ?: string): string {
  switch (typ) {
    case 'vnější': return 'Vnější ochrana (jímače + svody + uzemnění)';
    case 'vnitřní': return 'Vnitřní ochrana (SPD + pospojování)';
    case 'kombinovaná': return 'Kombinovaná (vnější + vnitřní)';
    default: return typ || '';
  }
}

function nacrtSrc(raw?: string): string {
  if (!raw) return '';
  if (raw.startsWith('{')) {
    try { return (JSON.parse(raw) as { full: string }).full || ''; } catch { return ''; }
  }
  return raw;
}

function render(ctx: DocContext): string {
  const { H, revize, zavadyPouze: zavady, vis } = ctx;
  const stav = (s?: string) => stavLabel(s) || '—';

  let mereni: MereniOdporu[] = [];
  try { mereni = revize.hromosvodMereniOdporu ? JSON.parse(revize.hromosvodMereniOdporu) : []; } catch { mereni = []; }
  if (!Array.isArray(mereni)) mereni = [];

  const poznamka = (label: string, text?: string): [string, string][] => (text ? [[label, H.lines(text)]] : []);

  const parts: string[] = [
    firmaHeader(ctx),
    titleBlock(ctx, 'Zpráva o revizi systému ochrany před bleskem (LPS)',
      H.esc(ctx.typRevizeLabel) + (revize.hromosvodNorma ? `<div class="small">dle ${H.esc(revize.hromosvodNorma)}</div>` : '')),
    sec('1. Provozovatel (objednatel)', kv(provozovatelRows(ctx))),
    sec('2. Identifikace revidovaného objektu a místo umístění', kv([['Název objektu:', H.v(revize.nazev)], ['Adresa objektu:', H.v(revize.adresa)]])),
    sec('3. Charakteristika systému ochrany před bleskem (LPS)', kv([
      ['Třída LPS:', H.o(tridaLpsLabel(revize.hromosvodTridaLps))],
      ['Typ ochrany:', H.o(typOchranyLabel(revize.hromosvodTypOchrany))],
      ...(revize.hromosvodRokInstalace ? [['Rok instalace:', H.esc(revize.hromosvodRokInstalace)] as [string, string]] : []),
      ...poznamka('Popis LPS:', revize.hromosvodPopisLps),
    ])),
  ];

  if (vis('rozsahRevize')) {
    const body = (revize.rozsahRevize || revize.predmetNeni)
      ? [
          revize.rozsahRevize ? `<p class="keep"><b>Předmět revize je:</b></p>${H.paras(revize.rozsahRevize)}` : '',
          revize.predmetNeni ? `<p class="keep"><b>Předmětem revize není/nejsou:</b></p>${H.paras(revize.predmetNeni)}` : '',
        ].join('')
      : H.paras('');
    parts.push(sec('4. Vymezení rozsahu revize', body));
  }

  parts.push(
    sec('5. Údaje o revizním technikovi', kv(technikRows(ctx))),
    sec('6. Druh revize', `<p><b>${H.esc(ctx.typRevizeLabel)}</b></p>`,
      revize.typRevize === 'mimořádná' && revize.duvodMimoradne ? H.paras(revize.duvodMimoradne) : ''),
    sec('7. Důležitá data', kv4([
      ...datumyRevize(ctx),
      [['Platnost do:', H.o(H.d(revize.datumPlatnosti), 14)], ['Lhůta příští revize:', revize.termin ? `${H.esc(revize.termin)} měsíců` : '—']],
    ])),
  );

  if (vis('jimaciSoustava')) parts.push(sec('8. Jímací soustava', kv([
    ['Typ jímače:', H.o(revize.hromosvodJimaciTyp)],
    ['Materiál:', H.o(revize.hromosvodJimaciMaterial)],
    ['Stav:', stav(revize.hromosvodJimaciStav)],
    ...poznamka('Poznámka:', revize.hromosvodJimaciPoznamka),
  ])));

  if (vis('svodoveVedeni')) parts.push(sec('9. Svodové vedení', kv([
    ['Počet svodů:', H.o(revize.hromosvodSvodyPocet, 8)],
    ['Materiál:', H.o(revize.hromosvodSvodyMaterial)],
    ...(revize.hromosvodSvodyPrurez ? [['Průřez / profil:', H.esc(revize.hromosvodSvodyPrurez)] as [string, string]] : []),
    ['Zkušební svorky:', `${H.o(revize.hromosvodSvodyZkusebniSvorky, 6)} ks`],
    ['Stav:', stav(revize.hromosvodSvodyStav)],
    ...poznamka('Poznámka:', revize.hromosvodSvodyPoznamka),
  ])));

  if (vis('uzemnovaciSoustava')) parts.push(sec('10. Uzemňovací soustava', kv([
    ['Typ uzemnění:', H.o(revize.hromosvodUzemneniTyp)],
    ['Materiál:', H.o(revize.hromosvodUzemneniMaterial)],
    ['Stav:', stav(revize.hromosvodUzemneniStav)],
    ...poznamka('Poznámka:', revize.hromosvodUzemneniPoznamka),
  ])));

  if (vis('spd')) parts.push(sec('11. Ochranné pospojování a přepěťové ochrany (SPD)', kv([
    ...(revize.hromosvodSpdTyp ? [['Typ SPD:', H.esc(revize.hromosvodSpdTyp)] as [string, string]] : []),
    ['Stav SPD:', stav(revize.hromosvodSpdStav)],
    ...poznamka('Ekvipotenciální přípojnice:', revize.hromosvodEkvipotencialni),
    ...poznamka('Poznámka:', revize.hromosvodSpdPoznamka),
  ])));

  if (vis('mereniOdporu')) {
    if (mereni.length) {
      const sHodnotou = mereni.filter(m => m.hodnota);
      const prumer = sHodnotou.length
        ? (sHodnotou.reduce((s, m) => s + (parseFloat(String(m.hodnota).replace(',', '.')) || 0), 0) / sHodnotou.length).toFixed(2)
        : '';
      parts.push(sec('12. Měření odporů uzemnění',
        grid(['Měřicí bod', 'Naměřeno [Ω]', 'Limit [Ω]', 'Výsledek'], ['35%', '20%', '20%', '25%'],
          mereni.map(m => [H.o(m.bod, 8), H.o(m.hodnota, 6), H.o(m.limit, 6), H.vn(m.vyhovuje, ['VYHOVUJE', 'NEVYHOVUJE'])]), [1, 2, 3]),
        `<p class="small">Celkem bodů: ${mereni.length} | Vyhovuje: ${mereni.filter(m => m.vyhovuje).length} | Nevyhovuje: ${mereni.filter(m => !m.vyhovuje).length}${prumer ? ` | Průměrná hodnota: ${prumer} Ω` : ''}</p>`));
    } else {
      parts.push(sec('12. Měření odporů uzemnění', p(ctx, 'Měření odporů uzemnění nebylo provedeno.')));
    }
  }

  if (vis('pristroje')) parts.push(sec('13. Soupis použitých měřicích přístrojů', pristrojeTable(ctx)));
  if (vis('podklady')) parts.push(sec('14. Seznam podkladů použitých k provedení revize', H.paras(revize.podklady), uvedeniDoProvozu(ctx), ulozeniPodkladu(ctx)));
  if (vis('vyhodnoceniPredchozich')) parts.push(sec('15. Vyhodnocení předchozích revizí', H.paras(revize.vyhodnoceniPredchozich, 0)));
  if (revize.napravneUkony?.trim()) parts.push(sec(NAPRAVNE_UKONY_TITLE, napravneUkonyBody(ctx)));

  const nacrt = nacrtSrc(revize.hromosvodNacrt);
  if (nacrt) parts.push(sec('Příloha – Schéma hromosvodu (LPS)', `<div class="nacrt"><img src="${H.esc(nacrt)}" alt="Schéma hromosvodu LPS"></div>`));

  parts.push(
    sec('16. Přehled zjištěných závad', zavady.length ? zavadyTable(ctx) : '<p><b>Při revizi nebyly zjištěny žádné závady.</b></p>', doporuceniBlock(ctx)),
    sec('17. Závěrečné zhodnocení',
      zaverLps(ctx),
      vis('zaver') && revize.zaver ? `<p class="keep"><b>Závěr:</b></p>${H.paras(revize.zaver)}` : ''),
    sec('18. Doporučená lhůta provedení příští revize', `<p>Příští revize by měla být provedena nejpozději do <b>${lhutaText(ctx)}</b>.</p>`),
  );
  if (vis('rozdelovnik') && revize.rozdelovnik) parts.push(sec('Rozdělovník', rozdelovnikTable(ctx, revize.rozdelovnik)));
  parts.push(sec('19. Potvrzení o předání zprávy', podpisy(ctx, 'Ev. č.')));
  parts.push(prilohyPages(ctx));

  return flowPage(ctx, 'Revizní zpráva – Hromosvod', parts.join(''));
}

TPL.register({
  id: 'hromosvod-zprava',
  name: 'Zpráva o revizi hromosvodu (LPS)',
  scope: 'record',
  order: 10,
  kategorie: ['hromosvod'],
  render,
  fileName: ctx => `${ctx.revize.cisloRevize} ${ctx.provozovatel.nazev} ${ctx.revize.adresa} LPS`,
});
