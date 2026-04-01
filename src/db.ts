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

// Typ pro revizi (zjednodušený příklad, upravte dle skutečných dat)
export type RevizeCache = {
  id: number;
  data: any; // nebo konkrétní typ Revize
  updatedAt: number;
};

export class RevizeAppDB extends Dexie {
  pendingRequests!: Table<PendingRequest, number>;
  revizeCache!: Table<RevizeCache, number>;
  // ...další tabulky

  constructor() {
    super('RevizeAppDB');
    this.version(2).stores({
      pendingRequests: '++id, url, method, createdAt',
      revizeCache: 'id, updatedAt',
      // ...další tabulky
    });
  }
}

export const db = new RevizeAppDB();
