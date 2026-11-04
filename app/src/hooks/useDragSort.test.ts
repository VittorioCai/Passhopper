import { describe, expect, it } from 'vitest';
import { dropIndex } from './useDragSort';

const boxes = [0, 100, 200, 300, 400].map((top) => ({ top, height: 90 }));

describe('dropIndex', () => {
  it('moves past the middle of each neighbour', () => {
    expect(dropIndex(boxes, 1, 0, 1)).toBe(1);
    expect(dropIndex(boxes, 1, 120, 1)).toBe(2);
    expect(dropIndex(boxes, 1, 260, 1)).toBe(3);
    expect(dropIndex(boxes, 1, 320, 1)).toBe(4);
    expect(dropIndex(boxes, 3, -170, 1)).toBe(2);
  });

  it('never goes before the first movable item', () => {
    expect(dropIndex(boxes, 2, -500, 1)).toBe(1);
  });
});
