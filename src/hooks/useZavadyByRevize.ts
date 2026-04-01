import { useEffect, useState } from 'react';
import { db } from '../db';
import { useOnlineStatus } from './useOnlineStatus';
import type { Zavada } from '../types';

/**
 * Vrací závady pro danou revizi, funguje i offline (čte z IndexedDB)
 */
export function useZavadyByRevize(revizeId: number) {
  const online = useOnlineStatus();
  const [data, setData] = useState<Zavada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (online) {
      fetch(`/api/zavady/revize/${revizeId}`)
        .then(res => res.json())
        .then((zavady: Zavada[]) => {
          if (!active) return;
          setData(zavady);
          // Uložit do IndexedDB pro offline použití
          zavady.forEach(z => {
            db.zavadaCache.put({ id: z.id ?? -1, data: z, updatedAt: Date.now() });
          });
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      db.zavadaCache.toArray().then(all => {
        if (!active) return;
        setData(all.filter(z => z.data.revizeId === revizeId).map(z => z.data));
        setLoading(false);
      });
    }
    return () => { active = false; };
  }, [revizeId, online]);

  return { data, loading };
}
