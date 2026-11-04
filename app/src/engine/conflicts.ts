import { daysBetween } from '../model/dates';
import type { Segment, Trip } from '../model/schema';
import { isNightTrain, schedule, segmentMinutes } from '../model/trip';

/** Changes shorter than this get a warning (DEVELOPMENT.md F1.8). */
export const TIGHT_CHANGE_MIN = 8;
const MAX_CHANGES = 3;
const LONG_DAY_MIN = 10 * 60;

export type Conflict =
  /** The next train leaves before the previous one arrives. */
  | { type: 'overlap'; fromStopId: string; segId: string; prev: string; next: string }
  /** Less than TIGHT_CHANGE_MIN minutes to change. */
  | {
      type: 'tight';
      fromStopId: string;
      segId: string;
      minutes: number;
      prev: string;
      next: string;
    }
  /** More than MAX_CHANGES changes on one journey. */
  | { type: 'many_changes'; fromStopId: string; changes: number }
  /** More than LONG_DAY_MIN minutes from first departure to last arrival on a day train. */
  | { type: 'long_day'; fromStopId: string; minutes: number }
  /** Passing through a stop with 0 nights, the next journey leaves before this one arrives. */
  | { type: 'missed_connection'; fromStopId: string; stopId: string };

const at = (day: number, hm: string) =>
  day * 1440 + Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));
const dep = (s: Segment) => at(s.depDay, s.depTime);
const arr = (s: Segment) => at(s.arrDay, s.arrTime);

export function findConflicts(trip: Trip): Conflict[] {
  const out: Conflict[] = [];
  const sched = schedule(trip);
  trip.journeys.forEach((j) => {
    const segs = j.segments;
    for (let i = 1; i < segs.length; i++) {
      const p = segs[i - 1]!;
      const n = segs[i]!;
      const gap = dep(n) - arr(p);
      const names = { prev: p.trainNumber, next: n.trainNumber };
      if (gap < 0) out.push({ type: 'overlap', fromStopId: j.fromStopId, segId: n.id, ...names });
      else if (gap < TIGHT_CHANGE_MIN)
        out.push({ type: 'tight', fromStopId: j.fromStopId, segId: n.id, minutes: gap, ...names });
    }
    if (segs.length - 1 > MAX_CHANGES)
      out.push({ type: 'many_changes', fromStopId: j.fromStopId, changes: segs.length - 1 });
    if (segs.length && !segs.some(isNightTrain)) {
      const minutes = arr(segs.at(-1)!) - dep(segs[0]!);
      if (minutes > LONG_DAY_MIN && segs.every((s) => segmentMinutes(s) > 0))
        out.push({ type: 'long_day', fromStopId: j.fromStopId, minutes });
    }
  });
  // A stop with no nights: the onward train must leave after we arrive.
  trip.stops.forEach((stop, i) => {
    if (i === 0 || i === trip.stops.length - 1 || stop.nights > 0) return;
    const inJ = trip.journeys.find((j) => j.toStopId === stop.id);
    const outJ = trip.journeys.find((j) => j.fromStopId === stop.id);
    const last = inJ?.segments.at(-1);
    const first = outJ?.segments[0];
    const arrive = sched[i]?.arrive;
    const leave = sched[i]?.depart;
    if (!inJ || !outJ || !last || !first || !arrive || !leave) return;
    // Both as minutes from the arrival date.
    const prevStart = sched[i - 1]?.depart ?? trip.startDate;
    const arriveMin = at(last.arrDay, last.arrTime) - 1440 * daysBetween(prevStart, arrive);
    const leaveMin = at(first.depDay, first.depTime) + 1440 * daysBetween(arrive, leave);
    if (leaveMin < arriveMin)
      out.push({ type: 'missed_connection', fromStopId: outJ.fromStopId, stopId: stop.id });
  });
  return out;
}
