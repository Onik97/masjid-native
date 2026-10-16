/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { dropIndex, dropOffset } from '../src/lib/reorder';

// Rows of uneven height, like a mosque whose name wraps onto two lines.
const heights = [80, 100, 80];

describe('drag to reorder', () => {
  test('a row drops into the slot whose middle it passed, and travels exactly to it', () => {
    expect(dropIndex(heights, 0, 30)).toBe(0); // not past the next row's middle yet
    expect(dropIndex(heights, 0, 100)).toBe(1);
    expect(dropIndex(heights, 0, 500)).toBe(2); // dragged past the end
    expect(dropIndex(heights, 2, -200)).toBe(0);
    expect(dropOffset(heights, 0, 2)).toBe(180);
    expect(dropOffset(heights, 2, 0)).toBe(-180);
    expect(dropOffset(heights, 1, 1)).toBe(0);
  });
});
