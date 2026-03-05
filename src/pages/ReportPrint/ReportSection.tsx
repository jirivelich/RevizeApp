import type { ReactNode } from 'react';

interface ReportSectionProps {
  title: string;
  children: ReactNode;
}

export function ReportSection({ title, children }: ReportSectionProps) {
  return (
    <div className="report-section">
      <div className="report-section-title">{title}</div>
      <div className="report-section-content">{children}</div>
    </div>
  );
}
