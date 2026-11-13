/**
 * Registr šablon dokumentů.
 *
 * Každá šablona: TPL.register({ id, name, scope, order, kategorie, render(ctx) }).
 * render(ctx) vrací HTML string s jednou nebo více stránkami <div class="page">…</div>.
 * Stránka s atributem data-flow se po vykreslení automaticky rozdělí na tolik listů A4,
 * kolik obsah potřebuje (viz paginate.ts).
 *
 * scope:
 *  - 'record' – 1× na revizi (hlavní zpráva)
 *  - 'group'  – 1× na skupinu (např. protokol měření pro každý rozvaděč), skupiny vrací groups(ctx)
 *  - 'all'    – 1× za celek (souhrnný dokument přes všechny skupiny)
 */
import type { KategorieRevize } from '../types';
import type { DocContext } from './context';

export type DocScope = 'record' | 'group' | 'all';

export interface DocGroup {
  key: string;
  label: string;
  item: unknown;
}

export interface DocTemplate {
  id: string;
  name: string;
  scope: DocScope;
  order: number;
  kategorie: KategorieRevize[];
  /** Jen pro scope 'group' – prvky, pro které se dokument vytvoří. */
  groups?: (ctx: DocContext) => DocGroup[];
  /** Šablona vrací HTML stránek. Smí číst jen z ctx. */
  render: (ctx: DocContext) => string;
  /** Základ názvu souboru (bez přípony, s diakritikou – očistí se). */
  fileName?: (ctx: DocContext) => string;
}

/** Konkrétní dokument připravený k náhledu/exportu. */
export interface DocInstance {
  key: string;
  templateId: string;
  title: string;
  fileBase: string;
  /** HTML ze šablony (před stránkováním). */
  html: string;
}

const templates = new Map<string, DocTemplate>();

function register(t: DocTemplate): void {
  templates.set(t.id, t);
}

function get(id: string): DocTemplate | undefined {
  return templates.get(id);
}

function list(kategorie?: string): DocTemplate[] {
  return [...templates.values()]
    .filter(t => !kategorie || t.kategorie.includes(kategorie as KategorieRevize))
    .sort((a, b) => a.order - b.order);
}

/** Vytvoří všechny dokumenty pro daný kontext (podle kategorie revize a scope šablon). */
function instances(ctx: DocContext): DocInstance[] {
  const out: DocInstance[] = [];
  for (const t of list(ctx.revize.kategorieRevize || 'elektro')) {
    const base = t.fileName ? t.fileName(ctx) : `${ctx.revize.cisloRevize} ${t.name}`;
    if (t.scope === 'group') {
      for (const g of t.groups?.(ctx) ?? []) {
        const gctx: DocContext = { ...ctx, group: g.item };
        out.push({
          key: `${t.id}:${g.key}`,
          templateId: t.id,
          title: `${t.name} – ${g.label}`,
          fileBase: ctx.H.fileName(`${base} ${g.label}`),
          html: t.render(gctx),
        });
      }
    } else {
      out.push({ key: t.id, templateId: t.id, title: t.name, fileBase: ctx.H.fileName(base), html: t.render(ctx) });
    }
  }
  return out;
}

export const TPL = { register, get, list, instances };
