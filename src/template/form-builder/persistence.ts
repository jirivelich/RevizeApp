// ─── localStorage persistence + clone helper ─────────────────────────────────

import type { Doc } from './types';

const SK = 'fb_doc_v4';

export const load = (): Doc | null => {
  try {
    return JSON.parse(localStorage.getItem(SK) ?? 'null') as Doc | null;
  } catch {
    return null;
  }
};

export const save = (d: Doc): void => {
  localStorage.setItem(SK, JSON.stringify(d));
};

/** Hluboká kopie přes JSON serializaci */
export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
