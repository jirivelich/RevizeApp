import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createMock } = vi.hoisted(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  return { createMock: vi.fn() };
});

// Skutečné SDK (kvůli třídám chyb), jen messages.create je falešné – žádná reálná volání API.
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

import Anthropic from '@anthropic-ai/sdk';
import {
  AI_MODEL,
  analyzeRozvadecPhotos,
  buildReportPrompt,
  dataUrlToImageBlock,
  generateReport,
  getAIErrorMessage,
  getAutofillSuggestion,
  isAIConfigured,
  navrhniMistnosti,
  navrhniZarizeni,
  sanitizeMistnosti,
  sanitizeZarizeni,
  sanitizeChatMessages,
  sanitizeOkruhy,
} from '../ai';

const textResponse = (text: string, stop_reason = 'end_turn') => ({
  content: [{ type: 'thinking', thinking: '', signature: 'x' }, { type: 'text', text }],
  stop_reason,
});

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

const revizeData = {
  revize: { cisloRevize: 'R-1', nazev: 'Byt', adresa: 'Praha', typRevize: 'pravidelná', kategorieRevize: 'A', datum: '2026-01-01', termin: 60 },
  rozvadece: [{ id: 1, nazev: 'RB1', oznaceni: 'R1', umisteni: 'chodba', typRozvadece: 'bytový', stupenKryti: 'IP40' }],
  okruhy: [{ rozvadecId: 1, cislo: 1, nazev: 'Světla', jisticTyp: 'B', jisticProud: '10', izolacniOdpor: '>200', impedanceSmycky: null }],
  zavady: [{ zavaznost: 'C2', popis: 'Chybí kryt', norma: 'ČSN 33 2000-4-41', stav: 'otevřená' }],
  mistnosti: [],
  zarizeni: [],
  pristroje: [],
  nastaveni: null,
};

beforeEach(() => createMock.mockReset());

describe('konfigurace', () => {
  it('pozná nastavený klíč a má výchozí model', () => {
    expect(isAIConfigured()).toBe(true);
    expect(AI_MODEL).toBe('claude-opus-5-5');
  });
});

describe('generateReport', () => {
  it('posílá data revize a vrací text', async () => {
    createMock.mockResolvedValue(textResponse('Zařízení není schopno bezpečného provozu.'));
    const text = await generateReport(revizeData);
    expect(text).toBe('Zařízení není schopno bezpečného provozu.');
    const params = createMock.mock.calls[0][0];
    expect(params.model).toBe(AI_MODEL);
    expect(params.output_config.effort).toBe('medium');
    expect(params.thinking).toBeUndefined();
    expect(params.messages[0].content).toContain('[C2] Chybí kryt (ČSN 33 2000-4-41)');
  });

  it('prompt neobsahuje „undefined“ ani „null“ u chybějících hodnot', () => {
    const prompt = buildReportPrompt(revizeData);
    expect(prompt).not.toMatch(/undefined|null/);
    expect(prompt).toContain('[RB1] okruh 1: Světla, jistič B10');
  });

  it('refusal a max_tokens se převedou na srozumitelnou chybu', async () => {
    createMock.mockResolvedValue(textResponse('', 'refusal'));
    await expect(generateReport(revizeData)).rejects.toThrow('odmítla');
    createMock.mockResolvedValue(textResponse('abc', 'max_tokens'));
    await expect(generateReport(revizeData)).rejects.toThrow('useknuta');
  });
});

describe('chat', () => {
  it('sanitizeChatMessages vyhodí neplatné zprávy, chybové hlášky a úvodní odpovědi asistenta', () => {
    const out = sanitizeChatMessages([
      { role: 'assistant', content: 'Ahoj' },
      { role: 'system', content: 'hack' },
      { role: 'user', content: '  Dotaz  ' },
      { role: 'assistant', content: 'Chyba: Neplatný API klíč' },
      { role: 'user', content: '' },
      { role: 'user', content: 42 },
    ]);
    expect(out).toEqual([{ role: 'user', content: 'Dotaz' }]);
    expect(sanitizeChatMessages('nesmysl')).toEqual([]);
  });

});

describe('autofill', () => {
  it('používá structured output se schématem pro požadované pole', async () => {
    createMock.mockResolvedValue(textResponse(JSON.stringify({ popisZarizeni: 'Elektroinstalace bytu.' })));
    const out = await getAutofillSuggestion({ field: 'popisZarizeni', formData: { nazev: 'Byt', id: 5 }, entityType: 'revize' });
    expect(out).toEqual({ popisZarizeni: 'Elektroinstalace bytu.' });
    const params = createMock.mock.calls[0][0];
    expect(params.output_config.format.schema.required).toEqual(['popisZarizeni']);
    expect(params.messages[0].content).not.toContain('"id"');
  });

  it('základní údaje od technika jdou do promptu jako hlavní podklad', async () => {
    createMock.mockResolvedValue(textResponse(JSON.stringify({ popisZarizeni: 'Text' })));
    await getAutofillSuggestion({ field: 'popisZarizeni', formData: {}, entityType: 'revize', pokyny: 'RD, 2 podlaží, TN-C-S' });
    expect(createMock.mock.calls[0][0].messages[0].content).toContain('ZÁKLADNÍ ÚDAJE OD REVIZNÍHO TECHNIKA');
    expect(createMock.mock.calls[0][0].messages[0].content).toContain('RD, 2 podlaží, TN-C-S');
  });

  it('odmítne neplatný název pole bez volání API', async () => {
    await expect(getAutofillSuggestion({ field: '__proto__"', formData: {}, entityType: 'revize' })).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe('analýza fotografií', () => {
  it('dataUrlToImageBlock rozpozná podporované formáty', () => {
    expect(dataUrlToImageBlock(PNG)?.source).toEqual({ type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgo=' });
    expect(dataUrlToImageBlock('data:image/bmp;base64,AAAA')).toBeNull();
    expect(dataUrlToImageBlock('nesmysl')).toBeNull();
  });

  it('sanitizeOkruhy normalizuje hodnoty', () => {
    expect(sanitizeOkruhy([{ cislo: 0, nazev: '', jisticTyp: 'c16', jisticProud: '16A', pocetFazi: 2 }])).toEqual([
      { cislo: 1, nazev: 'Okruh 1', jisticTyp: 'C', jisticProud: '16', pocetFazi: 1 },
    ]);
    expect(sanitizeOkruhy(null)).toEqual([]);
  });

  it('vrátí okruhy ze structured outputu', async () => {
    createMock.mockResolvedValue(
      textResponse(JSON.stringify({ okruhy: [{ cislo: 1, nazev: 'Bojler', jisticTyp: 'B', jisticProud: '16', pocetFazi: 1 }] })),
    );
    const okruhy = await analyzeRozvadecPhotos([PNG], 'RB1');
    expect(okruhy).toHaveLength(1);
    const params = createMock.mock.calls[0][0];
    expect(params.messages[0].content[0].type).toBe('image');
    expect(params.output_config.format.type).toBe('json_schema');
  });

  it('nepodporovaný obrázek odmítne bez volání API', async () => {
    await expect(analyzeRozvadecPhotos(['data:image/bmp;base64,AAAA'], 'RB1')).rejects.toThrow('Nepodporovaný formát');
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe('návrh místností a zařízení', () => {
  it('sanitizeMistnosti opraví prostředí, plochu a vyhodí prázdné názvy', () => {
    expect(sanitizeMistnosti([
      { nazev: ' Koupelna ', patro: '1.NP', plocha: 6.456, prostredi: 'Zvlášť nebezpečné', poznamka: '' },
      { nazev: 'Kuchyň', patro: '', plocha: 0, prostredi: 'mokré', poznamka: '' },
      { nazev: '   ' },
    ])).toEqual([
      { nazev: 'Koupelna', patro: '1.NP', plocha: 6.46, prostredi: 'Zvlášť nebezpečné', poznamka: '' },
      { nazev: 'Kuchyň', patro: '', plocha: null, prostredi: 'Normální', poznamka: '' },
    ]);
  });

  it('sanitizeZarizeni normalizuje počet, třídu a příkon', () => {
    expect(sanitizeZarizeni([{ nazev: 'Zásuvka', oznaceni: 'Z1', pocetKs: 0, trida: 'X', prikonW: 0 }])).toEqual([
      { nazev: 'Zásuvka', oznaceni: 'Z1', pocetKs: 1, trida: 'I', prikonW: null },
    ]);
  });

  it('navrhniMistnosti posílá popis a schéma s výčtem prostředí', async () => {
    createMock.mockResolvedValue(textResponse(JSON.stringify({ mistnosti: [{ nazev: 'Obývák', patro: '1.NP', plocha: 0, prostredi: 'Normální', poznamka: '' }] })));
    const out = await navrhniMistnosti('RD, obývák', { nazev: 'RD Novák' });
    expect(out).toHaveLength(1);
    const params = createMock.mock.calls[0][0];
    expect(params.messages[0].content).toContain('RD, obývák');
    expect(params.output_config.format.schema.properties.mistnosti.items.properties.prostredi.enum).toContain('Zvlášť nebezpečné');
  });

  it('navrhniZarizeni předá existující zařízení, aby se neopakovala', async () => {
    createMock.mockResolvedValue(textResponse(JSON.stringify({ zarizeni: [] })));
    await navrhniZarizeni({ mistnost: { nazev: 'Kuchyň' }, existujici: ['Sporák'] });
    expect(createMock.mock.calls[0][0].messages[0].content).toContain('Sporák');
  });
});

describe('getAIErrorMessage', () => {
  const apiError = (Cls: any, status: number, message: string) =>
    new Cls(status, { type: 'error', error: { type: 'x', message } }, message, new Headers());

  it('mapuje typované chyby SDK na české hlášky', () => {
    expect(getAIErrorMessage(apiError(Anthropic.AuthenticationError, 401, 'invalid x-api-key')).message).toContain('Neplatný API klíč');
    expect(getAIErrorMessage(apiError(Anthropic.RateLimitError, 429, 'rate')).status).toBe(429);
    expect(getAIErrorMessage(apiError(Anthropic.BadRequestError, 400, 'Your credit balance is too low')).status).toBe(402);
    expect(getAIErrorMessage(apiError(Anthropic.InternalServerError, 500, 'boom')).status).toBe(503);
  });
});
