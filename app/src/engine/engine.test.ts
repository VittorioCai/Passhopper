import { describe, expect, it } from 'vitest';
import { makeSampleTrip } from '../data/sampleTrip';
import type { Place, Segment, Trip, Traveller } from '../model/schema';
import { createTrip, newId, upsertSegment } from '../model/trip';
import { ruleFor, trainType } from './coverage';
import { buildDays } from './days';
import { analyze, bestDays, currentPlan } from './optimizer';
import { classifyJourneys } from './residency';
import { PASSES } from '../data/passes';

const P = (id: string, country: string): Place => ({ id, en: id, local: id, country });
const T = (o: Partial<Segment>): Segment => ({
  id: newId(),
  trainNumber: 'IC 1',
  from: '',
  to: '',
  depDay: 0,
  depTime: '08:00',
  arrDay: 0,
  arrTime: '10:00',
  source: 'manual',
  ...o,
});
const price = (min: number, max = min) => ({
  min,
  max,
  currency: 'EUR' as const,
  source: 'user' as const,
});
const nonEu: Traveller = {
  residence: { type: 'non_europe' },
  ageGroup: 'adult',
  travelClass: 2,
  count: 1,
};
const deResident: Traveller = {
  residence: { type: 'europe', country: 'DE' },
  ageGroup: 'adult',
  travelClass: 2,
  count: 1,
};

/** A trip through the given places, one train per leg, each leg one night apart unless nights given. */
function trip(
  places: Place[],
  trains: Partial<Segment>[],
  traveller = nonEu,
  nights?: number[],
): Trip {
  let t = createTrip({
    name: 't',
    traveller,
    startDate: '2027-07-01',
    places,
    nights: nights ?? places.slice(1).map(() => 1),
    returnToStart: false,
  });
  t.journeys.forEach((j, i) => {
    if (trains[i]) t = upsertSegment(t, j.fromStopId, T(trains[i]!));
  });
  return t;
}

describe('trainType and rules', () => {
  it('reads the train type from what people type', () => {
    expect(trainType('FR 9709')).toBe('FR');
    expect(trainType('fr9709')).toBe('FR');
    expect(trainType('Nightjet 40294')).toBe('NJ');
    expect(trainType('TGV INOUI 6201')).toBe('TGV');
    expect(trainType('9709')).toBe('');
  });

  it('picks the most specific rule', () => {
    expect(ruleFor('EC', 'CH', 'IT', 2).reservation).toBe('recommended');
    expect(ruleFor('EC', 'CH', 'DE', 2).reservation).toBe('none');
    expect(ruleFor('FR', 'IT', 'IT', 2)).toMatchObject({
      reservation: 'mandatory',
      fee: 13,
      feeKnown: true,
    });
    expect(ruleFor('TGV', 'FR', 'FR', 1)).toMatchObject({ fee: 20, quota: true });
    expect(ruleFor('NJ', 'IT', 'AT', 2)).toMatchObject({
      reservation: 'mandatory',
      fee: 0,
      feeKnown: false,
    });
    expect(ruleFor('ITA', 'IT', 'IT', 2).coverage).toBe('not_covered');
    expect(ruleFor('XYZ', 'IT', 'IT', 2)).toMatchObject({
      coverage: 'unknown',
      reservation: 'unknown',
    });
  });
});

describe('home-country rule (R4)', () => {
  const places = [
    P('berlin', 'DE'),
    P('munich', 'DE'),
    P('vienna', 'AT'),
    P('salzburg', 'AT'),
    P('cologne', 'DE'),
    P('paris', 'FR'),
    P('berlin2', 'DE'),
  ];

  it('blocks trips inside the home country and allows one trip out and one back', () => {
    const t = trip(
      places,
      places.slice(1).map(() => ({})),
      deResident,
    );
    expect(classifyJourneys(t).map((c) => `${c.kind}:${c.allowed}`)).toEqual([
      'domestic:false',
      'outbound:true',
      'abroad:true',
      'inbound:true',
      'outbound:false',
      'inbound:false',
    ]);
  });

  it('does not apply to people living outside Europe', () => {
    const t = trip(
      places,
      places.slice(1).map(() => ({})),
      nonEu,
    );
    expect(classifyJourneys(t).every((c) => c.allowed)).toBe(true);
  });

  it('marks those trains as not coverable', () => {
    const t = trip(places.slice(0, 3), [{ price: price(50) }, { price: price(80) }], deResident);
    const d = buildDays(t);
    expect(d[0]!.coverable).toBe(false);
    expect(d[0]!.items[0]!.notCoveredReason).toBe('home_domestic');
    expect(d[1]!.coverable).toBe(true);
  });
});

describe('travel days (R5)', () => {
  it('counts a night train only on the day it leaves', () => {
    const t = trip(
      [P('a', 'IT'), P('b', 'AT'), P('c', 'CZ')],
      [
        { trainNumber: 'NJ 1', depTime: '19:00', arrDay: 1, arrTime: '09:00', price: price(100) },
        { trainNumber: 'RJ 2', price: price(40) },
      ],
    );
    const d = buildDays(t);
    expect(d.map((x) => x.date)).toEqual(['2027-07-01', '2027-07-03']);
    expect(d[0]!.night).toBe(true);
  });

  it('counts a train boarded after midnight on the next day', () => {
    let t = trip(
      [P('a', 'IT'), P('b', 'AT')],
      [{ trainNumber: 'NJ 1', depTime: '22:00', arrDay: 1, arrTime: '02:00', price: price(80) }],
    );
    t = upsertSegment(
      t,
      t.stops[0]!.id,
      T({
        trainNumber: 'RJ 9',
        depDay: 1,
        depTime: '03:00',
        arrDay: 1,
        arrTime: '06:00',
        price: price(30),
      }),
    );
    expect(buildDays(t).map((d) => d.date)).toEqual(['2027-07-01', '2027-07-02']);
  });

  it('puts several trains on the same day into one travel day', () => {
    let t = trip([P('a', 'DE'), P('b', 'AT')], [{ trainNumber: 'ICE 1', price: price(30) }]);
    t = upsertSegment(
      t,
      t.stops[0]!.id,
      T({ trainNumber: 'RJ 5', depTime: '11:00', arrTime: '13:00', price: price(20) }),
    );
    const d = buildDays(t);
    expect(d).toHaveLength(1);
    expect(d[0]!.value.mid).toBe(50);
  });

  it('never uses the pass on trains it does not cover', () => {
    const d = buildDays(
      trip([P('a', 'IT'), P('b', 'IT')], [{ trainNumber: 'ITA 8901', price: price(40) }]),
    );
    expect(d[0]!.coverable).toBe(false);
    expect(d[0]!.items[0]!.notCoveredReason).toBe('operator');
  });

  it('subtracts reservation fees from what a travel day saves', () => {
    const d = buildDays(
      trip([P('a', 'IT'), P('b', 'IT')], [{ trainNumber: 'FR 1', price: price(45) }]),
    );
    expect(d[0]!.value.mid).toBe(32);
    expect(d[0]!.fees).toBe(13);
  });
});

describe('optimizer', () => {
  const flexi4 = PASSES.find((p) => p.id === 'flexi-4-1m')!;

  it('uses the most valuable days within the validity window', () => {
    const vals = [10, 80, 20, 60, 70, 5];
    const places = [P('s', 'FR'), ...vals.map((_, i) => P(`c${i}`, 'FR'))];
    const t = trip(
      places,
      vals.map((v) => ({ trainNumber: 'TER 1', price: price(v) })),
    );
    const b = bestDays(flexi4, buildDays(t), 'mid');
    expect(b.savings).toBe(80 + 60 + 70 + 20);
  });

  it('respects the validity window', () => {
    const places = [P('s', 'FR'), P('a', 'FR'), P('b', 'FR')];
    const t = trip(
      places,
      [
        { trainNumber: 'TER 1', price: price(90) },
        { trainNumber: 'TER 2', price: price(80) },
      ],
      nonEu,
      [40, 1],
    );
    const b = bestDays(flexi4, buildDays(t), 'mid');
    expect(b.chosen).toHaveLength(1);
    expect(b.savings).toBe(90);
  });

  it('does not use the pass for a night train on the last valid day', () => {
    const places = [P('s', 'FR'), P('a', 'FR'), P('b', 'AT')];
    const t = trip(
      places,
      [
        { trainNumber: 'TER 1', price: price(50) },
        { trainNumber: 'NJ 2', depTime: '20:00', arrDay: 1, arrTime: '08:00', price: price(200) },
      ],
      nonEu,
      [30, 1],
    );
    // TER on Jul 1 and the night train on Jul 31: Jul 31 is the 31st day of a window starting Jul 1.
    const days = buildDays(t);
    expect(days.map((d) => d.date)).toEqual(['2027-07-01', '2027-07-31']);
    const b = bestDays(flexi4, days, 'mid');
    expect(b.chosen).toEqual(['2027-07-31']);
    expect(b.savings).toBe(200);
  });

  it('shows when cheap advance fares would flip the answer', () => {
    const places = [P('s', 'IT'), P('a', 'IT'), P('b', 'IT'), P('c', 'IT'), P('d', 'IT')];
    const t = trip(
      places,
      places.slice(1).map(() => ({
        trainNumber: 'R 1',
        price: { min: 20, max: 140, currency: 'EUR' as const, source: 'user' as const },
      })),
    );
    const a = analyze({ ...t, traveller: { ...t.traveller, ageGroup: 'adult' } });
    const f4 = a.options.find((o) => o.product.id === 'flexi-4-1m')!;
    expect(f4.cost.mid).toBeLessThan(a.tickets.mid);
    expect(f4.cost.min).toBeGreaterThan(a.tickets.min);
  });

  it('leaves out passes with no price for the traveller', () => {
    const t = trip([P('a', 'FR'), P('b', 'FR')], [{ trainNumber: 'TER 1', price: price(10) }], {
      ...nonEu,
      travelClass: 1,
    });
    const a = analyze(t);
    expect(a.options).toHaveLength(0);
    expect(a.unpriced).toHaveLength(PASSES.length);
    expect(currentPlan(t, a)).toBeNull();
  });
});

describe('plan', () => {
  it('recommends a pass for the sample trip and respects manual overrides', () => {
    const t = makeSampleTrip('en');
    const a = analyze(t);
    expect(a.recommended).toBeDefined();
    const plan = currentPlan(t, a)!;
    expect(plan.errors).toEqual([]);
    // Berlin → Munich stays inside Germany for a German resident.
    expect(plan.days[0]!.choice).toBe('locked');
    const passDay = plan.days.find((d) => d.choice === 'pass')!;
    const changed = currentPlan({ ...t, pass: { overrides: { [passDay.date]: 'ticket' } } }, a)!;
    expect(changed.days.find((d) => d.date === passDay.date)!.choice).toBe('ticket');
    expect(changed.total).toBeGreaterThanOrEqual(plan.total);
  });

  it('flags too many travel days', () => {
    const t = makeSampleTrip('en');
    const a = analyze(t);
    const overrides = Object.fromEntries(
      a.days.filter((d) => d.coverable).map((d) => [d.date, 'pass' as const]),
    );
    const plan = currentPlan({ ...t, pass: { productId: 'flexi-4-1m', overrides } }, a)!;
    expect(plan.errors[0]).toMatchObject({ type: 'too_many_days', allowed: 4 });
  });
});

describe('sensitivity', () => {
  it('finds the train whose cheaper fare would make tickets win', async () => {
    const { findFlip, winner } = await import('./sensitivity');
    const places = [P('s', 'FR'), P('a', 'FR'), P('b', 'FR'), P('c', 'FR'), P('d', 'FR')];
    const t = trip(places, [
      { trainNumber: 'TER 1', price: price(70, 90) },
      { trainNumber: 'TER 2', price: price(70, 90) },
      { trainNumber: 'TER 3', price: price(70, 90) },
      { trainNumber: 'TER 4', price: price(10, 150) },
    ]);
    const a = analyze(t);
    expect(winner(a)).toBe('flexi-4-1m');
    const f = findFlip(t, a)!;
    expect(f).toMatchObject({
      trainNumber: 'TER 4',
      direction: 'cheaper',
      price: 10,
      newWinner: 'tickets',
    });
  });

  it('returns null when no single price changes the answer', async () => {
    const { findFlip } = await import('./sensitivity');
    const t = trip([P('a', 'FR'), P('b', 'FR')], [{ trainNumber: 'TER 1', price: price(10) }]);
    expect(findFlip(t)).toBeNull();
  });
});
