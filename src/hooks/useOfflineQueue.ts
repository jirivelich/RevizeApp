import { useCallback } from 'react';
import { db } from '../db';
import type { PendingRequest } from '../db';

// Přidání požadavku do fronty při offline stavu.
// Pro PUT provede upsert – pokud stejná URL + PUT už čeká, jen aktualizuje body.
export async function addPendingRequest(req: Omit<PendingRequest, 'createdAt'>) {
  if (req.method === 'PUT') {
    const existing = await db.pendingRequests
      .filter(r => r.method === 'PUT' && r.url === req.url)
      .first();
    if (existing?.id !== undefined) {
      await db.pendingRequests.put({
        ...existing,
        body: req.body,
        headers: req.headers,
      });
      return;
    }
  }
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

/**
 * Po úspěšném POST přepíše všechna dočasná FK ve zbývající frontě + v cache tabulkách.
 * Nahradí tempId → realId v:
 *   - body polích: revizeId, rozvadecId, mistnostId, okruhId, zakaznikId
 *   - URL patternu: /${tempId} (pro navazující PUT/DELETE téhož záznamu)
 */
async function remapTempIdInQueue(tempId: number, realId: number): Promise<void> {
  const FK_FIELDS = ['revizeId', 'rozvadecId', 'mistnostId', 'okruhId', 'zakaznikId'] as const;
  const remaining = await db.pendingRequests.toArray();

  for (const req of remaining) {
    let changed = false;
    let newUrl = req.url;
    let newBody = req.body;

    // URL: /${tempId} → /${realId}  (PUT/DELETE na tentýž offline záznam)
    const urlPattern = `/${tempId}`;
    if (newUrl.includes(urlPattern)) {
      newUrl = newUrl.split(urlPattern).join(`/${realId}`);
      changed = true;
    }

    // Body FK pole
    if (newBody && typeof newBody === 'object') {
      for (const field of FK_FIELDS) {
        if (newBody[field] === tempId) {
          newBody = { ...newBody, [field]: realId };
          changed = true;
        }
      }
    }

    if (changed) {
      await db.pendingRequests.put({ ...req, url: newUrl, body: newBody });
    }
  }

  // Přepsat ID i v cache (je-li záznam uložen s tempId)
  const cacheTables = [
    db.revizeCache, db.rozvadecCache, db.okruhCache, db.cranicCache,
    db.mistnostCache, db.zarizeniCache, db.zavadaCache,
  ];
  for (const table of cacheTables) {
    const tempRecord = await table.get(tempId);
    if (tempRecord) {
      await table.delete(tempId);
      await table.put({ ...tempRecord, id: realId, data: { ...tempRecord.data, id: realId } });
    }
  }
}

// Hook pro synchronizaci fronty (automaticky i ručně).
// Vrací syncedCount — počet requestů úspěšně odeslaných na server.
export function useOfflineQueueSync() {
  const sync = useCallback(async (): Promise<{ syncedCount: number }> => {
    const requests = await getAllPendingRequests();
    let syncedCount = 0;

    for (const req of requests) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);

        const response = await fetch(req.url, {
          method: req.method,
          headers: {
            'Content-Type': 'application/json',
            ...(req.headers || {}),
          },
          body: req.body ? JSON.stringify(req.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // Temp ID remapping: po úspěšném POST přepsat FK v závislých requestech
          if (req.method === 'POST' && req.tempId !== undefined) {
            try {
              const json = await response.clone().json();
              if (typeof json?.id === 'number') {
                await remapTempIdInQueue(req.tempId, json.id);
              }
            } catch { /* chyba parsování – remapping přeskočíme */ }
          }
          await removePendingRequest(req.id!);
          syncedCount++;
        }
        // Při chybě odpovědi necháme v frontě pro další pokus
      } catch {
        // Síťová chyba nebo timeout – necháme v frontě
      }
    }

    // Vyčistit zbývající temp záznamy (záporná ID) z cache po synchronizaci
    const tables = [
      db.revizeCache, db.rozvadecCache, db.okruhCache, db.cranicCache,
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

    return { syncedCount };
  }, []);

  return { sync };
}
