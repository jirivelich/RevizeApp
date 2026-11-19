import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createMock } = vi.hoisted(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  return { createMock: vi.fn() };
});

vi.mock('../database', () => ({ pool: { query: vi.fn() } }));

vi.mock('@anthropic-ai/sdk', async (importOriginal) => {
  const actual: any = await importOriginal();
  class MockAnthropic extends actual.default {
    constructor(opts: any) {
      super(opts);
      (this as any).messages = { create: createMock };
    }
  }
  return { ...actual, default: MockAnthropic };
});

import { chatSDaty, runTool, CHAT_TOOLS, type ChatDeps, type ChatAkce } from '../aiChat';

const toolUse = (id: string, name: string, input: Record<string, unknown>) => ({
  content: [{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'tool_use', id, name, input }],
  stop_reason: 'tool_use',
});
const text = (t: string) => ({ content: [{ type: 'text', text: t }], stop_reason: 'end_turn' });

function makeDeps(rows: Record<string, any[]> = {}): ChatDeps & { query: ReturnType<typeof vi.fn> } {
  const query = vi.fn(async (sql: string) => {
    for (const [key, r] of Object.entries(rows)) if (sql.includes(key)) return { rows: r };
    return { rows: [] };
  });
  return {
    query,
    vytvorRevizi: vi.fn(async () => 11),
    vytvorZavadu: vi.fn(async () => 22),
    vytvorZakazku: vi.fn(async () => 33),
    vytvorZakaznika: vi.fn(async () => 44),
    upravRevizi: vi.fn(async () => {}),
    upravZavadu: vi.fn(async () => {}),
    upravZakazku: vi.fn(async () => {}),
  } as any;
}

beforeEach(() => createMock.mockReset());

describe('chatSDaty – smyčka nástrojů', () => {
  it('zavolá nástroj, vrátí výsledek modelu a pak finální odpověď', async () => {
    const deps = makeDeps({ 'FROM zakaznik z': [{ id: 1, nazev: 'Jan Novák', telefon: null }] });
    createMock
      .mockResolvedValueOnce(toolUse('t1', 'hledej_zakazniky', { dotaz: 'Novák' }))
      .mockResolvedValueOnce(text('Našel jsem zákazníka Jan Novák.'));

    const out = await chatSDaty([{ role: 'user', content: 'Najdi Nováka' }], deps, { dnes: '2026-11-19' });

    expect(out).toEqual({ reply: 'Našel jsem zákazníka Jan Novák.', akce: [] });
    expect(deps.query.mock.calls[0][1]).toEqual(['%Novák%']);
    const second = createMock.mock.calls[1][0];
    // assistant odpověď vrácena beze změny (včetně thinking), výsledek nástroje v další user zprávě
    expect(second.messages[1].content[0].type).toBe('thinking');
    const result = second.messages[2].content[0];
    expect(result).toMatchObject({ type: 'tool_result', tool_use_id: 't1' });
    expect(JSON.parse(result.content).zakaznici[0]).toEqual({ id: 1, nazev: 'Jan Novák' });
    expect(second.tools).toBe(CHAT_TOOLS);
    expect(second.system).toContain('Dnešní datum: 2026-11-19');
  });

  it('zapisovací nástroj vrátí akci s odkazem', async () => {
    const deps = makeDeps({ 'FROM revize WHERE id': [{ id: 5, cisloRevize: '202611190900' }] });
    createMock
      .mockResolvedValueOnce(toolUse('t1', 'pridej_zavadu', { revizeId: 5, popis: 'Chybí kryt rozvaděče', zavaznost: 'C2', norma: 'ČSN 33 2000-4-41' }))
      .mockResolvedValueOnce(text('Závada přidána.'));

    const out = await chatSDaty([{ role: 'user', content: 'ano, přidej' }], deps, { dnes: '2026-11-19', revizeId: 5 });

    expect(deps.vytvorZavadu).toHaveBeenCalledWith(expect.objectContaining({ revizeId: 5, zavaznost: 'C2', stav: 'otevřená', typ: 'zavada' }));
    expect(out.akce).toEqual([{ typ: 'zavada', id: 22, popis: 'Závada C2 v revizi 202611190900', odkaz: '/revize/5?zalozka=zavady' }]);
    expect(createMock.mock.calls[0][0].system).toContain('revizi s id 5');
  });

  it('chybný vstup nástroje vrátí modelu is_error a pokračuje', async () => {
    const deps = makeDeps();
    createMock
      .mockResolvedValueOnce(toolUse('t1', 'vytvor_udalost', { nazev: 'Revize', klient: 'Novák', adresa: 'Praha', datum: 'zítra' }))
      .mockResolvedValueOnce(text('Upřesněte prosím datum.'));

    const out = await chatSDaty([{ role: 'user', content: 'naplánuj' }], deps);
    expect(out.reply).toBe('Upřesněte prosím datum.');
    expect(deps.vytvorZakazku).not.toHaveBeenCalled();
    expect(createMock.mock.calls[1][0].messages[2].content[0]).toMatchObject({ is_error: true });
  });

  it('refusal skončí srozumitelnou chybou', async () => {
    createMock.mockResolvedValueOnce({ content: [], stop_reason: 'refusal' });
    await expect(chatSDaty([{ role: 'user', content: 'x' }], makeDeps())).rejects.toThrow('odmítla');
  });
});

describe('runTool – zapisovací nástroje', () => {
  it('pridej_zavadu respektuje zámek dokončené revize', async () => {
    const deps = makeDeps({ 'FROM revize WHERE id': [{ id: 5, cisloRevize: 'R5', stav: 'dokončeno' }] });
    await expect(runTool('pridej_zavadu', { revizeId: 5, popis: 'x', zavaznost: 'C1' }, deps, [], '2026-11-19')).rejects.toThrow('zamčená');
    expect(deps.vytvorZavadu).not.toHaveBeenCalled();
  });

  it('vytvor_revizi doplní výchozí hodnoty a objednatele ze zákazníka', async () => {
    const deps = makeDeps({ 'SELECT nazev FROM zakaznik': [{ nazev: 'ACME s.r.o.' }] });
    const akce: ChatAkce[] = [];
    const out: any = await runTool('vytvor_revizi', { nazev: 'Hala', adresa: 'Brno', zakaznikId: 3 }, deps, akce, '2026-11-19');
    expect(deps.vytvorRevizi).toHaveBeenCalledWith(expect.objectContaining({
      nazev: 'Hala', adresa: 'Brno', objednatel: 'ACME s.r.o.', datum: '2026-11-19', termin: 36,
      typRevize: 'pravidelná', stav: 'rozpracováno', kategorieRevize: 'elektro',
    }));
    expect(out.cisloRevize).toMatch(/^\d{12}$/);
    expect(deps.query).toHaveBeenCalledWith('UPDATE revize SET "zakaznikId" = $1 WHERE id = $2', [3, 11]);
    expect(akce[0].odkaz).toBe('/revize/11');
  });

  it('vytvor_udalost u celodenní události nepošle čas', async () => {
    const deps = makeDeps();
    const akce: ChatAkce[] = [];
    await runTool('vytvor_udalost', { nazev: 'Revize', klient: 'Novák', adresa: 'Praha', datum: '2026-11-20', cas: '08:00', celyDen: true }, deps, akce, '2026-11-19');
    expect(deps.vytvorZakazku).toHaveBeenCalledWith(expect.objectContaining({ datumPlanovany: '2026-11-20', casPlanovany: null, celyDen: true, stav: 'plánováno' }));
    expect(akce[0].popis).toBe('Událost Revize (20. 11. 2026)');
  });

  it('hledání escapuje zástupné znaky LIKE', async () => {
    const deps = makeDeps();
    await runTool('hledej_revize', { dotaz: '100%_' }, deps, [], '2026-11-19');
    expect(deps.query.mock.calls[0][1]).toEqual(['%100\\%\\_%']);
  });
});

describe('runTool – rozvaděče, okruhy, místnosti, zařízení', () => {
  const odemcena = { 'FROM revize WHERE id': [{ id: 7, cisloRevize: 'R7', stav: 'rozpracováno' }] };

  it('pridej_okruhy naváže čísla, sestaví vodič a sjednotí jistič', async () => {
    const deps = makeDeps({
      ...odemcena,
      'FROM rozvadec WHERE id': [{ id: 3, revizeId: 7, nazev: 'RB1' }],
      'MAX(cislo)': [{ max: 4 }],
      'INSERT INTO okruh': [{ id: 100 }],
    });
    const akce: ChatAkce[] = [];
    await runTool('pridej_okruhy', {
      rozvadecId: 3,
      okruhy: [
        { nazev: 'Světla', jisticTyp: 'b', jisticProud: 10, typKabelu: 'CYKY', pocetZil: '3', prurez: '1.5' },
        { nazev: 'Sporák', jisticTyp: 'B', jisticProud: '16 A', pocetFazi: 3 },
      ],
    }, deps, akce, '2026-11-19');
    const inserts = deps.query.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO okruh'));
    expect(inserts[0][1]).toEqual([3, 5, 'Světla', 'B', '10A', 1, 'CYKY 3x1,5', 'CYKY', '3', '1,5', null]);
    expect(inserts[1][1].slice(1, 7)).toEqual([6, 'Sporák', 'B', '16A', 3, null]);
    expect(akce[0]).toMatchObject({ typ: 'okruh', popis: '2 okruhy v rozvaděči RB1', odkaz: '/revize/7?zalozka=rozvadece' });
  });

  it('pridej_zarizeni doplní ochranu před dotykem podle třídy a počtu', async () => {
    const deps = makeDeps({
      ...odemcena,
      'FROM mistnost WHERE id': [{ id: 9, revizeId: 7, nazev: 'Kuchyň' }],
      'INSERT INTO zarizeni': [{ id: 200 }],
    });
    await runTool('pridej_zarizeni', { mistnostId: 9, zarizeni: [{ nazev: 'Zásuvka', pocetKs: 4 }, { nazev: 'Svítidlo', trida: 'II' }] }, deps, [], '2026-11-19');
    const inserts = deps.query.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO zarizeni'));
    expect(inserts[0][1].slice(3, 8)).toEqual([4, 'I', null, 'max.', 'nekontrolováno']);
    expect(inserts[1][1].slice(3, 8)).toEqual([1, 'II', null, 'izolací', 'nekontrolováno']);
  });

  it('zamčená revize nepustí rozvaděč ani místnosti', async () => {
    const deps = makeDeps({ 'FROM revize WHERE id': [{ id: 7, cisloRevize: 'R7', stav: 'schváleno' }] });
    await expect(runTool('vytvor_rozvadec', { revizeId: 7, nazev: 'RH' }, deps, [], '2026-11-19')).rejects.toThrow('zamčená');
    await expect(runTool('vytvor_mistnosti', { revizeId: 7, mistnosti: [{ nazev: 'WC' }] }, deps, [], '2026-11-19')).rejects.toThrow('zamčená');
    expect(deps.query.mock.calls.some(([sql]) => String(sql).includes('INSERT'))).toBe(false);
  });

  it('položka bez názvu se odmítne celá', async () => {
    const deps = makeDeps(odemcena);
    await expect(runTool('vytvor_mistnosti', { revizeId: 7, mistnosti: [{ nazev: 'WC' }, { patro: '1.NP' }] }, deps, [], '2026-11-19')).rejects.toThrow('název');
  });
});

describe('runTool – úpravy', () => {
  const odemcena = { 'FROM revize WHERE id': [{ id: 7, cisloRevize: 'R7', stav: 'rozpracováno' }] };

  it('uprav_okruhy zapíše měření podle čísla okruhu a přepočítá vodič', async () => {
    const deps = makeDeps({
      ...odemcena,
      'FROM rozvadec WHERE id': [{ id: 3, revizeId: 7, nazev: 'RB1' }],
      'FROM okruh WHERE "rozvadecId"': [
        { id: 31, cislo: 1, typKabelu: 'CYKY', pocetZil: '3', prurez: '1,5' },
        { id: 32, cislo: 2, typKabelu: null, pocetZil: null, prurez: null },
      ],
    });
    const akce: ChatAkce[] = [];
    await runTool('uprav_okruhy', { rozvadecId: 3, okruhy: [
      { cislo: 1, izolacniOdpor: '250 MΩ', impedanceSmycky: 0.45, prurez: '2.5' },
      { cislo: 2, izolacniOdpor: '>200' },
    ] }, deps, akce, '2026-11-19');
    const upd = deps.query.mock.calls.filter(([sql]) => String(sql).startsWith('UPDATE okruh'));
    expect(upd[0][0]).toBe('UPDATE okruh SET "prurez" = $1, "izolacniOdpor" = $2, "impedanceSmycky" = $3, "vodic" = $4 WHERE id = $5');
    expect(upd[0][1]).toEqual(['2,5', '250', '0,45', 'CYKY 3x2,5', 31]);
    expect(upd[1][1]).toEqual(['>200', 32]);
    expect(akce[0].popis).toBe('Upraveny okruhy 1, 2 v rozvaděči RB1');
  });

  it('uprav_okruhy odmítne neexistující číslo okruhu', async () => {
    const deps = makeDeps({ ...odemcena, 'FROM rozvadec WHERE id': [{ id: 3, revizeId: 7, nazev: 'RB1' }], 'FROM okruh WHERE "rozvadecId"': [{ id: 31, cislo: 1 }] });
    await expect(runTool('uprav_okruhy', { rozvadecId: 3, okruhy: [{ cislo: 9, izolacniOdpor: '1' }] }, deps, [], '2026-11-19')).rejects.toThrow('č. 9');
  });

  it('uprav_zavadu jako vyřešenou doplní datum a jde přes audit', async () => {
    const deps = makeDeps({ ...odemcena, 'FROM zavada WHERE id': [{ id: 5, revizeId: 7 }] });
    await runTool('uprav_zavadu', { id: 5, stav: 'vyřešená' }, deps, [], '2026-11-19');
    expect(deps.upravZavadu).toHaveBeenCalledWith(5, { stav: 'vyřešená', datumVyreseni: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
  });

  it('uprav_udalost přesune termín přes validaci zakázek', async () => {
    const deps = makeDeps({ 'FROM zakazka WHERE id': [{ id: 2, nazev: 'Revize' }] });
    await runTool('uprav_udalost', { id: 2, datum: '2026-11-27', cas: '10:00' }, deps, [], '2026-11-19');
    expect(deps.upravZakazku).toHaveBeenCalledWith(2, { datumPlanovany: '2026-11-27', casPlanovany: '10:00' });
  });

  it('úprava v zamčené revizi se odmítne', async () => {
    const deps = makeDeps({ 'FROM revize WHERE id': [{ id: 7, cisloRevize: 'R7', stav: 'dokončeno' }], 'FROM mistnost WHERE id': [{ id: 1, revizeId: 7, nazev: 'WC' }] });
    await expect(runTool('uprav_mistnost', { id: 1, nazev: 'Toaleta' }, deps, [], '2026-11-19')).rejects.toThrow('zamčená');
    await expect(runTool('uprav_revizi', { id: 7, zaver: 'x' }, deps, [], '2026-11-19')).rejects.toThrow('zamčená');
  });
});
