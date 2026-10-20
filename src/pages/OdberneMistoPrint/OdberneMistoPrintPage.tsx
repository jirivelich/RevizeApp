import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Previewer } from 'pagedjs';
import { revizeService, zavadaService, revizePristrojService, nastaveniService, zakazniciService } from '../../services/database';
import type { Revize, Zavada, MericiPristroj, Nastaveni, Zakaznik } from '../../types';
import { parseOdberneMisto, porovnejJistic, validujParametry, PPNN_ZDROJ, STAV_LABEL, type OdberneMistoData, type KontrolaPolozka } from '../../types/odberneMisto';
import { ReportHeader } from '../ReportPrint/ReportHeader';
import { ReportSection } from '../ReportPrint/ReportSection';
import { ReportTable } from '../ReportPrint/ReportTable';
import { PrilohyPrint } from '../ReportPrint/PrilohyPrint';
import { loadPrilohyForPrint, type PrilohaPrintItem } from '../../services/prilohyUtils';
import '../ReportPrint/print.css';

const PAGED_CSS = `
@page {
  size: A4;
  margin: 18mm 15mm 20mm 15mm;
  @top-left { content: string(report-number, first); font-size: 8pt; color: #1e293b; font-weight: 700; font-family: 'Segoe UI', Arial, sans-serif; vertical-align: bottom; padding-bottom: 4px; }
  @top-right { content: string(report-title, first); font-size: 8pt; color: #475569; font-family: 'Segoe UI', Arial, sans-serif; vertical-align: bottom; padding-bottom: 4px; }
  @bottom-center { content: "Strana " counter(page) " / " counter(pages); font-size: 8pt; color: #64748b; font-family: 'Segoe UI', Arial, sans-serif; vertical-align: top; padding-top: 4px; }
  @bottom-left { content: string(firma-name, first); font-size: 7.5pt; color: #64748b; font-family: 'Segoe UI', Arial, sans-serif; vertical-align: top; padding-top: 4px; }
  @bottom-right { content: "Zpráva o revizi elektrické instalace odběrného místa"; font-size: 7.5pt; color: #64748b; font-family: 'Segoe UI', Arial, sans-serif; vertical-align: top; padding-top: 4px; }
}
@page:first { @top-left { content: none; } @top-right { content: none; } }
.report-string-number { string-set: report-number content(); }
.report-string-title  { string-set: report-title content(); }
.report-string-firma  { string-set: firma-name content(); }
`;

interface OdberneMistoReportData {
  revize: Revize;
  nastaveni: Nastaveni | null;
  zakaznik: Zakaznik | null;
  zavady: Zavada[];
  pristroje: MericiPristroj[];
  om: OdberneMistoData;
  prilohy: PrilohaPrintItem[];
}

const fmtDate = (d?: string | Date) => (d ? new Date(d).toLocaleDateString('cs-CZ') : '—');

/** Řádky s vyplněným výsledkem; N/A se v tisku vynechává. */
const filled = (rows: KontrolaPolozka[]) => rows.filter(r => r.nazev.trim() && r.vysledek && r.vysledek !== 'NA');

export function OdberneMistoPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<OdberneMistoReportData | null>(null);
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
          const all = await zakazniciService.getAll();
          zakaznik = all.find(z => z.id === revize.zakaznikId) || null;
        } catch { /* ok */ }
      }

      const prilohy = await loadPrilohyForPrint(revizeId);
      setData({ revize, nastaveni: nastaveniData || null, zakaznik, zavady, pristroje, om: parseOdberneMisto(revize.odberneMistoData), prilohy });

      document.title = [revize.cisloRevize, zakaznik?.nazev || revize.objednatel, revize.adresa, 'odberne misto'].filter(Boolean).join(' - ');
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

      const cssRules: string[] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            const text = rule.cssText;
            if (['.report-', '.pagedjs_'].some(p => text.includes(p))) cssRules.push(text);
          }
        } catch { /* CORS */ }
      }
      const cssUrl = URL.createObjectURL(new Blob([cssRules.join('\n') + '\n' + PAGED_CSS], { type: 'text/css' }));
      const previewer = new Previewer();
      const flow = await previewer.preview(content, [cssUrl], previewRef.current);
      URL.revokeObjectURL(cssUrl);
      try { flow?.pages?.forEach((p: any) => p.removeListeners?.()); } catch { /* ok */ }
    } catch (err) {
      console.error('Pagedjs error:', err);
      if (sourceRef.current && previewRef.current) previewRef.current.innerHTML = sourceRef.current.innerHTML;
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
    return <div className="min-h-screen flex items-center justify-center bg-slate-100"><div className="text-lg text-slate-600">Načítání revizní zprávy odběrného místa...</div></div>;
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-slate-700 mb-4">{error || 'Data nenalezena'}</p>
          <button onClick={() => window.history.back()} className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-900">← Zpět</button>
        </div>
      </div>
    );
  }

  const { revize, nastaveni, zakaznik, zavady, pristroje, om, prilohy } = data;

  let tiskSekce: Record<string, boolean> = {};
  if (revize.tiskSekce) { try { tiskSekce = JSON.parse(revize.tiskSekce); } catch { /* prázdné */ } }
  const vis = (key: string) => tiskSekce[key] !== false;

  const typRevizeLabel = revize.typRevize === 'výchozí' ? 'Výchozí revize' : revize.typRevize === 'pravidelná' ? 'Pravidelná revize' : 'Mimořádná revize';
  const vysledekLabel = revize.vysledek === 'schopno' ? 'ELEKTRICKÁ INSTALACE ODBĚRNÉHO MÍSTA JE Z HLEDISKA BEZPEČNOSTI SCHOPNA PROVOZU'
    : revize.vysledek === 'neschopno' ? 'ELEKTRICKÁ INSTALACE ODBĚRNÉHO MÍSTA NENÍ Z HLEDISKA BEZPEČNOSTI SCHOPNA PROVOZU' : '—';
  const vysledekColor = revize.vysledek === 'neschopno' ? '#dc2626' : '#1e293b';

  const prohlidkaRows = filled(om.prohlidka);
  const zkouseniRows = filled(om.zkouseni);
  const checklistRows = filled(om.checklist);
  const checklistSkupiny = checklistRows.reduce<[string, KontrolaPolozka[]][]>((acc, r) => {
    const nazev = r.skupina || 'Ostatní';
    const existing = acc.find(([s]) => s === nazev);
    if (existing) existing[1].push(r); else acc.push([nazev, [r]]);
    return acc;
  }, []);
  const upozorneni = validujParametry(om);
  const mereniRows = om.mereni.filter(m => m.oznaceni.trim() || m.zs.trim() || m.riz.trim());
  const shoda = porovnejJistic(om);
  const smlouvaVyplnena = !!(om.smlouvaCislo || om.smlouvaJistic || om.smlouvaPrikon || om.tarif);
  const parametryVyplneny = !!(om.soustava || om.jisticProud || om.jisticTyp || om.rozvadecTyp || om.zpusobMereni);

  // Dynamické číslování – sekce 1–5 jsou pevné
  const nums = (() => {
    let n = 5;
    const num = (show: boolean) => (show ? ++n : 0);
    return {
      smlouva: num(vis('smlouva') && smlouvaVyplnena),
      parametry: num(vis('parametry') && parametryVyplneny),
      rozsah: num(vis('rozsahRevize')),
      popis: num(vis('popisZarizeni') && !!revize.popisZarizeni),
      podklady: num(vis('podklady') && !!revize.podklady),
      pristroje: num(vis('pristroje')),
      prohlidka: num(vis('prohlidka') && prohlidkaRows.length > 0),
      zkouseni: num(vis('zkouseni') && zkouseniRows.length > 0),
      mereni: num(vis('mereni') && mereniRows.length > 0),
      checklist: num(vis('checklist') && checklistRows.length > 0),
      zavady: num(true),
      vyhodnoceni: num(true),
      zaver: num(vis('zaver') && !!revize.zaver),
      lhuta: num(true),
      rozdelovnik: num(vis('rozdelovnik') && !!revize.rozdelovnik),
      predani: num(true),
    };
  })();
  const t = (n: number, text: string) => `${n}. ${text}`;

  const rtJmeno = revize.rtJmeno || nastaveni?.reviznniTechnikJmeno || '—';
  const rtOpravneni = revize.rtCisloOpravneni || nastaveni?.reviznniTechnikCisloOpravneni || '—';

  const reportContent = (
    <div className="report-page">
      <span className="report-string-number">Zpráva č. {revize.cisloRevize}</span>
      <span className="report-string-title">{revize.nazev} – {revize.adresa}</span>
      <span className="report-string-firma">{nastaveni?.firmaJmeno || ''}</span>

      <ReportHeader nastaveni={nastaveni} revize={revize} />

      <div className="report-title">ZPRÁVA O REVIZI ELEKTRICKÉ INSTALACE ODBĚRNÉHO MÍSTA</div>
      <div className="report-subtitle">
        {typRevizeLabel}
        <br /><span style={{ fontSize: '9pt', color: '#475569' }}>{revize.normySoulad?.trim() || 'dle ČSN 33 1500 a ČSN 33 2000-6'}</span>
      </div>

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

      <ReportSection title="2. Identifikace odběrného místa">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Revidovaný objekt:</td><td>{revize.nazev || '—'}</td></tr>
          <tr><td className="label-cell">Adresa:</td><td>{revize.adresa || '—'}</td></tr>
          {om.parcela && <tr><td className="label-cell">Parcela / č.p.:</td><td>{om.parcela}</td></tr>}
          <tr><td className="label-cell">Distributor:</td><td>{om.distributor || '—'}</td></tr>
          <tr><td className="label-cell">EAN / OPM:</td><td>{om.ean || '—'}</td></tr>
          <tr><td className="label-cell">Číslo elektroměru:</td><td>{om.cisloElektromeru || '—'}</td></tr>
          <tr><td className="label-cell">Typ připojení:</td><td>{om.typPripojeni === 'kabel' ? 'Kabelová přípojka' : om.typPripojeni === 'vzdusne' ? 'Vzdušné vedení' : om.typPripojeni === 'jine' ? 'Jiné' : '—'}</td></tr>
          {om.umisteniRozvadece && <tr><td className="label-cell">Umístění rozvaděče:</td><td>{om.umisteniRozvadece}</td></tr>}
        </tbody></table>
      </ReportSection>

      <ReportSection title="3. Revizní technik">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Jméno:</td><td>{rtJmeno}</td></tr>
          <tr><td className="label-cell">Oprávnění:</td><td>{rtOpravneni}</td></tr>
          {(revize.rtCisloOsvedceni || nastaveni?.reviznniTechnikOsvedceni) && <tr><td className="label-cell">Osvědčení:</td><td>{revize.rtCisloOsvedceni || nastaveni?.reviznniTechnikOsvedceni}</td></tr>}
          {nastaveni?.reviznniTechnikAdresa && <tr><td className="label-cell">Adresa:</td><td>{nastaveni.reviznniTechnikAdresa}</td></tr>}
          {nastaveni?.reviznniTechnikIco && <tr><td className="label-cell">IČO:</td><td>{nastaveni.reviznniTechnikIco}</td></tr>}
        </tbody></table>
      </ReportSection>

      <ReportSection title="4. Důležitá data">
        <table className="report-info-table"><tbody>
          <tr><td className="label-cell">Revize provedena:</td><td>{fmtDate(revize.datum)}</td></tr>
          {revize.datumDokonceni && <tr><td className="label-cell">Revize ukončena:</td><td>{fmtDate(revize.datumDokonceni)}</td></tr>}
          {revize.datumVypracovani && <tr><td className="label-cell">Revize vystavena:</td><td>{fmtDate(revize.datumVypracovani)}</td></tr>}
          {!revize.lhutaText?.trim() && revize.datumPlatnosti && <tr><td className="label-cell">Platnost do:</td><td>{fmtDate(revize.datumPlatnosti)}</td></tr>}
        </tbody></table>
        {revize.typRevize === 'mimořádná' && revize.duvodMimoradne && (
          <p className="report-text"><strong>Důvod mimořádné revize:</strong> {revize.duvodMimoradne}</p>
        )}
      </ReportSection>

      {/* 5 – vyhodnocení (stručně na první straně) */}
      <ReportSection title="5. Celkové vyhodnocení">
        <div className="report-result" style={{ borderColor: vysledekColor }}>
          <div className="report-result-value" style={{ color: vysledekColor }}>{vysledekLabel}</div>
        </div>
      </ReportSection>

      <div className="report-page-break" />

      {nums.smlouva > 0 && (
        <ReportSection title={t(nums.smlouva, 'Smlouva o připojení a tarif odběru')}>
          <table className="report-info-table"><tbody>
            <tr><td className="label-cell">Číslo smlouvy:</td><td>{om.smlouvaCislo || '—'}</td><td className="label-cell">Datum uzavření:</td><td>{fmtDate(om.smlouvaDatum)}</td></tr>
            <tr><td className="label-cell">Platnost do:</td><td>{fmtDate(om.smlouvaPlatnost)}</td><td className="label-cell">Typ odběru:</td><td>{om.smlouvaTypOdberu === 'novy' ? 'Nový odběr' : om.smlouvaTypOdberu === 'zmena' ? 'Změna odběru' : om.smlouvaTypOdberu === 'rozsireni' ? 'Rozšíření odběru' : '—'}</td></tr>
            <tr><td className="label-cell">Rezervovaný příkon:</td><td>{om.smlouvaPrikon ? `${om.smlouvaPrikon} kW` : '—'}</td><td className="label-cell">Hlavní jistič dle smlouvy:</td><td>{om.smlouvaJistic ? `${om.smlouvaJistic} A` : '—'}</td></tr>
            <tr><td className="label-cell">Distribuční sazba:</td><td>{om.tarif || '—'}</td><td className="label-cell">HDO:</td><td>{om.hdoKod || '—'}</td></tr>
            {om.smlouvaUcel && <tr><td className="label-cell">Účel odběru:</td><td colSpan={3}>{om.smlouvaUcel}</td></tr>}
          </tbody></table>
          {shoda !== 'neurceno' && (
            <p className="report-text">
              <strong>Soulad se smlouvou:</strong>{' '}
              {shoda === 'shoda'
                ? `Osazený hlavní jistič (${om.jisticProud} A) odpovídá hodnotě sjednané ve smlouvě.`
                : `Osazený hlavní jistič (${om.jisticProud} A) NEODPOVÍDÁ hodnotě sjednané ve smlouvě (${om.smlouvaJistic} A).`}
            </p>
          )}
          {om.smlouvaPoznamka && <p className="report-text">{om.smlouvaPoznamka}</p>}
        </ReportSection>
      )}

      {nums.parametry > 0 && (
        <ReportSection title={t(nums.parametry, 'Technické parametry odběrného místa')}>
          <table className="report-info-table"><tbody>
            <tr><td className="label-cell">Napájecí soustava:</td><td>{om.soustava || revize.napetovaSoustava || '—'}</td><td className="label-cell">Způsob měření:</td><td>{om.zpusobMereni === 'prime' ? 'Přímé' : om.zpusobMereni === 'neprime' ? 'Nepřímé' : '—'}</td></tr>
            <tr><td className="label-cell">Hlavní jistič:</td><td>{[om.jisticTyp, om.jisticProud && `${om.jisticProud} A`, om.jisticCharakteristika].filter(Boolean).join(', ') || '—'}</td><td className="label-cell">Počet fází / plombovatelnost:</td><td>{[om.pocetFazi && `${om.pocetFazi}f`, om.plombovani && (om.plombovani === 'ano' ? 'plombovatelný' : 'neplombovatelný')].filter(Boolean).join(', ') || '—'}</td></tr>
            <tr><td className="label-cell">Rozvaděč:</td><td>{[om.rozvadecVyrobce, om.rozvadecTyp].filter(Boolean).join(' ') || '—'}</td><td className="label-cell">Krytí / třída ochrany:</td><td>{[om.rozvadecIp, om.rozvadecTrida].filter(Boolean).join(' / ') || '—'}</td></tr>
            {om.rozvadecProhlaseni && <tr><td className="label-cell">Prohlášení o shodě:</td><td colSpan={3}>{om.rozvadecProhlaseni}</td></tr>}
          </tbody></table>
        </ReportSection>
      )}

      {nums.rozsah > 0 && (
        <ReportSection title={t(nums.rozsah, 'Všeobecně – rozsah revize')}>
          <p className="report-text"><strong>Revize zahrnuje:</strong> {revize.rozsahRevize || '—'}</p>
          {revize.predmetNeni && <p className="report-text"><strong>Revize nezahrnuje:</strong> {revize.predmetNeni}</p>}
        </ReportSection>
      )}

      {nums.popis > 0 && (
        <ReportSection title={t(nums.popis, 'Stručný technický popis')}>
          <p className="report-text">{revize.popisZarizeni}</p>
        </ReportSection>
      )}

      {nums.podklady > 0 && (
        <ReportSection title={t(nums.podklady, 'Předložené podklady')}>
          <p className="report-text">{revize.podklady}</p>
        </ReportSection>
      )}

      {nums.pristroje > 0 && (
        <ReportSection title={t(nums.pristroje, 'Použité měřicí přístroje')}>
          {pristroje.length > 0 ? (
            <ReportTable
              columns={['Název', 'Výrobce / Model', 'Výrobní číslo', 'Kalibrace', 'Platnost']}
              widths={['25%', '25%', '20%', '15%', '15%']}
              rows={pristroje.map(p => [p.nazev, `${p.vyrobce} ${p.model}`.trim(), p.vyrobniCislo, fmtDate(p.datumKalibrace), fmtDate(p.platnostKalibrace)])}
            />
          ) : <p className="report-empty">Žádné přístroje nebyly přiřazeny</p>}
        </ReportSection>
      )}

      {nums.prohlidka > 0 && (
        <ReportSection title={t(nums.prohlidka, 'Prohlídka')}>
          <ReportTable
            columns={['Kontrolovaná položka', 'Norma / článek', 'Výsledek', 'Poznámka']}
            widths={['45%', '25%', '14%', '16%']}
            rows={prohlidkaRows.map(r => [r.nazev, r.norma || '—', STAV_LABEL[r.vysledek], r.poznamka || ''])}
          />
        </ReportSection>
      )}

      {nums.zkouseni > 0 && (
        <ReportSection title={t(nums.zkouseni, 'Zkoušení')}>
          <ReportTable
            columns={['Zkouška', 'Norma / článek', 'Výsledek', 'Poznámka']}
            widths={['45%', '25%', '14%', '16%']}
            rows={zkouseniRows.map(r => [r.nazev, r.norma || '—', STAV_LABEL[r.vysledek], r.poznamka || ''])}
          />
        </ReportSection>
      )}

      {nums.mereni > 0 && (
        <ReportSection title={t(nums.mereni, 'Měření')}>
          {(om.napetiU0 || om.prechodovyOdpor) && (
            <p className="report-text">
              {om.napetiU0 && <>Měřené napětí U0 = {om.napetiU0} V. </>}
              {om.prechodovyOdpor && <>Při měření přechodových odporů nebyla překročena hodnota {om.prechodovyOdpor} Ω.</>}
            </p>
          )}
          <ReportTable
            columns={['Obvod', 'Jištění', 'Kabel', 'Zs (Ω)', 'U (V)', 'I (A)', 'ta (ms)', 'IΔn (mA)', 'Riz (MΩ)', 'Výsl.']}
            widths={['16%', '14%', '12%', '8%', '8%', '8%', '8%', '8%', '8%', '10%']}
            rows={mereniRows.map(m => [m.oznaceni, m.jisteni || '—', m.typKabelu || '—', m.zs || '—', m.u || '—', m.i || '—', m.ta || '—', m.idn || '—', m.riz || '—', STAV_LABEL[m.vysledek]])}
          />
        </ReportSection>
      )}

      {nums.checklist > 0 && (
        <ReportSection title={t(nums.checklist, 'Kontrolní seznam dle připojovacích podmínek distributora')}>
          <p className="report-text" style={{ fontSize: '9pt', color: '#475569' }}>Podle dokumentu: {PPNN_ZDROJ}.</p>
          {checklistSkupiny.map(([skupina, rows]) => (
            <div key={skupina}>
              <p className="report-text" style={{ marginTop: '6px', marginBottom: '2px' }}><strong>{skupina}</strong></p>
              <ReportTable
                columns={['Požadavek', 'Kapitola', 'Výsledek', 'Poznámka']}
                widths={['52%', '14%', '14%', '20%']}
                rows={rows.map(r => [r.nazev, r.norma || '—', STAV_LABEL[r.vysledek], r.poznamka || ''])}
              />
            </div>
          ))}
        </ReportSection>
      )}

      <ReportSection title={t(nums.zavady, 'Přehled zjištěných závad')}>
        {zavady.length > 0 ? (
          <ReportTable
            columns={['#', 'Popis závady', 'Závažnost', 'Stav', 'Zjištěna']}
            widths={['5%', '45%', '15%', '15%', '20%']}
            rows={zavady.map((z, i) => [
              String(i + 1), z.popis,
              z.zavaznost === 'C1' ? 'C1 – Kritická' : z.zavaznost === 'C2' ? 'C2 – Vážná' : 'C3 – Méně závažná',
              z.stav === 'otevřená' ? 'Otevřená' : z.stav === 'v řešení' ? 'V řešení' : 'Vyřešená',
              fmtDate(z.datumZjisteni),
            ])}
          />
        ) : <p className="report-text"><strong>Při revizi nebyly zjištěny žádné závady.</strong></p>}
      </ReportSection>

      <ReportSection title={t(nums.vyhodnoceni, 'Vyhodnocení provedené revize')}>
        <div className="report-result" style={{ borderColor: vysledekColor }}>
          <div className="report-result-value" style={{ color: vysledekColor }}>{vysledekLabel}</div>
        </div>
        {revize.vysledekOduvodneni && vis('vysledekOduvodneni') && <p className="report-text">{revize.vysledekOduvodneni}</p>}
        {upozorneni.length > 0 && (
          <div className="report-text">
            <strong>Zjištěný nesoulad s Připojovacími podmínkami nn:</strong>
            <ul style={{ margin: '2px 0 0 16px' }}>{upozorneni.map((u, i) => <li key={i}>{u}</li>)}</ul>
          </div>
        )}
      </ReportSection>

      {nums.zaver > 0 && (
        <ReportSection title={t(nums.zaver, 'Závěr')}>
          <p className="report-text">{revize.zaver}</p>
        </ReportSection>
      )}

      <ReportSection title={t(nums.lhuta, 'Doporučená lhůta příští revize')}>
        <p className="report-text">
          Příští revize by měla být provedena nejpozději do{' '}
          <strong>{revize.lhutaText?.trim() || (revize.datumPlatnosti ? fmtDate(revize.datumPlatnosti) : `${revize.termin} měsíců od data provedení`)}</strong>.
        </p>
      </ReportSection>

      {nums.rozdelovnik > 0 && (
        <ReportSection title={t(nums.rozdelovnik, 'Rozdělovník')}>
          <p className="report-text" style={{ whiteSpace: 'pre-line' }}>{revize.rozdelovnik}</p>
        </ReportSection>
      )}

      <ReportSection title={t(nums.predani, 'Potvrzení o předání revizní zprávy')}>
        <div className="report-signatures">
          <div className="report-signature-box">
            <div className="report-signature-label">Revizní technik:</div>
            <div className="report-signature-name">{rtJmeno}</div>
            <div className="report-signature-cert">Ev. č.: {rtOpravneni}</div>
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
          V ...................... dne {revize.datumVypracovani ? fmtDate(revize.datumVypracovani) : new Date().toLocaleDateString('cs-CZ')}
        </div>
      </ReportSection>

      <PrilohyPrint prilohy={prilohy} />
    </div>
  );

  return (
    <>
      <div ref={sourceRef} className="report-source">{reportContent}</div>
      <div className="report-print-bg">
        {paging && <div className="flex items-center justify-center py-12"><div className="text-slate-500 text-sm">Připravuji stránky...</div></div>}
        <div ref={previewRef} className="report-preview" />
      </div>
    </>
  );
}
