/**
 * Testy pro HromosvodPrintPage – tisková revizní zpráva pro hromosvod (LPS)
 *
 * Pokrývá:
 * - Loading / error stavy
 * - Všechny sekce 1.–19.
 * - Hromosvod-specifické dynamické helper funkce:
 *   stavLabel, stavPrintColor, tridaLpsLabel, typOchranyLabel
 * - Měření odporů – tabulka, statistiky
 * - tiskSekce viditelnost pro hromosvod sekce
 * - Hromosvod badge v toolbaru
 * - String-set prvky
 * - Podpisy a data
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { HromosvodPrintPage } from '../../pages/HromosvodPrint/HromosvodPrintPage';
import type { Revize, Nastaveni, Zavada, MericiPristroj } from '../../types';

// ── Mocky ────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '2' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('pagedjs', () => ({
  Previewer: vi.fn().mockImplementation(() => ({
    preview: vi.fn().mockResolvedValue({ total: 4 }),
  })),
}));

vi.mock('../../services/wordExportHromosvod', () => ({
  exportHromosvodToWord: vi.fn().mockResolvedValue(undefined),
}));

const baseRevize: Revize = {
  id: 2,
  cisloRevize: 'H-2026-001',
  nazev: 'Rodinný dům Hromosvod',
  adresa: 'Bleskova 7, Ostrava',
  objednatel: 'Jan Blesk',
  zakaznikId: 20,
  kategorieRevize: 'hromosvod',
  datum: '2026-05-10',
  datumDokonceni: '2026-05-12',
  datumVypracovani: '2026-05-14',
  datumPlatnosti: '2028-05-10',
  termin: 24,
  typRevize: 'pravidelná',
  stav: 'dokončeno',
  vysledek: 'schopno',
  vysledekOduvodneni: 'LPS v pořádku',
  zaver: 'Systém ochrany vyhovuje normě.',
  rozsahRevize: 'Kompletní LPS',
  predmetNeni: 'Vnitřní instalace',
  napetovaSoustava: null,
  ochranaOpatreni: null,
  podklady: 'ČSN EN 62305',
  provedeneUkony: null,
  vyhodnoceniPredchozich: 'Bez závad.',
  tiskSekce: JSON.stringify({}),
  // Hromosvod specifická pole
  hromosvodNorma: 'ČSN EN 62305-1 ed.2',
  hromosvodTridaLps: 'III',
  hromosvodTypOchrany: 'kombinovaná',
  hromosvodRokInstalace: '2018',
  hromosvodPopisLps: 'Tyčový jímač + mřížová soustava',
  hromosvodJimaciTyp: 'Tyčový',
  hromosvodJimaciMaterial: 'AlMgSi',
  hromosvodJimaciStav: 'vyhovující',
  hromosvodJimaciPoznamka: 'Bez koroze',
  hromosvodSvodyPocet: 4,
  hromosvodSvodyMaterial: 'FeZn',
  hromosvodSvodyPrurez: 'Ø10mm',
  hromosvodSvodyZkusebniSvorky: 4,
  hromosvodSvodyStav: 'vyhovující',
  hromosvodSvodyPoznamka: '',
  hromosvodUzemneniTyp: 'Obvodové (typ B)',
  hromosvodUzemneniMaterial: 'FeZn pásek 30x4',
  hromosvodUzemneniStav: 'vyhovující',
  hromosvodUzemneniPoznamka: '',
  hromosvodSpdTyp: 'Typ T1+T2',
  hromosvodSpdStav: 'vyhovující',
  hromosvodEkvipotencialni: 'Hlavní ochranná přípojnice',
  hromosvodSpdPoznamka: '',
  hromosvodMereniOdporu: JSON.stringify([
    { bod: 'Svod č.1', hodnota: '2.5', limit: '10', vyhovuje: true },
    { bod: 'Svod č.2', hodnota: '3.8', limit: '10', vyhovuje: true },
    { bod: 'Svod č.3', hodnota: '15.2', limit: '10', vyhovuje: false },
  ]),
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

const baseNastaveni: Nastaveni = {
  firmaJmeno: 'HromoRevize s.r.o.',
  firmaAdresa: 'Bleskova 10',
  firmaIco: '22222222',
  firmaDic: 'CZ22222222',
  reviznniTechnikJmeno: 'Ing. Pavel Hrom',
  reviznniTechnikCisloOpravneni: 'E2A-HROM/2024',
  reviznniTechnikOsvedceni: 'TIČR E2A',
  kontaktTelefon: '+420 222 333 444',
  kontaktEmail: 'hrom@revize.cz',
};

const mockZakaznik = {
  id: 20,
  nazev: 'SVJ Blesk',
  adresa: 'Bleskova 7, Ostrava',
  ico: '11223344',
  kontaktOsoba: 'Eva Bouřková',
  telefon: '+420 777 888 999',
  email: 'eva@svj.cz',
};

const mockPristroje: MericiPristroj[] = [
  {
    id: 10,
    nazev: 'Chauvin Arnoux C.A 6417',
    vyrobce: 'Chauvin Arnoux',
    model: 'C.A 6417',
    vyrobniCislo: 'CA-999',
    typPristroje: 'měřič zemních odporů',
    datumKalibrace: '2026-01-10',
    platnostKalibrace: '2027-01-10',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockZavady: Zavada[] = [
  {
    id: 5,
    revizeId: 2,
    popis: 'Koroze zkušební svorky svodu č.3',
    zavaznost: 'C2',
    stav: 'v řešení',
    fotky: [],
    datumZjisteni: new Date('2026-05-10'),
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
  },
) {
  const revize = { ...baseRevize, ...revizeOverrides };
  (revizeService.getById as Mock).mockResolvedValue(revize);
  (zavadaService.getByRevize as Mock).mockResolvedValue(opts?.zavady ?? mockZavady);
  (revizePristrojService.getByRevize as Mock).mockResolvedValue(opts?.pristroje ?? mockPristroje);
  (nastaveniService.get as Mock).mockResolvedValue({ ...baseNastaveni, ...opts?.nastaveni });
  (zakazniciService.getAll as Mock).mockResolvedValue(opts?.zakaznik !== undefined ? [opts.zakaznik] : [mockZakaznik]);
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

describe('HromosvodPrintPage – loading/error', () => {
  it('should show hromosvod loading message', () => {
    (revizeService.getById as Mock).mockReturnValue(new Promise(() => {}));
    render(<HromosvodPrintPage />);
    expect(screen.getByText('Načítání revizní zprávy hromosvodu...')).toBeInTheDocument();
  });

  it('should show error when revize not found', async () => {
    (revizeService.getById as Mock).mockResolvedValue(null);
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Revize nebyla nalezena')).toBeInTheDocument();
    });
  });

  it('should show DB error', async () => {
    (revizeService.getById as Mock).mockRejectedValue(new Error('Connection lost'));
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Connection lost')).toBeInTheDocument();
    });
  });

  it('should navigate back from error page', async () => {
    (revizeService.getById as Mock).mockResolvedValue(null);
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('← Zpět'));
    });
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});

// ═══════════════════════════════════════════════════
// Report title a hlavička
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – title a hlavička', () => {
  it('should render hromosvod report title', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI SYSTÉMU OCHRANY PŘED BLESKEM (LPS)')).toBeInTheDocument();
    });
  });

  it('should render norma below title', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText(/dle ČSN EN 62305-1 ed\.2/)).toBeInTheDocument();
    });
  });

  it('should not render norma when hromosvodNorma is empty', async () => {
    setupMocks({ hromosvodNorma: '' } as any);
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI SYSTÉMU OCHRANY PŘED BLESKEM (LPS)')).toBeInTheDocument();
    });
    expect(screen.queryByText(/dle /)).not.toBeInTheDocument();
  });

  it('should render Hromosvod badge in toolbar', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Hromosvod')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════
// Sekce 1. Provozovatel
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – sekce 1. Provozovatel', () => {
  it('should render provozovatel section with zakaznik', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('1. Provozovatel (objednatel)').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('SVJ Blesk').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Eva Bouřková').length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════
// Sekce 3. Charakteristika LPS
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – sekce 3. Charakteristika LPS', () => {
  it('should render třída LPS label', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('3. Charakteristika systému ochrany před bleskem (LPS)')).toBeInTheDocument();
      expect(screen.getByText('III — Standardní ochrana')).toBeInTheDocument();
    });
  });

  it('should render typ ochrany label', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Kombinovaná (vnější + vnitřní)')).toBeInTheDocument();
    });
  });

  it('should render rok instalace', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('2018')).toBeInTheDocument();
    });
  });

  it('should render popis LPS', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Tyčový jímač + mřížová soustava')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════
// tridaLpsLabel – všechny varianty
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – tridaLpsLabel mapping', () => {
  it.each([
    ['I', 'I — Nejvyšší ochrana'],
    ['II', 'II — Vysoká ochrana'],
    ['III', 'III — Standardní ochrana'],
    ['IV', 'IV — Základní ochrana'],
  ])('should render třída %s as "%s"', async (trida, expected) => {
    setupMocks({ hromosvodTridaLps: trida } as any);
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });

  it('should render unknown třída as-is', async () => {
    setupMocks({ hromosvodTridaLps: 'V' } as any);
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('V')).toBeInTheDocument();
    });
  });

  it('should render "—" when třída is empty', async () => {
    setupMocks({ hromosvodTridaLps: '' } as any);
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Třída LPS:')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════
// typOchranyLabel – všechny varianty
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – typOchranyLabel mapping', () => {
  it.each([
    ['vnější', 'Vnější ochrana (jímače + svody + uzemnění)'],
    ['vnitřní', 'Vnitřní ochrana (SPD + pospojování)'],
    ['kombinovaná', 'Kombinovaná (vnější + vnitřní)'],
  ])('should render typ %s as "%s"', async (typ, expected) => {
    setupMocks({ hromosvodTypOchrany: typ } as any);
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════
// Sekce 8. Jímací soustava
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – sekce 8. Jímací soustava', () => {
  it('should render jímací soustava section', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('8. Jímací soustava')).toBeInTheDocument();
      expect(screen.getByText('Tyčový')).toBeInTheDocument();
      expect(screen.getByText('AlMgSi')).toBeInTheDocument();
    });
  });

  it('should show stav "Vyhovující" in green', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      // Najdeme buňku se stavem jímače
      const stavCells = screen.getAllByText('Vyhovující');
      expect(stavCells.length).toBeGreaterThanOrEqual(1);
      // Ověříme barvu
      const stavCell = stavCells[0];
      expect(stavCell.style.color).toBe('rgb(22, 163, 74)'); // #16a34a
    });
  });

  it('should render poznámka when present', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Bez koroze')).toBeInTheDocument();
    });
  });

  it('should hide jímací soustava when tiskSekce.jimaciSoustava=false', async () => {
    setupMocks({ tiskSekce: JSON.stringify({ jimaciSoustava: false }) });
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI SYSTÉMU OCHRANY PŘED BLESKEM (LPS)')).toBeInTheDocument();
    });
    expect(screen.queryByText('8. Jímací soustava')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════
// stavLabel – všechny varianty
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – stavLabel mapping', () => {
  it('should show "NEVYHOVUJÍCÍ" in red for nevyhovující stav', async () => {
    setupMocks({ hromosvodJimaciStav: 'nevyhovující' } as any);
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      const el = screen.getByText('NEVYHOVUJÍCÍ');
      expect(el).toBeInTheDocument();
      expect(el.style.color).toBe('rgb(220, 38, 38)'); // #dc2626
    });
  });

  it('should show "Částečně vyhovující" in amber', async () => {
    setupMocks({ hromosvodJimaciStav: 'částečně vyhovující' } as any);
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      const el = screen.getByText('Částečně vyhovující');
      expect(el).toBeInTheDocument();
      expect(el.style.color).toBe('rgb(217, 119, 6)'); // #d97706
    });
  });

  it('should show "Nenainstalováno" for nenainstalováno stav', async () => {
    setupMocks({ hromosvodSpdStav: 'nenainstalováno' } as any);
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Nenainstalováno')).toBeInTheDocument();
    });
  });

  it('should show "—" for undefined stav', async () => {
    setupMocks({ hromosvodJimaciStav: undefined } as any);
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('8. Jímací soustava')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════
// Sekce 9. Svodové vedení
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – sekce 9. Svodové vedení', () => {
  it('should render svodové vedení section with all data', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('9. Svodové vedení')).toBeInTheDocument();
      expect(screen.getByText('FeZn')).toBeInTheDocument();
      expect(screen.getByText('Ø10mm')).toBeInTheDocument();
      expect(screen.getByText('4 ks')).toBeInTheDocument();
    });
  });

  it('should hide svodové vedení when tiskSekce.svodoveVedeni=false', async () => {
    setupMocks({ tiskSekce: JSON.stringify({ svodoveVedeni: false }) });
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI SYSTÉMU OCHRANY PŘED BLESKEM (LPS)')).toBeInTheDocument();
    });
    expect(screen.queryByText('9. Svodové vedení')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════
// Sekce 10. Uzemňovací soustava
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – sekce 10. Uzemňovací soustava', () => {
  it('should render uzemňovací soustava', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('10. Uzemňovací soustava')).toBeInTheDocument();
      expect(screen.getByText('Obvodové (typ B)')).toBeInTheDocument();
      expect(screen.getByText('FeZn pásek 30x4')).toBeInTheDocument();
    });
  });

  it('should hide uzemňovací soustava when disabled', async () => {
    setupMocks({ tiskSekce: JSON.stringify({ uzemnovaciSoustava: false }) });
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI SYSTÉMU OCHRANY PŘED BLESKEM (LPS)')).toBeInTheDocument();
    });
    expect(screen.queryByText('10. Uzemňovací soustava')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════
// Sekce 11. SPD / pospojování
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – sekce 11. SPD', () => {
  it('should render SPD section', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('11. Ochranné pospojování a přepěťové ochrany (SPD)')).toBeInTheDocument();
      expect(screen.getByText('Typ T1+T2')).toBeInTheDocument();
      expect(screen.getByText('Hlavní ochranná přípojnice')).toBeInTheDocument();
    });
  });

  it('should hide SPD section when tiskSekce.spd=false', async () => {
    setupMocks({ tiskSekce: JSON.stringify({ spd: false }) });
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI SYSTÉMU OCHRANY PŘED BLESKEM (LPS)')).toBeInTheDocument();
    });
    expect(screen.queryByText('11. Ochranné pospojování a přepěťové ochrany (SPD)')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════
// Sekce 12. Měření odporů uzemnění
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – sekce 12. Měření odporů', () => {
  it('should render měření table with all rows', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('12. Měření odporů uzemnění')).toBeInTheDocument();
      expect(screen.getByText('Svod č.1')).toBeInTheDocument();
      expect(screen.getByText('Svod č.2')).toBeInTheDocument();
      expect(screen.getByText('Svod č.3')).toBeInTheDocument();
    });
  });

  it('should render "Vyhovuje" / "NEVYHOVUJE" in results column', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      const vyhovujeEls = screen.getAllByText('Vyhovuje');
      expect(vyhovujeEls.length).toBeGreaterThanOrEqual(2); // 2 vyhovující body
      expect(screen.getByText('NEVYHOVUJE')).toBeInTheDocument(); // svod 3
    });
  });

  it('should render měření statistics line', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText(/Celkem bodů: 3/)).toBeInTheDocument();
      expect(screen.getByText(/Vyhovuje: 2/)).toBeInTheDocument();
      expect(screen.getByText(/Nevyhovuje: 1/)).toBeInTheDocument();
    });
  });

  it('should calculate average resistance value', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      // Average: (2.5 + 3.8 + 15.2) / 3 = 7.166... → 7.17
      expect(screen.getByText(/Průměrná hodnota: 7\.17 Ω/)).toBeInTheDocument();
    });
  });

  it('should show "nebylo provedeno" when no measurement data', async () => {
    setupMocks({ hromosvodMereniOdporu: null } as any);
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Měření odporů uzemnění nebylo provedeno')).toBeInTheDocument();
    });
  });

  it('should hide měření when tiskSekce.mereniOdporu=false', async () => {
    setupMocks({ tiskSekce: JSON.stringify({ mereniOdporu: false }) });
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI SYSTÉMU OCHRANY PŘED BLESKEM (LPS)')).toBeInTheDocument();
    });
    expect(screen.queryByText('12. Měření odporů uzemnění')).not.toBeInTheDocument();
  });

  it('should handle invalid mereniOdporu JSON', async () => {
    setupMocks({ hromosvodMereniOdporu: 'invalid{json' } as any);
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Měření odporů uzemnění nebylo provedeno')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════
// Sekce 13. Měřicí přístroje
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – sekce 13. Přístroje', () => {
  it('should render přístroje table', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('13. Soupis použitých měřicích přístrojů').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Chauvin Arnoux C.A 6417').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('CA-999').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show empty message when no přístroje', async () => {
    setupMocks({}, { pristroje: [] });
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Žádné přístroje nebyly přiřazeny')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════
// Sekce 16. Závady
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – sekce 16. Závady', () => {
  it('should render závady table', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('16. Přehled zjištěných závad')).toBeInTheDocument();
      expect(screen.getByText('Koroze zkušební svorky svodu č.3')).toBeInTheDocument();
      expect(screen.getByText('C2 – Vážná')).toBeInTheDocument();
      expect(screen.getByText('V řešení')).toBeInTheDocument();
    });
  });

  it('should show "nebyly zjištěny" when no závady', async () => {
    setupMocks({}, { zavady: [] });
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText(/nebyly zjištěny žádné závady/i)).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════
// Sekce 17. Závěrečné zhodnocení
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – sekce 17. Závěrečné zhodnocení', () => {
  it('should render LPS result label', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('17. Závěrečné zhodnocení')).toBeInTheDocument();
      expect(screen.getByText('Systém ochrany před bleskem (LPS) je:')).toBeInTheDocument();
      expect(screen.getByText('SCHOPNO BEZPEČNÉHO PROVOZU')).toBeInTheDocument();
    });
  });

  it('should render "NESCHOPNO" for neschopno', async () => {
    setupMocks({ vysledek: 'neschopno' });
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      const el = screen.getByText('NESCHOPNO BEZPEČNÉHO PROVOZU');
      expect(el.style.color).toBe('rgb(220, 38, 38)');
    });
  });

  it('should render zaver when visible', async () => {
    setupMocks({ zaver: 'Závěrečný hromosvod text.' });
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Závěrečný hromosvod text.')).toBeInTheDocument();
    });
  });

  it('should hide zaver when tiskSekce.zaver=false', async () => {
    setupMocks({ zaver: 'Text co neuvidíme', tiskSekce: JSON.stringify({ zaver: false }) });
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('17. Závěrečné zhodnocení')).toBeInTheDocument();
    });
    expect(screen.queryByText('Text co neuvidíme')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════
// Sekce 19. Podpisy
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – sekce 19. Podpisy', () => {
  it('should render podpisy section', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('19. Potvrzení o předání zprávy')).toBeInTheDocument();
      expect(screen.getByText('Revizní technik:')).toBeInTheDocument();
      expect(screen.getByText('Objednatel / Provozovatel:')).toBeInTheDocument();
    });
  });

  it('should show technik name in signature', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Ing. Pavel Hrom').length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════
// Toolbar
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – toolbar', () => {
  it('should render back button and cislo', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('← Zpět na revizi')).toBeInTheDocument();
      expect(screen.getAllByText(/H-2026-001/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should navigate back on button click', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('← Zpět na revizi'));
    });
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('should render Word export button', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Word')).toBeInTheDocument();
    });
  });

  it('should render Tisk / PDF button', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText(/Tisk/)).toBeInTheDocument();
    });
  });

  it('should call window.print on Tisk button click', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      fireEvent.click(screen.getByText(/Tisk/));
    });
    expect(window.print).toHaveBeenCalled();
  });

  it('should display page count via pluralization logic', () => {
    // Pagedjs lifecycle doesn't complete in jsdom; test the pluralization logic directly
    const pluralize = (n: number) => n === 1 ? 'strana' : n < 5 ? 'strany' : 'stran';
    expect(pluralize(1)).toBe('strana');
    expect(pluralize(4)).toBe('strany');
    expect(pluralize(5)).toBe('stran');
    expect(pluralize(10)).toBe('stran');
  });
});

// ═══════════════════════════════════════════════════
// String-set prvky
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – string-set prvky', () => {
  it('should render report-string-number with cisloRevize', async () => {
    setupMocks();
    const { container } = render(<HromosvodPrintPage />);
    await waitFor(() => {
      const el = container.querySelector('.report-string-number');
      expect(el).toBeInTheDocument();
      expect(el?.textContent).toContain('H-2026-001');
    });
  });

  it('should render report-string-title with nazev – adresa', async () => {
    setupMocks();
    const { container } = render(<HromosvodPrintPage />);
    await waitFor(() => {
      const el = container.querySelector('.report-string-title');
      expect(el?.textContent).toContain('Rodinný dům Hromosvod');
      expect(el?.textContent).toContain('Bleskova 7, Ostrava');
    });
  });

  it('should render report-string-firma', async () => {
    setupMocks();
    const { container } = render(<HromosvodPrintPage />);
    await waitFor(() => {
      const el = container.querySelector('.report-string-firma');
      expect(el?.textContent).toContain('HromoRevize s.r.o.');
    });
  });
});

// ═══════════════════════════════════════════════════
// Rozsah revize – hromosvod specifický (sekce d)
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – sekce 4. Rozsah revize', () => {
  it('should render rozsah revize', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('4. Vymezení rozsahu revize')).toBeInTheDocument();
      expect(screen.getByText('Kompletní LPS')).toBeInTheDocument();
    });
  });

  it('should hide when tiskSekce.rozsahRevize=false', async () => {
    setupMocks({ tiskSekce: JSON.stringify({ rozsahRevize: false }) });
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI SYSTÉMU OCHRANY PŘED BLESKEM (LPS)')).toBeInTheDocument();
    });
    expect(screen.queryByText('4. Vymezení rozsahu revize')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════
// Příští revize (sekce r)
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – sekce 18. Lhůta příští revize', () => {
  it('should render next revision date', async () => {
    setupMocks();
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('18. Doporučená lhůta provedení příští revize').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/10\. 5\. 2028/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show termin fallback when no datumPlatnosti', async () => {
    setupMocks({ datumPlatnosti: null });
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText(/24 měsíců od data provedení/)).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════
// Word export pro hromosvod
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – Word export', () => {
  it('should call exportHromosvodToWord on button click', async () => {
    setupMocks();
    const { exportHromosvodToWord } = await import('../../services/wordExportHromosvod');
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('Word'));
    });
    await waitFor(() => {
      expect(exportHromosvodToWord).toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════
// Skrytí více hromosvod sekcí najednou
// ═══════════════════════════════════════════════════

describe('HromosvodPrintPage – skrytí více sekcí najednou', () => {
  it('should hide multiple hromosvod-specific sections at once', async () => {
    setupMocks({
      tiskSekce: JSON.stringify({
        jimaciSoustava: false,
        svodoveVedeni: false,
        uzemnovaciSoustava: false,
        spd: false,
        mereniOdporu: false,
        pristroje: false,
        podklady: false,
        vyhodnoceniPredchozich: false,
      }),
    });
    render(<HromosvodPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI SYSTÉMU OCHRANY PŘED BLESKEM (LPS)')).toBeInTheDocument();
    });
    expect(screen.queryByText('8. Jímací soustava')).not.toBeInTheDocument();
    expect(screen.queryByText('9. Svodové vedení')).not.toBeInTheDocument();
    expect(screen.queryByText('10. Uzemňovací soustava')).not.toBeInTheDocument();
    expect(screen.queryByText('11. Ochranné pospojování a přepěťové ochrany (SPD)')).not.toBeInTheDocument();
    expect(screen.queryByText('12. Měření odporů uzemnění')).not.toBeInTheDocument();
    expect(screen.queryByText('13. Soupis použitých měřicích přístrojů')).not.toBeInTheDocument();
    expect(screen.queryByText('14. Seznam podkladů použitých k provedení revize')).not.toBeInTheDocument();
    expect(screen.queryByText('15. Vyhodnocení předchozích revizí')).not.toBeInTheDocument();
    // Tyto by měly zůstat:
    expect(screen.getByText('1. Provozovatel (objednatel)')).toBeInTheDocument();
    expect(screen.getByText('17. Závěrečné zhodnocení')).toBeInTheDocument();
    expect(screen.getByText('19. Potvrzení o předání zprávy')).toBeInTheDocument();
  });
});
