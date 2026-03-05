import type { Nastaveni, Revize } from '../../types';

interface ReportHeaderProps {
  nastaveni: Nastaveni | null;
  revize: Revize;
}

export function ReportHeader({ nastaveni, revize }: ReportHeaderProps) {
  return (
    <div className="report-header">
      <div className="report-header-left">
        {nastaveni?.logo && (
          <img src={nastaveni.logo} alt="Logo" className="report-logo" />
        )}
        <div className="report-header-firma">
          <div className="report-header-firma-name">{nastaveni?.firmaJmeno || '—'}</div>
          <div className="report-header-firma-detail">{nastaveni?.firmaAdresa || ''}</div>
          {nastaveni?.firmaIco && <div className="report-header-firma-detail">IČO: {nastaveni.firmaIco}</div>}
          {nastaveni?.firmaDic && <div className="report-header-firma-detail">DIČ: {nastaveni.firmaDic}</div>}
          {nastaveni?.kontaktTelefon && <div className="report-header-firma-detail">Tel: {nastaveni.kontaktTelefon}</div>}
          {nastaveni?.kontaktEmail && <div className="report-header-firma-detail">E-mail: {nastaveni.kontaktEmail}</div>}
        </div>
      </div>
      <div className="report-header-right">
        <div className="report-header-info">
          <span className="report-header-info-label">Číslo zprávy:</span>
          <span className="report-header-info-value">{revize.cisloRevize}</span>
        </div>
        <div className="report-header-info">
          <span className="report-header-info-label">Datum:</span>
          <span className="report-header-info-value">{revize.datum ? new Date(revize.datum).toLocaleDateString('cs-CZ') : '—'}</span>
        </div>
      </div>
    </div>
  );
}
