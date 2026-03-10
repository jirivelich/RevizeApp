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
Na základě kontextu (typ objektu, prostředí, kategorie revize) navrhni vhodné hodnoty pro pole formuláře.

Odpovídej POUZE validním JSON objektem bez dalšího textu. Žádné vysvětlení, žádné markdown.
Vrať objekt s klíči odpovídajícími názvům polí a hodnotami jako stringy.`;

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

export async function generateReport(data: RevizeData): Promise<string> {
  const ai = getClient();

  const prompt = `Na základě následujících dat revize vytvoř text závěru revizní zprávy.

ÚDAJE O REVIZI:
- Číslo revize: ${data.revize.cisloRevize}
- Název: ${data.revize.nazev}
- Adresa: ${data.revize.adresa}
- Objednatel: ${data.revize.objednatel}
- Typ revize: ${data.revize.typRevize}
- Kategorie: ${data.revize.kategorieRevize}
- Datum: ${data.revize.datum}
- Napěťová soustava: ${data.revize.napetovaSoustava || 'neuvedeno'}

ROZVADĚČE (${data.rozvadece.length}):
${data.rozvadece.map((r: any) => `- ${r.nazev} (${r.oznaceni}), umístění: ${r.umisteni}, typ: ${r.typRozvadece}, krytí: ${r.stupenKryti}`).join('\n') || 'žádné'}

OKRUHY (${data.okruhy.length}):
${data.okruhy.map((o: any) => `- Okruh ${o.cislo}: ${o.nazev}, jistič ${o.jisticTyp} ${o.jisticProud}, vodič ${o.vodic}${o.izolacniOdpor ? `, iz.odpor: ${o.izolacniOdpor} MΩ` : ''}${o.impedanceSmycky ? `, impedance: ${o.impedanceSmycky} Ω` : ''}`).join('\n') || 'žádné'}

ZÁVADY (${data.zavady.length}):
${data.zavady.map((z: any) => `- [${z.zavaznost}] ${z.popis} (stav: ${z.stav})`).join('\n') || 'žádné závady'}

MÍSTNOSTI (${data.mistnosti.length}):
${data.mistnosti.map((m: any) => `- ${m.nazev} (${m.typ}, prostředí: ${m.prostredi})`).join('\n') || 'žádné'}

ZAŘÍZENÍ (${data.zarizeni.length}):
${data.zarizeni.map((z: any) => `- ${z.nazev}, třída ${z.trida}, stav: ${z.stav}${z.prikonW ? `, příkon ${z.prikonW}W` : ''}`).join('\n') || 'žádná'}

MĚŘICÍ PŘÍSTROJE:
${data.pristroje.map((p: any) => `- ${p.nazev} ${p.vyrobce} ${p.model}, v.č. ${p.vyrobniCislo}, kalibrace platná do ${p.platnostKalibrace}`).join('\n') || 'neuvedeny'}

Vytvoř:
1. Stručný závěr revize (2-4 odstavce)
2. Jasné vyjádření, zda je zařízení schopno/neschopno bezpečného provozu
3. Pokud jsou závady, uveď je v závěru
4. Datum příští revize (${data.revize.termin} měsíců od ${data.revize.datum})`;

  const response = await ai.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: SYSTEM_REPORT,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock?.text || 'Nepodařilo se vygenerovat zprávu.';
}

// ==================== CHAT ASISTENT ====================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatWithAssistant(
  messages: ChatMessage[],
  revizeContext?: any
): Promise<string> {
  const ai = getClient();

  let system = SYSTEM_CHAT;
  if (revizeContext) {
    system += `\n\nKontext aktuální revize:\n- Číslo: ${revizeContext.cisloRevize}\n- Název: ${revizeContext.nazev}\n- Adresa: ${revizeContext.adresa}\n- Typ: ${revizeContext.typRevize}\n- Kategorie: ${revizeContext.kategorieRevize}`;
  }

  const response = await ai.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock?.text || 'Nepodařilo se získat odpověď.';
}

// ==================== AUTO-VYPLŇOVÁNÍ ====================

interface AutofillContext {
  field: string; // název pole k vyplnění
  formData: Record<string, any>; // aktuální data formuláře
  entityType: string; // typ entity (revize, mistnost, rozvadec, zarizeni)
}

export async function getAutofillSuggestion(context: AutofillContext): Promise<Record<string, string>> {
  const ai = getClient();

  const prompt = `Pro formulář typu "${context.entityType}" navrhni hodnoty.

Aktuální data formuláře:
${JSON.stringify(context.formData, null, 2)}

Pole k vyplnění/doplnění: ${context.field}

Vrať JSON objekt s navrženými hodnotami. Klíče musí odpovídat názvům polí formuláře.
Navrhni pouze relevantní hodnoty, které dávají smysl v kontextu elektrotechnických revizí.`;

  const response = await ai.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: SYSTEM_AUTOFILL,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock?.text) return {};

  try {
    return JSON.parse(textBlock.text);
  } catch {
    return {};
  }
}
