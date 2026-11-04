/**
 * Train search with Transitous (https://transitous.org), a community-run, open-data journey
 * planner (RULES-AND-SOURCES E1). Called straight from the browser; one request per search.
 */
import { CITIES } from '../data/cities';
import type { CountryCode } from '../data/countries';
import { CITY_COORDS } from '../data/stations';
import { addDays, daysBetween, todayLocal } from '../model/dates';
import type { Place } from '../model/schema';

const API = 'https://api.transitous.org/api';
export const TRANSITOUS_SOURCES_URL = 'https://transitous.org/sources/';

/** Time zone of each country, used to turn the traveller's local time into the request time. */
const COUNTRY_TZ: Partial<Record<CountryCode, string>> & Record<string, string> = {
  AT: 'Europe/Vienna',
  BE: 'Europe/Brussels',
  BG: 'Europe/Sofia',
  CH: 'Europe/Zurich',
  CZ: 'Europe/Prague',
  DE: 'Europe/Berlin',
  DK: 'Europe/Copenhagen',
  ES: 'Europe/Madrid',
  FI: 'Europe/Helsinki',
  FR: 'Europe/Paris',
  GB: 'Europe/London',
  GR: 'Europe/Athens',
  HR: 'Europe/Zagreb',
  HU: 'Europe/Budapest',
  IE: 'Europe/Dublin',
  IT: 'Europe/Rome',
  LU: 'Europe/Luxembourg',
  NL: 'Europe/Amsterdam',
  NO: 'Europe/Oslo',
  PL: 'Europe/Warsaw',
  PT: 'Europe/Lisbon',
  RO: 'Europe/Bucharest',
  SE: 'Europe/Stockholm',
  SI: 'Europe/Ljubljana',
  SK: 'Europe/Bratislava',
};

export interface TrainLeg {
  train: string;
  operator?: string;
  from: string;
  to: string;
  /** Local date and time at each station. */
  depDate: string;
  depTime: string;
  arrDate: string;
  arrTime: string;
}

export interface TrainOption {
  legs: TrainLeg[];
  minutes: number;
}

export interface SearchResult {
  options: TrainOption[];
  /** Set when the timetable for the asked date isn't published yet and we searched this date instead. */
  sampleDate?: string;
}

export class TimetableError extends Error {
  constructor(readonly kind: 'no_place' | 'http' | 'network') {
    super(kind);
  }
}

/** Where to search from: the city's main station, or Transitous' geocoder for cities typed in by hand. */
export async function coordsFor(place: Place, signal?: AbortSignal): Promise<[number, number]> {
  const known =
    CITY_COORDS[place.id] ?? CITY_COORDS[CITIES.find((c) => c.en === place.en)?.id ?? ''];
  if (known) return known;
  const url = `${API}/v1/geocode?${new URLSearchParams({ text: place.local, type: 'STOP' })}`;
  const hits = (await getJson(url, signal)) as {
    lat: number;
    lon: number;
    country?: string;
    modes?: string[];
    importance?: number;
  }[];
  const rail = hits
    .filter((h) => h.country === place.country && h.modes?.some((m) => RAIL_MODES.includes(m)))
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));
  const best = rail[0];
  if (!best) throw new TimetableError('no_place');
  return [best.lat, best.lon];
}

const RAIL_MODES = [
  'HIGHSPEED_RAIL',
  'LONG_DISTANCE',
  'NIGHT_RAIL',
  'REGIONAL_FAST_RAIL',
  'REGIONAL_RAIL',
];

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new TimetableError('network');
  }
  if (!res.ok) throw new TimetableError('http');
  return res.json();
}

/** UTC instant for a wall-clock time in a time zone. */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const guess = new Date(`${date}T${time}:00Z`);
  const local = localParts(guess, tz);
  const asIfUtc = new Date(`${local.date}T${local.time}:00Z`);
  return new Date(guess.getTime() - (asIfUtc.getTime() - guess.getTime()));
}

export function localParts(d: Date, tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** Earth distance in km. */
const km = (a: [number, number], b: [number, number]) => {
  const r = Math.PI / 180;
  const x = (b[1] - a[1]) * r * Math.cos(((a[0] + b[0]) / 2) * r);
  const y = (b[0] - a[0]) * r;
  return Math.sqrt(x * x + y * y) * 6371;
};

interface ApiLeg {
  mode: string;
  startTime: string;
  endTime: string;
  displayName?: string;
  routeShortName?: string;
  tripShortName?: string;
  agencyName?: string;
  from: { name: string; lat: number; lon: number; tz?: string };
  to: { name: string; lat: number; lon: number; tz?: string };
}

/** "FR 9709", "TGV INOUI 9713", "EC 280" from "Ex3 (EC 280)", "AVE INT 9742". */
export function trainName(l: Pick<ApiLeg, 'displayName' | 'routeShortName' | 'tripShortName'>) {
  const name = (l.displayName || l.routeShortName || '').trim();
  const inner = name.match(/\(([A-Za-z]+ ?\d+)\)/)?.[1];
  if (inner) return inner;
  if (/\d/.test(name)) return name;
  const num = l.tripShortName?.match(/^0*(\d{1,6})$/)?.[1];
  return num ? `${name} ${num}`.trim() : name || (l.tripShortName ?? '');
}

/** "ROMA TERMINI" → "Roma Termini"; names already in mixed case stay as they are. */
const tidy = (s: string) =>
  s === s.toUpperCase() && /[A-Z]{3}/.test(s)
    ? s
        .toLowerCase()
        .replace(/(^|[\s\-./(])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())
    : s;

function toOption(
  legs: ApiLeg[],
  fromC: [number, number],
  toC: [number, number],
): TrainOption | null {
  const rail = legs.filter((l) => RAIL_MODES.includes(l.mode));
  // Drop short hops inside the start and end cities (RER, S-Bahn to the main station).
  const local = (l: ApiLeg, c: [number, number], end: 'from' | 'to') =>
    km([l[end].lat, l[end].lon], c) < 12 &&
    (new Date(l.endTime).getTime() - new Date(l.startTime).getTime()) / 60000 <= 40;
  while (rail.length > 1 && local(rail[0]!, fromC, 'to')) rail.shift();
  while (rail.length > 1 && local(rail[rail.length - 1]!, toC, 'from')) rail.pop();
  if (!rail.length) return null;
  const out = rail.map((l): TrainLeg => {
    const d = localParts(new Date(l.startTime), l.from.tz ?? 'Europe/Berlin');
    const a = localParts(new Date(l.endTime), l.to.tz ?? l.from.tz ?? 'Europe/Berlin');
    return {
      train: trainName(l),
      operator: l.agencyName,
      from: tidy(l.from.name),
      to: tidy(l.to.name),
      depDate: d.date,
      depTime: d.time,
      arrDate: a.date,
      arrTime: a.time,
    };
  });
  const minutes =
    (new Date(rail[rail.length - 1]!.endTime).getTime() - new Date(rail[0]!.startTime).getTime()) /
    60000;
  return { legs: out, minutes: Math.round(minutes) };
}

async function plan(
  from: [number, number],
  to: [number, number],
  when: Date,
  signal?: AbortSignal,
): Promise<TrainOption[]> {
  const q = new URLSearchParams({
    fromPlace: from.join(','),
    toPlace: to.join(','),
    time: when.toISOString(),
    transitModes: RAIL_MODES.join(','),
    numItineraries: '8',
    maxTransfers: '3',
    maxPreTransitTime: '1500',
    maxPostTransitTime: '1500',
    detailedLegs: 'false',
    searchWindow: String(6 * 3600),
    language: 'en',
  });
  const data = (await getJson(`${API}/v5/plan?${q}`, signal)) as {
    itineraries?: { legs: ApiLeg[] }[];
  };
  const seen = new Set<string>();
  const options: TrainOption[] = [];
  for (const it of data.itineraries ?? []) {
    const o = toOption(it.legs, from, to);
    if (!o) continue;
    const key = o.legs.map((l) => `${l.train}@${l.depDate}T${l.depTime}`).join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(o);
  }
  return dropDominated(options).sort((a, b) =>
    `${a.legs[0]!.depDate}${a.legs[0]!.depTime}`.localeCompare(
      `${b.legs[0]!.depDate}${b.legs[0]!.depTime}`,
    ),
  );
}

const stamp = (l: TrainLeg, end: 'dep' | 'arr') =>
  end === 'dep' ? `${l.depDate}T${l.depTime}` : `${l.arrDate}T${l.arrTime}`;

/** Drops options another one beats: leaves no earlier, arrives no later, with no more changes. */
export function dropDominated(options: TrainOption[]) {
  return options.filter(
    (o) =>
      !options.some(
        (p) =>
          p !== o &&
          stamp(p.legs[0]!, 'dep') >= stamp(o.legs[0]!, 'dep') &&
          stamp(p.legs.at(-1)!, 'arr') <= stamp(o.legs.at(-1)!, 'arr') &&
          p.legs.length <= o.legs.length &&
          (p.legs.length < o.legs.length ||
            stamp(p.legs[0]!, 'dep') > stamp(o.legs[0]!, 'dep') ||
            stamp(p.legs.at(-1)!, 'arr') < stamp(o.legs.at(-1)!, 'arr')),
      ),
  );
}

/** Same weekday as `date`, one to two weeks from today: a date whose timetable is published. */
export function sampleDateFor(date: string, today = todayLocal()) {
  const weekday = (s: string) => new Date(`${s}T12:00:00Z`).getUTCDay();
  let d = addDays(today, 7);
  while (weekday(d) !== weekday(date)) d = addDays(d, 1);
  return d;
}

/**
 * Trains from one city to another leaving after `time` on `date` (local time at the start).
 * Timetables are usually published a few months ahead; for later dates, or when nothing comes back
 * for the day, we show the same weekday soon instead, so people can still pick realistic trains.
 */
export async function searchTrains(
  from: Place,
  to: Place,
  date: string,
  time: string,
  signal?: AbortSignal,
): Promise<SearchResult> {
  const [fc, tc] = await Promise.all([coordsFor(from, signal), coordsFor(to, signal)]);
  const tz = COUNTRY_TZ[from.country] ?? 'Europe/Berlin';
  const onDay = (opts: TrainOption[], d: string) =>
    opts.filter((o) => daysBetween(d, o.legs[0]!.depDate) <= 0);
  const today = todayLocal();
  if (daysBetween(today, date) <= 180) {
    const opts = onDay(await plan(fc, tc, zonedToUtc(date, time, tz), signal), date);
    if (opts.length) return { options: opts };
  }
  const sample = sampleDateFor(date, today);
  const opts = onDay(await plan(fc, tc, zonedToUtc(sample, time, tz), signal), sample);
  return { options: opts, sampleDate: sample };
}
