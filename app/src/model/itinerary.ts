/**
 * The trip as a timeline of real moments: when each train leaves and arrives, in local time and as
 * an instant. Used by travel mode (next train), calendar export and the printable itinerary.
 */
import { COUNTRY_TZ, zonedToUtc } from '../timetable/transitous';
import { addDays } from './dates';
import type { Segment, Stop, Trip } from './schema';
import { schedule } from './trip';

export interface TrainMoment {
  seg: Segment;
  fromStop: Stop;
  toStop: Stop;
  depDate: string;
  arrDate: string;
  depTz: string;
  arrTz: string;
  dep: Date;
  arr: Date;
}

const tzOf = (cc: string) => COUNTRY_TZ[cc] ?? 'Europe/Berlin';

export function trainMoments(trip: Trip): TrainMoment[] {
  const sched = schedule(trip);
  const out: TrainMoment[] = [];
  trip.journeys.forEach((j) => {
    const i = trip.stops.findIndex((s) => s.id === j.fromStopId);
    const fromStop = trip.stops[i]!;
    const toStop = trip.stops[i + 1]!;
    const base = sched[i]?.depart ?? trip.startDate;
    const start = tzOf(fromStop.place.country);
    const end = tzOf(toStop.place.country);
    j.segments.forEach((seg, k) => {
      // Changes happen somewhere on the way: the first train leaves in the start country, the
      // last arrives in the destination country; in between we assume the start country's clock.
      const depTz = start;
      const arrTz = k === j.segments.length - 1 ? end : start;
      const depDate = addDays(base, seg.depDay);
      const arrDate = addDays(base, seg.arrDay);
      out.push({
        seg,
        fromStop,
        toStop,
        depDate,
        arrDate,
        depTz,
        arrTz,
        dep: zonedToUtc(depDate, seg.depTime, depTz),
        arr: zonedToUtc(arrDate, seg.arrTime, arrTz),
      });
    });
  });
  return out.sort((a, b) => a.dep.getTime() - b.dep.getTime());
}

export interface NextUp {
  trip: Trip;
  /** The train now running, or the next to leave. */
  train?: TrainMoment;
  /** Trip day number while the trip is under way (1 on the first day). */
  day?: number;
  days: number;
  /** Where the traveller sleeps tonight while under way. */
  tonight?: Stop;
}

/**
 * What to show while travelling: for a trip under way or whose next train leaves within two days,
 * the next train (or the one running now) and where you sleep tonight.
 */
export function nextUp(trips: Trip[], now: Date, today: string): NextUp | null {
  const DAY = 24 * 3600 * 1000;
  let best: NextUp | null = null;
  let bestTime = Infinity;
  for (const trip of trips) {
    if (trip.sample) continue;
    const sched = schedule(trip);
    const end = sched[sched.length - 1]?.arrive ?? trip.startDate;
    const under = today >= trip.startDate && today <= end;
    const train = trainMoments(trip).find((m) => m.arr.getTime() > now.getTime());
    const soon = train && train.dep.getTime() - now.getTime() < 2 * DAY;
    if (!under && !soon) continue;
    const when = train ? train.dep.getTime() : now.getTime();
    if (when >= bestTime) continue;
    bestTime = when;
    const days = sched.length
      ? Math.round((Date.parse(end) - Date.parse(trip.startDate)) / DAY) + 1
      : 1;
    const day = under
      ? Math.round((Date.parse(today) - Date.parse(trip.startDate)) / DAY) + 1
      : undefined;
    const tonight = under
      ? trip.stops.find(
          (_stop, i) =>
            (sched[i]?.arrive ?? trip.startDate) <= today && today < (sched[i]?.depart ?? '9999'),
        )
      : undefined;
    best = { trip, train, day, days, tonight: tonight?.nights ? tonight : undefined };
  }
  return best;
}
