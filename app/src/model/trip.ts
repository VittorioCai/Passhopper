import { addDays, daysBetween } from './dates';
import type { Journey, Place, Segment, Stop, Traveller, Trip } from './schema';

export const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export interface NewTripInput {
  name: string;
  traveller: Traveller;
  startDate: string;
  /** The first place is where the trip starts. */
  places: Place[];
  /** Nights in each place after the first. */
  nights: number[];
  returnToStart: boolean;
}

export function createTrip(input: NewTripInput): Trip {
  const [origin, ...rest] = input.places;
  if (!origin) throw new Error('A trip needs a starting place');
  const stops: Stop[] = [
    { id: newId(), place: origin, nights: 0 },
    ...rest.map((place, i) => ({ id: newId(), place, nights: clampNights(input.nights[i] ?? 2) })),
  ];
  if (input.returnToStart && rest.length > 0) stops.push({ id: newId(), place: origin, nights: 0 });
  const t = now();
  return syncJourneys({
    id: newId(),
    schemaVersion: 1,
    name: input.name,
    createdAt: t,
    updatedAt: t,
    traveller: input.traveller,
    startDate: input.startDate,
    stops,
    journeys: [],
  });
}

const clampNights = (n: number) => Math.max(0, Math.min(60, Math.round(n)));

/** Keeps exactly one journey per pair of neighbouring stops, reusing trains already entered for that pair. */
export function syncJourneys(trip: Trip): Trip {
  const journeys: Journey[] = [];
  for (let i = 0; i < trip.stops.length - 1; i++) {
    const from = trip.stops[i]!.id;
    const to = trip.stops[i + 1]!.id;
    journeys.push(
      trip.journeys.find((j) => j.fromStopId === from && j.toStopId === to) ?? {
        fromStopId: from,
        toStopId: to,
        segments: [],
      },
    );
  }
  return { ...trip, journeys };
}

export const journeyFrom = (trip: Trip, stopId: string) =>
  trip.journeys.find((j) => j.fromStopId === stopId);

/** How many days after departure the journey arrives (1 for a night train). */
export const journeyDayOffset = (j: Journey | undefined) =>
  j && j.segments.length ? Math.max(...j.segments.map((s) => s.arrDay)) : 0;

export interface StopSchedule {
  stopId: string;
  /** Arrival date; undefined for the starting place. */
  arrive?: string;
  /** Departure date; undefined for the last stop. */
  depart?: string;
}

/**
 * Works out every stop's dates. Leaving the start on `startDate`, each stop is reached on the day
 * the journey arrives (the next day after a night train) and left after its nights.
 */
export function schedule(trip: Trip): StopSchedule[] {
  const out: StopSchedule[] = [];
  let depart = trip.startDate;
  trip.stops.forEach((stop, i) => {
    if (i === 0) {
      out.push({ stopId: stop.id, depart: trip.stops.length > 1 ? depart : undefined });
      return;
    }
    const prev = trip.stops[i - 1]!;
    const arrive = addDays(depart, journeyDayOffset(journeyFrom(trip, prev.id)));
    const isLast = i === trip.stops.length - 1;
    depart = addDays(arrive, stop.nights);
    out.push({ stopId: stop.id, arrive, depart: isLast ? undefined : depart });
  });
  return out;
}

export function tripRange(trip: Trip) {
  const s = schedule(trip);
  const last = s[s.length - 1];
  const end = last?.arrive ?? trip.startDate;
  return { start: trip.startDate, end, days: daysBetween(trip.startDate, end) + 1 };
}

export const segmentCount = (trip: Trip) =>
  trip.journeys.reduce((n, j) => n + j.segments.length, 0);

/** Places you stay in, not counting the start or a final return to the start. */
export function destinationCount(trip: Trip) {
  const ids = new Set(
    trip.stops
      .slice(1)
      .filter((s) => s.nights > 0)
      .map((s) => s.place.id),
  );
  return ids.size;
}

const touch = (t: Trip): Trip => ({ ...t, updatedAt: now() });

export function addStop(trip: Trip, place: Place, index: number, nights = 2): Trip {
  const at = Math.max(1, Math.min(index, trip.stops.length));
  const stops = [...trip.stops];
  stops.splice(at, 0, { id: newId(), place, nights: clampNights(nights) });
  return touch(syncJourneys({ ...trip, stops }));
}

export function removeStop(trip: Trip, stopId: string): Trip {
  const idx = trip.stops.findIndex((s) => s.id === stopId);
  if (idx <= 0) return trip; // the starting place stays
  return touch(syncJourneys({ ...trip, stops: trip.stops.filter((s) => s.id !== stopId) }));
}

/** Moves a stop one place up or down. The starting place never moves. */
export function moveStop(trip: Trip, stopId: string, dir: -1 | 1): Trip {
  const idx = trip.stops.findIndex((s) => s.id === stopId);
  const to = idx + dir;
  if (idx <= 0 || to <= 0 || to >= trip.stops.length) return trip;
  const stops = [...trip.stops];
  [stops[idx], stops[to]] = [stops[to]!, stops[idx]!];
  return touch(syncJourneys({ ...trip, stops }));
}

export const canMove = (trip: Trip, stopId: string, dir: -1 | 1) => {
  const idx = trip.stops.findIndex((s) => s.id === stopId);
  const to = idx + dir;
  return idx > 0 && to > 0 && to < trip.stops.length;
};

export function setNights(trip: Trip, stopId: string, nights: number): Trip {
  return touch({
    ...trip,
    stops: trip.stops.map((s) => (s.id === stopId ? { ...s, nights: clampNights(nights) } : s)),
  });
}

export const setStartDate = (trip: Trip, startDate: string): Trip => touch({ ...trip, startDate });
export const renameTrip = (trip: Trip, name: string): Trip =>
  touch({ ...trip, name: name.trim() || trip.name });

export function upsertSegment(trip: Trip, fromStopId: string, seg: Segment): Trip {
  return touch({
    ...trip,
    journeys: trip.journeys.map((j) => {
      if (j.fromStopId !== fromStopId) return j;
      const exists = j.segments.some((s) => s.id === seg.id);
      const segments = exists
        ? j.segments.map((s) => (s.id === seg.id ? seg : s))
        : [...j.segments, seg];
      segments.sort((a, b) => a.depDay - b.depDay || a.depTime.localeCompare(b.depTime));
      return { ...j, segments };
    }),
  });
}

export function removeSegment(trip: Trip, fromStopId: string, segId: string): Trip {
  return touch({
    ...trip,
    journeys: trip.journeys.map((j) =>
      j.fromStopId === fromStopId
        ? { ...j, segments: j.segments.filter((s) => s.id !== segId) }
        : j,
    ),
  });
}

/** A copy with fresh ids, so editing it never touches the original. */
export function duplicateTrip(trip: Trip, name: string): Trip {
  const idMap = new Map(trip.stops.map((s) => [s.id, newId()]));
  const t = now();
  return {
    ...trip,
    id: newId(),
    name,
    sample: undefined,
    createdAt: t,
    updatedAt: t,
    stops: trip.stops.map((s) => ({ ...s, id: idMap.get(s.id)! })),
    journeys: trip.journeys.map((j) => ({
      fromStopId: idMap.get(j.fromStopId)!,
      toStopId: idMap.get(j.toStopId)!,
      segments: j.segments.map((s) => ({ ...s, id: newId() })),
    })),
  };
}

/** Minutes from departure to arrival, counting day offsets. */
export function segmentMinutes(s: Segment) {
  const m = (day: number, hm: string) => {
    const [h, mm] = hm.split(':').map(Number);
    return day * 1440 + h! * 60 + mm!;
  };
  return m(s.arrDay, s.arrTime) - m(s.depDay, s.depTime);
}

export const isNightTrain = (s: Segment) => s.arrDay > s.depDay;
