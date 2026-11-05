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
});
