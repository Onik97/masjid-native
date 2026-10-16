import { fetchTimetable } from '@/features/masjidbox/api';
import type { Mosque } from '@/features/mosques/store';
import { queryOptions, useQueries } from '@tanstack/react-query';

export const timetableQuery = (mosque: Mosque) =>
  queryOptions({
    queryKey: ['timetable', mosque.id],
    queryFn: () => fetchTimetable(mosque.source, new Date()),
  });

export function useTimetables(mosques: Mosque[]) {
  return useQueries({ queries: mosques.map(timetableQuery) });
}
