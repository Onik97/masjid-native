import { queryOptions } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { matchMosque } from './match';
import { fetchNearbyMosques, type NearbyMosque } from './overpass';

const WEEK = 7 * 24 * 3600_000;

export type Point = { lat: number; lng: number };
export type Position =
  { status: 'locating' | 'denied' | 'failed' } | { status: 'ready'; at: Point; area: Point };

/** The phone's approximate position, asked for once when the screen opens. */
export function usePosition(): Position {
  const [position, setPosition] = useState<Position>({ status: 'locating' });
  useEffect(() => {
    let live = true;
    const set = (p: Position) => live && setPosition(p);
    (async () => {
      if (!(await Location.requestForegroundPermissionsAsync()).granted) return set({ status: 'denied' });
      const fix =
        (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 })) ??
        // Android may ask to switch on Location Accuracy here; approximate location needs it.
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() =>
          Location.getLastKnownPositionAsync(),
        ));
      if (!fix) return set({ status: 'failed' });
      const at = { lat: fix.coords.latitude, lng: fix.coords.longitude };
      // The lookup goes by the ~1 km square the phone is in, so nearby visits share one cached result.
      set({ status: 'ready', at, area: { lat: round(at.lat), lng: round(at.lng) } });
    })().catch(() => set({ status: 'failed' }));
    return () => {
      live = false;
    };
  }, []);
  return position;
}

const round = (n: number) => Math.round(n * 100) / 100;

// The public OpenStreetMap server can take ~30 s, so a lookup is kept for a week.
export const nearbyQuery = (area: Point) =>
  queryOptions({
    queryKey: ['nearby', area.lat, area.lng],
    queryFn: () => fetchNearbyMosques(area.lat, area.lng),
    staleTime: WEEK,
    retry: false,
  });

export const matchQuery = (mosque: NearbyMosque) =>
  queryOptions({
    queryKey: ['nearby-match', mosque.id],
    queryFn: async () => (await matchMosque(mosque)) ?? null,
    staleTime: WEEK,
  });
