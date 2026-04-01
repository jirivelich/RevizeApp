// src/services/safeApiRequest.ts
import { addPendingRequest } from '../hooks/useOfflineQueue';

/**
 * Bezpečný zápisový API požadavek s offline podporou.
 * Pokud je online, provede fetch. Pokud je offline, uloží do Dexie fronty.
 */
export async function safeApiRequest({ url, method, body, headers }: {
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: HeadersInit;
}): Promise<Response | undefined> {
  if (navigator.onLine) {
    return fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } else {
    await addPendingRequest({ url, method, body, headers: headers as Record<string, string> });
    // Vrací undefined, protože zápis proběhne až po návratu online
    return undefined;
  }
}
