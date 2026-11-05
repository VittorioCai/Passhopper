import { describe, expect, it } from 'vitest';
import { CITIES } from './cities';
import { ideaStats, previewTrip, ROUTE_IDEAS } from './routeIdeas';
import { analyze } from '../engine/optimizer';

describe('route ideas', () => {
  it('use known cities and have both languages filled in', () => {
    const ids = new Set(CITIES.map((c) => c.id));
    for (const r of ROUTE_IDEAS) {
      expect(ids.has(r.origin)).toBe(true);
      expect(r.stops.length).toBeGreaterThan(1);
      for (const t of [r.title, r.summary, r.best, ...r.tips, ...r.stops.map((s) => s.note)]) {
        expect(t.en.length).toBeGreaterThan(3);
        expect(t.zh.length).toBeGreaterThan(1);
        expect(t.en.length).toBeLessThan(500);
      }
      for (const s of r.stops) {
        expect(ids.has(s.city)).toBe(true);
        expect(s.nights).toBeGreaterThan(0);
      }
    }
    expect(new Set(ROUTE_IDEAS.map((r) => r.id)).size).toBe(ROUTE_IDEAS.length);
  });

  it('fit in a month so a Flexi pass can cover them', () => {
    for (const r of ROUTE_IDEAS) {
      const st = ideaStats(r);
      expect(st.days).toBeLessThanOrEqual(30);
      expect(st.trainDays).toBeLessThanOrEqual(10);
      expect(() => analyze(previewTrip(r, 'en'))).not.toThrow();
    }
  });
});
