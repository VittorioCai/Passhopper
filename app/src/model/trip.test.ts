import { describe, expect, it } from 'vitest';
import { makeSampleTrip } from '../data/sampleTrip';
import { formatDate, formatDuration } from './dates';
import { SegmentSchema, TripSchema, type Place, type Segment, type Trip } from './schema';
import {
  addStop,
  canMove,
  createTrip,
  destinationCount,
  duplicateTrip,
  journeyFrom,
  moveStop,
  moveStopTo,
  sortTrips,
  newId,
  removeSegment,
  removeStop,
  schedule,
  segmentMinutes,
  setNights,
  tripRange,
  upsertSegment,
} from './trip';

const P = (id: string, country = 'DE'): Place => ({ id, en: id, local: id, country });
const base = () =>
  createTrip({
    name: 'Test',
    traveller: { residence: { type: 'non_europe' }, ageGroup: 'adult', travelClass: 2, count: 1 },
    startDate: '2027-07-01',
    places: [P('a'), P('b'), P('c', 'AT')],
    nights: [2, 3],
    returnToStart: false,
  });
const seg = (o: Partial<Segment> = {}): Segment => ({
  id: newId(),
  trainNumber: 'X 1',
  from: '',
  to: '',
  depDay: 0,
  depTime: '08:00',
  arrDay: 0,
  arrTime: '10:00',
  source: 'manual',
  ...o,
});
const names = (t: Trip) => t.stops.map((s) => s.place.id).join(',');

describe('createTrip', () => {
  it('starts at the first place with one journey between each pair of stops', () => {
    const t = base();
    expect(names(t)).toBe('a,b,c');
    expect(t.stops[0]!.nights).toBe(0);
    expect(t.journeys).toHaveLength(2);
    expect(TripSchema.safeParse(t).success).toBe(true);
  });

  it('adds the start again at the end when returning home', () => {
    const t = createTrip({ ...baseInput(), returnToStart: true });
    expect(names(t)).toBe('a,b,c,a');
    expect(t.journeys).toHaveLength(3);
  });
});

function baseInput() {
  return {
    name: 'T',
    traveller: {
      residence: { type: 'non_europe' as const },
      ageGroup: 'adult' as const,
      travelClass: 2 as const,
      count: 1,
    },
    startDate: '2027-07-01',
    places: [P('a'), P('b'), P('c')],
    nights: [2, 3],
    returnToStart: false,
  };
}

describe('schedule', () => {
  it('counts nights from each arrival', () => {
    const s = schedule(base());
    expect(s.map((x) => [x.arrive, x.depart])).toEqual([
      [undefined, '2027-07-01'],
      ['2027-07-01', '2027-07-03'],
      ['2027-07-03', undefined],
    ]);
  });

  it('arrives a day later after a night train', () => {
    let t = base();
    t = upsertSegment(t, t.stops[0]!.id, seg({ depTime: '20:00', arrDay: 1, arrTime: '08:00' }));
    const s = schedule(t);
    expect(s[1]!.arrive).toBe('2027-07-02');
    expect(s[1]!.depart).toBe('2027-07-04');
    expect(tripRange(t).days).toBe(4);
  });
});

describe('editing stops', () => {
  it('keeps trains for pairs that stay neighbours and drops the rest', () => {
    let t = base();
    t = upsertSegment(t, t.stops[0]!.id, seg());
    t = upsertSegment(t, t.stops[1]!.id, seg());
    const moved = moveStop(t, t.stops[2]!.id, -1); // a,c,b
    expect(names(moved)).toBe('a,c,b');
    expect(moved.journeys.every((j) => j.segments.length === 0)).toBe(true);
    const back = moveStop(moved, moved.stops[2]!.id, -1); // a,b,c with fresh journeys
    expect(names(back)).toBe('a,b,c');
  });

  it('never moves or removes the starting place', () => {
    const t = base();
    expect(canMove(t, t.stops[0]!.id, 1)).toBe(false);
    expect(canMove(t, t.stops[1]!.id, -1)).toBe(false);
    expect(moveStop(t, t.stops[1]!.id, -1)).toBe(t);
    expect(removeStop(t, t.stops[0]!.id)).toBe(t);
  });

  it('inserts, removes and changes nights', () => {
    let t = addStop(base(), P('x', 'CH'), 2, 1);
    expect(names(t)).toBe('a,b,x,c');
    expect(t.journeys).toHaveLength(3);
    t = setNights(t, t.stops[2]!.id, 99);
    expect(t.stops[2]!.nights).toBe(60);
    t = removeStop(t, t.stops[2]!.id);
    expect(names(t)).toBe('a,b,c');
    expect(destinationCount(t)).toBe(2);
  });
});

describe('segments', () => {
  it('sorts trains by departure and removes them', () => {
    let t = base();
    const from = t.stops[0]!.id;
    const late = seg({ depTime: '15:00', arrTime: '16:00' });
    const early = seg({ depTime: '07:00', arrTime: '09:00' });
    t = upsertSegment(upsertSegment(t, from, late), from, early);
    expect(journeyFrom(t, from)!.segments.map((s) => s.depTime)).toEqual(['07:00', '15:00']);
    t = removeSegment(t, from, early.id);
    expect(journeyFrom(t, from)!.segments).toHaveLength(1);
  });

  it('rejects a train that arrives before it leaves', () => {
    expect(SegmentSchema.safeParse(seg({ depTime: '10:00', arrTime: '09:00' })).success).toBe(
      false,
    );
    expect(
      SegmentSchema.safeParse(seg({ depTime: '22:00', arrDay: 1, arrTime: '06:00' })).success,
    ).toBe(true);
  });

  it('measures duration across midnight', () => {
    expect(segmentMinutes(seg({ depTime: '19:18', arrDay: 1, arrTime: '09:59' }))).toBe(881);
  });
});

describe('duplicateTrip', () => {
  it('gives every stop, journey and train a new id', () => {
    const t = makeSampleTrip('en');
    const c = duplicateTrip(t, 'Copy');
    expect(c.id).not.toBe(t.id);
    expect(c.sample).toBeUndefined();
    const oldIds = new Set([
      ...t.stops.map((s) => s.id),
      ...t.journeys.flatMap((j) => j.segments.map((s) => s.id)),
    ]);
    expect(c.stops.some((s) => oldIds.has(s.id))).toBe(false);
    expect(c.journeys.every((j, i) => j.segments.length === t.journeys[i]!.segments.length)).toBe(
      true,
    );
    expect(TripSchema.safeParse(c).success).toBe(true);
  });
});

describe('sample trip', () => {
  it('is valid and lasts 20 days with the night train', () => {
    const t = makeSampleTrip('en');
    expect(TripSchema.safeParse(t).success).toBe(true);
    expect(tripRange(t)).toEqual({ start: '2027-07-14', end: '2027-08-02', days: 20 });
  });
});

describe('formatting', () => {
  it('formats dates and durations in both languages', () => {
    expect(formatDate('2027-07-14', 'en', { weekday: true })).toBe('Wed, Jul 14');
    expect(formatDate('2027-07-14', 'zh-CN')).toBe('7月14日');
    expect(formatDuration(241, 'en')).toBe('4h 01m');
    expect(formatDuration(241, 'zh-CN')).toBe('4小时01分');
  });
});

describe('sortTrips', () => {
  it('lists trips ahead by start date, then past trips newest first', () => {
    const mk = (start: string, name: string) => ({
      ...makeSampleTrip('en'),
      startDate: start,
      name,
    });
    const trips = [
      mk('2027-08-01', 'b'),
      mk('2025-05-01', 'old'),
      mk('2027-07-01', 'a'),
      mk('2026-06-01', 'last'),
    ];
    const r = sortTrips(trips, '2026-11-04');
    expect(r.upcoming.map((t) => t.name)).toEqual(['a', 'b']);
    expect(r.past.map((t) => t.name)).toEqual(['last', 'old']);
  });
});

describe('moveStopTo', () => {
  it('moves a stop and keeps trains between pairs that stay neighbours', () => {
    const t = makeSampleTrip('en');
    const vienna = t.stops[7]!;
    const moved = moveStopTo(t, vienna.id, 2);
    expect(moved.stops.map((s) => s.place.id).slice(0, 4)).toEqual([
      'berlin',
      'munich',
      'vienna',
      'zurich',
    ]);
    // Berlin → Munich is untouched and keeps its train.
    expect(moved.journeys[0]!.segments[0]!.trainNumber).toBe('ICE 1005');
    expect(moveStopTo(t, t.stops[0]!.id, 3)).toBe(t);
    expect(moveStopTo(t, vienna.id, 0).stops[1]!.id).toBe(vienna.id);
  });
});
