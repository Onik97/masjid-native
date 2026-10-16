import { z } from 'zod';
import { localDate } from '@/features/prayers/times';

// Every time is an ISO string carrying the mosque's own UTC offset, e.g. 2026-10-16T06:15:00+01:00.
const time = z.string();

export const DaySchema = z.object({
  date: time,
  fajr: time,
  sunrise: time,
  dhuhr: time,
  asr: time,
  maghrib: time,
  isha: time,
  iqamah: z.object({
    fajr: time,
    dhuhr: time,
    asr: time,
    maghrib: time,
    isha: time,
    jumuah: z.array(time).optional(),
  }),
  jumuah: z.array(time).optional(),
  hijri: z.object({ dayOfMonth: z.number(), monthISO: z.string(), year: z.number() }),
});
export type Day = z.infer<typeof DaySchema>;

const TimetableResponse = z.object({
  name: z.string().optional(),
  organization: z.object({ name: z.string() }).optional(),
  timetable: z.array(DaySchema),
});

/** How Masjid Box identifies a mosque: its embeddable-widget key, or its public page slug. */
export const SourceSchema = z.union([z.object({ key: z.string() }), z.object({ slug: z.string() })]);
export type Source = z.infer<typeof SourceSchema>;

const API = 'https://api.masjidbox.com/1.0/masjidbox/landing/athany';

/** The mosque's name as Masjid Box has it, plus `days` days of times starting today. */
export async function fetchTimetable(source: Source, from: Date, days = 31) {
  const range = `days=${days}&begin=${localDate(from)}T00:00:00.000Z`;
  // A widget key still works when a mosque has switched its public Masjid Box page off.
  const url =
    'key' in source ? `${API}?get=wg&key=${source.key}&${range}` : `${API}/${source.slug}?get=at&${range}`;
  // Public key shipped in Masjid Box's own embeddable widget; the origin answers 401 without it.
  const res = await fetch(url, { headers: { apikey: 'JejYcMS7hsOsZTPDk2ZhKOAlW9IyQ6Px' } });
  if (res.status === 404) throw new Error("Masjid Box doesn't publish this mosque's timetable");
  if (!res.ok) throw new Error(`Masjid Box answered ${res.status}`);
  const body = TimetableResponse.parse(await res.json());
  return { name: (body.organization?.name ?? body.name ?? '').trim(), days: body.timetable };
}

// First path segments on masjidbox.com that aren't a mosque page.
const NOT_A_MOSQUE = new Set(['widgets', 'public', 'assets', 'screens', 'applications', 'pricing', 'one']);

/** Finds a Masjid Box widget key or mosque slug in a pasted URL or a fetched web page. */
export function findMasjidBox(text: string): Source | undefined {
  const key =
    text.match(/data-masjidbox-widget=["']([\w-]+)["']/)?.[1] ??
    text.match(/masjidbox\.com\/w\/([\w-]+)/)?.[1];
  if (key) return { key };
  for (const [, section, slug] of text.matchAll(/masjidbox\.com\/([a-z-]+)\/([a-z0-9-]+)/g)) {
    if (!NOT_A_MOSQUE.has(section)) return { slug };
  }
  return undefined;
}

/** Turns a pasted mosque website or Masjid Box link into a source plus the mosque's name. */
export async function resolveLink(input: string, now: Date) {
  const url = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  let source = findMasjidBox(url);
  if (!source) {
    const res = await fetch(url).catch(() => undefined);
    if (!res?.ok) throw new Error("Couldn't open that link");
    source = findMasjidBox(await res.text());
  }
  if (!source) throw new Error('No Masjid Box timetable on that page. Try its masjidbox.com link.');
  const { name } = await fetchTimetable(source, now, 1);
  // Some mosques register their website as their name ("Suleymaniye.org").
  return { source, name: name.replace(/\.(org|com|net|co\.uk|org\.uk|uk)$/i, '') };
}

const SearchResults = z.array(
  z.object({
    name: z.string(),
    address: z.string().nullish(),
    slug: z.string(),
    // null when the mosque has switched its public Masjid Box page off; its slug then 404s.
    prayerTimes: z.unknown().nullish(),
  }),
);

/** Masjid Box's own name/address search. It returns at most three matches. */
export async function searchMosques(keyword: string) {
  const res = await fetch(
    `https://api.masjidbox.com/1.0/masjidbox/landing/search?keyword=${encodeURIComponent(keyword)}`,
    {
      headers: { apikey: 'JejYcMS7hsOsZTPDk2ZhKOAlW9IyQ6Px' },
    },
  );
  if (!res.ok) throw new Error(`Masjid Box answered ${res.status}`);
  return SearchResults.parse(await res.json()).map((m) => ({
    name: m.name.trim(),
    address: m.address?.trim() ?? '',
    slug: m.slug,
    open: m.prayerTimes != null,
  }));
}

/** Pasted text that looks like a link rather than a name to search for. */
export function looksLikeLink(text: string) {
  return /^https?:\/\//i.test(text.trim()) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(text.trim());
}
