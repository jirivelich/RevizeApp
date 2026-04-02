import { useCallback } from 'react';
import { db } from '../db';
import type { PendingRequest } from '../db';

// Přidání požadavku do fronty při offline stavu
export async function addPendingRequest(req: Omit<PendingRequest, 'createdAt'>) {
  await db.pendingRequests.add({ ...req, createdAt: Date.now() });
}

// Získání všech pending požadavků
export async function getAllPendingRequests() {
  return db.pendingRequests.toArray();
}

// Smazání požadavku z fronty
export async function removePendingRequest(id: number) {
  await db.pendingRequests.delete(id);
}

// Hook pro synchronizaci fronty (automaticky i ručně)
export function useOfflineQueueSync() {
  const sync = useCallback(async () => {
    const requests = await getAllPendingRequests();
    for (const req of requests) {
      try {
        const response = await fetch(req.url, {
          method: req.method,
          headers: {
            'Content-Type': 'application/json',
            ...(req.headers || {}),
          },
          body: req.body ? JSON.stringify(req.body) : undefined,
        });
        if (response.ok) {
          await removePendingRequest(req.id!);
        }
        // Při chybě necháme v frontě pro další pokus
      } catch {
        // Síťová chyba – necháme v frontě
      }
    }

    // Vyčistit temp záznamy (záporná ID) z cache po úspěšné synchronizaci
    const tables = [
      db.revizeCache, db.rozvadecCache, db.okruhCache,
      db.mistnostCache, db.zarizeniCache, db.zavadaCache,
      db.firmaCache, db.zakazkaCache, db.pristrojCache,
      db.zakaznikCache, db.zavadaKatalogCache, db.predvolenyTextCache,
    ];
    for (const table of tables) {
      const tempRecords = await table.where('id').below(0).primaryKeys();
      if (tempRecords.length > 0) {
        await table.bulkDelete(tempRecords);
      }
    }
  }, []);

  // Automatická synchronizace při návratu online
  // (lze použít i v komponentě s useEffect)
  return { sync };
}
