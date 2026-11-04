import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeSampleTrip } from '../data/sampleTrip';
import { PasshopperDB } from './db';
import {
  copyTrip,
  deleteEverything,
  exportAll,
  importFile,
  saveTrip,
  seedSampleOnce,
} from './trips';

let store: PasshopperDB;
let n = 0;
beforeEach(() => {
  store = new PasshopperDB(`test-${n++}`);
});
afterEach(async () => {
  await store.delete();
});

describe('trip storage', () => {
  it('adds the sample trip only once, even after it is deleted', async () => {
    await seedSampleOnce('en', store);
    expect(await store.trips.count()).toBe(1);
    await store.trips.clear();
    await seedSampleOnce('en', store);
    expect(await store.trips.count()).toBe(0);
  });

  it('round-trips through export and import as copies', async () => {
    const t = makeSampleTrip('en');
    await saveTrip(t, store);
    const file = await exportAll(store);
    const res = await importFile(JSON.stringify(file), store);
    expect(res).toEqual({ ok: true, count: 1 });
    const all = await store.trips.toArray();
    expect(all).toHaveLength(2);
    expect(new Set(all.map((x) => x.id)).size).toBe(2);
  });

  it('rejects files that are not Passhopper exports', async () => {
    expect(await importFile('not json', store)).toEqual({ ok: false, error: 'not_json' });
    expect(await importFile('{"app":"other"}', store)).toEqual({ ok: false, error: 'invalid' });
  });

  it('copies and deletes everything', async () => {
    const t = makeSampleTrip('en');
    await saveTrip(t, store);
    await copyTrip(t, 'Copy', store);
    expect(await store.trips.count()).toBe(2);
    await deleteEverything(store);
    expect(await store.trips.count()).toBe(0);
    await seedSampleOnce('en', store);
    expect(await store.trips.count()).toBe(0);
  });
});
