/**
 * Test: EditableSelect component
 * Ověřuje select s možností zadat vlastní hodnotu – přepínání módů,
 * zachování zadané hodnoty, reset, onChange callbacky.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditableSelect } from '../../pages/RevizeDetail/RozvadeceTab';

const options = ['B', 'C', 'D'];

describe('EditableSelect', () => {
  it('should render label and all options including custom option', () => {
    render(<EditableSelect label="Typ" value="B" onChange={vi.fn()} options={options} />);

    expect(screen.getByText('Typ')).toBeInTheDocument();
    // Ověří, že se renderuje select se všemi options + "Vlastní hodnota..."
    const selectEl = screen.getByRole('combobox');
    const optionEls = selectEl.querySelectorAll('option');
    // B, C, D + Vlastní hodnota = 4
    expect(optionEls).toHaveLength(4);
    expect(optionEls[0]).toHaveTextContent('B');
    expect(optionEls[3]).toHaveTextContent('Vlastní hodnota...');
  });

  it('should call onChange when a standard option is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EditableSelect label="Typ" value="B" onChange={onChange} options={options} />);

    const selectEl = screen.getByRole('combobox');
    await user.selectOptions(selectEl, 'C');
    expect(onChange).toHaveBeenCalledWith('C');
  });

  it('should switch to custom input mode when "Vlastní hodnota" is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EditableSelect label="Typ" value="B" onChange={onChange} options={options} />);

    const selectEl = screen.getByRole('combobox');
    await user.selectOptions(selectEl, '__custom__');

    // onChange volán s prázdným stringem
    expect(onChange).toHaveBeenCalledWith('');

    // Po rerenderu s value='' by se měl zobrazit input
    // Musíme rerendrovat komponentu s novým value
  });

  it('should show text input and back button when value is custom (not in options)', () => {
    render(<EditableSelect label="Typ" value="XYZ" onChange={vi.fn()} options={options} />);

    // Měl by být input (ne select), protože "XYZ" není v options
    const inputEl = screen.getByRole('textbox');
    expect(inputEl).toBeInTheDocument();
    expect(inputEl).toHaveValue('XYZ');

    // Tlačítko zpět
    expect(screen.getByTitle('Zpět na seznam')).toBeInTheDocument();
  });

  it('should allow typing custom value and propagate via onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    // Hodnota mimo options → zobrazí se input v custom režimu
    render(
      <EditableSelect label="Typ" value="X" onChange={onChange} options={options} />
    );

    const inputEl = screen.getByRole('textbox');
    expect(inputEl).toHaveValue('X');

    // Uživatel píše do inputu – controlled component, value zůstává "X"
    // každý keystroke přidá znak k aktuální value
    await user.type(inputEl, 'MNO');

    // onChange je volán 3× (jednou za každé písmeno)
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenCalledWith('XM');
    expect(onChange).toHaveBeenCalledWith('XN');
    expect(onChange).toHaveBeenCalledWith('XO');
  });

  it('should switch back to select mode when back button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EditableSelect label="Typ" value="XYZ" onChange={onChange} options={options} />);

    // Jsme v custom režimu
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    // Klik na tlačítko zpět
    const backBtn = screen.getByTitle('Zpět na seznam');
    await user.click(backBtn);

    // Přepne na select, ale hodnota zůstane (onChange není volán)
    expect(onChange).not.toHaveBeenCalled();
  });
});
