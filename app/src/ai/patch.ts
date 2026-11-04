import { z } from 'zod';
import { CITIES, type City } from '../data/cities';
import { COUNTRY_CODES, isCountryCode } from '../data/countries';
import { currentPlan, analyze } from '../engine/optimizer';
import {
  addStop,
  newId,
  removeStop,
  schedule,
  setNights,
  setStartDate,
  tripRange,
} from '../model/trip';
import { TripSchema, type Place, type Segment, type Trip } from '../model/schema';

/**
 * Changes the assistant can propose (DEVELOPMENT.md §4.4). Stops are referred to by short refs
 * ("s1", "s2"…) from the plan we send, or by the `ref` given to a stop added earlier in the patch.
 */
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const SegmentDraftSchema = z.object({
  train_number: z.string().min(1).max(40),
  from_station: z.string().max(80),
  to_station: z.string().max(80),
  dep_day: z.number().int().min(0).max(3).default(0),
  dep_time: hhmm,
  arr_day: z.number().int().min(0).max(3).default(0),
  arr_time: hhmm,
  price_min: z.number().nonnegative().optional(),
  price_max: z.number().nonnegative().optional(),
});

export const PlanOpSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('add_stop'),
    city: z.string().min(1).max(80),
    country: z.string().length(2).optional(),
    /** Insert after this stop. Omitted: before the final stop when the trip returns home, else at the end. */
    after: z.string().optional(),
    nights: z.number().int().min(0).max(60),
    ref: z.string().max(20).optional(),
  }),
  z.object({ op: z.literal('remove_stop'), stop: z.string() }),
  z.object({ op: z.literal('move_stop'), stop: z.string(), after: z.string() }),
  z.object({
    op: z.literal('set_nights'),
    stop: z.string(),
    nights: z.number().int().min(0).max(60),
  }),
  z.object({ op: z.literal('set_start_date'), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({
    op: z.literal('set_trains'),
    from_stop: z.string(),
    trains: z.array(SegmentDraftSchema).max(6),
  }),
  z.object({ op: z.literal('set_note'), stop: z.string(), note: z.string().max(500) }),
]);
export type PlanOp = z.infer<typeof PlanOpSchema>;

export const PlanPatchSchema = z.object({
  summary: z.string().min(1).max(300),
  ops: z.array(PlanOpSchema).min(1).max(30),
  warnings: z.array(z.string().max(300)).max(5).optional(),
});
export type PlanPatch = z.infer<typeof PlanPatchSchema>;

/** JSON schema for the propose_patch tool, kept by hand so it reads well for the model. */
export const PATCH_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'One sentence for the traveller, in their language.' },
    ops: {
      type: 'array',
      description: 'Changes, applied in order.',
      items: {
        type: 'object',
        properties: {
          op: {
            type: 'string',
            enum: [
              'add_stop',
              'remove_stop',
              'move_stop',
              'set_nights',
              'set_start_date',
              'set_trains',
              'set_note',
            ],
          },
          city: { type: 'string', description: 'add_stop: city name in English.' },
          country: {
            type: 'string',
            description: `add_stop: ISO country code, one of ${COUNTRY_CODES.join(', ')}.`,
          },
          after: {
            type: 'string',
            description: 'add_stop / move_stop: ref of the stop to put it after.',
          },
          nights: { type: 'integer', description: 'add_stop / set_nights: nights to stay.' },
          ref: {
            type: 'string',
            description: 'add_stop: a name such as "new1" that later ops can use.',
          },
          stop: {
            type: 'string',
            description: 'remove_stop / move_stop / set_nights / set_note: stop ref.',
          },
          date: { type: 'string', description: 'set_start_date: YYYY-MM-DD.' },
          from_stop: {
            type: 'string',
            description: 'set_trains: ref of the stop the journey leaves from (to the next stop).',
          },
          trains: {
            type: 'array',
            description:
              'set_trains: every train of that journey, replacing the ones there. Times are local. Days count from the day the journey starts; a night train arrives on day 1.',
            items: {
              type: 'object',
              properties: {
                train_number: { type: 'string', description: 'For example "FR 9709" or "NJ 294".' },
                from_station: { type: 'string' },
                to_station: { type: 'string' },
                dep_day: { type: 'integer' },
                dep_time: { type: 'string', description: 'HH:mm' },
                arr_day: { type: 'integer' },
                arr_time: { type: 'string', description: 'HH:mm' },
                price_min: { type: 'number', description: 'Estimated cheapest ticket in EUR.' },
                price_max: { type: 'number', description: 'Estimated flexible ticket in EUR.' },
              },
              required: ['train_number', 'from_station', 'to_station', 'dep_time', 'arr_time'],
            },
          },
          note: { type: 'string', description: 'set_note: short note for the stop.' },
        },
        required: ['op'],
      },
    },
    warnings: { type: 'array', items: { type: 'string' }, description: 'Things to double-check.' },
  },
  required: ['summary', 'ops'],
} as const;

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** A city from our list by any of its names, or a hand-made place when the country is known. */
export function resolveCity(name: string, country?: string): Place | null {
  const q = fold(name);
  const match = (c: City) => [c.en, c.local, c.zh, c.id].some((n) => fold(n) === q);
  const found = CITIES.filter(match).find((c) => !country || c.country === country.toUpperCase());
  if (found)
    return { id: found.id, en: found.en, zh: found.zh, local: found.local, country: found.country };
  const cc = country?.toUpperCase();
  if (!cc || !isCountryCode(cc)) return null;
  const slug = q.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'city';
  return { id: `custom-${slug}`, en: name.trim(), local: name.trim(), country: cc };
}

/** "s1", "s2"… for the trip's stops, in order. */
export const stopRefs = (trip: Trip) => new Map(trip.stops.map((s, i) => [`s${i + 1}`, s.id]));

export interface PatchResult {
  trip: Trip;
  errors: string[];
}

/** Applies a patch to a copy of the trip. Any error rejects the whole patch. */
export function applyPatch(original: Trip, patch: PlanPatch): PatchResult {
  let trip = original;
  const refs = stopRefs(original);
  const errors: string[] = [];
  const id = (ref: string | undefined) =>
    ref ? (refs.get(ref) ?? (trip.stops.some((s) => s.id === ref) ? ref : undefined)) : undefined;
  const idx = (stopId: string) => trip.stops.findIndex((s) => s.id === stopId);

  patch.ops.forEach((op, n) => {
    const fail = (msg: string) => errors.push(`ops[${n}] ${op.op}: ${msg}`);
    switch (op.op) {
      case 'add_stop': {
        const place = resolveCity(op.city, op.country);
        if (!place) return fail(`unknown city "${op.city}"; give its two-letter country code`);
        let at: number;
        if (op.after !== undefined) {
          const after = id(op.after);
          if (!after) return fail(`no stop "${op.after}"`);
          at = idx(after) + 1;
        } else {
          const last = trip.stops[trip.stops.length - 1]!;
          const returnsHome = trip.stops.length > 1 && last.place.id === trip.stops[0]!.place.id;
          at = returnsHome ? trip.stops.length - 1 : trip.stops.length;
        }
        const before = new Set(trip.stops.map((s) => s.id));
        trip = addStop(trip, place, at, op.nights);
        const added = trip.stops.find((s) => !before.has(s.id))!;
        if (op.ref) refs.set(op.ref, added.id);
        return;
      }
      case 'remove_stop': {
        const stopId = id(op.stop);
        if (!stopId) return fail(`no stop "${op.stop}"`);
        if (idx(stopId) === 0) return fail('the starting place cannot be removed');
        trip = removeStop(trip, stopId);
        return;
      }
      case 'move_stop': {
        const stopId = id(op.stop);
        const after = id(op.after);
        if (!stopId || !after) return fail('unknown stop');
        if (idx(stopId) === 0) return fail('the starting place cannot move');
        if (stopId === after) return fail('a stop cannot follow itself');
        const stop = trip.stops[idx(stopId)]!;
        const rest = trip.stops.filter((s) => s.id !== stopId);
        rest.splice(rest.findIndex((s) => s.id === after) + 1, 0, stop);
        trip = keepTrains(trip, rest);
        return;
      }
      case 'set_nights': {
        const stopId = id(op.stop);
        if (!stopId) return fail(`no stop "${op.stop}"`);
        trip = setNights(trip, stopId, op.nights);
        return;
      }
      case 'set_start_date':
        trip = setStartDate(trip, op.date);
        return;
      case 'set_trains': {
        const stopId = id(op.from_stop);
        const j = stopId && trip.journeys.find((x) => x.fromStopId === stopId);
        if (!j) return fail(`no journey leaves "${op.from_stop}"`);
        const segments: Segment[] = [];
        for (const d of op.trains) {
          const seg: Segment = {
            id: newId(),
            trainNumber: d.train_number,
            from: d.from_station,
            to: d.to_station,
            depDay: d.dep_day,
            depTime: d.dep_time,
            arrDay: d.arr_day,
            arrTime: d.arr_time,
            source: 'ai',
            price:
              d.price_min !== undefined || d.price_max !== undefined
                ? {
                    min: d.price_min ?? d.price_max!,
                    max: Math.max(d.price_max ?? d.price_min!, d.price_min ?? 0),
                    currency: 'EUR',
                    source: 'ai_estimate',
                  }
                : undefined,
          };
          const arrives = seg.arrDay * 1440 + mins(seg.arrTime);
          if (arrives <= seg.depDay * 1440 + mins(seg.depTime))
            return fail(
              `${d.train_number} arrives before it departs; use arr_day 1 for night trains`,
            );
          segments.push(seg);
        }
        segments.sort((a, b) => a.depDay - b.depDay || a.depTime.localeCompare(b.depTime));
        trip = {
          ...trip,
          journeys: trip.journeys.map((x) => (x === j ? { ...x, segments } : x)),
        };
        return;
      }
      case 'set_note': {
        const stopId = id(op.stop);
        if (!stopId) return fail(`no stop "${op.stop}"`);
        trip = {
          ...trip,
          stops: trip.stops.map((s) =>
            s.id === stopId ? { ...s, note: op.note || undefined } : s,
          ),
        };
        return;
      }
    }
  });
  if (!errors.length) {
    const check = TripSchema.safeParse(trip);
    if (!check.success) errors.push(check.error.issues.map((i) => i.message).join('; '));
  }
  return { trip, errors };
}

const mins = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));

/** New stop order; journeys between pairs that are still neighbours keep their trains. */
function keepTrains(trip: Trip, stops: Trip['stops']): Trip {
  const journeys = stops.slice(0, -1).map((s, i) => {
    const to = stops[i + 1]!.id;
    return (
      trip.journeys.find((j) => j.fromStopId === s.id && j.toStopId === to) ?? {
        fromStopId: s.id,
        toStopId: to,
        segments: [],
      }
    );
  });
  return { ...trip, stops, journeys, updatedAt: new Date().toISOString() };
}

export type StopChange =
  | { kind: 'added'; name: Place; nights: number }
  | { kind: 'removed'; name: Place; nights: number }
  | { kind: 'nights'; name: Place; from: number; to: number }
  | { kind: 'moved'; name: Place }
  | { kind: 'trains'; from: Place; to: Place; count: number }
  | { kind: 'note'; name: Place }
  | { kind: 'start'; from: string; to: string };

export interface Comparison {
  changes: StopChange[];
  days: { before: number; after: number };
  /** Total cost with the pass the traveller uses, or tickets only when there is no pass price. */
  cost: { before: number; after: number };
  passBefore?: string;
  passAfter?: string;
}

const tripCost = (trip: Trip) => {
  const a = analyze(trip);
  const plan = currentPlan(trip, a);
  return { total: plan ? plan.total : a.tickets.mid, pass: plan?.result.product.id };
};

export function compareTrips(before: Trip, after: Trip): Comparison {
  const changes: StopChange[] = [];
  if (before.startDate !== after.startDate)
    changes.push({ kind: 'start', from: before.startDate, to: after.startDate });
  const old = new Map(before.stops.map((s, i) => [s.id, { s, i }]));
  const kept = after.stops.filter((s) => old.has(s.id));
  const keptOrder = before.stops.filter((s) => after.stops.some((x) => x.id === s.id));
  for (const s of before.stops)
    if (!after.stops.some((x) => x.id === s.id))
      changes.push({ kind: 'removed', name: s.place, nights: s.nights });
  after.stops.forEach((s) => {
    const o = old.get(s.id);
    if (!o) return changes.push({ kind: 'added', name: s.place, nights: s.nights });
    if (o.s.nights !== s.nights)
      changes.push({ kind: 'nights', name: s.place, from: o.s.nights, to: s.nights });
    if ((o.s.note ?? '') !== (s.note ?? '')) changes.push({ kind: 'note', name: s.place });
  });
  kept.forEach((s, i) => {
    if (keptOrder[i]?.id !== s.id && !changes.some((c) => c.kind === 'moved' && c.name === s.place))
      changes.push({ kind: 'moved', name: s.place });
  });
  for (const j of after.journeys) {
    const prev = before.journeys.find(
      (x) => x.fromStopId === j.fromStopId && x.toStopId === j.toStopId,
    );
    const same =
      prev &&
      prev.segments.length === j.segments.length &&
      prev.segments.every((s, i) => s.id === j.segments[i]!.id);
    if (!same && j.segments.length) {
      const from = after.stops.find((s) => s.id === j.fromStopId)!.place;
      const to = after.stops.find((s) => s.id === j.toStopId)!.place;
      changes.push({ kind: 'trains', from, to, count: j.segments.length });
    }
  }
  const cb = tripCost(before);
  const ca = tripCost(after);
  return {
    changes,
    days: { before: tripRange(before).days, after: tripRange(after).days },
    cost: { before: cb.total, after: ca.total },
    passBefore: cb.pass,
    passAfter: ca.pass,
  };
}

/** The trip as the assistant sees it: cities, dates, trains and the rules engine's results. No names. */
export function planForModel(trip: Trip) {
  const refs = [...stopRefs(trip).entries()];
  const ref = (stopId: string) => refs.find(([, id]) => id === stopId)?.[0];
  const sched = schedule(trip);
  const a = analyze(trip);
  const plan = currentPlan(trip, a);
  const dayChoice = new Map(plan?.days.map((d) => [d.date, d.choice]) ?? []);
  const res = trip.traveller.residence;
  return {
    traveller: {
      residence: res.type === 'europe' ? res.country : 'outside Europe',
      age_group: trip.traveller.ageGroup,
      class: trip.traveller.travelClass,
      travellers: trip.traveller.count,
    },
    start_date: trip.startDate,
    end_date: tripRange(trip).end,
    stops: trip.stops.map((s, i) => ({
      ref: `s${i + 1}`,
      city: s.place.en,
      country: s.place.country,
      nights: s.nights,
      arrive: sched[i]?.arrive,
      depart: sched[i]?.depart,
      note: s.note,
    })),
    journeys: trip.journeys.map((j) => ({
      from: ref(j.fromStopId),
      to: ref(j.toStopId),
      trains: j.segments.map((s) => ({
        train: s.trainNumber,
        from: s.from,
        to: s.to,
        dep: `day ${s.depDay} ${s.depTime}`,
        arr: `day ${s.arrDay} ${s.arrTime}`,
        price_eur: s.price ? [s.price.min, s.price.max] : 'unknown',
      })),
    })),
    rules_engine: {
      all_tickets_eur: round(a.tickets),
      pass_in_use: plan
        ? {
            pass: plan.result.product.id,
            pass_price_eur: plan.result.price,
            travel_days: plan.passDays,
            reservation_fees_eur: Math.round(plan.fees),
            tickets_bought_separately_eur: Math.round(plan.ticketsCost),
            total_eur: Math.round(plan.total),
            problems: plan.errors,
          }
        : 'no pass price for this traveller',
      other_passes: a.options
        .slice(0, 4)
        .map((o) => ({ pass: o.product.id, total_eur: round(o.cost) })),
      days: a.days.map((d) => ({
        date: d.date,
        choice: dayChoice.get(d.date),
        trains: d.items.map((i) => ({
          train: i.seg.trainNumber,
          pass_valid: i.coverable,
          not_valid_because: i.notCoveredReason,
          reservation: i.rule.reservation,
          reservation_fee_eur: i.rule.fee || undefined,
        })),
      })),
      trains_without_price: a.missingPrices,
    },
  };
}

const round = (r: { min: number; mid: number; max: number }) => ({
  cheapest: Math.round(r.min),
  typical: Math.round(r.mid),
  flexible: Math.round(r.max),
});
