import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right';
  /** Na mobilu se ve kartě zobrazí jako řádek „popisek: hodnota“. Výchozí true. */
  mobile?: boolean;
  /** Sloupec s akcemi: na mobilu je na spodku karty bez popisku. */
  actions?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
}

const TH = 'py-2 px-3.5 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.08em] bg-[var(--bg-faint)]';

/** Tabulka na desktopu, na mobilu (pod md) seznam karet. */
export function DataTable<T>({ columns, rows, rowKey }: DataTableProps<T>) {
  const dataCols = columns.filter((c) => !c.actions && c.mobile !== false);
  const actionCols = columns.filter((c) => c.actions);

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {columns.map((c) => (
                <th key={c.key} className={`${c.align === 'right' ? 'text-right' : 'text-left'} ${TH}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)]"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`py-2 px-3.5 h-11 text-[13px] text-[var(--text)] ${c.align === 'right' ? 'text-right' : ''}`}
                  >
                    {c.actions ? (
                      <div className="flex justify-end gap-2 flex-wrap">{c.render(row)}</div>
                    ) : (
                      c.render(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden divide-y divide-[var(--border)]">
        {rows.map((row) => (
          <li key={rowKey(row)} className="p-4 space-y-2">
            {dataCols.map((c) => (
              <div key={c.key} className="flex justify-between gap-4 text-sm">
                <span className="text-[var(--text-secondary)] shrink-0">{c.header}</span>
                <span className="text-right text-[var(--text)] min-w-0">{c.render(row)}</span>
              </div>
            ))}
            {actionCols.map((c) => (
              <div key={c.key} className="flex flex-wrap gap-2 pt-2">
                {c.render(row)}
              </div>
            ))}
          </li>
        ))}
      </ul>
    </>
  );
}
