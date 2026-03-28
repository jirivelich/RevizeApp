/**
 * Test 3: Select component
 * Ověřuje renderování options, label, error stav.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '../../components/ui/Select';

const testOptions = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];

describe('Select', () => {
  it('should render all options', () => {
    render(<Select options={testOptions} />);
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('Option C')).toBeInTheDocument();
  });

  it('should render label when provided', () => {
    render(<Select options={testOptions} label="Vyberte typ" />);
    expect(screen.getByText('Vyberte typ')).toBeInTheDocument();
  });

  it('should show error message', () => {
    render(<Select options={testOptions} error="Povinné pole" />);
    expect(screen.getByText('Povinné pole')).toBeInTheDocument();
  });

  it('should apply error border class', () => {
    render(<Select options={testOptions} error="Chyba" data-testid="sel" />);
    const select = screen.getByTestId('sel');
    expect(select.className).toContain('border-red-500');
  });

  it('should call onChange when selection changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select options={testOptions} onChange={onChange} data-testid="sel" />);
    await user.selectOptions(screen.getByTestId('sel'), 'b');
    expect(onChange).toHaveBeenCalled();
  });

  it('should render correct number of option elements', () => {
    const { container } = render(<Select options={testOptions} />);
    const optionElements = container.querySelectorAll('option');
    expect(optionElements).toHaveLength(3);
  });

  it('should have correct values on options', () => {
    const { container } = render(<Select options={testOptions} />);
    const optionElements = container.querySelectorAll('option');
    expect(optionElements[0]).toHaveValue('a');
    expect(optionElements[1]).toHaveValue('b');
    expect(optionElements[2]).toHaveValue('c');
  });
});
