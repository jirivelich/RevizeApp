// templateEngine.ts - Šablonový engine pro generování HTML z šablon
// Nahrazuje složitý systém widgetů + absolutního pozicování
//
// Podporuje:
//   {{proměnná}}           - vložení hodnoty
//   {{cesta.k.hodnotě}}    - tečková notace
//   {{hodnota | helper}}   - transformace (upper, lower, date, number, yesno)
//   {{#each kolekce}}...{{/each}}  - cyklus
//   {{#if podmínka}}...{{else}}...{{/if}}  - podmínka
//   {{#unless podmínka}}...{{/unless}}     - negovaná podmínka
//   {{@index}}, {{@number}}, {{@first}}, {{@last}} - metadata cyklu

import type { PDFRenderData } from './pdfVariables';

// ============================================================
// TEMPLATE CONTEXT
// ============================================================

/**
 * Vytvoří template context z PDFRenderData.
 * Flat struktura pro snadný přístup v šablonách.
 */
// Katalog ochranných opatření (stejný jako v RevizeDetailPage)
const OCHRANA_KATALOG = [
  { id: 'zakladni-izolace', label: 'Základní izolace živých částí' },
  { id: 'kryty-pricka', label: 'Přepážky nebo kryty' },
  { id: 'zamezeni-dotyk', label: 'Zábrany nebo ochrana polohou' },
  { id: 'selv', label: 'Ochrana malým napětím SELV' },
  { id: 'pelv', label: 'Ochrana malým napětím PELV' },
  { id: 'ochrane-pospojovani', label: 'Ochranné pospojování' },
  { id: 'samocine-odpojeni', label: 'Samočinné odpojení od zdroje' },
  { id: 'proudovy-chranic', label: 'Doplňková ochrana proudovým chráničem' },
  { id: 'ochranne-oddeleni', label: 'Ochranné oddělení obvodů' },
  { id: 'dvojita-izolace', label: 'Dvojitá nebo zesílená izolace' },
  { id: 'nevodive-prostredi', label: 'Nevodivé prostředí' },
  { id: 'neuzemene-pospojeni', label: 'Neuzemené místní pospojování' },
];

export function createTemplateContext(data: PDFRenderData): Record<string, any> {
  const now = new Date();
  const fmt = (d: any) => d ? new Date(d).toLocaleDateString('cs-CZ') : '-';

  // Parsovat ochranná opatření z JSON pole ID na strukturovaná data
  let ochranaIds: string[] = [];
  try {
    if (data.revize.ochranaOpatreni) {
      ochranaIds = JSON.parse(data.revize.ochranaOpatreni);
    }
  } catch { /* not JSON, leave empty */ }

  const ochranaOpatreniList = OCHRANA_KATALOG.map(o => ({
    nazev: o.label,
    pouzito: ochranaIds.includes(o.id),
    pouzito_text: ochranaIds.includes(o.id) ? '✓' : '—',
  }));

  // Jen použitá opatření
  const ochranaOpatreniPouzita = ochranaOpatreniList.filter(o => o.pouzito);

  return {
    revize: {
      ...data.revize,
      datum: fmt(data.revize.datum),
      datumDokonceni: fmt(data.revize.datumDokonceni),
      datumPlatnosti: fmt(data.revize.datumPlatnosti),
      datumVypracovani: fmt((data.revize as any).datumVypracovani),
    },
    ochranaOpatreniList,
    ochranaOpatreniPouzita,
    firma: {
      nazev: data.nastaveni?.firmaJmeno || '-',
      adresa: data.nastaveni?.firmaAdresa || '-',
      ico: data.nastaveni?.firmaIco || '-',
      dic: data.nastaveni?.firmaDic || '-',
      logo: data.nastaveni?.logo || '',
    },
    technik: {
      jmeno: data.nastaveni?.reviznniTechnikJmeno || '-',
      cisloOpravneni: data.nastaveni?.reviznniTechnikCisloOpravneni || '-',
      osvedceni: data.nastaveni?.reviznniTechnikOsvedceni || '-',
      adresa: data.nastaveni?.reviznniTechnikAdresa || '-',
      ico: data.nastaveni?.reviznniTechnikIco || '-',
      telefon: data.nastaveni?.kontaktTelefon || '-',
      email: data.nastaveni?.kontaktEmail || '-',
    },
    zakaznik: data.zakaznik || {},
    nastaveni: data.nastaveni || {},
    rozvadece: (data.rozvadece || []).map(r => ({
      ...r,
      okruhy: (data.okruhy?.[r.id!] || []).map(o => ({
        ...o,
        izolacniOdpor: o.izolacniOdpor != null ? o.izolacniOdpor.toFixed(2) : '-',
        impedanceSmycky: o.impedanceSmycky != null ? o.impedanceSmycky.toFixed(2) : '-',
      })),
    })),
    mistnosti: (data.mistnosti || []).map(m => ({
      ...m,
      zarizeni: data.zarizeni?.[m.id!] || [],
    })),
    zavady: data.zavady || [],
    pouzitePristroje: (data.pouzitePristroje || []).map(p => ({
      ...p,
      platnostKalibrace: p.platnostKalibrace
        ? new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ')
        : '-',
    })),
    stats: {
      pocetRozvadecu: (data.rozvadece || []).length,
      pocetOkruhu: Object.values(data.okruhy || {}).flat().length,
      pocetZavad: (data.zavady || []).length,
      pocetZavadOtevrenych: (data.zavady || []).filter(z => z.stav === 'otevřená' || z.stav === 'v řešení').length,
      pocetZavadVyresenych: (data.zavady || []).filter(z => z.stav === 'vyřešená').length,
      pocetMistnosti: (data.mistnosti || []).length,
      pocetZarizeni: Object.values(data.zarizeni || {}).flat().length,
      pocetPristroju: (data.pouzitePristroje || []).length,
    },
    datum: {
      dnes: now.toLocaleDateString('cs-CZ'),
      cas: now.toLocaleTimeString('cs-CZ'),
      rok: String(now.getFullYear()),
    },
  };
}

// ============================================================
// TEMPLATE PROCESSING
// ============================================================

/**
 * Zpracuje šablonu s kontextem a vrátí výsledný HTML string.
 */
export function processTemplate(template: string, context: Record<string, any>): string {
  return processBlock(template, context);
}

function processBlock(template: string, context: any): string {
  let result = '';
  let i = 0;

  while (i < template.length) {
    const openIdx = template.indexOf('{{', i);

    if (openIdx === -1) {
      result += template.slice(i);
      break;
    }

    // Text před tagem
    result += template.slice(i, openIdx);

    const closeIdx = template.indexOf('}}', openIdx);
    if (closeIdx === -1) {
      result += template.slice(openIdx);
      break;
    }

    const tag = template.slice(openIdx + 2, closeIdx).trim();
    i = closeIdx + 2;

    // ── {{#each kolekce}} ──
    if (tag.startsWith('#each ')) {
      const collectionPath = tag.slice(6).trim();
      const endIdx = findMatchingEnd(template, i, '#each ', '/each');

      if (endIdx === -1) {
        result += `[Chyba: chybí {{/each}} pro ${collectionPath}]`;
        continue;
      }

      const innerTemplate = template.slice(i, endIdx);
      i = endIdx + '{{/each}}'.length;

      const collection = resolvePath(context, collectionPath);
      if (Array.isArray(collection)) {
        for (let idx = 0; idx < collection.length; idx++) {
          const itemContext = {
            ...context,
            ...collection[idx],
            '@index': idx,
            '@first': idx === 0,
            '@last': idx === collection.length - 1,
            '@number': idx + 1,
          };
          result += processBlock(innerTemplate, itemContext);
        }
      }

    // ── {{#if podmínka}} ──
    } else if (tag.startsWith('#if ')) {
      const conditionPath = tag.slice(4).trim();
      const endIdx = findMatchingEnd(template, i, '#if ', '/if');

      if (endIdx === -1) {
        result += `[Chyba: chybí {{/if}} pro ${conditionPath}]`;
        continue;
      }

      const blockContent = template.slice(i, endIdx);
      i = endIdx + '{{/if}}'.length;

      // Najít {{else}}
      const elseIdx = findElse(blockContent);
      const condition = resolvePath(context, conditionPath);
      const isTruthy = condition && (Array.isArray(condition) ? condition.length > 0 : true);

      if (isTruthy) {
        const trueBlock = elseIdx !== -1 ? blockContent.slice(0, elseIdx) : blockContent;
        result += processBlock(trueBlock, context);
      } else if (elseIdx !== -1) {
        const falseBlock = blockContent.slice(elseIdx + '{{else}}'.length);
        result += processBlock(falseBlock, context);
      }

    // ── {{#unless podmínka}} ──
    } else if (tag.startsWith('#unless ')) {
      const conditionPath = tag.slice(8).trim();
      const endIdx = findMatchingEnd(template, i, '#unless ', '/unless');

      if (endIdx === -1) {
        result += `[Chyba: chybí {{/unless}}]`;
        continue;
      }

      const innerTemplate = template.slice(i, endIdx);
      i = endIdx + '{{/unless}}'.length;

      const condition = resolvePath(context, conditionPath);
      const isFalsy = !condition || (Array.isArray(condition) && condition.length === 0);

      if (isFalsy) {
        result += processBlock(innerTemplate, context);
      }

    // ── {{proměnná}} nebo {{proměnná | helper}} ──
    } else {
      let value: any;

      if (tag.includes('|')) {
        const [varPath, ...helpers] = tag.split('|').map(s => s.trim());
        value = resolvePath(context, varPath);
        for (const helper of helpers) {
          value = applyHelper(value, helper);
        }
      } else {
        value = resolvePath(context, tag);
      }

      result += formatValue(value);
    }
  }

  return result;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Resolve tečkové cesty: "revize.nazev" → context.revize.nazev
 */
function resolvePath(context: any, path: string): any {
  if (!path || !context) return undefined;
  const parts = path.trim().split('.');
  let current = context;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Formátuje hodnotu pro zobrazení
 */
function formatValue(value: any): string {
  if (value == null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Ano' : 'Ne';
  if (value instanceof Date) return value.toLocaleDateString('cs-CZ');
  return String(value);
}

/**
 * Najde odpovídající uzavírací blok, řeší vnořené bloky
 */
function findMatchingEnd(
  template: string,
  startIdx: number,
  openPattern: string,    // např. "#each "
  closeKeyword: string    // např. "/each"
): number {
  let depth = 1;
  let i = startIdx;
  const closePattern = `{{${closeKeyword}}}`;

  while (i < template.length && depth > 0) {
    const nextOpen = template.indexOf(`{{${openPattern}`, i);
    const nextClose = template.indexOf(closePattern, i);

    if (nextClose === -1) return -1;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + openPattern.length + 2;
    } else {
      depth--;
      if (depth === 0) return nextClose;
      i = nextClose + closePattern.length;
    }
  }

  return -1;
}

/**
 * Najde {{else}} na stejné úrovni (ne vnořené)
 */
function findElse(block: string): number {
  let depth = 0;
  let i = 0;

  while (i < block.length) {
    const nextOpen = block.indexOf('{{#', i);
    const nextEnd = block.indexOf('{{/', i);
    const nextElse = block.indexOf('{{else}}', i);

    // Žádný další tag
    if (nextElse === -1) return -1;

    // else je před dalším vnořeným blokem
    if (depth === 0 && nextElse !== -1) {
      const beforeOpen = nextOpen === -1 || nextElse < nextOpen;
      const beforeEnd = nextEnd === -1 || nextElse < nextEnd;
      if (beforeOpen && beforeEnd) return nextElse;
    }

    // Posunout se na nejbližší tag
    const candidates = [nextOpen, nextEnd, nextElse].filter(x => x !== -1);
    const nearest = Math.min(...candidates);

    if (nearest === nextOpen) {
      depth++;
      i = nextOpen + 3;
    } else if (nearest === nextEnd) {
      depth--;
      i = nextEnd + 3;
    } else {
      i = nextElse + 8;
    }
  }

  return -1;
}

/**
 * Aplikuje helper transformaci
 */
function applyHelper(value: any, helper: string): any {
  switch (helper) {
    case 'upper':
      return String(value || '').toUpperCase();
    case 'lower':
      return String(value || '').toLowerCase();
    case 'date':
      return value ? new Date(value).toLocaleDateString('cs-CZ') : '-';
    case 'number':
      return value != null ? Number(value).toLocaleString('cs-CZ') : '-';
    case 'currency':
      return value != null
        ? Number(value).toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })
        : '-';
    case 'yesno':
      return value ? 'Ano' : 'Ne';
    default:
      return value;
  }
}

// ============================================================
// FULL DOCUMENT RENDERING
// ============================================================

export interface PageOptions {
  pageSize: 'a4' | 'a5' | 'letter';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
}

const PAGE_DIMENSIONS = {
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  letter: { width: 216, height: 279 },
};

/**
 * Vytvoří kompletní HTML dokument z renderované šablony.
 * Používá se pro živý náhled (iframe) i HTML náhled (nové okno).
 * CSS je shodné s tím, co používá PDF renderer.
 */
export function renderFullDocument(
  bodyHtml: string,
  css: string,
  options: PageOptions,
  title = 'Revizní zpráva'
): string {
  const dim = PAGE_DIMENSIONS[options.pageSize] || PAGE_DIMENSIONS.a4;
  const w = options.orientation === 'landscape' ? dim.height : dim.width;
  const h = options.orientation === 'landscape' ? dim.width : dim.height;
  const m = options.margins;
  const contentW = w - m.left - m.right;

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: ${w}mm ${h}mm;
      margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
    }

    /* === Base CSS (shodné s PDF rendererem) === */
    * { margin: 0; padding: 0; box-sizing: border-box; }

    html {
      background: #525659;
    }

    body {
      font-family: 'Roboto', Arial, sans-serif;
      font-size: 10pt;
      color: #1a1a1a;
      line-height: 1.5;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      background: #525659;
    }

    /* === Uživatelské CSS ze šablony === */
    ${css}

    /* === Reset page-container (kdyby byl v HTML) === */
    .page-container {
      width: auto !important;
      min-height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      background: transparent !important;
    }

    /* === Stránkování === */
    .page-break {
      break-before: always;
      page-break-before: always;
      height: 0;
    }
    .rozvadec-card, .mistnost-card, .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* === Vizuální stránka v náhledu === */
    .page-sheet {
      width: ${w}mm;
      height: ${h}mm;
      margin: 8mm auto;
      padding: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
      background: white;
      box-shadow: 0 2px 12px rgba(0,0,0,0.3);
      overflow: hidden;
      position: relative;
    }

    /* Pomocný kontejner pro měření */
    .page-measure {
      width: ${w}mm;
      padding: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
      background: white;
      position: absolute;
      left: -99999px;
      top: 0;
    }

    /* Při tisku = čisté stránky */
    @media print {
      html, body { background: white !important; }
      .page-sheet {
        margin: 0;
        box-shadow: none;
        height: auto;
        page-break-after: always;
      }
      .page-sheet:last-child {
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <!-- Skrytý kontejner pro měření -->
  <div class="page-measure" id="measure">
    ${bodyHtml}
  </div>

  <!-- Viditelné stránky (naplní JS) -->
  <div id="pages"></div>

  <script>
  (function() {
    var mmToPx = function(mm) {
      var d = document.createElement('div');
      d.style.width = mm + 'mm';
      d.style.position = 'absolute';
      d.style.visibility = 'hidden';
      document.body.appendChild(d);
      var px = d.offsetWidth;
      document.body.removeChild(d);
      return px;
    };

    var contentHPx = mmToPx(${h - m.top - m.bottom});
    var contentWMm = ${w - m.left - m.right};
    var measure = document.getElementById('measure');
    var pagesDiv = document.getElementById('pages');
    if (!measure || !pagesDiv) return;

    // Měřicí div
    var testDiv = document.createElement('div');
    testDiv.style.width = contentWMm + 'mm';
    testDiv.style.position = 'absolute';
    testDiv.style.left = '-99999px';
    testDiv.style.visibility = 'hidden';
    document.body.appendChild(testDiv);

    function measureH(node) {
      var clone = node.cloneNode(true);
      testDiv.innerHTML = '';
      var tag = (clone.tagName || '').toUpperCase();
      if (tag === 'TR') {
        var tbl = document.createElement('table');
        tbl.style.width = '100%';
        tbl.style.borderCollapse = 'collapse';
        var mtb = document.createElement('tbody');
        mtb.appendChild(clone);
        tbl.appendChild(mtb);
        testDiv.appendChild(tbl);
      } else if (tag === 'THEAD' || tag === 'TBODY' || tag === 'TFOOT') {
        var tbl2 = document.createElement('table');
        tbl2.style.width = '100%';
        tbl2.style.borderCollapse = 'collapse';
        tbl2.appendChild(clone);
        testDiv.appendChild(tbl2);
      } else {
        testDiv.appendChild(clone);
      }
      return testDiv.offsetHeight;
    }

    // ── Rozdělit <table> na kusy — kumulativní měření s opakovaným <thead> ──
    function splitTable(table) {
      var thead = table.querySelector('thead');
      var tbody = table.querySelector('tbody');
      if (!tbody) return [table.cloneNode(true)];
      var rows = Array.from(tbody.querySelectorAll(':scope > tr'));
      if (rows.length === 0) return [table.cloneNode(true)];

      var chunks = [];
      var startIdx = 0;

      while (startIdx < rows.length) {
        // Vytvořit měřicí tabulku s thead
        testDiv.innerHTML = '';
        var mt = document.createElement('table');
        for (var a = 0; a < table.attributes.length; a++) {
          mt.setAttribute(table.attributes[a].name, table.attributes[a].value);
        }
        if (thead) mt.appendChild(thead.cloneNode(true));
        var mtb = document.createElement('tbody');
        mt.appendChild(mtb);
        testDiv.appendChild(mt);

        var lastFitCount = 0;
        for (var i = startIdx; i < rows.length; i++) {
          mtb.appendChild(rows[i].cloneNode(true));
          var h = testDiv.offsetHeight;
          if (h > contentHPx && lastFitCount > 0) break;
          lastFitCount = i - startIdx + 1;
        }
        if (lastFitCount === 0) lastFitCount = 1;
        chunks.push(rows.slice(startIdx, startIdx + lastFitCount));
        startIdx += lastFitCount;
      }

      var result = [];
      for (var c = 0; c < chunks.length; c++) {
        var t = document.createElement('table');
        for (var a2 = 0; a2 < table.attributes.length; a2++) {
          t.setAttribute(table.attributes[a2].name, table.attributes[a2].value);
        }
        if (thead) t.appendChild(thead.cloneNode(true));
        var tb = document.createElement('tbody');
        for (var cr = 0; cr < chunks[c].length; cr++) {
          tb.appendChild(chunks[c][cr].cloneNode(true));
        }
        t.appendChild(tb);
        result.push(t);
      }
      return result;
    }

    // ── Rozdělit kartu (rozvadec/mistnost) — kumulativní měření celé karty ──
    function splitCard(card) {
      if (measureH(card) <= contentHPx) return [card.cloneNode(true)];

      var header = null;
      var info = null;
      var table = null;
      var otherNodes = [];
      var kids = Array.from(card.childNodes);
      for (var k = 0; k < kids.length; k++) {
        var kid = kids[k];
        if (kid.nodeType !== 1) continue;
        var cl = kid.className || '';
        if (cl.indexOf('-header') !== -1) header = kid;
        else if (cl.indexOf('-info') !== -1) info = kid;
        else if (kid.tagName === 'TABLE') table = kid;
        else otherNodes.push(kid);
      }

      if (!table) return [card.cloneNode(true)];

      var thead = table.querySelector('thead');
      var tbody = table.querySelector('tbody');
      if (!tbody) return [card.cloneNode(true)];
      var rows = Array.from(tbody.querySelectorAll(':scope > tr'));
      if (rows.length === 0) return [card.cloneNode(true)];

      // Kumulativní měření: budujeme kartu v testDiv a měříme po každém řádku
      var chunks = [];
      var startIdx = 0;

      while (startIdx < rows.length) {
        var isFirst = chunks.length === 0;

        // Vytvořit měřicí kartu: wrapper + header + info(jen první) + table(thead + řádky)
        testDiv.innerHTML = '';
        var testCard = card.cloneNode(false);
        if (isFirst) {
          if (header) testCard.appendChild(header.cloneNode(true));
          if (info) testCard.appendChild(info.cloneNode(true));
        } else {
          if (header) {
            var ch = header.cloneNode(true);
            ch.textContent = ch.textContent + ' (pokračování)';
            testCard.appendChild(ch);
          }
        }
        var mt = document.createElement('table');
        for (var a = 0; a < table.attributes.length; a++) {
          mt.setAttribute(table.attributes[a].name, table.attributes[a].value);
        }
        if (thead) mt.appendChild(thead.cloneNode(true));
        var mtb = document.createElement('tbody');
        mt.appendChild(mtb);
        testCard.appendChild(mt);
        testDiv.appendChild(testCard);

        var lastFitCount = 0;
        for (var i = startIdx; i < rows.length; i++) {
          mtb.appendChild(rows[i].cloneNode(true));
          var h = testDiv.offsetHeight;
          if (h > contentHPx && lastFitCount > 0) break;
          lastFitCount = i - startIdx + 1;
        }
        if (lastFitCount === 0) lastFitCount = 1;
        chunks.push({ start: startIdx, count: lastFitCount, isFirst: isFirst });
        startIdx += lastFitCount;
      }

      var result = [];
      for (var p = 0; p < chunks.length; p++) {
        var wrapper = card.cloneNode(false);
        if (chunks[p].isFirst) {
          if (header) wrapper.appendChild(header.cloneNode(true));
          if (info) wrapper.appendChild(info.cloneNode(true));
        } else {
          if (header) {
            var contH = header.cloneNode(true);
            contH.textContent = contH.textContent + ' (pokračování)';
            wrapper.appendChild(contH);
          }
        }
        var t = document.createElement('table');
        for (var a2 = 0; a2 < table.attributes.length; a2++) {
          t.setAttribute(table.attributes[a2].name, table.attributes[a2].value);
        }
        if (thead) t.appendChild(thead.cloneNode(true));
        var tb = document.createElement('tbody');
        for (var r = chunks[p].start; r < chunks[p].start + chunks[p].count; r++) {
          tb.appendChild(rows[r].cloneNode(true));
        }
        t.appendChild(tb);
        wrapper.appendChild(t);
        if (p === chunks.length - 1) {
          for (var o = 0; o < otherNodes.length; o++) {
            wrapper.appendChild(otherNodes[o].cloneNode(true));
          }
        }
        result.push(wrapper);
      }
      return result;
    }

    // ── Flatten: inteligentně rozbalí velké kontejnery ──
    function flattenNodes(nodes) {
      var result = [];
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node.nodeType === 3 && (!node.textContent || !node.textContent.trim())) continue;
        if (node.nodeType === 8) { result.push(node); continue; }
        if (node.nodeType !== 1) { result.push(node); continue; }

        var elH = measureH(node);
        if (elH <= contentHPx) { result.push(node); continue; }

        var cl = node.className || '';
        var tag = node.tagName || '';

        // Karta (rozvadec/mistnost) — inteligentní split
        if (cl.indexOf('rozvadec-card') !== -1 || cl.indexOf('mistnost-card') !== -1) {
          var cardParts = splitCard(node);
          for (var cp = 0; cp < cardParts.length; cp++) result.push(cardParts[cp]);
          continue;
        }

        // Tabulka — split s opakovaným thead
        if (tag === 'TABLE') {
          var tParts = splitTable(node);
          for (var tp = 0; tp < tParts.length; tp++) result.push(tParts[tp]);
          continue;
        }

        // Generický kontejner — rozbalit children
        var children = node.childNodes;
        if (children.length === 0) {
          result.push(node);
        } else {
          var inner = flattenNodes(Array.from(children));
          for (var j = 0; j < inner.length; j++) result.push(inner[j]);
        }
      }
      return result;
    }

    // 1. Zpracovat page-break elementy → komentářové markery
    var breaks = measure.querySelectorAll('.page-break');
    breaks.forEach(function(br) {
      var marker = document.createComment('PAGE_BREAK');
      var parent = br.parentNode;
      if (parent && parent !== measure) {
        var afterClone = parent.cloneNode(false);
        var sibling = br.nextSibling;
        while (sibling) {
          var next = sibling.nextSibling;
          afterClone.appendChild(sibling);
          sibling = next;
        }
        var grandParent = parent.parentNode;
        if (grandParent) {
          grandParent.insertBefore(marker, parent.nextSibling);
          if (afterClone.childNodes.length > 0) {
            grandParent.insertBefore(afterClone, marker.nextSibling);
          }
        }
        br.remove();
      } else {
        if (parent) parent.replaceChild(marker, br);
      }
    });

    // 2. Flatten + stránkovat
    var flat = flattenNodes(Array.from(measure.childNodes));
    var pages = [];
    var currentPage = document.createElement('div');
    var currentH = 0;

    function flushPage() {
      if (currentPage.childNodes.length > 0) {
        pages.push(currentPage);
      }
      currentPage = document.createElement('div');
      currentH = 0;
    }

    for (var i = 0; i < flat.length; i++) {
      var node = flat[i];
      // Page-break marker
      if (node.nodeType === 8 && node.textContent === 'PAGE_BREAK') {
        flushPage();
        continue;
      }
      // Prázdné textové nody
      if (node.nodeType === 3 && (!node.textContent || !node.textContent.trim())) continue;

      var elH = measureH(node);

      // Pokud se nevejde a stránka není prázdná → nová stránka
      if (currentH + elH > contentHPx && currentH > 0) {
        flushPage();
      }

      currentPage.appendChild(node.cloneNode(true));
      currentH += elH;
    }

    flushPage();
    document.body.removeChild(testDiv);

    // 3. Vykreslit stránky
    pages.forEach(function(page) {
      var sheet = document.createElement('div');
      sheet.className = 'page-sheet';
      sheet.innerHTML = page.innerHTML;
      pagesDiv.appendChild(sheet);
    });

    measure.style.display = 'none';
  })();
  </` + `script>
</body>
</html>`;
}

/**
 * Escape HTML pro bezpečné vložení do atributů
 */
function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// DOSTUPNÉ PROMĚNNÉ (pro UI variable picker)
// ============================================================

export interface VariableInfo {
  key: string;
  label: string;
  category: string;
}

export const TEMPLATE_VARIABLES: VariableInfo[] = [
  // Revize
  { key: 'revize.cisloRevize', label: 'Číslo revize', category: 'Revize' },
  { key: 'revize.nazev', label: 'Název revize', category: 'Revize' },
  { key: 'revize.adresa', label: 'Adresa objektu', category: 'Revize' },
  { key: 'revize.objednatel', label: 'Objednatel', category: 'Revize' },
  { key: 'revize.typRevize', label: 'Typ revize', category: 'Revize' },
  { key: 'revize.kategorieRevize', label: 'Kategorie revize', category: 'Revize' },
  { key: 'revize.stav', label: 'Stav revize', category: 'Revize' },
  { key: 'revize.datum', label: 'Datum revize', category: 'Revize' },
  { key: 'revize.datumDokonceni', label: 'Datum dokončení', category: 'Revize' },
  { key: 'revize.datumPlatnosti', label: 'Datum platnosti', category: 'Revize' },
  { key: 'revize.datumVypracovani', label: 'Datum vypracování', category: 'Revize' },
  { key: 'revize.termin', label: 'Termín platnosti (měsíce)', category: 'Revize' },
  { key: 'revize.vysledek', label: 'Výsledek revize', category: 'Revize' },
  { key: 'revize.vysledekOduvodneni', label: 'Odůvodnění výsledku', category: 'Revize' },
  { key: 'revize.zaver', label: 'Závěr', category: 'Revize' },
  { key: 'revize.rozsahRevize', label: 'Předmět revize', category: 'Revize' },
  { key: 'revize.predmetNeni', label: 'Předmětem revize není', category: 'Revize' },
  { key: 'revize.napetovaSoustava', label: 'Napěťová soustava', category: 'Revize' },
  { key: 'revize.ochranaOpatreni', label: 'Ochranná opatření', category: 'Revize' },
  { key: 'revize.duvodMimoradne', label: 'Důvod mimořádné revize', category: 'Revize' },
  { key: 'revize.podklady', label: 'Seznam podkladů', category: 'Revize' },
  { key: 'revize.vyhodnoceniPredchozich', label: 'Vyhodnocení předchozích revizí', category: 'Revize' },
  { key: 'revize.provedeneUkony', label: 'Soupis provedených úkonů', category: 'Revize' },
  { key: 'revize.poznamka', label: 'Poznámka', category: 'Revize' },

  // Firma provádějící revizi (z revize)
  { key: 'revize.firmaJmeno', label: 'Firma revize – název', category: 'Revize' },
  { key: 'revize.firmaAdresa', label: 'Firma revize – adresa', category: 'Revize' },
  { key: 'revize.firmaIco', label: 'Firma revize – IČO', category: 'Revize' },
  { key: 'revize.firmaDic', label: 'Firma revize – DIČ', category: 'Revize' },

  // Firma (z nastavení)
  { key: 'firma.nazev', label: 'Název firmy', category: 'Firma' },
  { key: 'firma.adresa', label: 'Adresa firmy', category: 'Firma' },
  { key: 'firma.ico', label: 'IČO firmy', category: 'Firma' },
  { key: 'firma.dic', label: 'DIČ firmy', category: 'Firma' },
  { key: 'firma.logo', label: 'Logo firmy (URL/base64)', category: 'Firma' },

  // Technik
  { key: 'technik.jmeno', label: 'Jméno technika', category: 'Technik' },
  { key: 'technik.cisloOpravneni', label: 'Číslo oprávnění', category: 'Technik' },
  { key: 'technik.osvedceni', label: 'Osvědčení', category: 'Technik' },
  { key: 'technik.adresa', label: 'Adresa technika', category: 'Technik' },
  { key: 'technik.ico', label: 'IČO technika', category: 'Technik' },
  { key: 'technik.telefon', label: 'Telefon', category: 'Technik' },
  { key: 'technik.email', label: 'E-mail', category: 'Technik' },

  // Zákazník
  { key: 'zakaznik.nazev', label: 'Název zákazníka', category: 'Zákazník' },
  { key: 'zakaznik.adresa', label: 'Adresa zákazníka', category: 'Zákazník' },
  { key: 'zakaznik.ico', label: 'IČO zákazníka', category: 'Zákazník' },
  { key: 'zakaznik.dic', label: 'DIČ zákazníka', category: 'Zákazník' },
  { key: 'zakaznik.kontaktOsoba', label: 'Kontaktní osoba', category: 'Zákazník' },
  { key: 'zakaznik.telefon', label: 'Telefon zákazníka', category: 'Zákazník' },
  { key: 'zakaznik.email', label: 'E-mail zákazníka', category: 'Zákazník' },
  { key: 'zakaznik.poznamka', label: 'Poznámka zákazníka', category: 'Zákazník' },

  // Statistiky
  { key: 'stats.pocetRozvadecu', label: 'Počet rozvaděčů', category: 'Statistiky' },
  { key: 'stats.pocetOkruhu', label: 'Počet okruhů', category: 'Statistiky' },
  { key: 'stats.pocetZavad', label: 'Počet závad', category: 'Statistiky' },
  { key: 'stats.pocetZavadOtevrenych', label: 'Počet otevřených závad', category: 'Statistiky' },
  { key: 'stats.pocetZavadVyresenych', label: 'Počet vyřešených závad', category: 'Statistiky' },
  { key: 'stats.pocetMistnosti', label: 'Počet místností', category: 'Statistiky' },
  { key: 'stats.pocetZarizeni', label: 'Počet zařízení', category: 'Statistiky' },
  { key: 'stats.pocetPristroju', label: 'Počet přístrojů', category: 'Statistiky' },

  // Datum
  { key: 'datum.dnes', label: 'Dnešní datum', category: 'Datum' },
  { key: 'datum.cas', label: 'Aktuální čas', category: 'Datum' },
  { key: 'datum.rok', label: 'Aktuální rok', category: 'Datum' },

  // Stránkování
  { key: 'page.current', label: 'Číslo stránky', category: 'Stránkování' },
  { key: 'page.total', label: 'Celkem stránek', category: 'Stránkování' },
  { key: 'page.info', label: 'Strana X z Y', category: 'Stránkování' },
];

// Bloky k vložení do šablony
export interface InsertableBlock {
  id: string;
  label: string;
  description: string;
  html: string;
}

export const INSERTABLE_BLOCKS: InsertableBlock[] = [
  {
    id: 'info-grid',
    label: 'Informační mřížka',
    description: 'Dvousloupcová mřížka s popisky a hodnotami',
    html: `<div class="info-grid">
  <div>
    <span class="info-label">Popisek:</span>
    <span class="info-value">{{revize.nazev}}</span>
  </div>
  <div>
    <span class="info-label">Popisek:</span>
    <span class="info-value">Hodnota</span>
  </div>
</div>`,
  },
  {
    id: 'section',
    label: 'Sekce s nadpisem',
    description: 'Sekce s modrým nadpisem',
    html: `<div class="section">
  <h2 class="section-title">Název sekce</h2>
  <p>Obsah sekce...</p>
</div>`,
  },
  {
    id: 'rozvadece-repeater',
    label: 'Rozvaděče s okruhy',
    description: 'Kompletní cyklus přes rozvaděče včetně tabulky okruhů',
    html: `{{#if rozvadece}}
<div class="section">
  <h2 class="section-title">Rozvaděče ({{stats.pocetRozvadecu}})</h2>
  {{#each rozvadece}}
  <div class="rozvadec-card">
    <div class="rozvadec-header">{{oznaceni}} - {{nazev}}</div>
    <div class="rozvadec-info">
      <div><span class="info-label">Umístění:</span> {{umisteni}}</div>
      <div><span class="info-label">Typ:</span> {{typRozvadece}}</div>
      <div><span class="info-label">Krytí:</span> {{stupenKryti}}</div>
    </div>
    {{#if okruhy}}
    <table>
      <thead>
        <tr>
          <th>Č.</th><th>Název</th><th>Jistič</th><th>Proud</th>
          <th>Fáze</th><th>Vodič</th><th>R izol [MΩ]</th><th>Zs [Ω]</th>
          <th>I∆n [mA]</th><th>t [ms]</th>
        </tr>
      </thead>
      <tbody>
        {{#each okruhy}}
        <tr>
          <td>{{cislo}}</td><td>{{nazev}}</td><td>{{jisticTyp}}</td>
          <td>{{jisticProud}}</td><td>{{pocetFazi}}</td><td>{{vodic}}</td>
          <td>{{izolacniOdpor}}</td><td>{{impedanceSmycky}}</td>
          <td>{{proudovyChranicMa}}</td><td>{{casOdpojeni}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    {{/if}}
  </div>
  {{/each}}
</div>
{{/if}}`,
  },
  {
    id: 'mistnosti-repeater',
    label: 'Místnosti se zařízeními',
    description: 'Cyklus přes místnosti s tabulkou zařízení',
    html: `{{#if mistnosti}}
<div class="section">
  <h2 class="section-title">Místnosti ({{stats.pocetMistnosti}})</h2>
  {{#each mistnosti}}
  <div class="mistnost-card">
    <div class="mistnost-header">{{nazev}} ({{typ}})</div>
    <div class="mistnost-info">
      <div><span class="info-label">Patro:</span> {{patro}}</div>
      <div><span class="info-label">Plocha:</span> {{plocha}} m²</div>
      <div><span class="info-label">Prostředí:</span> {{prostredi}}</div>
    </div>
    {{#if zarizeni}}
    <table>
      <thead>
        <tr><th>Název</th><th>Označení</th><th>Ks</th><th>Třída</th><th>Příkon</th><th>Stav</th></tr>
      </thead>
      <tbody>
        {{#each zarizeni}}
        <tr>
          <td>{{nazev}}</td><td>{{oznaceni}}</td><td>{{pocetKs}}</td>
          <td>{{trida}}</td><td>{{prikonW}}</td><td>{{stav}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    {{/if}}
  </div>
  {{/each}}
</div>
{{/if}}`,
  },
  {
    id: 'zavady-table',
    label: 'Tabulka závad',
    description: 'Přehled zjištěných závad',
    html: `{{#if zavady}}
<div class="section">
  <h2 class="section-title">Zjištěné závady ({{stats.pocetZavad}})</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 50%">Popis</th>
        <th style="width: 15%">Závažnost</th>
        <th style="width: 15%">Stav</th>
        <th style="width: 20%">Poznámka</th>
      </tr>
    </thead>
    <tbody>
      {{#each zavady}}
      <tr>
        <td>{{popis}}</td>
        <td style="text-align:center">{{zavaznost}}</td>
        <td style="text-align:center">{{stav}}</td>
        <td>{{poznamka}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
</div>
{{/if}}`,
  },
  {
    id: 'pristroje-table',
    label: 'Měřicí přístroje',
    description: 'Tabulka použitých měřicích přístrojů',
    html: `{{#if pouzitePristroje}}
<div class="section">
  <h2 class="section-title">Použité měřicí přístroje</h2>
  <table>
    <thead>
      <tr><th>Název</th><th>Výrobce</th><th>Model</th><th>Výr. číslo</th><th>Kalibrace do</th></tr>
    </thead>
    <tbody>
      {{#each pouzitePristroje}}
      <tr>
        <td>{{nazev}}</td><td>{{vyrobce}}</td><td>{{model}}</td>
        <td>{{vyrobniCislo}}</td><td>{{platnostKalibrace}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
</div>
{{/if}}`,
  },
  {
    id: 'vysledek',
    label: 'Výsledek revize',
    description: 'Box s výsledkem revize (schopno/neschopno)',
    html: `<div class="section">
  <h2 class="section-title">Výsledek revize</h2>
  <div class="vysledek-box">
    Elektrické zařízení je: <strong>{{revize.vysledek | upper}}</strong> bezpečného provozu
  </div>
  {{#if revize.vysledekOduvodneni}}
  <p><strong>Odůvodnění:</strong> {{revize.vysledekOduvodneni}}</p>
  {{/if}}
  {{#if revize.zaver}}
  <p><strong>Závěr:</strong> {{revize.zaver}}</p>
  {{/if}}
</div>`,
  },
  {
    id: 'podpis',
    label: 'Podpis technika',
    description: 'Podpisový blok s datem a jménem',
    html: `<div class="report-footer">
  <div>
    <p>Dne {{datum.dnes}}</p>
  </div>
  <div style="text-align: center;">
    <div style="border-top: 0.5mm solid #333; padding-top: 2mm; min-width: 50mm;">
      {{technik.jmeno}}<br>
      <span style="font-size: 7pt;">Revizní technik č. {{technik.cisloOpravneni}}</span>
    </div>
  </div>
</div>`,
  },
  {
    id: 'page-break',
    label: 'Zalomení stránky',
    description: 'Vynucené zalomení na novou stránku',
    html: `<div class="page-break"></div>`,
  },
];
