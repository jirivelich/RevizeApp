import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Previewer } from 'pagedjs';
import { revizeService, zavadaService, revizePristrojService, nastaveniService, zakazniciService } from '../../services/database';
import type { Revize, Zavada, MericiPristroj, Nastaveni, Zakaznik } from '../../types';
import { ReportHeader } from '../ReportPrint/ReportHeader';
import { ReportSection } from '../ReportPrint/ReportSection';
import { ReportTable } from '../ReportPrint/ReportTable';
import '../ReportPrint/print.css';

// ── Typy pro strojní data (z JSON) ──
interface JisteniRow { nazev: string; typ: string; hodnota: string; charakteristika: string; stav: '' | 'V' | 'N' | 'NA'; poznamka: string; }
interface IzolaceRow { misto: string; napeti: string; hodnota: string; pozadavek: string; vysledek: '' | 'V' | 'N' | 'NA'; poznamka: string; }
interface SpojitostRow { misto: string; proud: string; hodnota: string; pozadavek: string; vysledek: '' | 'V' | 'N' | 'NA'; poznamka: string; }
interface ImpedanceRow { misto: string; hodnota: string; pozadavek: string; vysledek: '' | 'V' | 'N' | 'NA'; poznamka: string; }
interface RcdRow { nazev: string; idn: string; typ: string; cas: string; limit: string; vysledek: '' | 'V' | 'N' | 'NA'; poznamka: string; }
interface KontrolaRow { nazev: string; vysledek: '' | 'V' | 'N' | 'NA'; poznamka: string; editable: boolean; }
interface PristrojRow { typ: string; sn: string; kalibrace: string; trida: string; poznamka: string; }

interface StrojniFormData {
  strojNazev: string; strojSn: string; strojVyrobce: string; strojRok: string;
  strojNapajeni: string; strojPrikon: string; strojProud: string; strojIp: string;
  strojTrida: string; strojCe: string; mistoHala: string;
  strojPrivod: '' | 'pevny' | 'pohyblivy';
  jisteni: JisteniRow[]; izolace: IzolaceRow[]; spojitost: SpojitostRow[];
  impedance: ImpedanceRow[]; rcd: RcdRow[]; kontroly: KontrolaRow[]; pristroje: PristrojRow[];
  verdikt: '' | 'pass' | 'fail';
  posudekZavady: string; posudekDoporuceni: string; posudekNormy: string;
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
    content: "Zpráva o revizi elektrické instalace strojního zařízení";
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

export interface StrojniReportData {
  revize: Revize;
  nastaveni: Nastaveni | null;
  zakaznik: Zakaznik | null;
  zavady: Zavada[];
  pristroje: MericiPristroj[];
  strojniData: StrojniFormData | null;
}

// ── Helpers ──
function stavLabel(v: string): string {
  switch (v) {
    case 'V': return 'Vyhovuje';
    case 'N': return 'NEVYHOVUJE';
    case 'NA': return 'N/A';
    default: return '—';
  }
}

export function StrojniZarizeniPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<StrojniReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paging, setPaging] = useState(false);

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

      // Parse strojniData JSON
      let strojniData: StrojniFormData | null = null;
      if (revize.strojniData) {
        try { strojniData = JSON.parse(revize.strojniData); } catch { /* ok */ }
      }

      setData({ revize, nastaveni: nastaveniData || null, zakaznik, zavady, pristroje, strojniData });

      // Nastavit document.title pro výchozí název PDF souboru
      const titleParts = [
        revize.cisloRevize,
        zakaznik?.nazev || revize.objednatel,
        revize.adresa,
        'stroj',
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
      // Odpojit ResizeObserver ze všech pagedjs stránek (zabrání crashům v checkUnderflowAfterResize)
      try { flow?.pages?.forEach((p: any) => p.removeListeners?.()); } catch { /* ok */ }
    } catch (err) {
      console.error('Pagedjs error:', err);
      if (sourceRef.current && previewRef.current) {
        previewRef.current.innerHTML = sourceRef.current.innerHTML;
        // Odhad počtu stránek z výšky obsahu (A4 = 297mm − 38mm margin ≈ 980px)
        requestAnimationFrame(() => {
          if (previewRef.current) {
            // fallback – scroll height based page estimate
            void previewRef.current.scrollHeight;
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



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-lg text-slate-600">Načítání protokolu strojního zařízení...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-slate-700 mb-4">{error || 'Data nenalezena'}</p>
          <button onClick={() => window.history.back()} className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-900">← Zpět</button>
        </div>
      </div>
    );
  }

  const { revize, nastaveni, zakaznik, zavady, pristroje, strojniData: sd } = data;

  const typRevizeLabel = revize.typRevize === 'výchozí' ? 'Výchozí revize' :
    revize.typRevize === 'pravidelná' ? 'Pravidelná revize' :
    `Mimořádná revize${revize.duvodMimoradne ? ` – ${revize.duvodMimoradne}` : ''}`;

  const vysledekLabel = sd?.verdikt === 'pass' ? 'Revidované strojní zařízení je z hlediska zajištění ochrany před úrazem el. proudem schopné provozu.' :
    sd?.verdikt === 'fail' ? 'Revidované strojní zařízení není z hlediska zajištění ochrany před úrazem el. proudem schopné provozu.' : '—';

  const vysledekColor = sd?.verdikt === 'pass' ? '#1e293b' :
    sd?.verdikt === 'fail' ? '#dc2626' : '#1e293b';

  // Filter rows with actual data – řádky s N/A se v náhledu nezobrazí
  const jisteniRows = (sd?.jisteni || []).filter(r => (r.nazev.trim() || r.typ.trim() || r.stav) && r.stav !== 'NA');
  const izolaceRows = (sd?.izolace || []).filter(r => (r.misto.trim() || r.hodnota.trim() || r.vysledek) && r.vysledek !== 'NA');
  const spojitostRows = (sd?.spojitost || []).filter(r => (r.misto.trim() || r.hodnota.trim() || r.vysledek) && r.vysledek !== 'NA');
  const rcdRows = (sd?.rcd || []).filter(r => (r.nazev.trim() || r.cas.trim() || r.vysledek) && r.vysledek !== 'NA');
  const impedanceRows = (sd?.impedance || []).filter(r => (r.misto.trim() || r.hodnota.trim() || r.vysledek) && r.vysledek !== 'NA');
  const kontrolyRows = (sd?.kontroly || []).filter(r => r.nazev.trim() && r.vysledek && r.vysledek !== 'NA');
  const pristrojRows = (sd?.pristroje || []).filter(r => r.typ.trim());

  const reportContent = (
    <div className="report-page">
      {/* String-set prvky */}
      <span className="report-string-number">Zpráva č. {revize.cisloRevize}</span>
      <span className="report-string-title">{revize.nazev} – {revize.adresa}</span>
      <span className="report-string-firma">{nastaveni?.firmaJmeno || ''}</span>

      <ReportHeader nastaveni={nastaveni} revize={revize} />

      <div className="report-title">
        ZPRÁVA O REVIZI ELEKTRICKÉ INSTALACE STROJNÍHO ZAŘÍZENÍ
      </div>
      <div className="report-subtitle">
        {typRevizeLabel}
        {sd?.posudekNormy && <><br /><span style={{ fontSize: '9pt', color: '#475569' }}>dle {sd.posudekNormy}</span></>}
      </div>

      {/* a) PROVOZOVATEL */}
      <ReportSection title="1. Provozovatel (objednatel)">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Název / Jméno:</td><td>{zakaznik?.nazev || revize.objednatel || '—'}</td></tr>
          <tr><td className="label-cell">Adresa / Sídlo:</td><td>{zakaznik?.adresa || revize.adresa || '—'}</td></tr>
          {zakaznik?.ico && <tr><td className="label-cell">IČO:</td><td>{zakaznik.ico}</td></tr>}
          {zakaznik?.kontaktOsoba && <tr><td className="label-cell">Kontaktní osoba:</td><td>{zakaznik.kontaktOsoba}</td></tr>}
          {zakaznik?.telefon && <tr><td className="label-cell">Telefon:</td><td>{zakaznik.telefon}</td></tr>}
          {zakaznik?.email && <tr><td className="label-cell">E-mail:</td><td>{zakaznik.email}</td></tr>}
        </tbody></table>
      </ReportSection>

      {/* b) MÍSTO OVĚŘENÍ */}
      <ReportSection title="2. Místo ověření">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Adresa:</td><td>{revize.adresa || '—'}</td></tr>
          <tr><td className="label-cell">Datum ověření:</td><td>{revize.datum ? new Date(revize.datum).toLocaleDateString('cs-CZ') : '—'}</td></tr>
          {sd?.mistoHala && <tr><td className="label-cell">Hala / pracoviště:</td><td>{sd.mistoHala}</td></tr>}
        </tbody></table>
      </ReportSection>

      {/* c) IDENTIFIKACE STROJE */}
      {sd && (
      <ReportSection title="3. Identifikace strojního zařízení – štítek">
        <table className="report-info-table"><tbody>
          <tr>
            <td className="label-cell">Název / typ stroje:</td><td>{sd.strojNazev || '—'}</td>
            <td className="label-cell">Výrobce:</td><td>{sd.strojVyrobce || '—'}</td>
          </tr>
          <tr>
            <td className="label-cell">Výrobní číslo (SN):</td><td>{sd.strojSn || '—'}</td>
            <td className="label-cell">Rok výroby:</td><td>{sd.strojRok || '—'}</td>
          </tr>
          <tr>
            <td className="label-cell">Napájení:</td><td>{sd.strojNapajeni || '—'}</td>
            <td className="label-cell">Příkon:</td><td>{sd.strojPrikon ? `${sd.strojPrikon} kW` : '—'}</td>
          </tr>
          <tr>
            <td className="label-cell">Jmenovitý proud:</td><td>{sd.strojProud ? `${sd.strojProud} A` : '—'}</td>
            <td className="label-cell">Stupeň ochrany:</td><td>{sd.strojIp || '—'}</td>
          </tr>
          <tr>
            <td className="label-cell">Třída ochrany:</td><td>{sd.strojTrida || '—'}</td>
            <td className="label-cell">CE / Prohlášení o shodě:</td><td>{sd.strojCe || '—'}</td>
          </tr>
          <tr>
            <td className="label-cell">Připojení stroje:</td><td>{sd.strojPrivod === 'pevny' ? 'Pevný přívod' : sd.strojPrivod === 'pohyblivy' ? 'Pohyblivý přívod' : '—'}</td>
            <td className="label-cell">&nbsp;</td><td>&nbsp;</td>
          </tr>
        </tbody></table>
      </ReportSection>
      )}

      {/* d) REVIZNÍ TECHNIK */}
      <ReportSection title="4. Revizní technik">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Jméno:</td><td>{revize.rtJmeno || nastaveni?.reviznniTechnikJmeno || '—'}</td></tr>
          <tr><td className="label-cell">Oprávnění:</td><td>{revize.rtCisloOpravneni || nastaveni?.reviznniTechnikCisloOpravneni || '—'}</td></tr>
          {(revize.rtCisloOsvedceni || nastaveni?.reviznniTechnikOsvedceni) && <tr><td className="label-cell">Osvědčení:</td><td>{revize.rtCisloOsvedceni || nastaveni?.reviznniTechnikOsvedceni}</td></tr>}
          {nastaveni?.reviznniTechnikAdresa && <tr><td className="label-cell">Adresa:</td><td>{nastaveni.reviznniTechnikAdresa}</td></tr>}
          {nastaveni?.reviznniTechnikIco && <tr><td className="label-cell">IČO:</td><td>{nastaveni.reviznniTechnikIco}</td></tr>}
        </tbody></table>
      </ReportSection>

      {/* e) DŮLEŽITÁ DATA */}
      <ReportSection title="5. Důležitá data">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Datum provedení ověření:</td><td>{revize.datum ? new Date(revize.datum).toLocaleDateString('cs-CZ') : '—'}</td></tr>
          {revize.datumDokonceni && <tr><td className="label-cell">Datum dokončení:</td><td>{new Date(revize.datumDokonceni).toLocaleDateString('cs-CZ')}</td></tr>}
          {revize.datumVypracovani && <tr><td className="label-cell">Datum vypracování protokolu:</td><td>{new Date(revize.datumVypracovani).toLocaleDateString('cs-CZ')}</td></tr>}
          {!revize.lhutaText?.trim() && revize.datumPlatnosti && <tr><td className="label-cell">Platnost do:</td><td>{new Date(revize.datumPlatnosti).toLocaleDateString('cs-CZ')}</td></tr>}
          <tr><td className="label-cell">Lhůta příštího ověření:</td><td>{revize.lhutaText?.trim() || `${revize.termin} měsíců`}</td></tr>
        </tbody></table>
      </ReportSection>

      {/* f) JIŠTĚNÍ STROJNÍHO ZAŘÍZENÍ */}
      {jisteniRows.length > 0 && (
      <ReportSection title="6. Jištění strojního zařízení">
        <ReportTable
          columns={['Prvek jištění', 'Typ / označení', 'Jmen. hodnota', 'Charakteristika', 'Stav', 'Pozn.']}
          widths={['24%', '22%', '14%', '16%', '14%', '10%']}
          rows={jisteniRows.map(r => [
            r.nazev,
            r.typ || '—',
            r.hodnota || '—',
            r.charakteristika || '—',
            stavLabel(r.stav),
            r.poznamka || '',
          ])}
        />
      </ReportSection>
      )}

      {/* g) MĚŘENÍ IZOLAČNÍHO ODPORU */}
      {izolaceRows.length > 0 && (
      <ReportSection title="7. Měření izolačního odporu (ČSN EN 60204-1)">
        <ReportTable
          columns={['Měřené místo / obvod', 'Zkuš. napětí', 'Naměřeno (MΩ)', 'Požadavek', 'Výsledek', 'Pozn.']}
          widths={['30%', '14%', '16%', '14%', '14%', '12%']}
          rows={izolaceRows.map(r => [
            r.misto,
            r.napeti || '—',
            r.hodnota || '—',
            r.pozadavek || '—',
            stavLabel(r.vysledek),
            r.poznamka || '',
          ])}
        />
      </ReportSection>
      )}

      {/* h) MĚŘENÍ SPOJITOSTI PE */}
      {spojitostRows.length > 0 && (
      <ReportSection title="8. Měření spojitosti ochranných vodičů (PE)">
        <ReportTable
          columns={['Měřené místo', 'Proud zkoušky', 'Naměřeno (Ω)', 'Požadavek', 'Výsledek', 'Pozn.']}
          widths={['30%', '14%', '16%', '14%', '14%', '12%']}
          rows={spojitostRows.map(r => [
            r.misto,
            r.proud || '—',
            r.hodnota || '—',
            r.pozadavek || '—',
            stavLabel(r.vysledek),
            r.poznamka || '',
          ])}
        />
      </ReportSection>
      )}

      {/* h2) MĚŘENÍ IMPEDANCE PORUCHOVÉ SMYČKY */}
      {impedanceRows.length > 0 && (
      <ReportSection title="9. Měření impedance poruchové smyčky">
        <ReportTable
          columns={['Měřené místo', 'Naměřeno (Ω)', 'Požadavek (max.)', 'Výsledek', 'Pozn.']}
          widths={['30%', '20%', '20%', '14%', '16%']}
          rows={impedanceRows.map(r => [
            r.misto,
            r.hodnota || '—',
            r.pozadavek || '—',
            stavLabel(r.vysledek),
            r.poznamka || '',
          ])}
        />
      </ReportSection>
      )}

      {/* i) MĚŘENÍ PROUDOVÝCH CHRÁNIČŮ (RCD) */}
      {rcdRows.length > 0 && (
      <ReportSection title="10. Měření proudových chráničů (RCD)">
        <ReportTable
          columns={['Označení RCD', 'IΔn (mA)', 'Typ', 'Čas (ms)', 'Limit (ms)', 'Výsledek', 'Pozn.']}
          widths={['18%', '10%', '12%', '14%', '12%', '14%', '20%']}
          rows={rcdRows.map(r => [
            r.nazev,
            r.idn || '—',
            r.typ || '—',
            r.cas || '—',
            r.limit || '—',
            stavLabel(r.vysledek),
            r.poznamka || '',
          ])}
        />
      </ReportSection>
      )}

      {/* j) FUNKČNÍ KONTROLY */}
      {kontrolyRows.length > 0 && (
      <ReportSection title="11. Funkční kontroly">
        <ReportTable
          columns={['Kontrolovaný prvek', 'Výsledek', 'Poznámka']}
          widths={['50%', '20%', '30%']}
          rows={kontrolyRows.map(r => [
            r.nazev,
            stavLabel(r.vysledek),
            r.poznamka || '',
          ])}
        />
      </ReportSection>
      )}

      {/* k) MĚŘICÍ PŘÍSTROJE */}
      <ReportSection title="12. Soupis použitých měřicích přístrojů">
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
        ) : pristrojRows.length > 0 ? (
          <ReportTable
            columns={['Přístroj / typ', 'Výrobní číslo', 'Kalibrován do', 'Třída přesnosti', 'Poznámka']}
            widths={['30%', '20%', '18%', '16%', '16%']}
            rows={pristrojRows.map(r => [
              r.typ,
              r.sn || '—',
              r.kalibrace || '—',
              r.trida || '—',
              r.poznamka || '',
            ])}
          />
        ) : (
          <p className="report-empty">Žádné přístroje nebyly přiřazeny</p>
        )}
      </ReportSection>

      {/* l) ZÁVADY */}
      <ReportSection title="13. Přehled zjištěných závad">
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
        ) : sd?.posudekZavady ? (
          <div className="report-text">
            <strong>Zjištěné nedostatky:</strong>
            <p>{sd.posudekZavady}</p>
          </div>
        ) : (
          <p className="report-text"><strong>Při ověření nebyly zjištěny žádné závady.</strong></p>
        )}
        {sd?.posudekDoporuceni && (
          <div className="report-text" style={{ marginTop: '8px' }}>
            <strong>Doporučení / termín odstranění závad:</strong>
            <p>{sd.posudekDoporuceni}</p>
          </div>
        )}
      </ReportSection>

      {/* m) VYHODNOCENÍ */}
      <ReportSection title="14. Vyhodnocení">
        <div className="report-result" style={{ borderColor: vysledekColor }}>
          <div className="report-result-value" style={{ color: vysledekColor }}>
            {vysledekLabel}
          </div>
        </div>
        <p className="report-text" style={{ marginTop: '6px', fontStyle: 'italic', fontSize: '9pt' }}>
          Tato revize nemůže nahradit kontrolu bezpečnosti provozu strojního zařízení podle nařízení vlády č.&nbsp;378/2001&nbsp;Sb.
        </p>
      </ReportSection>

      {/* n) LHŮTA PŘÍŠTÍHO OVĚŘENÍ */}
      <ReportSection title="15. Doporučená lhůta provedení příštího ověření">
        <p className="report-text">
          Příští ověření by mělo být provedeno nejpozději do <strong>{revize.lhutaText?.trim() || (revize.datumPlatnosti ? new Date(revize.datumPlatnosti).toLocaleDateString('cs-CZ') : `${revize.termin} měsíců od data provedení`)}</strong>.
        </p>
      </ReportSection>

      {/* o) PODPISY */}
      <ReportSection title="16. Potvrzení o předání protokolu">
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
