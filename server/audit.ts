import { pool } from './database';

/** Hodnoty delší než tento limit (např. base64 obrázky) se do auditu neukládají, jen se označí změna. */
const MAX_DELKA_HODNOTY = 500;

export interface ZmenaPole {
  pole: string;
  puvodni: unknown;
  nova: unknown;
}

function normalizuj(v: unknown): unknown {
  if (v === undefined || v === '') return null;
  if (v instanceof Date) return v.toISOString();
  return v;
}

function zkrat(v: unknown): unknown {
  if (typeof v === 'string' && v.length > MAX_DELKA_HODNOTY) {
    return `[dlouhá hodnota, ${v.length} znaků]`;
  }
  return v;
}

/**
 * Porovná stávající řádek s příchozími změnami a vrátí jen skutečně změněná pole.
 * Pole `updatedAt` se ignoruje. Rozdíl null / prázdný řetězec se nepovažuje za změnu.
 */
export function diffZmen(puvodni: Record<string, unknown>, zmeny: Record<string, unknown>): ZmenaPole[] {
  const vysledek: ZmenaPole[] = [];
  for (const [pole, nova] of Object.entries(zmeny)) {
    if (pole === 'updatedAt') continue;
    const a = normalizuj(puvodni[pole]);
    const b = normalizuj(nova);
    if (String(a ?? '') === String(b ?? '')) continue;
    vysledek.push({ pole, puvodni: zkrat(a), nova: zkrat(b) });
  }
  return vysledek;
}

export interface AuditZaznam {
  entita: string;
  entitaId?: number | string | null;
  revizeId?: number | string | null;
  akce: 'vytvoreno' | 'zmeneno' | 'smazano';
  uzivatel?: string | null;
  zmeny?: ZmenaPole[] | Record<string, unknown> | null;
}

/** Zapíše záznam do auditní stopy. Chyba auditu nesmí shodit hlavní operaci, proto se jen loguje. */
export async function zapisAudit(z: AuditZaznam): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log ("cas", entita, "entitaId", "revizeId", akce, uzivatel, zmeny)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        new Date().toISOString(),
        z.entita,
        z.entitaId != null ? Number(z.entitaId) : null,
        z.revizeId != null ? Number(z.revizeId) : null,
        z.akce,
        z.uzivatel ?? null,
        z.zmeny ? JSON.stringify(z.zmeny) : null,
      ]
    );
  } catch (e) {
    console.error('⚠️ Zápis do audit_log selhal:', (e as Error).message);
  }
}
