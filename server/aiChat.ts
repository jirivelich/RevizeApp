import Anthropic from '@anthropic-ai/sdk';
import { AIUserError, AI_MODEL, getAnthropicClient, type ChatMessage } from './ai';
import { jeZamceny } from './zamek';

/**
 * AI asistent s přístupem k datům aplikace (tool use přes Messages API).
 * Čtecí nástroje hledají zákazníky, revize, závady a kalendář; zapisovací zakládají
 * zákazníky, revize, události (zakázky) a závady přes stejné funkce jako REST endpointy.
 */

// ==================== Závislosti (dodá server.ts) ====================

export interface ChatDeps {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
  vytvorRevizi: (data: Record<string, any>) => Promise<number>;
  vytvorZavadu: (data: Record<string, any>) => Promise<number>;
  vytvorZakazku: (data: Record<string, any>) => Promise<number>;
  vytvorZakaznika: (data: Record<string, any>) => Promise<number>;
}

/** Co asistent v aplikaci změnil – frontend z toho udělá odkazy a obnoví data. */
export interface ChatAkce {
  typ: 'revize' | 'zavada' | 'udalost' | 'zakaznik' | 'rozvadec' | 'okruh' | 'mistnost' | 'zarizeni';
  id: number;
  popis: string;
  odkaz: string;
}

export interface ChatKontext {
  /** Revize, kterou má uživatel právě otevřenou. */
  revizeId?: number;
  /** Dnešní datum (YYYY-MM-DD) – pro testy lze přepsat. */
  dnes?: string;
}

// ==================== Systémový prompt ====================

function systemPrompt(dnes: string, revizeId?: number): string {
  return `Jsi asistent v aplikaci ReVeli pro revizní techniky elektroinstalací v České republice.
Pomáháš s odbornými dotazy (ČSN 33 1500, ČSN 33 2000-6, ČSN 33 2000-4-41, ČSN 33 2000-5-54, ČSN EN 62305, NV 190/2022 Sb., vyhláška 50/1978 Sb.) a s prací s daty aplikace.

Máš nástroje pro čtení dat (zákazníci, revize, závady, kalendář) a pro zakládání záznamů (zákazník, revize, událost v kalendáři, závada, rozvaděč, okruhy, místnosti, zařízení v místnostech).

Práce s daty:
- Na dotazy o zákaznících, revizích, termínech a závadách odpovídej z dat získaných nástroji, nic si nevymýšlej. Když nic nenajdeš, řekni to.
- Pokud odkazy nejsou jednoznačné (např. dva zákazníci „Novák“), zeptej se, kterého uživatel myslí.
- Než cokoliv založíš, shrň v jedné krátké zprávě, co přesně vytvoříš (všechny důležité údaje), a počkej na potvrzení uživatele. Bez potvrzení zapisovací nástroj nevolej. Výjimka: uživatel v poslední zprávě už výslovně potvrdil přesně tento záznam („ano“, „vytvoř to“).
- Chybějící povinné údaje si vyžádej, nedomýšlej je (datum, adresu, klienta…). Rozumné výchozí hodnoty (typ revize pravidelná, lhůta 36 měsíců, kategorie elektro, dnešní datum revize) můžeš navrhnout v shrnutí.
- Relativní data („zítra“, „příští úterý“) převeď podle dnešního data.
- U zakládané revize, která patří existujícímu zákazníkovi, použij jeho id (nejdřív ho dohledej).
- Závady klasifikuj C1 (bezprostřední ohrožení, nutné okamžitě odstranit), C2 (potenciální ohrožení, odstranit v přiměřené lhůtě), C3 (doporučení ke zlepšení) a uveď normu, je-li zřejmá.
- Revize ve stavu dokončeno nebo schváleno jsou zamčené – závady do nich přidat nejde, dokud je uživatel v aplikaci neodemkne.
- Rozvaděče, okruhy, místnosti a zařízení zakládej vždy k určité revizi. Nejdřív si přes detail_revize ověř, co v ní už je (ať nevznikají duplicity), a id rozvaděče/místnosti ber odtud.
- Okruhy a zařízení přidávej najednou celým seznamem (jedno volání nástroje), čísla okruhů navazuj na existující.
- U okruhů vyplň jen to, co uživatel řekl nebo co jednoznačně plyne (typ jističe B/C/D, proud, počet fází, kabel). Naměřené hodnoty si nevymýšlej.
- Po založení záznamu potvrď stručně, co vzniklo.

Styl:
- Odpovídej stručně a věcně v češtině, bez markdown formátování (žádné #, ** ani tabulky). Seznamy piš jako řádky začínající „- “.
- Data piš česky (např. 14. 3. 2026).

Dnešní datum: ${dnes}.${revizeId ? `\nUživatel má právě otevřenou revizi s id ${revizeId} – „tahle revize“ znamená ji.` : ''}`;
}

// ==================== Definice nástrojů ====================

const DATE_DESC = 'datum ve formátu YYYY-MM-DD';

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'hledej_zakazniky',
    description: 'Vyhledá zákazníky podle názvu, IČO, adresy, kontaktní osoby, telefonu nebo e-mailu. Prázdný dotaz vrátí prvních 50 zákazníků.',
    input_schema: {
      type: 'object',
      properties: { dotaz: { type: 'string', description: 'hledaný text (část jména, IČO, město…)' } },
      required: [],
    },
  },
  {
    name: 'detail_zakaznika',
    description: 'Vrátí kontaktní údaje zákazníka, jeho revize a naplánované události.',
    input_schema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
  },
  {
    name: 'hledej_revize',
    description: 'Vyhledá revize podle textu (číslo revize, název, adresa, objednatel), stavu nebo zákazníka. Řazeno od nejnovější.',
    input_schema: {
      type: 'object',
      properties: {
        dotaz: { type: 'string' },
        stav: { type: 'string', enum: ['rozpracováno', 'dokončeno', 'schváleno'] },
        zakaznikId: { type: 'integer' },
        limit: { type: 'integer', description: 'max. počet výsledků (výchozí 20, max. 50)' },
      },
      required: [],
    },
  },
  {
    name: 'detail_revize',
    description: 'Vrátí údaje revize včetně závad, počtu rozvaděčů, okruhů a místností (s id místností a rozvaděčů).',
    input_schema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
  },
  {
    name: 'revize_konci_platnost',
    description: 'Najde revize, kterým končí (nebo už skončila) platnost – vhodné pro plánování opakovaných revizí.',
    input_schema: {
      type: 'object',
      properties: {
        do_dni: { type: 'integer', description: 'kolik dní dopředu hledat (výchozí 60)' },
        vcetne_proslych: { type: 'boolean', description: 'zahrnout i revize, jejichž platnost už skončila (výchozí false)' },
      },
      required: [],
    },
  },
  {
    name: 'hledej_zavady',
    description: 'Vyhledá závady napříč revizemi podle stavu, závažnosti nebo textu popisu.',
    input_schema: {
      type: 'object',
      properties: {
        stav: { type: 'string', enum: ['otevřená', 'v řešení', 'vyřešená'] },
        zavaznost: { type: 'string', enum: ['C1', 'C2', 'C3'] },
        dotaz: { type: 'string' },
        revizeId: { type: 'integer' },
      },
      required: [],
    },
  },
  {
    name: 'kalendar',
    description: 'Vrátí události (zakázky) v kalendáři v daném období.',
    input_schema: {
      type: 'object',
      properties: { od: { type: 'string', description: DATE_DESC }, do: { type: 'string', description: DATE_DESC } },
      required: ['od', 'do'],
    },
  },
  {
    name: 'vytvor_zakaznika',
    description: 'Založí nového zákazníka. Volej až po potvrzení uživatelem.',
    input_schema: {
      type: 'object',
      properties: {
        nazev: { type: 'string' },
        adresa: { type: 'string' },
        ico: { type: 'string' },
        dic: { type: 'string' },
        kontaktOsoba: { type: 'string' },
        telefon: { type: 'string' },
        email: { type: 'string' },
        poznamka: { type: 'string' },
      },
      required: ['nazev'],
    },
  },
  {
    name: 'vytvor_revizi',
    description: 'Založí novou revizi (stav rozpracováno). Volej až po potvrzení uživatelem.',
    input_schema: {
      type: 'object',
      properties: {
        nazev: { type: 'string', description: 'název revidovaného objektu, např. „Rodinný dům Novák“' },
        adresa: { type: 'string' },
        zakaznikId: { type: 'integer', description: 'id existujícího zákazníka (objednatele)' },
        objednatel: { type: 'string', description: 'jméno objednatele, pokud není zákazník v evidenci' },
        datum: { type: 'string', description: `datum revize, ${DATE_DESC} (výchozí dnes)` },
        typRevize: { type: 'string', enum: ['pravidelná', 'výchozí', 'mimořádná'] },
        kategorieRevize: { type: 'string', enum: ['elektro', 'hromosvod', 'stroje', 'odberne_misto'] },
        termin: { type: 'integer', description: 'lhůta příští revize v měsících (výchozí 36)' },
      },
      required: ['nazev', 'adresa'],
    },
  },
  {
    name: 'vytvor_udalost',
    description: 'Naplánuje událost (zakázku) v kalendáři aplikace; synchronizuje se i do Google Kalendáře, je-li propojený. Volej až po potvrzení uživatelem.',
    input_schema: {
      type: 'object',
      properties: {
        nazev: { type: 'string', description: 'např. „Revize elektro – RD Novák“' },
        klient: { type: 'string', description: 'jméno klienta' },
        adresa: { type: 'string' },
        datum: { type: 'string', description: DATE_DESC },
        cas: { type: 'string', description: 'začátek HH:mm (vynech u celodenní události)' },
        casKonec: { type: 'string', description: 'konec HH:mm' },
        celyDen: { type: 'boolean' },
        zakaznikId: { type: 'integer' },
        revizeId: { type: 'integer' },
        kategorie: { type: 'string', enum: ['elektro', 'hromosvod', 'stroje', 'odberne_misto'] },
        priorita: { type: 'string', enum: ['nizká', 'střední', 'vysoká'] },
        poznamka: { type: 'string' },
      },
      required: ['nazev', 'klient', 'adresa', 'datum'],
    },
  },
  {
    name: 'pridej_zavadu',
    description: 'Přidá závadu (nebo doporučení) k revizi. Volej až po potvrzení uživatelem.',
    input_schema: {
      type: 'object',
      properties: {
        revizeId: { type: 'integer' },
        popis: { type: 'string', description: 'odborný popis závady' },
        zavaznost: { type: 'string', enum: ['C1', 'C2', 'C3'] },
        typ: { type: 'string', enum: ['zavada', 'doporuceni'] },
        norma: { type: 'string', description: 'odkaz na normu/článek, např. „ČSN 33 2000-4-41 čl. 411.3.1.2“' },
        mistnostId: { type: 'integer' },
        rozvadecId: { type: 'integer' },
        poznamka: { type: 'string' },
      },
      required: ['revizeId', 'popis', 'zavaznost'],
    },
  },
  {
    name: 'vytvor_rozvadec',
    description: 'Přidá rozvaděč do revize. Volej až po potvrzení uživatelem.',
    input_schema: {
      type: 'object',
      properties: {
        revizeId: { type: 'integer' },
        nazev: { type: 'string', description: 'např. „Hlavní rozvaděč“, „Bytový rozvaděč 1.NP“' },
        oznaceni: { type: 'string', description: 'např. RH, RB1, R1' },
        umisteni: { type: 'string', description: 'kde rozvaděč je, např. „chodba 1.NP“' },
        typRozvadece: { type: 'string', description: 'např. „bytový“, „podružný“, „hlavní domovní“, „elektroměrový“' },
        stupenKryti: { type: 'string', description: 'IP kód, např. IP20, IP40, IP54 (výchozí IP20)' },
        poznamka: { type: 'string' },
      },
      required: ['revizeId', 'nazev'],
    },
  },
  {
    name: 'pridej_okruhy',
    description: 'Přidá jeden nebo více okruhů (jističů) do rozvaděče. Volej až po potvrzení uživatelem.',
    input_schema: {
      type: 'object',
      properties: {
        rozvadecId: { type: 'integer' },
        okruhy: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              cislo: { type: 'integer', description: 'číslo okruhu; když chybí, naváže se na poslední' },
              nazev: { type: 'string', description: 'např. „Zásuvky kuchyň“, „Osvětlení 1.NP“' },
              jisticTyp: { type: 'string', description: 'charakteristika: B, C, D, gG…' },
              jisticProud: { type: 'integer', description: 'jmenovitý proud v A, např. 16' },
              pocetFazi: { type: 'integer', enum: [1, 3] },
              typKabelu: { type: 'string', description: 'např. CYKY, CY, NYM' },
              pocetZil: { type: 'string', description: 'např. 3, 5, 3J' },
              prurez: { type: 'string', description: 'v mm², např. 1,5 nebo 2,5' },
              poznamka: { type: 'string' },
            },
            required: ['nazev'],
          },
        },
      },
      required: ['rozvadecId', 'okruhy'],
    },
  },
  {
    name: 'vytvor_mistnosti',
    description: 'Přidá jednu nebo více místností do revize. Volej až po potvrzení uživatelem.',
    input_schema: {
      type: 'object',
      properties: {
        revizeId: { type: 'integer' },
        mistnosti: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nazev: { type: 'string' },
              patro: { type: 'string', description: 'např. 1.NP, 2.NP, 1.PP' },
              plocha: { type: 'number', description: 'm²' },
              prostredi: { type: 'string', enum: ['Normální', 'Nebezpečné', 'Zvlášť nebezpečné'] },
              poznamka: { type: 'string' },
            },
            required: ['nazev'],
          },
        },
      },
      required: ['revizeId', 'mistnosti'],
    },
  },
  {
    name: 'pridej_zarizeni',
    description: 'Přidá jedno nebo více elektrických zařízení (zásuvky, svítidla, spotřebiče…) do místnosti. Volej až po potvrzení uživatelem.',
    input_schema: {
      type: 'object',
      properties: {
        mistnostId: { type: 'integer' },
        zarizeni: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nazev: { type: 'string', description: 'např. „Zásuvka 230 V“, „Stropní svítidlo“, „Bojler“' },
              oznaceni: { type: 'string' },
              pocetKs: { type: 'integer' },
              trida: { type: 'string', enum: ['I', 'II', 'III'], description: 'třída ochrany (výchozí I)' },
              prikonW: { type: 'number' },
              poznamka: { type: 'string' },
            },
            required: ['nazev'],
          },
        },
      },
      required: ['mistnostId', 'zarizeni'],
    },
  },
];

// ==================== Pomocné funkce ====================

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const str = (v: unknown, max = 500): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;
const int = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : undefined;
const oneOf = <T extends string>(v: unknown, values: readonly T[]): T | undefined =>
  values.includes(v as T) ? (v as T) : undefined;
const like = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Chyba vstupu nástroje – vrací se modelu jako is_error, aby ji mohl opravit. */
class ToolInputError extends Error {}

/** Ověří, že revize existuje a není zamčená (stejně jako middleware hlidejZamek u REST API). */
async function overOdemcenouRevizi(query: ChatDeps['query'], revizeId: number) {
  const r = await query('SELECT id, "cisloRevize", stav FROM revize WHERE id = $1', [revizeId]);
  const rev = r.rows[0];
  if (!rev) throw new ToolInputError(`Revize s id ${revizeId} neexistuje`);
  if (jeZamceny(rev.stav)) {
    throw new ToolInputError(`Revize ${rev.cisloRevize} je ve stavu „${rev.stav}“ a je zamčená. Nic do ní nelze přidat – uživatel ji musí nejdřív v aplikaci odemknout (tlačítko zámku v detailu revize).`);
  }
  return rev as { id: number; cisloRevize: string; stav: string };
}

/** Pole položek z nástroje (max. počet, jen objekty s názvem). */
function polozky(v: unknown, max: number, co: string): Record<string, any>[] {
  if (!Array.isArray(v) || v.length === 0) throw new ToolInputError(`Chybí seznam (${co})`);
  if (v.length > max) throw new ToolInputError(`Najednou lze přidat nejvýš ${max} položek (${co})`);
  const out = v.filter((x) => x && typeof x === 'object' && str((x as any).nazev));
  if (out.length !== v.length) throw new ToolInputError(`Každá položka (${co}) musí mít název`);
  return out as Record<string, any>[];
}

function povinne<T>(value: T | undefined, msg: string): T {
  if (value === undefined) throw new ToolInputError(msg);
  return value;
}

/** Vynechá prázdné hodnoty, ať jsou výsledky pro model kompaktní. */
function compact<T extends Record<string, any>>(row: T): Partial<T> {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null && v !== undefined && v !== '')) as Partial<T>;
}

function dnesPraha(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Prague' }).format(new Date());
}

function cisloRevize(): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('cs-CZ', {
      timeZone: 'Europe/Prague', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date()).map((x) => [x.type, x.value]),
  );
  return `${p.year}${p.month}${p.day}${p.hour}${p.minute}`;
}

// ==================== Provedení nástrojů ====================

export async function runTool(
  name: string,
  input: Record<string, any>,
  deps: ChatDeps,
  akce: ChatAkce[],
  dnes: string,
): Promise<unknown> {
  const { query } = deps;

  switch (name) {
    case 'hledej_zakazniky': {
      const q = str(input.dotaz, 100);
      const { rows } = await query(
        `SELECT z.id, z.nazev, z.adresa, z.ico, z."kontaktOsoba", z.telefon, z.email, COUNT(r.id)::int AS "pocetRevizi"
         FROM zakaznik z LEFT JOIN revize r ON r."zakaznikId" = z.id
         ${q ? `WHERE z.nazev ILIKE $1 OR z.ico ILIKE $1 OR z.adresa ILIKE $1 OR z."kontaktOsoba" ILIKE $1 OR z.telefon ILIKE $1 OR z.email ILIKE $1` : ''}
         GROUP BY z.id ORDER BY z.nazev LIMIT 50`,
        q ? [like(q)] : [],
      );
      return { pocet: rows.length, zakaznici: rows.map(compact) };
    }

    case 'detail_zakaznika': {
      const id = povinne(int(input.id), 'Chybí id zákazníka');
      const zak = await query('SELECT * FROM zakaznik WHERE id = $1', [id]);
      if (!zak.rows[0]) throw new ToolInputError(`Zákazník s id ${id} neexistuje`);
      const rev = await query(
        `SELECT id, "cisloRevize", nazev, adresa, datum, "datumPlatnosti", termin, "typRevize", stav, vysledek
         FROM revize WHERE "zakaznikId" = $1 ORDER BY datum DESC LIMIT 30`, [id]);
      const ud = await query(
        `SELECT id, nazev, "datumPlanovany", "casPlanovany", stav FROM zakazka
         WHERE "zakaznikId" = $1 AND "datumPlanovany" >= $2 ORDER BY "datumPlanovany" LIMIT 20`, [id, dnes]);
      const { createdAt: _c, updatedAt: _u, ...z } = zak.rows[0];
      return { zakaznik: compact(z), revize: rev.rows.map(compact), nadchazejiciUdalosti: ud.rows.map(compact) };
    }

    case 'hledej_revize': {
      const where: string[] = [];
      const params: unknown[] = [];
      const q = str(input.dotaz, 100);
      if (q) { params.push(like(q)); where.push(`("cisloRevize" ILIKE $${params.length} OR nazev ILIKE $${params.length} OR adresa ILIKE $${params.length} OR objednatel ILIKE $${params.length})`); }
      const stav = oneOf(input.stav, ['rozpracováno', 'dokončeno', 'schváleno'] as const);
      if (stav) { params.push(stav); where.push(`stav = $${params.length}`); }
      const zakaznikId = int(input.zakaznikId);
      if (zakaznikId) { params.push(zakaznikId); where.push(`"zakaznikId" = $${params.length}`); }
      const limit = Math.min(int(input.limit) ?? 20, 50);
      const { rows } = await query(
        `SELECT id, "cisloRevize", nazev, adresa, objednatel, "zakaznikId", datum, "datumPlatnosti", termin, "typRevize", "kategorieRevize", stav, vysledek
         FROM revize ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY datum DESC NULLS LAST, id DESC LIMIT ${limit}`,
        params,
      );
      return { pocet: rows.length, revize: rows.map(compact) };
    }

    case 'detail_revize': {
      const id = povinne(int(input.id), 'Chybí id revize');
      const r = await query(
        `SELECT id, "cisloRevize", nazev, adresa, objednatel, "zakaznikId", datum, "datumPlatnosti", termin, "typRevize", "kategorieRevize",
                stav, vysledek, "napetovaSoustava", "popisZarizeni", "rozsahRevize", zaver
         FROM revize WHERE id = $1`, [id]);
      if (!r.rows[0]) throw new ToolInputError(`Revize s id ${id} neexistuje`);
      const [zavady, rozvadece, mistnosti] = await Promise.all([
        query('SELECT id, popis, zavaznost, stav, typ, norma, "mistnostId", "rozvadecId" FROM zavada WHERE "revizeId" = $1 ORDER BY id', [id]),
        query('SELECT id, nazev, oznaceni, umisteni FROM rozvadec WHERE "revizeId" = $1 ORDER BY poradi NULLS LAST, id', [id]),
        query('SELECT id, nazev, patro, prostredi FROM mistnost WHERE "revizeId" = $1 ORDER BY id', [id]),
      ]);
      const rozvIds = rozvadece.rows.map((x) => x.id);
      const mistIds = mistnosti.rows.map((x) => x.id);
      const [okruhy, zarizeni] = await Promise.all([
        rozvIds.length
          ? query('SELECT "rozvadecId", cislo, nazev, "jisticTyp", "jisticProud", "pocetFazi" FROM okruh WHERE "rozvadecId" = ANY($1) ORDER BY cislo', [rozvIds])
          : Promise.resolve({ rows: [] as any[] }),
        mistIds.length
          ? query('SELECT "mistnostId", nazev, "pocetKs" FROM zarizeni WHERE "mistnostId" = ANY($1) ORDER BY id', [mistIds])
          : Promise.resolve({ rows: [] as any[] }),
      ]);
      return {
        revize: compact(r.rows[0]),
        zavady: zavady.rows.map(compact),
        rozvadece: rozvadece.rows.map((rz) => ({
          ...compact(rz),
          okruhy: okruhy.rows.filter((o) => o.rozvadecId === rz.id).slice(0, 80)
            .map((o) => `${o.cislo}: ${o.nazev ?? ''} ${o.jisticTyp ?? ''}${o.jisticProud ?? ''}${o.pocetFazi === 3 ? ' 3f' : ''}`.trim()),
        })),
        mistnosti: mistnosti.rows.map((m) => ({
          ...compact(m),
          zarizeni: zarizeni.rows.filter((z) => z.mistnostId === m.id).slice(0, 80)
            .map((z) => (z.pocetKs > 1 ? `${z.nazev} (${z.pocetKs} ks)` : z.nazev)),
        })),
      };
    }

    case 'revize_konci_platnost': {
      const doDni = Math.min(int(input.do_dni) ?? 60, 730);
      const { rows } = await query(
        `SELECT id, "cisloRevize", nazev, adresa, objednatel, "zakaznikId", datum, "datumPlatnosti", "kategorieRevize"
         FROM revize
         WHERE "datumPlatnosti" ~ '^\\d{4}-\\d{2}-\\d{2}'
           AND "datumPlatnosti"::date <= ($1::date + $2::int)
           ${input.vcetne_proslych === true ? '' : `AND "datumPlatnosti"::date >= $1::date`}
         ORDER BY "datumPlatnosti" LIMIT 100`,
        [dnes, doDni],
      );
      return { pocet: rows.length, revize: rows.map(compact) };
    }

    case 'hledej_zavady': {
      const where: string[] = [];
      const params: unknown[] = [];
      const stav = oneOf(input.stav, ['otevřená', 'v řešení', 'vyřešená'] as const);
      if (stav) { params.push(stav); where.push(`z.stav = $${params.length}`); }
      const zavaznost = oneOf(input.zavaznost, ['C1', 'C2', 'C3'] as const);
      if (zavaznost) { params.push(zavaznost); where.push(`z.zavaznost = $${params.length}`); }
      const q = str(input.dotaz, 100);
      if (q) { params.push(like(q)); where.push(`z.popis ILIKE $${params.length}`); }
      const revizeId = int(input.revizeId);
      if (revizeId) { params.push(revizeId); where.push(`z."revizeId" = $${params.length}`); }
      const { rows } = await query(
        `SELECT z.id, z.popis, z.zavaznost, z.stav, z.typ, z.norma, z."revizeId", r."cisloRevize", r.nazev AS "revizeNazev"
         FROM zavada z LEFT JOIN revize r ON r.id = z."revizeId"
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY z.id DESC LIMIT 50`,
        params,
      );
      return { pocet: rows.length, zavady: rows.map(compact) };
    }

    case 'kalendar': {
      const od = povinne(DATE_RE.test(input.od) ? input.od : undefined, `Neplatné datum od (${DATE_DESC})`);
      const doo = povinne(DATE_RE.test(input.do) ? input.do : undefined, `Neplatné datum do (${DATE_DESC})`);
      const { rows } = await query(
        `SELECT id, nazev, klient, adresa, "datumPlanovany", "casPlanovany", "casKonec", "celyDen", stav, priorita, kategorie, "revizeId", "zakaznikId", poznamka
         FROM zakazka WHERE "datumPlanovany" >= $1 AND "datumPlanovany" <= $2
         ORDER BY "datumPlanovany", "casPlanovany" NULLS FIRST LIMIT 100`,
        [od, doo],
      );
      return { pocet: rows.length, udalosti: rows.map(compact) };
    }

    case 'vytvor_zakaznika': {
      const nazev = povinne(str(input.nazev, 200), 'Chybí název zákazníka');
      const data = {
        nazev, adresa: str(input.adresa), ico: str(input.ico, 20), dic: str(input.dic, 20),
        kontaktOsoba: str(input.kontaktOsoba, 200), telefon: str(input.telefon, 50), email: str(input.email, 200),
        poznamka: str(input.poznamka, 2000),
      };
      const id = await deps.vytvorZakaznika(data);
      akce.push({ typ: 'zakaznik', id, popis: `Zákazník ${nazev}`, odkaz: '/zakaznici' });
      return { ok: true, id };
    }

    case 'vytvor_revizi': {
      const nazev = povinne(str(input.nazev, 300), 'Chybí název revize');
      const adresa = povinne(str(input.adresa, 300), 'Chybí adresa');
      const zakaznikId = int(input.zakaznikId);
      let objednatel = str(input.objednatel, 300);
      if (zakaznikId) {
        const z = await query('SELECT nazev FROM zakaznik WHERE id = $1', [zakaznikId]);
        if (!z.rows[0]) throw new ToolInputError(`Zákazník s id ${zakaznikId} neexistuje`);
        objednatel ??= z.rows[0].nazev;
      }
      if (input.datum !== undefined && !DATE_RE.test(input.datum)) throw new ToolInputError(`Neplatné datum (${DATE_DESC})`);
      const data = {
        cisloRevize: cisloRevize(),
        nazev, adresa, objednatel: objednatel ?? '',
        datum: input.datum ?? dnes,
        termin: int(input.termin) ?? 36,
        typRevize: oneOf(input.typRevize, ['pravidelná', 'výchozí', 'mimořádná'] as const) ?? 'pravidelná',
        stav: 'rozpracováno',
        kategorieRevize: oneOf(input.kategorieRevize, ['elektro', 'hromosvod', 'stroje', 'odberne_misto'] as const) ?? 'elektro',
      };
      const id = await deps.vytvorRevizi(data);
      if (zakaznikId) await query('UPDATE revize SET "zakaznikId" = $1 WHERE id = $2', [zakaznikId, id]);
      akce.push({ typ: 'revize', id, popis: `Revize ${data.cisloRevize} – ${nazev}`, odkaz: `/revize/${id}` });
      return { ok: true, id, cisloRevize: data.cisloRevize };
    }

    case 'vytvor_udalost': {
      const celyDen = input.celyDen === true;
      const cas = str(input.cas, 5);
      const casKonec = str(input.casKonec, 5);
      if (cas && !TIME_RE.test(cas)) throw new ToolInputError('Neplatný čas začátku (HH:mm)');
      if (casKonec && !TIME_RE.test(casKonec)) throw new ToolInputError('Neplatný čas konce (HH:mm)');
      const data = {
        nazev: povinne(str(input.nazev, 300), 'Chybí název události'),
        klient: povinne(str(input.klient, 300), 'Chybí klient'),
        adresa: povinne(str(input.adresa, 300), 'Chybí adresa'),
        datumPlanovany: povinne(DATE_RE.test(input.datum) ? input.datum : undefined, `Neplatné datum (${DATE_DESC})`),
        casPlanovany: celyDen ? null : cas ?? null,
        casKonec: celyDen ? null : casKonec ?? null,
        celyDen,
        zakaznikId: int(input.zakaznikId) ?? null,
        revizeId: int(input.revizeId) ?? null,
        kategorie: oneOf(input.kategorie, ['elektro', 'hromosvod', 'stroje', 'odberne_misto'] as const) ?? null,
        priorita: oneOf(input.priorita, ['nizká', 'střední', 'vysoká'] as const) ?? 'střední',
        stav: 'plánováno',
        poznamka: str(input.poznamka, 2000) ?? null,
      };
      const id = await deps.vytvorZakazku(data);
      const kdy = `${data.datumPlanovany.split('-').reverse().map(Number).join('. ')}${data.casPlanovany ? ` ${data.casPlanovany}` : ''}`;
      akce.push({ typ: 'udalost', id, popis: `Událost ${data.nazev} (${kdy})`, odkaz: '/planovani' });
      return { ok: true, id };
    }

    case 'pridej_zavadu': {
      const revizeId = povinne(int(input.revizeId), 'Chybí id revize');
      const rev = await overOdemcenouRevizi(query, revizeId);
      const typ = oneOf(input.typ, ['zavada', 'doporuceni'] as const) ?? 'zavada';
      const data = {
        revizeId,
        popis: povinne(str(input.popis, 2000), 'Chybí popis závady'),
        zavaznost: typ === 'doporuceni' ? 'C3' : povinne(oneOf(input.zavaznost, ['C1', 'C2', 'C3'] as const), 'Neplatná závažnost (C1/C2/C3)'),
        stav: 'otevřená',
        typ,
        norma: str(input.norma, 300) ?? null,
        mistnostId: int(input.mistnostId) ?? null,
        rozvadecId: int(input.rozvadecId) ?? null,
        poznamka: str(input.poznamka, 2000) ?? null,
        fotky: [],
      };
      const id = await deps.vytvorZavadu(data);
      akce.push({ typ: 'zavada', id, popis: `Závada ${data.zavaznost} v revizi ${rev.cisloRevize}`, odkaz: `/revize/${revizeId}?zalozka=zavady` });
      return { ok: true, id };
    }

    case 'vytvor_rozvadec': {
      const revizeId = povinne(int(input.revizeId), 'Chybí id revize');
      await overOdemcenouRevizi(query, revizeId);
      const nazev = povinne(str(input.nazev, 200), 'Chybí název rozvaděče');
      const now = new Date().toISOString();
      const res = await query(
        `INSERT INTO rozvadec ("revizeId", nazev, oznaceni, umisteni, "typRozvadece", "stupenKryti", poznamka, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [revizeId, nazev, str(input.oznaceni, 30) ?? null, str(input.umisteni, 200) ?? null, str(input.typRozvadece, 100) ?? null,
          str(input.stupenKryti, 20) ?? 'IP20', str(input.poznamka, 2000) ?? null, now, now],
      );
      const id = res.rows[0].id;
      akce.push({ typ: 'rozvadec', id, popis: `Rozvaděč ${nazev}`, odkaz: `/revize/${revizeId}?zalozka=rozvadece` });
      return { ok: true, id };
    }

    case 'pridej_okruhy': {
      const rozvadecId = povinne(int(input.rozvadecId), 'Chybí id rozvaděče');
      const rz = await query('SELECT id, "revizeId", nazev FROM rozvadec WHERE id = $1', [rozvadecId]);
      if (!rz.rows[0]) throw new ToolInputError(`Rozvaděč s id ${rozvadecId} neexistuje`);
      await overOdemcenouRevizi(query, rz.rows[0].revizeId);
      const seznam = polozky(input.okruhy, 60, 'okruhy');
      const max = await query('SELECT COALESCE(MAX(cislo), 0)::int AS max FROM okruh WHERE "rozvadecId" = $1', [rozvadecId]);
      let dalsi = (max.rows[0]?.max ?? 0) + 1;
      const ids: number[] = [];
      for (const o of seznam) {
        const cislo = int(o.cislo) ?? dalsi;
        dalsi = Math.max(dalsi, cislo + 1);
        const proud = typeof o.jisticProud === 'number' && o.jisticProud > 0 ? `${o.jisticProud}A`
          : str(o.jisticProud, 10)?.replace(/^(\d+(?:[.,]\d+)?)\s*A?$/i, '$1A') ?? '';
        const typKabelu = str(o.typKabelu, 20);
        const pocetZil = str(o.pocetZil, 10);
        const prurez = str(o.prurez, 10)?.replace('.', ',');
        // stejně jako computeVodic ve frontendu
        const jadro = pocetZil ? `${pocetZil}x${prurez ?? ''}` : prurez ?? '';
        const vodic = [typKabelu, jadro].filter(Boolean).join(' ') || null;
        const res = await query(
          `INSERT INTO okruh ("rozvadecId", cislo, nazev, "jisticTyp", "jisticProud", "pocetFazi", vodic, "typKabelu", "pocetZil", prurez, poznamka)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
          [rozvadecId, cislo, str(o.nazev, 200), str(o.jisticTyp, 5)?.replace(/^([bcd])$/, (c) => c.toUpperCase()) ?? '', proud,
            o.pocetFazi === 3 ? 3 : 1, vodic, typKabelu ?? null, pocetZil ?? null, prurez ?? null, str(o.poznamka, 2000) ?? null],
        );
        ids.push(res.rows[0].id);
      }
      akce.push({
        typ: 'okruh', id: ids[0],
        popis: `${ids.length} ${ids.length === 1 ? 'okruh' : ids.length < 5 ? 'okruhy' : 'okruhů'} v rozvaděči ${rz.rows[0].nazev}`,
        odkaz: `/revize/${rz.rows[0].revizeId}?zalozka=rozvadece`,
      });
      return { ok: true, pocet: ids.length, ids };
    }

    case 'vytvor_mistnosti': {
      const revizeId = povinne(int(input.revizeId), 'Chybí id revize');
      await overOdemcenouRevizi(query, revizeId);
      const seznam = polozky(input.mistnosti, 60, 'místnosti');
      const vytvorene: { id: number; nazev: string }[] = [];
      for (const m of seznam) {
        const plocha = typeof m.plocha === 'number' && m.plocha > 0 ? m.plocha : null;
        const res = await query(
          `INSERT INTO mistnost ("revizeId", nazev, patro, plocha, prostredi, poznamka) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [revizeId, str(m.nazev, 120), str(m.patro, 30) ?? null, plocha,
            oneOf(m.prostredi, ['Normální', 'Nebezpečné', 'Zvlášť nebezpečné'] as const) ?? 'Normální', str(m.poznamka, 2000) ?? null],
        );
        vytvorene.push({ id: res.rows[0].id, nazev: str(m.nazev, 120)! });
      }
      akce.push({
        typ: 'mistnost', id: vytvorene[0].id,
        popis: vytvorene.length === 1 ? `Místnost ${vytvorene[0].nazev}` : `${vytvorene.length} ${vytvorene.length < 5 ? 'místnosti' : 'místností'}`,
        odkaz: `/revize/${revizeId}?zalozka=mistnosti`,
      });
      return { ok: true, mistnosti: vytvorene };
    }

    case 'pridej_zarizeni': {
      const mistnostId = povinne(int(input.mistnostId), 'Chybí id místnosti');
      const mi = await query('SELECT id, "revizeId", nazev FROM mistnost WHERE id = $1', [mistnostId]);
      if (!mi.rows[0]) throw new ToolInputError(`Místnost s id ${mistnostId} neexistuje`);
      await overOdemcenouRevizi(query, mi.rows[0].revizeId);
      const seznam = polozky(input.zarizeni, 60, 'zařízení');
      const ids: number[] = [];
      for (const z of seznam) {
        const pocetKs = int(z.pocetKs) ?? 1;
        const trida = oneOf(z.trida, ['I', 'II', 'III'] as const) ?? 'I';
        // stejně jako formulář zařízení ve frontendu
        const ochrana = trida === 'II' ? 'izolací' : trida === 'III' ? 'MN' : pocetKs > 1 ? 'max.' : '';
        const prikon = typeof z.prikonW === 'number' && z.prikonW > 0 ? z.prikonW : null;
        const res = await query(
          `INSERT INTO zarizeni ("mistnostId", nazev, oznaceni, "pocetKs", trida, "prikonW", "ochranaPredDotykem", stav, poznamka)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [mistnostId, str(z.nazev, 120), str(z.oznaceni, 20) ?? null, pocetKs, trida, prikon, ochrana, 'nekontrolováno', str(z.poznamka, 2000) ?? null],
        );
        ids.push(res.rows[0].id);
      }
      akce.push({
        typ: 'zarizeni', id: ids[0],
        popis: `${ids.length} zařízení v místnosti ${mi.rows[0].nazev}`,
        odkaz: `/revize/${mi.rows[0].revizeId}?zalozka=mistnosti`,
      });
      return { ok: true, pocet: ids.length, ids };
    }

    default:
      throw new ToolInputError(`Neznámý nástroj ${name}`);
  }
}

// ==================== Smyčka konverzace ====================

const MAX_KROKU = 10;

export async function chatSDaty(
  messages: ChatMessage[],
  deps: ChatDeps,
  kontext: ChatKontext = {},
): Promise<{ reply: string; akce: ChatAkce[] }> {
  const ai = getAnthropicClient();
  const dnes = kontext.dnes ?? dnesPraha();
  const system = systemPrompt(dnes, kontext.revizeId);
  const akce: ChatAkce[] = [];
  const conversation: Anthropic.MessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }));

  for (let krok = 0; krok < MAX_KROKU; krok++) {
    const response = await ai.messages.create({
      model: AI_MODEL,
      max_tokens: 16000,
      system,
      tools: CHAT_TOOLS,
      output_config: { effort: 'medium' },
      messages: conversation,
    });

    if (response.stop_reason === 'refusal') {
      throw new AIUserError('AI odmítla tento požadavek zpracovat. Zkuste ho přeformulovat.');
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    if (response.stop_reason !== 'tool_use') {
      if (response.stop_reason === 'max_tokens' && !text) {
        throw new AIUserError('Odpověď AI byla příliš dlouhá a byla useknuta. Zkuste to znovu.');
      }
      return { reply: text || (akce.length ? 'Hotovo.' : 'Nepodařilo se získat odpověď.'), akce };
    }

    // Celou odpověď (včetně thinking bloků) vrátit beze změny, pak výsledky všech nástrojů v jedné zprávě
    conversation.push({ role: 'assistant', content: response.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      try {
        const out = await runTool(block.name, (block.input ?? {}) as Record<string, any>, deps, akce, dnes);
        results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(out) });
      } catch (err) {
        const message = err instanceof ToolInputError || err instanceof Error ? err.message : 'Neznámá chyba';
        if (!(err instanceof ToolInputError)) console.error(`❌ AI nástroj ${block.name}:`, err);
        results.push({ type: 'tool_result', tool_use_id: block.id, content: `Chyba: ${message}`, is_error: true });
      }
    }
    conversation.push({ role: 'user', content: results });
  }

  return {
    reply: akce.length ? 'Hotovo, ale požadavek byl příliš složitý na dokončení v jednom kroku – zkontrolujte výsledek.' : 'Požadavek byl příliš složitý. Zkuste ho rozdělit na menší kroky.',
    akce,
  };
}
