/**
 * Společné stavební bloky šablon. Vše vrací HTML string; uživatelská data jdou přes ctx.H.
 * Layout jen tabulkami (kvůli Wordu).
 */
import type { DocContext } from '../context';
import type { Zavada } from '../../types';

type Row = [label: string, valueHtml: string];

/** Otevře stránku s plynulým obsahem (data-flow) a opakovanou hlavičkou. */
export function flowPage(ctx: DocContext, footText: string, content: string): string {
  const { H, revize, firma, technik } = ctx;
  const left = [firma.nazev, technik.jmeno && `${technik.jmeno}${firma.telefon ? `, tel.: ${firma.telefon}` : ''}`]
    .filter(Boolean)
    .map(H.esc)
    .join(' &nbsp;|&nbsp; ');
  const head = `<table class="page-head"><tbody><tr><td>${left}</td><td class="r">ev. č. ${H.v(revize.cisloRevize, 12)}</td></tr></tbody></table>`;
  return `<div class="page" data-flow data-foot="${H.esc(footText)}">${head}${content}</div>`;
}

/** Hlavička s logem a údaji firmy (na titulní straně). */
export function firmaHeader(ctx: DocContext): string {
  const { H, firma, revize } = ctx;
  const detail = [
    firma.adresa,
    [firma.ico && `IČO: ${firma.ico}`, firma.dic && `DIČ: ${firma.dic}`].filter(Boolean).join(', '),
    [firma.telefon && `tel.: ${firma.telefon}`, firma.email].filter(Boolean).join(', '),
  ].filter(Boolean).map(H.esc).join('<br>');
  const logo = firma.logo ? `<td class="logo"><img src="${H.esc(firma.logo)}" alt="Logo"></td>` : '';
  return `<table class="firma"><tbody><tr>${logo}
    <td><div class="nazev">${H.v(firma.nazev)}</div><div class="small">${detail}</div></td>
    <td class="r small">Číslo zprávy: <b>${H.v(revize.cisloRevize, 12)}</b><br>Datum: ${H.v(H.d(revize.datum), 14)}</td>
  </tr></tbody></table>`;
}

/** Titul dokumentu (normy, nadpis, podtitul). */
export function titleBlock(ctx: DocContext, title: string, subtitle: string, normy?: string): string {
  const { H } = ctx;
  return `<div class="title-block">
    ${normy ? `<div class="normy">${H.esc(normy)}</div>` : ''}
    <div class="title">${H.esc(title)}</div>
    <div class="subtitle">${subtitle}</div>
  </div>`;
}

/** Sekce s nadpisem; obsah lze stránkovat po blocích. */
export function sec(title: string, ...body: string[]): string {
  return `<div class="sec split"><div class="sec-title keep">${title}</div>${body.join('')}</div>`;
}

/** Tabulka popisek/hodnota. Hodnoty už musí být HTML (escapované). */
export function kv(rows: Row[]): string {
  if (rows.length === 0) return '';
  return `<table class="kv"><tbody>${rows.map(([l, v]) => `<tr><td class="l">${l}</td><td>${v}</td></tr>`).join('')}</tbody></table>`;
}

/** Tabulka popisek/hodnota ve dvou sloupcových párech. */
export function kv4(rows: [Row, Row | null][]): string {
  return `<table class="kv kv4"><tbody>${rows.map(([a, b]) =>
    `<tr><td class="l">${a[0]}</td><td>${a[1]}</td>${b ? `<td class="l">${b[0]}</td><td>${b[1]}</td>` : '<td colspan="2"></td>'}</tr>`,
  ).join('')}</tbody></table>`;
}

/** Mřížka s rámečky. Buňky už musí být HTML (escapované). */
export function grid(cols: string[], widths: string[], rows: string[][], center: number[] = []): string {
  // Pevné šířky sloupců (colgroup + table-layout: fixed) – pokračování tabulky na dalším listu
  // dostane colgroup také (paginate.ts), takže sloupce nepřeskakují.
  const fixed = widths.some(Boolean);
  const colgroup = fixed ? `<colgroup>${cols.map((_, i) => `<col${widths[i] ? ` style="width:${widths[i]}"` : ''}>`).join('')}</colgroup>` : '';
  const th = cols.map((c, i) => `<th${widths[i] ? ` style="width:${widths[i]}"` : ''}${center.includes(i) ? ' class="c"' : ''}>${c}</th>`).join('');
  const body = rows.map(r => `<tr>${r.map((c, i) => `<td${center.includes(i) ? ' class="c"' : ''}>${c}</td>`).join('')}</tr>`).join('');
  return `<table class="grid${fixed ? ' fixcols' : ''}">${colgroup}<thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}

/** Odstavec textu (escapuje). */
export function p(ctx: DocContext, text: string, cls = ''): string {
  return `<p${cls ? ` class="${cls}"` : ''}>${ctx.H.esc(text)}</p>`;
}

// ── Opakující se sekce ──

export function provozovatelRows(ctx: DocContext, adresaFallback = ''): Row[] {
  const { H, provozovatel: pv } = ctx;
  const rows: Row[] = [
    ['Název / Jméno:', H.v(pv.nazev)],
    ['Adresa / Sídlo:', H.v(pv.adresa || adresaFallback)],
  ];
  if (pv.ico) rows.push(['IČO:', H.esc(pv.ico)]);
  if (pv.kontakt) rows.push(['Kontaktní osoba:', H.esc(pv.kontakt)]);
  if (pv.telefon) rows.push(['Telefon:', H.esc(pv.telefon)]);
  if (pv.email) rows.push(['E-mail:', H.esc(pv.email)]);
  return rows;
}

export function technikRows(ctx: DocContext): Row[] {
  const { H, technik: t } = ctx;
  const rows: Row[] = [
    ['Jméno:', H.v(t.jmeno)],
    ['Oprávnění:', H.v(t.opravneni)],
  ];
  if (t.osvedceni) rows.push(['Osvědčení:', H.esc(t.osvedceni)]);
  if (t.adresa) rows.push(['Adresa:', H.esc(t.adresa)]);
  if (t.ico) rows.push(['IČO:', H.esc(t.ico)]);
  return rows;
}

export function pristrojeTable(ctx: DocContext): string {
  const { H, pristroje } = ctx;
  if (pristroje.length === 0) return p(ctx, 'Žádné přístroje nebyly přiřazeny.');
  return grid(
    ['Název', 'Výrobce / Model', 'Výrobní číslo', 'Kalibrace', 'Platnost'],
    ['25%', '25%', '20%', '15%', '15%'],
    pristroje.map(x => [
      H.v(x.nazev, 10),
      H.v(`${x.vyrobce || ''} ${x.model || ''}`.trim(), 10),
      H.v(x.vyrobniCislo, 10),
      H.v(H.d(x.datumKalibrace), 10),
      H.v(H.d(x.platnostKalibrace), 10),
    ]),
  );
}

export const ZAVAZNOST_LABEL: Record<Zavada['zavaznost'], string> = {
  C1: 'C1 – Kritická',
  C2: 'C2 – Vážná',
  C3: 'C3 – Méně závažná',
};

export function zavadaStavLabel(stav: Zavada['stav']): string {
  return stav === 'otevřená' ? 'Otevřená' : stav === 'v řešení' ? 'V řešení' : 'Vyřešená';
}

/** Tabulka závad (bez nadpisu sekce, bez doporučení). */
export function zavadyTable(ctx: DocContext, withPoznamka = false): string {
  const { H, zavadyPouze: zavady } = ctx;
  return grid(
    ['#', 'Popis závady', 'Závažnost', 'Stav', 'Zjištěna'],
    ['5%', '45%', '17%', '13%', '20%'],
    zavady.map((z, i) => [
      String(i + 1),
      H.esc(z.popis)
        // Závada musí uvádět, s jakým ustanovením normy / předpisu je v rozporu, popř. riziko (ČSN 33 1500)
        + `<div class="small">V rozporu s: ${H.v(z.norma, 30)}</div>`
        + (z.riziko ? `<div class="small">Riziko: ${H.esc(z.riziko)}</div>` : '')
        + (withPoznamka && z.poznamka ? `<div class="small muted">${H.lines(z.poznamka)}</div>` : ''),
      ZAVAZNOST_LABEL[z.zavaznost] ?? H.esc(z.zavaznost),
      zavadaStavLabel(z.stav),
      H.v(H.d(z.datumZjisteni), 10),
    ]),
    [0],
  );
}

export const ZAVADY_LEGENDA = '<p class="small"><b>Kategorie závad:</b> <b>C1</b> – kritická závada (bezprostřední nebezpečí, je nutné ihned odpojit zařízení od napájení); <b>C2</b> – vážná závada (nutná náprava v co nejkratší době); <b>C3</b> – méně závažná závada (doporučení ke zlepšení, zařízení může být provozováno).</p>';

export const DOPORUCENI_TITLE = 'Doporučení (nesoulad se současnými normami)';
const DOPORUCENI_TEXT = '<p>Doporučení nejsou závadami. Nezakládají provozovateli povinnost nápravy a nemají vliv na posouzení schopnosti zařízení provozu; jde o odbornou radu ke zvýšení bezpečnosti.</p>';

/** Doporučení – vysvětlující text a tabulka (bez nadpisu sekce). Bez doporučení vrací ''. */
export function doporuceniBody(ctx: DocContext): string {
  const { H, doporuceni } = ctx;
  if (doporuceni.length === 0) return '';
  return DOPORUCENI_TEXT + grid(
    ['#', 'Doporučení', 'Zdůvodnění (snížené riziko)'],
    ['5%', '50%', '45%'],
    doporuceni.map((z, i) => [
      String(i + 1),
      H.esc(z.popis) + (z.poznamka ? `<div class="small muted">${H.lines(z.poznamka)}</div>` : ''),
      H.v(z.zduvodneni, 10),
    ]),
    [0],
  );
}

/** Doporučení jako blok uvnitř sekce závad (hromosvod, stroje, odběrné místo). */
export function doporuceniBlock(ctx: DocContext): string {
  const body = doporuceniBody(ctx);
  return body ? `<div class="split"><div class="sub-title keep">${DOPORUCENI_TITLE}</div>${body}</div>` : '';
}

/** Věta o uvedení zařízení do provozu (prázdná, když není zadáno). */
/** Místo uložení podkladů; když jsou podklady uvedeny a místo chybí, vytiskne tečky k doplnění. */
export function ulozeniPodkladu(ctx: DocContext): string {
  const { H, revize, dokumenty } = ctx;
  const maPodklady = !!revize.podklady?.trim() || dokumenty.length > 0;
  if (!revize.mistoUlozeniPodkladu?.trim() && !maPodklady) return '';
  return `<p>Podklady jsou uloženy: ${revize.mistoUlozeniPodkladu?.trim() ? `<b>${H.esc(revize.mistoUlozeniPodkladu)}</b>` : H.dots(40)}</p>`;
}

/** Data revize dle ČSN 33 1500: zahájení, ukončení, vypracování a předání zprávy. */
export function datumyRevize(ctx: DocContext): [[string, string], [string, string]][] {
  const { H, revize } = ctx;
  return [
    [['Zahájení revize:', H.v(H.d(revize.datum), 14)], ['Ukončení revize:', H.v(H.d(revize.datumDokonceni), 14)]],
    [['Vypracování zprávy:', H.v(H.d(revize.datumVypracovani), 14)], ['Předání zprávy:', H.v(H.d(revize.datumPredani), 14)]],
  ];
}

/** Drobné nápravné úkony provedené revizním technikem (prázdné = nic). */
export function napravneUkonyBody(ctx: DocContext): string {
  const t = ctx.revize.napravneUkony;
  return t?.trim() ? ctx.H.paras(t) : '';
}

export const NAPRAVNE_UKONY_TITLE = 'Drobné nápravné úkony provedené revizním technikem';

export function uvedeniDoProvozu(ctx: DocContext): string {
  const { H, revize } = ctx;
  if (!revize.datumUvedeniDoProvozu) return '';
  return `<p>Zařízení bylo uvedeno do provozu: <b>${H.esc(revize.datumUvedeniDoProvozu)}</b>${revize.zdrojUvedeniDoProvozu ? ` (zjištěno na základě: ${H.esc(revize.zdrojUvedeniDoProvozu)})` : ''}.</p>`;
}

/** Rozdělovník „příjemce: počet“ po řádcích. */
export function rozdelovnikTable(ctx: DocContext, text: string): string {
  const { H } = ctx;
  const rows = text.split('\n').filter(r => r.trim()).map(radek => {
    const sep = radek.lastIndexOf(':');
    const prijemce = sep >= 0 ? radek.substring(0, sep).trim() : radek.trim();
    const pocet = sep >= 0 ? radek.substring(sep + 1).trim() : '';
    return [H.esc(prijemce), H.esc(pocet)];
  });
  return grid(['Příjemce', 'Počet'], ['', '20mm'], rows, [1]);
}

/** Podpisy technika a objednatele + místo a datum. */
export function podpisy(ctx: DocContext, certLabel = 'Oprávnění'): string {
  const { H, technik, provozovatel, revize } = ctx;
  const objednatel = provozovatel.kontakt || provozovatel.nazev;
  const datum = H.d(revize.datumVypracovani) || H.d(new Date());
  return `<div class="nosplit"><p>V ${H.dots(30)} dne ${H.esc(datum)}</p>
  <table class="sig"><tbody>
    <tr>
      <td><div class="line">revizní technik</div><div class="name">${H.v(technik.jmeno)}</div><div class="small">${certLabel}: ${H.v(technik.opravneni, 16)}</div></td>
      <td><div class="line">za provozovatele / objednatele</div><div class="name">${H.v(objednatel)}</div><div class="small">&nbsp;</div></td>
    </tr>
  </tbody></table></div>`;
}

/**
 * Závěr revize vyhrazeného elektrického zařízení – ustálená formulace dle ČSN 33 1500:
 * „Revidované vyhrazené elektrické zařízení je (není) z hlediska bezpečnosti schopno provozu.“
 */
export function zaverVyhrazene(ctx: DocContext, sOduvodnenim = true): string {
  const { H, revize } = ctx;
  return resultBox(`Revidované vyhrazené elektrické zařízení ${H.vn(revize.vysledek, ['je', 'není'])} z hlediska bezpečnosti schopno provozu.`)
    + (sOduvodnenim ? zduvodneniNeschopno(ctx, revize.vysledek === 'neschopno') : '');
}

/**
 * Zdůvodnění, proč zařízení (nebo jeho část) nelze provozovat – musí být přímo v závěru.
 * Při „není schopno“ se vytiskne vždy (prázdné = tečky k doplnění), jinak jen když je vyplněno.
 */
export function zduvodneniNeschopno(ctx: DocContext, povinne: boolean): string {
  const { H, revize } = ctx;
  if (!povinne && !revize.vysledekOduvodneni?.trim()) return '';
  return `<div class="split"><p class="keep"><b>Zdůvodnění, proč zařízení nelze provozovat:</b></p>${H.paras(revize.vysledekOduvodneni)}</div>`;
}

/**
 * Závěr revize ochrany před bleskem (ČSN 33 1500 Z4): neuvádí se „schopno provozu“,
 * ale zda provedení odpovídá normě platné v době zřízení a zda jsou součásti v dobrém funkčním stavu.
 */
export function zaverLps(ctx: DocContext): string {
  const { H, revize } = ctx;
  const b = (v?: string) => (v === 'ano' ? true : v === 'ne' ? false : null);
  const norma = revize.hromosvodNormaZrizeni || revize.hromosvodNorma;
  const nevyhovuje = revize.hromosvodOdpovidaNorme === 'ne' || revize.hromosvodFunkcniStav === 'ne';
  return resultBox(
    `Provedení ochrany před bleskem ${H.vn(b(revize.hromosvodOdpovidaNorme), ['odpovídá', 'neodpovídá'])} normě platné v době jejího zřízení`
    + ` (${H.v(norma, 16)}) a její součásti ${H.vn(b(revize.hromosvodFunkcniStav), ['jsou', 'nejsou'])} v dobrém funkčním stavu.`,
  ) + zduvodneniNeschopno(ctx, nevyhovuje);
}

/** Rámeček s výsledkem revize. */
export function resultBox(innerHtml: string): string {
  return `<table class="result nosplit"><tbody><tr><td>${innerHtml}</td></tr></tbody></table>`;
}

/** Fotodokumentace závad (na novém listu), dvě fotky vedle sebe. */
export function fotoZavad(ctx: DocContext): string {
  const { H, zavadyPouze: zavady } = ctx;
  const sFotkou = zavady.map((z, i) => ({ z, cislo: i + 1 })).filter(x => Array.isArray(x.z.fotky) && x.z.fotky.length > 0);
  if (sFotkou.length === 0) return '';
  const entries = sFotkou.map(({ z, cislo }) => {
    const rows = H.paginate(z.fotky, 2).map(pair =>
      `<tr>${pair.map((src, idx) => `<td><img src="${H.esc(src)}" alt="Závada ${cislo} – foto ${idx + 1}"></td>`).join('')}${pair.length < 2 ? '<td></td>' : ''}</tr>`,
    ).join('');
    return `<div class="split"><p class="keep"><b>#${cislo}</b> ${H.esc(z.popis)} <span class="small">(${ZAVAZNOST_LABEL[z.zavaznost] ?? ''})</span></p><table class="foto"><tbody>${rows}</tbody></table></div>`;
  }).join('');
  return `<div class="pb"></div>${sec('Příloha – Fotodokumentace závad', entries)}`;
}

/** Přílohy revize – každá stránka přílohy na vlastním listu. */
export function prilohyPages(ctx: DocContext): string {
  const { H, prilohy } = ctx;
  return prilohy.flatMap((pr, i) => pr.images.map((src, pageIdx) => `<div class="pb"></div>
    <div class="priloha">
      <div class="sec-title">Příloha ${i + 1} – ${H.esc(pr.nazev)}${pr.images.length > 1 ? ` (strana ${pageIdx + 1}/${pr.images.length})` : ''}</div>
      ${pageIdx === 0 && pr.poznamka ? `<p class="small">${H.lines(pr.poznamka)}</p>` : ''}
      <img src="${H.esc(src)}" alt="${H.esc(pr.nazev)}">
    </div>`)).join('');
}

/** Seznam příloh (text revize.prilohy + nahrané soubory). */
export function seznamPriloh(ctx: DocContext): string {
  const { H, revize, prilohy } = ctx;
  const items = [
    ...(revize.prilohy || '').split('\n').filter(r => r.trim()).map(r => H.esc(r.trim())),
    ...prilohy.map((pr, i) => `${H.esc(pr.nazev)} (příloha ${i + 1})`),
  ];
  return `<ol>${items.map(it => `<li>${it}</li>`).join('')}</ol>`;
}

/** Lhůta příští revize (datum, vlastní text, nebo počet měsíců). */
export function lhutaText(ctx: DocContext, useLhutaText = false): string {
  const { H, revize } = ctx;
  if (useLhutaText && revize.lhutaText?.trim()) return H.esc(revize.lhutaText.trim());
  if (revize.datumPlatnosti) return H.esc(H.d(revize.datumPlatnosti));
  return revize.termin ? `${H.esc(revize.termin)} měsíců od data provedení` : H.dots(20);
}
