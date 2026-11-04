import { CITIES } from './cities';
import type { Place, Segment, Trip } from '../model/schema';
import { createTrip, newId, upsertSegment } from '../model/trip';

const place = (id: string): Place => {
  const c = CITIES.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown city ${id}`);
  return { id: c.id, en: c.en, zh: c.zh, local: c.local, country: c.country };
};

const seg = (
  trainNumber: string,
  from: string,
  to: string,
  depTime: string,
  arrTime: string,
  min: number,
  max: number,
  arrDay = 0,
): Segment => ({
  id: newId(),
  trainNumber,
  from,
  to,
  depDay: 0,
  depTime,
  arrDay,
  arrTime,
  source: 'manual',
  price: { min, max, currency: 'EUR', source: 'ai_estimate' },
});

/** The example trip shown on first launch. Trains and prices are illustrative only. */
export function makeSampleTrip(lang: string): Trip {
  let trip = createTrip({
    name: lang.startsWith('zh') ? '意大利 + 中欧 三周（示例）' : 'Italy & Central Europe (example)',
    traveller: {
      residence: { type: 'europe', country: 'DE' },
      ageGroup: 'youth',
      travelClass: 2,
      count: 1,
    },
    startDate: '2027-07-14',
    places: [
      'berlin',
      'munich',
      'zurich',
      'milan',
      'venice',
      'florence',
      'rome',
      'vienna',
      'prague',
    ].map(place),
    nights: [2, 2, 2, 2, 3, 3, 2, 2],
    returnToStart: true,
  });
  const trains: Segment[] = [
    seg('ICE 1005', 'Berlin Hbf', 'München Hbf', '08:34', '12:35', 30, 110),
    seg('ECE 196', 'München Hbf', 'Zürich HB', '09:33', '13:01', 45, 130),
    seg('EC 317', 'Zürich HB', 'Milano Centrale', '09:33', '12:50', 40, 110),
    seg('FR 9709', 'Milano Centrale', 'Venezia S. Lucia', '10:05', '12:30', 20, 60),
    seg('FR 9417', 'Venezia S. Lucia', 'Firenze S.M.N.', '10:26', '12:40', 25, 65),
    seg('FR 9531', 'Firenze S.M.N.', 'Roma Termini', '11:10', '12:46', 20, 60),
    seg('NJ 294', 'Roma Termini', 'Wien Hbf', '19:18', '09:59', 70, 170, 1),
    seg('RJ 72', 'Wien Hbf', 'Praha hl.n.', '08:10', '12:08', 20, 60),
    seg('EC 172', 'Praha hl.n.', 'Berlin Hbf', '10:27', '14:45', 30, 80),
  ];
  trip.journeys.forEach((j, i) => {
    const s = trains[i];
    if (s) trip = upsertSegment(trip, j.fromStopId, s);
  });
  return { ...trip, sample: true };
}
