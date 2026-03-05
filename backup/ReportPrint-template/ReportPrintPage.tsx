import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Previewer } from 'pagedjs';
import { revizeService, rozvadecService, okruhService, zavadaService, mistnostService, zarizeniService, revizePristrojService, nastaveniService, zakazniciService } from '../../services/database';
import type { Revize, Rozvadec, Okruh, Zavada, Mistnost, Zarizeni, MericiPristroj, Nastaveni, Zakaznik } from '../../types';
import { ReportHeader } from './ReportHeader';
import { ReportSection } from './ReportSection';
import { ReportTable } from './ReportTable';
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
    color: #1e40af;
    font-weight: 700;
    font-family: 'Segoe UI', Arial, sans-serif;
    vertical-align: bottom;
    padding-bottom: 4px;
  }

  @top-right {
    content: string(report-title, first);
    font-size: 8pt;
    color: #64748b;
    font-family: 'Segoe UI', Arial, sans-serif;
    vertical-align: bottom;
    padding-bottom: 4px;
  }

  @bottom-center {
    content: "Strana " counter(page) " / " counter(pages);
    font-size: 8pt;
    color: #94a3b8;
    font-family: 'Segoe UI', Arial, sans-serif;
    vertical-align: top;
    padding-top: 4px;
  }

  @bottom-left {
    content: string(firma-name, first);
    font-size: 7.5pt;
    color: #94a3b8;
    font-family: 'Segoe UI', Arial, sans-serif;
    vertical-align: top;
    padding-top: 4px;
  }

  @bottom-right {
    content: "Revizní zpráva";
    font-size: 7.5pt;
    color: #94a3b8;
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

      const previewer = new Previewer();
      const flow = await previewer.preview(
        content,
        [combinedCss],
        previewRef.current
      );

      setPageCount(flow.total);
    } catch (err) {
      console.error('Pagedjs error:', err);
      // Fallback: zobrazit obsah přímo
      if (sourceRef.current && previewRef.current) {
        previewRef.current.innerHTML = sourceRef.current.innerHTML;
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
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">← Zpět</button>
        </div>
      </div>
    );
  }

  const { revize, nastaveni, zakaznik, rozvadece, zavady, mistnosti, pristroje } = data;

  let ochranaList: string[] = [];
  if (revize.ochranaOpatreni) {
    try { ochranaList = JSON.parse(revize.ochranaOpatreni); } catch { ochranaList = [revize.ochranaOpatreni]; }
  }

  const typRevizeLabel = revize.typRevize === 'výchozí' ? 'Výchozí revize' :
    revize.typRevize === 'pravidelná' ? 'Pravidelná (periodická) revize' :
    `Mimořádná revize${revize.duvodMimoradne ? ` – ${revize.duvodMimoradne}` : ''}`;

  const vysledekLabel = revize.vysledek === 'schopno' ? 'SCHOPNO BEZPEČNÉHO PROVOZU' :
    revize.vysledek === 'neschopno' ? 'NESCHOPNO BEZPEČNÉHO PROVOZU' :
    revize.vysledek === 'podmíněně schopno' ? 'PODMÍNĚNĚ SCHOPNO BEZPEČNÉHO PROVOZU' : '—';

  const vysledekColor = revize.vysledek === 'schopno' ? '#16a34a' :
    revize.vysledek === 'neschopno' ? '#dc2626' : '#d97706';

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

      <div className="report-title">
        ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ
      </div>
      <div className="report-subtitle">{typRevizeLabel}</div>

      {/* a) PROVOZOVATEL */}
      <ReportSection title="a) Provozovatel (objednatel) revidovaného zařízení">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Název / Jméno:</td><td>{zakaznik?.nazev || revize.objednatel || '—'}</td></tr>
          <tr><td className="label-cell">Adresa / Sídlo:</td><td>{zakaznik?.adresa || '—'}</td></tr>
          {zakaznik?.ico && <tr><td className="label-cell">IČO:</td><td>{zakaznik.ico}</td></tr>}
          {zakaznik?.kontaktOsoba && <tr><td className="label-cell">Kontaktní osoba:</td><td>{zakaznik.kontaktOsoba}</td></tr>}
          {zakaznik?.telefon && <tr><td className="label-cell">Telefon:</td><td>{zakaznik.telefon}</td></tr>}
          {zakaznik?.email && <tr><td className="label-cell">E-mail:</td><td>{zakaznik.email}</td></tr>}
        </tbody></table>
      </ReportSection>

      {/* b) IDENTIFIKACE ZAŘÍZENÍ */}
      <ReportSection title="b) Identifikace revidovaného zařízení a místo umístění">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Název objektu:</td><td>{revize.nazev}</td></tr>
          <tr><td className="label-cell">Adresa objektu:</td><td>{revize.adresa}</td></tr>
        </tbody></table>
      </ReportSection>

      {/* c) ROZSAH REVIZE */}
      <ReportSection title="c) Vymezení rozsahu revize">
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

      {/* d) REVIZNÍ TECHNIK */}
      <ReportSection title="d) Údaje o revizním technikovi">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Jméno:</td><td>{nastaveni?.reviznniTechnikJmeno || '—'}</td></tr>
          <tr><td className="label-cell">Ev. číslo osvědčení:</td><td>{nastaveni?.reviznniTechnikCisloOpravneni || '—'}</td></tr>
          {nastaveni?.reviznniTechnikOsvedceni && <tr><td className="label-cell">Osvědčení:</td><td>{nastaveni.reviznniTechnikOsvedceni}</td></tr>}
          {nastaveni?.reviznniTechnikAdresa && <tr><td className="label-cell">Adresa:</td><td>{nastaveni.reviznniTechnikAdresa}</td></tr>}
          {nastaveni?.reviznniTechnikIco && <tr><td className="label-cell">IČO:</td><td>{nastaveni.reviznniTechnikIco}</td></tr>}
        </tbody></table>
      </ReportSection>

      {/* e) DRUH REVIZE */}
      <ReportSection title="e) Druh revize">
        <p className="report-text"><strong>{typRevizeLabel}</strong></p>
      </ReportSection>

      {/* f) DŮLEŽITÁ DATA */}
      <ReportSection title="f) Důležitá data">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Datum provedení revize:</td><td>{revize.datum ? new Date(revize.datum).toLocaleDateString('cs-CZ') : '—'}</td></tr>
          {revize.datumDokonceni && <tr><td className="label-cell">Datum dokončení:</td><td>{new Date(revize.datumDokonceni).toLocaleDateString('cs-CZ')}</td></tr>}
          {revize.datumVypracovani && <tr><td className="label-cell">Datum vypracování zprávy:</td><td>{new Date(revize.datumVypracovani).toLocaleDateString('cs-CZ')}</td></tr>}
          {revize.datumPlatnosti && <tr><td className="label-cell">Platnost do:</td><td>{new Date(revize.datumPlatnosti).toLocaleDateString('cs-CZ')}</td></tr>}
          <tr><td className="label-cell">Lhůta příští revize:</td><td>{revize.termin} měsíců</td></tr>
        </tbody></table>
      </ReportSection>

      {/* CHARAKTERISTIKA ZAŘÍZENÍ */}
      {(revize.napetovaSoustava || ochranaList.length > 0) && (
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

      {/* g) MĚŘICÍ PŘÍSTROJE */}
      <ReportSection title="g) Soupis použitých měřicích přístrojů">
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

      {/* h) PODKLADY */}
      <ReportSection title="h) Seznam podkladů použitých k provedení revize">
        {revize.podklady ? (
          <p className="report-text">{revize.podklady}</p>
        ) : (
          <p className="report-empty">Nebylo vyplněno</p>
        )}
      </ReportSection>

      {/* i) PROVEDENÉ ÚKONY */}
      <ReportSection title="i) Soupis provedených úkonů">
        {revize.provedeneUkony ? (
          <p className="report-text">{revize.provedeneUkony}</p>
        ) : (
          <p className="report-empty">Nebylo vyplněno</p>
        )}
      </ReportSection>

      {/* j) ROZVADĚČE A OKRUHY */}
      <ReportSection title="j) Naměřené hodnoty – Rozvaděče a okruhy">
        {rozvadece.length > 0 ? rozvadece.map((roz) => (
          <div key={roz.id} className="report-subsection">
            <div className="report-subsection-title">
              {roz.nazev} ({roz.oznaceni}) – {roz.umisteni}
              {roz.typRozvadece && ` | ${roz.typRozvadece}`}
              {roz.stupenKryti && ` | ${roz.stupenKryti}`}
            </div>
            {roz.okruhy.length > 0 ? (
              <ReportTable
                columns={['Č.', 'Jistič', 'Název okruhu', 'Vodič', 'Iz. odpor [MΩ]', 'Zs [Ω]', 'IΔn [mA]', 'tA [ms]']}
                widths={['5%', '8%', '25%', '12%', '12%', '12%', '13%', '13%']}
                rows={roz.okruhy.map(o => [
                  String(o.cislo),
                  `${o.jisticTyp}${o.jisticProud}`,
                  o.nazev,
                  o.vodic,
                  o.izolacniOdpor != null ? String(o.izolacniOdpor) : '—',
                  o.impedanceSmycky != null ? String(o.impedanceSmycky) : '—',
                  o.proudovyChranicMa != null ? String(o.proudovyChranicMa) : '—',
                  o.casOdpojeni != null ? String(o.casOdpojeni) : '—',
                ])}
              />
            ) : (
              <p className="report-empty">Žádné okruhy</p>
            )}
          </div>
        )) : (
          <p className="report-empty">Žádné rozvaděče</p>
        )}
      </ReportSection>

      {/* MÍSTNOSTI A ZAŘÍZENÍ */}
      {mistnosti.length > 0 && (
        <ReportSection title="Místnosti a zařízení">
          {mistnosti.map((m) => (
            <div key={m.id} className="report-subsection">
              <div className="report-subsection-title">
                {m.nazev}
                {m.patro && ` (${m.patro})`}
                {m.typ && ` – ${m.typ}`}
                {m.prostredi && ` | Prostředí: ${m.prostredi}`}
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

      {/* k) ZÁVADY */}
      <ReportSection title="k) Přehled zjištěných závad">
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

      {/* m) VYHODNOCENÍ PŘEDCHOZÍCH REVIZÍ */}
      <ReportSection title="m) Vyhodnocení předchozích revizí">
        {revize.vyhodnoceniPredchozich ? (
          <p className="report-text">{revize.vyhodnoceniPredchozich}</p>
        ) : (
          <p className="report-empty">Nebylo vyplněno</p>
        )}
      </ReportSection>

      {/* l) ZÁVĚREČNÉ ZHODNOCENÍ */}
      <ReportSection title="l) Závěrečné zhodnocení">
        <div className="report-result" style={{ borderColor: vysledekColor }}>
          <div className="report-result-label">Revidované elektrické zařízení je:</div>
          <div className="report-result-value" style={{ color: vysledekColor }}>
            {vysledekLabel}
          </div>
        </div>
        {revize.vysledekOduvodneni && (
          <div className="report-text" style={{ marginTop: '8px' }}>
            <strong>Odůvodnění:</strong>
            <p>{revize.vysledekOduvodneni}</p>
          </div>
        )}
        {revize.zaver && (
          <div className="report-text" style={{ marginTop: '8px' }}>
            <strong>Závěr:</strong>
            <p>{revize.zaver}</p>
          </div>
        )}
      </ReportSection>

      {/* n) LHŮTA PŘÍŠTÍ REVIZE */}
      <ReportSection title="n) Doporučená lhůta provedení příští revize">
        <p className="report-text">
          Příští revize by měla být provedena nejpozději do <strong>{revize.datumPlatnosti ? new Date(revize.datumPlatnosti).toLocaleDateString('cs-CZ') : `${revize.termin} měsíců od data provedení`}</strong>.
        </p>
      </ReportSection>

      {/* o) PODPISY */}
      <ReportSection title="o) Potvrzení o předání zprávy">
        <div className="report-signatures">
          <div className="report-signature-box">
            <div className="report-signature-label">Revizní technik:</div>
            <div className="report-signature-name">{nastaveni?.reviznniTechnikJmeno || '—'}</div>
            <div className="report-signature-cert">Ev. č.: {nastaveni?.reviznniTechnikCisloOpravneni || '—'}</div>
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
      {/* Toolbar – skryje se při tisku */}
      <div className="print-hide bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[210mm] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition">
              ← Zpět na revizi
            </button>
            <span className="text-slate-400">|</span>
            <span className="text-sm text-slate-600 font-medium">{revize.cisloRevize} – {revize.nazev}</span>
          </div>
          <div className="flex items-center gap-3">
            {pageCount > 0 && (
              <span className="text-xs text-slate-400">{pageCount} {pageCount === 1 ? 'strana' : pageCount < 5 ? 'strany' : 'stran'}</span>
            )}
            <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 transition">
              🖨️ Tisk / PDF
            </button>
          </div>
        </div>
      </div>

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
