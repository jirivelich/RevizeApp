import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Previewer } from 'pagedjs';
import { revizeService, rozvadecService, okruhService, cranicService, zavadaService, mistnostService, zarizeniService, revizePristrojService, nastaveniService, zakazniciService } from '../../services/database';
import type { Revize, Rozvadec, Okruh, Chranic, Zavada, Mistnost, Zarizeni, MericiPristroj, Nastaveni, Zakaznik } from '../../types';
import { ReportHeader } from './ReportHeader';
import { ReportSection } from './ReportSection';
import { ReportTable } from './ReportTable';
import { DEFAULT_NORMY_SOULAD } from '../RevizeDetail/constants';
import { exportElektroToWord } from '../../services/wordExport';
import './print.css';

/**
 * CSS pro @page margin-boxy – MUSÍ být jako JS string,
 * protože Vite (Lightning CSS) neumí @page { @top-left { } }
 * a pravidla by zničil. Pagedjs je zpracuje sám.
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
    content: "Revizní zpráva";
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

export interface ReportData {
  revize: Revize;
  nastaveni: Nastaveni | null;
  zakaznik: Zakaznik | null;
  rozvadece: RozvadecWithOkruhy[];
  zavady: Zavada[];
  mistnosti: MistnostWithZarizeni[];
  pristroje: MericiPristroj[];
}

export interface RozvadecWithOkruhy extends Rozvadec {
  okruhy: Okruh[];
  chranice: Chranic[];
}

export interface MistnostWithZarizeni extends Mistnost {
  zarizeniList: Zarizeni[];
}

export function ReportPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paging, setPaging] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_pageCount, setPageCount] = useState(0);

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

      const [rozvadeceRaw, zavady, mistnostiRaw, pristroje, nastaveniData] = await Promise.all([
        rozvadecService.getByRevize(revizeId),
        zavadaService.getByRevize(revizeId),
        mistnostService.getByRevize(revizeId),
        revizePristrojService.getByRevize(revizeId),
        nastaveniService.get(),
      ]);

      const rozvadece: RozvadecWithOkruhy[] = await Promise.all(
        rozvadeceRaw.map(async (r) => ({
          ...r,
          okruhy: r.id ? await okruhService.getByRozvadec(r.id) : [],
          chranice: r.id ? await cranicService.getByRozvadec(r.id) : [],
        }))
      );

      const mistnosti: MistnostWithZarizeni[] = await Promise.all(
        mistnostiRaw.map(async (m) => ({
          ...m,
          zarizeniList: m.id ? await zarizeniService.getByMistnost(m.id) : [],
        }))
      );

      let zakaznik: Zakaznik | null = null;
      if (revize.zakaznikId) {
        try {
          const zakazniciAll = await zakazniciService.getAll();
          zakaznik = zakazniciAll.find(z => z.id === revize.zakaznikId) || null;
        } catch { /* ok */ }
      }

      setData({ revize, nastaveni: nastaveniData || null, zakaznik, rozvadece, zavady, mistnosti, pristroje });

      // Nastavit document.title pro výchozí název PDF souboru
      const titleParts = [
        revize.cisloRevize,
        zakaznik?.nazev || revize.objednatel,
        revize.adresa,
        'instalace',
      ].filter(Boolean);
      document.title = titleParts.join(' - ');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při načítání dat');
    } finally {
      setLoading(false);
    }
  };

  /* ── Spustí pagedjs po renderingu dat ── */
  const runPagedjs = useCallback(async () => {
    if (!sourceRef.current || !previewRef.current || !data) return;

    setPaging(true);

    // Vyčistit předchozí výstup
    previewRef.current.innerHTML = '';

    // Krátká pauza aby se React stačil vyrenderovat
    await new Promise(r => setTimeout(r, 50));

    try {
      // Získat obsah ze skrytého zdroje
      const content = sourceRef.current.cloneNode(true) as HTMLElement;
      content.style.visibility = 'visible';
      content.style.position = 'static';
      content.style.left = '0';
      content.classList.remove('report-source');

      // Sebrat JEN report-specifické CSS pravidla (ne Tailwind/globální)
      const reportCssRules: string[] = [];
      const reportPrefixes = ['.report-', '.pagedjs_'];
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            const text = rule.cssText;
            // Přidat pouze pravidla obsahující report- nebo pagedjs_ selektory
            if (reportPrefixes.some(p => text.includes(p))) {
              reportCssRules.push(text);
            }
          }
        } catch {
          // CORS – přeskočit
        }
      }

      // Spojit: report styly z Vite + @page pravidla z JS
      const combinedCss = reportCssRules.join('\n') + '\n' + PAGED_CSS;

      const cssBlob = new Blob([combinedCss], { type: 'text/css' });
      const cssUrl = URL.createObjectURL(cssBlob);
      const previewer = new Previewer();
      const flow = await previewer.preview(
        content,
        [cssUrl],
        previewRef.current
      );
      URL.revokeObjectURL(cssUrl);

      setPageCount(flow?.total || 1);
      // Odpojit ResizeObserver ze všech pagedjs stránek (zabrání crashům v checkUnderflowAfterResize)
      try { flow?.pages?.forEach((p: any) => p.removeListeners?.()); } catch { /* ok */ }
    } catch (err) {
      console.error('Pagedjs error:', err);
      // Fallback: zobrazit obsah přímo
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
      // Malý timeout aby se React stačil vykreslit obsah do sourceRef
      const timer = setTimeout(runPagedjs, 100);
      return () => clearTimeout(timer);
    }
  }, [data, runPagedjs]);

  const handlePrint = () => window.print();

  const handleWordExport = async () => {
    if (!data) return;
    try {
      await exportElektroToWord(data);
    } catch (err) {
      console.error('Word export error:', err);
      alert('Chyba p\u0159i exportu do Wordu: ' + (err instanceof Error ? err.message : 'Nezn\u00e1m\u00e1 chyba'));
    }
  };

  // Expose for potential button usage
  void handlePrint;
  void handleWordExport;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-lg text-slate-600">Načítání revizní zprávy...</div>
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

  const { revize, nastaveni, zakaznik, rozvadece, zavady, mistnosti, pristroje } = data;

  // Parsovat tiskSekce – které sekce jsou viditelné v tisku
  let tiskSekce: Record<string, boolean> = {};
  if (revize.tiskSekce) {
    try { tiskSekce = JSON.parse(revize.tiskSekce); } catch { /* prázdné */ }
  }
  const isSekceVisible = (key: string) => tiskSekce[key] !== false; // default true

  // Závady s fotkami (zachováme původní pořadové číslo ze sekce 13)
  const zavadySFotkami = zavady
    .map((z, i) => ({ ...z, cisloZavady: i + 1 }))
    .filter(z => Array.isArray(z.fotky) && z.fotky.length > 0);

  const ochranaLabels: Record<string, string> = {
    'zakladni-izolace': 'Základní izolace živých částí',
    'kryty-pricka': 'Přepážky nebo kryty',
    'zamezeni-dotyk': 'Zábrany nebo ochrana polohou',
    'selv': 'Ochrana malým napětím SELV',
    'pelv': 'Ochrana malým napětím PELV',
    'ochrane-pospojovani': 'Ochranné pospojování',
    'samocine-odpojeni': 'Automatické odpojeni od zdroje',
    'proudovy-chranic': 'Doplňková ochrana proudovým chráničem',
    'ochranne-oddeleni': 'Ochranné oddělení obvodů',
    'dvojita-izolace': 'Dvojitá nebo zesílená izolace',
    'nevodive-prostredi': 'Nevodivé prostředí',
    'neuzemene-pospojeni': 'Neuzemeného místního pospojování',
  };

  let ochranaList: string[] = [];
  if (revize.ochranaOpatreni) {
    try {
      const parsed = JSON.parse(revize.ochranaOpatreni);
      ochranaList = parsed.map((key: string) => ochranaLabels[key] || key);
    } catch {
      ochranaList = [revize.ochranaOpatreni];
    }
  }

  const typRevizeLabel = revize.typRevize === 'výchozí' ? 'Výchozí revize' :
    revize.typRevize === 'pravidelná' ? 'Pravidelná revize' :
    `Mimořádná revize${revize.duvodMimoradne ? ` – ${revize.duvodMimoradne}` : ''}`;

  const vysledekLabel = revize.vysledek === 'schopno' ? 'ELEKTRICKÁ INSTALACE JE Z HLEDISKA BEZPEČNOSTI SCHOPNA PROVOZU' :
    revize.vysledek === 'neschopno' ? 'ELEKTRICKÁ INSTALACE NENÍ Z HLEDISKA BEZPEČNOSTI SCHOPNA PROVOZU' : '—';

  const vysledekColor = revize.vysledek === 'schopno' ? '#1e293b' :
    revize.vysledek === 'neschopno' ? '#dc2626' : '#1e293b';

  /* ── Společný obsah zprávy (použijeme 2×: zdrojový hidden + fallback) ── */
  const reportContent = (
    <div className="report-page">

      {/* String-set prvky – pagedjs je použije pro running headers/footers
           Nesmí být display:none, jinak pagedjs string-set ignoruje */}
      <span className="report-string-number">
        Zpráva č. {revize.cisloRevize}
      </span>
      <span className="report-string-title">
        {revize.nazev} – {revize.adresa}
      </span>
      <span className="report-string-firma">
        {nastaveni?.firmaJmeno || ''}
      </span>

      <ReportHeader nastaveni={nastaveni} revize={revize} />

      <div className="report-normy-text">{revize.normySoulad || DEFAULT_NORMY_SOULAD}</div>

      <div className="report-title">
        ZPRÁVA O REVIZI ELEKTRICKÉ INSTALACE
      </div>
      <div className="report-subtitle">{typRevizeLabel}</div>

      {/* ══════ STRANA 1 ══════ */}
      <div className="report-page-1">

      {/* 1. PROVOZOVATEL */}
      <ReportSection title="1. Provozovatel (objednatel) revidovaného zařízení">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Název / Jméno:</td><td>{zakaznik?.nazev || revize.objednatel || '—'}</td></tr>
          <tr><td className="label-cell">Adresa / Sídlo:</td><td>{zakaznik?.adresa || '—'}</td></tr>
          {zakaznik?.ico && <tr><td className="label-cell">IČO:</td><td>{zakaznik.ico}</td></tr>}
          {zakaznik?.kontaktOsoba && <tr><td className="label-cell">Kontaktní osoba:</td><td>{zakaznik.kontaktOsoba}</td></tr>}
          {zakaznik?.telefon && <tr><td className="label-cell">Telefon:</td><td>{zakaznik.telefon}</td></tr>}
          {zakaznik?.email && <tr><td className="label-cell">E-mail:</td><td>{zakaznik.email}</td></tr>}
        </tbody></table>
      </ReportSection>

      {/* 2. IDENTIFIKACE ZAŘÍZENÍ */}
      <ReportSection title="2. Identifikace objektu">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Název objektu:</td><td>{revize.nazev}</td></tr>
          <tr><td className="label-cell">Adresa objektu:</td><td>{revize.adresa}</td></tr>
        </tbody></table>
      </ReportSection>

      {/* 3. REVIZNÍ TECHNIK */}
      <ReportSection title="3. Revizní technik">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Jméno:</td><td>{revize.rtJmeno || nastaveni?.reviznniTechnikJmeno || '—'}</td></tr>
          <tr><td className="label-cell">Oprávnění:</td><td>{revize.rtCisloOpravneni || nastaveni?.reviznniTechnikCisloOpravneni || '—'}</td></tr>
          {(revize.rtCisloOsvedceni || nastaveni?.reviznniTechnikOsvedceni) && <tr><td className="label-cell">Osvědčení:</td><td>{revize.rtCisloOsvedceni || nastaveni?.reviznniTechnikOsvedceni}</td></tr>}
          {nastaveni?.reviznniTechnikAdresa && <tr><td className="label-cell">Adresa:</td><td>{nastaveni.reviznniTechnikAdresa}</td></tr>}
          {nastaveni?.reviznniTechnikIco && <tr><td className="label-cell">IČO:</td><td>{nastaveni.reviznniTechnikIco}</td></tr>}
        </tbody></table>
      </ReportSection>

      {/* 4. DATA A TERMÍNY */}
      <ReportSection title="4. Data a termíny">
        <table className="report-info-table"><tbody>
          <tr>
            <td className="label-cell">Datum revize:</td>
            <td>{revize.datum ? new Date(revize.datum).toLocaleDateString('cs-CZ') : '—'}</td>
            <td className="label-cell">Vypracování zprávy:</td>
            <td>{revize.datumVypracovani ? new Date(revize.datumVypracovani).toLocaleDateString('cs-CZ') : '—'}</td>
          </tr>
          <tr>
            <td className="label-cell">Platnost do:</td>
            <td>{revize.datumPlatnosti ? new Date(revize.datumPlatnosti).toLocaleDateString('cs-CZ') : '—'}</td>
            <td className="label-cell">Lhůta příští revize:</td>
            <td>{revize.termin} měsíců</td>
          </tr>
        </tbody></table>
      </ReportSection>

      {/* 5. VYHODNOCENÍ */}
      <ReportSection title="5. Vyhodnocení">
        <div className="report-result" style={{ borderColor: vysledekColor }}>
          <div className="report-result-label">Revidované elektrické zařízení je:</div>
          <div className="report-result-value" style={{ color: vysledekColor }}>
            {vysledekLabel}
          </div>
        </div>
      </ReportSection>

      {/* 6. PODPISY */}
      <ReportSection title="6. Potvrzení o předání zprávy">
        <div className="report-signatures">
          <div className="report-signature-box">
            <div className="report-signature-label">Revizní technik:</div>
            <div className="report-signature-name">{revize.rtJmeno || nastaveni?.reviznniTechnikJmeno || '—'}</div>
            <div className="report-signature-cert">Oprávnění: {revize.rtCisloOpravneni || nastaveni?.reviznniTechnikCisloOpravneni || '—'}</div>
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

      </div>{/* /report-page-1 */}

      {/* ══════ STRANA 2+ ══════ */}
      <div className="report-page-break" />

      {/* 7. POPIS REVIDOVANÉHO ZAŘÍZENÍ */}
      {isSekceVisible('popisZarizeni') && revize.popisZarizeni && (
      <ReportSection title="7. Popis revidovaného zařízení">
        <p className="report-text">{revize.popisZarizeni}</p>
      </ReportSection>
      )}

      {/* 8. ROZSAH REVIZE */}
      {isSekceVisible('rozsahRevize') && (
      <ReportSection title="8. Vymezení rozsahu revize">
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

      {/* CHARAKTERISTIKA ZAŘÍZENÍ */}
      {isSekceVisible('charakteristika') && (revize.napetovaSoustava || ochranaList.length > 0) && (
        <ReportSection title="Charakteristika revidovaného zařízení">
          <table className="report-info-table"><tbody>
            {revize.napetovaSoustava && (
              <tr><td className="label-cell">Napěťová soustava:</td><td>{revize.napetovaSoustava}</td></tr>
            )}
            {ochranaList.length > 0 && (
              <tr>
                <td className="label-cell">Ochrana před úrazem:</td>
                <td>
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {ochranaList.map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                </td>
              </tr>
            )}
          </tbody></table>
        </ReportSection>
      )}

      {/* 9. MĚŘICÍ PŘÍSTROJE */}
      {isSekceVisible('pristroje') && (
      <ReportSection title="9. Soupis použitých měřicích přístrojů">
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

      {/* 10. PODKLADY */}
      {isSekceVisible('podklady') && (
      <ReportSection title="10. Seznam podkladů použitých k provedení revize">
        {revize.podklady ? (
          <p className="report-text">{revize.podklady}</p>
        ) : (
          <p className="report-empty">Nebylo vyplněno</p>
        )}
      </ReportSection>
      )}

      {/* 11. PROVEDENÉ ÚKONY */}
      {isSekceVisible('provedeneUkony') && (
      <ReportSection title="11. Soupis provedených úkonů">
        {revize.provedeneUkony ? (
          <p className="report-text">{revize.provedeneUkony}</p>
        ) : (
          <p className="report-empty">Nebylo vyplněno</p>
        )}
      </ReportSection>
      )}

      {/* 12. ROZVADĚČE A OKRUHY */}
      <ReportSection title="12. Naměřené hodnoty – Rozvaděče a okruhy">
        {rozvadece.length > 0 ? rozvadece.map((roz) => (
          <div key={roz.id} className="report-subsection">
            <div className="report-subsection-title">
              {roz.nazev} ({roz.oznaceni}) – {roz.umisteni}
              {roz.typRozvadece && ` | ${roz.typRozvadece}`}
              {roz.stupenKryti && ` | ${roz.stupenKryti}`}
            </div>
            {roz.okruhy.length > 0 ? (
              <ReportTable
                columns={['Č.', 'Jistič', 'Název okruhu', 'Vodič', 'Iz. odpor [MΩ]', 'Zs [Ω]']}
                widths={['5%', '10%', '30%', '15%', '20%', '20%']}
                rows={roz.okruhy.map(o => [
                  String(o.cislo),
                  [
                    o.jisticTyp,
                    o.jisticProud ? `/${o.jisticProud}` : '',
                    o.pocetFazi ? `/${o.pocetFazi}` : ''
                  ].join('').replace(/\/\//g, '/').replace(/\/$/, ''),
                  o.nazev,
                  (o.typKabelu || o.pocetZil || o.prurez)
                    ? [o.typKabelu, o.pocetZil ? `${o.pocetZil}x${o.prurez ?? ''}` : o.prurez ?? ''].filter(Boolean).join(' ')
                    : (o.vodic ?? ''),
                  o.izolacniOdpor != null ? String(o.izolacniOdpor) : '—',
                  o.impedanceSmycky != null ? String(o.impedanceSmycky) : '—',
                ])}
              />
            ) : (
              <p className="report-empty">Žádné okruhy</p>
            )}
            {roz.chranice.length > 0 && (
              <>
                <div className="report-subsection-subtitle">Proudové chraniče</div>
                <table className="report-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '5%' }}>Č.</th>
                      <th style={{ width: '22%' }}>Název</th>
                      <th style={{ width: '8%' }}>Typ</th>
                      <th style={{ width: '8%' }}>Proud</th>
                      <th style={{ width: '12%' }}>IΔn [mA]</th>
                      <th style={{ width: '8%' }}>Pólů</th>
                      <th style={{ width: '12%' }}>IΔ [mA]</th>
                      <th style={{ width: '12%' }}>tA 1× [ms]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roz.chranice.map(c => {
                      const hasMeasurement = c.testovacitlacitko != null || c.nevybavovaci != null ||
                        c.dotykoveNapeti != null || c.casOdpojeni5x != null ||
                        c.casOdpojeni1_4x != null || c.casOdpojeni2x != null ||
                        c.zkouskaVypnuti2x != null || c.selektivita != null;
                      const details: string[] = [];
                      if (c.testovacitlacitko != null) details.push(`T: ${c.testovacitlacitko ? '✓' : '✗'}`);
                      if (c.nevybavovaci != null) details.push(`NV 0,5×IΔn: ${c.nevybavovaci ? '✓' : '✗'}`);
                      if (c.dotykoveNapeti != null) details.push(`Uc: ${c.dotykoveNapeti} V`);
                      if (c.casOdpojeni5x != null) details.push(`tA 5×IΔn: ${c.casOdpojeni5x} ms`);
                      if (c.casOdpojeni1_4x != null) details.push(`tA 1,4×IΔn: ${c.casOdpojeni1_4x} ms`);
                      if (c.casOdpojeni2x != null) details.push(`tA 2×IΔn: ${c.casOdpojeni2x} ms`);
                      if (c.zkouskaVypnuti2x != null) details.push(`Zkouška 2×IΔn: ${c.zkouskaVypnuti2x ? '✓' : '✗'}`);
                      if (c.selektivita != null) details.push(`Selektivita: ${c.selektivita ? '✓' : '✗'}`);
                      return (
                        <>
                          <tr key={c.id}>
                            <td>{c.cislo}</td>
                            <td>{c.nazev}</td>
                            <td>{c.typ}</td>
                            <td>{c.proud}</td>
                            <td>{c.citlivostMa}</td>
                            <td>{c.pocetPolu}</td>
                            <td>{c.vybavovacProud != null ? c.vybavovacProud : '—'}</td>
                            <td>{c.casOdpojeni1x != null ? c.casOdpojeni1x : '—'}</td>
                          </tr>
                          {hasMeasurement && (
                            <tr key={`${c.id}-detail`} style={{ backgroundColor: '#f8fafc' }}>
                              <td colSpan={8} style={{ fontSize: '0.72em', color: '#475569', paddingTop: '2px', paddingBottom: '4px' }}>
                                {details.join('  •  ')}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )) : (
          <p className="report-empty">Žádné rozvaděče</p>
        )}
      </ReportSection>

      {/* 13. PROSTORY A ZAŘÍZENÍ */}
      {mistnosti.length > 0 && (
        <ReportSection title="13. Prostory a zařízení">
          {mistnosti.map((m) => (
            <div key={m.id} className="report-subsection">
              <div className="report-subsection-title">
                {m.nazev}
                {m.patro && ` (${m.patro})`}
              </div>
              {m.zarizeniList.length > 0 ? (
                <ReportTable
                  columns={['Zařízení', 'Označení', 'Ks', 'Třída', 'Příkon [W]', 'Ochrana', 'Stav']}
                  widths={['22%', '13%', '7%', '8%', '12%', '20%', '18%']}
                  rows={m.zarizeniList.map(z => [
                    z.nazev,
                    z.oznaceni || '—',
                    String(z.pocetKs),
                    z.trida,
                    z.prikonW != null ? String(z.prikonW) : '—',
                    z.ochranaPredDotykem || '—',
                    z.stav === 'OK' ? '✓ OK' : z.stav === 'závada' ? '✗ Závada' : '—',
                  ])}
                />
              ) : (
                <p className="report-empty">Žádná zařízení</p>
              )}
            </div>
          ))}
        </ReportSection>
      )}

      {/* 14. ZÁVADY */}
      <ReportSection title="14. Přehled zjištěných závad">
        {zavady.length > 0 ? (
          <table className="report-data-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>#</th>
                <th style={{ width: '45%' }}>Popis závady</th>
                <th style={{ width: '15%' }}>Závažnost</th>
                <th style={{ width: '15%' }}>Stav</th>
                <th style={{ width: '20%' }}>Zjištěna</th>
              </tr>
            </thead>
            <tbody>
              {zavady.map((z, i) => (
                <tr key={z.id ?? i}>
                  <td>{i + 1}</td>
                  <td>
                    <div>{z.popis}</div>
                    {z.poznamka && (
                      <div className="report-zavada-poznamka">{z.poznamka}</div>
                    )}
                  </td>
                  <td>{z.zavaznost === 'C1' ? 'C1 – Kritická' : z.zavaznost === 'C2' ? 'C2 – Vážná' : 'C3 – Méně závažná'}</td>
                  <td>{z.stav === 'otevřená' ? 'Otevřená' : z.stav === 'v řešení' ? 'V řešení' : 'Vyřešená'}</td>
                  <td>{z.datumZjisteni ? new Date(z.datumZjisteni).toLocaleDateString('cs-CZ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="report-text"><strong>Při revizi nebyly zjištěny žádné závady.</strong></p>
        )}
        {zavady.length > 0 && (
          <div className="report-zavada-legenda">
            <strong>Kategorie závad:</strong>{' '}
            <span><strong>C1</strong> – Kritická závada (bezprostřední nebezpečí, je nutné ihned odpojit zařízení od napájení);</span>{' '}
            <span><strong>C2</strong> – Vážná závada (nutná náprava v co nejkratší době);</span>{' '}
            <span><strong>C3</strong> – Méně závažná závada (doporučení ke zlepšení, zařízení může být provozováno).</span>
          </div>
        )}
        {zavadySFotkami.length > 0 && (
          <p className="report-zavada-foto-note">
            Fotografie k závadám jsou přiloženy na následujících stránách.
          </p>
        )}
      </ReportSection>

      {/* 15. VYHODNOCENÍ PŘEDCHOZÍCH REVIZÍ */}
      {isSekceVisible('vyhodnoceniPredchozich') && (
      <ReportSection title="15. Vyhodnocení předchozích revizí">
        {revize.vyhodnoceniPredchozich ? (
          <p className="report-text">{revize.vyhodnoceniPredchozich}</p>
        ) : (
          <p className="report-empty">Nebylo vyplněno</p>
        )}
      </ReportSection>
      )}

      {/* 16. LHŮTA PŘÍŠTÍ REVIZE */}
      <ReportSection title="16. Doporučená lhůta provedení příští revize">
        <p className="report-text">
          Příští revize by měla být provedena nejpozději do <strong>{revize.datumPlatnosti ? new Date(revize.datumPlatnosti).toLocaleDateString('cs-CZ') : `${revize.termin} měsíců od data provedení`}</strong>.
        </p>
      </ReportSection>

      {/* 17. ODŮVODNĚNÍ */}
      {isSekceVisible('vysledekOduvodneni') && revize.vysledekOduvodneni && (
      <ReportSection title="17. Odůvodnění">
        <p className="report-text">{revize.vysledekOduvodneni}</p>
      </ReportSection>
      )}

      {/* 18. ZÁVĚR */}
      {isSekceVisible('zaver') && revize.zaver && (
      <ReportSection title="18. Závěr">
        <p className="report-text">{revize.zaver}</p>
      </ReportSection>
      )}

      {/* PŘÍLOHA – Fotodokumentace závad (pouze pokud existují závady s fotkami) */}
      {zavadySFotkami.length > 0 && (
        <>
          <div className="report-page-break" />
          <div className="report-photo-appendix">
            <div className="report-photo-appendix-title">Příloha – Fotodokumentace závad</div>
            {zavadySFotkami.map((z) => (
              <div key={z.id ?? z.cisloZavady} className="report-photo-entry">
                <div className="report-photo-entry-header">
                  <span className="report-photo-entry-num">#{z.cisloZavady}</span>
                  <span className="report-photo-entry-popis">{z.popis}</span>
                  <span className="report-photo-entry-badge">
                    {z.zavaznost === 'C1' ? 'C1 – Kritická' : z.zavaznost === 'C2' ? 'C2 – Vážná' : 'C3 – Méně závažná'}
                  </span>
                </div>
                <div className="report-photo-grid">
                  {z.fotky.map((foto, idx) => (
                    <img key={idx} src={foto} alt={`Závada ${z.cisloZavady} – foto ${idx + 1}`} className="report-photo-img" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );

  return (
    <>
      {/* Skrytý zdrojový obsah – React renderuje sem, pagedjs ho přebere */}
      <div ref={sourceRef} className="report-source">
        {reportContent}
      </div>

      {/* Pagedjs cílový kontejner – zde se zobrazí stránky */}
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
