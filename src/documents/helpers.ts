/**
 * Helpery pro HTML šablony dokumentů (ctx.H).
 * Všechna uživatelská data MUSÍ projít přes esc() nebo v().
 */

const ESC_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function isEmpty(x: unknown): boolean {
  return x === null || x === undefined || (typeof x === 'string' && x.trim() === '') || (typeof x === 'number' && Number.isNaN(x));
}

/** Escapování HTML. null/undefined → prázdný řetězec. */
function esc(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, ch => ESC_MAP[ch]);
}

/** Datum ve formátu „01. 01. 2024“. Neplatné nebo prázdné → ''. */
function d(iso: string | Date | null | undefined): string {
  if (iso === null || iso === undefined || iso === '') return '';
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}. ${mm}. ${date.getFullYear()}`;
}

/** Tečkovaná linka pro ruční doplnění (n znaků). */
function dots(n = 24): string {
  return `<span class="dotline">${'.'.repeat(Math.max(3, n))}</span>`;
}

/** Hodnota (escapovaná), nebo tečkovaná linka, když je prázdná. */
function v(x: unknown, n = 24): string {
  return isEmpty(x) ? dots(n) : esc(x);
}

/**
 * Jen platná varianta (tučně), např. „SCHOPNA“ nebo „NESCHOPNA“ – bez přeškrtnuté druhé možnosti.
 * Když není rozhodnuto (null/undefined), vrátí tečkovanou linku k ručnímu doplnění.
 */
function choice(first: boolean | null | undefined, labels: [string, string]): string {
  if (first === true) return `<b>${esc(labels[0])}</b>`;
  if (first === false) return `<b>${esc(labels[1])}</b>`;
  return dots(12);
}

type VnStav = boolean | 'V' | 'N' | 'pass' | 'fail' | 'schopno' | 'neschopno' | '' | 'NA' | null | undefined;

function toBool(stav: VnStav): boolean | null {
  if (stav === true || stav === 'V' || stav === 'pass' || stav === 'schopno') return true;
  if (stav === false || stav === 'N' || stav === 'fail' || stav === 'neschopno') return false;
  return null;
}

/** „VYHOVĚL“ nebo „NEVYHOVĚL“ podle stavu (vlastní popisky volitelně); nerozhodnuto → tečky. */
function vn(stav: VnStav, labels: [string, string] = ['VYHOVĚL', 'NEVYHOVĚL']): string {
  return choice(toBool(stav), labels);
}

/** „ANO“ nebo „NE“; nerozhodnuto → tečky. */
function an(b: boolean | null | undefined): string {
  return choice(b === null || b === undefined ? null : !!b, ['ANO', 'NE']);
}

/** Víceřádkový text → escapovaný HTML s <br>. */
function lines(text: unknown): string {
  return esc(text).replace(/\r?\n/g, '<br>');
}

/**
 * Víceřádkový text → samostatné odstavce (<p class="para">).
 * Odstavce lze stránkovat po jednom, proto je používáme pro dlouhé texty.
 * Prázdný text → n řádků teček pro ruční doplnění.
 */
function paras(text: unknown, emptyLines = 2): string {
  const t = isEmpty(text) ? '' : String(text);
  const parts = t.split(/\r?\n/).filter(p => p.trim() !== '');
  if (parts.length === 0) {
    return Array.from({ length: emptyLines }, () => `<p class="para">${dots(95)}</p>`).join('');
  }
  return parts.map(p => `<p class="para">${esc(p)}</p>`).join('');
}

/** Rozdělí pole na skupiny po n prvcích (pro ruční stránkování seznamů). */
function paginate<T>(rows: T[], n: number): T[][] {
  const size = Math.max(1, Math.floor(n));
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/** Název souboru bez diakritiky a nebezpečných znaků. */
function fileName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 120) || 'dokument';
}

export const H = { esc, d, v, vn, an, lines, paras, dots, paginate, fileName, isEmpty };
export type Helpers = typeof H;
