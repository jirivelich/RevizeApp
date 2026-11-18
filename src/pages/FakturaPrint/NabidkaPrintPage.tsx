import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNastaveni } from '../../hooks/useQueries';
import { useNabidka } from '../../services/nabidky';
import { stahnoutPdf } from './pdfZeStranky';
import './faktura-print.css';

const meny = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 2 });
const cena = (n: number | undefined | null) => meny.format(Number(n) || 0);
const datum = (d?: string | null) => (d ? new Date(d).toLocaleDateString('cs-CZ') : '—');
const mnozstvi = (n: number) => new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 3 }).format(Number(n) || 0);

/** Tisk / PDF cenové nabídky – stejný vzhled jako faktura, bez platebních údajů. */
export default function NabidkaPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: nabidka, isLoading } = useNabidka(id ? Number(id) : undefined);
  const { data: nastaveni } = useNastaveni();
  const stranka = useRef<HTMLDivElement>(null);
  const [pdfBezi, setPdfBezi] = useState(false);

  if (isLoading) return <div style={{ padding: 24 }}>Načítám nabídku…</div>;
  if (!nabidka) {
    return (
      <div style={{ padding: 24 }}>
        <p>Nabídka nenalezena.</p>
        <button className="fp-btn" onClick={() => navigate(-1)}>← Zpět</button>
      </div>
    );
  }

  const termin = nabidka.terminOd || nabidka.terminDo
    ? [nabidka.terminOd && datum(nabidka.terminOd), nabidka.terminDo && datum(nabidka.terminDo)].filter(Boolean).join(' – ')
    : null;

  return (
    <div className="fp-bg">
      <div className="fp-toolbar fp-no-print">
        <div className="fp-toolbar-inner">
          <button className="fp-btn" onClick={() => navigate(-1)}>← Zpět</button>
          <div className="fp-toolbar-actions">
            <button className="fp-btn" disabled={pdfBezi} onClick={async () => {
              if (!stranka.current) return;
              setPdfBezi(true);
              try { await stahnoutPdf(stranka.current, `Cenova-nabidka_${nabidka.cislo || nabidka.id}.pdf`); }
              catch (e) { console.error('Export PDF selhal:', e); alert('PDF se nepodařilo vytvořit. Zkuste Tisk → Uložit jako PDF.'); }
              finally { setPdfBezi(false); }
            }}>{pdfBezi ? 'Vytvářím PDF…' : 'Stáhnout PDF'}</button>
            <button className="fp-btn fp-btn-primary" onClick={() => window.print()}>Tisk</button>
          </div>
        </div>
      </div>

      <div className="fp-page" ref={stranka}>
        {nabidka.stav === 'koncept' && <div className="fp-watermark">KONCEPT</div>}

        <div className="fp-head">
          <div className="fp-supplier">
            {nastaveni?.logo && <img src={nastaveni.logo} alt="Logo" className="fp-logo" />}
            <div>
              <div className="fp-firma-name">{nastaveni?.firmaJmeno || '—'}</div>
              {nastaveni?.firmaAdresa && <div className="fp-small fp-pre">{nastaveni.firmaAdresa}</div>}
              {nastaveni?.firmaIco && <div className="fp-small">IČO: {nastaveni.firmaIco}</div>}
              {nastaveni?.firmaDic && <div className="fp-small">DIČ: {nastaveni.firmaDic}</div>}
              {nastaveni?.kontaktTelefon && <div className="fp-small">Tel: {nastaveni.kontaktTelefon}</div>}
              {nastaveni?.kontaktEmail && <div className="fp-small">E-mail: {nastaveni.kontaktEmail}</div>}
            </div>
          </div>
          <div className="fp-title">
            <h1>CENOVÁ NABÍDKA</h1>
            <div className="fp-title-num">{nabidka.cislo || 'bez čísla'}</div>
          </div>
        </div>

        <div className="fp-parties">
          <div className="fp-box">
            <div className="fp-box-label">Odběratel</div>
            <div className="fp-box-name">{nabidka.odberatelNazev}</div>
            {nabidka.odberatelAdresa && <div className="fp-pre">{nabidka.odberatelAdresa}</div>}
            {nabidka.odberatelIco && <div>IČO: {nabidka.odberatelIco}</div>}
            {nabidka.odberatelDic && <div>DIČ: {nabidka.odberatelDic}</div>}
            {nabidka.odberatelEmail && <div>{nabidka.odberatelEmail}</div>}
          </div>
          <div className="fp-box">
            <dl className="fp-dates" style={{ margin: 0 }}>
              <dt>Datum vystavení:</dt><dd>{datum(nabidka.datumVystaveni)}</dd>
              <dt>Platnost do:</dt><dd>{datum(nabidka.platnostDo)}</dd>
              {termin && (<><dt>Předpokládaný termín:</dt><dd>{termin}</dd></>)}
              {nabidka.misto && (<><dt>Místo plnění:</dt><dd>{nabidka.misto}</dd></>)}
            </dl>
          </div>
        </div>

        {nabidka.predmet && (
          <p style={{ margin: '14px 0 12px', fontSize: '11pt' }}><strong>Předmět nabídky:</strong> {nabidka.predmet}</p>
        )}

        <table className="fp-table">
          <thead>
            <tr>
              <th>Popis</th>
              <th className="r">Množství</th>
              <th className="r">Cena / j.</th>
              <th className="r">Celkem</th>
            </tr>
          </thead>
          <tbody>
            {(nabidka.polozky ?? []).map((p, i) => (
              <tr key={i}>
                <td className="fp-pre">{p.popis}</td>
                <td className="r">{mnozstvi(p.mnozstvi)}{p.jednotka ? ` ${p.jednotka}` : ''}</td>
                <td className="r">{cena(p.cenaZaJednotku)}</td>
                <td className="r">{cena(p.celkem)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {(() => {
          const pol = (nabidka.polozky ?? []).reduce((s, p) => s + (Number(p.celkem) || 0), 0);
          const pct = Number(nabidka.slevaProcent) || 0;
          if (pct <= 0) return null;
          return (
            <div className="fp-sleva">
              <div>Mezisoučet: {cena(pol)}</div>
              <div>Sleva {pct.toLocaleString('cs-CZ')} %: −{cena(pol - (Number(nabidka.celkem) || 0))}</div>
            </div>
          );
        })()}
        <div className="fp-total">
          <div className="fp-total-box">Cena celkem: {cena(nabidka.celkem)}</div>
        </div>
        <div className="fp-dph">Nejsem plátce DPH.</div>

        {nabidka.poznamka && <div className="fp-note fp-pre">{nabidka.poznamka}</div>}
        <div className="fp-note">
          Nabídka je platná do {datum(nabidka.platnostDo)}. V případě dotazů mě neváhejte kontaktovat.
        </div>
        {nastaveni?.razitko && (
          <div className="fp-pay" style={{ justifyContent: 'flex-end' }}>
            <img src={nastaveni.razitko} alt="Razítko" className="fp-stamp" />
          </div>
        )}
      </div>
    </div>
  );
}
