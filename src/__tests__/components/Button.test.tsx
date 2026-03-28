/**
 * Test 1: Button component
 * Ověřuje renderování, varianty, velikosti a disabled stav.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../components/ui/Button';

describe('Button', () => {
  it('should render children text', () => {
    render(<Button>Klikni</Button>);
    expect(screen.getByText('Klikni')).toBeInTheDocument();
  });

  it('should default to type="button"', () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('should apply primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-slate-800');
  });

  it('should apply danger variant classes', () => {
    render(<Button variant="danger">Smazat</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-red-500');
  });

  it('should apply success variant classes', () => {
    render(<Button variant="success">Uložit</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-emerald-600');
  });

  it('should apply size sm classes', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-sm');
  });

  it('should apply size lg classes', () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-lg');
  });

  it('should be disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(<Button onClick={() => { clicked = true; }}>Click</Button>);
    await user.click(screen.getByRole('button'));
    expect(clicked).toBe(true);
  });

  it('should merge custom className', () => {
    render(<Button className="my-extra">Test</Button>);
    expect(screen.getByRole('button').className).toContain('my-extra');
  });
});
