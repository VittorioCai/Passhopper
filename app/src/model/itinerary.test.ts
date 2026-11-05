import { describe, expect, it } from 'vitest';
import { makeSampleTrip } from '../data/sampleTrip';
import { tripToIcs } from './ics';
import { nextUp, trainMoments } from './itinerary';

const real = () => ({ ...makeSampleTrip('en'), sample: undefined });

describe('trainMoments', () => {
  it('puts every train at its real instant, night trains included', () => {
    const m = trainMoments(real());
    expect(m).toHaveLength(9);
    // ICE 1005 Berlin 08:34 on 14 July 2027 (summer time, UTC+2).
    expect(m[0]!.dep.toISOString()).toBe('2027-07-14T06:34:00.000Z');
    const nj = m.find((x) => x.seg.trainNumber === 'NJ 294')!;
    expect(nj.depDate).toBe('2027-07-28');
    expect(nj.arrDate).toBe('2027-07-29');
    expect(nj.arr.toISOString()).toBe('2027-07-29T07:59:00.000Z');
  });
});

describe('nextUp', () => {
  it('shows the trip under way, the next train and tonight’s city', () => {
    const up = nextUp([real()], new Date('2027-07-20T07:00:00Z'), '2027-07-20')!;
    expect(up.day).toBe(7);
    expect(up.train!.seg.trainNumber).toBe('FR 9709');
    // Leaving Milan for Venice today: tonight is Venice.
    expect(up.tonight!.place.id).toBe('venice');
    const later = nextUp([real()], new Date('2027-07-22T12:00:00Z'), '2027-07-22')!;
    expect(later.tonight!.place.id).toBe('florence');
  });

  it('appears two days before the first train, and never for the example', () => {
    expect(nextUp([real()], new Date('2027-07-12T05:00:00Z'), '2027-07-12')).toBeNull();
    expect(
      nextUp([real()], new Date('2027-07-13T09:00:00Z'), '2027-07-13')!.train!.seg.trainNumber,
    ).toBe('ICE 1005');
    expect(
      nextUp([makeSampleTrip('en')], new Date('2027-07-20T07:00:00Z'), '2027-07-20'),
    ).toBeNull();
  });
});

describe('tripToIcs', () => {
  it('writes one event per train and per stay, in UTC, folded to 75 bytes', () => {
    const t = real();
    t.stops[2]!.note =
      '住车站附近的青旅，周五 10 点乌菲兹美术馆的票，记得带护照和学生证，还有充电宝，以及雨伞。';
    t.journeys[6]!.segments[0]!.reservation = {
      status: 'booked',
      ref: 'ABC123',
      seat: 'Car 3, 51',
    };
    const ics = tripToIcs(t, (p) => p.en, {
      stay: (c, n) => `${c} · ${n} nights`,
      reservation: (ref, seat) => `Seat: ${seat} ${ref}`,
    });
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(9 + 8);
    expect(ics).toContain('DTSTART:20270714T063400Z');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270716');
    expect(ics).toContain('Car 3\\, 51');
    const enc = new TextEncoder();
    for (const line of ics.split('\r\n')) expect(enc.encode(line).length).toBeLessThanOrEqual(75);
  });
});
