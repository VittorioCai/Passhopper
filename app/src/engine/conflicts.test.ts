import { describe, expect, it } from 'vitest';
import { makeSampleTrip } from '../data/sampleTrip';
import type { Segment } from '../model/schema';
import { setNights } from '../model/trip';
import { findConflicts } from './conflicts';

const seg = (n: string, dep: string, arr: string, depDay = 0, arrDay = depDay): Segment => ({
  id: n,
  trainNumber: n,
  from: 'A',
  to: 'B',
  depDay,
  depTime: dep,
  arrDay,
  arrTime: arr,
  source: 'manual',
});

describe('findConflicts', () => {
  it('finds nothing in the sample trip', () => {
    expect(findConflicts(makeSampleTrip('en'))).toEqual([]);
  });

  it('flags overlapping, tight and too many changes, and very long days', () => {
    const t = makeSampleTrip('en');
    t.journeys[0]!.segments = [
      seg('A1', '06:00', '08:00'),
      seg('A2', '07:50', '09:00'),
      seg('A3', '09:05', '12:00'),
      seg('A4', '12:30', '15:00'),
      seg('A5', '15:30', '17:30'),
    ];
    const types = findConflicts(t).map((c) => c.type);
    expect(types).toEqual(['overlap', 'tight', 'many_changes', 'long_day']);
  });

  it('flags a missed connection at a stop with no nights', () => {
    let t = makeSampleTrip('en');
    t = setNights(t, t.stops[1]!.id, 0); // Munich: arrive 12:35, then the Zurich train leaves 09:33
    const c = findConflicts(t);
    expect(c).toEqual([
      { type: 'missed_connection', fromStopId: t.stops[1]!.id, stopId: t.stops[1]!.id },
    ]);
    t.journeys[1]!.segments = [seg('ECE 198', '13:33', '17:01')];
    expect(findConflicts(t)).toEqual([]);
  });

  it('does not count a night train as a long day', () => {
    const t = makeSampleTrip('en');
    t.journeys[0]!.segments = [seg('NJ 1', '20:00', '09:00', 0, 1)];
    expect(findConflicts(t)).toEqual([]);
  });
});
