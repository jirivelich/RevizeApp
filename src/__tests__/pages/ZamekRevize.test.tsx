import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { jeRevizeZamcena, useZamekDom } from '../../pages/RevizeDetail/ZamekRevize';

function Formular({ zamceno }: { zamceno: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useZamekDom(ref, zamceno);
  return (
    <div ref={ref}>
      <input aria-label="text" defaultValue="abc" />
      <textarea aria-label="popis" defaultValue="dlouhy text" />
      <input aria-label="zaskrtnuti" type="checkbox" />
      <select aria-label="vyber"><option>a</option></select>
      <button>Smazat</button>
    </div>
  );
}

describe('jeRevizeZamcena', () => {
  it('zamyká dokončené a schválené revize', () => {
    expect(jeRevizeZamcena('dokončeno')).toBe(true);
    expect(jeRevizeZamcena('schváleno')).toBe(true);
    expect(jeRevizeZamcena('rozpracováno')).toBe(false);
    expect(jeRevizeZamcena(undefined)).toBe(false);
  });
});

describe('useZamekDom', () => {
  it('textová pole jsou jen pro čtení (lze kopírovat), ostatní prvky zablokované', () => {
    render(<Formular zamceno />);
    expect((screen.getByLabelText('text') as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByLabelText('text') as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByLabelText('popis') as HTMLTextAreaElement).readOnly).toBe(true);
    expect((screen.getByLabelText('zaskrtnuti') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('vyber') as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Smazat' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('po odemknutí se vše vrátí do původního stavu', () => {
    const { rerender } = render(<Formular zamceno />);
    rerender(<Formular zamceno={false} />);
    expect((screen.getByLabelText('text') as HTMLInputElement).readOnly).toBe(false);
    expect((screen.getByLabelText('vyber') as HTMLSelectElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Smazat' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('nezamčený formulář zůstane beze změny', () => {
    render(<Formular zamceno={false} />);
    expect((screen.getByLabelText('text') as HTMLInputElement).readOnly).toBe(false);
    expect((screen.getByRole('button', { name: 'Smazat' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
