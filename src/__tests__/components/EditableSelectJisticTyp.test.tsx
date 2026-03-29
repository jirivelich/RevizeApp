/**
 * Test: EditableSelect – Typ jističe
 * 10 testů zaměřených na pole "Typ jištění" s options ['B','C','D','gG','aM','IT','IJ','IJV','ITM']
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditableSelect } from '../../pages/RevizeDetail/RozvadeceTab';

const jisticTypOptions = ['B', 'C', 'D', 'gG', 'aM', 'IT', 'IJ', 'IJV', 'ITM'];

describe('EditableSelect – Typ jističe', () => {
  it('1. zobrazí všech 9 typů jištění + volbu Vlastní hodnota', () => {
    render(<EditableSelect label="Typ jištění" value="B" onChange={vi.fn()} options={jisticTypOptions} />);
    const select = screen.getByRole('combobox');
    const opts = within(select).getAllByRole('option');
    // 9 typů + 1 "Vlastní hodnota..."
    expect(opts).toHaveLength(10);
    expect(opts.map(o => o.textContent)).toEqual([
      'B', 'C', 'D', 'gG', 'aM', 'IT', 'IJ', 'IJV', 'ITM', '✏️ Vlastní hodnota...',
    ]);
  });

  it('2. výchozí hodnota "B" je vybraná', () => {
    render(<EditableSelect label="Typ jištění" value="B" onChange={vi.fn()} options={jisticTypOptions} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('B');
  });

  it('3. přepnutí na "D" zavolá onChange s "D"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EditableSelect label="Typ jištění" value="B" onChange={onChange} options={jisticTypOptions} />);

    await user.selectOptions(screen.getByRole('combobox'), 'D');
    expect(onChange).toHaveBeenCalledWith('D');
  });

  it('4. přepnutí na "gG" (pojistka) zavolá onChange s "gG"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EditableSelect label="Typ jištění" value="B" onChange={onChange} options={jisticTypOptions} />);

    await user.selectOptions(screen.getByRole('combobox'), 'gG');
    expect(onChange).toHaveBeenCalledWith('gG');
  });

  it('5. přepnutí na "ITM" zavolá onChange s "ITM"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EditableSelect label="Typ jištění" value="B" onChange={onChange} options={jisticTypOptions} />);

    await user.selectOptions(screen.getByRole('combobox'), 'ITM');
    expect(onChange).toHaveBeenCalledWith('ITM');
  });

  it('6. výběr "Vlastní hodnota" přepne do custom režimu s inputem', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <EditableSelect label="Typ jištění" value="B" onChange={onChange} options={jisticTypOptions} />
    );

    await user.selectOptions(screen.getByRole('combobox'), '__custom__');
    expect(onChange).toHaveBeenCalledWith('');

    // Po rerenderu s prázdnou hodnotou – showCustom je true, zobrazí se input
    // Simulujeme rerender, ale protože '' není v options a isCustom je false (prázdný string),
    // musíme rerendrovat s vlastní hodnotou
    rerender(<EditableSelect label="Typ jištění" value="FU" onChange={onChange} options={jisticTypOptions} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('7. vlastní typ "FU" (pojistka) se zobrazí v inputu', () => {
    render(<EditableSelect label="Typ jištění" value="FU" onChange={vi.fn()} options={jisticTypOptions} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('FU');
  });

  it('8. vlastní typ – uživatel může psát libovolný text', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EditableSelect label="Typ jištění" value="F" onChange={onChange} options={jisticTypOptions} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'U');
    expect(onChange).toHaveBeenCalledWith('FU');
  });

  it('9. tlačítko ↩ vrátí zpět na select a zachová zadanou hodnotu', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EditableSelect label="Typ jištění" value="FU" onChange={onChange} options={jisticTypOptions} />);

    // Jsme v custom režimu
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    await user.click(screen.getByTitle('Zpět na seznam'));
    // Hodnota zůstane "FU", onChange není volán
    expect(onChange).not.toHaveBeenCalled();
  });

  it('10. po nastavení hodnoty zpět na platný typ se zobrazí select (ne input)', () => {
    const { rerender } = render(
      <EditableSelect label="Typ jištění" value="FU" onChange={vi.fn()} options={jisticTypOptions} />
    );
    // Custom režim – input
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    // Rerender s platným typem – useEffect přepne showCustom na false
    rerender(<EditableSelect label="Typ jištění" value="C" onChange={vi.fn()} options={jisticTypOptions} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('C');
  });
});
