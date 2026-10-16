# Masjid Box prayer times API

Both mosques publish their timetable through Masjid Box. Their websites embed the
Masjid Box widget; this app calls the API the widget calls, directly.

## The call

```
GET https://api.masjidbox.com/1.0/masjidbox/landing/athany?get=wg&key=<widgetKey>&days=<n>&begin=<ISO date>
```

| Mosque | Widget key | Masjid Box slug |
|---|---|---|
| Suleymaniye (212-216 Kingsland Road, E2 8AX) | `PxlRvTyAKL9BxvCG_zoqR` | `suleymaniyemosque` |
| Masjid as-Sahabah (295-297 Haggerston Road) | `qr5YbXShClECg8qrrg9sa` | `masjidsahabah` |

- Send `apikey: JejYcMS7hsOsZTPDk2ZhKOAlW9IyQ6Px`. It is the public key in Masjid
  Box's widget bundle, the same for every mosque; without it the origin answers
  401. (A cached Cloudflare copy can answer 200 without it, which hides this when
  testing with a URL that was already fetched.) The widget's `x-key`/`x-from`
  headers aren't needed.
- `Access-Control-Allow-Origin: *`, `Cache-Control: public, max-age=300`, served
  from Cloudflare's cache (~40 ms on a hit).
- `days` is not capped at the widget's 9: 31 and 60 both work (~25 KB and ~45 KB).
- `begin` is an ISO timestamp, e.g. `2026-10-16T00:00:00.000Z`.

### Why the widget endpoint, not the slug endpoint

`GET .../landing/athany/<slug>?get=at&days=&begin=` (what masjidbox.com's own
prayer-times page uses) returns 404 for Suleymaniye, because their public Masjid
Box page is switched off (`organization.athany.closed: true`). The widget
endpoint works for both, so the app uses it for both.

## Response

```jsonc
{
  "organization": { "name": "...", "address": "...", "timezone": "Europe/London",
                    "athany": { "slug": "...", "highlight": "athan" | "iqamah", "theme": "#4a90e2" } },
  "timetable": [{
    "date":    "2026-10-16T00:00:00+01:00",
    "fajr":    "2026-10-16T06:15:00+01:00",   // athan (start) times, with offset
    "sunrise": "...", "dhuhr": "...", "asr": "...", "maghrib": "...", "isha": "...",
    "iqamah":  { "fajr": "...", "dhuhr": "...", "asr": "...", "maghrib": "...", "isha": "...",
                 "jumuah": ["2026-10-16T13:30:00+01:00"] },
    "jumuah":  ["2026-10-16T13:15:00+01:00"],
    "hijri":   { "dayOfMonth": 5, "monthISO": "Jumada al-Ula", "year": 1448, ... },
    "special": { "imsak": "...", "iftar": "..." }
  }],
  "widget": { ... },          // widget styling + ~60 translation strings, unused here
  "isStale": false,
  "settingLastUpdated": "2026-10-11T19:30:00.041Z"
}
```

## Why suleymaniye.org is slow to show times

The times sit at the end of a five-hop chain, each hop waiting on the last:

1. A Wix page: 2.2 MB of HTML (340 KB compressed) and ~250 requests.
2. A Wix "HTML embed" iframe on `filesusr.com`, whose script waits for that
   iframe's `load` event before doing anything.
3. `masjidbox.com/widgets/loader.js`, which waits a further `setTimeout` and then
   loads `main.js`.
4. `main.js` injects a second iframe, `masjidbox.com/w/<key>`, a full React app:
   ~1 MB of JS compressed (4 MB decoded) plus Stripe for donations.
5. That app finally makes the ~10 KB API call above.

masjidsahabah.org runs the same widget (hops 3-5) on a lighter page.

## Adding a mosque from a link

`resolveLink` (`src/features/masjidbox/api.ts`) accepts a mosque website or a
masjidbox.com link and looks for, in order:

1. A widget key: `data-masjidbox-widget="<key>"` or `masjidbox.com/w/<key>`.
2. A mosque slug: `masjidbox.com/<any localised prayer-times path>/<slug>`, e.g.
   `masjidbox.com/prayer-times/shahporan`. The slug endpoint is
   `GET .../landing/athany/<slug>?get=at&days=&begin=` and returns the same day
   shape, with the name at the top level instead of under `organization`.

A key wins when a page has both, because a key still works when the mosque's public
page is switched off. Sites that load the widget late (Suleymaniye's Wix page only
references its embed in a later JSON payload) can't be resolved from their HTML;
paste the masjidbox.com link instead.

## Searching by name

`GET .../landing/search?keyword=<text>` (same `apikey` header) fuzzy-matches name
and address, postcodes included, and returns at most 3 results:
`id, name, address, slug, prayerTimes, ...`. Only `keyword` works; other parameter
names return `[]`. `prayerTimes: null` means the public page is closed (Suleymaniye):
its slug 404s and no widget key is returned, so those mosques still need a pasted
link. The add page uses it for name and postcode search.
