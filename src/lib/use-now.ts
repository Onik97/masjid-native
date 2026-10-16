import { useCallback, useEffect, useState } from 'react';

/**
 * Current time, re-rendering on each `stepMs` boundary (whole minutes by default). `refresh`
 * re-reads the clock straight away, e.g. when a countdown elsewhere reaches zero mid-minute.
 */
export function useNow(stepMs = 60_000): [Date, () => void] {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setTimeout(() => setNow(new Date()), stepMs - (now.getTime() % stepMs));
    return () => clearTimeout(id);
  }, [now, stepMs]);
  return [now, useCallback(() => setNow(new Date()), [])];
}
