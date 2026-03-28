/**
 * Testy pro ReportHeader – záhlaví tiskové revizní zprávy
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportHeader } from '../../pages/ReportPrint/ReportHeader';
import type { Nastaveni, Revize } from '../../types';

// ── Testovací data ──────────────────────────

const baseRevize: Revize = {
  cisloRevize: 'R-2026-042',
  nazev: 'Revize bytového domu',
  adresa: 'Testovací 123, Praha',
  objednatel: 'Jan Novák',
  kategorieRevize: 'elektro',
  datum: '2026-03-15',
  termin: 36,
  typRevize: 'pravidelná',
  stav: 'dokončeno',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fullNastaveni: Nastaveni = {
  firmaJmeno: 'ElektroRevize s.r.o.',
  firmaAdresa: 'Průmyslová 456, Brno',
  firmaIco: '12345678',
  firmaDic: 'CZ12345678',
  reviznniTechnikJmeno: 'Ing. Karel Svoboda',
  reviznniTechnikCisloOpravneni: 'E2A-1234/2020',
  kontaktTelefon: '+420 123 456 789',
  kontaktEmail: 'info@elektrorevize.cz',
  logo: 'data:image/png;base64,iVBOR...',
};

// ═══════════════════════════════════════════

describe('ReportHeader', () => {
  it('should render firma name', () => {
    render(<ReportHeader nastaveni={fullNastaveni} revize={baseRevize} />);
    expect(screen.getByText('ElektroRevize s.r.o.')).toBeInTheDocument();
  });

  it('should render firma address', () => {
    render(<ReportHeader nastaveni={fullNastaveni} revize={baseRevize} />);
    expect(screen.getByText('Průmyslová 456, Brno')).toBeInTheDocument();
  });

  it('should render ICO and DIC when present', () => {
    render(<ReportHeader nastaveni={fullNastaveni} revize={baseRevize} />);
    expect(screen.getByText('IČO: 12345678')).toBeInTheDocument();
    expect(screen.getByText('DIČ: CZ12345678')).toBeInTheDocument();
  });

  it('should render kontakt info when present', () => {
    render(<ReportHeader nastaveni={fullNastaveni} revize={baseRevize} />);
    expect(screen.getByText('Tel: +420 123 456 789')).toBeInTheDocument();
    expect(screen.getByText('E-mail: info@elektrorevize.cz')).toBeInTheDocument();
  });

  it('should render cislo zpravy', () => {
    render(<ReportHeader nastaveni={fullNastaveni} revize={baseRevize} />);
    expect(screen.getByText('R-2026-042')).toBeInTheDocument();
    expect(screen.getByText('Číslo zprávy:')).toBeInTheDocument();
  });

  it('should render datum in cs-CZ format', () => {
    render(<ReportHeader nastaveni={fullNastaveni} revize={baseRevize} />);
    expect(screen.getByText('Datum:')).toBeInTheDocument();
    // 15. 3. 2026 in cs-CZ locale
    const dateCell = screen.getByText(/15/);
    expect(dateCell).toBeInTheDocument();
  });

  it('should show dash when datum is missing', () => {
    const noDateRevize = { ...baseRevize, datum: '' };
    render(<ReportHeader nastaveni={fullNastaveni} revize={noDateRevize} />);
    // Číslo zprávy řádek má hodnotu, datum řádek má '—'
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('should show dash when nastaveni is null', () => {
    render(<ReportHeader nastaveni={null} revize={baseRevize} />);
    // Firma name fallback
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should render logo when provided', () => {
    render(<ReportHeader nastaveni={fullNastaveni} revize={baseRevize} />);
    const logo = screen.getByAltText('Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', 'data:image/png;base64,iVBOR...');
  });

  it('should NOT render logo when not provided', () => {
    const noLogoNastaveni = { ...fullNastaveni, logo: undefined };
    render(<ReportHeader nastaveni={noLogoNastaveni} revize={baseRevize} />);
    expect(screen.queryByAltText('Logo')).not.toBeInTheDocument();
  });

  it('should NOT render ICO/DIC rows when missing', () => {
    const minNastaveni = { ...fullNastaveni, firmaIco: '', firmaDic: undefined };
    render(<ReportHeader nastaveni={minNastaveni} revize={baseRevize} />);
    expect(screen.queryByText(/IČO:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/DIČ:/)).not.toBeInTheDocument();
  });

  it('should NOT render tel/email rows when missing', () => {
    const minNastaveni = { ...fullNastaveni, kontaktTelefon: undefined, kontaktEmail: undefined };
    render(<ReportHeader nastaveni={minNastaveni} revize={baseRevize} />);
    expect(screen.queryByText(/Tel:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/E-mail:/)).not.toBeInTheDocument();
  });

  it('should have report-header class on root', () => {
    const { container } = render(<ReportHeader nastaveni={fullNastaveni} revize={baseRevize} />);
    expect(container.querySelector('.report-header')).toBeInTheDocument();
  });
});
