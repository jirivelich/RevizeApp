/** Hooky a pomocné funkce pohledů Plánování (oddělené od komponent kvůli Fast Refresh). */
import { useEffect, useSyncExternalStore } from 'react';
import type { Zakaznik, Zakazka } from '../../types';

const MQ = '(max-width: 767px)';
function subscribe(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const m = window.matchMedia(MQ);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
}
/** true na úzkém displeji (telefon). */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(MQ).matches),
    () => false,
  );
}

/** Telefon zákazníka zakázky (pokud je znám). */
export function phoneOf(z: Zakazka, zakazniciById: Map<number, Zakaznik>): string | undefined {
  return z.zakaznikId ? zakazniciById.get(z.zakaznikId)?.telefon || undefined : undefined;
}

/** Klávesy T = dnes, ← → = posun (mimo pole formuláře a otevřené dialogy). */
export function useCalendarKeys(onPrev: () => void, onNext: () => void, onToday: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (t && (t.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]'))) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 't' || e.key === 'T') onToday();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onPrev, onNext, onToday]);
}
