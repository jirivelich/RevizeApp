import { ReportTable } from './ReportTable';
import type { Zavada } from '../../types';

/** Blok „Doporučení“ – nesoulad se současnými normami, bez povinnosti nápravy. */
export function ReportDoporuceni({ doporuceni }: { doporuceni: Zavada[] }) {
  if (doporuceni.length === 0) return null;
  return (
    <div style={{ marginTop: '10px' }}>
      <strong>Doporučení (nesoulad se současnými normami)</strong>
      <p className="report-text">
        Doporučení nejsou závadami. Nezakládají provozovateli povinnost nápravy a nemají vliv na posouzení
        schopnosti zařízení provozu; jde o odbornou radu ke zvýšení bezpečnosti.
      </p>
      <ReportTable
        columns={['#', 'Doporučení', 'Zdůvodnění (snížené riziko)']}
        widths={['5%', '50%', '45%']}
        rows={doporuceni.map((z, i) => [String(i + 1), z.popis, z.zduvodneni || '—'])}
      />
    </div>
  );
}
