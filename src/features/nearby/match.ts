import { z } from 'zod';
import { searchMosques } from '@/features/masjidbox/api';
import type { NearbyMosque } from './overpass';

export type Match = { slug: string; name: string; address: string; open: boolean };
type Point = { lat: number; lng: number };

const MAX_DISTANCE_M = 400;
const GENERIC = new Set(
  'masjid mosque jamme jame islamic centre center cultural community association trust the'.split(' '),
);

/** Search terms to try for an OSM mosque name, best first: the name, then the name without generic words. */
export function searchKeywords(name?: string) {
  const full = name?.trim();
  if (!full) return [];
  const rest = full
    .split(/[\s&,.()]+/)
    .filter((word) => word && !GENERIC.has(word.toLowerCase()))
    .join(' ');
  if (rest.length < 3 || rest.toLowerCase() === full.toLowerCase()) return [full];
  return [full, rest];
}

/** A full UK postcode in the text, normalised to "E2 8AX". */
export function extractPostcode(text: string) {
  const found = text.match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i);
  return found ? `${found[1]} ${found[2]}`.toUpperCase() : undefined;
}

/** Great-circle distance in metres. */
export function distanceMetres(a: Point, b: Point) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

const words = (text: string) =>
  ` ${text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()} `;

/**
 * Whether a Masjid Box result sits where the OSM mosque does: same postcode, else its postcode is within
 * 400 m (`postcodeLocation`, looked up by the caller), else, with no postcode, the OSM street is in the address.
 */
export function addressAgrees(m: NearbyMosque, result: Pick<Match, 'address'>, postcodeLocation?: Point) {
  const postcode = extractPostcode(result.address);
  if (!postcode) return !!m.street && words(result.address).includes(words(m.street));
  if (m.postcode && extractPostcode(m.postcode) === postcode) return true;
  return !!postcodeLocation && distanceMetres(m, postcodeLocation) <= MAX_DISTANCE_M;
}

const PostcodeLookup = z.object({
  result: z.object({ latitude: z.number().nullable(), longitude: z.number().nullable() }),
});
const postcodes = new Map<string, Point | undefined>();

async function locatePostcode(postcode: string) {
  if (postcodes.has(postcode)) return postcodes.get(postcode);
  const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
  // Unknown postcodes are a final answer; anything else may be temporary and must not be cached.
  if (!res.ok && res.status !== 404) throw new Error(`Postcode lookup answered ${res.status}`);
  const { latitude, longitude } = res.ok ? PostcodeLookup.parse(await res.json()).result : {};
  const point = latitude != null && longitude != null ? { lat: latitude, lng: longitude } : undefined;
  postcodes.set(postcode, point);
  return point;
}

/** The Masjid Box page for this mosque, only when its address agrees with the OSM one; never on name alone. */
export async function matchMosque(m: NearbyMosque): Promise<Match | undefined> {
  for (const keyword of searchKeywords(m.name)) {
    for (const result of await searchMosques(keyword)) {
      const postcode = extractPostcode(result.address);
      const samePostcode = postcode && extractPostcode(m.postcode ?? '') === postcode;
      const location = postcode && !samePostcode ? await locatePostcode(postcode) : undefined;
      if (addressAgrees(m, result, location)) return result;
    }
  }
  return undefined;
}
