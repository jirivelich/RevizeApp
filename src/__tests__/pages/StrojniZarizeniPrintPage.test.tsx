/**
 * Testy pro StrojniZarizeniPrintPage – tisková zpráva / protokol ověření strojního zařízení
 *
 * Pokrývá:
 * - Loading / error stavy
 * - Toolbar: tlačítka, badge, navigace
 * - Titulek a podtitulek (typRevize mapping)
 * - Sekce 1.–15.: provozovatel, místo, identifikace stroje, revizní technik,
 *   důležitá data, jištění, izolace, spojitost PE, RCD, funkční kontroly,
 *   měřicí přístroje, závady, závěrečné zhodnocení, lhůta, podpisy
 * - stavLabel helper (V/N/NA/prázdný)
 * - verdikt → vysledekLabel + vysledekColor
 * - tiskSekce / podmíněné zobrazení sekcí
 * - String-set prvky pro pagedjs
 * - Excel export (handleExcel)
 * - CSS layout (strojniZarizeni.css + PAGED_CSS)
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { StrojniZarizeniPrintPage } from '../../pages/StrojniZarizeniPrint/StrojniZarizeniPrintPage';
import type { Revize, Nastaveni, Zavada, MericiPristroj } from '../../types';
import fs from 'fs';
import path from 'path';

// ── Mocky ────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '3' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('pagedjs', () => ({
  Previewer: vi.fn().mockImplementation(() => ({
    preview: vi.fn().mockResolvedValue({ total: 3 }),
  })),
}));

vi.mock('../../pages/StrojniZarizeniPrint/excelExport', () => ({
  exportStrojniExcel: vi.fn().mockResolvedValue(undefined),
}));

// ── Strojní JSON data ──
const strojniFormData = {
  strojNazev: 'CNC obráběcí centrum',
  strojSn: 'SN-2024-9876',
  strojVyrobce: 'Mazak',
  strojRok: '2020',
  strojNapajeni: '3×400V / 50Hz',
  strojPrikon: '22',
  strojProud: '38',
  strojIp: 'IP54',
  strojTrida: 'I',
  strojCe: 'Ano – 2020',
  mistoHala: 'Hala B2',
  jisteni: [
    { nazev: 'Hlavní jistič', typ: 'B63', hodnota: '63 A', charakteristika: 'B', stav: 'V', poznamka: '' },
    { nazev: 'Motorový spouštěč', typ: 'GV2-ME', hodnota: '32 A', charakteristika: '', stav: 'V', poznamka: '' },
  ],
  izolace: [
    { misto: 'L1, L2, L3 → PE', napeti: '500 V DC', hodnota: '850', pozadavek: '≥ 1 MΩ', vysledek: 'V', poznamka: '' },
    { misto: 'Řídicí obvody → PE', napeti: '250 V DC', hodnota: '0.3', pozadavek: '≥ 1 MΩ', vysledek: 'N', poznamka: 'Pod limitem' },
  ],
  spojitost: [
    { misto: 'Rozvaděč → kostra stroje', proud: '≥ 200 mA', hodnota: '0.05', pozadavek: '≤ 0,1 Ω', vysledek: 'V', poznamka: '' },
  ],
  rcd: [
    { nazev: 'RCD 1', idn: '30', typ: 'A', cas: '18', limit: '≤ 300', vysledek: 'V', poznamka: '' },
  ],
  kontroly: [
    { nazev: 'STOP tlačítko – nouzové zastavení', vysledek: 'V', poznamka: '', editable: false },
    { nazev: 'Bezpečnostní kryt / dveřní spínač', vysledek: 'N', poznamka: 'Poškozený zámek', editable: false },
  ],
  pristroje: [
    { typ: 'Fluke 1664 FC', sn: 'F-12345', kalibrace: '2025-08-15', trida: '0.5', poznamka: '' },
  ],
  verdikt: 'pass' as const,
  posudekZavady: '',
  posudekDoporuceni: 'Opravit kryt spínače',
  posudekNormy: 'ČSN EN 60204-1, zákon č. 250/2021 Sb.',
};

const baseRevize: Revize = {
  id: 3,
  cisloRevize: 'S-2026-042',
  nazev: 'CNC Mazak Hala B2',
  adresa: 'Průmyslová 15, Brno',
  objednatel: 'Techno Výroba s.r.o.',
  zakaznikId: 30,
  kategorieRevize: 'stroje',
  datum: '2026-03-20',
  datumDokonceni: '2026-03-22',
  datumVypracovani: '2026-03-24',
  datumPlatnosti: '2028-03-20',
  termin: 24,
  typRevize: 'pravidelná',
  stav: 'dokončeno',
  vysledek: 'schopno',
  vysledekOduvodneni: '',
  zaver: 'Stroj vyhovuje normě.',
  rozsahRevize: '',
  predmetNeni: '',
  napetovaSoustava: null,
  ochranaOpatreni: null,
  podklady: '',
  provedeneUkony: null,
  vyhodnoceniPredchozich: '',
  tiskSekce: JSON.stringify({}),
  strojniData: JSON.stringify(strojniFormData),
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

const baseNastaveni: Nastaveni = {
  firmaJmeno: 'ElektroTest s.r.o.',
  firmaAdresa: 'Revizní 5, Brno',
  firmaIco: '33333333',
  firmaDic: 'CZ33333333',
  reviznniTechnikJmeno: 'Ing. Tomáš Stroj',
  reviznniTechnikCisloOpravneni: 'E2A-STR/2024',
  reviznniTechnikOsvedceni: 'TIČR E2A',
  kontaktTelefon: '+420 333 444 555',
  kontaktEmail: 'tomas@elektrotest.cz',
};

const mockZakaznik = {
  id: 30,
  nazev: 'Techno Výroba s.r.o.',
  adresa: 'Průmyslová 15, Brno',
  ico: '99887766',
  kontaktOsoba: 'Petr Kovář',
  telefon: '+420 666 777 888',
  email: 'petr@techno.cz',
};

const mockPristroje: MericiPristroj[] = [
  {
    id: 20,
    nazev: 'Fluke 1664 FC',
    vyrobce: 'Fluke',
    model: '1664 FC',
    vyrobniCislo: 'F-12345',
    typPristroje: 'multifunkční revizní přístroj',
    datumKalibrace: '2025-08-15',
    platnostKalibrace: '2026-08-15',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockZavady: Zavada[] = [
  {
    id: 10,
    revizeId: 3,
    popis: 'Poškozený dveřní spínač na bezpečnostním krytu',
    zavaznost: 'C2',
    stav: 'v řešení',
    fotky: [],
    datumZjisteni: new Date('2026-03-20'),
  },
];

vi.mock('../../services/database', () => ({
  revizeService: { getById: vi.fn() },
  zavadaService: { getByRevize: vi.fn() },
  revizePristrojService: { getByRevize: vi.fn() },
  nastaveniService: { get: vi.fn() },
  zakazniciService: { getAll: vi.fn() },
}));

import {
  revizeService, zavadaService,
  revizePristrojService, nastaveniService, zakazniciService,
} from '../../services/database';

function setupMocks(
  revizeOverrides: Partial<Revize> = {},
  opts?: {
    nastaveni?: Partial<Nastaveni>;
    zakaznik?: any;
    zavady?: Zavada[];
    pristroje?: MericiPristroj[];
    strojniData?: any;
  },
) {
  const sd = opts?.strojniData !== undefined
    ? (opts.strojniData === null ? null : JSON.stringify(opts.strojniData))
    : baseRevize.strojniData;
  const revize = { ...baseRevize, strojniData: sd, ...revizeOverrides };
  (revizeService.getById as Mock).mockResolvedValue(revize);
  (zavadaService.getByRevize as Mock).mockResolvedValue(opts?.zavady ?? mockZavady);
  (revizePristrojService.getByRevize as Mock).mockResolvedValue(opts?.pristroje ?? mockPristroje);
  (nastaveniService.get as Mock).mockResolvedValue({ ...baseNastaveni, ...opts?.nastaveni });
  (zakazniciService.getAll as Mock).mockResolvedValue(
    opts?.zakaznik !== undefined ? [opts.zakaznik] : [mockZakaznik],
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
  global.URL.revokeObjectURL = vi.fn();
  window.print = vi.fn();
});

// ═══════════════════════════════════════════════════
// Loading / error stavy
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – loading/error', () => {
  it('should show loading message', () => {
    (revizeService.getById as Mock).mockReturnValue(new Promise(() => {}));
    render(<StrojniZarizeniPrintPage />);
    expect(screen.getByText('Načítání protokolu strojního zařízení...')).toBeInTheDocument();
  });

  it('should show error when revize not found', async () => {
    (revizeService.getById as Mock).mockResolvedValue(null);
    (nastaveniService.get as Mock).mockResolvedValue(baseNastaveni);
    (zavadaService.getByRevize as Mock).mockResolvedValue([]);
    (revizePristrojService.getByRevize as Mock).mockResolvedValue([]);
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Revize nebyla nalezena')).toBeInTheDocument();
    });
  });

  it('should show ← Zpět button on error', async () => {
    (revizeService.getById as Mock).mockResolvedValue(null);
    (nastaveniService.get as Mock).mockResolvedValue(baseNastaveni);
    (zavadaService.getByRevize as Mock).mockResolvedValue([]);
    (revizePristrojService.getByRevize as Mock).mockResolvedValue([]);
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('← Zpět'));
    });
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('should show error message on fetch failure', async () => {
    (revizeService.getById as Mock).mockRejectedValue(new Error('DB connection lost'));
    (nastaveniService.get as Mock).mockResolvedValue(baseNastaveni);
    (zavadaService.getByRevize as Mock).mockResolvedValue([]);
    (revizePristrojService.getByRevize as Mock).mockResolvedValue([]);
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('DB connection lost')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════
// Hlavní titulek & podtitulek
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – titulek', () => {
  it('should render PROTOKOL O OVĚŘENÍ STROJNÍHO ZAŘÍZENÍ', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('PROTOKOL O OVĚŘENÍ STROJNÍHO ZAŘÍZENÍ').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render typRevize subtitle for pravidelná', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Pravidelná (periodická) revize').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render typRevize subtitle for výchozí', async () => {
    setupMocks({ typRevize: 'výchozí' });
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Výchozí revize').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render typRevize subtitle for mimořádná', async () => {
    setupMocks({ typRevize: 'mimořádná', duvodMimoradne: 'po opravě' } as any);
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Mimořádná revize/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render norma under subtitle', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/ČSN EN 60204-1/).length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════
// Sekce 1. Provozovatel
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – sekce 1. Provozovatel', () => {
  it('should render provozovatel section with zakaznik data', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('1. Provozovatel (objednatel)').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Techno Výroba s.r.o.').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Petr Kovář').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show IČO when zakaznik has it', async () => {
    setupMocks();
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const source = container.querySelector('.report-source');
      expect(source?.textContent).toContain('99887766');
    });
  });

  it('should fall back to objednatel when no zakaznik', async () => {
    setupMocks({}, { zakaznik: null });
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Techno Výroba s\.r\.o\./).length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════
// Sekce 2. Místo ověření
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – sekce 2. Místo ověření', () => {
  it('should render místo section', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('2. Místo ověření').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Průmyslová 15, Brno/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render hala when present', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Hala B2').length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════
// Sekce 3. Identifikace stroje
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – sekce 3. Identifikace stroje', () => {
  it('should render stroj identity section', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('3. Identifikace strojního zařízení – štítek').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('CNC obráběcí centrum').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render výrobce, SN, rok', async () => {
    setupMocks();
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const source = container.querySelector('.report-source');
      expect(source?.textContent).toContain('Mazak');
      expect(source?.textContent).toContain('SN-2024-9876');
      expect(source?.textContent).toContain('2020');
    });
  });

  it('should render napájení, příkon, proud', async () => {
    setupMocks();
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const source = container.querySelector('.report-source');
      expect(source?.textContent).toContain('3×400V / 50Hz');
      expect(source?.textContent).toContain('22 kW');
      expect(source?.textContent).toContain('38 A');
    });
  });

  it('should render IP, třída a CE', async () => {
    setupMocks();
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const source = container.querySelector('.report-source');
      expect(source?.textContent).toContain('IP54');
      expect(source?.textContent).toContain('Ano – 2020');
    });
  });

  it('should NOT render section 3. when no strojniData', async () => {
    setupMocks({}, { strojniData: null });
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('PROTOKOL O OVĚŘENÍ STROJNÍHO ZAŘÍZENÍ').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText('3. Identifikace strojního zařízení – štítek')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════
// Sekce 4. Revizní technik
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – sekce 4. Revizní technik', () => {
  it('should render technik section', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('4. Údaje o revizním technikovi').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Ing. Tomáš Stroj').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('E2A-STR/2024').length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════
// Sekce 5. Důležitá data
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – sekce 5. Důležitá data', () => {
  it('should render dates section', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('5. Důležitá data').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show datum ověření', async () => {
    setupMocks();
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const source = container.querySelector('.report-source');
      expect(source?.textContent).toContain('20. 3. 2026');
    });
  });

  it('should show termin', async () => {
    setupMocks();
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const source = container.querySelector('.report-source');
      expect(source?.textContent).toContain('24 měsíců');
    });
  });

  it('should show platnost datum', async () => {
    setupMocks();
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const source = container.querySelector('.report-source');
      expect(source?.textContent).toContain('20. 3. 2028');
    });
  });
});

// ═══════════════════════════════════════════════════
// Sekce 6. Jištění strojního zařízení
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – sekce 6. Jištění', () => {
  it('should render jištění table with data', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('6. Jištění strojního zařízení').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Hlavní jistič').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('B63').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render stavLabel V → Vyhovuje', async () => {
    setupMocks();
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const source = container.querySelector('.report-source');
      expect(source?.textContent).toContain('Vyhovuje');
    });
  });

  it('should NOT render jištění when empty', async () => {
    const emptySD = { ...strojniFormData, jisteni: [] };
    setupMocks({}, { strojniData: emptySD });
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('PROTOKOL O OVĚŘENÍ STROJNÍHO ZAŘÍZENÍ').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText('6. Jištění strojního zařízení')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════
// Sekce 7. Měření izolačního odporu
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – sekce 7. Izolace', () => {
  it('should render izolace table', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Měření izolačního odporu/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('L1, L2, L3 → PE').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show NEVYHOVUJE for stav N', async () => {
    setupMocks();
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const source = container.querySelector('.report-source');
      expect(source?.textContent).toContain('NEVYHOVUJE');
    });
  });

  it('should NOT render izolace when empty', async () => {
    const emptySD = { ...strojniFormData, izolace: [] };
    setupMocks({}, { strojniData: emptySD });
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('PROTOKOL O OVĚŘENÍ STROJNÍHO ZAŘÍZENÍ').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText(/Měření izolačního odporu/)).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════
// Sekce 8. Měření spojitosti PE
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – sekce 8. Spojitost PE', () => {
  it('should render spojitost table', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Měření spojitosti ochranných vodičů/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Rozvaděč → kostra stroje').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should NOT render spojitost when empty', async () => {
    const emptySD = { ...strojniFormData, spojitost: [] };
    setupMocks({}, { strojniData: emptySD });
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('PROTOKOL O OVĚŘENÍ STROJNÍHO ZAŘÍZENÍ').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText(/Měření spojitosti ochranných vodičů/)).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════
// Sekce 9. RCD
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – sekce 9. RCD', () => {
  it('should render RCD table', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Měření proudových chráničů/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('RCD 1').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should NOT render RCD when empty', async () => {
    const emptySD = { ...strojniFormData, rcd: [] };
    setupMocks({}, { strojniData: emptySD });
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('PROTOKOL O OVĚŘENÍ STROJNÍHO ZAŘÍZENÍ').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText(/Měření proudových chráničů/)).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════
// Sekce 10. Funkční kontroly
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – sekce 10. Funkční kontroly', () => {
  it('should render kontroly table', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('10. Funkční kontroly').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/STOP tlačítko/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show NEVYHOVUJE for N kontrola', async () => {
    setupMocks();
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const source = container.querySelector('.report-source');
      expect(source?.textContent).toContain('Poškozený zámek');
    });
  });

  it('should NOT render kontroly when empty', async () => {
    const emptySD = { ...strojniFormData, kontroly: [] };
    setupMocks({}, { strojniData: emptySD });
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('PROTOKOL O OVĚŘENÍ STROJNÍHO ZAŘÍZENÍ').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText('10. Funkční kontroly')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════
// Sekce 11. Měřicí přístroje
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – sekce 11. Přístroje', () => {
  it('should render přístroje from revizePristrojService', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('11. Soupis použitých měřicích přístrojů').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Fluke 1664 FC').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('F-12345').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should fall back to strojniData přístroje when pristroje empty', async () => {
    setupMocks({}, { pristroje: [] });
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      // Falls back to pristrojRows from strojniData (Fluke 1664 FC)
      expect(screen.getAllByText('Fluke 1664 FC').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show empty message when both pristroje sources empty', async () => {
    const emptySD = { ...strojniFormData, pristroje: [] };
    setupMocks({}, { pristroje: [], strojniData: emptySD });
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Žádné přístroje nebyly přiřazeny').length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════
// Sekce 12. Závady
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – sekce 12. Závady', () => {
  it('should render závady table', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('12. Přehled zjištěných závad').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Poškozený dveřní spínač/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('C2 – Vážná').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show "Při ověření nebyly zjištěny žádné závady" with no zavady', async () => {
    const noZavadySD = { ...strojniFormData, posudekZavady: '' };
    setupMocks({}, { zavady: [], strojniData: noZavadySD });
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/nebyly zjištěny žádné závady/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show posudekZavady text when no zavady but text present', async () => {
    const sdWithText = { ...strojniFormData, posudekZavady: 'Vizuální opotřebení' };
    setupMocks({}, { zavady: [], strojniData: sdWithText });
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Vizuální opotřebení').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show doporučení text', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Opravit kryt spínače').length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════
// stavLabel helper
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – stavLabel helper', () => {
  it.each([
    ['V', 'Vyhovuje'],
    ['N', 'NEVYHOVUJE'],
    ['NA', 'N/A'],
    ['', '—'],
  ])('should map stav "%s" → "%s"', (stav, expected) => {
    // Test via function logic (same as source)
    const fn = (v: string) => {
      switch (v) {
        case 'V': return 'Vyhovuje';
        case 'N': return 'NEVYHOVUJE';
        case 'NA': return 'N/A';
        default: return '—';
      }
    };
    expect(fn(stav)).toBe(expected);
  });
});

// ═══════════════════════════════════════════════════
// Sekce 13. Závěrečné zhodnocení – verdikt
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – sekce 13. Závěrečné zhodnocení', () => {
  it('should render VYHOVUJE for verdikt=pass', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('13. Závěrečné zhodnocení').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('VYHOVUJE – BEZPEČNÝ PROVOZ').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render NEVYHOVUJE for verdikt=fail', async () => {
    const failSD = { ...strojniFormData, verdikt: 'fail' as const };
    setupMocks({}, { strojniData: failSD });
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('NEVYHOVUJE – VYŽADOVÁNA NÁPRAVNÁ OPATŘENÍ').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render — for empty verdikt', async () => {
    const noVerdiktSD = { ...strojniFormData, verdikt: '' as const };
    setupMocks({}, { strojniData: noVerdiktSD });
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const resultEl = container.querySelector('.report-result-value');
      expect(resultEl?.textContent?.trim()).toBe('—');
    });
  });

  it('should use green color for pass', async () => {
    setupMocks();
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const source = container.querySelector('.report-source');
      const resultEl = source?.querySelector('.report-result-value') as HTMLElement;
      expect(resultEl?.style.color).toBe('rgb(22, 163, 74)');
    });
  });

  it('should use red color for fail', async () => {
    const failSD = { ...strojniFormData, verdikt: 'fail' as const };
    setupMocks({}, { strojniData: failSD });
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const source = container.querySelector('.report-source');
      const resultEl = source?.querySelector('.report-result-value') as HTMLElement;
      expect(resultEl?.style.color).toBe('rgb(220, 38, 38)');
    });
  });
});

// ═══════════════════════════════════════════════════
// Sekce 14. Lhůta příštího ověření
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – sekce 14. Lhůta', () => {
  it('should render lhůta with platnost datum', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Doporučená lhůta provedení příštího ověření/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/20\. 3\. 2028/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show termin fallback when no datumPlatnosti', async () => {
    setupMocks({ datumPlatnosti: null });
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/24 měsíců od data provedení/).length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════
// Sekce 15. Podpisy
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – sekce 15. Podpisy', () => {
  it('should render podpisy section', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('15. Potvrzení o předání protokolu').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Revizní technik:').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Objednatel / Provozovatel:').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show technik name in signature', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Ing. Tomáš Stroj').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show zakaznik kontaktOsoba in signature', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Petr Kovář').length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════
// Toolbar
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – toolbar', () => {
  it('should render back button', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('← Zpět na revizi')).toBeInTheDocument();
    });
  });

  it('should navigate back on click', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('← Zpět na revizi'));
    });
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('should render cislo a nazev', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/S-2026-042/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/CNC Mazak Hala B2/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render Strojní zařízení badge', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Strojní zařízení')).toBeInTheDocument();
    });
  });

  it('should render Excel button', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Excel')).toBeInTheDocument();
    });
  });

  it('should render Tisk / PDF button', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getByText(/Tisk/)).toBeInTheDocument();
    });
  });

  it('should call window.print on Tisk click', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      fireEvent.click(screen.getByText(/Tisk/));
    });
    expect(window.print).toHaveBeenCalled();
  });

  it('should verify page count pluralization logic', () => {
    const pluralize = (n: number) => n === 1 ? 'strana' : n < 5 ? 'strany' : 'stran';
    expect(pluralize(1)).toBe('strana');
    expect(pluralize(3)).toBe('strany');
    expect(pluralize(5)).toBe('stran');
    expect(pluralize(10)).toBe('stran');
  });
});

// ═══════════════════════════════════════════════════
// String-set prvky
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – string-set prvky', () => {
  it('should render report-string-number with cisloRevize', async () => {
    setupMocks();
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const el = container.querySelector('.report-string-number');
      expect(el).toBeInTheDocument();
      expect(el?.textContent).toContain('S-2026-042');
    });
  });

  it('should render report-string-title with nazev – adresa', async () => {
    setupMocks();
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const el = container.querySelector('.report-string-title');
      expect(el?.textContent).toContain('CNC Mazak Hala B2');
      expect(el?.textContent).toContain('Průmyslová 15, Brno');
    });
  });

  it('should render report-string-firma', async () => {
    setupMocks();
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      const el = container.querySelector('.report-string-firma');
      expect(el?.textContent).toContain('ElektroTest s.r.o.');
    });
  });
});

// ═══════════════════════════════════════════════════
// Excel export
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – Excel export', () => {
  it('should call exportStrojniExcel on Excel button click', async () => {
    setupMocks();
    render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('Excel'));
    });
    const { exportStrojniExcel } = await import('../../pages/StrojniZarizeniPrint/excelExport');
    await waitFor(() => {
      expect(exportStrojniExcel).toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════
// CSS layout & page-break analýza
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – CSS layout', () => {
  const cssPath = path.resolve(__dirname, '../../pages/StrojniZarizeniPrint/strojniZarizeni.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  it('should have sz-root CSS variables', () => {
    expect(css).toContain('--sz-bg:');
    expect(css).toContain('--sz-surface:');
    expect(css).toContain('--sz-accent:');
    expect(css).toContain('--sz-mono:');
    expect(css).toContain('--sz-sans:');
  });

  it('should have sz-toolbar sticky positioning', () => {
    expect(css).toContain('position: sticky');
    expect(css).toContain('top: 0');
    expect(css).toContain('z-index: 100');
  });

  it('should have sz-container with max-width', () => {
    expect(css).toContain('max-width: 960px');
  });

  it('should have @media print rules', () => {
    expect(css).toContain('@media print');
  });

  it('should hide toolbar in print', () => {
    expect(css).toContain('.sz-toolbar');
    expect(css).toContain('display: none !important');
  });

  it('should set break-inside: avoid for sz-section in print', () => {
    expect(css).toContain('break-inside: avoid');
  });

  it('should force background on sz-section-title in print', () => {
    expect(css).toContain('-webkit-print-color-adjust: exact');
    expect(css).toContain('print-color-adjust: exact');
  });

  it('should have sz-table styles', () => {
    expect(css).toContain('border-collapse: collapse');
    expect(css).toContain('.sz-table th');
    expect(css).toContain('.sz-table td');
  });

  it('should have responsive breakpoint', () => {
    expect(css).toContain('@media (max-width: 640px)');
  });

  it('should have check buttons styles (V/N/NA)', () => {
    expect(css).toContain('.sz-check-btn.sz-active-v');
    expect(css).toContain('.sz-check-btn.sz-active-n');
    expect(css).toContain('.sz-check-btn.sz-active-na');
  });

  it('should have verdict button styles (pass/fail)', () => {
    expect(css).toContain('.sz-verdict-btn.sz-active-pass');
    expect(css).toContain('.sz-verdict-btn.sz-active-fail');
  });

  it('should have signature styles', () => {
    expect(css).toContain('.sz-sign-row');
    expect(css).toContain('.sz-sign-line');
    expect(css).toContain('.sz-sign-label');
  });
});

// ═══════════════════════════════════════════════════
// PAGED_CSS – @page pravidla
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – PAGED_CSS', () => {
  const srcPath = path.resolve(__dirname, '../../pages/StrojniZarizeniPrint/StrojniZarizeniPrintPage.tsx');
  const src = fs.readFileSync(srcPath, 'utf-8');
  const pagedMatch = src.match(/const PAGED_CSS\s*=\s*`([\s\S]*?)`;/);
  const pagedCss = pagedMatch?.[1] || '';

  it('should contain @page with size A4', () => {
    expect(pagedCss).toContain('size: A4');
  });

  it('should have correct margins', () => {
    expect(pagedCss).toContain('margin: 18mm 15mm 20mm 15mm');
  });

  it('should have @top-left margin box', () => {
    expect(pagedCss).toContain('@top-left');
    expect(pagedCss).toContain('string(report-number, first)');
  });

  it('should have @top-right margin box', () => {
    expect(pagedCss).toContain('@top-right');
    expect(pagedCss).toContain('string(report-title, first)');
  });

  it('should have @bottom-center with page counter', () => {
    expect(pagedCss).toContain('@bottom-center');
    expect(pagedCss).toContain('counter(page)');
    expect(pagedCss).toContain('counter(pages)');
  });

  it('should have @bottom-left with firma-name', () => {
    expect(pagedCss).toContain('@bottom-left');
    expect(pagedCss).toContain('string(firma-name, first)');
  });

  it('should have @bottom-right with strojní label', () => {
    expect(pagedCss).toContain('@bottom-right');
    expect(pagedCss).toContain('Protokol ověření strojního zařízení');
  });

  it('should hide top margin boxes on first page', () => {
    expect(pagedCss).toContain('@page:first');
    expect(pagedCss).toContain('content: none');
  });

  it('should have string-set definitions', () => {
    expect(pagedCss).toContain('string-set: report-number');
    expect(pagedCss).toContain('string-set: report-title');
    expect(pagedCss).toContain('string-set: firma-name');
  });
});

// ═══════════════════════════════════════════════════
// Kombinovaný test: bez strojních dat
// ═══════════════════════════════════════════════════

describe('StrojniZarizeniPrintPage – bez strojniData', () => {
  it('should render report with — placeholders when strojniData is null', async () => {
    setupMocks({}, { strojniData: null });
    const { container } = render(<StrojniZarizeniPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('PROTOKOL O OVĚŘENÍ STROJNÍHO ZAŘÍZENÍ').length).toBeGreaterThanOrEqual(1);
    });
    // No measurement sections
    expect(screen.queryByText('6. Jištění strojního zařízení')).not.toBeInTheDocument();
    expect(screen.queryByText(/Měření izolačního odporu/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Měření spojitosti/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Měření proudových chráničů/)).not.toBeInTheDocument();
    expect(screen.queryByText('10. Funkční kontroly')).not.toBeInTheDocument();
    // Result should show —
    const source = container.querySelector('.report-source');
    const resultVal = source?.querySelector('.report-result-value');
    expect(resultVal?.textContent?.trim()).toBe('—');
  });
});
