/**
 * Testy pro ReportTable – datová tabulka v tiskové revizní zprávě
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportTable } from '../../pages/ReportPrint/ReportTable';

describe('ReportTable', () => {
  const columns = ['Název', 'Hodnota', 'Jednotka'];
  const rows = [
    ['Izolační odpor', '150', 'MΩ'],
    ['Impedance smyčky', '0.45', 'Ω'],
  ];

  it('should render all column headers', () => {
    render(<ReportTable columns={columns} rows={rows} />);
    expect(screen.getByText('Název')).toBeInTheDocument();
    expect(screen.getByText('Hodnota')).toBeInTheDocument();
    expect(screen.getByText('Jednotka')).toBeInTheDocument();
  });

  it('should render all row data', () => {
    render(<ReportTable columns={columns} rows={rows} />);
    expect(screen.getByText('Izolační odpor')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('MΩ')).toBeInTheDocument();
    expect(screen.getByText('Impedance smyčky')).toBeInTheDocument();
    expect(screen.getByText('0.45')).toBeInTheDocument();
    expect(screen.getByText('Ω')).toBeInTheDocument();
  });

  it('should render correct number of rows', () => {
    const { container } = render(<ReportTable columns={columns} rows={rows} />);
    const bodyRows = container.querySelectorAll('tbody tr');
    expect(bodyRows).toHaveLength(2);
  });

  it('should render correct number of header cells', () => {
    const { container } = render(<ReportTable columns={columns} rows={rows} />);
    const headerCells = container.querySelectorAll('thead th');
    expect(headerCells).toHaveLength(3);
  });

  it('should apply widths when provided', () => {
    const widths = ['40%', '30%', '30%'];
    const { container } = render(<ReportTable columns={columns} widths={widths} rows={rows} />);
    const headers = container.querySelectorAll('thead th');
    expect(headers[0]).toHaveStyle({ width: '40%' });
    expect(headers[1]).toHaveStyle({ width: '30%' });
    expect(headers[2]).toHaveStyle({ width: '30%' });
  });

  it('should NOT set width style when widths not provided', () => {
    const { container } = render(<ReportTable columns={columns} rows={rows} />);
    const headers = container.querySelectorAll('thead th');
    // Without widths prop, no inline style should be set
    expect(headers[0].style.width).toBe('');
  });

  it('should have report-data-table class', () => {
    const { container } = render(<ReportTable columns={columns} rows={rows} />);
    expect(container.querySelector('.report-data-table')).toBeInTheDocument();
  });

  it('should render empty table when rows is empty', () => {
    const { container } = render(<ReportTable columns={columns} rows={[]} />);
    const headerCells = container.querySelectorAll('thead th');
    const bodyRows = container.querySelectorAll('tbody tr');
    expect(headerCells).toHaveLength(3);
    expect(bodyRows).toHaveLength(0);
  });

  it('should render okruhy-style table correctly', () => {
    const okruhyColumns = ['Č.', 'Jistič', 'Název okruhu', 'Vodič', 'Iz. odpor [MΩ]', 'Zs [Ω]', 'IΔn [mA]', 'tA [ms]'];
    const okruhyWidths = ['5%', '8%', '25%', '12%', '12%', '12%', '13%', '13%'];
    const okruhyRows = [
      ['1', 'B16', 'Zásuvky kuchyně', 'CYKY 3x2.5', '200', '0.32', '30', '18'],
      ['2', 'B10', 'Osvětlení', 'CYKY 3x1.5', '500', '0.48', '—', '—'],
    ];
    const { container } = render(
      <ReportTable columns={okruhyColumns} widths={okruhyWidths} rows={okruhyRows} />
    );
    expect(container.querySelectorAll('thead th')).toHaveLength(8);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(screen.getByText('Zásuvky kuchyně')).toBeInTheDocument();
    expect(screen.getByText('CYKY 3x2.5')).toBeInTheDocument();
  });

  it('should render zavady-style table correctly', () => {
    const zavadyColumns = ['#', 'Popis závady', 'Závažnost', 'Stav', 'Zjištěna'];
    const zavadyRows = [
      ['1', 'Poškozená izolace vodiče', 'C1 – Kritická', 'Otevřená', '15. 3. 2026'],
      ['2', 'Chybí kryt svorkovnice', 'C3 – Méně závažná', 'Vyřešená', '15. 3. 2026'],
    ];
    render(<ReportTable columns={zavadyColumns} rows={zavadyRows} />);
    expect(screen.getByText('Poškozená izolace vodiče')).toBeInTheDocument();
    expect(screen.getByText('C1 – Kritická')).toBeInTheDocument();
    expect(screen.getByText('Chybí kryt svorkovnice')).toBeInTheDocument();
  });

  it('should render pristroje-style table correctly', () => {
    const pristrojeColumns = ['Název', 'Výrobce / Model', 'Výrobní číslo', 'Kalibrace', 'Platnost'];
    const pristrojeRows = [
      ['Fluke 1653', 'Fluke 1653B', 'SN12345', '1. 1. 2026', '1. 1. 2027'],
    ];
    render(<ReportTable columns={pristrojeColumns} rows={pristrojeRows} />);
    expect(screen.getByText('Fluke 1653')).toBeInTheDocument();
    expect(screen.getByText('SN12345')).toBeInTheDocument();
  });

  it('should handle dash values for missing measurements', () => {
    const rows = [['1', 'B16', 'Zásuvky', 'CYKY', '—', '—', '—', '—']];
    render(<ReportTable columns={['a','b','c','d','e','f','g','h']} rows={rows} />);
    const dashes = screen.getAllByText('—');
    expect(dashes).toHaveLength(4);
  });

  it('should render single-column table', () => {
    render(<ReportTable columns={['Položka']} rows={[['A'], ['B']]} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
