import { describe, expect, it } from 'vitest';
import type { TrainOption } from '../timetable/transitous';
import { pickBest } from './BulkTrainSheet';

const opt = (dep: string, minutes: number, legs: number): TrainOption => ({
  minutes,
  legs: Array.from({ length: legs }, () => ({
    train: 'X',
    from: 'A',
    to: 'B',
    depDate: '2026-11-10',
    depTime: dep,
    arrDate: '2026-11-10',
    arrTime: '23:00',
  })),
});

describe('pickBest', () => {
  it('prefers direct and short, and avoids very early starts', () => {
    expect(pickBest([])).toBe(-1);
    expect(pickBest([opt('08:00', 300, 2), opt('09:00', 320, 1)])).toBe(1);
    expect(pickBest([opt('05:30', 240, 1), opt('08:30', 260, 1)])).toBe(1);
    expect(pickBest([opt('08:00', 600, 1), opt('08:30', 300, 2)])).toBe(1);
  });

  it('takes a slower train to skip a reservation when asked', () => {
    const fast = opt('08:00', 120, 1);
    const slow = opt('08:30', 180, 1);
    expect(pickBest([fast, slow])).toBe(0);
    // The fast one needs a seat: 90 minutes of penalty make the slow one better.
    expect(pickBest([fast, slow], (o) => (o === fast ? 90 : 0))).toBe(1);
    // But not when the slow one takes far longer.
    expect(pickBest([fast, opt('08:30', 300, 1)], (o) => (o === fast ? 90 : 0))).toBe(0);
  });
});
