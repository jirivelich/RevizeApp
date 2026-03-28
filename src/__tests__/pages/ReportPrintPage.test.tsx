/**
 * Testy pro ReportPrintPage – hlavní stránka tiskové revizní zprávy
 *
 * Mockujeme:
 * - react-router (useParams, useNavigate)
 * - database services (revizeService, rozvadecService, ...)
 * - pagedjs (Previewer)
 * - wordExport
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ReportPrintPage } from '../../pages/ReportPrint/ReportPrintPage';
import type { Revize, Nastaveni, Zavada, MericiPristroj } from '../../types';

// ── Mocky ────────────────────────────────────────

// Mock react-router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => mockNavigate,
}));

// Mock pagedjs – Previewer se nevolá v jsdom (nemá layout)
vi.mock('pagedjs', () => ({
  Previewer: vi.fn().mockImplementation(() => ({
    preview: vi.fn().mockResolvedValue({ total: 3 }),
  })),
}));

// Mock wordExport
vi.mock('../../services/wordExport', () => ({
  exportElektroToWord: vi.fn().mockResolvedValue(undefined),
}));

// Mock database services
const mockRevize: Revize = {
  id: 1,
  cisloRevize: 'R-2026-001',
  nazev: 'Bytový dům Testovací',
  adresa: 'Testovací 123, Praha 1',
  objednatel: 'Jan Novák',
  zakaznikId: 10,
  kategorieRevize: 'elektro',
  datum: '2026-03-15',
  datumDokonceni: '2026-03-20',
  datumVypracovani: '2026-03-22',
  datumPlatnosti: '2029-03-15',
  termin: 36,
  typRevize: 'pravidelná',
  stav: 'dokončeno',
  vysledek: 'schopno',
  vysledekOduvodneni: 'Vše v pořádku',
  zaver: 'Zařízení je bezpečné.',
  rozsahRevize: 'Celý objekt',
  predmetNeni: 'Hromosvodová soustava',
  napetovaSoustava: '3+N+PE AC 50Hz 400/230V TN-C-S',
  ochranaOpatreni: JSON.stringify(['Automatické odpojení od zdroje', 'Ochranné pospojování']),
  popisZarizeni: 'Elektrická instalace bytového domu včetně rozváděčů a rozvodů.',
  podklady: 'Projektová dokumentace 2020',
  provedeneUkony: 'Prohlídka, měření izolačních odporů',
  vyhodnoceniPredchozich: 'Předchozí revize bez závad.',
  tiskSekce: JSON.stringify({}), // vše viditelné
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockNastaveni: Nastaveni = {
  firmaJmeno: 'ElektroRevize s.r.o.',
  firmaAdresa: 'Průmyslová 456, Brno',
  firmaIco: '12345678',
  firmaDic: 'CZ12345678',
  reviznniTechnikJmeno: 'Ing. Karel Svoboda',
  reviznniTechnikCisloOpravneni: 'E2A-1234/2020',
  reviznniTechnikOsvedceni: 'Osvědčení TIČR',
  kontaktTelefon: '+420 111 222 333',
  kontaktEmail: 'info@elektro.cz',
};

const mockZakaznik = {
  id: 10,
  nazev: 'Společenství vlastníků',
  adresa: 'Testovací 123, Praha 1',
  ico: '99887766',
  kontaktOsoba: 'Petr Vyskočil',
  telefon: '+420 999 888 777',
  email: 'svj@test.cz',
};

const mockRozvadece = [
  {
    id: 1,
    revizeId: 1,
    nazev: 'Hlavní rozvaděč',
    oznaceni: 'RE1',
    umisteni: '1.NP chodba',
    typRozvadece: 'hlavní',
    stupenKryti: 'IP40',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockOkruhy = [
  {
    id: 1,
    rozvadecId: 1,
    cislo: 1,
    nazev: 'Zásuvky kuchyně',
    jisticTyp: 'B',
    jisticProud: '16',
    pocetFazi: 1,
    vodic: 'CYKY 3x2.5',
    izolacniOdpor: 200,
    impedanceSmycky: 0.32,
    proudovyChranicMa: 30,
    casOdpojeni: 18,
  },
];

const mockZavady: Zavada[] = [
  {
    id: 1,
    revizeId: 1,
    popis: 'Poškozená izolace vodiče v rozvaděči',
    zavaznost: 'C1',
    stav: 'otevřená',
    fotky: [],
    datumZjisteni: new Date('2026-03-15'),
  },
];

const mockMistnosti = [
  {
    id: 1,
    revizeId: 1,
    nazev: 'Kuchyně',
    patro: '1.NP',
    typ: 'mokrý provoz',
    prostredi: 'AA5/AB5',
  },
];

const mockZarizeni = [
  {
    id: 1,
    mistnostId: 1,
    nazev: 'Elektrický sporák',
    oznaceni: 'SP-1',
    pocetKs: 1,
    trida: 'I' as const,
    prikonW: 3500,
    ochranaPredDotykem: '0.45 Ω',
    stav: 'OK' as const,
  },
];

const mockPristroje: MericiPristroj[] = [
  {
    id: 1,
    nazev: 'Fluke 1653',
    vyrobce: 'Fluke',
    model: '1653B',
    vyrobniCislo: 'SN12345',
    typPristroje: 'multimetr',
    datumKalibrace: '2026-01-01',
    platnostKalibrace: '2027-01-01',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

vi.mock('../../services/database', () => ({
  revizeService: {
    getById: vi.fn(),
  },
  rozvadecService: {
    getByRevize: vi.fn(),
  },
  okruhService: {
    getByRozvadec: vi.fn(),
  },
  zavadaService: {
    getByRevize: vi.fn(),
  },
  mistnostService: {
    getByRevize: vi.fn(),
  },
  zarizeniService: {
    getByMistnost: vi.fn(),
  },
  revizePristrojService: {
    getByRevize: vi.fn(),
  },
  nastaveniService: {
    get: vi.fn(),
  },
  zakazniciService: {
    getAll: vi.fn(),
  },
}));

import {
  revizeService,
  rozvadecService,
  okruhService,
  zavadaService,
  mistnostService,
  zarizeniService,
  revizePristrojService,
  nastaveniService,
  zakazniciService,
} from '../../services/database';

function setupMocksSuccess() {
  (revizeService.getById as Mock).mockResolvedValue(mockRevize);
  (rozvadecService.getByRevize as Mock).mockResolvedValue(mockRozvadece);
  (okruhService.getByRozvadec as Mock).mockResolvedValue(mockOkruhy);
  (zavadaService.getByRevize as Mock).mockResolvedValue(mockZavady);
  (mistnostService.getByRevize as Mock).mockResolvedValue(mockMistnosti);
  (zarizeniService.getByMistnost as Mock).mockResolvedValue(mockZarizeni);
  (revizePristrojService.getByRevize as Mock).mockResolvedValue(mockPristroje);
  (nastaveniService.get as Mock).mockResolvedValue(mockNastaveni);
  (zakazniciService.getAll as Mock).mockResolvedValue([mockZakaznik]);
}

// ── Testy ────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Mock URL.createObjectURL & revokeObjectURL for pagedjs CSS
  global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-css');
  global.URL.revokeObjectURL = vi.fn();
  // Mock window.print
  window.print = vi.fn();
});

describe('ReportPrintPage', () => {
  // ── Loading state ──

  it('should show loading message initially', () => {
    // Don't resolve the service call yet
    (revizeService.getById as Mock).mockReturnValue(new Promise(() => {}));
    render(<ReportPrintPage />);
    expect(screen.getByText('Načítání revizní zprávy...')).toBeInTheDocument();
  });

  // ── Error states ──

  it('should show error when revize not found', async () => {
    (revizeService.getById as Mock).mockResolvedValue(null);
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Revize nebyla nalezena')).toBeInTheDocument();
    });
  });

  it('should show error on service failure', async () => {
    (revizeService.getById as Mock).mockRejectedValue(new Error('DB connection failed'));
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('DB connection failed')).toBeInTheDocument();
    });
  });

  it('should show back button on error page', async () => {
    (revizeService.getById as Mock).mockResolvedValue(null);
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('← Zpět')).toBeInTheDocument();
    });
  });

  it('should navigate back when back button clicked on error', async () => {
    (revizeService.getById as Mock).mockResolvedValue(null);
    render(<ReportPrintPage />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('← Zpět'));
    });
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  // ── Successful render ──

  it('should render report title after data loads', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ')).toBeInTheDocument();
    });
  });

  it('should render normySoulad text above report title when provided', async () => {
    const revizeWithNormy = {
      ...mockRevize,
      normySoulad: 'Revize je provedená v souladu s ČSN 33 2000-6 ed. 2:2017, ČSN 33 1500:1991 + Z1 až Z4 nařízení vlády č. 190/2022 Sb.',
    };
    (revizeService.getById as Mock).mockResolvedValue(revizeWithNormy);
    (rozvadecService.getByRevize as Mock).mockResolvedValue(mockRozvadece);
    (okruhService.getByRozvadec as Mock).mockResolvedValue(mockOkruhy);
    (zavadaService.getByRevize as Mock).mockResolvedValue(mockZavady);
    (mistnostService.getByRevize as Mock).mockResolvedValue(mockMistnosti);
    (zarizeniService.getByMistnost as Mock).mockResolvedValue(mockZarizeni);
    (revizePristrojService.getByRevize as Mock).mockResolvedValue(mockPristroje);
    (nastaveniService.get as Mock).mockResolvedValue(mockNastaveni);
    (zakazniciService.getAll as Mock).mockResolvedValue([mockZakaznik]);

    render(<ReportPrintPage />);
    await waitFor(() => {
      const normyEl = screen.getByText(/Revize je provedená v souladu s ČSN 33 2000-6/);
      expect(normyEl).toBeInTheDocument();
      expect(normyEl).toHaveClass('report-normy-text');
    });
  });

  it('should render default normySoulad text when field is undefined', async () => {
    setupMocksSuccess(); // mockRevize nemá normySoulad
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ')).toBeInTheDocument();
    });
    // Výchozí text se zobrazí i bez explicitní hodnoty
    const normyEl = screen.getByText(/v souladu s ČSN/);
    expect(normyEl).toBeInTheDocument();
    expect(normyEl).toHaveClass('report-normy-text');
  });

  it('should render typ revize label', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      // 'pravidelná' → 'Pravidelná (periodická) revize'
      expect(screen.getAllByText('Pravidelná (periodická) revize').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render section 1. Provozovatel with zakaznik data', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('1. Provozovatel (objednatel) revidovaného zařízení')).toBeInTheDocument();
      expect(screen.getByText('Společenství vlastníků')).toBeInTheDocument();
    });
  });

  it('should render section 2. Identifikace', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('2. Identifikace revidovaného zařízení a místo umístění')).toBeInTheDocument();
      expect(screen.getByText('Bytový dům Testovací')).toBeInTheDocument();
    });
  });

  it('should render popisZarizeni on page 2 when provided', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Popis revidovaného zařízení:')).toBeInTheDocument();
      expect(screen.getByText('Elektrická instalace bytového domu včetně rozváděčů a rozvodů.')).toBeInTheDocument();
    });
  });

  it('should render section 8. Rozsah revize', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('8. Vymezení rozsahu revize')).toBeInTheDocument();
      expect(screen.getByText('Celý objekt')).toBeInTheDocument();
      expect(screen.getByText('Hromosvodová soustava')).toBeInTheDocument();
    });
  });

  it('should render section 3. Revizní technik', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('3. Údaje o revizním technikovi')).toBeInTheDocument();
      expect(screen.getAllByText('Ing. Karel Svoboda').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render section 7. Druh revize', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('7. Druh revize')).toBeInTheDocument();
    });
  });

  it('should render section 4. Důležitá data', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('4. Důležitá data')).toBeInTheDocument();
      expect(screen.getByText('36 měsíců')).toBeInTheDocument();
    });
  });

  it('should render Charakteristika with napetova soustava', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Charakteristika revidovaného zařízení')).toBeInTheDocument();
      expect(screen.getByText('3+N+PE AC 50Hz 400/230V TN-C-S')).toBeInTheDocument();
    });
  });

  it('should render ochrana opatreni list', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Automatické odpojení od zdroje')).toBeInTheDocument();
      expect(screen.getByText('Ochranné pospojování')).toBeInTheDocument();
    });
  });

  it('should render section 9. Měřicí přístroje', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('9. Soupis použitých měřicích přístrojů')).toBeInTheDocument();
      expect(screen.getByText('Fluke 1653')).toBeInTheDocument();
      expect(screen.getByText('SN12345')).toBeInTheDocument();
    });
  });

  it('should render section 10. Podklady', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('10. Seznam podkladů použitých k provedení revize')).toBeInTheDocument();
      expect(screen.getByText('Projektová dokumentace 2020')).toBeInTheDocument();
    });
  });

  it('should render section 11. Provedené úkony', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('11. Soupis provedených úkonů')).toBeInTheDocument();
      expect(screen.getByText('Prohlídka, měření izolačních odporů')).toBeInTheDocument();
    });
  });

  it('should render section 12. Rozvaděče a okruhy', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('12. Naměřené hodnoty – Rozvaděče a okruhy')).toBeInTheDocument();
      expect(screen.getByText(/Hlavní rozvaděč/)).toBeInTheDocument();
      expect(screen.getByText('Zásuvky kuchyně')).toBeInTheDocument();
    });
  });

  it('should render Místnosti a zařízení section', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Místnosti a zařízení')).toBeInTheDocument();
      expect(screen.getByText(/Kuchyně/)).toBeInTheDocument();
      expect(screen.getByText('Elektrický sporák')).toBeInTheDocument();
    });
  });

  it('should render section 13. Závady', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('13. Přehled zjištěných závad')).toBeInTheDocument();
      expect(screen.getByText('Poškozená izolace vodiče v rozvaděči')).toBeInTheDocument();
      expect(screen.getByText('C1 – Kritická')).toBeInTheDocument();
    });
  });

  it('should render section 14. Vyhodnocení předchozích revizí', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('14. Vyhodnocení předchozích revizí')).toBeInTheDocument();
      expect(screen.getByText('Předchozí revize bez závad.')).toBeInTheDocument();
    });
  });

  it('should render section 5. Vyhodnocení with "schopno"', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('5. Vyhodnocení')).toBeInTheDocument();
      expect(screen.getByText('SCHOPNO BEZPEČNÉHO PROVOZU')).toBeInTheDocument();
    });
  });

  it('should render oduvodneni and zaver in section 5.', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Vše v pořádku')).toBeInTheDocument();
      expect(screen.getByText('Zařízení je bezpečné.')).toBeInTheDocument();
    });
  });

  it('should render section 15. Lhůta příští revize', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('15. Doporučená lhůta provedení příští revize')).toBeInTheDocument();
    });
  });

  it('should render section 6. Podpisy', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('6. Potvrzení o předání zprávy')).toBeInTheDocument();
      expect(screen.getByText('Revizní technik:')).toBeInTheDocument();
      expect(screen.getByText('Objednatel / Provozovatel:')).toBeInTheDocument();
    });
  });

  // ── Toolbar ──

  it('should render toolbar with cislo revize', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      // Číslo revize se objevuje vícekrát (toolbar, string-set, header)
      expect(screen.getAllByText(/R-2026-001/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render back button in toolbar', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('← Zpět na revizi')).toBeInTheDocument();
    });
  });

  it('should navigate back when toolbar back button clicked', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('← Zpět na revizi'));
    });
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('should render Word export button', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Word')).toBeInTheDocument();
    });
  });

  it('should render Tisk / PDF button', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText(/Tisk/)).toBeInTheDocument();
    });
  });

  it('should call window.print when Tisk button clicked', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      fireEvent.click(screen.getByText(/Tisk/));
    });
    expect(window.print).toHaveBeenCalled();
  });

  // ── Výchozí revize ──

  it('should render "Výchozí revize" label for vychozi type', async () => {
    (revizeService.getById as Mock).mockResolvedValue({ ...mockRevize, typRevize: 'výchozí' });
    (rozvadecService.getByRevize as Mock).mockResolvedValue([]);
    (zavadaService.getByRevize as Mock).mockResolvedValue([]);
    (mistnostService.getByRevize as Mock).mockResolvedValue([]);
    (revizePristrojService.getByRevize as Mock).mockResolvedValue([]);
    (nastaveniService.get as Mock).mockResolvedValue(mockNastaveni);
    (zakazniciService.getAll as Mock).mockResolvedValue([mockZakaznik]);

    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Výchozí revize').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Neschopno provozu ──

  it('should render "NESCHOPNO" for neschopno vysledek', async () => {
    (revizeService.getById as Mock).mockResolvedValue({ ...mockRevize, vysledek: 'neschopno' });
    (rozvadecService.getByRevize as Mock).mockResolvedValue([]);
    (zavadaService.getByRevize as Mock).mockResolvedValue([]);
    (mistnostService.getByRevize as Mock).mockResolvedValue([]);
    (revizePristrojService.getByRevize as Mock).mockResolvedValue([]);
    (nastaveniService.get as Mock).mockResolvedValue(mockNastaveni);
    (zakazniciService.getAll as Mock).mockResolvedValue([]);

    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('NESCHOPNO BEZPEČNÉHO PROVOZU')).toBeInTheDocument();
    });
  });

  // ── Žádné závady ──

  it('should show "nebyly zjištěny žádné závady" when no zavady', async () => {
    (revizeService.getById as Mock).mockResolvedValue(mockRevize);
    (rozvadecService.getByRevize as Mock).mockResolvedValue([]);
    (zavadaService.getByRevize as Mock).mockResolvedValue([]);
    (mistnostService.getByRevize as Mock).mockResolvedValue([]);
    (revizePristrojService.getByRevize as Mock).mockResolvedValue([]);
    (nastaveniService.get as Mock).mockResolvedValue(mockNastaveni);
    (zakazniciService.getAll as Mock).mockResolvedValue([]);

    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText(/nebyly zjištěny žádné závady/i)).toBeInTheDocument();
    });
  });

  // ── Žádné rozvaděče ──

  it('should show "Žádné rozvaděče" when no rozvadece', async () => {
    (revizeService.getById as Mock).mockResolvedValue(mockRevize);
    (rozvadecService.getByRevize as Mock).mockResolvedValue([]);
    (zavadaService.getByRevize as Mock).mockResolvedValue(mockZavady);
    (mistnostService.getByRevize as Mock).mockResolvedValue([]);
    (revizePristrojService.getByRevize as Mock).mockResolvedValue([]);
    (nastaveniService.get as Mock).mockResolvedValue(mockNastaveni);
    (zakazniciService.getAll as Mock).mockResolvedValue([]);

    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Žádné rozvaděče')).toBeInTheDocument();
    });
  });

  // ── Žádné přístroje ──

  it('should show "Žádné přístroje nebyly přiřazeny" when no pristroje', async () => {
    (revizeService.getById as Mock).mockResolvedValue(mockRevize);
    (rozvadecService.getByRevize as Mock).mockResolvedValue([]);
    (zavadaService.getByRevize as Mock).mockResolvedValue([]);
    (mistnostService.getByRevize as Mock).mockResolvedValue([]);
    (revizePristrojService.getByRevize as Mock).mockResolvedValue([]);
    (nastaveniService.get as Mock).mockResolvedValue(mockNastaveni);
    (zakazniciService.getAll as Mock).mockResolvedValue([]);

    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Žádné přístroje nebyly přiřazeny')).toBeInTheDocument();
    });
  });

  // ── tiskSekce visibility ──

  it('should hide section when tiskSekce disables it', async () => {
    const revizeHidden = {
      ...mockRevize,
      tiskSekce: JSON.stringify({ rozsahRevize: false, podklady: false }),
    };
    (revizeService.getById as Mock).mockResolvedValue(revizeHidden);
    (rozvadecService.getByRevize as Mock).mockResolvedValue([]);
    (zavadaService.getByRevize as Mock).mockResolvedValue([]);
    (mistnostService.getByRevize as Mock).mockResolvedValue([]);
    (revizePristrojService.getByRevize as Mock).mockResolvedValue([]);
    (nastaveniService.get as Mock).mockResolvedValue(mockNastaveni);
    (zakazniciService.getAll as Mock).mockResolvedValue([]);

    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ')).toBeInTheDocument();
    });
    // tyto sekce by neměly být viditelné
    expect(screen.queryByText('8. Vymezení rozsahu revize')).not.toBeInTheDocument();
    expect(screen.queryByText('10. Seznam podkladů použitých k provedení revize')).not.toBeInTheDocument();
  });

  // ── Mimořádná revize ──

  it('should render mimořádná revize label with důvod', async () => {
    (revizeService.getById as Mock).mockResolvedValue({
      ...mockRevize,
      typRevize: 'mimořádná',
      duvodMimoradne: 'Požár v budově',
    });
    (rozvadecService.getByRevize as Mock).mockResolvedValue([]);
    (zavadaService.getByRevize as Mock).mockResolvedValue([]);
    (mistnostService.getByRevize as Mock).mockResolvedValue([]);
    (revizePristrojService.getByRevize as Mock).mockResolvedValue([]);
    (nastaveniService.get as Mock).mockResolvedValue(mockNastaveni);
    (zakazniciService.getAll as Mock).mockResolvedValue([]);

    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Mimořádná revize – Požár v budově/).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── String-set prvky ──

  it('should render string-set elements for pagedjs running headers', async () => {
    setupMocksSuccess();
    const { container } = render(<ReportPrintPage />);
    await waitFor(() => {
      const numberEl = container.querySelector('.report-string-number');
      expect(numberEl).toBeInTheDocument();
      expect(numberEl?.textContent).toContain('R-2026-001');

      const titleEl = container.querySelector('.report-string-title');
      expect(titleEl).toBeInTheDocument();
      expect(titleEl?.textContent).toContain('Bytový dům Testovací');

      const firmaEl = container.querySelector('.report-string-firma');
      expect(firmaEl).toBeInTheDocument();
      expect(firmaEl?.textContent).toContain('ElektroRevize s.r.o.');
    });
  });

  // ── Data loading calls ──

  it('should call all required services on load', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(revizeService.getById).toHaveBeenCalledWith(1);
      expect(rozvadecService.getByRevize).toHaveBeenCalledWith(1);
      expect(zavadaService.getByRevize).toHaveBeenCalledWith(1);
      expect(mistnostService.getByRevize).toHaveBeenCalledWith(1);
      expect(revizePristrojService.getByRevize).toHaveBeenCalledWith(1);
      expect(nastaveniService.get).toHaveBeenCalled();
    });
  });

  it('should fetch zakaznik when zakaznikId is set', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(zakazniciService.getAll).toHaveBeenCalled();
    });
  });

  it('should fetch okruhy for each rozvadec', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(okruhService.getByRozvadec).toHaveBeenCalledWith(1);
    });
  });

  it('should fetch zarizeni for each mistnost', async () => {
    setupMocksSuccess();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(zarizeniService.getByMistnost).toHaveBeenCalledWith(1);
    });
  });

  it('should render page 1 sections before page break and popisZarizeni after', async () => {
    setupMocksSuccess();
    const { container } = render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('1. Provozovatel (objednatel) revidovaného zařízení')).toBeInTheDocument();
    });

    const pageBreak = container.querySelector('.report-page-break');
    expect(pageBreak).toBeTruthy();

    // Sekce, které MUSÍ být na straně 1 (tj. před page breakem)
    const page1Titles = [
      '1. Provozovatel (objednatel) revidovaného zařízení',
      '2. Identifikace revidovaného zařízení a místo umístění',
      '3. Údaje o revizním technikovi',
      '4. Důležitá data',
      '5. Vyhodnocení',
      '6. Potvrzení o předání zprávy',
      '7. Druh revize',
    ];

    for (const title of page1Titles) {
      const el = screen.getByText(title);
      // Element musí existovat před page breakem v DOM pořadí
      const position = el.compareDocumentPosition(pageBreak!);
      // Bit 4 = DOCUMENT_POSITION_FOLLOWING → pageBreak následuje po elementu
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    // Popis revidovaného zařízení NESMÍ být na straně 1 (musí být až za page breakem)
    const popisEl = screen.getByText('Popis revidovaného zařízení:');
    const popisPosition = popisEl.compareDocumentPosition(pageBreak!);
    // Bit 2 = DOCUMENT_POSITION_PRECEDING → pageBreak předchází popisEl
    expect(popisPosition & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });
});
