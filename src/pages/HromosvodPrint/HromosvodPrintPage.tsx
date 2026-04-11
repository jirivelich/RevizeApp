import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Previewer } from 'pagedjs';
import { revizeService, zavadaService, revizePristrojService, nastaveniService, zakazniciService } from '../../services/database';
import type { Revize, Zavada, MericiPristroj, Nastaveni, Zakaznik } from '../../types';
import { ReportHeader } from '../ReportPrint/ReportHeader';
import { ReportSection } from '../ReportPrint/ReportSection';
import { ReportTable } from '../ReportPrint/ReportTable';
import { exportHromosvodToWord } from '../../services/wordExportHromosvod';
import '../ReportPrint/print.css';

interface MereniOdporu {
  bod: string;
  hodnota: string;
  limit: string;
  vyhovuje: boolean;
}

/**
 * CSS pro @page margin-boxy – pagedjs specifické
 */
const PAGED_CSS = `
@page {
  size: A4;
  margin: 18mm 15mm 20mm 15mm;

  @top-left {
    content: string(report-number, first);
    font-size: 8pt;
    color: #1e293b;
    font-weight: 700;
    font-family: 'Segoe UI', Arial, sans-serif;
    vertical-align: bottom;
    padding-bottom: 4px;
  }

  @top-right {
    content: string(report-title, first);
    font-size: 8pt;
    color: #475569;
    font-family: 'Segoe UI', Arial, sans-serif;
    vertical-align: bottom;
    padding-bottom: 4px;
  }

  @bottom-center {
    content: "Strana " counter(page) " / " counter(pages);
    font-size: 8pt;
    color: #64748b;
    font-family: 'Segoe UI', Arial, sans-serif;
    vertical-align: top;
    padding-top: 4px;
  }

  @bottom-left {
    content: string(firma-name, first);
    font-size: 7.5pt;
    color: #64748b;
    font-family: 'Segoe UI', Arial, sans-serif;
    vertical-align: top;
    padding-top: 4px;
  }

  @bottom-right {
    content: "Revizní zpráva – Hromosvod";
    font-size: 7.5pt;
    color: #64748b;
    font-family: 'Segoe UI', Arial, sans-serif;
    vertical-align: top;
    padding-top: 4px;
  }
}

@page:first {
  @top-left { content: none; }
  @top-right { content: none; }
}

.report-string-number { string-set: report-number content(); }
.report-string-title  { string-set: report-title content(); }
.report-string-firma  { string-set: firma-name content(); }
`;

export interface HromosvodReportData {
  revize: Revize;
  nastaveni: Nastaveni | null;
  zakaznik: Zakaznik | null;
  zavady: Zavada[];
  pristroje: MericiPristroj[];
}

export function HromosvodPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<HromosvodReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paging, setPaging] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  const sourceRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) loadAllData(parseInt(id));
  }, [id]);

  const loadAllData = async (revizeId: number) => {
    setLoading(true);
    setError(null);
    try {
      const revize = await revizeService.getById(revizeId);
      if (!revize) { setError('Revize nebyla nalezena'); return; }

      const [zavady, pristroje, nastaveniData] = await Promise.all([
        zavadaService.getByRevize(revizeId),
        revizePristrojService.getByRevize(revizeId),
        nastaveniService.get(),
      ]);

      let zakaznik: Zakaznik | null = null;
      if (revize.zakaznikId) {
        try {
          const zakazniciAll = await zakazniciService.getAll();
          zakaznik = zakazniciAll.find(z => z.id === revize.zakaznikId) || null;
        } catch { /* ok */ }
      }

      setData({ revize, nastaveni: nastaveniData || null, zakaznik, zavady, pristroje });

      // Nastavit document.title pro výchozí název PDF souboru
      const titleParts = [
        revize.cisloRevize,
        zakaznik?.nazev || revize.objednatel,
        revize.adresa,
        'LPS',
      ].filter(Boolean);
      document.title = titleParts.join(' - ');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při načítání dat');
    } finally {
      setLoading(false);
    }
  };

  const runPagedjs = useCallback(async () => {
    if (!sourceRef.current || !previewRef.current || !data) return;

    setPaging(true);
    previewRef.current.innerHTML = '';
    await new Promise(r => setTimeout(r, 50));

    try {
      const content = sourceRef.current.cloneNode(true) as HTMLElement;
      content.style.visibility = 'visible';
      content.style.position = 'static';
      content.style.left = '0';
      content.classList.remove('report-source');

      const reportCssRules: string[] = [];
      const reportPrefixes = ['.report-', '.pagedjs_'];
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            const text = rule.cssText;
            if (reportPrefixes.some(p => text.includes(p))) {
              reportCssRules.push(text);
            }
          }
        } catch { /* CORS */ }
      }

      const combinedCss = reportCssRules.join('\n') + '\n' + PAGED_CSS;
      const cssBlob = new Blob([combinedCss], { type: 'text/css' });
      const cssUrl = URL.createObjectURL(cssBlob);
      const previewer = new Previewer();
      const flow = await previewer.preview(content, [cssUrl], previewRef.current);
      URL.revokeObjectURL(cssUrl);
      setPageCount(flow?.total || 1);
      // Odpojit ResizeObserver ze všech pagedjs stránek (zabrání crashům v checkUnderflowAfterResize)
      try { flow?.pages?.forEach((p: any) => p.removeListeners?.()); } catch { /* ok */ }
    } catch (err) {
      console.error('Pagedjs error:', err);
      if (sourceRef.current && previewRef.current) {
        previewRef.current.innerHTML = sourceRef.current.innerHTML;
        // Odhad počtu stránek z výšky obsahu (A4 = 297mm − 38mm margin ≈ 980px)
        requestAnimationFrame(() => {
          if (previewRef.current) {
            const h = previewRef.current.scrollHeight;
            setPageCount(Math.max(1, Math.ceil(h / 980)));
          }
        });
      }
    } finally {
      setPaging(false);
    }
  }, [data]);

  useEffect(() => {
    if (data) {
      const timer = setTimeout(runPagedjs, 100);
      return () => clearTimeout(timer);
    }
  }, [data, runPagedjs]);

  const handlePrint = () => window.print();

  const handleWordExport = async () => {
    if (!data) return;
    try {
      await exportHromosvodToWord(data);
    } catch (err) {
      console.error('Word export error:', err);
      alert('Chyba při exportu do Wordu: ' + (err instanceof Error ? err.message : 'Neznámá chyba'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-lg text-slate-600">Načítání revizní zprávy hromosvodu...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-slate-700 mb-4">{error || 'Data nenalezena'}</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-900">← Zpět</button>
        </div>
      </div>
    );
  }

  const { revize, nastaveni, zakaznik, zavady, pristroje } = data;

  // Tisk sekce
  let tiskSekce: Record<string, boolean> = {};
  if (revize.tiskSekce) {
    try { tiskSekce = JSON.parse(revize.tiskSekce); } catch { /* ok */ }
  }
  const isSekceVisible = (key: string) => tiskSekce[key] !== false;

  // Měření odporů
  let mereni: MereniOdporu[] = [];
  if (revize.hromosvodMereniOdporu) {
    try { mereni = JSON.parse(revize.hromosvodMereniOdporu); } catch { /* ok */ }
  }

  const typRevizeLabel = revize.typRevize === 'výchozí' ? 'Výchozí revize' :
    revize.typRevize === 'pravidelná' ? 'Pravidelná revize' :
    `Mimořádná revize${revize.duvodMimoradne ? ` – ${revize.duvodMimoradne}` : ''}`;

  const vysledekLabel = revize.vysledek === 'schopno' ? 'SCHOPNO BEZPEČNÉHO PROVOZU' :
    revize.vysledek === 'neschopno' ? 'NESCHOPNO BEZPEČNÉHO PROVOZU' : '—';

  const vysledekColor = revize.vysledek === 'schopno' ? '#1e293b' :
    revize.vysledek === 'neschopno' ? '#dc2626' : '#1e293b';

  const stavLabel = (stav?: string) => {
    switch (stav) {
      case 'vyhovující': return 'Vyhovující';
      case 'nevyhovující': return 'NEVYHOVUJÍCÍ';
      case 'částečně vyhovující': return 'Částečně vyhovující';
      case 'nenainstalováno': return 'Nenainstalováno';
      default: return '—';
    }
  };

  const stavPrintColor = (stav?: string) => {
    switch (stav) {
      case 'vyhovující': return '#16a34a';
      case 'nevyhovující': return '#dc2626';
      case 'částečně vyhovující': return '#d97706';
      default: return '#64748b';
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

  const reportContent = (
    <div className="report-page">
      {/* String-set prvky */}
      <span className="report-string-number">Zpráva č. {revize.cisloRevize}</span>
      <span className="report-string-title">{revize.nazev} – {revize.adresa}</span>
      <span className="report-string-firma">{nastaveni?.firmaJmeno || ''}</span>

      <ReportHeader nastaveni={nastaveni} revize={revize} />

      <div className="report-title">
        ZPRÁVA O REVIZI SYSTÉMU OCHRANY PŘED BLESKEM (LPS)
      </div>
      <div className="report-subtitle">{typRevizeLabel}</div>
      {revize.hromosvodNorma && (
        <div style={{ textAlign: 'center', fontSize: '9pt', color: '#475569', marginBottom: '14px' }}>
          dle {revize.hromosvodNorma}
        </div>
      )}

      {/* a) PROVOZOVATEL */}
      <ReportSection title="1. Provozovatel (objednatel)">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Název / Jméno:</td><td>{zakaznik?.nazev || revize.objednatel || '—'}</td></tr>
          <tr><td className="label-cell">Adresa / Sídlo:</td><td>{zakaznik?.adresa || '—'}</td></tr>
          {zakaznik?.ico && <tr><td className="label-cell">IČO:</td><td>{zakaznik.ico}</td></tr>}
          {zakaznik?.kontaktOsoba && <tr><td className="label-cell">Kontaktní osoba:</td><td>{zakaznik.kontaktOsoba}</td></tr>}
          {zakaznik?.telefon && <tr><td className="label-cell">Telefon:</td><td>{zakaznik.telefon}</td></tr>}
          {zakaznik?.email && <tr><td className="label-cell">E-mail:</td><td>{zakaznik.email}</td></tr>}
        </tbody></table>
      </ReportSection>

      {/* b) IDENTIFIKACE */}
      <ReportSection title="2. Identifikace revidovaného objektu a místo umístění">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Název objektu:</td><td>{revize.nazev}</td></tr>
          <tr><td className="label-cell">Adresa objektu:</td><td>{revize.adresa}</td></tr>
        </tbody></table>
      </ReportSection>

      {/* c) CHARAKTERISTIKA LPS */}
      <ReportSection title="3. Charakteristika systému ochrany před bleskem (LPS)">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Třída LPS:</td><td>{tridaLpsLabel(revize.hromosvodTridaLps)}</td></tr>
          <tr><td className="label-cell">Typ ochrany:</td><td>{typOchranyLabel(revize.hromosvodTypOchrany)}</td></tr>
          {revize.hromosvodRokInstalace && <tr><td className="label-cell">Rok instalace:</td><td>{revize.hromosvodRokInstalace}</td></tr>}
          {revize.hromosvodPopisLps && <tr><td className="label-cell">Popis LPS:</td><td style={{ whiteSpace: 'pre-line' }}>{revize.hromosvodPopisLps}</td></tr>}
        </tbody></table>
      </ReportSection>

      {/* d) ROZSAH REVIZE */}
      {isSekceVisible('rozsahRevize') && (
      <ReportSection title="4. Vymezení rozsahu revize">
        {revize.rozsahRevize && (
          <div className="report-text">
            <strong>Předmět revize je:</strong>
            <p>{revize.rozsahRevize}</p>
          </div>
        )}
        {revize.predmetNeni && (
          <div className="report-text" style={{ marginTop: '6px' }}>
            <strong>Předmětem revize není:</strong>
            <p>{revize.predmetNeni}</p>
          </div>
        )}
        {!revize.rozsahRevize && !revize.predmetNeni && <p className="report-empty">Nebylo vyplněno</p>}
      </ReportSection>
      )}

      {/* e) REVIZNÍ TECHNIK */}
      <ReportSection title="5. Údaje o revizním technikovi">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Jméno:</td><td>{revize.rtJmeno || nastaveni?.reviznniTechnikJmeno || '—'}</td></tr>
          <tr><td className="label-cell">Oprávnění:</td><td>{revize.rtCisloOpravneni || nastaveni?.reviznniTechnikCisloOpravneni || '—'}</td></tr>
          {(revize.rtCisloOsvedceni || nastaveni?.reviznniTechnikOsvedceni) && <tr><td className="label-cell">Osvědčení:</td><td>{revize.rtCisloOsvedceni || nastaveni?.reviznniTechnikOsvedceni}</td></tr>}
          {nastaveni?.reviznniTechnikAdresa && <tr><td className="label-cell">Adresa:</td><td>{nastaveni.reviznniTechnikAdresa}</td></tr>}
          {nastaveni?.reviznniTechnikIco && <tr><td className="label-cell">IČO:</td><td>{nastaveni.reviznniTechnikIco}</td></tr>}
        </tbody></table>
      </ReportSection>

      {/* f) DRUH REVIZE */}
      <ReportSection title="6. Druh revize">
        <p className="report-text"><strong>{typRevizeLabel}</strong></p>
      </ReportSection>

      {/* g) DŮLEŽITÁ DATA */}
      <ReportSection title="7. Důležitá data">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Datum provedení revize:</td><td>{revize.datum ? new Date(revize.datum).toLocaleDateString('cs-CZ') : '—'}</td></tr>
          {revize.datumDokonceni && <tr><td className="label-cell">Datum dokončení:</td><td>{new Date(revize.datumDokonceni).toLocaleDateString('cs-CZ')}</td></tr>}
          {revize.datumVypracovani && <tr><td className="label-cell">Datum vypracování zprávy:</td><td>{new Date(revize.datumVypracovani).toLocaleDateString('cs-CZ')}</td></tr>}
          {revize.datumPlatnosti && <tr><td className="label-cell">Platnost do:</td><td>{new Date(revize.datumPlatnosti).toLocaleDateString('cs-CZ')}</td></tr>}
          <tr><td className="label-cell">Lhůta příští revize:</td><td>{revize.termin} měsíců</td></tr>
        </tbody></table>
      </ReportSection>

      {/* h) JÍMACÍ SOUSTAVA */}
      {isSekceVisible('jimaciSoustava') && (
      <ReportSection title="8. Jímací soustava">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Typ jímače:</td><td>{revize.hromosvodJimaciTyp || '—'}</td></tr>
          <tr><td className="label-cell">Materiál:</td><td>{revize.hromosvodJimaciMaterial || '—'}</td></tr>
          <tr>
            <td className="label-cell">Stav:</td>
            <td style={{ color: stavPrintColor(revize.hromosvodJimaciStav), fontWeight: 600 }}>
              {stavLabel(revize.hromosvodJimaciStav)}
            </td>
          </tr>
          {revize.hromosvodJimaciPoznamka && <tr><td className="label-cell">Poznámka:</td><td style={{ whiteSpace: 'pre-line' }}>{revize.hromosvodJimaciPoznamka}</td></tr>}
        </tbody></table>
      </ReportSection>
      )}

      {/* i) SVODOVÉ VEDENÍ */}
      {isSekceVisible('svodoveVedeni') && (
      <ReportSection title="9. Svodové vedení">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Počet svodů:</td><td>{revize.hromosvodSvodyPocet ?? '—'}</td></tr>
          <tr><td className="label-cell">Materiál:</td><td>{revize.hromosvodSvodyMaterial || '—'}</td></tr>
          {revize.hromosvodSvodyPrurez && <tr><td className="label-cell">Průřez / profil:</td><td>{revize.hromosvodSvodyPrurez}</td></tr>}
          <tr><td className="label-cell">Zkušební svorky:</td><td>{revize.hromosvodSvodyZkusebniSvorky ?? '—'} ks</td></tr>
          <tr>
            <td className="label-cell">Stav:</td>
            <td style={{ color: stavPrintColor(revize.hromosvodSvodyStav), fontWeight: 600 }}>
              {stavLabel(revize.hromosvodSvodyStav)}
            </td>
          </tr>
          {revize.hromosvodSvodyPoznamka && <tr><td className="label-cell">Poznámka:</td><td style={{ whiteSpace: 'pre-line' }}>{revize.hromosvodSvodyPoznamka}</td></tr>}
        </tbody></table>
      </ReportSection>
      )}

      {/* 10. UZEMŇOVACÍ SOUSTAVA */}
      {isSekceVisible('uzemnovaciSoustava') && (
      <ReportSection title="10. Uzemňovací soustava">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Typ uzemnění:</td><td>{revize.hromosvodUzemneniTyp || '—'}</td></tr>
          <tr><td className="label-cell">Materiál:</td><td>{revize.hromosvodUzemneniMaterial || '—'}</td></tr>
          <tr>
            <td className="label-cell">Stav:</td>
            <td style={{ color: stavPrintColor(revize.hromosvodUzemneniStav), fontWeight: 600 }}>
              {stavLabel(revize.hromosvodUzemneniStav)}
            </td>
          </tr>
          {revize.hromosvodUzemneniPoznamka && <tr><td className="label-cell">Poznámka:</td><td style={{ whiteSpace: 'pre-line' }}>{revize.hromosvodUzemneniPoznamka}</td></tr>}
        </tbody></table>
      </ReportSection>
      )}

      {/* k) OCHRANNÉ POSPOJOVÁNÍ / SPD */}
      {isSekceVisible('spd') && (
      <ReportSection title="11. Ochranné pospojování a přepěťové ochrany (SPD)">
        <table className="report-info-table"><tbody>
          {revize.hromosvodSpdTyp && <tr><td className="label-cell">Typ SPD:</td><td>{revize.hromosvodSpdTyp}</td></tr>}
          <tr>
            <td className="label-cell">Stav SPD:</td>
            <td style={{ color: stavPrintColor(revize.hromosvodSpdStav), fontWeight: 600 }}>
              {stavLabel(revize.hromosvodSpdStav)}
            </td>
          </tr>
          {revize.hromosvodEkvipotencialni && <tr><td className="label-cell">Ekvipotenciální přípojnice:</td><td style={{ whiteSpace: 'pre-line' }}>{revize.hromosvodEkvipotencialni}</td></tr>}
          {revize.hromosvodSpdPoznamka && <tr><td className="label-cell">Poznámka:</td><td style={{ whiteSpace: 'pre-line' }}>{revize.hromosvodSpdPoznamka}</td></tr>}
        </tbody></table>
      </ReportSection>
      )}

      {/* 12. MĚŘENÍ ODPORŮ UZEMNĚNÍ */}
      {isSekceVisible('mereniOdporu') && (
      <ReportSection title="12. Měření odporů uzemnění">
        {mereni.length > 0 ? (
          <>
            <ReportTable
              columns={['Měřicí bod', 'Naměřeno [Ω]', 'Limit [Ω]', 'Výsledek']}
              widths={['35%', '20%', '20%', '25%']}
              rows={mereni.map(m => [
                m.bod,
                m.hodnota || '—',
                m.limit || '—',
                m.vyhovuje ? 'Vyhovuje' : 'NEVYHOVUJE',
              ])}
            />
            <div style={{ marginTop: '6px', fontSize: '9pt', color: '#475569' }}>
              Celkem bodů: {mereni.length} |
              Vyhovuje: {mereni.filter(m => m.vyhovuje).length} |
              Nevyhovuje: {mereni.filter(m => !m.vyhovuje).length}
              {mereni.some(m => m.hodnota) && (
                <> | Průměrná hodnota: {(mereni.filter(m => m.hodnota).reduce((s, m) => s + parseFloat(m.hodnota || '0'), 0) / Math.max(1, mereni.filter(m => m.hodnota).length)).toFixed(2)} Ω</>
              )}
            </div>
          </>
        ) : (
          <p className="report-empty">Měření odporů uzemnění nebylo provedeno</p>
        )}
      </ReportSection>
      )}

      {/* m) MĚŘICÍ PŘÍSTROJE */}
      {isSekceVisible('pristroje') && (
      <ReportSection title="13. Soupis použitých měřicích přístrojů">
        {pristroje.length > 0 ? (
          <ReportTable
            columns={['Název', 'Výrobce / Model', 'Výrobní číslo', 'Kalibrace', 'Platnost']}
            widths={['25%', '25%', '20%', '15%', '15%']}
            rows={pristroje.map(p => [
              p.nazev,
              `${p.vyrobce} ${p.model}`.trim(),
              p.vyrobniCislo,
              p.datumKalibrace ? new Date(p.datumKalibrace).toLocaleDateString('cs-CZ') : '—',
              p.platnostKalibrace ? new Date(p.platnostKalibrace).toLocaleDateString('cs-CZ') : '—',
            ])}
          />
        ) : (
          <p className="report-empty">Žádné přístroje nebyly přiřazeny</p>
        )}
      </ReportSection>
      )}

      {/* n) PODKLADY */}
      {isSekceVisible('podklady') && (
      <ReportSection title="14. Seznam podkladů použitých k provedení revize">
        {revize.podklady ? (
          <p className="report-text">{revize.podklady}</p>
        ) : (
          <p className="report-empty">Nebylo vyplněno</p>
        )}
      </ReportSection>
      )}

      {/* o) VYHODNOCENÍ PŘEDCHOZÍCH */}
      {isSekceVisible('vyhodnoceniPredchozich') && (
      <ReportSection title="15. Vyhodnocení předchozích revizí">
        {revize.vyhodnoceniPredchozich ? (
          <p className="report-text">{revize.vyhodnoceniPredchozich}</p>
        ) : (
          <p className="report-empty">Nebylo vyplněno</p>
        )}
      </ReportSection>
      )}

      {/* Příloha – náčrt LPS */}
      {revize.hromosvodNacrt && (() => {
        let imgSrc = revize.hromosvodNacrt;
        if (imgSrc.startsWith('{')) {
          try { imgSrc = (JSON.parse(imgSrc) as { full: string }).full; } catch { /* use as-is */ }
        }
        return (
          <ReportSection title="Příloha – Schéma hromosvodu (LPS)">
            <img
              src={imgSrc}
              alt="Schéma hromosvodu LPS"
              style={{ width: '100%', maxWidth: '700px', display: 'block', border: '1px solid #e2e8f0', borderRadius: '4px' }}
            />
          </ReportSection>
        );
      })()}

      {/* p) ZÁVADY */}
      <ReportSection title="16. Přehled zjištěných závad">
        {zavady.length > 0 ? (
          <ReportTable
            columns={['#', 'Popis závady', 'Závažnost', 'Stav', 'Zjištěna']}
            widths={['5%', '45%', '15%', '15%', '20%']}
            rows={zavady.map((z, i) => [
              String(i + 1),
              z.popis,
              z.zavaznost === 'C1' ? 'C1 – Kritická' : z.zavaznost === 'C2' ? 'C2 – Vážná' : 'C3 – Méně závažná',
              z.stav === 'otevřená' ? 'Otevřená' : z.stav === 'v řešení' ? 'V řešení' : 'Vyřešená',
              z.datumZjisteni ? new Date(z.datumZjisteni).toLocaleDateString('cs-CZ') : '—',
            ])}
          />
        ) : (
          <p className="report-text"><strong>Při revizi nebyly zjištěny žádné závady.</strong></p>
        )}
      </ReportSection>

      {/* q) ZÁVĚREČNÉ ZHODNOCENÍ */}
      <ReportSection title="17. Závěrečné zhodnocení">
        <div className="report-result" style={{ borderColor: vysledekColor }}>
          <div className="report-result-label">Systém ochrany před bleskem (LPS) je:</div>
          <div className="report-result-value" style={{ color: vysledekColor }}>
            {vysledekLabel}
          </div>
        </div>
        {isSekceVisible('zaver') && revize.zaver && (
          <div className="report-text" style={{ marginTop: '8px' }}>
            <strong>Závěr:</strong>
            <p>{revize.zaver}</p>
          </div>
        )}
      </ReportSection>

      {/* r) LHŮTA PŘÍŠTÍ REVIZE */}
      <ReportSection title="18. Doporučená lhůta provedení příští revize">
        <p className="report-text">
          Příští revize by měla být provedena nejpozději do <strong>{revize.datumPlatnosti ? new Date(revize.datumPlatnosti).toLocaleDateString('cs-CZ') : `${revize.termin} měsíců od data provedení`}</strong>.
        </p>
      </ReportSection>

      {/* ROZDĚLOVNÍK */}
      {isSekceVisible('rozdelovnik') && revize.rozdelovnik && (
      <ReportSection title="Rozdělovník">
        <table className="report-data-table">
          <thead><tr><th>Příjemce</th><th style={{width:'80px',textAlign:'center'}}>Počet</th></tr></thead>
          <tbody>
            {revize.rozdelovnik.split('\n').filter(r => r.trim()).map((radek, i) => {
              const sep = radek.lastIndexOf(':');
              const prijemce = sep >= 0 ? radek.substring(0, sep).trim() : radek.trim();
              const pocet = sep >= 0 ? radek.substring(sep + 1).trim() : '';
              return <tr key={i}><td>{prijemce}</td><td style={{textAlign:'center'}}>{pocet}</td></tr>;
            })}
          </tbody>
        </table>
      </ReportSection>
      )}

      {/* s) PODPISY */}
      <ReportSection title="19. Potvrzení o předání zprávy">
        <div className="report-signatures">
          <div className="report-signature-box">
            <div className="report-signature-label">Revizní technik:</div>
            <div className="report-signature-name">{revize.rtJmeno || nastaveni?.reviznniTechnikJmeno || '—'}</div>
            <div className="report-signature-cert">Ev. č.: {revize.rtCisloOpravneni || nastaveni?.reviznniTechnikCisloOpravneni || '—'}</div>
            <div className="report-signature-line"></div>
            <div className="report-signature-hint">Podpis</div>
          </div>
          <div className="report-signature-box">
            <div className="report-signature-label">Objednatel / Provozovatel:</div>
            <div className="report-signature-name">{zakaznik?.kontaktOsoba || zakaznik?.nazev || revize.objednatel || '—'}</div>
            <div className="report-signature-cert">&nbsp;</div>
            <div className="report-signature-line"></div>
            <div className="report-signature-hint">Podpis</div>
          </div>
        </div>
        <div className="report-date-line">
          V ...................... dne {revize.datumVypracovani ? new Date(revize.datumVypracovani).toLocaleDateString('cs-CZ') : new Date().toLocaleDateString('cs-CZ')}
        </div>
      </ReportSection>
    </div>
  );

  return (
    <>
      {/* Toolbar */}
      <div className="print-hide bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[210mm] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition">
              ← Zpět na revizi
            </button>
            <span className="text-slate-400">|</span>
            <span className="text-sm text-slate-600 font-medium">{revize.cisloRevize} – {revize.nazev}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
              Hromosvod
            </span>
          </div>
          <div className="flex items-center gap-3">
            {pageCount > 0 && (
              <span className="text-xs text-slate-400">{pageCount} {pageCount === 1 ? 'strana' : pageCount < 5 ? 'strany' : 'stran'}</span>
            )}
            <button onClick={handleWordExport} className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-sm font-medium flex items-center gap-2 transition">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13ZM13.25 9a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Zm-6.5 0a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 6.75 9Zm4 0a.75.75 0 0 1 .624.334l1.25 1.876a.75.75 0 0 1-1.248.832L10.75 11.1l-.626.938a.75.75 0 1 1-1.248-.832l1.25-1.876A.75.75 0 0 1 10.75 9Z" /></svg>
              Word
            </button>
            <button onClick={handlePrint} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-medium flex items-center gap-2 transition">
              🖨️ Tisk / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Skrytý zdrojový obsah */}
      <div ref={sourceRef} className="report-source">
        {reportContent}
      </div>

      {/* Pagedjs cílový kontejner */}
      <div className="report-print-bg">
        {paging && (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-500 text-sm">Připravuji stránky...</div>
          </div>
        )}
        <div ref={previewRef} className="report-preview" />
      </div>
    </>
  );
}
