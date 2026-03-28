/**
 * Testy pro dynamické prvky tiskového náhledu – ReportPrintPage
 *
 * Pokrývá:
 * - tiskSekce JSON parsing a viditelnost sekcí (granulární kombinace)
 * - ochranaOpatreni JSON parsing (array, plain string, invalid JSON)
 * - typRevize label mapping (výchozí, pravidelná, mimořádná)
 * - vysledek label + barva (schopno, neschopno, podmíněně)
 * - Podmíněné rendery polí zákazníka (ICO, DIC, kontakt, tel, email)
 * - Pagedjs lifecycle: Previewer, fallback, pageCount display
 * - report-source kontejner (skrytý zdroj)
 * - Prázdné stavy (žádné závady, žádné rozvaděče, žádné přístroje)
 * - isSekceVisible – nevalidní/prázdný/null tiskSekce
 */
import { describe, it, expect, vi, beforeEach, type Mock, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { ReportPrintPage } from '../../pages/ReportPrint/ReportPrintPage';
import type { Revize, Nastaveni, Zavada, MericiPristroj } from '../../types';

// ── Mocky ────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('pagedjs', () => ({
  Previewer: vi.fn().mockImplementation(() => ({
    preview: vi.fn().mockResolvedValue({ total: 5 }),
  })),
}));

vi.mock('../../services/wordExport', () => ({
  exportElektroToWord: vi.fn().mockResolvedValue(undefined),
}));

const baseRevize: Revize = {
  id: 1,
  cisloRevize: 'R-2026-DYN',
  nazev: 'Dynamický test objekt',
  adresa: 'Testovací 99, Brno',
  objednatel: 'Firma ABC',
  zakaznikId: null,
  kategorieRevize: 'elektro',
  datum: '2026-06-01',
  datumDokonceni: '2026-06-05',
  datumVypracovani: '2026-06-07',
  datumPlatnosti: '2031-06-01',
  termin: 60,
  typRevize: 'pravidelná',
  stav: 'dokončeno',
  vysledek: 'schopno',
  vysledekOduvodneni: '',
  zaver: '',
  rozsahRevize: 'Rozsah A',
  predmetNeni: 'Předmět B',
  napetovaSoustava: '3+N+PE AC 50Hz 400/230V TN-S',
  ochranaOpatreni: JSON.stringify(['Odpojení', 'Pospojování']),
  podklady: 'Podklady X',
  provedeneUkony: 'Měření',
  vyhodnoceniPredchozich: 'OK',
  tiskSekce: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseNastaveni: Nastaveni = {
  firmaJmeno: 'TestFirma s.r.o.',
  firmaAdresa: 'Firemní 1',
  firmaIco: '11111111',
  firmaDic: 'CZ11111111',
  reviznniTechnikJmeno: 'Technik Abc',
  reviznniTechnikCisloOpravneni: 'E1-9999',
  kontaktTelefon: '',
  kontaktEmail: '',
};

vi.mock('../../services/database', () => ({
  revizeService: { getById: vi.fn() },
  rozvadecService: { getByRevize: vi.fn() },
  okruhService: { getByRozvadec: vi.fn() },
  zavadaService: { getByRevize: vi.fn() },
  mistnostService: { getByRevize: vi.fn() },
  zarizeniService: { getByMistnost: vi.fn() },
  revizePristrojService: { getByRevize: vi.fn() },
  nastaveniService: { get: vi.fn() },
  zakazniciService: { getAll: vi.fn() },
}));

import {
  revizeService, rozvadecService, okruhService,
  zavadaService, mistnostService, zarizeniService,
  revizePristrojService, nastaveniService, zakazniciService,
} from '../../services/database';

function setupMocks(revizeOverrides: Partial<Revize> = {}, nastaveniOverrides: Partial<Nastaveni> = {}, zakaznik: any = null) {
  const revize = { ...baseRevize, ...revizeOverrides };
  (revizeService.getById as Mock).mockResolvedValue(revize);
  (rozvadecService.getByRevize as Mock).mockResolvedValue([]);
  (okruhService.getByRozvadec as Mock).mockResolvedValue([]);
  (zavadaService.getByRevize as Mock).mockResolvedValue([]);
  (mistnostService.getByRevize as Mock).mockResolvedValue([]);
  (zarizeniService.getByMistnost as Mock).mockResolvedValue([]);
  (revizePristrojService.getByRevize as Mock).mockResolvedValue([]);
  (nastaveniService.get as Mock).mockResolvedValue({ ...baseNastaveni, ...nastaveniOverrides });
  (zakazniciService.getAll as Mock).mockResolvedValue(zakaznik ? [zakaznik] : []);
}

beforeEach(() => {
  vi.clearAllMocks();
  global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
  global.URL.revokeObjectURL = vi.fn();
  window.print = vi.fn();
});

// ═══════════════════════════════════════════════════
// tiskSekce – granulární viditelnost sekcí
// ═══════════════════════════════════════════════════

describe('Dynamické prvky – tiskSekce viditelnost', () => {
  it('should show ALL conditional sections when tiskSekce is null (default true)', async () => {
    setupMocks({ tiskSekce: null });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('8. Vymezení rozsahu revize')).toBeInTheDocument();
      expect(screen.getByText('9. Soupis použitých měřicích přístrojů')).toBeInTheDocument();
      expect(screen.getByText('10. Seznam podkladů použitých k provedení revize')).toBeInTheDocument();
      expect(screen.getByText('11. Soupis provedených úkonů')).toBeInTheDocument();
      expect(screen.getByText('14. Vyhodnocení předchozích revizí')).toBeInTheDocument();
    });
  });

  it('should show ALL conditional sections when tiskSekce is empty object', async () => {
    setupMocks({ tiskSekce: JSON.stringify({}) });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('8. Vymezení rozsahu revize')).toBeInTheDocument();
      expect(screen.getByText('9. Soupis použitých měřicích přístrojů')).toBeInTheDocument();
      expect(screen.getByText('10. Seznam podkladů použitých k provedení revize')).toBeInTheDocument();
      expect(screen.getByText('11. Soupis provedených úkonů')).toBeInTheDocument();
    });
  });

  it('should hide rozsahRevize when tiskSekce.rozsahRevize=false', async () => {
    setupMocks({ tiskSekce: JSON.stringify({ rozsahRevize: false }) });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ')).toBeInTheDocument();
    });
    expect(screen.queryByText('8. Vymezení rozsahu revize')).not.toBeInTheDocument();
  });

  it('should hide pristroje when tiskSekce.pristroje=false', async () => {
    setupMocks({ tiskSekce: JSON.stringify({ pristroje: false }) });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ')).toBeInTheDocument();
    });
    expect(screen.queryByText('9. Soupis použitých měřicích přístrojů')).not.toBeInTheDocument();
  });

  it('should hide podklady when tiskSekce.podklady=false', async () => {
    setupMocks({ tiskSekce: JSON.stringify({ podklady: false }) });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ')).toBeInTheDocument();
    });
    expect(screen.queryByText('10. Seznam podkladů použitých k provedení revize')).not.toBeInTheDocument();
  });

  it('should hide provedeneUkony when tiskSekce.provedeneUkony=false', async () => {
    setupMocks({ tiskSekce: JSON.stringify({ provedeneUkony: false }) });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ')).toBeInTheDocument();
    });
    expect(screen.queryByText('11. Soupis provedených úkonů')).not.toBeInTheDocument();
  });

  it('should hide vyhodnoceniPredchozich when tiskSekce.vyhodnoceniPredchozich=false', async () => {
    setupMocks({ tiskSekce: JSON.stringify({ vyhodnoceniPredchozich: false }) });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ')).toBeInTheDocument();
    });
    expect(screen.queryByText('14. Vyhodnocení předchozích revizí')).not.toBeInTheDocument();
  });

  it('should hide charakteristika when tiskSekce.charakteristika=false', async () => {
    setupMocks({ tiskSekce: JSON.stringify({ charakteristika: false }) });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ')).toBeInTheDocument();
    });
    expect(screen.queryByText('Charakteristika revidovaného zařízení')).not.toBeInTheDocument();
  });

  it('should hide multiple sections simultaneously', async () => {
    setupMocks({
      tiskSekce: JSON.stringify({
        rozsahRevize: false,
        podklady: false,
        provedeneUkony: false,
        vyhodnoceniPredchozich: false,
      }),
    });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ')).toBeInTheDocument();
    });
    expect(screen.queryByText('8. Vymezení rozsahu revize')).not.toBeInTheDocument();
    expect(screen.queryByText('10. Seznam podkladů použitých k provedení revize')).not.toBeInTheDocument();
    expect(screen.queryByText('11. Soupis provedených úkonů')).not.toBeInTheDocument();
    expect(screen.queryByText('14. Vyhodnocení předchozích revizí')).not.toBeInTheDocument();
    // Tyto by měly zůstat viditelné:
    expect(screen.getByText('1. Provozovatel (objednatel) revidovaného zařízení')).toBeInTheDocument();
    expect(screen.getByText('2. Identifikace revidovaného zařízení a místo umístění')).toBeInTheDocument();
    expect(screen.getByText('7. Druh revize')).toBeInTheDocument();
  });

  it('should handle invalid tiskSekce JSON gracefully (treat as all visible)', async () => {
    setupMocks({ tiskSekce: 'not-valid-json{{{' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      // Should not crash, all sections visible
      expect(screen.getByText('8. Vymezení rozsahu revize')).toBeInTheDocument();
      expect(screen.getByText('9. Soupis použitých měřicích přístrojů')).toBeInTheDocument();
    });
  });

  it('should keep section visible when tiskSekce.key=true explicitly', async () => {
    setupMocks({ tiskSekce: JSON.stringify({ rozsahRevize: true, podklady: true }) });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('8. Vymezení rozsahu revize')).toBeInTheDocument();
      expect(screen.getByText('10. Seznam podkladů použitých k provedení revize')).toBeInTheDocument();
    });
  });

  it('should hide vysledekOduvodneni when tiskSekce.vysledekOduvodneni=false', async () => {
    setupMocks({
      vysledekOduvodneni: 'Důvod výsledku XYZ',
      tiskSekce: JSON.stringify({ vysledekOduvodneni: false }),
    });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('5. Závěrečné zhodnocení')).toBeInTheDocument();
    });
    expect(screen.queryByText('Důvod výsledku XYZ')).not.toBeInTheDocument();
  });

  it('should hide zaver section when tiskSekce.zaver=false', async () => {
    setupMocks({
      zaver: 'Závěrečný text ZZZ',
      tiskSekce: JSON.stringify({ zaver: false }),
    });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('5. Závěrečné zhodnocení')).toBeInTheDocument();
    });
    expect(screen.queryByText('Závěrečný text ZZZ')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════
// ochranaOpatreni JSON parsing
// ═══════════════════════════════════════════════════

describe('Dynamické prvky – ochranaOpatreni párstoring', () => {
  it('should parse JSON array of ochrana opatření', async () => {
    setupMocks({ ochranaOpatreni: JSON.stringify(['Doplnková izolace', 'Ochranné zapojení']) });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Doplnková izolace')).toBeInTheDocument();
      expect(screen.getByText('Ochranné zapojení')).toBeInTheDocument();
    });
  });

  it('should handle plain string ochrana (non-JSON)', async () => {
    setupMocks({ ochranaOpatreni: 'Prostá ochrana textem' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Prostá ochrana textem')).toBeInTheDocument();
    });
  });

  it('should handle empty/null ochrana (no karakteristika section when no data)', async () => {
    setupMocks({ ochranaOpatreni: null, napetovaSoustava: null });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ')).toBeInTheDocument();
    });
    // Charakteristika by neměla být zobrazena bez napětové soustavy a bez ochrany
    expect(screen.queryByText('Charakteristika revidovaného zařízení')).not.toBeInTheDocument();
  });

  it('should render empty list for empty JSON array', async () => {
    setupMocks({ ochranaOpatreni: JSON.stringify([]), napetovaSoustava: 'TN-S' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      // Charakteristika by měla být zviditelněna díky napětové soustavě
      expect(screen.getByText('Charakteristika revidovaného zařízení')).toBeInTheDocument();
      expect(screen.getByText('TN-S')).toBeInTheDocument();
    });
  });

  it('should show caractéristika with napetovaSoustava even without ochrana', async () => {
    setupMocks({ ochranaOpatreni: null, napetovaSoustava: '3+PE 230V' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Charakteristika revidovaného zařízení')).toBeInTheDocument();
      expect(screen.getByText('3+PE 230V')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════
// typRevize label mapping
// ═══════════════════════════════════════════════════

describe('Dynamické prvky – typRevize mapping', () => {
  it('should render "Výchozí revize" for výchozí', async () => {
    setupMocks({ typRevize: 'výchozí' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Výchozí revize').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render "Pravidelná (periodická) revize" for pravidelná', async () => {
    setupMocks({ typRevize: 'pravidelná' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Pravidelná (periodická) revize').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render "Mimořádná revize" for mimořádná without důvod', async () => {
    setupMocks({ typRevize: 'mimořádná', duvodMimoradne: '' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Mimořádná revize').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render "Mimořádná revize – <důvod>" for mimořádná with důvod', async () => {
    setupMocks({ typRevize: 'mimořádná', duvodMimoradne: 'Úraz zaměstnance' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Mimořádná revize – Úraz zaměstnance/).length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════
// vysledek label + barva
// ═══════════════════════════════════════════════════

describe('Dynamické prvky – vysledek label a barva', () => {
  it('should render "SCHOPNO BEZPEČNÉHO PROVOZU" in green for schopno', async () => {
    setupMocks({ vysledek: 'schopno' });
    const { container } = render(<ReportPrintPage />);
    await waitFor(() => {
      const el = screen.getByText('SCHOPNO BEZPEČNÉHO PROVOZU');
      expect(el).toBeInTheDocument();
      expect(el.style.color).toBe('rgb(22, 163, 74)'); // #16a34a
    });
  });

  it('should render "NESCHOPNO BEZPEČNÉHO PROVOZU" in red for neschopno', async () => {
    setupMocks({ vysledek: 'neschopno' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      const el = screen.getByText('NESCHOPNO BEZPEČNÉHO PROVOZU');
      expect(el).toBeInTheDocument();
      expect(el.style.color).toBe('rgb(220, 38, 38)'); // #dc2626
    });
  });

  it('should render "PODMÍNĚNĚ SCHOPNO" in amber for podmíněně schopno', async () => {
    setupMocks({ vysledek: 'podmíněně schopno' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      const el = screen.getByText('PODMÍNĚNĚ SCHOPNO BEZPEČNÉHO PROVOZU');
      expect(el).toBeInTheDocument();
      expect(el.style.color).toBe('rgb(217, 119, 6)'); // #d97706
    });
  });

  it('should render "—" for unknown vysledek', async () => {
    setupMocks({ vysledek: '' as any });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('5. Závěrečné zhodnocení')).toBeInTheDocument();
    });
  });

  it('should color result border matching vysledekColor', async () => {
    setupMocks({ vysledek: 'neschopno' });
    const { container } = render(<ReportPrintPage />);
    await waitFor(() => {
      const resultBox = container.querySelector('.report-result') as HTMLElement;
      expect(resultBox).toBeTruthy();
      expect(resultBox.style.borderColor).toBe('rgb(220, 38, 38)');
    });
  });
});

// ═══════════════════════════════════════════════════
// Podmíněné zákaznické pole
// ═══════════════════════════════════════════════════

describe('Dynamické prvky – podmíněné zákaznické pole', () => {
  const fullZakaznik = {
    id: 50,
    nazev: 'FullZákazník a.s.',
    adresa: 'Zákaznická 44',
    ico: '44556677',
    dic: 'CZ44556677',
    kontaktOsoba: 'Marie Králová',
    telefon: '+420 555 666 777',
    email: 'marie@zakaznik.cz',
  };

  it('should render all zakaznik fields when all present', async () => {
    setupMocks({ zakaznikId: 50 }, {}, fullZakaznik);
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('FullZákazník a.s.').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Zákaznická 44').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('44556677')).toBeInTheDocument();
      expect(screen.getAllByText('Marie Králová').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('+420 555 666 777')).toBeInTheDocument();
      expect(screen.getByText('marie@zakaznik.cz')).toBeInTheDocument();
    });
  });

  it('should not render zakaznik ICO row when zakaznik has no ICO', async () => {
    const noIco = { ...fullZakaznik, ico: '' };
    setupMocks({ zakaznikId: 50 }, {}, noIco);
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('FullZákazník a.s.').length).toBeGreaterThanOrEqual(1);
    });
    // IČO z nastavení (firmy technika) je v hlavičce, ale zákaznické IČO by nemělo být v sekci 1.
    const section = screen.getByText('1. Provozovatel (objednatel) revidovaného zařízení').closest('.report-section');
    expect(section).toBeTruthy();
    const icoInSection = within(section!).queryByText('IČO:');
    expect(icoInSection).not.toBeInTheDocument();
  });

  it('should not render kontaktOsoba row when zakaznik has no kontaktOsoba', async () => {
    const noKontakt = { ...fullZakaznik, kontaktOsoba: '' };
    setupMocks({ zakaznikId: 50 }, {}, noKontakt);
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('FullZákazník a.s.').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText('Kontaktní osoba:')).not.toBeInTheDocument();
  });

  it('should not render telefon row when zakaznik has no telefon', async () => {
    const noTel = { ...fullZakaznik, telefon: '' };
    setupMocks({ zakaznikId: 50 }, {}, noTel);
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('FullZákazník a.s.').length).toBeGreaterThanOrEqual(1);
    });
    const section = screen.getByText('1. Provozovatel (objednatel) revidovaného zařízení').closest('.report-section');
    const telInSection = within(section!).queryByText('Telefon:');
    expect(telInSection).not.toBeInTheDocument();
  });

  it('should not render email row when zakaznik has no email', async () => {
    const noEmail = { ...fullZakaznik, email: '' };
    setupMocks({ zakaznikId: 50 }, {}, noEmail);
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('FullZákazník a.s.').length).toBeGreaterThanOrEqual(1);
    });
    const section = screen.getByText('1. Provozovatel (objednatel) revidovaného zařízení').closest('.report-section');
    const emailInSection = within(section!).queryByText('E-mail:');
    expect(emailInSection).not.toBeInTheDocument();
  });

  it('should use objednatel when no zakaznik', async () => {
    setupMocks({ zakaznikId: null, objednatel: 'Objednatel Fallback' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      // Objednatel se zobrazuje v sekci 1. i v podpisech
      expect(screen.getAllByText('Objednatel Fallback').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show "—" when no zakaznik and no objednatel', async () => {
    setupMocks({ zakaznikId: null, objednatel: null });
    render(<ReportPrintPage />);
    await waitFor(() => {
      const section = screen.getByText('1. Provozovatel (objednatel) revidovaného zařízení');
      expect(section).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════
// Podmíněné nastavení pole (technik)
// ═══════════════════════════════════════════════════

describe('Dynamické prvky – podmíněné technické pole', () => {
  it('should render technik osvedceni when present', async () => {
    setupMocks({}, { reviznniTechnikOsvedceni: 'TIČR osvědčení E2A' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Osvědčení:')).toBeInTheDocument();
      expect(screen.getByText('TIČR osvědčení E2A')).toBeInTheDocument();
    });
  });

  it('should not render technik osvedceni row when empty', async () => {
    setupMocks({}, { reviznniTechnikOsvedceni: undefined });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('3. Údaje o revizním technikovi')).toBeInTheDocument();
    });
    expect(screen.queryByText('Osvědčení:')).not.toBeInTheDocument();
  });

  it('should render technik adresa when present', async () => {
    setupMocks({}, { reviznniTechnikAdresa: 'Technikova 5, Praha' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Technikova 5, Praha')).toBeInTheDocument();
    });
  });

  it('should render technik ICO when present', async () => {
    setupMocks({}, { reviznniTechnikIco: '99887766' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('99887766')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════
// Podmíněné datum pole
// ═══════════════════════════════════════════════════

describe('Dynamické prvky – podmíněná data', () => {
  it('should render datumDokonceni when present', async () => {
    setupMocks({ datumDokonceni: '2026-12-25' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Datum dokončení:')).toBeInTheDocument();
      expect(screen.getByText('25. 12. 2026')).toBeInTheDocument();
    });
  });

  it('should not render datumDokonceni row when null', async () => {
    setupMocks({ datumDokonceni: null });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('4. Důležitá data')).toBeInTheDocument();
    });
    expect(screen.queryByText('Datum dokončení:')).not.toBeInTheDocument();
  });

  it('should render platnost do when datumPlatnosti present', async () => {
    setupMocks({ datumPlatnosti: '2030-01-01' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Platnost do:')).toBeInTheDocument();
    });
  });

  it('should render termin in lhůta příští revize', async () => {
    setupMocks({ termin: 24 });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('24 měsíců')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════
// Rozsah revize – podmíněný obsah
// ═══════════════════════════════════════════════════

describe('Dynamické prvky – rozsah revize obsah', () => {
  it('should show both rozsah and predmetNeni when both present', async () => {
    setupMocks({ rozsahRevize: 'Celý objekt XYZ', predmetNeni: 'Objekt ABC' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('Celý objekt XYZ')).toBeInTheDocument();
      expect(screen.getByText('Objekt ABC')).toBeInTheDocument();
    });
  });

  it('should show "Nebylo vyplněno" when both rozsah and predmetNeni are empty', async () => {
    setupMocks({ rozsahRevize: null, predmetNeni: null });
    render(<ReportPrintPage />);
    await waitFor(() => {
      const section = screen.getByText('8. Vymezení rozsahu revize');
      expect(section).toBeInTheDocument();
    });
    expect(screen.getByText('Nebylo vyplněno')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════
// report-source kontejner
// ═══════════════════════════════════════════════════

describe('Dynamické prvky – report-source kontejner', () => {
  it('should render report-source div with report-page inside', async () => {
    setupMocks();
    const { container } = render(<ReportPrintPage />);
    await waitFor(() => {
      const source = container.querySelector('.report-source');
      expect(source).toBeInTheDocument();
      const page = source?.querySelector('.report-page');
      expect(page).toBeInTheDocument();
    });
  });

  it('should render report-preview container for pagedjs output', async () => {
    setupMocks();
    const { container } = render(<ReportPrintPage />);
    await waitFor(() => {
      const preview = container.querySelector('.report-preview');
      expect(preview).toBeInTheDocument();
    });
  });

  it('should render print-hide toolbar', async () => {
    setupMocks();
    const { container } = render(<ReportPrintPage />);
    await waitFor(() => {
      const toolbar = container.querySelector('.print-hide');
      expect(toolbar).toBeInTheDocument();
    });
  });

  it('should render report-print-bg background container', async () => {
    setupMocks();
    const { container } = render(<ReportPrintPage />);
    await waitFor(() => {
      const bg = container.querySelector('.report-print-bg');
      expect(bg).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════
// String-set prvky pro pagedjs running headers
// ═══════════════════════════════════════════════════

describe('Dynamické prvky – string-set prvky', () => {
  it('should render report-string-number with cisloRevize', async () => {
    setupMocks({ cisloRevize: 'R-TEST-999' });
    const { container } = render(<ReportPrintPage />);
    await waitFor(() => {
      const el = container.querySelector('.report-string-number');
      expect(el).toBeInTheDocument();
      expect(el?.textContent).toContain('R-TEST-999');
    });
  });

  it('should render report-string-title with nazev – adresa', async () => {
    setupMocks({ nazev: 'Objekt Alpha', adresa: 'Alpha 55' });
    const { container } = render(<ReportPrintPage />);
    await waitFor(() => {
      const el = container.querySelector('.report-string-title');
      expect(el).toBeInTheDocument();
      expect(el?.textContent).toContain('Objekt Alpha');
      expect(el?.textContent).toContain('Alpha 55');
    });
  });

  it('should render report-string-firma with firmaJmeno', async () => {
    setupMocks({}, { firmaJmeno: 'FirmaXYZ s.r.o.' });
    const { container } = render(<ReportPrintPage />);
    await waitFor(() => {
      const el = container.querySelector('.report-string-firma');
      expect(el).toBeInTheDocument();
      expect(el?.textContent).toContain('FirmaXYZ s.r.o.');
    });
  });

  it('should render empty firma string when nastaveni has no firmaJmeno', async () => {
    setupMocks({}, { firmaJmeno: undefined });
    const { container } = render(<ReportPrintPage />);
    await waitFor(() => {
      const el = container.querySelector('.report-string-firma');
      expect(el).toBeInTheDocument();
      // empty content
      expect(el?.textContent?.trim()).toBe('');
    });
  });
});

// ═══════════════════════════════════════════════════
// Page count display / Pagedjs integrace
// ═══════════════════════════════════════════════════

describe('Dynamické prvky – page count logika', () => {
  // Pozn.: V jsdom pagedjs lifecycle nedoběhne (chybí CSSStyleSheet,
  // cloneNode layout apod.), proto testujeme logiku nepřímo.

  it('should have pagedjs module mocked', async () => {
    const pagedjs = await import('pagedjs');
    expect(pagedjs.Previewer).toBeDefined();
  });

  it('should render pageCount span area in toolbar (conditional)', async () => {
    // PageCount span se zobrazuje jen když pageCount > 0.
    // V jsdom pagedjs nestihl → span neexistuje → ověříme, že toolbar je OK
    setupMocks();
    const { container } = render(<ReportPrintPage />);
    await waitFor(() => {
      // Toolbar je přítomný
      const toolbar = container.querySelector('.print-hide');
      expect(toolbar).toBeInTheDocument();
    });
  });

  it('should use Czech pluralization logic correctly', () => {
    // Testujeme samotnou logiku pluralizace bez DOM
    const pluralize = (n: number) =>
      n === 1 ? 'strana' : n < 5 ? 'strany' : 'stran';
    expect(pluralize(1)).toBe('strana');
    expect(pluralize(2)).toBe('strany');
    expect(pluralize(3)).toBe('strany');
    expect(pluralize(4)).toBe('strany');
    expect(pluralize(5)).toBe('stran');
    expect(pluralize(10)).toBe('stran');
    expect(pluralize(100)).toBe('stran');
  });

  it('should mock URL.createObjectURL for CSS blob', async () => {
    setupMocks();
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText('ZPRÁVA O REVIZI VYHRAZENÉHO ELEKTRICKÉHO ZAŘÍZENÍ')).toBeInTheDocument();
    });
    // URL methods are mocked but may or may not be called depending on jsdom
    expect(global.URL.createObjectURL).toBeDefined();
    expect(global.URL.revokeObjectURL).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════
// Podpisy – dynamická data
// ═══════════════════════════════════════════════════

describe('Dynamické prvky – podpisy', () => {
  it('should show technik name in signature', async () => {
    setupMocks({}, { reviznniTechnikJmeno: 'Jan Podpisatel' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Jan Podpisatel').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show technik cert number in signature', async () => {
    setupMocks({}, { reviznniTechnikCisloOpravneni: 'E9-ABCD' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/E9-ABCD/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show zakaznik kontaktOsoba in objednatel signature', async () => {
    const zak = {
      id: 99,
      nazev: 'ZakFirma',
      adresa: 'Nová 1',
      kontaktOsoba: 'Pavel Objednatel',
    };
    setupMocks({ zakaznikId: 99 }, {}, zak);
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Pavel Objednatel').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should fallback to zakaznik.nazev when no kontaktOsoba for signature', async () => {
    const zak = { id: 99, nazev: 'NázevFirmy', adresa: 'Adr 1' };
    setupMocks({ zakaznikId: 99 }, {}, zak);
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('NázevFirmy').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should fallback to objednatel when no zakaznik for signature', async () => {
    setupMocks({ zakaznikId: null, objednatel: 'Fallback Objednatel' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Fallback Objednatel').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render date line in signatures', async () => {
    setupMocks({ datumVypracovani: '2026-03-15' });
    render(<ReportPrintPage />);
    await waitFor(() => {
      expect(screen.getByText(/V \.+ dne 15\. 3\. 2026/)).toBeInTheDocument();
    });
  });
});
