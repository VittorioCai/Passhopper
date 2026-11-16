import { describe, expect, it } from 'vitest';
import { parseTime } from './TimeInput';

describe('parseTime', () => {
  it('reads the usual ways of typing a time as 24-hour HH:mm', () => {
    expect(parseTime('08:05')).toBe('08:05');
    expect(parseTime('8:05')).toBe('08:05');
    expect(parseTime('0805')).toBe('08:05');
    expect(parseTime('805')).toBe('08:05');
    expect(parseTime('20.15')).toBe('20:15');
    expect(parseTime('20h15')).toBe('20:15');
    expect(parseTime(' 7 ')).toBe('07:00');
    expect(parseTime('23:59')).toBe('23:59');
  });

  it('rejects what is not a time', () => {
    for (const s of ['', '24:00', '12:60', 'ab', '1:5', '12345', '10:05 AM']) {
      expect(parseTime(s)).toBeNull();
    }
  });
});
