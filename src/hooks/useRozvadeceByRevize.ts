import { useEffect, useState } from 'react';
import { db } from '../db';
import { useOnlineStatus } from './useOnlineStatus';
import type { Rozvadec } from '../types';

/**
 * Vrací rozvaděče pro danou revizi, funguje i offline (čte z IndexedDB)
 */
export function useRozvadeceByRevize(revizeId: number) {
  const online = useOnlineStatus();
  const [data, setData] = useState<Rozvadec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (online) {
      fetch(`/api/rozvadece/${revizeId}`)
        .then(res => res.json())
        .then((rozvadece: Rozvadec[]) => {
          if (!active) return;
          setData(rozvadece);
          // Uložit do IndexedDB pro offline použití
          rozvadece.forEach(r => {
            db.rozvadecCache.put({ id: r.id ?? -1, data: r, updatedAt: Date.now() });
          });
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      db.rozvadecCache.toArray().then(all => {
        if (!active) return;
        setData(all.filter(r => r.data.revizeId === revizeId).map(r => r.data));
        setLoading(false);
      });
    }
    return () => { active = false; };
  }, [revizeId, online]);

  return { data, loading };
}
