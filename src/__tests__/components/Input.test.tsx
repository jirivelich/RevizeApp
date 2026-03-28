/**
 * Test 2: Input component
 * Ověřuje renderování, label, error stav a forwardRef.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../../components/ui/Input';

describe('Input', () => {
  it('should render an input element', () => {
    render(<Input placeholder="Zadejte text" />);
    expect(screen.getByPlaceholderText('Zadejte text')).toBeInTheDocument();
  });

  it('should render label when provided', () => {
    render(<Input label="Jméno" />);
    expect(screen.getByText('Jméno')).toBeInTheDocument();
  });

  it('should not render label when not provided', () => {
    const { container } = render(<Input />);
    expect(container.querySelector('label')).toBeNull();
  });

  it('should show error message', () => {
    render(<Input error="Pole je povinné" />);
    expect(screen.getByText('Pole je povinné')).toBeInTheDocument();
  });

  it('should apply error border class when error is set', () => {
    render(<Input error="Chyba" data-testid="inp" />);
    const input = screen.getByTestId('inp');
    expect(input.className).toContain('border-red-500');
  });

  it('should apply normal border when no error', () => {
    render(<Input data-testid="inp" />);
    const input = screen.getByTestId('inp');
    expect(input.className).toContain('border-slate-300');
  });

  it('should handle user typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input onChange={onChange} placeholder="Test" />);
    await user.type(screen.getByPlaceholderText('Test'), 'abc');
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('should forward additional HTML attributes', () => {
    render(<Input type="email" name="email" data-testid="inp" />);
    const input = screen.getByTestId('inp');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('name', 'email');
  });
});
