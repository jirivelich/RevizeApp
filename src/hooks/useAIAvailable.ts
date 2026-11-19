import { useEffect, useState } from 'react';
import { aiApi } from '../services/api';

let statusPromise: Promise<boolean> | null = null;

/** Je AI na serveru nakonfigurované? (dotaz jen jednou za načtení stránky) */
export function useAIAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    statusPromise ??= aiApi.getStatus().then((s) => s.configured).catch(() => false);
    let alive = true;
    statusPromise.then((v) => alive && setAvailable(v));
    return () => { alive = false; };
  }, []);
  return available;
}

