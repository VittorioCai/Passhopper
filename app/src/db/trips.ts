import { useLiveQuery } from 'dexie-react-hooks';
import { makeSampleTrip } from '../data/sampleTrip';
import { ExportFileSchema, TripSchema, type ExportFile, type Trip } from '../model/schema';
import { duplicateTrip } from '../model/trip';
import { db, type PasshopperDB } from './db';

/** All trips, newest first. `undefined` while loading. */
export function useTrips() {
  return useLiveQuery(() => db.trips.orderBy('updatedAt').reverse().toArray(), []);
}

/** One trip. `undefined` while loading, `null` when it does not exist. */
export function useTrip(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await db.trips.get(id)) ?? null) : null), [id]);
}

export async function saveTrip(trip: Trip, store: PasshopperDB = db) {
  await store.trips.put(TripSchema.parse(trip));
}

export const deleteTrip = (id: string, store: PasshopperDB = db) => store.trips.delete(id);

export async function copyTrip(trip: Trip, name: string, store: PasshopperDB = db) {
  const copy = duplicateTrip(trip, name);
  await saveTrip(copy, store);
  return copy;
}

/** Adds the example trip the first time the app opens. Deleting it later keeps it deleted. */
export async function seedSampleOnce(lang: string, store: PasshopperDB = db) {
  await store.transaction('rw', store.trips, store.meta, async () => {
    if (await store.meta.get('sampleSeeded')) return;
    await store.trips.put(makeSampleTrip(lang));
    await store.meta.put({ key: 'sampleSeeded', value: true });
  });
}

export async function exportAll(store: PasshopperDB = db): Promise<ExportFile> {
  return {
    app: 'passhopper',
    version: 1,
    exportedAt: new Date().toISOString(),
    trips: await store.trips.toArray(),
  };
}

export type ImportResult = { ok: true; count: number } | { ok: false; error: string };

/** Imports trips from an export file. Each trip is added as a copy, so nothing already here is overwritten. */
export async function importFile(text: string, store: PasshopperDB = db): Promise<ImportResult> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not_json' };
  }
  const parsed = ExportFileSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const copies = parsed.data.trips.map((t) => duplicateTrip(t, t.name));
  await store.trips.bulkPut(copies);
  return { ok: true, count: copies.length };
}

export async function deleteEverything(store: PasshopperDB = db) {
  await store.transaction('rw', store.trips, store.meta, async () => {
    await store.trips.clear();
    await store.meta.put({ key: 'sampleSeeded', value: true });
  });
}
