/**
 * Export revizní zprávy HROMOSVOD do DOCX
 * Sdílí pomocné funkce z wordExport.ts
 */
import {
  Document, Packer, Paragraph, TextRun, Table,
  AlignmentType, BorderStyle,
  Header, Footer, PageNumber,
  convertMillimetersToTwip,
} from 'docx';
import { saveAs } from 'file-saver';
import type { Revize, Nastaveni, Zakaznik, Zavada, MericiPristroj } from '../types';
import {
  sectionTitle, textParagraph, kvTable, dataTable,
  emptyText, resultBox, signatureSection,
  parseTiskSekce, isSekceVisible, fmtDate,
} from './wordExport';

/* ═══════════════════════════════════════════ */

interface MereniOdporu {
  bod: string;
  hodnota: string;
  limit: string;
  vyhovuje: boolean;
}

interface HromosvodWordData {
  revize: Revize;
  nastaveni: Nastaveni | null;
  zakaznik: Zakaznik | null;
  zavady: Zavada[];
  pristroje: MericiPristroj[];
}

const BLUE = '1e40af';
const DARK = '1e293b';
const GRAY = '64748b';
const GREEN = '16a34a';
const RED = 'dc2626';
const AMBER = 'd97706';
const BORDER_COLOR = 'cbd5e1';

/* Helpers */
const stavLabel = (stav?: string) => {
  switch (stav) {
    case 'vyhovující': return 'Vyhovující';
    case 'nevyhovující': return 'NEVYHOVUJÍCÍ';
    case 'částečně vyhovující': return 'Částečně vyhovující';
    case 'nenainstalováno': return 'Nenainstalováno';
    default: return '—';
  }
};

const stavColor = (stav?: string) => {
  switch (stav) {
    case 'vyhovující': return GREEN;
    case 'nevyhovující': return RED;
    case 'částečně vyhovující': return AMBER;
    default: return GRAY;
  }
};

const tridaLpsLabel = (trida?: string) => {
  switch (trida) {
    case 'I': return 'I — Nejvyšší ochrana';
    case 'II': return 'II — Vysoká ochrana';
    case 'III': return 'III — Standardní ochrana';
    case 'IV': return 'IV — Základní ochrana';
    default: return trida || '—';
  }
};

const typOchranyLabel = (typ?: string) => {
  switch (typ) {
    case 'vnější': return 'Vnější ochrana (jímače + svody + uzemnění)';
    case 'vnitřní': return 'Vnitřní ochrana (SPD + pospojování)';
    case 'kombinovaná': return 'Kombinovaná (vnější + vnitřní)';
    default: return typ || '—';
  }
};

/** Key-value řádek se stavem (barevný) */
function stavKvRow(label: string, stav?: string): Paragraph {
  return new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [
      new TextRun({ text: `${label}  `, bold: true, size: 19, color: '475569', font: 'Segoe UI' }),
      new TextRun({ text: stavLabel(stav), bold: true, size: 19, color: stavColor(stav), font: 'Segoe UI' }),
    ],
  });
}

/* ═══════════════════════════════════════════
   HLAVNÍ EXPORT – HROMOSVOD REVIZE
   ═══════════════════════════════════════════ */

export async function exportHromosvodToWord(data: HromosvodWordData): Promise<void> {
  const { revize, nastaveni, zakaznik, zavady, pristroje } = data;

  const tiskSekce = parseTiskSekce(revize);
  const isSekce = (key: string) => isSekceVisible(tiskSekce, key);

  const typRevizeLabel = revize.typRevize === 'výchozí' ? 'Výchozí revize' :
    revize.typRevize === 'pravidelná' ? 'Pravidelná revize' :
    `Mimořádná revize${revize.duvodMimoradne ? ` – ${revize.duvodMimoradne}` : ''}`;

  const vysledekLabel = revize.vysledek === 'schopno' ? 'SCHOPNO BEZPEČNÉHO PROVOZU' :
    revize.vysledek === 'neschopno' ? 'NESCHOPNO BEZPEČNÉHO PROVOZU' : '—';

  const vysledekColor = revize.vysledek === 'schopno' ? GREEN :
    revize.vysledek === 'neschopno' ? RED : AMBER;

  // Měření odporů
  let mereni: MereniOdporu[] = [];
  if (revize.hromosvodMereniOdporu) {
    try { mereni = JSON.parse(revize.hromosvodMereniOdporu); } catch { /* ok */ }
  }

  const children: (Paragraph | Table)[] = [];

  // ── NADPIS ──
  children.push(
    new Paragraph({
      spacing: { before: 200, after: 40 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'ZPRÁVA O REVIZI SYSTÉMU OCHRANY PŘED BLESKEM (LPS)', bold: true, size: 28, color: DARK, font: 'Segoe UI' }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 80 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: typRevizeLabel, bold: true, size: 22, color: '334155', font: 'Segoe UI' }),
      ],
    }),
  );
  if (revize.hromosvodNorma) {
    children.push(new Paragraph({
      spacing: { before: 0, after: 200 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `dle ${revize.hromosvodNorma}`, size: 18, color: '475569', font: 'Segoe UI' }),
      ],
    }));
  }

  // ── a) PROVOZOVATEL ──
  children.push(sectionTitle('a) Provozovatel (objednatel)'));
  const provRows: [string, string][] = [
    ['Název / Jméno:', zakaznik?.nazev || revize.objednatel || '—'],
    ['Adresa / Sídlo:', zakaznik?.adresa || '—'],
  ];
  if (zakaznik?.ico) provRows.push(['IČO:', zakaznik.ico]);
  if (zakaznik?.kontaktOsoba) provRows.push(['Kontaktní osoba:', zakaznik.kontaktOsoba]);
  if (zakaznik?.telefon) provRows.push(['Telefon:', zakaznik.telefon]);
  if (zakaznik?.email) provRows.push(['E-mail:', zakaznik.email]);
  children.push(kvTable(provRows));

  // ── b) IDENTIFIKACE ──
  children.push(sectionTitle('b) Identifikace revidovaného objektu a místo umístění'));
  children.push(kvTable([
    ['Název objektu:', revize.nazev],
    ['Adresa objektu:', revize.adresa],
  ]));

  // ── c) CHARAKTERISTIKA LPS ──
  children.push(sectionTitle('c) Charakteristika systému ochrany před bleskem (LPS)'));
  const charRows: [string, string][] = [
    ['Třída LPS:', tridaLpsLabel(revize.hromosvodTridaLps)],
    ['Typ ochrany:', typOchranyLabel(revize.hromosvodTypOchrany)],
  ];
  if (revize.hromosvodRokInstalace) charRows.push(['Rok instalace:', revize.hromosvodRokInstalace]);
  if (revize.hromosvodPopisLps) charRows.push(['Popis LPS:', revize.hromosvodPopisLps]);
  children.push(kvTable(charRows));

  // ── d) ROZSAH REVIZE ──
  if (isSekce('rozsahRevize')) {
    children.push(sectionTitle('d) Vymezení rozsahu revize'));
    if (revize.rozsahRevize) {
      children.push(textParagraph('Předmět revize je:', { bold: true }));
      children.push(textParagraph(revize.rozsahRevize));
    }
    if (revize.predmetNeni) {
      children.push(textParagraph('Předmětem revize není:', { bold: true }));
      children.push(textParagraph(revize.predmetNeni));
    }
    if (!revize.rozsahRevize && !revize.predmetNeni) children.push(emptyText());
  }

  // ── e) REVIZNÍ TECHNIK ──
  children.push(sectionTitle('e) Údaje o revizním technikovi'));
  const techRows: [string, string][] = [
    ['Jméno:', nastaveni?.reviznniTechnikJmeno || '—'],
    ['Ev. číslo osvědčení:', nastaveni?.reviznniTechnikCisloOpravneni || '—'],
  ];
  if (nastaveni?.reviznniTechnikOsvedceni) techRows.push(['Osvědčení:', nastaveni.reviznniTechnikOsvedceni]);
  if (nastaveni?.reviznniTechnikAdresa) techRows.push(['Adresa:', nastaveni.reviznniTechnikAdresa]);
  if (nastaveni?.reviznniTechnikIco) techRows.push(['IČO:', nastaveni.reviznniTechnikIco]);
  children.push(kvTable(techRows));

  // ── f) DRUH REVIZE ──
  children.push(sectionTitle('f) Druh revize'));
  children.push(textParagraph(typRevizeLabel, { bold: true }));

  // ── g) DŮLEŽITÁ DATA ──
  children.push(sectionTitle('g) Důležitá data'));
  const dataR: [string, string][] = [
    ['Datum provedení revize:', fmtDate(revize.datum)],
  ];
  if (revize.datumDokonceni) dataR.push(['Datum dokončení:', fmtDate(revize.datumDokonceni)]);
  if (revize.datumVypracovani) dataR.push(['Datum vypracování zprávy:', fmtDate(revize.datumVypracovani)]);
  if (revize.datumPlatnosti) dataR.push(['Platnost do:', fmtDate(revize.datumPlatnosti)]);
  dataR.push(['Lhůta příští revize:', `${revize.termin} měsíců`]);
  children.push(kvTable(dataR));

  // ── h) JÍMACÍ SOUSTAVA ──
  if (isSekce('jimaciSoustava')) {
    children.push(sectionTitle('h) Jímací soustava'));
    const jimaciRows: [string, string][] = [
      ['Typ jímače:', revize.hromosvodJimaciTyp || '—'],
      ['Materiál:', revize.hromosvodJimaciMaterial || '—'],
    ];
    children.push(kvTable(jimaciRows));
    children.push(stavKvRow('Stav:', revize.hromosvodJimaciStav));
    if (revize.hromosvodJimaciPoznamka) {
      children.push(textParagraph(`Poznámka: ${revize.hromosvodJimaciPoznamka}`));
    }
  }

  // ── i) SVODOVÉ VEDENÍ ──
  if (isSekce('svodoveVedeni')) {
    children.push(sectionTitle('i) Svodové vedení'));
    const svodyRows: [string, string][] = [
      ['Počet svodů:', revize.hromosvodSvodyPocet != null ? String(revize.hromosvodSvodyPocet) : '—'],
      ['Materiál:', revize.hromosvodSvodyMaterial || '—'],
    ];
    if (revize.hromosvodSvodyPrurez) svodyRows.push(['Průřez / profil:', revize.hromosvodSvodyPrurez]);
    svodyRows.push(['Zkušební svorky:', `${revize.hromosvodSvodyZkusebniSvorky ?? '—'} ks`]);
    children.push(kvTable(svodyRows));
    children.push(stavKvRow('Stav:', revize.hromosvodSvodyStav));
    if (revize.hromosvodSvodyPoznamka) {
      children.push(textParagraph(`Poznámka: ${revize.hromosvodSvodyPoznamka}`));
    }
  }

  // ── j) UZEMŇOVACÍ SOUSTAVA ──
  if (isSekce('uzemnovaciSoustava')) {
    children.push(sectionTitle('j) Uzemňovací soustava'));
    children.push(kvTable([
      ['Typ uzemnění:', revize.hromosvodUzemneniTyp || '—'],
      ['Materiál:', revize.hromosvodUzemneniMaterial || '—'],
    ]));
    children.push(stavKvRow('Stav:', revize.hromosvodUzemneniStav));
    if (revize.hromosvodUzemneniPoznamka) {
      children.push(textParagraph(`Poznámka: ${revize.hromosvodUzemneniPoznamka}`));
    }
  }

  // ── k) OCHRANNÉ POSPOJOVÁNÍ / SPD ──
  if (isSekce('spd')) {
    children.push(sectionTitle('k) Ochranné pospojování a přepěťové ochrany (SPD)'));
    const spdRows: [string, string][] = [];
    if (revize.hromosvodSpdTyp) spdRows.push(['Typ SPD:', revize.hromosvodSpdTyp]);
    children.push(kvTable(spdRows.length > 0 ? spdRows : [['Typ SPD:', '—']]));
    children.push(stavKvRow('Stav SPD:', revize.hromosvodSpdStav));
    if (revize.hromosvodEkvipotencialni) {
      children.push(textParagraph(`Ekvipotenciální přípojnice: ${revize.hromosvodEkvipotencialni}`));
    }
    if (revize.hromosvodSpdPoznamka) {
      children.push(textParagraph(`Poznámka: ${revize.hromosvodSpdPoznamka}`));
    }
  }

  // ── l) MĚŘENÍ ODPORŮ ──
  if (isSekce('mereniOdporu')) {
    children.push(sectionTitle('l) Měření odporů uzemnění'));
    if (mereni.length > 0) {
      children.push(dataTable(
        ['Měřicí bod', 'Naměřeno [Ω]', 'Limit [Ω]', 'Výsledek'],
        [35, 20, 20, 25],
        mereni.map(m => [
          m.bod,
          m.hodnota || '—',
          m.limit || '—',
          m.vyhovuje ? 'Vyhovuje' : 'NEVYHOVUJE',
        ]),
      ));
      // Stats
      const vyhovuje = mereni.filter(m => m.vyhovuje).length;
      const nevyhovuje = mereni.filter(m => !m.vyhovuje).length;
      let statsText = `Celkem bodů: ${mereni.length} | Vyhovuje: ${vyhovuje} | Nevyhovuje: ${nevyhovuje}`;
      const sHodnotou = mereni.filter(m => m.hodnota);
      if (sHodnotou.length > 0) {
        const avg = sHodnotou.reduce((s, m) => s + parseFloat(m.hodnota || '0'), 0) / sHodnotou.length;
        statsText += ` | Průměrná hodnota: ${avg.toFixed(2)} Ω`;
      }
      children.push(textParagraph(statsText, { size: 18, color: '475569' }));
    } else {
      children.push(emptyText('Měření odporů uzemnění nebylo provedeno'));
    }
  }

  // ── m) PŘÍSTROJE ──
  if (isSekce('pristroje')) {
    children.push(sectionTitle('m) Soupis použitých měřicích přístrojů'));
    if (pristroje.length > 0) {
      children.push(dataTable(
        ['Název', 'Výrobce / Model', 'Výr. číslo', 'Kalibrace', 'Platnost'],
        [25, 25, 20, 15, 15],
        pristroje.map(p => [
          p.nazev,
          `${p.vyrobce} ${p.model}`.trim(),
          p.vyrobniCislo,
          fmtDate(p.datumKalibrace),
          fmtDate(p.platnostKalibrace),
        ]),
      ));
    } else {
      children.push(emptyText('Žádné přístroje nebyly přiřazeny'));
    }
  }

  // ── n) PODKLADY ──
  if (isSekce('podklady')) {
    children.push(sectionTitle('n) Seznam podkladů použitých k provedení revize'));
    children.push(revize.podklady ? textParagraph(revize.podklady) : emptyText());
  }

  // ── o) VYHODNOCENÍ PŘEDCHOZÍCH ──
  if (isSekce('vyhodnoceniPredchozich')) {
    children.push(sectionTitle('o) Vyhodnocení předchozích revizí'));
    children.push(revize.vyhodnoceniPredchozich ? textParagraph(revize.vyhodnoceniPredchozich) : emptyText());
  }

  // ── p) ZÁVADY ──
  children.push(sectionTitle('p) Přehled zjištěných závad'));
  if (zavady.length > 0) {
    children.push(dataTable(
      ['#', 'Popis závady', 'Závažnost', 'Stav', 'Zjištěna'],
      [5, 45, 15, 15, 20],
      zavady.map((z, i) => [
        String(i + 1),
        z.popis,
        z.zavaznost === 'C1' ? 'C1 – Kritická' : z.zavaznost === 'C2' ? 'C2 – Vážná' : 'C3 – Méně závažná',
        z.stav === 'otevřená' ? 'Otevřená' : z.stav === 'v řešení' ? 'V řešení' : 'Vyřešená',
        fmtDate(z.datumZjisteni),
      ]),
    ));
  } else {
    children.push(textParagraph('Při revizi nebyly zjištěny žádné závady.', { bold: true }));
  }

  // ── q) ZÁVĚREČNÉ ZHODNOCENÍ ──
  children.push(sectionTitle('q) Závěrečné zhodnocení'));
  children.push(...resultBox('Systém ochrany před bleskem (LPS) je:', vysledekLabel, vysledekColor));
  if (isSekce('zaver') && revize.zaver) {
    children.push(textParagraph('Závěr:', { bold: true }));
    children.push(textParagraph(revize.zaver));
  }

  // ── r) LHŮTA ──
  children.push(sectionTitle('r) Doporučená lhůta provedení příští revize'));
  children.push(textParagraph(
    `Příští revize by měla být provedena nejpozději do ${revize.datumPlatnosti ? fmtDate(revize.datumPlatnosti) : `${revize.termin} měsíců od data provedení`}.`,
  ));

  // ── s) PODPISY ──
  children.push(sectionTitle('s) Potvrzení o předání zprávy'));
  children.push(...signatureSection(
    nastaveni?.reviznniTechnikJmeno || '—',
    nastaveni?.reviznniTechnikCisloOpravneni || '—',
    zakaznik?.kontaktOsoba || zakaznik?.nazev || revize.objednatel || '—',
    fmtDate(revize.datumVypracovani) !== '—' ? fmtDate(revize.datumVypracovani) : fmtDate(new Date()),
  ));

  // ── SESTAVIT DOCX ──
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Segoe UI', size: 20 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertMillimetersToTwip(18),
            bottom: convertMillimetersToTwip(20),
            left: convertMillimetersToTwip(15),
            right: convertMillimetersToTwip(15),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR } },
              spacing: { after: 60 },
              children: [
                new TextRun({ text: `Zpráva č. ${revize.cisloRevize}`, bold: true, size: 16, color: BLUE, font: 'Segoe UI' }),
                new TextRun({ text: `     ${revize.nazev} – ${revize.adresa}`, size: 16, color: GRAY, font: 'Segoe UI' }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' } },
              spacing: { before: 60 },
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: nastaveni?.firmaJmeno || '', size: 15, color: '94a3b8', font: 'Segoe UI' }),
                new TextRun({ text: '     Revizní zpráva – Hromosvod     Strana ', size: 15, color: '94a3b8', font: 'Segoe UI' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 15, color: '94a3b8', font: 'Segoe UI' }),
                new TextRun({ text: ' / ', size: 15, color: '94a3b8', font: 'Segoe UI' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: '94a3b8', font: 'Segoe UI' }),
              ],
            }),
          ],
        }),
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Revize_Hromosvod_${revize.cisloRevize.replace(/[/\\:*?"<>|]/g, '_')}.docx`);
}
