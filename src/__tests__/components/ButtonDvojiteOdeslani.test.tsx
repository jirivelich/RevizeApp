/**
 * Button – ochrana proti dvojitému odeslání (dvojklik, pomalé ukládání).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Button } from '../../components/ui/Button';

afterEach(() => { vi.useRealTimers(); });

describe('Button – dvojité odeslání', () => {
  it('rychlý dvojklik spustí akci jen jednou', () => {
    const fn = vi.fn();
    render(<Button onClick={fn}>Uložit</Button>);
    const b = screen.getByRole('button');
    fireEvent.click(b);
    fireEvent.click(b);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('po pauze jde kliknout znovu', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    render(<Button onClick={fn}>+</Button>);
    const b = screen.getByRole('button');
    fireEvent.click(b);
    vi.advanceTimersByTime(700);
    fireEvent.click(b);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('během asynchronního ukládání je tlačítko zablokované', async () => {
    let dokoncit!: () => void;
    const fn = vi.fn(() => new Promise<void>(r => { dokoncit = r; }));
    render(<Button onClick={fn}>Přidat</Button>);
    const b = screen.getByRole('button');
    fireEvent.click(b);
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(b);
    expect(fn).toHaveBeenCalledTimes(1);
    await act(async () => { dokoncit(); });
    expect(b).not.toBeDisabled();
  });

  it('chyba při ukládání tlačítko zase uvolní', async () => {
    let selhat!: () => void;
    const fn = vi.fn(() => new Promise<void>((_, rej) => { selhat = () => rej(new Error('x')); }));
    render(<Button onClick={fn}>Uložit</Button>);
    const b = screen.getByRole('button');
    fireEvent.click(b);
    expect(b).toBeDisabled();
    await act(async () => { selhat(); });
    expect(b).not.toBeDisabled();
  });
});
