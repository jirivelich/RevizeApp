/**
 * Test 4: Card component
 * Ověřuje renderování title, children a actions.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../../components/ui/Card';

describe('Card', () => {
  it('should render children content', () => {
    render(<Card>Obsah karty</Card>);
    expect(screen.getByText('Obsah karty')).toBeInTheDocument();
  });

  it('should render title when provided', () => {
    render(<Card title="Nadpis karty">Obsah</Card>);
    expect(screen.getByText('Nadpis karty')).toBeInTheDocument();
  });

  it('should not render header when no title or actions', () => {
    const { container } = render(<Card>Obsah</Card>);
    // No border-b header section
    const h2 = container.querySelector('h2');
    expect(h2).toBeNull();
  });

  it('should render actions when provided', () => {
    render(
      <Card title="Test" actions={<button>Akce</button>}>
        Obsah
      </Card>
    );
    expect(screen.getByText('Akce')).toBeInTheDocument();
  });

  it('should merge custom className', () => {
    const { container } = render(<Card className="my-custom">Obsah</Card>);
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain('my-custom');
    expect(card.className).toContain('bg-white');
  });

  it('should have default card styling', () => {
    const { container } = render(<Card>Obsah</Card>);
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain('rounded-xl');
    expect(card.className).toContain('shadow-sm');
    expect(card.className).toContain('border');
  });
});
