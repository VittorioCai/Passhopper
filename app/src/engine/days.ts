import { addDays } from '../model/dates';
import type { Segment, Trip } from '../model/schema';
import { isNightTrain, schedule, segmentMinutes } from '../model/trip';
import { ruleFor, trainType, type SegmentRule } from './coverage';
import { classifyJourneys, type JourneyKind, type NotCoveredReason } from './residency';

export type PriceKey = 'min' | 'mid' | 'max';

export interface DayItem {
  seg: Segment;
  fromStopId: string;
  toStopId: string;
  kind: JourneyKind;
  rule: SegmentRule;
  /** Whether the pass can be used on this train at all. */
  coverable: boolean;
  notCoveredReason?: NotCoveredReason | 'operator' | 'unknown_train';
  /** Ticket price for buying it separately; undefined when the traveller has not entered one. */
  price?: Record<PriceKey, number>;
}

export interface TravelDay {
  /** The calendar day this travel counts against (night trains count on the day they leave). */
  date: string;
  items: DayItem[];
  /** True when at least one train that day can use the pass. */
  coverable: boolean;
  night: boolean;
  /** What a travel day saves: ticket prices of covered trains minus their reservation fees. */
  value: Record<PriceKey, number>;
  /**
   * `value`, with a rough estimate from travel time for trains without a price. Used only to
   * choose which days to spend the pass on, so planning works before any price is entered.
   */
  rank: Record<PriceKey, number>;
  /** Ticket prices of every train that day. */
  tickets: Record<PriceKey, number>;
  /** Mandatory reservation fees of covered trains. */
  fees: number;
  missingPrices: number;
}

const zero = (): Record<PriceKey, number> => ({ min: 0, mid: 0, max: 0 });

/** A rough fare from travel time, for ranking days only. Never shown as a price. */
export const estimateFare = (minutes: number): Record<PriceKey, number> => ({
  min: 5 + 0.1 * minutes,
  mid: 8 + 0.2 * minutes,
  max: 10 + 0.35 * minutes,
});
const KEYS: PriceKey[] = ['min', 'mid', 'max'];

/**
 * Groups every train into travel days. A train counts on the date it departs: a night train that
 * runs past midnight uses only that day, while a train boarded after midnight counts on the next
 * day (RULES-AND-SOURCES R5).
 */
export function buildDays(trip: Trip): TravelDay[] {
  const sched = schedule(trip);
  const classes = classifyJourneys(trip);
  const byDate = new Map<string, TravelDay>();
  trip.journeys.forEach((j, ji) => {
    const startIdx = trip.stops.findIndex((s) => s.id === j.fromStopId);
    const start = sched[startIdx]?.depart ?? trip.startDate;
    const fromC = trip.stops[startIdx]!.place.country;
    const toC = trip.stops.find((s) => s.id === j.toStopId)!.place.country;
    const cls = classes[ji]!;
    for (const seg of j.segments) {
      const date = addDays(start, seg.depDay);
      const rule = ruleFor(trainType(seg.trainNumber), fromC, toC, trip.traveller.travelClass);
      const notCoveredReason = !cls.allowed
        ? cls.reason
        : rule.coverage === 'not_covered'
          ? 'operator'
          : undefined;
      const item: DayItem = {
        seg,
        fromStopId: j.fromStopId,
        toStopId: j.toStopId,
        kind: cls.kind,
        rule,
        coverable: !notCoveredReason,
        notCoveredReason,
        price: seg.price
          ? { min: seg.price.min, mid: (seg.price.min + seg.price.max) / 2, max: seg.price.max }
          : undefined,
      };
      const day = byDate.get(date) ?? {
        date,
        items: [],
        coverable: false,
        night: false,
        value: zero(),
        rank: zero(),
        tickets: zero(),
        fees: 0,
        missingPrices: 0,
      };
      day.items.push(item);
      byDate.set(date, day);
    }
  });
  for (const day of byDate.values()) {
    day.coverable = day.items.some((i) => i.coverable);
    day.night = day.items.some((i) => i.coverable && isNightTrain(i.seg));
    for (const i of day.items) {
      if (!i.price) day.missingPrices++;
      const est = estimateFare(segmentMinutes(i.seg));
      for (const k of KEYS) {
        const p = i.price?.[k] ?? 0;
        day.tickets[k] += p;
        if (i.coverable) {
          day.value[k] += p - i.rule.fee;
          day.rank[k] += (i.price ? p : est[k]) - i.rule.fee;
        }
      }
      if (i.coverable) day.fees += i.rule.fee;
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
