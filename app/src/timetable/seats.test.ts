import { describe, expect, it } from 'vitest';
import { optionSeats } from './seats';
import type { TrainOption } from './transitous';

const opt = (...trains: string[]): TrainOption =>
  ({
    minutes: 120,
    legs: trains.map((train) => ({
      train,
      from: 'A',
      to: 'B',
      depDate: '2027-07-20',
      depTime: '10:00',
      arrDate: '2027-07-20',
      arrTime: '12:00',
    })),
  }) as TrainOption;

describe('optionSeats', () => {
  it('adds the reservation fee of Italian high-speed trains', () => {
    const s = optionSeats(opt('FR 9709'), 'IT', 'IT', 2);
    expect(s.needed).toBe(true);
    expect(s.fee).toBeGreaterThan(0);
  });

  it('needs no reservation on regional trains', () => {
    expect(optionSeats(opt('RV 2116'), 'IT', 'IT', 2)).toMatchObject({ needed: false, fee: 0 });
  });

  it('adds up fees over changes', () => {
    const one = optionSeats(opt('FR 9709'), 'IT', 'IT', 2);
    const two = optionSeats(opt('FR 9709', 'FR 9531'), 'IT', 'IT', 2);
    expect(two.fee).toBe(one.fee * 2);
  });
});
