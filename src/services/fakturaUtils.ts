import type { FakturaPolozka } from '../types';

/** Zaokrouhlení na 2 desetinná místa (odolné vůči float chybám, např. 1.005). */
export function zaokrouhli2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Celková cena položky = množství × cena za jednotku, zaokrouhleno na 2 des. */
export function spoctiPolozku(mnozstvi: number, cenaZaJednotku: number): number {
  return zaokrouhli2((Number(mnozstvi) || 0) * (Number(cenaZaJednotku) || 0));
}

/** Součet položek (z mnozstvi × cenaZaJednotku), zaokrouhleno na 2 des. */
export function spoctiCelkem(
  polozky: Pick<FakturaPolozka, 'mnozstvi' | 'cenaZaJednotku'>[] | undefined | null,
): number {
  if (!polozky?.length) return 0;
  return zaokrouhli2(polozky.reduce((sum, p) => sum + spoctiPolozku(p.mnozstvi, p.cenaZaJednotku), 0));
}
