import { describe, expect, it } from 'vitest';
import { monthGrids } from './TripCalendar';

describe('monthGrids', () => {
  it('builds Monday-first months covering the trip', () => {
    const m = monthGrids('2027-07-14', '2027-08-02');
    expect(m.map((x) => x.key)).toEqual(['2027-07', '2027-08']);
    // Weeks before the trip are dropped: July starts with the week of Monday 12 July.
    expect(m[0]!.cells[0]).toBe('2027-07-12');
    expect(m[0]!.cells.length % 7).toBe(0);
    // August: only the week of 2 August (and the padding before it from Monday 26 July's row).
    expect(m[1]!.cells.filter(Boolean)).toEqual([
      '2027-08-01',
      ...Array.from({ length: 7 }, (_, i) => `2027-08-0${i + 2}`),
    ]);
  });
});
