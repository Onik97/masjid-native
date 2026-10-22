# masjid-native

Today's prayer times for the mosques you follow, one row per mosque for the
prayer you pick, plus optional reminders before iqamah. Add any mosque that
publishes its timetable on Masjid Box by searching its name or postcode, or by
pasting its website or masjidbox.com link.

Times come straight from the Masjid Box API
([docs/masjidbox-api.md](docs/masjidbox-api.md)), are cached on the phone, and
refresh when the app comes back to the foreground. Expo + React Native; Android
first, nothing Android-only, so iOS can follow.

## Code layout

```
src/app/                 routes only (expo-router): index, add (search/paste), nearby (map), settings
src/features/masjidbox/  API client: Zod schemas, timetable fetch, link → mosque resolution
src/features/prayers/    pure prayer-time logic, the timetable query, home screen components
src/features/mosques/    the followed-mosques store (Zustand, persisted)
src/features/reminders/  reminder plan (pure), settings store, Android alarm scheduling
src/features/nearby/     mosques around the phone (OpenStreetMap) matched to Masjid Box
src/lib/                 query client + persister, on-device storage, small hooks
src/components/platform/ native Android controls (@expo/ui Compose) with cross-platform fallbacks
src/components/ui/       React Native Reusables components
```

- Server data (timetables) lives in TanStack Query, persisted to on-device storage
  so the app opens with times even offline.
- Local state (followed mosques, reminder settings) lives in persisted Zustand
  stores, validated with Zod when read back.
- `prayers/times.ts` and `reminders/plan.ts` are pure, and `bun test` covers them.

```sh
bun install
bun run android      # build and install a debug build on a device/emulator
bun start            # Metro, for an installed debug build
bun test             # prayer-time, reminder and link-parsing logic
bun run typecheck
```

Release APK for sideloading:

```sh
bunx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
# android/app/build/outputs/apk/release/app-release.apk
```

## Updates over the air

Installed apps check the self-hosted update server on launch, download a newer
JavaScript bundle in the background, and switch to it on the next launch.

- JavaScript or asset change: `bun run update` publishes it to the `production`
  branch. Needs `EOO_TOKEN` in `.env.local` (gitignored), a publish token from the
  server's dashboard.
- Native change (a new native package, anything in `app.json`): bump `version` in
  `app.json` and ship a new APK. The runtime version follows the app version, so an
  update never reaches a build whose native code it doesn't match.
- Updates are code-signed: the app only accepts bundles signed for
  `certs/certificate.pem`, the certificate from the server's dashboard.
- Keep `eoas` in the `update` script on the server's version.

## Reminders

Local notifications, scheduled on the phone: silent pop-ups (they vibrate, no sound)
for the iqamahs chosen in Settings, today and tomorrow only. They are rebuilt whenever
the app opens, and a background task (`src/features/reminders/background.ts`, defined
from the `index.ts` entry so it runs with no screen mounted) refetches the times every
few hours, so a mosque changing its timetable reaches the alarms without the app being
opened. Android fixes a notification channel's sound once created: changing how
reminders sound means a new channel id.

On Android each reminder is one notification with a live countdown to the
iqamah, drawn by the system with no app code running. A second alarm at the
iqamah swaps it to "Starting now", where it stays until dismissed. That part is
native (`modules/iqamah-countdown`, an Expo local module), so changing it needs a
new APK. Elsewhere reminders fall back to plain `expo-notifications`.

## Mosques near you

Add → "Mosques near you" asks for approximate location (precise location is
blocked in `app.json`), looks up mosques within 3 km on OpenStreetMap, and shows
them on a map (MapLibre, OpenFreeMap tiles, no key) and as a list. Tapping one
searches Masjid Box by its name and offers it only when the address agrees
(`src/features/nearby/match.ts`). Lookups are cached on the phone for a week per
~1 km area. See `docs/specs/mosques-near-me.md` for the limits.
