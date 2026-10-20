import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Faktura } from '../../types';

const faktury: Faktura[] = [
  {
    id: 1, cisloFaktury: '20260001', odberatelNazev: 'Novák s.r.o.', datumVystaveni: '2026-03-01',
    datumSplatnosti: '2026-03-15', formaUhrady: 'prevod', stav: 'vystavena', celkem: 1500,
    createdAt: '', updatedAt: '',
  },
  {
    id: 2, odberatelNazev: 'Svoboda', formaUhrady: 'prevod', stav: 'koncept', celkem: 200,
    createdAt: '', updatedAt: '',
  },
];

const mutateAsync = vi.fn();

vi.mock('../../hooks/useQueries', () => ({
  useFaktury: () => ({ data: faktury, isLoading: false }),
  useDeleteFaktura: () => ({ mutateAsync: vi.fn() }),
  useZmenStavFaktury: () => ({ mutateAsync }),
  useFaktura: () => ({ data: undefined, isLoading: false }),
  useCreateFaktura: () => ({ mutateAsync: vi.fn() }),
  useUpdateFaktura: () => ({ mutateAsync: vi.fn() }),
  useZakaznici: () => ({ data: [] }),
  useCenik: () => ({ data: [{ id: 1, nazev: 'Revize EI', jednotka: 'ks', cena: 2500, aktivni: true }] }),
  useNastaveni: () => ({ data: { splatnostDni: 14 } }),
}));

import FakturyPage from '../../pages/FakturyPage';
import FakturaForm from '../../pages/FakturaForm';

describe('FakturyPage', () => {
  beforeEach(() => { mutateAsync.mockReset(); });

  it('vykreslí seznam faktur se stavy', () => {
    render(<MemoryRouter><FakturyPage /></MemoryRouter>);
    expect(screen.getByText('Novák s.r.o.')).toBeTruthy();
    expect(screen.getByText('20260001')).toBeTruthy();
    expect(screen.getAllByText('Vystavená').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Koncept').length).toBeGreaterThan(1);
    expect(screen.getByText(/1\s?500,00\s*Kč/)).toBeTruthy();
  });

  it('zobrazí srozumitelnou chybu při selhání změny stavu', async () => {
    mutateAsync.mockImplementation(async () => { throw new Error('x'); });
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<MemoryRouter><FakturyPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Zaplacena' }));
    expect((await screen.findByRole('alert')).textContent).toContain('připojení k internetu');
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });
});

describe('FakturaForm', () => {
  it('počítá součet položek automaticky', async () => {
    render(
      <MemoryRouter initialEntries={['/faktury/nova']}>
        <Routes><Route path="/faktury/nova" element={<FakturaForm />} /></Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Množství 1'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Cena za jednotku 1'), { target: { value: '1250,50' } });
    fireEvent.click(screen.getByText('+ Přidat položku'));
    fireEvent.change(screen.getByLabelText('Cena za jednotku 2'), { target: { value: '100' } });
    const celkem = await screen.findByTestId('celkem');
    expect(celkem.textContent).toMatch(/2\s?601,00\s*Kč/);
  });
});
