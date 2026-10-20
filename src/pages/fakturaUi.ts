import type { FakturaStav } from '../types';

export const STAV_LABEL: Record<FakturaStav, string> = {
  koncept: 'Koncept',
  vystavena: 'Vystavená',
  zaplacena: 'Zaplacená',
  storno: 'Storno',
};

export const FORMA_UHRADY_OPTIONS = [
  { value: 'prevod', label: 'Převodem' },
  { value: 'hotove', label: 'Hotově' },
  { value: 'karta', label: 'Kartou' },
];

export const formatKc = (n: number | undefined | null): string =>
  `${new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)} Kč`;

/** Srozumitelná hláška pro chybu změny stavu (zmenStav vyžaduje online). */
export function chybaZmenyStavu(e: unknown): string {
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  if (offline) {
    return 'Změna stavu faktury vyžaduje připojení k internetu. Zkuste to znovu po obnovení připojení.';
  }
  if (e instanceof Error && e.message) return e.message;
  return 'Nepodařilo se změnit stav faktury.';
}
