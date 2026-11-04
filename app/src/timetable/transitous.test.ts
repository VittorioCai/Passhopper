import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dropDominated,
  localParts,
  sampleDateFor,
  searchTrains,
  trainName,
  zonedToUtc,
  type TrainOption,
} from './transitous';
import { optionToSegments } from '../components/TrainSearch';

const rome = { id: 'rome', en: 'Rome', local: 'Roma', country: 'IT' as const };
const vienna = { id: 'vienna', en: 'Vienna', local: 'Wien', country: 'AT' as const };

const leg = (
  mode: string,
  name: string,
  from: [string, number, number],
  start: string,
  to: [string, number, number],
  end: string,
) => ({
  mode,
  displayName: name,
  agencyName: 'X',
  startTime: start,
  endTime: end,
  from: { name: from[0], lat: from[1], lon: from[2], tz: 'Europe/Rome' },
  to: {
    name: to[0],
    lat: to[1],
    lon: to[2],
    tz: to[0].startsWith('Wien') ? 'Europe/Vienna' : 'Europe/Rome',
  },
});
const TERMINI: [string, number, number] = ['ROMA TERMINI', 41.901, 12.5016];
const TIBURTINA: [string, number, number] = ['Roma Tiburtina', 41.9106, 12.5306];
const BOLOGNA: [string, number, number] = ['Bologna C.le/AV', 44.5058, 11.343];
const WIEN: [string, number, number] = ['Wien Hbf', 48.1852, 16.3764];

describe('timetable helpers', () => {
  it('names trains the way people write them', () => {
    expect(trainName({ displayName: 'FR 9709' })).toBe('FR 9709');
    expect(trainName({ displayName: 'Ex3 (EC 280)' })).toBe('EC 280');
    expect(trainName({ displayName: 'AVE INT', tripShortName: '09742' })).toBe('AVE INT 9742');
    expect(trainName({ displayName: 'C', tripShortName: '147102-147103' })).toBe('C');
  });

  it('converts local times to UTC across daylight saving', () => {
    expect(zonedToUtc('2027-07-14', '08:00', 'Europe/Rome').toISOString()).toBe(
      '2027-07-14T06:00:00.000Z',
    );
    expect(zonedToUtc('2026-11-10', '08:00', 'Europe/Lisbon').toISOString()).toBe(
      '2026-11-10T08:00:00.000Z',
    );
    expect(localParts(new Date('2026-11-10T22:30:00Z'), 'Europe/Athens')).toEqual({
      date: '2026-11-11',
      time: '00:30',
    });
  });

  it('picks the same weekday one to two weeks ahead', () => {
    // 2027-07-14 is a Wednesday; 2026-11-04 is a Wednesday too.
    expect(sampleDateFor('2027-07-14', '2026-11-04')).toBe('2026-11-11');
    expect(sampleDateFor('2027-07-17', '2026-11-04')).toBe('2026-11-14');
  });

  it('drops options another one beats', () => {
    const o = (dep: string, arr: string, n: number): TrainOption => ({
      minutes: 0,
      legs: Array.from({ length: n }, () => ({
        train: 'X',
        from: 'A',
        to: 'B',
        depDate: '2026-11-10',
        depTime: dep,
        arrDate: '2026-11-10',
        arrTime: arr,
      })),
    });
    const a = o('07:35', '19:36', 2);
    const b = o('07:35', '19:07', 3);
    const c = o('07:50', '19:36', 3); // beaten by nothing? a leaves earlier; c leaves later
    const d = o('07:35', '19:36', 3); // same as a with more changes
    expect(dropDominated([a, b, c, d])).toEqual([a, b, c]);
  });
});

describe('searchTrains', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('turns itineraries into trains, without the local hop to the main station', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          itineraries: [
            {
              legs: [
                leg('WALK', '', TERMINI, '2026-11-10T18:00:00Z', TERMINI, '2026-11-10T18:05:00Z'),
                leg(
                  'REGIONAL_RAIL',
                  'FL1',
                  TERMINI,
                  '2026-11-10T18:05:00Z',
                  TIBURTINA,
                  '2026-11-10T18:12:00Z',
                ),
                leg(
                  'HIGHSPEED_RAIL',
                  'FR 9592',
                  TIBURTINA,
                  '2026-11-10T18:20:00Z',
                  BOLOGNA,
                  '2026-11-10T20:35:00Z',
                ),
                leg(
                  'NIGHT_RAIL',
                  'EN 294',
                  BOLOGNA,
                  '2026-11-10T20:54:00Z',
                  WIEN,
                  '2026-11-11T07:06:00Z',
                ),
              ],
            },
          ],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const r = await searchTrains(rome, vienna, '2026-11-10', '19:00');
    expect(r.sampleDate).toBeUndefined();
    expect(r.options).toHaveLength(1);
    const o = r.options[0]!;
    expect(o.legs.map((l) => l.train)).toEqual(['FR 9592', 'EN 294']);
    expect(o.legs[0]).toMatchObject({
      from: 'Roma Tiburtina',
      depDate: '2026-11-10',
      depTime: '19:20',
    });
    expect(o.legs[1]).toMatchObject({ to: 'Wien Hbf', arrDate: '2026-11-11', arrTime: '08:06' });
    const url = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(url.searchParams.get('time')).toBe('2026-11-10T18:00:00.000Z');
    expect(url.searchParams.get('fromPlace')).toBe('41.901,12.5016');
    const segs = optionToSegments(o, '2026-11-10');
    expect(segs[1]).toMatchObject({
      trainNumber: 'EN 294',
      depDay: 0,
      arrDay: 1,
      source: 'transitous',
    });
  });

  it('falls back to a nearby date when the timetable is not out yet', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ itineraries: [] })));
    vi.stubGlobal('fetch', fetchMock);
    const r = await searchTrains(rome, vienna, '2030-07-14', '07:00');
    expect(r.sampleDate).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
