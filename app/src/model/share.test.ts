import { describe, expect, it } from 'vitest';
import { makeSampleTrip } from '../data/sampleTrip';
import { decodeTrip, encodeTrip } from './share';

describe('share links', () => {
  it('round-trips a trip without booking details', async () => {
    const trip = makeSampleTrip('en');
    trip.journeys[6]!.segments[0]!.reservation = {
      status: 'booked',
      ref: 'ABC123',
      seat: 'Car 3, 51',
    };
    trip.stops[2]!.note = 'Hostel';
    const data = await encodeTrip(trip);
    expect(data).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(data.length).toBeLessThan(2500);
    const back = (await decodeTrip(data))!;
    expect(back.stops.map((s) => s.place.id)).toEqual(trip.stops.map((s) => s.place.id));
    expect(back.stops[2]!.note).toBe('Hostel');
    expect(back.journeys[6]!.segments[0]!.reservation).toBeUndefined();
    expect(JSON.stringify(back)).not.toContain('ABC123');
    expect(back.sample).toBeUndefined();
  });

  it('rejects broken links', async () => {
    expect(await decodeTrip('not-a-trip')).toBeNull();
    expect(await decodeTrip('')).toBeNull();
  });
});
