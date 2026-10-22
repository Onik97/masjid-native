# Design

One screen answers "when's the next jamaat at each of my mosques?"
Android first (sideloaded APK); nothing Android-only in shared code, so iOS can follow.
Read this before adding UI, so new screens pick from the same few options.

## Structure: the platform's chrome, configured, never rebuilt

- Every screen sits in the native Stack with the platform's top app bar (title left,
  back arrow, actions right). No `headerShown: false`, no hand-built title rows.
- Home (`index`): app bar "Today" / "Tomorrow" with a settings cog.
- Add (`add`): a pushed page with the search field in the app bar. Typing searches
  Masjid Box by name or postcode; pasting a website or masjidbox.com link offers
  "Add from …". Results are plain rows (name, address). This mirrors Clock's
  add-a-city flow.
- Settings (`settings`): a pushed page built like the home list: small grey labels over
  grouped `bg-card` surfaces. Display (Theme, Athan times), Iqamah reminders (Mosque, How
  early), Remind me for (the five prayers). Every row shows its title with the current
  value underneath; a value row opens a bottom sheet of radio rows, a switch row toggles
  on a tap anywhere in the row. No dropdown fields, no chevrons.
- Near you (`nearby`): pushed from the first row of Add ("Mosques near you"). The map fills
  the top half; below it, a `bg-background` panel with a `rounded-t-3xl` top edge overlaps
  the map and lists the mosques nearest first under one centred title ("Mosques nearby ·
  28"). Rows: an orange pin in a tinted disc, the name (up to two lines) with street and
  postcode under it, and the distance on the right at the same size as the name. No
  dividers inside the panel. Map pins are plain orange dots with a white ring; the phone is
  a blue dot. Tapping a pin or row enlarges its pin and opens a Material bottom sheet: the
  name, what Masjid Box has for it, and one filled orange button (Add mosque, or Add with
  their website link). Map tiles follow the theme (dark / positron); the map credit sits
  top right because the panel covers the bottom edge.
- System back works everywhere; there are no custom close buttons.

## Controls: native first

On Android these are real Jetpack Compose components from `@expo/ui`, themed by one
`Host` seed (`MATERIAL_SEED`, the app's orange) so every control shares a Material 3
palette. Each lives in `src/components/platform/` as a `.android.tsx` file next to a
`.tsx` fallback with the same props:

| Piece | Android | Fallback |
|---|---|---|
| Prayer selector | Material 3 segmented buttons (5) | RNR tabs restyled as a capsule row |
| Add | Material FAB, bottom-right | orange rounded square |
| Undo | Material snackbar (long duration) | 8s bar |
| App bar actions | Compose icon button, Material Symbols drawables | lucide icon |
| Settings switch | Material switch: grey off, orange on | `@expo/ui` universal switch |
| Settings choice | Material bottom sheet of radio rows | universal sheet, check on the current row |

Surfaces never come from the seeded Compose palette, which tints them peach. Rows,
sheets and switch tracks take the app's own tokens; only the orange accent is shared.

The Material segmented row only appears when the longest label still fits with the
selected-state check icon (about 530dp and up, e.g. tablets and foldables). On
typical phones (the Galaxy A55 is 411dp) "Maghrib"/"Jumuah" would sit flush against
the segment edge when selected, so they get the capsule row instead. Never cap font
scaling to save a layout.

## Look

- Dark by default, Light in Settings. Dark is a true black canvas; Light a pale grey page
  with white cards. Raised surfaces are `bg-card` in both.
- Home top: just the date and hijri date, centred and grey, above the prayer selector.
  Nothing loud above the list.
- Mosques: a small grey "Mosques" label over ONE grouped surface (`bg-card`,
  `rounded-3xl` on the outer corners only), rows separated by hairlines inset from the
  left. Never a card per row.
- Row: mosque name on the left (up to two lines, hyphenating long words) with its times
  small and grey underneath ("Iqamah 20:00", or "Athan 19:31 · Iqamah 20:00" with athan
  shown). On the right, the live countdown as the big number (`text-[34px]
  font-semibold tabular-nums`, "14:37" / "1:05:12") under a small "Iqamah in" /
  "Athan in" caption, or "Passed".
- `live` (green) marks the countdown of whatever happens soonest across all mosques
  (ties all get it). Passed rows go grey. Each row's countdown
  ticks once a second inside its own component and moves the screen on at zero. `action` (orange) is the primary action and the Material seed.
- Times are `selectable`. Copy is short: "In 56m", "Prayed at every mosque".

## Gestures

- Swipe a mosque row left to remove it: a flick or ~40% drag commits, less springs
  back. An Undo snackbar follows; no confirm dialog. The last mosque can't be removed.
- Hold a mosque row (400ms), then drag it up or down to reorder: it takes a tint, the
  rows it passes step aside, and it can't leave the group. Screen readers get Move up /
  Move down actions instead.
- The mosque list is a plain `ScrollView`: a handful of rows, and a virtualized list's
  animated cell wrappers swallowed the row swipe.

## Motion

- Swipe-to-remove follows the finger on the UI thread; release slides off in 200ms
  (strong ease-out) or springs back (critically damped, 300ms, carries velocity).
- The remaining rows close the gap with a 200ms layout transition.
- Reorder: rows step aside and the held row settles into its slot in 200ms (strong
  ease-out). The group's rounded ends belong to one clipping container, so they stay
  put while rows move inside it.
- Everything respects the system's reduce-motion setting.
- Tab/segment switches never animate. Screen pushes, the snackbar and controls use the
  platform's own motion.

## Verified

Emulator default size and 360dp, at 1.0x, 1.3x and 2x (largest) font.
