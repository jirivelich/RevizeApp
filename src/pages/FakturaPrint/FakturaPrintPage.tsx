import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFaktura, useNastaveni } from '../../hooks/useQueries';
import { qrDataUrl, sestavSpayd } from './qrPlatba';
import './faktura-print.css';

const meny = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 2 });
const cena = (n: number | undefined | null) => meny.format(Number(n) || 0);
const datum = (d?: string | null) => (d ? new Date(d).toLocaleDateString('cs-CZ') : '—');
const mnozstvi = (n: number) => new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 3 }).format(Number(n) || 0);

const FORMA_UHRADY: Record<string, string> = {
  prevod: 'Bankovní převod',
  hotove: 'Hotově',
  karta: 'Kartou',
};

export default function FakturaPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: faktura, isLoading } = useFaktura(id ? Number(id) : undefined);
  const { data: nastaveni } = useNastaveni();
  const [qr, setQr] = useState<string | null>(null);

  const iban = nastaveni?.iban?.trim();
  const castka = Number(faktura?.celkem) || 0;
  const vs = faktura?.variabilniSymbol || faktura?.cisloFaktury || '';
  const cislo = faktura?.cisloFaktury;

  useEffect(() => {
    let zrusit = false;
    if (!iban || castka <= 0) {
      setQr(null);
      return;
    }
    const spayd = sestavSpayd({ iban, castka, vs, zprava: cislo ? `Faktura ${cislo}` : undefined });
    qrDataUrl(spayd)
      .then((url) => { if (!zrusit) setQr(url); })
      .catch(() => { if (!zrusit) setQr(null); });
    return () => { zrusit = true; };
  }, [iban, castka, vs, cislo]);

  if (isLoading) return <div style={{ padding: 24 }}>Načítám fakturu…</div>;
  if (!faktura) {
    return (
      <div style={{ padding: 24 }}>
        <p>Faktura nenalezena.</p>
        <button className="fp-btn" onClick={() => navigate(-1)}>← Zpět</button>
      </div>
    );
  }

  const watermark = faktura.stav === 'koncept' ? 'KONCEPT' : faktura.stav === 'storno' ? 'STORNO' : null;
  const forma = FORMA_UHRADY[faktura.formaUhrady] ?? faktura.formaUhrady;
  const jePrevod = faktura.formaUhrady === 'prevod' || faktura.formaUhrady.toLowerCase().includes('převod');

  return (
    <div className="fp-bg">
      <div className="fp-toolbar fp-no-print">
        <div className="fp-toolbar-inner">
          <button className="fp-btn" onClick={() => navigate(-1)}>← Zpět</button>
          <button className="fp-btn fp-btn-primary" onClick={() => window.print()}>Tisk</button>
        </div>
      </div>

      <div className="fp-page">
        {watermark && <div className="fp-watermark">{watermark}</div>}

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
            <h1>FAKTURA</h1>
            <div className="fp-title-num">{faktura.cisloFaktury || 'bez čísla'}</div>
          </div>
        </div>

        <div className="fp-parties">
          <div className="fp-box">
            <div className="fp-box-label">Odběratel</div>
            <div className="fp-box-name">{faktura.odberatelNazev}</div>
            {faktura.odberatelAdresa && <div className="fp-pre">{faktura.odberatelAdresa}</div>}
            {faktura.odberatelIco && <div>IČO: {faktura.odberatelIco}</div>}
            {faktura.odberatelDic && <div>DIČ: {faktura.odberatelDic}</div>}
          </div>
          <div className="fp-box">
            <dl className="fp-dates" style={{ margin: 0 }}>
              <dt>Variabilní symbol:</dt><dd>{vs || '—'}</dd>
              <dt>Datum vystavení:</dt><dd>{datum(faktura.datumVystaveni)}</dd>
              <dt>Datum zdan. plnění:</dt><dd>{datum(faktura.datumZdanitelnehoPlneni)}</dd>
              <dt>Datum splatnosti:</dt><dd>{datum(faktura.datumSplatnosti)}</dd>
              <dt>Forma úhrady:</dt><dd>{forma}</dd>
            </dl>
          </div>
        </div>

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
            {(faktura.polozky ?? []).map((p, i) => (
              <tr key={i}>
                <td className="fp-pre">{p.popis}</td>
                <td className="r">{mnozstvi(p.mnozstvi)}{p.jednotka ? ` ${p.jednotka}` : ''}</td>
                <td className="r">{cena(p.cenaZaJednotku)}</td>
                <td className="r">{cena(p.celkem)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="fp-total">
          <div className="fp-total-box">Celkem k úhradě: {cena(faktura.celkem)}</div>
        </div>
        <div className="fp-dph">Nejsem plátce DPH.</div>

        <div className="fp-pay">
          <dl className="fp-pay-info" style={{ margin: 0 }}>
            {(nastaveni?.bankovniUcet || iban) && jePrevod && (
              <>
                {nastaveni?.bankovniUcet && (<><dt>Číslo účtu:</dt><dd>{nastaveni.bankovniUcet}</dd></>)}
                {iban && (<><dt>IBAN:</dt><dd>{iban}</dd></>)}
                {nastaveni?.swift && (<><dt>SWIFT:</dt><dd>{nastaveni.swift}</dd></>)}
                <dt>Variabilní symbol:</dt><dd>{vs || '—'}</dd>
                <dt>Částka:</dt><dd>{cena(faktura.celkem)}</dd>
              </>
            )}
          </dl>
          {qr && (
            <div className="fp-qr">
              <img src={qr} alt="QR platba" />
              QR platba
            </div>
          )}
          {nastaveni?.razitko && <img src={nastaveni.razitko} alt="Razítko" className="fp-stamp" />}
        </div>

        {faktura.poznamka && <div className="fp-note fp-pre">{faktura.poznamka}</div>}
        {nastaveni?.fakturaPoznamkaPata && <div className="fp-foot">{nastaveni.fakturaPoznamkaPata}</div>}
      </div>
    </div>
  );
}
