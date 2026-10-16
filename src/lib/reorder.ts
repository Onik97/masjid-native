const sum = (h: number[], start: number, end: number) => {
  'worklet';
  let total = 0;
  for (let k = start; k < end; k++) total += h[k] ?? 0;
  return total;
};

/** The slot a row dragged `dy` px from index `from` would drop into: the rows whose middle it passed. */
export function dropIndex(heights: number[], from: number, dy: number) {
  'worklet';
  const middle = sum(heights, 0, from) + heights[from] / 2 + dy;
  let to = 0;
  for (let k = 0; k < heights.length; k++) {
    if (k !== from && sum(heights, 0, k) + heights[k] / 2 < middle) to++;
  }
  return to;
}

/** How far the dragged row travels to sit in slot `to`. */
export function dropOffset(heights: number[], from: number, to: number) {
  'worklet';
  if (to > from) return sum(heights, from + 1, to + 1);
  return 0 - sum(heights, to, from);
}
