import type { NextFunction, Request, Response } from 'express';
import { pool } from './database';
import { authMiddleware } from './auth';

/** Stavy, ve kterých je revize zamčená (jen čtení). */
export const ZAMCENE_STAVY = ['dokončeno', 'schváleno'];

export const jeZamceny = (stav: string | null | undefined): boolean => !!stav && ZAMCENE_STAVY.includes(stav);

type Dotaz = (sql: string, params: unknown[]) => Promise<{ rows: any[] }>;

const toId = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Z požadavku zjistí, ke které revizi patří měněná data. Vrací null, pokud požadavek žádnou revizi nemění
 * (čtení, jiná entita) nebo ji nelze určit. Čistá logika kromě injektovaného dotazu do DB.
 */
export async function zjistiRevizeId(
  method: string,
  path: string,
  body: Record<string, any> | undefined,
  dotaz: Dotaz,
): Promise<number | null> {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) return null;
  const seg = path.replace(/^\/api\//, '').split('/').filter(Boolean);
  const [a, b, c] = seg;
  const b0 = body ?? {};

  const radek = async (sql: string, id: number): Promise<any | null> => (await dotaz(sql, [id])).rows[0] ?? null;
  const rozvadecNaRevizi = async (rozvadecId: unknown) => {
    const id = toId(rozvadecId);
    return id ? toId((await radek('SELECT "revizeId" FROM rozvadec WHERE id = $1', id))?.revizeId) : null;
  };
  const mistnostNaRevizi = async (mistnostId: unknown) => {
    const id = toId(mistnostId);
    return id ? toId((await radek('SELECT "revizeId" FROM mistnost WHERE id = $1', id))?.revizeId) : null;
  };

  switch (a) {
    case 'revize':
      // PUT/DELETE /revize/:id, POST /revize/:id/(prilohy|rozsah-polozky|dokumenty)
      if (seg.length === 2 && (method === 'PUT' || method === 'DELETE')) return toId(b);
      if (seg.length === 3 && method === 'POST' && ['prilohy', 'rozsah-polozky', 'dokumenty'].includes(c)) return toId(b);
      return null;
    case 'rozvadece':
      if (seg.length === 1 && method === 'POST') return toId(b0.revizeId);
      if (seg.length === 2) return toId((await radek('SELECT "revizeId" FROM rozvadec WHERE id = $1', Number(b)))?.revizeId);
      return null;
    case 'okruhy':
    case 'chranice': {
      if (seg.length === 1 && method === 'POST') return rozvadecNaRevizi(b0.rozvadecId);
      if (seg.length === 2) {
        const id = toId(b);
        if (!id) return null;
        const r = await radek(`SELECT "rozvadecId" FROM ${a === 'okruhy' ? 'okruh' : 'chranic'} WHERE id = $1`, id);
        return rozvadecNaRevizi(r?.rozvadecId);
      }
      return null;
    }
    case 'mistnosti':
      if (seg.length === 1 && method === 'POST') return toId(b0.revizeId);
      if (seg.length === 2) return toId((await radek('SELECT "revizeId" FROM mistnost WHERE id = $1', Number(b)))?.revizeId);
      return null;
    case 'zarizeni': {
      if (seg.length === 1 && method === 'POST') return mistnostNaRevizi(b0.mistnostId);
      if (seg.length === 2) {
        const id = toId(b);
        if (!id) return null;
        const r = await radek('SELECT "mistnostId" FROM zarizeni WHERE id = $1', id);
        return mistnostNaRevizi(r?.mistnostId);
      }
      return null;
    }
    case 'zavady':
      if (seg.length === 1 && method === 'POST') return toId(b0.revizeId);
      if (seg.length === 2) return toId((await radek('SELECT "revizeId" FROM zavada WHERE id = $1', Number(b)))?.revizeId);
      return null;
    case 'prilohy':
      if (seg.length === 2) return toId((await radek('SELECT "revizeId" FROM "revizePriloha" WHERE id = $1', Number(b)))?.revizeId);
      return null;
    case 'rozsah-polozky':
      if (seg.length === 2) return toId((await radek('SELECT "revizeId" FROM "revizeRozsahPolozka" WHERE id = $1', Number(b)))?.revizeId);
      return null;
    case 'dokumenty':
      if (seg.length === 2) return toId((await radek('SELECT "revizeId" FROM "revizeDokument" WHERE id = $1', Number(b)))?.revizeId);
      return null;
    case 'revize-pristroje':
      if (seg.length === 1 && method === 'POST') return toId(b0.revizeId);
      if (seg.length === 3 && method === 'DELETE') return toId(b);
      if (seg.length === 2 && method === 'DELETE') return toId((await radek('SELECT "revizeId" FROM "revizePristroj" WHERE id = $1', Number(b)))?.revizeId);
      return null;
    default:
      return null;
  }
}

export const ZAMEK_HLASKA = 'Revize je dokončena a zamčena. Pro úpravy ji nejprve odemkněte opsáním jejího čísla.';

/** Middleware: zamítne (423) změny dat revize, která je ve stavu dokončeno nebo schváleno. */
export async function hlidejZamek(req: Request, res: Response, next: NextFunction) {
  try {
    // Bez přihlášení nic nezjišťujeme, požadavek zamítne autentizace na konkrétní trase.
    if (!req.headers.authorization) return next();
    const revizeId = await zjistiRevizeId(req.method, req.path.startsWith('/api') ? req.path : `/api${req.path}`, req.body, (sql, params) => pool.query(sql, params));
    if (!revizeId) return next();
    const r = await pool.query('SELECT stav FROM revize WHERE id = $1', [revizeId]);
    if (jeZamceny(r.rows[0]?.stav)) {
      // Stav zámku prozradíme jen ověřenému uživateli, neověřený dostane běžnou chybu přihlášení.
      return authMiddleware(req as any, res, () => res.status(423).json({ error: ZAMEK_HLASKA, zamceno: true }));
    }
    next();
  } catch (e) {
    // Selhání kontroly nesmí tiše pustit změnu: raději chybu nahlásit.
    console.error('⚠️ Kontrola zámku revize selhala:', (e as Error).message);
    res.status(500).json({ error: 'Nepodařilo se ověřit, zda je revize zamčená.' });
  }
}
