import { useEffect, useRef } from 'react';

/** Událost: data revize se změnila mimo aktuální formulář (např. je přidal AI asistent). */
const UDALOST = 'revize-data-zmena';

export function oznamZmenuDat(): void {
  window.dispatchEvent(new Event(UDALOST));
}

/** Zavolá callback, když se data změní jinde v aplikaci (viz oznamZmenuDat). */
export function useZmenaDat(callback: () => void): void {
  const ref = useRef(callback);
  useEffect(() => { ref.current = callback; });
  useEffect(() => {
    const handler = () => ref.current();
    window.addEventListener(UDALOST, handler);
    return () => window.removeEventListener(UDALOST, handler);
  }, []);
}
