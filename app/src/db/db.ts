import Dexie, { type EntityTable } from 'dexie';
import type { Trip } from '../model/schema';

interface Meta {
  key: string;
  value: unknown;
}

/** Everything is stored on this device only (IndexedDB). Nothing is sent to a server. */
export class PasshopperDB extends Dexie {
  trips!: EntityTable<Trip, 'id'>;
  meta!: EntityTable<Meta, 'key'>;

  constructor(name = 'passhopper') {
    super(name);
    this.version(1).stores({
      trips: 'id, updatedAt',
      meta: 'key',
    });
  }
}

export const db = new PasshopperDB();
