import Dexie from 'dexie';
import type { Table } from 'dexie';

// Typ pro pending API požadavek
export type PendingRequest = {
  id?: number;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body: any;
  headers?: Record<string, string>;
  createdAt: number;
};

export class RevizeAppDB extends Dexie {
  pendingRequests!: Table<PendingRequest, number>;
  // ...další tabulky

  constructor() {
    super('RevizeAppDB');
    this.version(1).stores({
      pendingRequests: '++id, url, method, createdAt',
      // ...další tabulky
    });
  }
}

export const db = new RevizeAppDB();
