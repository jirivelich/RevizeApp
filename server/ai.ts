import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;

function getClient(): Anthropic {
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
  const ai = getClient();
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

const SYSTEM_CHAT = `Jsi odborný asistent pro revizní techniky elektroinstalací v České republice.

Tvé znalosti zahrnují:
- ČSN 33 1500 (Revize elektrických zařízení)
- ČSN 33 2000-6 (Ověřování)
- ČSN 33 2000-4-41 (Ochrana před úrazem elektrickým proudem)
- ČSN 33 2000-5-54 (Uzemnění a ochranné vodiče)
- ČSN EN 62305 (Ochrana před bleskem)
- Zákon 458/2000 Sb. (Energetický zákon)
- Vyhláška 50/1978 Sb. (Odborná způsobilost v elektrotechnice)
- NV 190/2022 Sb.
- Praktické postupy měření (izolační odpor, impedance smyčky, proudové chrániče)

Pravidla:
- Odpovídej stručně a věcně v češtině
- Odkazuj na konkrétní normy a články kde je to relevantní
- Pokud si nejsi jistý, řekni to
- Pomáhej s vyplňováním revizních zpráv, klasifikací závad, měřeními
- Nepoužívej markdown formátování`;

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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_CHAT_MESSAGES = 40;
const MAX_CHAT_CHARS = 8000;

/** Ověří a očistí historii chatu z klienta (role, délka, střídání, začíná uživatelem). */
export function sanitizeChatMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  const cleaned = input
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m: any) => ({ role: m.role as ChatMessage['role'], content: m.content.trim().slice(0, MAX_CHAT_CHARS) }))
    .filter((m) => m.content.length > 0)
    // chybové hlášky z UI („Chyba: …“) neposílat zpět modelu
    .filter((m) => !(m.role === 'assistant' && m.content.startsWith('Chyba:')))
    .slice(-MAX_CHAT_MESSAGES);
  while (cleaned.length && cleaned[0].role !== 'user') cleaned.shift();
  return cleaned;
}

export async function chatWithAssistant(
  messages: ChatMessage[],
  revizeContext?: any
): Promise<string> {
  let system = SYSTEM_CHAT;
  if (revizeContext && typeof revizeContext === 'object') {
    system += `\n\nKontext aktuální revize:\n- Číslo: ${val(revizeContext.cisloRevize)}\n- Název: ${val(revizeContext.nazev)}\n- Adresa: ${val(revizeContext.adresa)}\n- Typ: ${val(revizeContext.typRevize)}\n- Kategorie: ${val(revizeContext.kategorieRevize)}`;
  }

  return callClaude({
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    effort: 'low',
  });
}

// ==================== AUTO-VYPLŇOVÁNÍ ====================

interface AutofillContext {
  field: string; // název pole k vyplnění
  formData: Record<string, any>; // aktuální data formuláře
  entityType: string; // typ entity (revize, mistnost, rozvadec, zarizeni)
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

${context.formData?.[context.field] ? `Současná hodnota pole (můžeš ji vylepšit/doplnit):\n${String(context.formData[context.field]).slice(0, 2000)}\n\n` : ''}Navrhni pouze text, který dává smysl v kontextu elektrotechnických revizí a přímo se vloží do formuláře.`;

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
