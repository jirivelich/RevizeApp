import { useEffect, useState } from 'react';
import { db } from '../db';
import { useOnlineStatus } from './useOnlineStatus';
import type { Okruh } from '../types';

/**
 * Vrací okruhy pro daný rozvaděč, funguje i offline (čte z IndexedDB)
 */
export function useOkruhyByRozvadec(rozvadecId: number) {
  const online = useOnlineStatus();
  const [data, setData] = useState<Okruh[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (online) {
      fetch(`/api/okruhy/${rozvadecId}`)
        .then(res => res.json())
        .then((okruhy: Okruh[]) => {
          if (!active) return;
          setData(okruhy);
          // Uložit do IndexedDB pro offline použití
          okruhy.forEach(o => {
            db.okruhCache.put({ id: o.id ?? -1, data: o, updatedAt: Date.now() });
          });
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      db.okruhCache.toArray().then(all => {
        if (!active) return;
        setData(all.filter(o => o.data.rozvadecId === rozvadecId).map(o => o.data));
        setLoading(false);
      });
    }
    return () => { active = false; };
  }, [rozvadecId, online]);

  return { data, loading };
}
