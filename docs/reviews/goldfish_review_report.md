Status: resolved (batch 3 applied)

# Review resolution, batch 3: remaining Majors

Target: `docs/designs/italy_trip_planner.md`
Source findings: `consolidated_review_report.md` (M3, M5, M7, M11–M15, M17–M24)
Batches 1 and 2: `goldfish_review_report_batch1.md`, `goldfish_review_report_batch2.md` (resolved)

All 16 items are classified **PROPOSE FIX**. None are contested. Facts below were checked on 2026-11-06 against the live `italy.json` and `opening_hours@3.15.0` in a scratch folder.

Data facts used in this batch:

| Fact | Value |
| --- | --- |
| Raw fields | `id, name, type, city, region, neighborhood, description, latitude, longitude, hours, duration_minutes, price_range, rating, tags, seasonal_notes, booking_required` (flat; no nested location) |
| Nulls | `neighborhood` 19, `hours` 33, `duration_minutes` 9, `seasonal_notes` 87, `booking_required` 1 (`place_020`) |
| `price_range` values | `€`, `€€`, `€€€`, `€€€€` |
| `seasonal_notes` present | 16 records |
| Tags with `_` | only `local_favorite`; 5 distinct tags use `-` |
| Distinct hours strings | 57: 17 `parsed`, 37 `normalized`, 3 `unparsed` (`Evenings`, `Morning only`, `9am-12:30pm`) |
| `getOpenIntervals` "unknown" flag | never set by any string in the data |
| `09:00-19:00` on 2027-03-27/28/29 | `[540,1140]` on all three dates, under both `TZ=Europe/Rome` and `TZ=UTC` |

---

## Issue 1 (M3): Fit the scope to the time budget

**Your decision:** no fixed minimum; build in order and stop when time runs out.

**Problem:** the doc has both "cut from the end" and a separate cut order that cuts from the middle. Files have no stage. Stage 1 is overloaded. The README is last, so running out of time would cut a required deliverable (G8).

**Fix:**
- Replace the stage table. Order is by priority, so stopping at any point leaves the most valuable work done:

  | Stage | Scope | Budget |
  | --- | --- | --- |
  | 0 | Set up the project and its tooling | 15 min |
  | 1 | Typed model, `getDataset` with snapshot fallback, `normalize`, Discover list and map | 60 min |
  | 2 | Filters and search | 30 min |
  | 3 | Interest, must-visit, localStorage | 25 min |
  | 4 | Plan action, feasibility check, one itinerary (unseeded run only), Plan view | 60 min |
  | 5 | README | 15 min |
  | 6 | Multi-start seeds, up to 3 options, overlap rule | 15 min |
  | 7 | Data-quality panel (flags already show on cards from stage 1) | 10 min |
  | 8 | 2-opt | 10 min |

- Replace the intro and delete "Cut order if behind":
  > The stages are built in order, and work stops where time runs out. There is no separate cut order. A stage is done when `npm run build`, `npm run lint` and `npm test` all pass, with that stage's tests written in that stage. Any stage finished after stage 5 adds one line to the README. The smallest version that ships is the end of stage 1: every place in a list and on a map, with flags.
- Add a **Stage** column to every file table. Tests take the stage of the code they test.
  - 0: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `.gitignore`, `config.ts` (the planner keys are added in stage 4), `tests/empty.ts`
  - 1: `types.ts`, `cityCentres.ts`, `geo.ts`, `normalizeHours.ts`, `normalize.ts`, `getDataset.ts`, `italy.snapshot.json`, `layout.tsx`, `globals.css`, `page.tsx`, `error.tsx`, `loading.tsx`, `AppNav`, `SnapshotNotice`, `DiscoverView`, `PlaceList`, `PlaceCard`, `FieldValue`, `HoursValue`, `FlagBadge`, `CategoryIcon`, `PlaceMap`, `mock-source.mjs`
  - 2: `text.ts`, `filterPlaces.ts`, `FilterBar`, `SearchBox`
  - 3: `prefs/types.ts`, `storage.ts`, `usePreferences.ts`, `InterestControl`, `MustVisitToggle`
  - 4: every file in Plan action, planner and Plan UI, except `improveRoute.ts`
  - 5: `README.md`
  - 6: no new files. Seeds and option picking in `plan.ts` and `pickOptions`. The `OptionTabs` "Only one distinct plan" copy.
  - 7: `DataQualityPanel`
  - 8: `improveRoute.ts`
- Say what each stage leaves behind when it's the last one done:
  - **After stage 4:** `plan()` runs with `maxSeeds: 0` and returns one option, "Best overall". `OptionTabs` shows a single tab with no "only one distinct plan" line. The overlap and seed tests in `plan.test.ts` are written in stage 6.
  - **After stage 6:** CUJ 5's data-quality list is missing. The README lists it as cut.
  - **After stage 7:** routes are the greedy order. `plan.ts` step 5 is a no-op.
- Overview, last sentence: "features are built in a fixed order and cut from the end" stays. It now matches.

---

## Issue 2 (M5): Show seasonal notes

**Problem:** 16 records have `seasonal_notes`, such as "Best April-October" and "Closed Sundays except last Sunday", but nothing in the Plan view shows them.

**Fix:**
- `StopWarning` adds `'seasonal_note'`. `buildOption` adds it to any stop whose place has `seasonalNotes`.
- `StopCard` shows the note text next to that badge.
- `PlaceCard` shows `seasonalNotes` as a line of text (it is in the `Place` model but not in the card's field list).
- `plan.test.ts`: a made-up place with `seasonalNotes` gets `seasonal_note` when scheduled.
- Non-Goals keeps "Parsing `seasonal_notes` into rules". The notes are shown, not used.

---

## Issue 3 (M7): Specify every cleaning rule and the raw field mapping

**Fix:**
- Add `RawPlace` after the typed model, in a ```ts block:
  ```ts
  // Every field is unknown: nothing about the source is trusted.
  interface RawPlace {
    id: unknown; name: unknown; type: unknown; city: unknown; region: unknown;
    neighborhood: unknown; description: unknown; latitude: unknown; longitude: unknown;
    hours: unknown; duration_minutes: unknown; price_range: unknown; rating: unknown;
    tags: unknown; seasonal_notes: unknown; booking_required: unknown;
  }
  ```
- Start the cleaning rules with: "A string that is empty after trimming counts as missing, for every field."
- Add these rule lines (the existing id, hours, coordinates, type and duration rules stay):
  - **Name.** `name` → `name`. Missing → "Unnamed place" with `name_missing`.
  - **Text fields.** `city`, `region`, `neighborhood`, `description` and `seasonal_notes` → `city`, `region`, `neighborhood`, `description` and `seasonalNotes`. Missing → `undefined`, with no flag. A missing `city` makes the place an uncertain match for the city filter, and skips the suspect-distance check.
  - **Coordinates.** `latitude` and `longitude` → `location.coordinates`. These are the source's top-level fields.
  - **Price.** `price_range` → `price`. A string of 1 to 4 `€` → `ok` (its length). Missing → `missing` with `price_unknown`. Anything else → `invalid` with `price_unknown`.
  - **Rating.** `rating` → `rating`, when it is a number from 0 to 5. Otherwise `undefined`, with no flag. It is display only.
  - **Booking.** `booking_required` → `bookingRequired`. A boolean → `ok`. Null → `missing` with `booking_unknown` (`place_020`). Anything else → `invalid` with `booking_unknown`.
  - **Tags.** If `tags` is not an array, use `[]`. Drop entries that are not strings. Trim, lowercase, replace `_` with `-`, and remove duplicates.
- **Tag direction changes** from `-`→`_` to `_`→`-`. Only `local_favorite` uses `_`; 5 tags use `-`. Update the `Place.tags` comment, OQ2, Alternative 11 and the cleaning rule. `normalize.test` still checks that `local-favorite` and `local_favorite` merge.
- `normalize.ts` row: "Applies every cleaning rule from the Technical Plan, reading `RawPlace` fields." `makeRawPlace(overrides)` is added to `tests/fixtures/places.ts` for records with missing or out-of-bounds values.

---

## Issue 4 (M11): Specify the scheduling rules and `PlanContext`

**Fix:**
- Add to `src/lib/planner/types.ts` and show in the Technical Plan:
  ```ts
  interface Interval { start: number; end: number }   // minutes after midnight, clipped to the window
  interface PlanContext {
    dates: string[];                                   // trip dates, 'YYYY-MM-DD'
    windowStart: number; windowEnd: number;            // minutes
    estimator: TravelTimeEstimator;
    config: PlannerConfig;
    visitMinutes(place: Place): number;                // durationMinutes when ok, else defaultVisitMinutes
    intervals(place: Place, dayIndex: number): Interval[]; // cached per place and day
  }
  ```
- `tryInsert(days, dayIndex, place, position, ctx)` and `bestInsertion(days, place, scoreFn, ctx)` take `ctx`.
- Add a **Scheduling rules** list to the Planner section:
  1. A day's first stop starts no earlier than `windowStart + travelMinutesBefore` (see "Travel between days").
  2. A stop's arrival is the previous stop's end plus travel. If the place is not open yet, the stop waits: start = the later of arrival and the interval's start.
  3. A visit must fit inside one opening interval: `start + visit ≤ interval.end`. It must also end by `windowEnd`.
  4. Travel minutes are rounded up with `Math.ceil`.
  5. Intervals for day *d* come from `getOpenIntervals(d 00:00, d+1 00:00)`, then are clipped to the window. `place_020` (`8:00-01:00`) gives `[0,60]` and `[480,1440]` on a weekday; the first piece is the previous night's hours. The window ends by 24:00 (`dayEnd > dayStart`, both on one day), so no stop runs past midnight.
  6. The library marks some intervals "unknown" (index 2 of each `[from, to, unknown, comment]` entry). These count as open, and the stop gets `hours_normalized`. No string in today's data sets this flag.
  7. A place with `unparsed` or `missing` hours has one interval, the whole window. Its stop gets the matching `…assumed_open` warning.
- `time.ts` row: `openIntervals` returns `Interval[]` and follows rules 5 and 6.

---

## Issue 5 (M12): Fix the travel-time formulas

**Problem:** the table says "minutes" but the formulas give hours. The bands also jump down: at 2 km, walking is 31 min but local transit is 15; at 50 km, transit is 140 but train is 55. A minute estimate that can drop as distance grows makes the MST in feasibility stage 4 no longer a true lower bound.

**Fix:** use the fastest mode at every distance instead of distance bands. Every mode's time grows with distance, so the fastest of them also grows with distance, and there are no band edges.
- Replace the travel table with:

  | Mode | Fixed overhead | Detour factor | Speed |
  | --- | --- | --- | --- |
  | walk | 0 min | 1.3 | 5 km/h |
  | local (transit or car) | 10 min | 1.3 | 30 km/h |
  | long distance (train or car) | 30 min | 1.0 | 120 km/h |

  > `estimate(a, b) = Math.ceil(min over modes of overhead + km × detour / speed × 60)`, where `km` is the haversine distance. The detour factor allows for streets not being straight lines.
- Expected minutes, listed in the doc and tested: 0 km → 0; 0.5 → 8; 2 → 16; 2.01 → 16; 10 → 35; 50 → 55; 50.01 → 56.
- Config: `travelModes: TravelMode[]` replaces `travelBands`. `interface TravelMode { name: string; overheadMin: number; detour: number; kmh: number }`.
- `travel.ts` row: `fastestModeEstimator(config)` replaces `bandedEstimator`.
- `travel.test.ts` row: the expected values above, plus a monotonicity check (0 to 500 km in 0.01 km steps, never decreasing).
- The trade-off, stated once under the table: at about 10–50 km the long-distance mode wins, which may underestimate trips between towns without a train line.
- The other fix the review suggested, joining the bands at their edges, keeps the walk/transit/train labels but needs a band-edge rule and an offset per band. Not chosen.

---

## Issue 6 (M13): Unify the data-quality and warning types

**Fix:**
- `PlaceFlag` adds `'id_missing' | 'id_duplicate'`, used by the id cleaning rule.
- `StopWarning` becomes `'hours_unparsed_assumed_open' | 'hours_missing_assumed_open' | 'hours_normalized' | 'duration_default' | 'location_suspect' | 'seasonal_note'`. `travel_estimated` is removed. Delete "Every travel leg in a plan carries the `travel_estimated` warning." and replace it with "`DayTimeline` labels every travel time as an estimate."
- `Unscheduled.reason` drops `too_far`; `no_time` covers it. Remove the `too_far` bullet from planner step 7. `location_unusable` stays; planner step 1 now produces it.
- Add `type Badge = PlaceFlag | StopWarning`. `FlagBadge` takes `{ badge: Badge }` and uses this one table, which goes in the Technical Plan:

  | Badge | Label | Hover text |
  | --- | --- | --- |
  | `id_missing` | No id | The source had no id. Saved choices for this place may be lost if the data changes. |
  | `id_duplicate` | Duplicate id | Another record has the same id. This one was renamed. |
  | `name_missing` | No name | The source had no name. |
  | `type_unknown` | Unknown type | The source type is not one we know. |
  | `location_suspect` | Location may be wrong | More than 25 km from the city centre. |
  | `location_unusable` | Location unknown | Missing, or outside the area we plan in. |
  | `hours_normalized` | Hours interpreted | The hours were read with small corrections. |
  | `hours_unparsed` | Hours unreadable | The hours text could not be read. |
  | `hours_missing` | Hours unknown | The source has no hours. |
  | `duration_default` | Visit length guessed | No visit length given; 60 minutes is used. |
  | `price_unknown` | Price unknown | The source has no usable price. |
  | `booking_unknown` | Booking unknown | The source does not say whether booking is needed. |
  | `hours_unparsed_assumed_open` | Assumed open | The hours could not be read, so this time may be wrong. |
  | `hours_missing_assumed_open` | Assumed open | There are no hours, so this time may be wrong. |
  | `seasonal_note` | Seasonal note | The note text. |

- `normalize` builds `issues` from each place's flags (one `DataIssue` per flag), so the two can't disagree. Add this sentence to the `normalize.ts` row.

---

## Issue 7 (M14): Give every type a home file and a full definition

**Fix:**
- Add a short "Where types live" list to the Technical Plan:
  - `src/lib/types.ts`: the place model.
  - `src/lib/prefs/types.ts` (new row, stage 3): `Interest`, `PlacePref`, `StoredPrefs`.
  - `src/lib/discover/filterPlaces.ts`: `FilterCriteria` (Issue 8).
  - `src/lib/config.ts`: `PlannerConfig`, `TravelMode`.
  - `src/lib/planner/types.ts`: the action types, plus `Interval`, `PlanContext` and `DaySchedule`.
  - `src/lib/planner/travel.ts`: `TravelTimeEstimator`.
- Add the `PlannerConfig` definition next to the config bullet list:
  ```ts
  interface PlannerConfig {
    points: { maybe: number; very: number };
    defaultVisitMinutes: number; defaultDayStart: string; defaultDayEnd: string;
    tripDays: number; maxSeeds: number; maxOptions: number; optionOverlapLimit: number;
    travelModes: TravelMode[];
  }
  ```
- Turn the Plan action block from ```text into ```ts with real TypeScript types, the same content.
- Discover UI intro: "Props are typed from `@/lib/types` only" becomes "Props use types from `@/lib/types`, `@/lib/prefs/types` and `@/lib/planner/types`. These files hold types only, so a component never imports server code."

---

## Issue 8 (M15): Define the filter contract

**Fix:** add to the Discover section and the `filterPlaces.ts` row:
```ts
interface FilterCriteria {
  categoryGroups: string[];   // keys of CATEGORY_GROUPS
  cities: string[];
  prices: Price[];
  tags: string[];
  query: string;
  showNotInterested: boolean;
}
```
- An empty array means no filter on that field. Values within one field combine with OR. Fields combine with AND.
- Only `price` (a `Field`) and `city` (optional) can be missing, so only those filters produce uncertain matches. `Unknown` is its own category group, and matches only when it is selected.
- With an empty query, results are sorted by name. With a query, name matches come first, then other matches, each sorted by name.
- Only `DiscoverView` and `PlanView` call `usePreferences()`. Children get values and setters as props.
- `usePreferences` row: "sets `ready` once loaded so nothing renders before then" becomes "Until `ready`, the interest and must-visit controls are disabled. The list and map render at once."

---

## Issue 9 (M17): Make the hours-parsing claims checkable

**Fix:**
- Cleaning rules, Hours: replace "In a test run against the dataset, 54 of 57 distinct strings parsed. … The 24/7 default is never used." with:
  > Of the 57 distinct strings, 17 parse with no warnings (`parsed`), 37 parse with warnings (`normalized`, for example `Tues`, `Daily` and `8am-7pm`), and 3 throw (`unparsed`): `Evenings`, `Morning only` and `9am-12:30pm`. Checked with opening_hours 3.15.0. Empty and null values are set to `missing` before the library is called, so the library never fills in a default.
- Remove "tolerant mode" from Alternatives 7 and 8. The constructor call uses the library's default mode, which accepts these forms with warnings. Say that instead.
- Replace "the 9 tricky cases from the drafting test" with this table, in the `normalizeHours.test.ts` row or under the cleaning rules. Tuesday is 2027-03-23 and Saturday is 2027-03-27. Values are minutes, and 1440 means midnight:

  | Input | Status | Tuesday | Saturday |
  | --- | --- | --- | --- |
  | `8:00-01:00` | parsed | [0,60], [480,1440] | [0,60], [480,1440] |
  | `Wed-Mon 10:00-19:00` | normalized | closed | [600,1140] |
  | `Tues, Thurs-Sun 10:00-18:00` | normalized | [600,1080] | [600,1080] |
  | `Daily 10:00-24:00` | normalized | [600,1440] | [600,1440] |
  | `8am-7pm` | normalized | [480,1140] | [480,1140] |
  | `Sat-Sun 9:00-19:00` | normalized | closed | [540,1140] |
  | `Mon-Fri 7:00-14:00, Sat 7:00-17:00` | normalized | [420,840] | [420,1020] |
  | `9am-12:30pm`, `Evenings`, `Morning only` | unparsed | n/a | n/a |

- G2 measure becomes: "A test asserts the 17 / 37 / 3 split and the exact `unparsed` set for the bundled snapshot. A refreshed snapshot with a new unreadable string fails the test until someone looks at it." This runs on the snapshot, not live data, so the app stays tolerant of new strings (your M4 decision).

---

## Issue 10 (M18): Make time-zone handling deterministic

**Fix:**
- Time handling, first bullet: "a wall-clock time in Italy" becomes "minutes after midnight in the local time written in the hours text".
- Add: "Vercel runs functions in UTC, which has no clock changes, so the local-method approach has no error in production. The error appears only on a host whose time zone changes clocks."
- `vitest.config.ts` row: sets `process.env.TZ = 'Europe/Rome'` at the top of the file, so worker processes inherit it and tests give the same result on every machine. Your machine is on US Central time, which changes clocks on 2027-03-14, not 2027-03-28.
- `time.test.ts` row: "`09:00-19:00` gives `[540,1140]` on 2027-03-27, 03-28 and 03-29." Verified under both `Europe/Rome` and `UTC`.
- R7: remaining risk becomes "Only on hosts whose zone has clock changes. Vercel uses UTC."

---

## Issue 11 (M19): Make "deterministic" true and testable

**Fix:**
- Specify every tie-break in the Planner section:
  - must-visits are inserted longest visit first, then by lower `id`
  - `bestInsertion` ties go to the earlier day, then the earlier position
  - fill score ties go to higher dataset `rating`, then lower `id` (already stated)
  - pick options: total fill points, then the unseeded run first, then lower seed `id`. This replaces "then by label", because two places can share a name.
- `plan.test.ts`: replace "two runs give the same output" with "shuffling the order of `places` and of the `prefs` keys gives a deep-equal result".
- `plan.test.ts`: replace "every stop with typed hours is within those hours" with a check against hand-written intervals for named places:
  - Colosseum, `place_001`, `9:00-19:00`: inside [540,1140]
  - Uffizi, `place_026`, `Tues-Sun 8:15-18:50`: inside [495,1130], and never on a Monday
  - `place_059`, `Sat-Sun 9:00-19:00`: only on Saturday or Sunday, inside [540,1140]

  The test does not call the scheduler's `openIntervals`.

---

## Issue 12 (M20): Calibrate claims in the Goals

**Fix:**
- G1: "coordinates inside Italy" becomes "coordinates inside the planning area (`isInCountry`, a rectangle around Italy for now)". Make the same change in CUJ 5: "because the coordinates are inside Italy".
- G3: the title becomes "Places can be found by filter and search." Add a measure: "`filterPlaces.test` returns exactly `place_009` and `place_022` for CUJ 1."
- G4: "Must-visit is a separate flag that the planner guarantees" becomes "…that every itinerary includes". Add a measure: "`storage.test` passes, and the CUJ 2 manual check passes."
- G5: the title becomes "Every itinerary includes every must-visit, or the traveler is told which must-visits could not be placed." The measure becomes: "No itinerary omits a must-visit. If they cannot all be placed, no itinerary is shown and the conflicts are named."
- G7: add a measure: "Changing any listed setting means editing `config.ts` only, or swapping one function (`TravelTimeEstimator`, `isInCountry`)."
- G8: add a measure: "The README has the three listed sections."
- Data loading: "On 103 records it costs well under 10 ms, so there is no memo" becomes "It is one pass over the records, so there is no memo."
- Typed model intro: "work with any dataset" becomes "work with any dataset that has the same fields".

---

## Issue 13 (M21): Separate "rating" from "interest", and add a glossary

**Fix:**
- Add a **Terms** section after the Overview:
  - **Interest:** the traveler's choice for a place: Not interested, Maybe, Very interested, or Unrated (no choice).
  - **Rating:** the dataset's star rating, 0–5. It never means the traveler's choice.
  - **Must-visit:** a flag that puts a place in every itinerary, whatever its interest.
  - **Itinerary:** one complete multi-day schedule. **Option:** one itinerary among the alternatives shown (`ItineraryOption`). "Plan" is used only for the Plan view and the `plan()` function.
  - **Missing / invalid / unparsed / suspect:** missing = no value; invalid = a value that can't be used; unparsed = hours text the library could not read; suspect = coordinates far from the city. The UI label for any of these is "may be inaccurate". "Text-only" is not used.
  - **Stage:** a build stage in the Detailed Implementation Plan.
- Change every use of "rate", "rated" and "rating" that means the traveler's choice. For example, "rate each place" becomes "set their interest in each place", and "stored rating" becomes "stored interest". Affected: Overview, G4, OQ3, CUJ 2, CUJ 3, Preferences, Alternatives 17 and 18, the `PlanView` row and the stage table. The dataset's `rating` is unchanged.

---

## Issue 14 (M22): Rewrite the rejection rationales as trade-offs

**Fix:**
- Remove the "Rejected by author:" prefix from all 29 rationales. Remove "Rejected by author for now:" from Alternative 10.
- Rewrite the rationales that only restate the decision:
  - **Alt 1:** "The app is meant to show how a live API is handled. That costs a failure path (the snapshot fallback, R1). A file cleaned at build time would avoid that path, but would hide source changes until the next deploy."
  - **Alt 7:** "opening_hours.js reads 54 of the 57 strings (37 with warnings), with no rules to write. A regex parser would need a rule for each of about 12 patterns and would still miss new ones. The cost is an LGPL dependency kept on the server (R11) and a `Date`-based API (see Time handling)."
  - **Alt 11:** "A merge map would tidy the filter list, but it needs upkeep for every new tag and can join tags that mean different things. Merging places would break saved choices, which are keyed by id. Spelling-only cleanup catches the one real near-duplicate tag (`local_favorite` / `local-favorite`) with no upkeep."
  - **Alt 14:** "Server storage would let choices follow the traveler across devices, but it needs accounts or session ids and a database. With one traveler and a 4-hour time box, the accepted cost is that clearing browser storage loses the choices."
  - **Alt 15:** "A ranked list gives an exact order, but the planner only uses a few levels of weight plus one hard rule. Drag-and-drop is also costly to make keyboard-accessible. Three interest levels and a must-visit flag give the planner what it uses for less work."
  - **Alt 23:** "Clusters give options that each focus on one area, but they need a tuned distance cutoff and they chain nearby towns together. Multi-start greedy gets different options from the same planner with one setting (`maxSeeds`). The cost is that its options may differ less by area."

---

## Issue 15 (M23): Pin versions and dependencies

Checked with `npm view` on 2026-11-06.

**Fix:**
- Setup: record "Next.js 15.5.x (create-next-app@15 installs the latest 15.5 release, 15.5.29 today) with React 19".
- Runtime dependencies, installed with `--save-exact`:
  - `opening_hours@3.15.0`
  - `leaflet@1.9.4`
  - `react-leaflet@5.0.0` (peer dependencies: React 19, Leaflet ^1.9)
  - `lucide-react@1.70.0`
  - `server-only@0.0.1`
- Dev dependencies: `@types/leaflet@1.9.22`, `vitest@5.1.0`.
- `vitest.config.ts` row: `test.environment: 'node'`. `resolve.alias` maps `@` to `./src`, and `server-only` to `./tests/empty.ts`, because the real package throws outside a React Server Components build. It also sets `process.env.TZ` (Issue 10).
- Add a row: `./tests/empty.ts` | create | `export {}`. The stand-in for `server-only` in tests.

---

## Issue 16 (M24): Specify the map component

**Problem:** react-leaflet's `MapContainer` reads `center`, `zoom` and `bounds` only on first render. `fitBounds([])` throws, and fitting a single point zooms all the way in.

**Fix:** `PlaceMapInner` row:
- `MapContainer` starts at `center={[42.5, 12.5]}` and `zoom={6}` (Italy).
- A `FitBounds` child uses `useMap()` and runs when the list of shown places changes:
  - 0 points → `map.fitBounds(ITALY_BOUNDS)`
  - 1 point → `map.setView(point, 13)`
  - otherwise → `map.fitBounds(points, { padding: [24, 24] })`
- Tiles: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. Attribution: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`.

---

## Not in this batch

The Nits (N1–N9) are not in this batch. Several will be fixed along the way, such as N5's `makeRawPlace` and the `not_enough_total_time` scenario. The rest can be batch 4.
