/**
 * Testy pro ReportSection – opakovatelný blok sekce v tiskové zprávě
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportSection } from '../../pages/ReportPrint/ReportSection';

describe('ReportSection', () => {
  it('should render title', () => {
    render(
      <ReportSection title="1. Provozovatel">
        <p>Obsah</p>
      </ReportSection>
    );
    expect(screen.getByText('1. Provozovatel')).toBeInTheDocument();
  });

  it('should render children content', () => {
    render(
      <ReportSection title="Test">
        <p>Dětský obsah</p>
      </ReportSection>
    );
    expect(screen.getByText('Dětský obsah')).toBeInTheDocument();
  });

  it('should have report-section class on root wrapper', () => {
    const { container } = render(
      <ReportSection title="Test">
        <div>Content</div>
      </ReportSection>
    );
    expect(container.querySelector('.report-section')).toBeInTheDocument();
  });

  it('should have report-section-title class on title element', () => {
    const { container } = render(
      <ReportSection title="Nadpis">
        <div>C</div>
      </ReportSection>
    );
    const titleEl = container.querySelector('.report-section-title');
    expect(titleEl).toBeInTheDocument();
    expect(titleEl?.textContent).toBe('Nadpis');
  });

  it('should have report-section-content class on content wrapper', () => {
    const { container } = render(
      <ReportSection title="T">
        <span>Obsah sekce</span>
      </ReportSection>
    );
    const contentEl = container.querySelector('.report-section-content');
    expect(contentEl).toBeInTheDocument();
    expect(contentEl?.textContent).toContain('Obsah sekce');
  });

  it('should render multiple children', () => {
    render(
      <ReportSection title="Multi">
        <p>První</p>
        <p>Druhý</p>
        <p>Třetí</p>
      </ReportSection>
    );
    expect(screen.getByText('První')).toBeInTheDocument();
    expect(screen.getByText('Druhý')).toBeInTheDocument();
    expect(screen.getByText('Třetí')).toBeInTheDocument();
  });

  it('should render complex nested children (table)', () => {
    render(
      <ReportSection title="Tabulka">
        <table>
          <tbody>
            <tr><td>Buňka 1</td><td>Buňka 2</td></tr>
          </tbody>
        </table>
      </ReportSection>
    );
    expect(screen.getByText('Buňka 1')).toBeInTheDocument();
    expect(screen.getByText('Buňka 2')).toBeInTheDocument();
  });

  it('should handle Czech characters in title', () => {
    render(
      <ReportSection title="č) Charakteristika revidovaného zařízení">
        <p>OK</p>
      </ReportSection>
    );
    expect(screen.getByText('č) Charakteristika revidovaného zařízení')).toBeInTheDocument();
  });
});
