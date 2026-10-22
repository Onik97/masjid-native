import { z } from 'zod';

export type NearbyMosque = {
  /** OpenStreetMap object, e.g. "way/123". */
  id: string;
  name?: string;
  lat: number;
  lng: number;
  postcode?: string;
  street?: string;
};

const Point = z.object({ lat: z.number(), lon: z.number() });

const Response = z.object({
  elements: z.array(
    z.object({
      type: z.string(),
      id: z.number(),
      // Nodes carry their own position, ways and relations a centre.
      lat: z.number().optional(),
      lon: z.number().optional(),
      center: Point.optional(),
      tags: z.record(z.string(), z.string()).optional(),
    }),
  ),
});

/** Maps an Overpass `out center tags` response to mosques; elements without a position are dropped. */
export function parseOverpass(json: unknown): NearbyMosque[] {
  const mosques: NearbyMosque[] = [];
  for (const { type, id, lat, lon, center, tags } of Response.parse(json).elements) {
    const point = lat != null && lon != null ? { lat, lon } : center;
    if (!point) continue;
    mosques.push({
      id: `${type}/${id}`,
      name: tags?.name,
      lat: point.lat,
      lng: point.lon,
      postcode: tags?.['addr:postcode'],
      street: tags?.['addr:street'],
    });
  }
  return mosques;
}

const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const TIMEOUT_MS = 75_000;

async function query(server: string, body: string) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(server, {
      method: 'POST',
      // Overpass answers 406 to requests without a real User-Agent.
      headers: {
        'User-Agent': 'masjid-native/1.0 (https://github.com/Onik97/masjid-native)',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: abort.signal,
    });
    if (!res.ok) throw new Error(`Overpass answered ${res.status}`);
    return parseOverpass(await res.json());
  } finally {
    clearTimeout(timer);
  }
}

/** Mosques within `radius` metres of the point, from OpenStreetMap. Tries a second server if the first fails. */
export async function fetchNearbyMosques(lat: number, lng: number, radius = 3000) {
  const ql = `[out:json][timeout:60];nwr(around:${radius},${lat},${lng})["amenity"="place_of_worship"]["religion"="muslim"];out center tags;`;
  const body = `data=${encodeURIComponent(ql)}`;
  for (const server of SERVERS) {
    try {
      return await query(server, body);
    } catch {
      // fall through to the next server
    }
  }
  throw new Error("Couldn't load nearby mosques right now. Check your connection and try again.");
}
