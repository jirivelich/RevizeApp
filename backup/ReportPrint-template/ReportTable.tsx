interface ReportTableProps {
  columns: string[];
  widths?: string[];
  rows: string[][];
}

export function ReportTable({ columns, widths, rows }: ReportTableProps) {
  return (
    <table className="report-data-table">
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th key={i} style={widths?.[i] ? { width: widths[i] } : undefined}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td key={ci}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
