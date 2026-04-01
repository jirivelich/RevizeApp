import { useEffect, useState } from 'react';
import { db } from '../db';
import { useOnlineStatus } from './useOnlineStatus';
import type { Mistnost } from '../types';

/**
 * Vrací místnosti pro danou revizi, funguje i offline (čte z IndexedDB)
 */
export function useMistnostiByRevize(revizeId: number) {
  const online = useOnlineStatus();
  const [data, setData] = useState<Mistnost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (online) {
      fetch(`/api/mistnosti/revize/${revizeId}`)
        .then(res => res.json())
        .then((mistnosti: Mistnost[]) => {
          if (!active) return;
          setData(mistnosti);
          // Uložit do IndexedDB pro offline použití
          mistnosti.forEach(m => {
            db.mistnostCache.put({ id: m.id ?? -1, data: m, updatedAt: Date.now() });
          });
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      db.mistnostCache.toArray().then(all => {
        if (!active) return;
        setData(all.filter(m => m.data.revizeId === revizeId).map(m => m.data));
        setLoading(false);
      });
    }
    return () => { active = false; };
  }, [revizeId, online]);

  return { data, loading };
}
