# Spec: Mosques near me

## Objective

From the Add page, show the mosques around the phone on a map, so adding a local
mosque doesn't need its name. Tapping a pin finds that mosque's Masjid Box
timetable and adds it in one tap. Mosques with no Masjid Box timetable say so and
offer the paste-a-link path.

Masjid Box has no public nearby search (see `docs/masjidbox-api.md`), so the
mosques and their positions come from OpenStreetMap, and each one is matched to
Masjid Box through the existing keyword search.

Acceptance:
- Add page has a "Near me" entry; it asks for location once (approximate is
  enough) and opens a map centred on the phone with a pin per mosque within 3 km.
- Tapping a pin shows the mosque's name and either its Masjid Box match with an
  Add button, or "No timetable on Masjid Box" with a paste-link option.
- A match is only offered when the Masjid Box address agrees with the OSM one
  (postcode, else street); a same-name mosque elsewhere is never offered.
- Already-followed mosques show as added.
- Location denied, offline, or the OSM lookup failing each show a plain message,
  and name search keeps working.
- A second visit near the same place opens instantly from cache.

## Tech stack

Existing Expo SDK 58 app (see README). New dependencies, both native, so this
ships as a new APK (version 1.1.0), not over the air:
- `expo-location` 58.x: foreground, approximate position only.
- `@maplibre/maplibre-react-native` 11.x with OpenFreeMap tiles (no key), dark or
  light style following the app theme.

Data: Overpass API query
`nwr(around:3000,lat,lng)["amenity"="place_of_worship"]["religion"="muslim"]`,
sent to three public Overpass servers at once, first answer wins (they are often
slow or down; one answered in ~15 s while the others timed out). The result is
cached in the persisted TanStack Query cache, keyed by the position rounded to
~1 km, for 7 days. A Masjid Box match is checked against the OSM location: same
postcode, else the result's postcode (located with postcodes.io, free, no key) is
within 400 m, else, with no postcode in the address, the same street.

## Project structure

```
src/app/nearby.tsx               route: map, pins, selected-mosque sheet
src/features/nearby/overpass.ts  Overpass query + Zod schema → { id, name, lat, lng, postcode?, street? }
src/features/nearby/match.ts     pure: pick the Masjid Box search result whose address agrees
src/features/nearby/queries.ts   TanStack Query options for position, nearby list, match
tests/nearby.test.ts             parser and matching rules against real responses from the research
```

## Code style

As the rest of the app: feature folders, Zod at the trust boundary, TanStack
Query for server data, early returns, one-line comments only for a non-obvious
why.

## Testing strategy

`bun test` on the pure parts: the Overpass response parser and the address match
(hit, same-name-elsewhere rejected, no postcode falls back to street, unnamed
mosque). Map, permission and network paths are checked on the A55 and the
emulator, not unit tested.

## Boundaries

- Always: `bun test`, `bun run typecheck`, `bunx prettier --check src tests`
  before merge; check the map on a real phone.
- Ask first: any server-side piece (e.g. an Overpass cache on the update server),
  background location, any other map or tile provider.
- Never: Masjid Box's private app API, precise or background location, keys or
  tokens in the repo.

## Success criteria

- Around E2 8AX the map shows the local mosques (7 within 2 km in the research)
  and offers matches only for the ones whose Masjid Box address agrees.
- Madina Masjid (OSM, E5 9QD) is not matched to the Masjid Box entry on High
  Street North.
- Cold lookup shows progress and finishes or fails with a message; a warm one is
  instant.

## Known limits

- Roughly 40% of nearby mosques in east London have a Masjid Box match; the rest
  may simply not use Masjid Box.
- Some Masjid Box mosques aren't in OpenStreetMap (e.g. Masjid as-Sahabah), so
  name search stays the main way in.
- Masjid Box pages that are closed still need a pasted link.

## Decisions

1. Look of the map screen: auto design mode (references scored and picked
   without a review round, report at the end with the runner-up).
2. The ~30 s first lookup is accepted; the result is cached on the phone, no
   server-side piece.
