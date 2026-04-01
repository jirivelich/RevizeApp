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

// Typy pro cache dalších entit
export type RozvadecCache = {
  id: number;
  data: any; // nebo konkrétní typ Rozvadec
  updatedAt: number;
};
export type MistnostCache = {
  id: number;
  data: any; // nebo konkrétní typ Mistnost
  updatedAt: number;
};
export type ZavadaCache = {
  id: number;
  data: any; // nebo konkrétní typ Zavada
  updatedAt: number;
};
export type OkruhCache = {
  id: number;
  data: any; // nebo konkrétní typ Okruh
  updatedAt: number;
};
export type ZarizeniCache = {
  id: number;
  data: any; // nebo konkrétní typ Zarizeni
  updatedAt: number;
};

export class RevizeAppDB extends Dexie {
  pendingRequests!: Table<PendingRequest, number>;
  revizeCache!: Table<RevizeCache, number>;
  rozvadecCache!: Table<RozvadecCache, number>;
  mistnostCache!: Table<MistnostCache, number>;
  zavadaCache!: Table<ZavadaCache, number>;
  okruhCache!: Table<OkruhCache, number>;
  zarizeniCache!: Table<ZarizeniCache, number>;
  // ...další tabulky

  constructor() {
    super('RevizeAppDB');
    this.version(4).stores({
      pendingRequests: '++id, url, method, createdAt',
      revizeCache: 'id, updatedAt',
      rozvadecCache: 'id, updatedAt',
      mistnostCache: 'id, updatedAt',
      zavadaCache: 'id, updatedAt',
      okruhCache: 'id, updatedAt',
      zarizeniCache: 'id, updatedAt',
      // ...další tabulky
    });
  }
}

export const db = new RevizeAppDB();
