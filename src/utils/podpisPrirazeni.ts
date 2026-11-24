/**
 * Přiřazení podepsaných PDF k revizím podle čísla revize v názvu souboru.
 * Stažené zprávy se jmenují „<číslo revize>_<název dokumentu>.pdf“; podepisovací služby
 * často jen přidají příponu (např. „_signed“), číslo revize tedy v názvu zůstane.
 */
import type { Revize } from '../types';

const normalizuj = (s: string) => s
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Za-z0-9._-]+/g, '_').toLowerCase();

/** Vrátí revizi, jejíž číslo je v názvu souboru (nejdelší shoda, číslo nesmí pokračovat další číslicí). */
export function najdiRevizi<R extends Pick<Revize, 'cisloRevize'>>(nazevSouboru: string, revize: R[]): R | null {
  const n = normalizuj(nazevSouboru);
  let nejlepsi: R | null = null;
  let delka = 0;
  for (const r of revize) {
    const c = normalizuj(r.cisloRevize ?? '');
    if (c.length < 3 || c.length <= delka) continue;
    let i = n.indexOf(c);
    while (i >= 0) {
      const pred = n[i - 1];
      const po = n[i + c.length];
      if (!(pred && /\d/.test(pred)) && !(po && /\d/.test(po))) { nejlepsi = r; delka = c.length; break; }
      i = n.indexOf(c, i + 1);
    }
  }
  return nejlepsi;
}
