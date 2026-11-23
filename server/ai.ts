import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'your-api-key-here') {
      throw new Error('ANTHROPIC_API_KEY není nastavena. Přidejte platný klíč do server/.env');
    }
    client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
  return client;
}

export function isAIConfigured(): boolean {
  return !!ANTHROPIC_API_KEY && ANTHROPIC_API_KEY !== 'your-api-key-here';
}

/** Model lze přepsat proměnnou prostředí AI_MODEL (např. claude-sonnet-5-5 pro nižší cenu). */
export const AI_MODEL = process.env.AI_MODEL || 'claude-opus-5-5';

type Effort = 'low' | 'medium' | 'high';

/** Chyba, kterou lze bezpečně ukázat uživateli (česky). */
export class AIUserError extends Error {}

/**
 * Společné volání Messages API: ověří stop_reason a vrátí text odpovědi.
 * Thinking je u Claude Opus 5.5 vždy zapnuté (adaptive) – hloubku řídí `effort`.
 */
async function callClaude(params: {
  system: string;
  messages: Anthropic.MessageParam[];
  effort: Effort;
  maxTokens?: number;
  schema?: Record<string, unknown>;
}): Promise<string> {
  const ai = getAnthropicClient();
  const response = await ai.messages.create({
    model: AI_MODEL,
    max_tokens: params.maxTokens ?? 16000,
    system: params.system,
    messages: params.messages,
    output_config: {
      effort: params.effort,
      ...(params.schema ? { format: { type: 'json_schema' as const, schema: params.schema } } : {}),
    },
  });

  if (response.stop_reason === 'refusal') {
    throw new AIUserError('AI odmítla tento požadavek zpracovat. Zkuste ho přeformulovat.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new AIUserError('Odpověď AI byla příliš dlouhá a byla useknuta. Zkuste to znovu.');
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  if (!text) throw new AIUserError('AI nevrátila žádnou odpověď.');
  return text;
}

/** Převede chybu z AI na srozumitelnou českou hlášku (pro HTTP odpověď). */
export function getAIErrorMessage(error: unknown): { status: number; message: string } {
  if (error instanceof AIUserError) return { status: 502, message: error.message };
  if (error instanceof Anthropic.AuthenticationError) {
    return { status: 500, message: 'Neplatný API klíč. Zkontrolujte ANTHROPIC_API_KEY v server/.env' };
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return { status: 500, message: 'API klíč nemá oprávnění k tomuto modelu. Zkontrolujte nastavení účtu Anthropic.' };
  }
  if (error instanceof Anthropic.NotFoundError) {
    return { status: 500, message: `Model ${AI_MODEL} nebyl nalezen. Zkontrolujte proměnnou AI_MODEL.` };
  }
  if (error instanceof Anthropic.RateLimitError) {
    return { status: 429, message: 'Příliš mnoho požadavků na AI. Zkuste to za chvíli.' };
  }
  if (error instanceof Anthropic.BadRequestError) {
    if (/credit balance/i.test(error.message)) {
      return { status: 402, message: 'Nedostatečný kredit na Anthropic účtu. Dobijte kredit na https://console.anthropic.com/settings/plans' };
    }
    return { status: 400, message: `Neplatný požadavek na AI: ${error.message}` };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { status: 503, message: 'Nepodařilo se spojit s AI službou. Zkontrolujte připojení k internetu.' };
  }
  if (error instanceof Anthropic.APIError && (error.status ?? 0) >= 500) {
    return { status: 503, message: 'AI služba je dočasně nedostupná. Zkuste to za chvíli.' };
  }
  const message = (error as Error)?.message || 'Neznámá chyba';
  return { status: 500, message };
}

// ==================== SYSTÉMOVÉ PROMPTY ====================

const SYSTEM_REPORT = `Jsi zkušený revizní technik elektroinstalací v České republice. 
Tvým úkolem je na základě poskytnutých dat vytvořit profesionální text revizní zprávy podle ČSN 33 1500 a ČSN 33 2000-6.

Pravidla:
- Piš formálním technickým jazykem v češtině
- Používej správnou terminologii dle ČSN norem
- Závěr musí jednoznačně uvést, zda je zařízení schopno/neschopno bezpečného provozu
- Pokud existují závady C1 nebo C2, zařízení NENÍ schopno bezpečného provozu
- Závady C3 jsou informativní a nebrání provozu
- Uveď datum příští revize na základě termínu platnosti
- Nepoužívej markdown formátování (žádné # nebo **)
- Piš pouze text, který půjde přímo do revizní zprávy`;

const SYSTEM_AUTOFILL = `Jsi odborný asistent pro vyplňování formulářů revizních zpráv elektroinstalací.
Na základě kontextu (typ objektu, prostředí, kategorie revize) navrhni vhodnou hodnotu požadovaného pole formuláře.

Piš formálním technickým jazykem v češtině, se správnou terminologií dle ČSN.
Nepoužívej markdown formátování. Nevymýšlej konkrétní naměřené hodnoty ani údaje, které z kontextu nevyplývají.`;

// ==================== GENEROVÁNÍ ZPRÁVY ====================

interface RevizeData {
  revize: any;
  rozvadece: any[];
  okruhy: any[];
  zavady: any[];
  mistnosti: any[];
  zarizeni: any[];
  pristroje: any[];
  nastaveni: any;
  zakaznik?: any;
}

const val = (v: unknown, fallback = 'neuvedeno') =>
  v === null || v === undefined || v === '' ? fallback : String(v);

export function buildReportPrompt(data: RevizeData): string {
  const { revize } = data;
  const rozvadecNazev = new Map(data.rozvadece.map((r: any) => [r.id, r.nazev]));

  return `Na základě následujících dat revize vytvoř text závěru revizní zprávy.

ÚDAJE O REVIZI:
- Číslo revize: ${val(revize.cisloRevize)}
- Název: ${val(revize.nazev)}
- Adresa: ${val(revize.adresa)}
- Objednatel: ${val(data.zakaznik?.nazev ?? revize.objednatel)}
- Typ revize: ${val(revize.typRevize)}${revize.duvodMimoradne ? ` (důvod: ${revize.duvodMimoradne})` : ''}
- Kategorie: ${val(revize.kategorieRevize)}
- Datum: ${val(revize.datum)}
- Napěťová soustava: ${val(revize.napetovaSoustava)}
- Popis zařízení: ${val(revize.popisZarizeni)}
- Rozsah revize: ${val(revize.rozsahRevize)}

ROZVADĚČE (${data.rozvadece.length}):
${data.rozvadece.map((r: any) => `- ${val(r.nazev)} (${val(r.oznaceni, '-')}), umístění: ${val(r.umisteni)}, typ: ${val(r.typRozvadece)}, krytí: ${val(r.stupenKryti)}`).join('\n') || 'žádné'}

OKRUHY (${data.okruhy.length}):
${data.okruhy.map((o: any) => `- [${val(rozvadecNazev.get(o.rozvadecId), '?')}] okruh ${val(o.cislo, '?')}: ${val(o.nazev)}, jistič ${val(o.jisticTyp, '')}${val(o.jisticProud, '')}${o.vodic ? `, vodič ${o.vodic}` : ''}${o.izolacniOdpor ? `, iz. odpor ${o.izolacniOdpor} MΩ` : ''}${o.impedanceSmycky ? `, impedance smyčky ${o.impedanceSmycky} Ω` : ''}`).join('\n') || 'žádné'}

ZÁVADY (${data.zavady.length}):
${data.zavady.map((z: any) => `- [${val(z.zavaznost, '?')}] ${val(z.popis)}${z.norma ? ` (${z.norma})` : ''}, stav: ${val(z.stav)}`).join('\n') || 'žádné závady'}

MÍSTNOSTI (${data.mistnosti.length}):
${data.mistnosti.map((m: any) => `- ${val(m.nazev)}${m.prostredi ? `, prostředí: ${m.prostredi}` : ''}`).join('\n') || 'žádné'}

ZAŘÍZENÍ (${data.zarizeni.length}):
${data.zarizeni.map((z: any) => `- ${val(z.nazev)}, třída ${val(z.trida)}, stav: ${val(z.stav)}${z.prikonW ? `, příkon ${z.prikonW} W` : ''}`).join('\n') || 'žádná'}

MĚŘICÍ PŘÍSTROJE:
${data.pristroje.map((p: any) => `- ${val(p.nazev, '')} ${val(p.vyrobce, '')} ${val(p.model, '')}, v.č. ${val(p.vyrobniCislo)}, kalibrace platná do ${val(p.platnostKalibrace)}`).join('\n') || 'neuvedeny'}

Vytvoř:
1. Stručný závěr revize (2–4 odstavce)
2. Jasné vyjádření, zda je zařízení schopno/neschopno bezpečného provozu
3. Pokud jsou závady, uveď je v závěru
4. Datum příští revize (${val(revize.termin, '?')} měsíců od ${val(revize.datum, '?')})`;
}

export async function generateReport(data: RevizeData): Promise<string> {
  return callClaude({
    system: SYSTEM_REPORT,
    messages: [{ role: 'user', content: buildReportPrompt(data) }],
    effort: 'medium',
  });
}

// ==================== CHAT ASISTENT ====================

/** Soubor přiložený ke zprávě uživatele (smlouva, faktura, fotka štítku…). */
export interface ChatPriloha {
  nazev: string;
  typ: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  /** Obsah souboru v base64 (bez prefixu data:). */
  data: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  prilohy?: ChatPriloha[];
}

const MAX_CHAT_MESSAGES = 40;
const MAX_CHAT_CHARS = 8000;
export const PRILOHY_TYPY = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
/** Nejvýš tolik příloh v celé konverzaci (starší se zahodí). */
export const MAX_PRILOH = 5;
/** Limit jedné přílohy v base64 znacích (~15 MB souboru). */
export const MAX_PRILOHA_B64 = 20_000_000;
/** Limit všech příloh dohromady (API přijme požadavek do 32 MB). */
export const MAX_PRILOHY_CELKEM_B64 = 28_000_000;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function sanitizePrilohy(input: unknown): ChatPriloha[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((p: any) =>
      p && typeof p.data === 'string' && (PRILOHY_TYPY as readonly string[]).includes(p.typ)
      && p.data.length > 0 && p.data.length <= MAX_PRILOHA_B64 && BASE64_RE.test(p.data.slice(0, 4096)))
    .map((p: any) => ({
      nazev: (typeof p.nazev === 'string' && p.nazev.trim() ? p.nazev.trim() : 'soubor').slice(0, 120),
      typ: p.typ,
      data: p.data,
    }));
}

/** Ověří a očistí historii chatu z klienta (role, délka, střídání, začíná uživatelem, přílohy). */
export function sanitizeChatMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  const cleaned: ChatMessage[] = input
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m: any) => {
      const prilohy = m.role === 'user' ? sanitizePrilohy(m.prilohy) : [];
      const content = m.content.trim().slice(0, MAX_CHAT_CHARS) || (prilohy.length ? 'Zpracuj přiložený dokument.' : '');
      return prilohy.length ? { role: m.role, content, prilohy } : { role: m.role, content };
    })
    .filter((m) => m.content.length > 0)
    // chybové hlášky z UI („Chyba: …“) neposílat zpět modelu
    .filter((m) => !(m.role === 'assistant' && m.content.startsWith('Chyba:')))
    .slice(-MAX_CHAT_MESSAGES);
  while (cleaned.length && cleaned[0].role !== 'user') cleaned.shift();

  // Limit počtu a velikosti příloh – ponechat nejnovější
  let pocet = 0;
  let velikost = 0;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    const m = cleaned[i];
    if (!m.prilohy) continue;
    const ponechat: ChatPriloha[] = [];
    for (let j = m.prilohy.length - 1; j >= 0; j--) {
      const p = m.prilohy[j];
      if (pocet < MAX_PRILOH && velikost + p.data.length <= MAX_PRILOHY_CELKEM_B64) {
        ponechat.unshift(p);
        pocet++;
        velikost += p.data.length;
      }
    }
    if (ponechat.length) m.prilohy = ponechat; else delete m.prilohy;
  }
  return cleaned;
}

// ==================== AUTO-VYPLŇOVÁNÍ ====================

interface AutofillContext {
  field: string; // název pole k vyplnění
  formData: Record<string, any>; // aktuální data formuláře
  entityType: string; // typ entity (revize, mistnost, rozvadec, zarizeni)
  pokyny?: string; // základní údaje / pokyny od technika
}

/** Název pole musí být jednoduchý identifikátor (používá se jako klíč v JSON schématu). */
export const AUTOFILL_FIELD_RE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

/** Pole, která do promptu nepatří (velká, technická nebo citlivá). */
const AUTOFILL_SKIP_KEYS = new Set(['id', 'createdAt', 'updatedAt', 'tiskSekce', 'fotky', 'logo', 'podpis']);

export async function getAutofillSuggestion(context: AutofillContext): Promise<Record<string, string>> {
  if (!AUTOFILL_FIELD_RE.test(context.field)) {
    throw new AIUserError('Neplatný název pole.');
  }

  const relevantData = Object.fromEntries(
    Object.entries(context.formData || {}).filter(
      ([k, v]) => !AUTOFILL_SKIP_KEYS.has(k) && k !== context.field && v !== null && v !== '' && (typeof v !== 'string' || v.length < 2000)
    )
  );

  const prompt = `Pro formulář typu "${context.entityType}" navrhni hodnotu pole "${context.field}".

Aktuální data formuláře:
${JSON.stringify(relevantData, null, 2)}

${context.pokyny?.trim() ? `ZÁKLADNÍ ÚDAJE OD REVIZNÍHO TECHNIKA (hlavní podklad – vycházej především z nich, nic si nevymýšlej):\n${context.pokyny.trim().slice(0, 4000)}\n\n` : ''}${context.formData?.[context.field] ? `Současná hodnota pole (můžeš ji vylepšit/doplnit):\n${String(context.formData[context.field]).slice(0, 2000)}\n\n` : ''}Navrhni pouze text, který dává smysl v kontextu elektrotechnických revizí a přímo se vloží do formuláře.`;

  const text = await callClaude({
    system: SYSTEM_AUTOFILL,
    messages: [{ role: 'user', content: prompt }],
    effort: 'low',
    schema: {
      type: 'object',
      properties: { [context.field]: { type: 'string' } },
      required: [context.field],
      additionalProperties: false,
    },
  });

  try {
    const parsed = JSON.parse(text);
    const value = parsed?.[context.field];
    return typeof value === 'string' && value.trim() ? { [context.field]: value.trim() } : {};
  } catch {
    throw new AIUserError('AI vrátila neplatnou odpověď. Zkuste to znovu.');
  }
}

// ==================== ANALÝZA FOTOGRAFIÍ ROZVADĚČE ====================

const SYSTEM_PHOTO_ANALYSIS = `Jsi expert na elektrotechniku a revize rozvaděčů v České republice.
Tvým úkolem je z fotografie rozvaděče identifikovat jističe a okruhy.

Pro každý viditelný jistič/okruh identifikuj:
- cislo: pořadové číslo okruhu (integer, počínaje 1)
- nazev: popis okruhu/spotřebiče (např. "Osvětlení 1.NP", "Zásuvky kuchyň", "Bojler")
- jisticTyp: vypínací charakteristika jističe (typicky "B", "C" nebo "D" – pouze písmeno bez proudu)
- jisticProud: jmenovitý proud jističe jako string (např. "16", "10", "20", "32", "63")
- pocetFazi: počet fází (1 nebo 3, integer)

Pravidla:
- Pokud není údaj čitelný z fotky, odhadni rozumnou hodnotu dle kontextu
- Typické hodnoty: typ B nebo C, proudy 6/10/16/20/25/32 A, 1 fáze
- Třífázové okruhy mají typicky 3pólový jistič (viditelné 3 páčky)
- Seřaď okruhy dle jejich fyzického pořadí na DIN liště zleva/shora
- Pokud je fotka nečitelná, vrať prázdný seznam okruhů`;

const PHOTO_SCHEMA = {
  type: 'object',
  properties: {
    okruhy: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          cislo: { type: 'integer' },
          nazev: { type: 'string' },
          jisticTyp: { type: 'string' },
          jisticProud: { type: 'string' },
          pocetFazi: { type: 'integer' },
        },
        required: ['cislo', 'nazev', 'jisticTyp', 'jisticProud', 'pocetFazi'],
        additionalProperties: false,
      },
    },
  },
  required: ['okruhy'],
  additionalProperties: false,
};

export interface OkruhNavrhAI {
  cislo: number;
  nazev: string;
  jisticTyp: string;
  jisticProud: string;
  pocetFazi: number;
}

const IMAGE_DATA_URL_RE = /^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/=\s]+)$/;

/** Převede data URL na image blok; vrací null pro nepodporovaný formát. */
export function dataUrlToImageBlock(dataUrl: string): Anthropic.ImageBlockParam | null {
  const match = typeof dataUrl === 'string' ? dataUrl.match(IMAGE_DATA_URL_RE) : null;
  if (!match) return null;
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      data: match[2].replace(/\s/g, ''),
    },
  };
}

/** Normalizuje výstup modelu na bezpečné hodnoty pro uložení okruhů. */
export function sanitizeOkruhy(raw: unknown): OkruhNavrhAI[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any, idx: number) => {
    const typ = String(item?.jisticTyp ?? '').toUpperCase().match(/[A-DKZ]/)?.[0] ?? 'B';
    const proud = String(item?.jisticProud ?? '').match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.') ?? '16';
    return {
      cislo: Number.isInteger(item?.cislo) && item.cislo > 0 ? item.cislo : idx + 1,
      nazev: String(item?.nazev || `Okruh ${idx + 1}`).slice(0, 200),
      jisticTyp: typ,
      jisticProud: proud,
      pocetFazi: item?.pocetFazi === 3 ? 3 : 1,
    };
  });
}

export async function analyzeRozvadecPhotos(
  images: string[],
  rozvadecNazev: string,
): Promise<OkruhNavrhAI[]> {
  const imageBlocks = images.map(dataUrlToImageBlock);
  if (imageBlocks.some((b) => b === null)) {
    throw new AIUserError('Nepodporovaný formát fotografie. Použijte JPEG, PNG, GIF nebo WebP.');
  }

  const content: Anthropic.ContentBlockParam[] = [
    ...(imageBlocks as Anthropic.ImageBlockParam[]),
    {
      type: 'text',
      text: `Analyzuj ${images.length > 1 ? 'tyto fotografie rozvaděče' : 'tuto fotografii rozvaděče'} "${rozvadecNazev}".
Identifikuj všechny jističe a jejich okruhy.`,
    },
  ];

  const text = await callClaude({
    system: SYSTEM_PHOTO_ANALYSIS,
    messages: [{ role: 'user', content }],
    effort: 'medium',
    schema: PHOTO_SCHEMA,
  });

  try {
    return sanitizeOkruhy(JSON.parse(text)?.okruhy);
  } catch {
    throw new AIUserError('AI vrátila neplatnou odpověď. Zkuste to znovu.');
  }
}

// ==================== NÁVRH MÍSTNOSTÍ A ZAŘÍZENÍ ====================

export const PROSTREDI = ['Normální', 'Nebezpečné', 'Zvlášť nebezpečné'] as const;

const SYSTEM_MISTNOSTI = `Jsi zkušený revizní technik elektroinstalací v České republice.
Z popisu objektu od technika sestav seznam místností pro revizní zprávu.

Pravidla:
- Vytvoř místnosti jen podle popisu; pokud technik uvede počet (např. "3 ložnice"), vytvoř je jednotlivě a očísluj ("Ložnice 1", "Ložnice 2"…)
- Běžné místnosti (chodba, WC, technická místnost…) doplň jen tehdy, když to popis naznačuje (např. "rodinný dům" bez výčtu)
- patro: zkratka podlaží ve tvaru "1.PP", "1.NP", "2.NP", "podkroví"; pokud podlaží neznáš, prázdný řetězec
- plocha: v m² jako číslo, pokud ji technik uvedl; jinak 0
- prostredi dle ČSN 33 2000-1 / ČSN 33 2000-7-701: koupelna, sprcha, prádelna, venkovní prostory, sauna, garáž s rizikem → "Nebezpečné" nebo "Zvlášť nebezpečné" (prostor se sprchou/vanou, sauna, bazén → "Zvlášť nebezpečné"); obytné místnosti → "Normální"
- poznamka: krátce jen pokud z popisu plyne něco podstatného (např. "zóny dle ČSN 33 2000-7-701"), jinak prázdný řetězec
- Názvy piš česky s velkým počátečním písmenem`;

const MISTNOSTI_SCHEMA = {
  type: 'object',
  properties: {
    mistnosti: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nazev: { type: 'string' },
          patro: { type: 'string' },
          plocha: { type: 'number' },
          prostredi: { type: 'string', enum: [...PROSTREDI] },
          poznamka: { type: 'string' },
        },
        required: ['nazev', 'patro', 'plocha', 'prostredi', 'poznamka'],
        additionalProperties: false,
      },
    },
  },
  required: ['mistnosti'],
  additionalProperties: false,
};

export interface MistnostNavrhAI {
  nazev: string;
  patro: string;
  plocha: number | null;
  prostredi: (typeof PROSTREDI)[number];
  poznamka: string;
}

export function sanitizeMistnosti(raw: unknown): MistnostNavrhAI[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m: any) => m && typeof m.nazev === 'string' && m.nazev.trim())
    .slice(0, 100)
    .map((m: any) => {
      const plocha = typeof m.plocha === 'number' && Number.isFinite(m.plocha) && m.plocha > 0 ? Math.round(m.plocha * 100) / 100 : null;
      return {
        nazev: m.nazev.trim().slice(0, 120),
        patro: typeof m.patro === 'string' ? m.patro.trim().slice(0, 30) : '',
        plocha,
        prostredi: (PROSTREDI as readonly string[]).includes(m.prostredi) ? m.prostredi : 'Normální',
        poznamka: typeof m.poznamka === 'string' ? m.poznamka.trim().slice(0, 300) : '',
      };
    });
}

export async function navrhniMistnosti(popis: string, revize?: any): Promise<MistnostNavrhAI[]> {
  const kontext = revize
    ? `Revize: ${val(revize.nazev)}, adresa: ${val(revize.adresa)}, popis zařízení: ${val(revize.popisZarizeni)}\n\n`
    : '';
  const text = await callClaude({
    system: SYSTEM_MISTNOSTI,
    messages: [{ role: 'user', content: `${kontext}POPIS OBJEKTU OD TECHNIKA:\n${popis.slice(0, 4000)}` }],
    effort: 'low',
    schema: MISTNOSTI_SCHEMA,
  });
  try {
    return sanitizeMistnosti(JSON.parse(text)?.mistnosti);
  } catch {
    throw new AIUserError('AI vrátila neplatnou odpověď. Zkuste to znovu.');
  }
}

const SYSTEM_ZARIZENI = `Jsi zkušený revizní technik elektroinstalací v České republice.
Pro zadanou místnost navrhni seznam elektrických zařízení (předmětů), která se v revizní zprávě u místnosti uvádějí:
zásuvky, svítidla, vypínače, pevně připojené spotřebiče (bojler, sporák, digestoř, myčka, pračka, ventilátor, topení…).

Pravidla:
- Pokud technik zařízení vyjmenuje, drž se jeho výčtu a počtů; jinak navrhni obvyklé vybavení daného typu místnosti
- Stejná zařízení seskup do jedné položky s počtem kusů (např. "Zásuvka 230 V", pocetKs 4)
- oznaceni: krátké označení (Z1, S1, V1, B1…), jinak prázdný řetězec
- trida: třída ochrany dle ČSN EN 61140 – "I" (s ochranným vodičem: zásuvky, kovová svítidla, bojler, sporák, pračka), "II" (dvojitá izolace: plastová svítidla, vypínače, digestoř bývá I), "III" (malé napětí SELV/PELV)
- prikonW: jmenovitý příkon ve W, jen když je typický a jednoznačný (bojler 2000, sporák…); u zásuvek a vypínačů 0
- Nevymýšlej zařízení, která v místnosti daného typu běžně nebývají
- Nevracej zařízení, která už v místnosti jsou (seznam je uveden)`;

const ZARIZENI_SCHEMA = {
  type: 'object',
  properties: {
    zarizeni: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nazev: { type: 'string' },
          oznaceni: { type: 'string' },
          pocetKs: { type: 'integer' },
          trida: { type: 'string', enum: ['I', 'II', 'III'] },
          prikonW: { type: 'number' },
        },
        required: ['nazev', 'oznaceni', 'pocetKs', 'trida', 'prikonW'],
        additionalProperties: false,
      },
    },
  },
  required: ['zarizeni'],
  additionalProperties: false,
};

export interface ZarizeniNavrhAI {
  nazev: string;
  oznaceni: string;
  pocetKs: number;
  trida: 'I' | 'II' | 'III';
  prikonW: number | null;
}

export function sanitizeZarizeni(raw: unknown): ZarizeniNavrhAI[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((z: any) => z && typeof z.nazev === 'string' && z.nazev.trim())
    .slice(0, 100)
    .map((z: any) => ({
      nazev: z.nazev.trim().slice(0, 120),
      oznaceni: typeof z.oznaceni === 'string' ? z.oznaceni.trim().slice(0, 20) : '',
      pocetKs: Number.isInteger(z.pocetKs) && z.pocetKs > 0 ? Math.min(z.pocetKs, 999) : 1,
      trida: z.trida === 'II' || z.trida === 'III' ? z.trida : 'I',
      prikonW: typeof z.prikonW === 'number' && Number.isFinite(z.prikonW) && z.prikonW > 0 ? Math.round(z.prikonW) : null,
    }));
}

export async function navrhniZarizeni(params: {
  mistnost: { nazev?: string; patro?: string; prostredi?: string; poznamka?: string };
  popis?: string;
  existujici?: string[];
}): Promise<ZarizeniNavrhAI[]> {
  const { mistnost } = params;
  const existujici = (params.existujici || []).filter((s) => typeof s === 'string').slice(0, 100);
  const prompt = `MÍSTNOST: ${val(mistnost.nazev)}
- Patro: ${val(mistnost.patro)}
- Prostředí: ${val(mistnost.prostredi, 'Normální')}${mistnost.poznamka ? `\n- Poznámka: ${mistnost.poznamka}` : ''}

Zařízení, která už v místnosti jsou: ${existujici.length ? existujici.join(', ') : 'žádná'}

${params.popis?.trim() ? `POPIS OD TECHNIKA (hlavní podklad):\n${params.popis.trim().slice(0, 4000)}` : 'Technik nic nepopsal – navrhni obvyklé vybavení tohoto typu místnosti.'}`;

  const text = await callClaude({
    system: SYSTEM_ZARIZENI,
    messages: [{ role: 'user', content: prompt }],
    effort: 'low',
    schema: ZARIZENI_SCHEMA,
  });
  try {
    return sanitizeZarizeni(JSON.parse(text)?.zarizeni);
  } catch {
    throw new AIUserError('AI vrátila neplatnou odpověď. Zkuste to znovu.');
  }
}
