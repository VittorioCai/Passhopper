import type { Trip } from '../model/schema';

export type JourneyKind = 'abroad' | 'domestic' | 'outbound' | 'inbound';
export type NotCoveredReason = 'home_domestic' | 'home_second_out' | 'home_second_in';

export interface JourneyClass {
  fromStopId: string;
  kind: JourneyKind;
  /** Whether the home-country rule lets the pass cover this journey. */
  allowed: boolean;
  reason?: NotCoveredReason;
}

/**
 * Home-country rule (RULES-AND-SOURCES R4, confirmed on interrail.com): someone living in a Pass
 * Network country gets one journey out of it and one journey back in. Journeys that stay inside the
 * home country are not covered. People living elsewhere have no such limit.
 */
export function classifyJourneys(trip: Trip): JourneyClass[] {
  const res = trip.traveller.residence;
  const home = res.type === 'europe' ? res.country : null;
  let outUsed = false;
  let inUsed = false;
  return trip.journeys.map((j) => {
    const from = trip.stops.find((s) => s.id === j.fromStopId)!.place.country;
    const to = trip.stops.find((s) => s.id === j.toStopId)!.place.country;
    if (!home || (from !== home && to !== home))
      return { fromStopId: j.fromStopId, kind: 'abroad', allowed: true };
    if (from === home && to === home)
      return {
        fromStopId: j.fromStopId,
        kind: 'domestic',
        allowed: false,
        reason: 'home_domestic',
      };
    if (from === home) {
      const first = !outUsed;
      outUsed = true;
      return {
        fromStopId: j.fromStopId,
        kind: 'outbound',
        allowed: first,
        reason: first ? undefined : 'home_second_out',
      };
    }
    const first = !inUsed;
    inUsed = true;
    return {
      fromStopId: j.fromStopId,
      kind: 'inbound',
      allowed: first,
      reason: first ? undefined : 'home_second_in',
    };
  });
}
