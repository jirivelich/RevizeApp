import Dexie from 'dexie';
import type { Table } from 'dexie';

export type PendingRequest = {
  id?: number;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body: any;
  headers?: Record<string, string>;
  createdAt: number;
};

export type CacheRecord = {
  id: number;
  data: any;
  updatedAt: number;
};

export class RevizeAppDB extends Dexie {
  pendingRequests!: Table<PendingRequest, number>;
  revizeCache!: Table<CacheRecord, number>;
  rozvadecCache!: Table<CacheRecord, number>;
  mistnostCache!: Table<CacheRecord, number>;
  zavadaCache!: Table<CacheRecord, number>;
  okruhCache!: Table<CacheRecord, number>;
  cranicCache!: Table<CacheRecord, number>;
  zarizeniCache!: Table<CacheRecord, number>;
  firmaCache!: Table<CacheRecord, number>;
  zakaznikCache!: Table<CacheRecord, number>;
  pristrojCache!: Table<CacheRecord, number>;
  zakazkaCache!: Table<CacheRecord, number>;
  nastaveniCache!: Table<CacheRecord, number>;
  zavadaKatalogCache!: Table<CacheRecord, number>;
  predvolenyTextCache!: Table<CacheRecord, number>;

  constructor() {
    super('RevizeAppDB');
    this.version(5).stores({
      pendingRequests: '++id, url, method, createdAt',
      revizeCache: 'id, updatedAt',
      rozvadecCache: 'id, updatedAt',
      mistnostCache: 'id, updatedAt',
      zavadaCache: 'id, updatedAt',
      okruhCache: 'id, updatedAt',
      zarizeniCache: 'id, updatedAt',
      firmaCache: 'id, updatedAt',
      zakaznikCache: 'id, updatedAt',
      pristrojCache: 'id, updatedAt',
      zakazkaCache: 'id, updatedAt',
      nastaveniCache: 'id, updatedAt',
      zavadaKatalogCache: 'id, updatedAt',
      predvolenyTextCache: 'id, updatedAt',
    });
    this.version(6).stores({
      pendingRequests: '++id, url, method, createdAt',
      revizeCache: 'id, updatedAt',
      rozvadecCache: 'id, updatedAt',
      mistnostCache: 'id, updatedAt',
      zavadaCache: 'id, updatedAt',
      okruhCache: 'id, updatedAt',
      cranicCache: 'id, updatedAt',
      zarizeniCache: 'id, updatedAt',
      firmaCache: 'id, updatedAt',
      zakaznikCache: 'id, updatedAt',
      pristrojCache: 'id, updatedAt',
      zakazkaCache: 'id, updatedAt',
      nastaveniCache: 'id, updatedAt',
      zavadaKatalogCache: 'id, updatedAt',
      predvolenyTextCache: 'id, updatedAt',
    });
  }
}

export const db = new RevizeAppDB();
