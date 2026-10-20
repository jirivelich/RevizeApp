import type { PrilohaPrintItem } from '../../services/prilohyUtils';

/** Přílohy revize na konci tištěné zprávy – každá stránka přílohy na vlastním listu. */
export function PrilohyPrint({ prilohy }: { prilohy: PrilohaPrintItem[] }) {
  return (
    <>
      {prilohy.flatMap((p, i) =>
        p.images.map((src, pageIdx) => (
          <div key={`${i}-${pageIdx}`}>
            <div className="report-page-break" />
            <div className="report-priloha">
              <div className="report-priloha-title">
                Příloha {i + 1} – {p.nazev}{p.images.length > 1 ? ` (strana ${pageIdx + 1}/${p.images.length})` : ''}
              </div>
              {pageIdx === 0 && p.poznamka && <div className="report-priloha-poznamka">{p.poznamka}</div>}
              <img src={src} alt={p.nazev} className="report-priloha-img" />
            </div>
          </div>
        ))
      )}
    </>
  );
}
