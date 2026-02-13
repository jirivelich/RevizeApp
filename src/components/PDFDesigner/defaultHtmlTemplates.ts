// defaultHtmlTemplates.ts - Výchozí HTML šablony pro revizní zprávy
// Používají Handlebars-like syntaxi zpracovanou templateEngine.ts

// ============================================================
// VÝCHOZÍ CSS PRO ŠABLONY
// ============================================================

export const DEFAULT_TEMPLATE_CSS = `
/* === Základní layout === */
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #1e40af;
  padding-bottom: 4mm;
  margin-bottom: 4mm;
}

.report-header img {
  max-height: 15mm;
  max-width: 40mm;
}

.report-title {
  font-size: 18pt;
  font-weight: bold;
  color: #1e40af;
  text-align: center;
  margin: 4mm 0 2mm 0;
}

.report-subtitle {
  text-align: center;
  color: #666;
  font-size: 9pt;
  margin-bottom: 5mm;
}

/* === Info mřížka === */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5mm 4mm;
  margin-bottom: 4mm;
}

.info-label {
  color: #6b7280;
  font-size: 8pt;
}

.info-value {
  font-weight: 500;
}

/* === Sekce === */
.section {
  margin-bottom: 5mm;
}

.section-title {
  font-size: 12pt;
  font-weight: bold;
  color: #1e40af;
  border-bottom: 1px solid #1e40af;
  padding-bottom: 1mm;
  margin-bottom: 3mm;
}

/* === Tabulky === */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8pt;
  margin-bottom: 3mm;
}

table th {
  background: #1e40af;
  color: white;
  padding: 1.5mm 2mm;
  text-align: left;
  font-weight: 500;
  font-size: 7pt;
}

table td {
  padding: 1mm 2mm;
  border-bottom: 0.3mm solid #e5e7eb;
}

table tr:nth-child(even) td {
  background: #f9fafb;
}

/* === Rozvaděč karta === */
.rozvadec-card {
  border: 0.5mm solid #dbeafe;
  border-radius: 1mm;
  margin-bottom: 4mm;
  break-inside: avoid;
  overflow: hidden;
}

.rozvadec-header {
  background: #1e40af;
  color: white;
  padding: 2mm 3mm;
  font-weight: bold;
  font-size: 10pt;
}

.rozvadec-info {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 2mm;
  padding: 2mm 3mm;
  background: #f8fafc;
  border-bottom: 0.3mm solid #e2e8f0;
  font-size: 8pt;
}

/* === Místnost karta === */
.mistnost-card {
  border: 0.5mm solid #bbf7d0;
  border-radius: 1mm;
  margin-bottom: 4mm;
  break-inside: avoid;
  overflow: hidden;
}

.mistnost-header {
  background: #16a34a;
  color: white;
  padding: 2mm 3mm;
  font-weight: bold;
  font-size: 10pt;
}

.mistnost-info {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 2mm;
  padding: 2mm 3mm;
  background: #f0fdf4;
  border-bottom: 0.3mm solid #bbf7d0;
  font-size: 8pt;
}

/* === Výsledek === */
.vysledek-box {
  border: 1mm solid #1e40af;
  padding: 4mm 5mm;
  text-align: center;
  font-size: 14pt;
  font-weight: bold;
  margin: 4mm 0;
  border-radius: 1mm;
}

/* === Patička === */
.report-footer {
  margin-top: 10mm;
  padding-top: 3mm;
  border-top: 0.5mm solid #e5e7eb;
  font-size: 8pt;
  color: #6b7280;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

/* === Stránkování === */
.page-break {
  break-before: always;
  height: 0;
}

.avoid-break {
  break-inside: avoid;
}
`;

// ============================================================
// KOMPLETNÍ ŠABLONA REVIZNÍ ZPRÁVY
// ============================================================

export const REVIZNI_ZPRAVA_HTML = `<!-- Hlavička -->
<div class="report-header">
  <div>
    <strong style="font-size: 12pt;">{{firma.nazev}}</strong><br>
    <span style="font-size: 8pt; color: #666;">{{firma.adresa}}</span><br>
    <span style="font-size: 8pt; color: #666;">IČO: {{firma.ico}}{{#if firma.dic}} | DIČ: {{firma.dic}}{{/if}}</span>
  </div>
  {{#if firma.logo}}
  <img src="{{firma.logo}}" alt="Logo" />
  {{/if}}
</div>

<h1 class="report-title">REVIZNÍ ZPRÁVA</h1>
<p class="report-subtitle">elektrického zařízení dle ČSN 33 2000-6 ed. 2</p>

<!-- Základní údaje -->
<div class="section">
  <h2 class="section-title">1. Základní údaje</h2>
  <div class="info-grid">
    <div><span class="info-label">Číslo revize:</span> <span class="info-value">{{revize.cisloRevize}}</span></div>
    <div><span class="info-label">Typ revize:</span> <span class="info-value">{{revize.typRevize}}</span></div>
    <div><span class="info-label">Datum revize:</span> <span class="info-value">{{revize.datum}}</span></div>
    <div><span class="info-label">Platnost do:</span> <span class="info-value">{{revize.datumPlatnosti}}</span></div>
    <div><span class="info-label">Adresa objektu:</span> <span class="info-value">{{revize.adresa}}</span></div>
    <div><span class="info-label">Objednatel:</span> <span class="info-value">{{revize.objednatel}}</span></div>
  </div>
</div>

<!-- Zákazník -->
{{#if zakaznik.nazev}}
<div class="section">
  <h2 class="section-title">2. Objednavatel / Zákazník</h2>
  <div class="info-grid">
    <div><span class="info-label">Název:</span> <span class="info-value">{{zakaznik.nazev}}</span></div>
    <div><span class="info-label">IČO:</span> <span class="info-value">{{zakaznik.ico}}</span></div>
    <div><span class="info-label">Adresa:</span> <span class="info-value">{{zakaznik.adresa}}</span></div>
    <div><span class="info-label">Kontakt:</span> <span class="info-value">{{zakaznik.kontaktniOsoba}}</span></div>
  </div>
</div>
{{/if}}

<!-- Revizní technik -->
<div class="section">
  <h2 class="section-title">3. Revizní technik</h2>
  <div class="info-grid">
    <div><span class="info-label">Jméno:</span> <span class="info-value">{{technik.jmeno}}</span></div>
    <div><span class="info-label">Číslo oprávnění:</span> <span class="info-value">{{technik.cisloOpravneni}}</span></div>
    <div><span class="info-label">Osvědčení:</span> <span class="info-value">{{technik.osvedceni}}</span></div>
    <div><span class="info-label">IČO:</span> <span class="info-value">{{technik.ico}}</span></div>
    <div><span class="info-label">Telefon:</span> <span class="info-value">{{technik.telefon}}</span></div>
    <div><span class="info-label">E-mail:</span> <span class="info-value">{{technik.email}}</span></div>
  </div>
</div>

<!-- Předmět revize -->
{{#if revize.rozsahRevize}}
<div class="section">
  <h2 class="section-title">4. Předmět revize</h2>
  <p>{{revize.rozsahRevize}}</p>
  {{#if revize.predmetNeni}}
  <p style="color: #666; margin-top: 2mm;"><em>Předmětem revize není: {{revize.predmetNeni}}</em></p>
  {{/if}}
</div>
{{/if}}

<!-- Technické údaje -->
{{#if revize.napetovaSoustava}}
<div class="section">
  <h2 class="section-title">5. Technické údaje</h2>
  <div class="info-grid" style="margin-bottom: 3mm;">
    <div><span class="info-label">Napěťová soustava:</span> <span class="info-value">{{revize.napetovaSoustava}}</span></div>
  </div>
  {{#if ochranaOpatreniList}}
  <p style="font-size: 9pt; font-weight: 500; margin-bottom: 2mm;">Ochrana před úrazem elektrickým proudem:</p>
  <table>
    <thead>
      <tr>
        <th style="width: 85%; text-align: left;">Druh ochrany</th>
        <th style="width: 15%; text-align: center;">Použito</th>
      </tr>
    </thead>
    <tbody>
      {{#each ochranaOpatreniList}}
      <tr>
        <td>{{nazev}}</td>
        <td style="text-align: center; font-weight: bold;">{{pouzito_text}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  {{/if}}
</div>
{{/if}}

<!-- Rozvaděče s okruhy -->
{{#if rozvadece}}
<div class="section">
  <h2 class="section-title">6. Rozvaděče ({{stats.pocetRozvadecu}})</h2>
  {{#each rozvadece}}
  <div class="rozvadec-card">
    <div class="rozvadec-header">{{oznaceni}} - {{nazev}}</div>
    <div class="rozvadec-info">
      <div><span class="info-label">Umístění:</span> {{umisteni}}</div>
      <div><span class="info-label">Typ:</span> {{typRozvadece}}</div>
      <div><span class="info-label">Stupeň krytí:</span> {{stupenKryti}}</div>
    </div>
    {{#if okruhy}}
    <table>
      <thead>
        <tr>
          <th style="width:5%; text-align:center">Č.</th>
          <th style="width:18%">Název okruhu</th>
          <th style="width:8%; text-align:center">Jistič</th>
          <th style="width:8%; text-align:center">Proud</th>
          <th style="width:6%; text-align:center">Fáze</th>
          <th style="width:11%; text-align:center">Vodič</th>
          <th style="width:11%; text-align:center">R izol [MΩ]</th>
          <th style="width:11%; text-align:center">Zs [Ω]</th>
          <th style="width:11%; text-align:center">I∆n [mA]</th>
          <th style="width:11%; text-align:center">t [ms]</th>
        </tr>
      </thead>
      <tbody>
        {{#each okruhy}}
        <tr>
          <td style="text-align:center">{{cislo}}</td>
          <td>{{nazev}}</td>
          <td style="text-align:center">{{jisticTyp}}</td>
          <td style="text-align:center">{{jisticProud}}</td>
          <td style="text-align:center">{{pocetFazi}}</td>
          <td style="text-align:center">{{vodic}}</td>
          <td style="text-align:center">{{izolacniOdpor}}</td>
          <td style="text-align:center">{{impedanceSmycky}}</td>
          <td style="text-align:center">{{proudovyChranicMa}}</td>
          <td style="text-align:center">{{casOdpojeni}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    {{/if}}
  </div>
  {{/each}}
</div>
{{/if}}

<!-- Místnosti se zařízeními -->
{{#if mistnosti}}
<div class="section">
  <h2 class="section-title">7. Místnosti ({{stats.pocetMistnosti}})</h2>
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
        <tr>
          <th style="width:25%">Název</th>
          <th style="width:15%">Označení</th>
          <th style="width:8%; text-align:center">Ks</th>
          <th style="width:12%; text-align:center">Třída</th>
          <th style="width:12%; text-align:center">Příkon [W]</th>
          <th style="width:13%; text-align:center">Stav</th>
          <th style="width:15%">Poznámka</th>
        </tr>
      </thead>
      <tbody>
        {{#each zarizeni}}
        <tr>
          <td>{{nazev}}</td>
          <td>{{oznaceni}}</td>
          <td style="text-align:center">{{pocetKs}}</td>
          <td style="text-align:center">{{trida}}</td>
          <td style="text-align:center">{{prikonW}}</td>
          <td style="text-align:center">{{stav}}</td>
          <td>{{poznamka}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    {{/if}}
  </div>
  {{/each}}
</div>
{{/if}}

<!-- Závady -->
{{#if zavady}}
<div class="section">
  <h2 class="section-title">8. Zjištěné závady ({{stats.pocetZavad}})</h2>
  <table>
    <thead>
      <tr>
        <th style="width:50%">Popis závady</th>
        <th style="width:15%; text-align:center">Závažnost</th>
        <th style="width:15%; text-align:center">Stav</th>
        <th style="width:20%">Poznámka</th>
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
{{/if}}

<!-- Měřicí přístroje -->
{{#if pouzitePristroje}}
<div class="section">
  <h2 class="section-title">9. Použité měřicí přístroje</h2>
  <table>
    <thead>
      <tr>
        <th style="width:22%">Název</th>
        <th style="width:18%">Výrobce</th>
        <th style="width:18%">Model</th>
        <th style="width:22%">Výrobní číslo</th>
        <th style="width:20%; text-align:center">Kalibrace do</th>
      </tr>
    </thead>
    <tbody>
      {{#each pouzitePristroje}}
      <tr>
        <td>{{nazev}}</td>
        <td>{{vyrobce}}</td>
        <td>{{model}}</td>
        <td>{{vyrobniCislo}}</td>
        <td style="text-align:center">{{platnostKalibrace}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
</div>
{{/if}}

<!-- Výsledek revize -->
<div class="section">
  <h2 class="section-title">10. Výsledek revize</h2>
  <div class="vysledek-box">
    Elektrické zařízení je: <strong>{{revize.vysledek | upper}}</strong> bezpečného provozu
  </div>
  {{#if revize.vysledekOduvodneni}}
  <p style="margin-top: 2mm;"><strong>Odůvodnění:</strong> {{revize.vysledekOduvodneni}}</p>
  {{/if}}
  {{#if revize.zaver}}
  <p style="margin-top: 2mm;"><strong>Závěr:</strong> {{revize.zaver}}</p>
  {{/if}}
</div>

<!-- Podpis -->
<div class="report-footer">
  <div>
    <p>Dne {{datum.dnes}}</p>
  </div>
  <div style="text-align: center;">
    <div style="border-top: 0.5mm solid #333; padding-top: 2mm; min-width: 50mm;">
      {{technik.jmeno}}<br>
      <span style="font-size: 7pt;">Revizní technik č. {{technik.cisloOpravneni}}</span>
    </div>
  </div>
</div>
`;

// ============================================================
// JEDNODUCHÁ ŠABLONA
// ============================================================

export const JEDNODUCHA_ZPRAVA_HTML = `<h1 class="report-title">REVIZNÍ ZPRÁVA č. {{revize.cisloRevize}}</h1>
<p class="report-subtitle">{{revize.nazev}}</p>

<div class="info-grid" style="margin: 5mm 0;">
  <div><span class="info-label">Adresa:</span> <span class="info-value">{{revize.adresa}}</span></div>
  <div><span class="info-label">Datum:</span> <span class="info-value">{{revize.datum}}</span></div>
  <div><span class="info-label">Technik:</span> <span class="info-value">{{technik.jmeno}}</span></div>
  <div><span class="info-label">Platnost do:</span> <span class="info-value">{{revize.datumPlatnosti}}</span></div>
</div>

{{#if rozvadece}}
<div class="section">
  <h2 class="section-title">Rozvaděče</h2>
  {{#each rozvadece}}
  <div class="rozvadec-card">
    <div class="rozvadec-header">{{oznaceni}} - {{nazev}}</div>
    {{#if okruhy}}
    <table>
      <thead>
        <tr>
          <th>Č.</th><th>Název</th><th>Jistič</th><th>Proud</th>
          <th>R izol [MΩ]</th><th>Zs [Ω]</th>
        </tr>
      </thead>
      <tbody>
        {{#each okruhy}}
        <tr>
          <td style="text-align:center">{{cislo}}</td>
          <td>{{nazev}}</td>
          <td style="text-align:center">{{jisticTyp}}</td>
          <td style="text-align:center">{{jisticProud}}</td>
          <td style="text-align:center">{{izolacniOdpor}}</td>
          <td style="text-align:center">{{impedanceSmycky}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    {{/if}}
  </div>
  {{/each}}
</div>
{{/if}}

{{#if zavady}}
<div class="section">
  <h2 class="section-title">Závady</h2>
  <table>
    <thead><tr><th>Popis</th><th>Závažnost</th><th>Stav</th></tr></thead>
    <tbody>
      {{#each zavady}}
      <tr><td>{{popis}}</td><td style="text-align:center">{{zavaznost}}</td><td style="text-align:center">{{stav}}</td></tr>
      {{/each}}
    </tbody>
  </table>
</div>
{{/if}}

<div class="vysledek-box" style="margin-top: 8mm;">
  Výsledek: <strong>{{revize.vysledek | upper}}</strong>
</div>

<div class="report-footer">
  <div>{{datum.dnes}}</div>
  <div>{{technik.jmeno}}, opr. č. {{technik.cisloOpravneni}}</div>
</div>
`;

// ============================================================
// SEZNAM VÝCHOZÍCH ŠABLON
// ============================================================

export interface HtmlTemplate {
  id: string;
  name: string;
  description: string;
  html: string;
  css: string;
  pageSize: 'a4' | 'a5' | 'letter';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_HTML_TEMPLATES: HtmlTemplate[] = [
  {
    id: 'revizni-zprava-kompletni',
    name: 'Revizní zpráva - kompletní',
    description: 'Kompletní revizní zpráva se všemi sekcemi',
    html: REVIZNI_ZPRAVA_HTML,
    css: DEFAULT_TEMPLATE_CSS,
    pageSize: 'a4',
    orientation: 'portrait',
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'revizni-zprava-jednoducha',
    name: 'Revizní zpráva - jednoduchá',
    description: 'Zjednodušená revizní zpráva s rozvaděči a závadami',
    html: JEDNODUCHA_ZPRAVA_HTML,
    css: DEFAULT_TEMPLATE_CSS,
    pageSize: 'a4',
    orientation: 'portrait',
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
