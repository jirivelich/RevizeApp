// src/services/safeApiRequest.ts
import { addPendingRequest } from '../hooks/useOfflineQueue';

/**
 * Bezpečný zápisový API požadavek s offline podporou.
 * Pokud je online, provede fetch s 8s timeoutem. Pokud je offline nebo
 * fetch selže (chyba sítě, timeout), uloží požadavek do Dexie fronty.
 */
export async function safeApiRequest({ url, method, body, headers, tempId }: {
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: HeadersInit;
  tempId?: number;
}): Promise<Response | undefined> {
  if (navigator.onLine) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch {
      clearTimeout(timeoutId);
      // Síť nedostupná nebo timeout — zařadit do offline fronty
      await addPendingRequest({ url, method, body, headers: headers as Record<string, string>, tempId });
      return undefined;
    }
  } else {
    await addPendingRequest({ url, method, body, headers: headers as Record<string, string>, tempId });
    return undefined;
  }
}
