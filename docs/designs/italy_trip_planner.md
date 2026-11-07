# Italy Trip Planner

*   **Author:** Micheal Friesen
*   **Status:** Draft
*   **Date:** 2026-11-06

--------------------------------------------------------------------------------

## Overview

The Italy Trip Planner is a Next.js web app that helps one traveler turn a list of 103 places in Italy into a day-by-day itinerary. Travel defaults to 3 days. The places come from a provided file, `italy.json`, which the app treats as if it were the response of an outside API. The data is known to contain errors, so the app cleans it before anything is shown.

The app has two phases:

1.  **Discover.** The traveler sees every place on a map and in a list. They narrow the places with filters and a search box, and set their interest in each place: "Not interested", "Maybe" or "Very interested". They can also mark places as "must visit", which overrides their interest.
2.  **Plan.** The traveler picks a start date and their daily start and end times. The app first checks that every must-visit place can fit in the trip. If they cannot all fit, it explains why. Otherwise it builds up to 3 alternative itineraries. Each includes every must-visit and fills the remaining time with the places the traveler is most interested in, accounting for visit length, opening hours and travel time.

The project is an interview take-home with a 4-hour time box. It is meant to show product thinking and clean, componentized software. A finished smaller app is worth more than an unfinished larger one, so features are built in a fixed order and cut from the end.

## Terms

*   **Interest:** the traveler's choice for a place: Not interested, Maybe, Very interested, or Unrated (no choice).
*   **Rating:** the dataset's star rating, 0–5. It never means the traveler's choice.
*   **Must-visit:** a flag that puts a place in every itinerary, whatever its interest.
*   **Itinerary:** one complete multi-day schedule. **Option:** one itinerary among the alternatives shown (`ItineraryOption`). "Plan" is used only for the Plan view and the `plan()` function.
*   **Missing, invalid, unparsed:** missing means no value; invalid means a value that can't be used; unparsed means hours text the library could not read. The UI label for any of these is "may be inaccurate".
*   **Stage:** a build stage in the Detailed Implementation Plan.

## The Problem

Planning a short trip from a long list of possible places is slow, and it is easy to get wrong. From the author's own experience planning a trip to Japan, the work falls into four steps:

1.  **Collecting:** gathering places of interest from several sources and noting how excited you are about each one.
2.  **Refining:** cutting the list down to what fits, while protecting the few places you will not skip.
3.  **Mapping:** working out an order that makes sense given distances and opening hours, often comparing several versions by hand.
4.  **Managing:** following the plan on the trip itself.

Steps 1 to 3 are where this app helps. Today a traveler does them with spreadsheets, notes and a separate map. It is easy to plan a visit to a place on the day it is closed, or to underestimate travel time between cities. For example, Rome to Venice is several hours each way.

The provided data makes the problem harder:

*   The `hours` field comes in about 12 different formats, and many records have no hours at all.
*   Some fields are null.
*   One place has coordinates about 160 km from its stated city.
*   Some tags are near-duplicates of each other.
*   Some places appear twice under different names.

A planner that trusts this data without checking it will produce itineraries that look confident but are wrong. The app therefore has to clean the data, show the traveler which values are uncertain, and still produce a useful plan.

## Goals

*   **G1. Every place is visible and can be explored.**
    *   Every record in `italy.json` appears in the list, even when fields are missing. Missing or doubtful values are flagged, not hidden.
    *   Every record with coordinates inside the planning area (`isInCountry`, a rectangle around Italy for now) also appears on the map.
    *   Each place has a category icon that comes with a text label.
    *   The list can be used fully by keyboard.
    *   *Measure:* all 103 records are shown in the list, and no record makes the page crash.
*   **G2. Unreliable data is cleaned, and the traveler can see what was cleaned.**
    *   Values that parse are stored in a strongly typed form.
    *   Values that do not parse are kept as text and marked with a warning in the UI.
    *   *Measure:* a test asserts the 17 / 37 / 3 split (parsed / normalized / unparsed) and the exact `unparsed` set for the bundled snapshot. A refreshed snapshot with a new unreadable string fails the test until someone looks at it. The app itself still accepts new strings.
*   **G3. Places can be found by filter and search.**
    *   Filters cover category, tags, price and city. Categories can be grouped for display. "Food" is Restaurant + Cafe.
    *   The search box matches name, tags and description, and ignores case and accents.
    *   When the field a filter tests is missing or could not be parsed, the place is still shown below the confirmed matches, with a "may be inaccurate" label.
        *   *Measure:* `filterPlaces.test` returns exactly `place_009` and `place_022` for CUJ 1.
*   **G4. The traveler can say how much they care about each place.**
    *   Interest has three levels: Not interested (broken-heart icon), Maybe (one heart) and Very interested (two hearts). A place with no rating is "Unrated", which is a separate state. Interest is kept separate from the dataset's own star `rating`.
    *   Must-visit is a separate flag that every itinerary includes. Turning it on replaces the hearts with a must-visit badge, and the planner ignores the stored interest. Turning it off shows the old interest again.
    *   "Not interested" places are hidden by default and can be shown again. Must-visit places are always shown.
    *   Choices are saved in the browser and survive a page reload.
    *   *Measure:* `storage.test` passes, and the CUJ 2 manual check passes.
*   **G5. Every itinerary includes every must-visit, or the traveler is told which must-visits could not be placed.**
    *   Before planning, a check confirms the must-visits fit, using:
        *   travel time
        *   visit length
        *   opening hours on the chosen dates
        *   the daily time window
    *   If they do not fit, the traveler sees which must-visits conflict and the reason.
    *   *Measure:* no itinerary omits a must-visit. If they cannot all be placed, no itinerary is shown and the conflicts are named.
*   **G6. Up to 3 alternative 3-day itineraries are generated from the traveler's choices.**
    *   It includes every must-visit.
    *   It fills the remaining time by greedy insertion, ranking places by interest points per minute of visit and travel. Each alternative starts from a different high-interest place.
    *   It respects the daily start and end times, visit lengths and estimated travel time.
    *   Any place that relies on uncertain data is flagged on its stop.
    *   *Measure:* in tests, no two visits overlap, and every visit with typed hours falls inside those hours.
*   **G7. The design can grow without being rewritten.** All of the following are settings or replaceable parts, not values fixed in the code:
    *   trip length
    *   interest-to-points mapping
    *   default visit length
    *   default day start and end
    *   the travel-time source
    *   the in-country check (`isInCountry`)
    *   *Measure:* changing any listed setting means editing `config.ts` only, or swapping one function (`TravelTimeEstimator`, `isInCountry`).
*   **G8. A reviewer can understand what was built and why.** A README explains:
    *   the data problems found and how each was handled
    *   what was cut and why
    *   what would come next
    *   *Measure:* the README has these three sections.

## Non-Goals

*   **Creating, editing or deleting places,** and data for countries other than Italy. The design should not prevent these later.
*   **More than one traveler:** merging two people's preferences into one plan.
*   **Budget limits** in the planner.
*   **Booking:** integration with booking or ticketing systems.
*   **The "Managing" step:** day-of navigation, notes and reminders.
*   **Calling Google Maps or any other travel-time service.** Travel time is estimated from coordinates. A real service may be added later behind the same interface.
*   **Any LLM use,** online or offline. It may be revisited if time remains.
*   **Parsing `seasonal_notes`** into rules. They are shown as text only.
*   **Changing visit length place by place.** This is planned for later, but each place uses its own `duration_minutes` or a 1-hour default for now.
*   **Choosing a trip end date or a length other than 3 days in the UI.** The length is a setting that can be exposed later.
*   **Editing an itinerary by hand.** The traveler changes their interest levels or must-visits and generates the plan again.
*   **Drag-to-rank lists, map marker clustering, saving filters in the URL, and syncing across browser tabs.**
*   **Any server-side storage of the traveler's choices.**
*   **Place photos.** Planned as future work: see [Place images from Wikipedia](#place-images-from-wikipedia).
*   **Detecting or merging duplicate places.** Known pairs include Mercato Centrale (030/031), Trevi (018/077) and Acetaia Giusti (044/083). The README documents this as a known issue: if a traveler rates both copies, the planner can schedule the same place twice under two names.

## Open Questions

*   **OQ7. Tuning the scoring.** The point values (Maybe 1, Very interested 4), `maxSeeds` (15) and the 70% overlap limit are first guesses. They should be adjusted after seeing real plans.

Resolved during drafting and review (details in the Technical Plan):

*   **OQ1. Making options differ.** Multi-start greedy: each run forces a different seed place in first. Up to 3 distinct options are kept. No clustering.
*   **OQ2. Merging tags.** Spelling only: tags are lowercased and `_` is replaced with `-`. There is no hand-made merge map.
*   **OQ3. Must-visit on a place with low interest.** Must-visit overrides interest completely. The stored interest is kept and comes back when the flag is turned off.
*   **OQ4. Records that look wrong.** No record is rejected. Missing values get flags and display defaults. Coordinates are not checked against the city. Coordinates outside the planning area (a rectangle around Italy), or no coordinates, mean the place has no map pin and can't be planned.
*   **OQ5. Where cleaning runs.** Cleaning runs on the server. The cleaned result is cached for 1 hour, matching the source's `max-age=3600`.

## Critical User Journeys (CUJs)

### CUJ 1: Browse and filter places

*   **Given**: the traveler opens the app for the first time. No preferences are saved.
*   **When**: they open the Discover view, choose the "Food" category, choose the city "Rome", and type "carbonara" in the search box.
*   **Then**:
    *   The map and the list show only Rome restaurants and cafés whose name, tags or description match "carbonara": Osteria Fernanda and Roscioli Salumeria.
    *   The result count shows 2.
    *   No place in the dataset is missing its category, city or price, so the "may be inaccurate" group is empty here. That group is covered by tests with made-up records.
    *   Clearing the filters brings back every place.

### CUJ 2: Set interest and mark must-visits

*   **Given**: the traveler is in Discover with some places shown.
*   **When**: they mark the Colosseum must-visit, set Trastevere to "Very interested", and set the Hard Rock Cafe to "Not interested". Then they reload the page.
*   **Then**:
    *   After the reload, the interest levels and the must-visit flag are still there. The Colosseum shows a must-visit badge instead of hearts.
    *   The Hard Rock Cafe is hidden from the map and list, because "Not interested" places are hidden by default.
    *   Turning "show not interested" on shows it again.
    *   Turning off the Colosseum's must-visit flag shows its previous interest again, or "Unrated" if it had none.

### CUJ 3: Generate an itinerary

*   **Given**: the traveler has set their interest in several places in Rome and Florence and marked two of them must-visit.
*   **When**: they open the Plan view, pick a start date, set their day to 9:00–20:00, and generate an itinerary.
*   **Then**:
    *   Up to 3 alternative 3-day plans are shown, each with both must-visits.
    *   No two visits overlap.
    *   Every visit with typed opening hours falls inside those hours on that date.
    *   Travel between stops is shown as an estimate.
    *   Any stop that relies on unparsed or missing hours or a default visit length carries a warning.
    *   If any stop uses hours that could not be read, a notice above the plan says those times may be wrong.
    *   Places that did not fit are listed with the reason.

### CUJ 4: Must-visits cannot fit

*   **Given**: the traveler has marked Siena Day Trip (360 minutes), Pienza (360 minutes) and Chianti Day Trip by Bike (480 minutes) as must-visit. Their day is set to 9:00–16:00.
*   **When**: they try to generate an itinerary.
*   **Then**:
    *   No itinerary is shown.
    *   An error names the conflicting must-visit and the reason, for example "Chianti Day Trip by Bike takes 8 hours, but your day is only 7 hours long."
    *   The error suggests what to change: unmark a must-visit or widen the daily hours.

### CUJ 5: See where the data was unreliable

*   **Given**: the dataset contains a place with unparsable hours ("Evenings").
*   **When**: the traveler opens that place's card.
*   **Then**:
    *   The card shows the original hours text with a "may be inaccurate" label.
    *   A data-quality view lists every flagged record and the reason it was flagged.

## Technical Plan (Architecture)

### Summary

The app is a Next.js (App Router) project with three layers:

1.  **Data layer (server only).**
    *   Fetches `italy.json` from `https://storage.googleapis.com/interview-booking/italy.json` and caches it.
    *   If the live fetch fails and there is no cached copy, it falls back to a snapshot of `italy.json` bundled with the app, and the page says the live data could not be loaded.
    *   Cleans every record into a typed `Place`. No record is dropped. Every doubtful value carries a flag that explains why.
2.  **Discover UI (browser).**
    *   Receives the cleaned places as props from a server component.
    *   Handles filtering, search, interest levels and must-visit flags in the browser, and saves the traveler's choices in localStorage.
3.  **Planner (server only).**
    *   A Server Action, `generatePlan(input)` in `app/plan/actions.ts`, receives the trip settings and the traveler's choices.
    *   It loads the same cached places and first runs the feasibility check.
    *   It returns a typed result: up to 3 itinerary options, a list of named conflicts, or an error. It never throws for an expected outcome.

The planner is kept on the server for two reasons. First, opening_hours.js (LGPL-3.0, with `i18next` and `suncalc` as dependencies) never ships to the browser. Second, hours are parsed in one place only, and the planner's tests run in plain Node.

```text
                    storage.googleapis.com/interview-booking/italy.json
                                      |
       fetch (data cache 3600 s, throw on non-2xx; on failure: bundled snapshot)
                                      v
  +---------------------------- SERVER --------------------------------+
  |  lib/data/getDataset()  -->  lib/data/normalize()                  |
  |        |  (cached)              raw JSON -> Place[] + DataIssue[]  |
  |        |                                                           |
  |        +--> app/page.tsx (server component) ------------------+   |
  |        |                                                       |   |
  |        +--> app/plan/actions.ts  generatePlan()                |   |
  |               validate PlanRequest                             |   |
  |               lib/planner/feasibility() -- conflicts -->       |   |
  |                                    { status: 'infeasible' }    |   |
  |               lib/planner/buildOption() x (1 + seeds)          |   |
  |               lib/planner/improveRoute()  (2-opt)              |   |
  |               lib/planner/pickOptions()  (top 3 distinct)      |   |
  |               --> { status: 'ok' }                             |   |
  +--------------------------------------------------------|------|---+
                                                           |      | Place[] (props)
  +---------------------------- BROWSER -------------------|------v---+
  |  DiscoverView: FilterBar, SearchBox, PlaceList, PlaceMap,         |
  |                PlaceCard, InterestControl, MustVisitToggle,       |
  |                DataQualityPanel                                   |
  |  PlanView:     TripForm --generatePlan()--> OptionTabs,           |
  |                DayTimeline, StopCard, UnscheduledList,            |
  |                ConflictList                                       |
  |  usePreferences() <--> localStorage "trip-planner:prefs:v1"       |
  +-------------------------------------------------------------------+
```

### Data loading and failures

*   `app/page.tsx` and `app/plan/page.tsx` set `export const revalidate = 0`. They are rendered on each request and never prerendered, so `next build` does not need the network.
*   `getDataset()` calls `fetch(DATA_URL, { next: { revalidate: REVALIDATE_SECONDS } })` (3600, matching the source's `Cache-Control: max-age=3600`). The page's `revalidate = 0` does not override a positive fetch `revalidate`, so the response is held in the Next.js data cache and shared by every request.
*   It **throws** on any non-2xx response (429, 403, 5xx), a network error, or a body that is not JSON or is not an array. Next.js writes a fetch to the data cache only when the status is exactly 200. When an entry is stale, it returns the stale copy and refetches in the background, so a failed refresh after a good load still serves the last good copy (Next.js 15.5 source, `packages/next/src/server/lib/patch-fetch.ts`: the `res.status === 200` write check and the `entry.isStale` branch). Verification 2 confirms this end to end. If it fails in the installed version, the fetch is wrapped in `unstable_cache`, which stores nothing when the function throws.
*   If the fetch throws, `getDataset()` logs the status with `console.error` and loads `src/data/italy.snapshot.json`, a copy of the source bundled with the app. It returns `{ dataset, source: 'live' | 'snapshot' }`.
*   When `source` is `'snapshot'`, both pages show `SnapshotNotice`: "Live place data could not be loaded. Showing a saved copy." The Plan view shows the same notice. `app/error.tsx` stays as a generic fallback for any other error.
*   Fetching from the browser is not possible in any case, because the source sends no `Access-Control-Allow-Origin` header.
*   `normalize()` runs on each request. It is one pass over the records, so there is no memo.
*   These rules follow the Next.js docs "Caching and Revalidating (Previous Model)", which apply to Next.js 15. That page also states that `dynamic = 'force-dynamic'` would set every fetch to `no-store` (see Alternative 28).

### Typed model

The UI only renders this model, never raw JSON. That is the boundary that lets the components work with any dataset that has the same fields (G7).

```ts
type Field<T> =
  | { status: 'ok'; value: T }
  | { status: 'missing' }
  | { status: 'invalid'; raw: string; reason: string };

enum Category { HistoricSite, Restaurant, Experience, Museum, Viewpoint, Cafe,
                Neighborhood, Market, Park, Shop, Unknown }   // the dataset's 10 types + Unknown

interface Coordinates { latitude: number; longitude: number }

interface PlaceLocation {
  coordinates: Field<Coordinates>;
  locationQuality: 'ok' | 'unusable'; // unusable = missing or outside the planning area
  city?: string; region?: string; neighborhood?: string;
}

interface PlaceHours {
  raw?: string;                                   // always kept for display
  status: 'parsed' | 'normalized' | 'unparsed' | 'missing';
  warnings: string[];                             // opening_hours.js warnings, shown as "interpreted as …"
}

type Price = 1 | 2 | 3 | 4;                       // shown as € … €€€€

interface Place {
  id: string;                                     // source id, e.g. "place_001"; preference key
  name: string;                                   // "Unnamed place" + flag if missing
  type: Category;
  location: PlaceLocation;
  hours: PlaceHours;
  durationMinutes: Field<number>;                 // planner uses 60 when not 'ok' and flags the stop
  description?: string;
  rating?: number;                                // dataset star rating, 0–5
  price: Field<Price>;
  bookingRequired: Field<boolean>;
  tags: string[];                                 // lowercased, '_' -> '-', de-duplicated
  seasonalNotes?: string;                         // display only
  flags: PlaceFlag[];
}

type PlaceFlag =
  | 'id_missing' | 'id_duplicate'
  | 'name_missing' | 'type_unknown'
  | 'location_unusable'
  | 'hours_normalized' | 'hours_unparsed' | 'hours_missing'
  | 'duration_default' | 'price_unknown' | 'booking_unknown';

interface Dataset { places: Place[]; issues: DataIssue[]; fetchedAt: string }
interface DataIssue { placeId: string; field: string; flag: PlaceFlag; raw?: string; reason: string }

// The source record. Every field is unknown: nothing about the source is trusted.
interface RawPlace {
  id: unknown; name: unknown; type: unknown; city: unknown; region: unknown;
  neighborhood: unknown; description: unknown; latitude: unknown; longitude: unknown;
  hours: unknown; duration_minutes: unknown; price_range: unknown; rating: unknown;
  tags: unknown; seasonal_notes: unknown; booking_required: unknown;
}
```

`normalize` builds `issues` from each place's flags, one `DataIssue` per flag, so the two can't disagree.

Cleaning rules. A string that is empty after trimming counts as missing, for every field.

*   **id.** The source's string `id` is used as is. If a record has no `id`, it gets `row_<index>` and `id_missing`. A duplicate id gets a `#2` suffix and `id_duplicate`.
*   **Name.** `name` → `name`. Missing → "Unnamed place" with `name_missing`.
*   **Text fields.** `city`, `region`, `neighborhood`, `description` and `seasonal_notes` → `city`, `region`, `neighborhood`, `description` and `seasonalNotes`. Missing → `undefined`, with no flag. A missing `city` makes the place an uncertain match for the city filter.
*   **Hours.** Each string is checked with `new opening_hours(raw, null, { tag_key: 'opening_hours' })`.
    *   If it parses with no warnings, the status is `parsed`. With warnings, it is `normalized`. If it throws, it is `unparsed`. An empty or null value is `missing`.
    *   Of the 57 distinct strings, 17 parse with no warnings (`parsed`), 37 parse with warnings (`normalized`, for example `Tues`, `Daily` and `8am-7pm`), and 3 throw (`unparsed`): `Evenings`, `Morning only` and `9am-12:30pm`. Checked with opening_hours 3.15.0. Empty and null values are set to `missing` before the library is called, so the library never fills in a default.
    *   The parsed object is **not** stored in `Place`, because it cannot be passed from server to browser. The planner builds it again from `raw`.
    *   Each `unparsed` value is logged on the server once per call to `normalize()`: `console.warn('[hours] unparsed', { placeId, raw })`. Missing hours are logged as one summary line with the count. The log tells the operator which new formats appear in the data. There are no hand-written overrides for these formats. The UI warnings still apply (see Alternatives 4 and 8).
*   **Coordinates.** The source's top-level `latitude` and `longitude` → `location.coordinates`.
    *   Missing or non-numeric coordinates mean `invalid`/`missing`, with the location marked `unusable`.
    *   Coordinates for which `isInCountry(c)` is false mean `unusable`. The values are kept, but no pin is drawn. For now `isInCountry` is a rectangle, lat 35.4–47.1 and lon 6.6–18.6. It also takes in parts of Slovenia, Croatia, Switzerland and the Tunisian coast. That is accepted for this project. It still catches swapped coordinates and (0, 0). A real border check can replace the function later without changing its callers.
    *   Coordinates inside the planning area are used as given. They are not checked against the city label, so a wrong point inside the rectangle (such as `place_059`, listed under Milan but placed near Verona) is not detected. Checking coordinates against the city is future work, done with a geocoding service when Google Maps is added.
*   **Type.** Source types are mapped to `Category`. Anything else becomes `Unknown` with a flag.
*   **Duration.** A whole number from 1 to 1440 is `ok`. Anything else is `invalid` or `missing`.
*   **Price.** `price_range` → `price`. A string of 1 to 4 `€` → `ok` (its length). Missing → `missing` with `price_unknown`. Anything else → `invalid` with `price_unknown`.
*   **Rating.** `rating` → `rating` when it is a number from 0 to 5. Otherwise `undefined`, with no flag. It is display only.
*   **Booking.** `booking_required` → `bookingRequired`. A boolean → `ok`. Null → `missing` with `booking_unknown` (`place_020`). Anything else → `invalid` with `booking_unknown`.
*   **Tags.** If `tags` is not an array, `[]` is used. Entries that are not strings are dropped. Tags are trimmed, lowercased, `_` is replaced with `-`, and duplicates are removed. Only `local_favorite` uses `_` in today's data; 5 tags use `-`.

Hours test cases. `normalizeHours.test.ts` checks these strings, with the intervals on Tuesday 2027-03-23 and Saturday 2027-03-27. Values are minutes after midnight; 1440 is midnight.

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

#### Badges

`type Badge = PlaceFlag | StopWarning`. `FlagBadge` renders any badge from this one table:

| Badge | Label | Hover text |
| --- | --- | --- |
| `id_missing` | No id | The source had no id. Saved choices for this place may be lost if the data changes. |
| `id_duplicate` | Duplicate id | Another record has the same id. This one was renamed. |
| `name_missing` | No name | The source had no name. |
| `type_unknown` | Unknown type | The source type is not one we know. |
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

#### Where types live

*   `src/lib/types.ts`: the place model above, including `RawPlace`.
*   `src/lib/prefs/types.ts`: `Interest`, `PlacePref`, `StoredPrefs`.
*   `src/lib/discover/filterPlaces.ts`: `FilterCriteria`.
*   `src/lib/config.ts`: `PlannerConfig`, `TravelMode`.
*   `src/lib/planner/types.ts`: the Plan action types, plus `Interval`, `PlanContext`, `DaySchedule` and `Badge`.
*   `src/lib/planner/travel.ts`: `TravelTimeEstimator`.

### Discover (browser)

*   `app/page.tsx` is a server component. It calls `getDataset()` and passes `places` and `issues` as props to `<DiscoverView>`, which is a client component.
*   `PlaceMap` uses react-leaflet with OpenStreetMap tiles. It is loaded through `next/dynamic` with `ssr: false`, because Leaflet needs `window`. It draws only places whose location is not `unusable`.
*   **Full-screen map.** A "Full screen" button on the map hides the list, so the map fills the page below the header. "Show list" or Esc returns. In this mode, hovering or keyboard-focusing a pin shows a read-only condensed card (`PlaceSummary`): name, category, area, rating, price, time needed, booking (only when required), must-visit or interest, and the first lines of the description. Pins also become tab stops named after their place, since the list is no longer there to be the keyboard path. Clicking a pin, or pressing Enter or Space on it, opens `MapPlacePanel` in the bottom-left corner: the condensed card with the full description plus the interest and must-visit controls, so places can be rated without leaving the map. The panel stays inside the map pane, below the zoom buttons. When it is too tall, the card part scrolls (by mouse or keyboard) while the close button and rating controls stay in view. Keyboard selection moves focus into the panel. Esc or the close button closes the panel and returns focus to its pin; a second Esc leaves full screen. Filters and sort still apply, and the count of shown places stays visible. `FitBounds` refits only when the set of shown places changes, so rating a place or changing the sort keeps the current view.
*   **Rated pins.** Pins show the traveler's rating in both map modes: not interested is grey (visible only with "Show not interested"), maybe is red, very interested is red with a double border, and must-visit (which outranks interest) is red with a triple border. Rated pins draw above unrated ones. The selected pin is larger and orange, and keeps its rating's rings. Because colour and rings don't reach screen readers, full-screen pin labels add the rating, e.g. "Colosseum, must visit".
*   **Update results when map moves.** A checkbox on the map (off by default, not saved) limits the list and the count to places inside the map's current view; the count then reads "… places in map view". The list updates after every pan, zoom or resize, using `placesInBounds` (`src/lib/discover/mapBounds.ts`), which drops places with no usable location. The pins are not filtered: hiding pins as the map moves would change the pin set and make `FitBounds` refit the map. Changing filters still refits the map, which then updates the list. When nothing is in view, the list says "No places in this part of the map. Move or zoom out the map."
*   `filterPlaces(places, criteria, prefs)` is a pure function that returns `{ matches, uncertainMatches }`. Its criteria are:

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

    *   An empty array means no filter on that field. Values within one field combine with OR. Fields combine with AND.
    *   A place lands in `uncertainMatches` when the field a filter tests is `missing` or `invalid`. The other filters must still pass. Only `price` and `city` can be missing, so only those two filters produce uncertain matches. `Unknown` is its own category group and matches only when it is selected.
    *   `uncertainMatches` are listed after `matches` with a "may be inaccurate" label.
    *   The category filter works on display groups from `CATEGORY_GROUPS` in config: `Food = [Restaurant, Cafe]`. Every other category is its own group.
*   **Search.** The text is matched against name, tags and description, after lowercasing and removing accents (`normalize('NFD')`, then removing combining marks). Results follow the chosen sort order; there is no name-match boost.
*   **Sort.** `sortPlaces(places, key, prefs)` (`src/lib/discover/sortPlaces.ts`) orders `matches` and `uncertainMatches` separately. Keys: name (default), rating high to low, price low to high, price high to low, my interest (must-visit, very, maybe, unrated, not interested) and time needed short to long. Places missing the sorted value go last; ties fall back to name, then `id`. The choice is not saved and "Clear filters" does not reset it.
*   **Hidden places.** "Not interested" places are hidden unless "show not interested" is on. Must-visit places are always shown.
*   **Components take typed props only.** `PlaceCard` renders each optional field through a single `<FieldValue field={…} />` helper. It shows the value, nothing, or the raw text with a warning. That way a new optional field doesn't need its own card code.
*   **`DataQualityPanel`** lists `issues`, grouped by flag. It shows every flagged record and the reason it was flagged (CUJ 5).

### Preferences (browser)

```ts
type Interest = 'not_interested' | 'maybe' | 'very';
interface PlacePref { interest?: Interest; mustVisit: boolean }
interface StoredPrefs {
  version: 1;
  places: Record<string, PlacePref>;              // keyed by Place.id
  trip: { startDate?: string; dayStart: string; dayEnd: string }; // 'YYYY-MM-DD', 'HH:mm'
}
```

*   **`usePreferences()`** reads `localStorage["trip-planner:prefs:v1"]` after the component mounts, so the server-rendered HTML and the browser's first render match. Every change is written back to storage.
    *   A missing key or broken JSON starts with empty preferences.
    *   A different `version` is ignored. There is no migration in scope.
*   **Ids that no longer exist** in the dataset are kept in storage but ignored. That way a temporary data problem never deletes the traveler's choices.
*   **Must-visit.** Turning it on leaves `interest` as it is. The UI shows a badge instead of hearts, and the planner ignores `interest` for that place.
*   **Unusable locations.** Places marked `unusable` can't be marked must-visit. The toggle is disabled with a "location unknown" explanation.

### Plan action

```ts
// 'use server' — app/plan/actions.ts
declare function generatePlan(input: unknown): Promise<PlanResult>;

interface PlanRequest {
  startDate: string;                                 // 'YYYY-MM-DD'
  days: number;                                      // default 3, 1–14
  dayStart: string; dayEnd: string;                  // 'HH:mm'
  prefs: Record<string, PlacePref>;                  // keyed by Place.id
}

type PlanResult =
  | { status: 'ok'; options: ItineraryOption[]; source: 'live' | 'snapshot' }
  | { status: 'infeasible'; conflicts: Conflict[] }
  | { status: 'bad_request'; message: string };      // invalid dates/times, dayEnd <= dayStart

interface ItineraryOption {
  label: string;                                     // "Best overall" or "Built around <seed place name>"
  days: DayPlan[]; points: number; unscheduled: Unscheduled[];
}
interface DayPlan { date: string; stops: Stop[] }     // 'YYYY-MM-DD'
interface Stop {
  placeId: string; start: string; end: string;       // 'HH:mm'
  travelMinutesBefore: number;                       // for a day's first stop: travel from the previous day's last stop; 0 on day 1
  mustVisit: boolean; warnings: StopWarning[];
}
type StopWarning =
  | 'hours_unparsed_assumed_open' | 'hours_missing_assumed_open'
  | 'hours_normalized' | 'duration_default' | 'seasonal_note';
interface Unscheduled { placeId: string; reason: 'no_time' | 'closed_on_trip_days' | 'location_unusable' }
interface Conflict {
  placeIds: string[];
  reason: 'longer_than_day' | 'closed_on_trip_days' | 'not_enough_total_time'
        | 'cannot_schedule_together' | 'location_unusable';
  message: string;                                   // plain sentence, e.g. CUJ 4
}
```

`generatePlan` runs `validateRequest(input)` first, because an action is a public POST endpoint like any other. Request validation is written by hand, with no schema library. `plan()` drops place ids that are not in the dataset. Every expected outcome is returned, not thrown, because Next.js hides the message of a thrown action error in production. `generatePlan` uses `getDataset()`, including the snapshot fallback, so there is no "data unavailable" result.

### Time handling

*   Every time in the planner is stored as **minutes after midnight in the local time written in the hours text**, on a given date.
*   opening_hours.js reads `Date` objects using the server's local-time methods. The planner therefore builds each `Date` with `new Date(y, m, d, h, min)` and reads results with the same local methods. Because the date goes in and comes out using the same rules, the server's own time zone cancels out, and the times read as the times written in the data.
*   Vercel runs functions in UTC, which has no clock changes, so this approach has no error in production. On a host whose time zone changes clocks, times on the two clock-change nights can be off by up to one hour. Tests run with `TZ=Europe/Rome` (set in `vitest.config.ts`), so they give the same result on every machine.

### Travel time

The planner calls a `TravelTimeEstimator` interface, `estimate(from: Coordinates, to: Coordinates) → minutes`. That way Google Maps can replace it later without changing the planner (G7). The first version works from straight-line (haversine) distance. It uses the fastest of three modes at every distance, with all numbers in config (`travelModes`):

| Mode | Fixed overhead | Detour factor | Speed |
| --- | --- | --- | --- |
| walk | 0 min | 1.3 | 5 km/h |
| local (transit or car) | 10 min | 1.3 | 30 km/h |
| long distance (train or car) | 30 min | 1.0 | 120 km/h |

`estimate(a, b) = Math.ceil(min over modes of overhead + km × detour / speed × 60)`, where `km` is the haversine distance. The detour factor allows for streets not being straight lines. Every mode's time grows with distance, so the fastest of them also grows with distance. That keeps the minimum spanning tree in feasibility stage 4 a true lower bound.

Expected minutes: 0 km → 0; 0.5 → 8; 2 → 16; 2.01 → 16; 10 → 35; 50 → 55; 50.01 → 56.

Trade-off: from about 10 km up, the long-distance mode wins. That may underestimate trips between towns with no train line.

`DayTimeline` labels every travel time as an estimate.

### Planner

All planner functions are pure and run on the server. Their inputs are `Place[]`, `PlanRequest` and `PlannerConfig`.

*   **Config** (`PlannerConfig`, one file):
    *   points: `{ maybe: 1, very: 4 }` (unrated and not-interested places are never used to fill time)
    *   default visit length: 60 minutes
    *   default day: 09:00–21:00
    *   trip length: 3 days
    *   maximum seeds: 15
    *   maximum options: 3
    *   overlap limit between kept options: 70%, measured as `|A∩B| / min(|A|,|B|)` over fill place ids
    *   travel modes (table above)

    ```ts
    interface TravelMode { name: string; overheadMin: number; detour: number; kmh: number }
    interface PlannerConfig {
      points: { maybe: number; very: number };
      defaultVisitMinutes: number; defaultDayStart: string; defaultDayEnd: string;
      tripDays: number; maxSeeds: number; maxOptions: number; optionOverlapLimit: number;
      travelModes: TravelMode[];
    }
    ```

*   **Planning context.** Every scheduling function takes one `ctx`:

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

*   **Scheduling rules.**
    1.  A day's first stop starts no earlier than `windowStart + travelMinutesBefore` (see "Travel between days").
    2.  A stop's arrival is the previous stop's end plus travel. If the place is not open yet, the stop waits: start = the later of arrival and the interval's start.
    3.  A visit must fit inside one opening interval (`start + visit ≤ interval.end`) and must end by `windowEnd`.
    4.  Travel minutes are rounded up with `Math.ceil`.
    5.  Intervals for day *d* come from `getOpenIntervals(d 00:00, d+1 00:00)` and are then clipped to the window. `place_020` (`8:00-01:00`) gives `[0,60]` and `[480,1440]` on a weekday; the first piece is the previous night's hours. The window ends by 24:00, so no stop runs past midnight.
    6.  The library marks some intervals "unknown" (index 2 of each `[from, to, unknown, comment]` entry). These count as open, and the stop gets `hours_normalized`. No string in today's data sets this flag.
    7.  A place with `unparsed` or `missing` hours has one interval: the whole window. Its stop gets the matching `…assumed_open` warning.
    8.  Seasonal notes are not used for scheduling. A stop whose place has `seasonalNotes` gets `seasonal_note`, and `StopCard` shows the note text.

*   **Tie-breaks.** Every choice is deterministic:
    *   must-visits are inserted longest visit first, then by lower `id`
    *   `bestInsertion` ties go to the earlier day, then the earlier position
    *   fill score ties go to the higher dataset `rating`, then the lower `id`
    *   seeds: points, then dataset `rating`, then `id`
    *   picked options: total fill points, then the unseeded run first, then the lower seed `id`

*   **Travel between days.** The trip is one continuous route. The first stop of day 1 has `travelMinutesBefore = 0`, because the traveler's start point is unknown. Every later day's first stop has `travelMinutesBefore` = the estimated travel from the previous non-empty day's last stop, using the same `TravelTimeEstimator`. This leg is counted at the start of that day: the first stop starts no earlier than `dayStart + travelMinutesBefore`. Insertion cost and the 2-opt pass include it. Inserting a place at the end of day d or the start of day d+1 changes the leg between days.

1.  **Candidates.**
    *   Must-visits are every place with `mustVisit` set.
    *   Fill places are those with interest `maybe` or `very`, not must-visit, and with a usable location.
    *   A location inside the planning area is used as given, with its raw latitude and longitude. An `unusable` location (missing coordinates, or `isInCountry` is false) is never planned. As a fill place, it goes to `unscheduled` with `location_unusable`. As a must-visit, it is a `location_unusable` conflict.
    *   Each place's visit length is its `durationMinutes` when that is `ok`, otherwise 60 minutes.
2.  **Feasibility check (must-visits only).** It returns at the first failing stage with every conflict found at that stage. The stages are:
    1.  The location is `unusable`, giving the conflict `location_unusable`.
    2.  The visit is longer than the daily window, giving `longer_than_day`.
    3.  The hours are parsed or normalized, and the place has no opening interval of at least the visit length, inside the daily window, on any trip day. That gives `closed_on_trip_days`. Unparsed or missing hours count as open, and the stop gets a warning. Must-visits are not moved to the second pass (step 4), because they are guaranteed.
    4.  The total visit time plus a lower bound on travel is more than the total trip time, giving `not_enough_total_time`.
        *   The lower bound on travel is the weight of a minimum spanning tree over the must-visits, with edges weighted by estimated travel minutes. Any continuous route that visits them all costs at least this much.
    5.  Must-visits are placed one at a time onto days by **greedy insertion**. Each place goes to the day and position where it adds the least travel and still fits its hours.
        *   Any must-visit that cannot be placed gives `cannot_schedule_together`, listing it and the must-visits already on the days it could have used.
        *   Greedy insertion can fail even when a valid plan exists. The message therefore says "could not find a plan", not "impossible", and suggests what to change.
3.  **Seeds.** Rank the fill candidates by points (high first), then by dataset `rating`, then by `id`. The first `maxSeeds` are the seeds. There is also one run with no seed, labelled "Best overall". Seeds are drawn only from fill candidates with `parsed` or `normalized` hours, so an option is never built around a place whose hours are unknown.
4.  **Build one option per run.** Each run starts from the must-visit schedule from step 2.5.
    *   If the run has a seed, place it first at its best position, before greedy filling. If the seed does not fit, skip the run.
    *   It then adds fill places with **greedy insertion**. Each round, it takes the place, day and position with the highest score:
        *   score = `points / (visit minutes + extra travel minutes)`, where extra travel includes any change to legs between days
        *   Ties go to the higher dataset `rating`, then the lower `id`.
    *   A place is skipped if it would break the daily window, its opening hours, or the times of stops already placed.
    *   Rounds stop when nothing more fits.
    *   **Unknown hours go last.** Greedy filling runs in two passes. The first pass uses only fill candidates with `parsed` or `normalized` hours. The second pass then offers the remaining candidates, whose hours are `unparsed` or `missing`, to the time that is left. In that pass they count as open, and the stop gets `hours_unparsed_assumed_open` or `hours_missing_assumed_open`.
5.  **Improve routes.** Each day gets a 2-opt pass. It reverses a part of the route if that shortens total travel and every stop still fits its hours and the window. The previous day's last stop and the next day's first stop are fixed endpoints, so the legs between days are counted. With 12 stops or fewer there are fewer than 100 swaps per pass. This is stage 8, the last stage; if it is not built, routes keep the greedy order.
6.  **Pick options.** Sort runs by total fill points (high first), then the unseeded run first, then the lower seed `id`. Keep a run only if its fill-place overlap with every kept run is at most `optionOverlapLimit`. Stop at `maxOptions`. If there are no fill candidates, return one "Must-visits only" option. If only one option remains, the UI says the choices allow only one distinct plan.
7.  **Unscheduled list.** Every candidate that was not placed is returned with a reason:
    *   `location_unusable` from step 1
    *   `closed_on_trip_days` if no open slot exists on any trip day
    *   `no_time` otherwise

Greedy insertion does not guarantee the best plan. That is accepted, because the time box is 4 hours and there are at most about 36 stops in a 3-day trip. The quality check is G6's measure: no overlaps, and typed hours always respected. With 103 places and 16 runs, each run is a full greedy fill, which is still well within a single request.

### Plan UI (browser)

*   `TripForm` collects:
    *   the start date, using the native `<input type="date">`
    *   the day start and end times, defaulting to 09:00–21:00
*   On submit, it calls `generatePlan` with the trip settings and the current preferences.
*   `ConflictList` shows an `infeasible` result as plain sentences, each with a suggested fix.
*   An `ok` result is shown as `OptionTabs` (one tab per option).
    *   Each tab contains a `DayTimeline` per day, which lists its `StopCard`s with travel legs between them, followed by `UnscheduledList`.
    *   Each stop's warnings are shown as small labels with an explanation on hover or focus.
    *   If an option has any stop with an `…assumed_open` warning, it shows a notice above the days: "N stops use opening hours we could not read. These times may be wrong. Check them before you go." The `StopCard` for each of those stops shows the raw hours text next to its warning.
*   The plan is not stored. Reloading the page and submitting again gives the same plan, because the planner is deterministic.

### Testing approach

*   Vitest unit tests cover the pure functions:
    *   `normalize`, including every distinct `hours` string in the dataset (G2's measure)
    *   `filterPlaces` and search
    *   the travel estimator
    *   each feasibility stage, including CUJ 4
    *   multi-start option picking
    *   option building, checking G6's measure: no overlaps and hours respected
*   The full file list and the verification plan are in Detailed Implementation.

## Risks and Mitigations

| # | Risk | Category | Impact | Mitigation | Remaining risk |
| --- | --- | --- | --- | --- | --- |
| R1 | The data source returns 429/403/5xx or is unreachable. | Failure | No places, or a broken demo. | `getDataset()` throws on non-2xx, so the data cache keeps the last good copy. With no good copy, the bundled snapshot is used and a notice says live data could not be loaded. | The snapshot may be out of date. |
| R2 | The bundled snapshot drifts from the live source. | Correctness | A traveler on the fallback sees old data. | The notice says it is a saved copy. Refresh the snapshot by hand when the source changes. | Accepted. |
| R3 | Greedy insertion reports must-visits as not fitting when a valid plan exists. | Correctness | The traveler is told to drop a must-visit they could have kept. | The message says "could not find a plan", not "impossible", and suggests what to change. Multi-start runs reduce false failures for fill places. | False conflicts are still possible for must-visits. |
| R4 | Unparsed or missing hours are treated as open. | Correctness | A stop may be planned while the place is closed. | They are filled only after every place with known hours has been tried. They are never seeds. Each such stop carries an "assumed open" warning with the raw text. The option shows a notice that times may be wrong. The server logs each unparsed string with its place id. | A stop may still be placed when the place is closed. The traveler must read the warning. |
| R5 | Wrong coordinates inside the planning area are not detected (`place_059` is listed under Milan but placed about 155 km away, near Verona). | Correctness | One wrong long leg, with no warning. | Coordinates outside the planning area (`isInCountry` false) are never planned. Checking coordinates against the city is listed as future work with Google Maps. | Each leg to a wrongly placed stop is wrong, and nothing on the card says so. |
| R6 | A duplicate place is scheduled twice under two names. | Correctness | A wasted slot. | Known issue, noted in the README (see Non-Goals). | Accepted. |
| R7 | The clock-change error. Local `Date` arithmetic is off by up to one hour on the 2 clock-change nights. | Correctness | A stop near a clock change may be shifted by an hour. | Tests run with `TZ=Europe/Rome`, and a test covers the 2027-03-28 change. | Only on hosts whose time zone has clock changes. Vercel uses UTC. |
| R8 | The `generatePlan` Server Action is a public POST endpoint with no authentication. | Security / cost | A large `prefs` object or repeated calls use CPU. | `experimental.serverActions.bodySizeLimit: '32kb'` in `next.config.ts`. `validateRequest` checks the input. `plan()` ignores ids not in the dataset. The planner's work is bounded by dataset size × `maxSeeds`. | No rate limit, which is acceptable for a demo. |
| R9 | Dataset text is shown in the UI (HTML or script injection). | Security | XSS. | All text is rendered through React, which escapes it. Map popups are JSX, never `bindPopup(string)`. Nothing uses `dangerouslySetInnerHTML`. | None known. |
| R10 | OpenStreetMap tile usage policy. | Licence / ops | Tiles blocked for heavy use. | Show the required attribution. Demo traffic only. | Production use needs a tile provider. |
| R11 | opening_hours.js is LGPL-3.0. | Licence | Obligations if the library is modified or bundled. | It runs only on the server, unmodified, as a separate package (`serverExternalPackages`). | None for this use. |
| R12 | The planner's run time as the dataset grows. | Scalability | Greedy insertion is roughly O(stops × candidates × positions) per run, multiplied by the number of seeds. | Fine for 103 places. Beyond about 1,000 places, cap candidates by points and lower `maxSeeds`. | Not tested at scale. |

## Future Work

### Place images from Wikipedia

Show a photo on each place card, taken from Wikipedia / Wikimedia Commons. It needs no API key and has no cost. When no good match is found, the card keeps the category icon. A missing photo is better than a wrong one.

**Coverage, from a spot check of 7 places (2026-11-07).**
*   A search by name found the right image for Colosseum, Borghese Gallery (via "Galleria Borghese"), Osteria Francescana and Caffè Florian.
*   Aventine Keyhole matched its parent page, Villa del Priorato di Malta.
*   "Gelato at Giolitti" matched "List of ice cream brands", which is wrong. "Aperitivo at Rasputin" matched nothing.
*   Expect good coverage for landmarks and famous venues, and little for small bars and "experience" places.

**Matching.** A geosearch on its own is not enough. Around the Colosseum, the right page is 11 m away. Around Giolitti, which has no page, five unrelated pages lie within 100 m (a fountain, a church, a square). So matches combine these signals:

| Signal | API | Use |
| --- | --- | --- |
| Distance from the place to the page's coordinates | `generator=geosearch` (`ggsradius=300`) or `prop=coordinates` | Reject over about 300 m. Never enough on its own to accept. |
| Name similarity between the place name and the page title, its redirects, and its Italian title | `prop=redirects`, `prop=langlinks` | The main signal for accepting a match. Compare with `foldText`, after removing filler words ("at", "the") and a trailing ", <city>". |
| Wikidata "instance of" (P31) compared with `Category` | `ppprop=wikibase_item`, then Wikidata | Confirms a match. Rejects a mismatch, such as a restaurant matched to a church or metro station. |
| Disambiguation or list page | `ppprop=disambiguation`, title starting "List of" | Always reject. |
| Image type | `pageimages` file name, `imageinfo` | Reject `.svg` files (usually locator maps or logos). Prefer Wikidata P18 (the curated main image) over the `pageimages` guess. |

**Rule.**
1. Collect candidates from a 300 m geosearch, plus a name search on en and it Wikipedia.
2. Drop disambiguation pages, list pages, candidates more than 300 m away, and `.svg` images.
3. Accept the best candidate only if its title, a redirect or its Italian title closely matches the name. A matching Wikidata type adds confidence.
4. Otherwise, show no image.

**Where it runs.**
*   Images are looked up on the server when the dataset loads, and cached with the same `revalidate` as the data. Visitors never trigger 103 lookups.
*   The result is stored on `Place` as an optional image field: `{ url, pageTitle, author, licence }`.
*   Lookups send a descriptive `User-Agent`, as Wikimedia's API policy asks.
*   A lookup failure never blocks the page.

**Licence.** Commons images are under CC BY-SA and similar licences. Each card shows the author and licence, with a link to the file page.

**Debug.** With `?debug`, each card shows the matched page, the distance and which signals passed, so matches can be checked by eye.

**Tests.** Recorded API responses as fixtures cover:
*   accepting Colosseum and Galleria Borghese
*   rejecting Giolitti (no page nearby) and the "List of ice cream brands" page
*   rejecting a near but unrelated page

**Estimate.** About 30–45 minutes.

**Other sources considered.**
*   Google Places Photos: best coverage, but it needs a key and billing, and its terms limit storing photos.
*   Unsplash or Pexels: generic photos, not the actual venue. They need a key and are rate limited.
*   Foursquare: needs a key, with a limited free tier.

## Alternatives Considered

### Data and cleaning

#### Alternative 1: Cleaning once at build time and committing the output

*   **Pros:**
    *   No fetch at runtime, so no 429 or 403 handling.
    *   The cleaned data can be reviewed in a diff.
*   **Cons:**
    *   Changes at the source are not seen until the next build.
    *   It doesn't show how the app would handle a live API.
*   **Reason for Rejection:** The app is meant to show how a live API is handled. That costs a failure path (the snapshot fallback, R1). A file cleaned at build time would avoid that path, but would hide source changes until the next deploy.

#### Alternative 2: Fetching and cleaning in the browser

*   **Pros:**
    *   No server code for the data.
    *   The browser can cache the cleaned result.
*   **Cons:**
    *   It can't work as is. The source sends no `Access-Control-Allow-Origin` header, so the browser blocks the request.
    *   Fixing that needs a proxy route, which brings the server back, and every visitor would then download and clean the raw file again.
*   **Reason for Rejection:** The browser can't make the request, and a proxy plus cleaning in the browser costs more than cleaning on the server, with no gain.

#### Alternative 3: Rejecting records that are missing a required field

*   **Pros:**
    *   Every component can assume that name, coordinates and type exist.
*   **Cons:**
    *   Places disappear without the traveler knowing.
    *   A single typo in the source hides a place the traveler may care about.
*   **Reason for Rejection:** Every place that can be shown must be shown. Missing values get flags and display defaults instead (G1, G2).

#### Alternative 4: Logging problems and filling in silent defaults

*   **Pros:**
    *   The least UI work.
*   **Cons:**
    *   A log can't be seen by the traveler or a reviewer.
    *   A default such as coordinates (0, 0) puts a pin in the Atlantic, and travel estimates to it come out at about 5,000 km.
*   **Reason for Rejection:** It contradicts G2 and CUJ 5. Problems are carried on the `Place` as flags and shown in the UI.

#### Alternative 5: Numeric ids taken from the order records are read in

*   **Pros:**
    *   Ids are always unique, even when the source has none.
*   **Cons:**
    *   Interest levels are saved in localStorage under the id. If a record is added or reordered at the remote source, every saved choice after it points at a different place, with no warning.
*   **Reason for Rejection:** The source's stable string ids (`place_001` and so on) are used. A record with no id gets a fallback id and a flag.

#### Alternative 6: Treating unparseable hours as open 24/7

*   **Pros:**
    *   Every place has a typed schedule, so the planner needs no "unknown" case.
*   **Cons:**
    *   "Evenings" would become "always open", and the planner could send someone at 9:00 with no warning.
*   **Reason for Rejection:** The raw text is kept, and the place is flagged. The planner treats it as open but puts a warning on the stop.

#### Alternative 7: Our own regex parser for hours

*   **Pros:**
    *   No dependency, and no LGPL licence.
    *   The output type is fully under our control and has no time-zone problem.
*   **Cons:**
    *   Rules have to be written and tested for about 12 patterns, which uses up the time box.
    *   It only handles formats someone thought to write a rule for.
*   **Reason for Rejection:** opening_hours.js reads 54 of the 57 strings (37 with warnings), with no rules to write. A regex parser would need a rule for each of about 12 patterns and would still miss new ones. The cost is an LGPL dependency kept on the server (R11) and a `Date`-based API (see Time handling).

#### Alternative 8: Rewriting hours into OpenStreetMap syntax, or mapping known phrases, before calling opening_hours.js

*   **Pros:**
    *   Fewer library warnings, because the input already uses the library's own syntax.
*   **Cons:**
    *   A second parser to write and maintain.
    *   A table of phrases such as `Evenings` → 17:00–23:00 only covers strings seen today. New entries fall through to unparsed anyway.
*   **Reason for Rejection:** Hand-written overrides break as the data changes. The library's default mode already reads `Mon`, `Tues`, `Daily` and `8am`, with warnings. What it cannot read is kept as text, flagged, logged and scheduled last.

#### Alternative 9: Not parsing hours at all

*   **Pros:**
    *   Costs no time.
*   **Cons:**
    *   The planner can't respect opening times, and every stop gets a warning.
*   **Reason for Rejection:** It weakens G6 and CUJ 4 too much.

#### Alternative 10: An LLM to clean hours and tags

*   **Pros:**
    *   Handles free-form text such as "Evenings".
*   **Cons:**
    *   Needs an API key.
    *   Results vary between runs.
    *   Adds an outside dependency in the path that loads the data.
*   **Reason for Rejection:** A library parses almost all of the strings. This may be revisited only if time remains.

#### Alternative 11: Merging tags with a hand-made map, and merging duplicate places automatically

*   **Pros:**
    *   Tidier filter lists.
*   **Cons:**
    *   Tags that look alike often mean different things.
    *   Merging places changes ids, which breaks saved choices.
    *   A hand-made map only covers the tags seen today.
*   **Reason for Rejection:** A merge map would tidy the filter list, but it needs upkeep for every new tag and can join tags that mean different things. Merging places would break saved choices, which are keyed by id. Spelling-only cleanup (lowercase, `_` replaced with `-`) catches the one real near-duplicate tag (`local_favorite` / `local-favorite`) with no upkeep.

### Coordinates

#### Alternative 12: Showing places with bad coordinates in the list only, not on the map, and not planning them

*   **Pros:**
    *   A pin is never in the wrong place.
*   **Cons:**
    *   A place that is only slightly off can't be planned at all.
*   **Reason for Rejection:** Coordinates inside the planning area are kept and can be planned. Only coordinates that are missing or outside the planning area get no pin. Detecting wrong coordinates inside the area is future work.

#### Alternative 13: Moving bad coordinates to the city centre

*   **Pros:**
    *   Every place stays plannable.
*   **Cons:**
    *   Travel estimates can be off by the size of the city.
    *   The city label may be the wrong value instead of the coordinates. `place_059` is listed under Milan but placed near Verona; moving it to Milan would replace a specific location with a general one.
*   **Reason for Rejection:** Raw coordinates are used for planning. A city-centre table would need upkeep for every new city; a geocoding service can replace it later.

### Preferences

#### Alternative 14: Server-side storage of choices

*   **Pros:**
    *   Choices could sync across devices.
*   **Cons:**
    *   Needs accounts or session ids, plus a database.
*   **Reason for Rejection:** Server storage would let choices follow the traveler across devices, but it needs accounts or session ids and a database. With one traveler and a 4-hour time box, the accepted cost is that clearing browser storage loses the choices.

#### Alternative 15: A drag-to-rank favorites list

*   **Pros:**
    *   Gives an exact order of preference.
*   **Cons:**
    *   Hard to build accessibly.
    *   The planner only needs must-visit as a hard rule.
*   **Reason for Rejection:** A ranked list gives an exact order, but the planner only uses a few levels of weight plus one hard rule. Drag-and-drop is also costly to make keyboard-accessible. Three interest levels and a must-visit flag give the planner what it uses for less work.

#### Alternative 16: Must / want / maybe / not-interested tiers with points (10 / 3 / 1 / -1)

*   **Pros:**
    *   Familiar labels.
*   **Cons:**
    *   "Must" suggests a guarantee, but with points that simply add up, four "wants" (12 points) outscore one "must" (10).
*   **Reason for Rejection:** The guarantee became a separate must-visit flag.

#### Alternative 17: A 1–5 heart interest score

*   **Pros:**
    *   Finer ranking for filling free time.
*   **Cons:**
    *   It is unclear what a 1-heart must-visit means.
    *   Five levels are more than a traveler needs to give a useful signal.
*   **Reason for Rejection:** Replaced by three levels (Not interested, Maybe, Very interested). Must-visit overrides interest completely.

#### Alternative 18: Raising a place to the top interest level when it is marked must-visit, or blocking must-visit on places with low interest

*   **Pros:**
    *   The stored state never contradicts itself.
*   **Cons:**
    *   Raising the interest level overwrites what the traveler entered without telling them.
    *   Blocking adds an extra step for the traveler.
*   **Reason for Rejection:** Must-visit hides the interest level and overrides it. The stored interest comes back when the flag is turned off.

### Planning

#### Alternative 19: One city per day instead of planning by travel time

*   **Pros:**
    *   A simple rule that is easy to explain.
*   **Cons:**
    *   It forbids reasonable days, such as Florence in the morning and Siena in the afternoon.
    *   It wastes days on cities that have one place.
*   **Reason for Rejection:** The real limit is travel time, not a rule about cities.

#### Alternative 20: A hand-made travel-time table between all cities

*   **Pros:**
    *   Realistic train times between the main cities.
*   **Cons:**
    *   About 120 pairs, mostly guesses.
    *   Says nothing about travel inside a city.
*   **Reason for Rejection:** Travel time is estimated from coordinates, and Google Maps can be added later behind the same interface.

#### Alternative 21: Running the planner in the browser

*   **Pros:**
    *   Plans instantly, with no server round trip.
    *   Keeps working if the server goes down after the page has loaded.
*   **Cons:**
    *   opening_hours.js (LGPL-3.0, plus `i18next` and `suncalc`) would ship to every visitor.
    *   The planner would have to parse hours in a second place, the browser. Testing it would need a browser-like environment instead of plain Node.
*   **Reason for Rejection:** The planner runs on the server behind a Server Action. That keeps opening_hours.js out of the browser bundle and keeps hours parsing in one place, and the tests run in plain Node.

#### Alternative 22: Computing opening intervals on the server and planning in the browser

*   **Pros:**
    *   The library stays on the server, and the browser code is simple.
*   **Cons:**
    *   More data sent to the browser.
    *   A fixed date horizon, so trips starting after it would have no hours.
*   **Reason for Rejection:** Running the whole planner on the server avoids the horizon limit.

#### Alternative 23: Several itineraries from distance clusters

*   **Pros:**
    *   Each option focuses on a clear area.
*   **Cons:**
    *   Single-link clustering chains places together: Florence → Chianti → Siena forms one group about 50 km long.
    *   The distance cutoff has to be tuned.
    *   Every option shares the same must-visit days, so the options tend to collapse into one.
*   **Reason for Rejection:** Clusters give options that each focus on one area, but they need a tuned distance cutoff and they chain nearby towns together. Multi-start greedy gets different options from the same planner with one setting (`maxSeeds`). The cost is that its options may differ less by area.

#### Alternative 24: Clustering by the `region` or `city` field

*   **Pros:**
    *   Clear labels, and nothing to tune.
*   **Cons:**
    *   Regions are too large (Lombardy covers both Milan and Lake Como).
    *   Single-city options waste a 3-day trip.
    *   Both depend on the labels being right.
*   **Reason for Rejection:** Clustering was dropped; multi-start greedy is used instead (see Alternative 23).

#### Alternative 25: An exact or search-based route optimiser

*   **Pros:**
    *   Better routes.
*   **Cons:**
    *   Ordering stops within a day is a travelling-salesman-type problem, and exact search costs time to build that the box doesn't have.
*   **Reason for Rejection:** Greedy insertion plus a 2-opt pass is used. The result is not guaranteed to be the best possible plan, but G6's measure is still checked.

#### Alternative 26: One itinerary only

*   **Pros:**
    *   The least code.
*   **Cons:**
    *   One greedy run may never go to a far area, even when a group of places there is worth the trip.
*   **Reason for Rejection:** Multi-start reuses the planner and partly fixes this.

#### Alternative 27: A REST endpoint, `POST /api/plan`

*   **Pros:**
    *   A stable URL that curl or another client can call.
    *   HTTP status codes for each outcome.
*   **Cons:**
    *   There is only one caller, the Plan view.
    *   It needs 4 status codes, client-side `fetch` and response parsing, and its own tests.
*   **Reason for Rejection:** A Server Action gives the same server-side planner with less code. The planner is a pure function, so an endpoint can be added later around `plan()`.

#### Alternative 28: Rendering on every request with `force-dynamic`

*   **Pros:**
    *   Simple, and the build needs no network.
*   **Cons:**
    *   It sets every fetch to `no-store`, so every page view calls the source and invites 429s.
*   **Reason for Rejection:** Page `revalidate = 0` with a cached fetch gives per-request pages and a shared data cache.

#### Alternative 29: Prerendered pages (`revalidate = 3600`) with the snapshot fallback

*   **Pros:**
    *   Pages are served from cache.
*   **Cons:**
    *   The build needs the network.
    *   A failed refresh that falls back to the snapshot would replace a good cached page with the snapshot page.
*   **Reason for Rejection:** The fallback must never overwrite good data.

## Detailed Implementation Plan

### Build order and time budget (4 hours)

The stages are built in order, and work stops where time runs out. There is no separate cut order. A stage is done when `npm run build`, `npm run lint` and `npm test` all pass, with that stage's tests written in that stage. Any stage finished after stage 5 adds one line to the README. The smallest version that ships is the end of stage 1: every place in a list and on a map, with flags.

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

What each stage leaves behind when it is the last one done:

*   **After stage 4 or 5:** `plan()` runs with `maxSeeds: 0` and returns one option, "Best overall". `OptionTabs` shows a single tab with no "only one distinct plan" line. The overlap and seed tests in `plan.test.ts` are written in stage 6.
*   **After stage 6:** CUJ 5's data-quality list is missing. The README lists it as cut.
*   **After stage 7:** routes keep the greedy order. `plan.ts` step 5 does nothing.

### Setup

1.  Done: every design and review file is under `docs/`, and the repository root holds only `docs/` and `.git`. create-next-app refuses a folder that contains other files, though it allows `docs/`.
2.  From the repository root, run `npx create-next-app@15 . --ts --eslint --app --src-dir --import-alias "@/*" --no-tailwind --use-npm --disable-git --no-turbopack`. The `.` scaffolds into the current folder instead of creating `trip-planner/trip-planner/`. The flags answer every prompt. If any prompt still appears, such as React Compiler, answer No. This installs Next.js 15.5.x (15.5.29 on 2026-11-06) with React 19.
3.  Delete `src/app/page.module.css` and `public/*.svg`. Keep `src/app/favicon.ico`, `next-env.d.ts` and `package-lock.json`.

Versions were checked with `npm view` on 2026-11-06. Install with `--save-exact`:

*   Runtime dependencies: `opening_hours@3.15.0`, `leaflet@1.9.4`, `react-leaflet@5.0.0` (needs React 19 and Leaflet ^1.9), `lucide-react@1.70.0`, `server-only@0.0.1`.
*   Dev dependencies: `@types/leaflet@1.9.22`, `vitest@5.1.0`.
*   Scripts:
    *   `dev`, `build`, `start`, `lint` (from create-next-app)
    *   `test` = `vitest run`

### Files

All paths are relative to the repository root.

#### Project and config

| File | Action | Stage | What and why |
| --- | --- | --- | --- |
| `./package.json` | create (scaffold) | 0 | Dependencies and scripts listed above. |
| `./tsconfig.json` | create (scaffold) | 0 | `strict: true` stays on. The typed boundary depends on it. |
| `./next.config.ts` | create (scaffold) | 0 | Add `serverExternalPackages: ['opening_hours']` so the library is loaded by Node at runtime instead of bundled. Its locale files make bundling unreliable. Also add `experimental.serverActions.bodySizeLimit: '32kb'` (R8). The key is in the Next.js 15.5 config schema (`config-schema.ts`, `experimental.serverActions.bodySizeLimit`); the default is 1 MB. |
| `./vitest.config.ts` | create | 0 | Sets `process.env.TZ = 'Europe/Rome'` at the top of the file, so worker processes inherit it and tests give the same result on every machine. `test.environment: 'node'`. `resolve.alias` maps `@` to `./src`, so tests import the same paths as the app, and maps `server-only` to `./tests/empty.ts`, because the real package throws outside a React Server Components build. |
| `./tests/empty.ts` | create | 0 | `export {}`. The stand-in for `server-only` in tests. |
| `./eslint.config.mjs` | create (scaffold) | 0 | Unchanged. |
| `./.gitignore` | create (scaffold) | 0 | Unchanged. |
| `./src/lib/config.ts` | create | 0 | One place for every setting:<br>• data config: `DATA_URL` and `REVALIDATE_SECONDS` (read from `process.env.DATA_URL` and `process.env.REVALIDATE_SECONDS`, defaulting to the source URL and 3600, so Verification 2 can point at a mock server), `ITALY_BOUNDS`, `CATEGORY_GROUPS` (`Food = [Restaurant, Cafe]`)<br>• `PlannerConfig`: points `{maybe:1, very:4}`, `defaultVisitMinutes: 60`, `defaultDayStart: '09:00'`, `defaultDayEnd: '21:00'`, `tripDays: 3`, `maxSeeds: 15`, `maxOptions: 3`, `optionOverlapLimit: 0.7`, `travelModes` (as in Travel time)<br>The planner keys are added in stage 4. This is what makes G7 true. |

#### Typed model and data layer (server)

| File | Action | Stage | What and why |
| --- | --- | --- | --- |
| `./src/lib/types.ts` | create | 1 | `Field<T>`, `Category`, `Coordinates`, `PlaceLocation`, `PlaceHours`, `Price`, `Place`, `PlaceFlag`, `DataIssue`, `Dataset`, `RawPlace`, as in the Technical Plan. These are the only types UI components may import for place data. |
| `./src/lib/geo.ts` | create | 1 | `haversineKm(a, b)` and `isInCountry(c)`, which for now checks `ITALY_BOUNDS`, a rectangle. Used by cleaning and travel time. |
| `./src/lib/data/normalizeHours.ts` | create | 1 | `normalizeHours(raw): PlaceHours`. Wraps `new opening_hours(raw, null, { tag_key: 'opening_hours' })`:<br>• a throw → `unparsed`<br>• warnings → `normalized`<br>• empty → `missing`<br>Also exports `parseOpeningHours(raw)`, which the planner uses to build the library object again. |
| `./src/lib/data/normalize.ts` | create | 1 | `normalize(raw: unknown): Dataset`. Applies every cleaning rule from the Technical Plan to each `RawPlace` (id, name, text fields, type, coordinates, hours, duration, price, rating, booking, tags) and builds `issues` from the flags, one `DataIssue` per flag. It never throws on a single record. It throws only if the top level is not an array. Logs each `unparsed` hours value (place id and raw text) and one count of `missing` hours, once per call. |
| `./src/lib/data/getDataset.ts` | create | 1 | `import 'server-only'`.<br>• fetches `DATA_URL` with `{ next: { revalidate: REVALIDATE_SECONDS } }` and throws on non-2xx, a network error or bad JSON<br>• on a throw, logs it with `console.error` and falls back to `italy.snapshot.json`<br>• returns `{ dataset: normalize(json), source: 'live' \| 'snapshot' }`, with `fetchedAt` from the response `Date` header, or the snapshot's file date |
| `./src/data/italy.snapshot.json` | create | 1 | A copy of the 103-record source. It is the fallback when the live fetch fails, and the test fixture. |

#### Discover UI

Every component is a `.tsx` file with a matching `.module.css` file in `./src/components/<Name>/`. Props are typed from `@/lib/types`, `@/lib/prefs/types` and `@/lib/planner/types`. All three files contain types only, so the browser never imports server code.

| File | Action | Stage | What and why |
| --- | --- | --- | --- |
| `./src/app/layout.tsx` | create (scaffold) | 1 | Root HTML, a page title, and `AppNav` (Discover / Plan links). |
| `./src/app/globals.css` | create (scaffold) | 1 | Reset, CSS custom properties for colours, spacing and focus ring, and the system font stack. All component styles use these variables. |
| `./src/app/page.tsx` | create | 1 | Server component. Calls `getDataset()` and renders `<DiscoverView places issues fetchedAt />`. Exports `revalidate = 0`. Renders `SnapshotNotice` when `source` is `'snapshot'`. |
| `./src/app/plan/page.tsx` | create | 4 | Server component. Calls `getDataset()` and renders `<PlanView places source />`. The places are needed to show names, icons and flags on stops. Exports `revalidate = 0`. Renders `SnapshotNotice` when `source` is `'snapshot'`. |
| `./src/app/error.tsx` | create | 1 | Generic client error boundary: "Something went wrong" and "Try again", which runs `startTransition(() => { router.refresh(); reset(); })`. |
| `./src/app/loading.tsx` | create | 1 | A simple loading state shown while the first fetch runs. |
| `./src/components/AppNav/*` | create | 1 | Two links, with `aria-current` on the active one. |
| `./src/components/SnapshotNotice/*` | create | 1 | A server component. A `role="status"` notice: "Live place data could not be loaded. Showing a saved copy." |
| `./src/components/DiscoverView/*` | create | 1 | Client component.<br>• Owns `FilterCriteria` state and reads `usePreferences()`.<br>• Calls `filterPlaces` and lays out `FilterBar`, `SearchBox`, the result count, `PlaceList`, `PlaceMap` and `DataQualityPanel`.<br>• Holds the selected place id so that the list and map highlight the same place. Choosing a pin (or a Plan link) scrolls only the list pane so the card is centred; this also happens on leaving full screen. Choosing a card in the list does not scroll it. On narrow screens, where the list is part of the page, only Plan links scroll the page.<br>• Holds the "Update results when map moves" checkbox and, while it is on, the map's bounds (from `PlaceMap`'s `onBoundsChange`); the list and count use `placesInBounds`, the map keeps all filtered pins. |
| `./src/components/FilterBar/*` | create | 2 | Category-group, city, price and tag checkboxes. Category groups come from `CATEGORY_GROUPS`; the other options come from the data (unique values), not hard-coded lists, so another dataset works too. Also has the "Show not interested" toggle and "Clear filters". |
| `./src/components/SearchBox/*` | create | 2 | A labelled `<input type="search">`, updated about 150 ms after typing stops. |
| `./src/components/PlaceList/*` | create | 1 | `<ul>` of `PlaceCard`, showing `matches` and then `uncertainMatches` under a "May be inaccurate" heading. Works fully with the keyboard. `emptyText` overrides "No places match." |
| `./src/components/PlaceCard/*` | create | 1 | Shows name, `CategoryIcon`, city, rating, price, time needed, hours, booking (only when required or unknown), tags, description and seasonal notes. Each optional value goes through `FieldValue`; a missing or doubtful value is highlighted by `Suspect` (warning colour and icon, "may be inaccurate" for screen readers) without the reason. With `?debug` in the URL, the reasons and one `FlagBadge` per flag are shown too. Also holds `InterestControl` and `MustVisitToggle`. |
| `./src/components/FieldValue/*` | create | 1 | Generic helper `<FieldValue field render />`:<br>• `ok` → the rendered value<br>• `missing` → nothing (or "Unknown" when `showMissing` is set)<br>• `invalid` → the raw text plus a "may be inaccurate" badge<br>It is the reason a new optional field needs no special card code. |
| `./src/components/HoursValue/*` | create | 1 | Shows `PlaceHours`:<br>• always the raw text<br>• `normalized` → an "interpreted" badge, with the warnings shown on hover and focus<br>• `unparsed` → a "may be inaccurate" badge<br>• `missing` → "Hours unknown" |
| `./src/components/FlagBadge/*` | create | 1 | Takes `{ badge: Badge }` and maps it to the short label and `title` text in the Badges table. Uses a text label as well as colour. |
| `./src/components/CategoryIcon/*` | create | 1 | Maps each `Category` to a lucide icon, with the visible text label next to it. `Unknown` gets a generic icon. |
| `./src/components/InterestControl/*` | create | 3 | A radio group (`role="radiogroup"`) with Not interested (lucide `HeartCrack`), Maybe (one heart) and Very interested (two hearts). Selecting the current value again clears it to Unrated. When must-visit is on, it is hidden: the `MustVisitToggle` beside it already shows "Must visit". |
| `./src/components/MustVisitToggle/*` | create | 3 | A `<button aria-pressed>`. It is disabled, with the explanation "Location unknown", when the location is `unusable`. |
| `./src/components/PlaceMap/PlaceMap.tsx` | create | 1 | `next/dynamic(() => import('./PlaceMapInner'), { ssr: false })`, so Leaflet never runs on the server. |
| `./src/components/PlaceMap/PlaceMapInner.tsx` + `.module.css` | create | 1 | react-leaflet `MapContainer` starting at `center [42.5, 12.5]`, `zoom 6`, with tiles from `https://tile.openstreetmap.org/{z}/{x}/{y}.png` and the attribution `© OpenStreetMap contributors`.<br>• A `FitBounds` child uses `useMap()` and refits when the shown places change: 0 points → `fitBounds(ITALY_BOUNDS)`, 1 point → `setView(point, 13)`, otherwise `fitBounds(points, { padding: [24, 24] })`.<br>• Draws `CircleMarker`s only for places whose location is not `unusable`.<br>• Clicking a marker selects the place.<br>• Imports `leaflet/dist/leaflet.css`.<br>• Full-screen (`expanded`) mode: tooltips render `PlaceSummary`, markers get `keyboard: true` and an `aria-label`, and a `ResizeObserver` calls `invalidateSize()` when the pane changes size.<br>• With `onBoundsChange`, a `ReportBounds` child reports the visible bounds on mount and after every `moveend` and `resize`. |
| `./src/components/PlaceSummary/*` | create | 1 | Read-only condensed place card, shown in pin tooltips on the full-screen map. The description is cut to 3 lines unless `fullDescription` is set. |
| `./src/components/MapPlacePanel/*` | create | 1 | The selected place on the full-screen map: `PlaceSummary` (with `fullDescription`) plus `InterestControl` and `MustVisitToggle`, with a close button. The panel's height is capped to the map pane. The summary sits in a focusable, labelled scroll region ("Place details"), so the controls stay visible. |
| `./src/components/DataQualityPanel/*` | create | 7 | A `<details>` element listing `issues` grouped by flag, with place name, field, raw value and reason (CUJ 5). |

#### Discover logic and preferences

| File | Action | Stage | What and why |
| --- | --- | --- | --- |
| `./src/lib/discover/text.ts` | create | 2 | `foldText(s)`: lowercases and removes accents (`NFD`, then removes `\p{M}`). |
| `./src/lib/discover/filterPlaces.ts` | create | 2 | `filterPlaces(places, criteria, prefs) → { matches, uncertainMatches }`, following the `FilterCriteria` contract in Discover.<br>• Applies the category, city, price and tag filters, search and hiding of "not interested" places.<br>• A missing or invalid field goes to `uncertainMatches` only if every other filter passes.<br>• Order: both lists sorted by name, then `id`. The view applies the traveler's sort with `sortPlaces`. |
| `./src/lib/discover/mapBounds.ts` | create | 4 | `MapBounds` and `placesInBounds(places, bounds)`: places whose usable coordinates fall inside the bounds, edges included. Used by "Update results when map moves". |
| `./src/lib/prefs/types.ts` | create | 3 | `Interest`, `PlacePref`, `StoredPrefs`. Types only. |
| `./src/lib/prefs/storage.ts` | create | 3 | `STORAGE_KEY = 'trip-planner:prefs:v1'`.<br>• `loadPrefs(raw: string \| null): StoredPrefs` returns empty preferences for null, bad JSON or the wrong version.<br>• `savePrefs(p): string`.<br>Pure functions, so they can be tested without a browser. |
| `./src/hooks/usePreferences.ts` | create | 3 | Client hook.<br>• Loads from storage in `useEffect` after mount, and sets `ready` once loaded. Until `ready`, the interest and must-visit controls are disabled. The list and map render at once.<br>• Only `DiscoverView` and `PlanView` call it.<br>• Returns `setInterest(id, v \| undefined)`, `setMustVisit(id, bool)` and `setTrip(partial)`.<br>• Writes to storage after each change. |

#### Plan action and planner (server)

| File | Action | Stage | What and why |
| --- | --- | --- | --- |
| `./src/lib/planner/types.ts` | create | 4 | `PlanRequest`, `PlanResult`, `ItineraryOption`, `DayPlan`, `Stop`, `StopWarning`, `Unscheduled`, `Conflict`, `Interval`, `PlanContext`, `DaySchedule`, `Badge`, as in the Technical Plan. Also `PlanOutcome` (what `plan()` returns: `ok` or `infeasible`, before the action adds `source`) and `ScheduledStop` (a place with start, end, `travelBefore` in minutes and `unknownHours`, set when the library marked the interval used as unknown). These types are shared with the Plan UI. The file contains types only, so the browser never imports server code. |
| `./src/lib/planner/validateRequest.ts` | create | 4 | `validateRequest(body: unknown): PlanRequest \| { error: string }`. Checks:<br>• the `YYYY-MM-DD` date is real<br>• times are `HH:mm`, with `dayEnd > dayStart`<br>• `days` is from 1 to 14<br>• interest values are allowed values<br>Unknown place ids are left for `plan()` to drop, because it has the dataset. |
| `./src/lib/planner/time.ts` | create | 4 | Helpers for Italian wall-clock time:<br>• `tripDates(start, days)`<br>• `toMinutes('HH:mm')` and `fromMinutes`<br>• `localDate(date, minutes)`, which builds a `Date` with `new Date(y, m, d, h, min)`<br>• `openIntervals(oh, date, windowStart, windowEnd)`, which uses `oh.getOpenIntervals()` and returns `Interval[]` clipped to the window, following scheduling rules 5 and 6 |
| `./src/lib/planner/travel.ts` | create | 4 | Defines the `TravelTimeEstimator` interface and `fastestModeEstimator(config)`, which implements the formula in Travel time. |
| `./src/lib/planner/context.ts` | create | 4 | `createContext(request, config) → PlanContext`. Parses each place's hours once and caches intervals per place and day. Unparsed or missing hours give one interval covering the whole window (scheduling rule 7). `visitMinutes` is `durationMinutes` or `defaultVisitMinutes`. Also `hasKnownHours(place)`. |
| `./src/lib/planner/schedule.ts` | create | 4 | The shared insertion logic:<br>• `timeDay(items, dayIndex, origin, ctx)`, which gives each stop its earliest start<br>• `tryInsert(days, dayIndex, item, position, ctx)`, which recomputes times along that day's route and the first stop of the next non-empty day (since the leg between days may change), checks the window and each stop's opening intervals, and returns the new schedule or `null`<br>• `bestInsertion(days, item, ctx)`: the least added travel, ties to the earlier day, then the earlier position<br>• `hasSlotOnTripDays(place, ctx)`<br>Used by both the feasibility check and option building. |
| `./src/lib/planner/feasibility.ts` | create | 4 | `checkFeasibility(musts, ctx) → { ok: true, days } \| { ok: false, conflicts }`. Runs the five stages in order:<br>• lower bound on travel by the shortest network linking the must-visits (Prim's algorithm)<br>• musts inserted largest visit first, because a long place is hardest to fit and should be placed first<br>• each conflict's `message` is a plain sentence plus a suggested fix |
| `./src/lib/planner/buildOption.ts` | create | 4 | `buildOption(mustDays, fills, seed \| null, label, ctx) → ItineraryOption \| null`.<br>• If `seed` is set, inserts it first at its best position; returns `null` if it does not fit.<br>• Then repeatedly inserts the place with the best `points / (visit + extra travel)`, where extra travel includes changes to legs between days. Ties go to dataset `rating`, then `id`.<br>• Fills in two passes: places with known hours first, then places with unparsed or missing hours. Seeds come only from places with known hours.<br>• Collects `unscheduled` with reasons and attaches `StopWarning`s from the place flags, plus `seasonal_note` when the place has seasonal notes. |
| `./src/lib/planner/improveRoute.ts` | create | 8 | `twoOpt(day, ctx)`. Keeps any reversal of a route segment that shortens travel and still passes `tryInsert`'s checks. Runs until a full pass finds nothing better. |
| `./src/lib/planner/plan.ts` | create | 4 | `plan(places, request, config) → PlanOutcome`. Stage 4 runs only the unseeded run, labelled "Best overall" (or "Must-visits only" when nothing else has interest); steps 3 and 6 come in stage 6 and step 5 in stage 8. Steps:<br>1. build candidates (dropping ids that are not in the dataset)<br>2. feasibility check<br>3. seeds<br>4. build one option per run (one unseeded run plus one per seed)<br>5. 2-opt<br>6. pick options (sort by fill points, overlap rule, up to `maxOptions`)<br>Deterministic: every sort follows the Tie-breaks in Planner and ends on `id`, and options are sorted by fill points, then the unseeded run, then the lower seed `id`. |
| `./src/app/plan/actions.ts` | create | 4 | `'use server'`. `generatePlan(input: unknown): Promise<PlanResult>`:<br>• invalid input → `bad_request`<br>• `plan()` is infeasible → `infeasible`<br>• otherwise `ok`, with `source` from `getDataset()`<br>Never throws for these cases. |

#### Plan UI

| File | Action | Stage | What and why |
| --- | --- | --- | --- |
| `./src/components/PlanView/*` | create | 4 | Client component.<br>• Reads `usePreferences()`, renders `TripForm`, and calls `generatePlan` inside `useTransition`.<br>• Handles each `PlanResult` status, plus a thrown error (network failure or server crash). `bad_request` is shown as an inline error; a thrown error is shown with Retry.<br>• `src/app/plan/page.tsx` shows `SnapshotNotice` when the page's data came from the snapshot, as on Discover.<br>• Shows a summary of the must-visits and places with interest being sent, and a link back to Discover when no place has interest set. |
| `./src/components/TripForm/*` | create | 4 | Labelled `<input type="date">` and two `<input type="time">`. Values are saved through `setTrip`. Shows "3-day trip" as text, because the length is a setting, not a control. |
| `./src/components/ConflictList/*` | create | 4 | Shows each `Conflict.message` in a `role="alert"` list, with links to the places involved. |
| `./src/components/OptionTabs/*` | create | 4 | ARIA tabs (`tablist`/`tab`/`tabpanel`, with arrow-key navigation), one per option, labelled with `label`. (Stage 6 adds "Only one distinct plan" when there is one option.) Shows the "times may be wrong" notice when any stop in the option has an `…assumed_open` warning. |
| `./src/components/DayTimeline/*` | create | 4 | An ordered list of `StopCard`s for one date, with a travel leg such as "~25 min (estimated)" between stops. |
| `./src/components/StopCard/*` | create | 4 | Start and end times, place name, `CategoryIcon`, a must-visit badge, and one `FlagBadge` per `StopWarning`. Shows the raw hours text next to an `…assumed_open` warning, and the seasonal note text below the badges. Day timelines show the overnight leg as "~N min travel (estimated) from where you finished yesterday". |
| `./src/components/UnscheduledList/*` | create | 4 | Places that didn't fit, grouped under a plain reason, each linking to the place on the Discover map. |
| `./src/lib/links.ts` | create | 4 | `placeOnMapHref(id)` → `/?place=<id>`. Used by `StopCard`, `UnscheduledList` and `ConflictList`. Discover reads `place` once preferences have loaded and stays in the list view: it selects the place, flies the map to the pin, scrolls the list so the card is centred, moves focus to the card's title button, and removes the parameter from the URL (keeping others such as `?debug`). |
| `./src/components/PlaceHoverCard/*` | create | 4 | Wraps a place link on the Plan page (`StopCard` names and `UnscheduledList` links). On hover or keyboard focus it shows `PlaceSummary` above the link, or below it when there is no room above. The pointer can move onto the card without closing it, Escape closes it, and the link gets `aria-describedby` while it is open (WCAG 1.4.13). |

#### Tests and fixtures

| File | Action | Stage | What and why |
| --- | --- | --- | --- |
| `./tests/fixtures/places.ts` | create | 1 | `makePlace(overrides)` builder for small planner scenarios, and `makeRawPlace(overrides)` for cleaning tests. Tests that need the full dataset import `src/data/italy.snapshot.json`, so there is one copy of the data. |
| `./tests/lib/normalizeHours.test.ts` | create | 1 | Every distinct `hours` string in the snapshot gives a non-`missing` status, or `missing` only for null. Asserts the 17 / 37 / 3 split, and that the `unparsed` set is exactly `Evenings`, `Morning only` and `9am-12:30pm`. Also covers every row of the Hours test cases table. (G2) |
| `./tests/lib/normalize.test.ts` | create | 1 | Checks that:<br>• all 103 records come out<br>• `place_059` keeps its coordinates and is `ok` (the known gap in R5)<br>• a record with no coordinates or coordinates outside the planning area is `unusable`<br>• an unknown type becomes `Unknown`<br>• `local-favorite` and `local_favorite` merge<br>• `place_020` booking is `missing`<br>• a broken record doesn't throw<br>• `console.warn` is called with `place_037` and `Evenings` (G1, G2) |
| `./tests/lib/filterPlaces.test.ts` | create | 2 | Food + Rome + "carbonara" returns exactly `place_009` and `place_022` (CUJ 1); accent-insensitive search; a place with missing price goes to `uncertainMatches` only when the other filters pass; "not interested" is hidden but a not-interested must-visit is shown. |
| `./tests/lib/mapBounds.test.ts` | create | 4 | `placesInBounds` keeps places inside or on the edge of the bounds, drops those outside, and drops places without a usable location. |
| `./tests/lib/storage.test.ts` | create | 3 | A save and load returns the same data; bad JSON and the wrong version give empty preferences; unknown ids are kept. |
| `./tests/lib/planner/travel.test.ts` | create | 4 | The expected minutes in Travel time (0 → 0, 0.5 → 8, 2 → 16, 2.01 → 16, 10 → 35, 50 → 55, 50.01 → 56), and a sweep from 0 to 500 km in 0.01 km steps that checks the estimate never goes down as distance grows. |
| `./tests/lib/planner/time.test.ts` | create | 4 | Open intervals on a weekday versus a closed day; past-midnight hours; `09:00-19:00` gives `[540, 1140]` on 2027-03-27, 2027-03-28 (the clock change) and 2027-03-29. |
| `./tests/lib/planner/feasibility.test.ts` | create | 4 | One test for each conflict reason. CUJ 4 (Chianti 480 min against a 9:00–16:00 window gives `longer_than_day` with the expected message). A must-visit with unparsed hours passes with a warning. |
| `./tests/lib/planner/plan.test.ts` | create | 4 (overlap and seed cases: 6) | Using the snapshot and a fixed set of preferences, checks that:<br>• every option contains every must-visit<br>• no stops overlap<br>• stops fall inside hand-written intervals: Colosseum `place_001` [540, 1140]; Uffizi `place_026` [495, 1130] and never on a Monday; `place_059` only on Saturday or Sunday, [540, 1140]<br>• all stops are inside the daily window<br>• the result is deterministic: shuffling the order of `places` and of the `prefs` keys gives a deep-equal result<br>• a place with seasonal notes carries a `seasonal_note` warning<br>• kept options overlap by no more than `optionOverlapLimit` (`\|A∩B\|/min`)<br>• a seeded option contains its seed<br>• when consecutive days end and start in different cities, the next day's first stop has `travelMinutesBefore > 0` and starts at or after `dayStart + travelMinutesBefore`<br>• with made-up places, a place with unparsed hours is scheduled only when no place with known hours still fits<br>• no seed has unparsed or missing hours<br>• a place where `isInCountry` is false is never scheduled and is listed with `location_unusable` (G5, G6) |
| `./tests/lib/planner/validateRequest.test.ts` | create | 4 | Bad date, `dayEnd <= dayStart`, `days` out of range, bad times, bad preference values, and too many preferences (more than 2,000). |

#### Documentation

| File | Action | Stage | What and why |
| --- | --- | --- | --- |
| `./README.md` | modify (scaffold creates it) | 5 | Covers (G8):<br>• how to run and test<br>• the data problems found and how each is handled (a table drawn from `DataIssue` flags)<br>• the architecture in one diagram<br>• what was cut and why, including **known issue: duplicate places are not detected**<br>• what comes next: Google Maps travel times, changing visit length per place, an LLM for unparsed hours, duplicate detection, a real border check instead of the rectangle, checking coordinates against the city with a geocoding service |
| `./scripts/mock-source.mjs` | create | 1 | A plain Node HTTP server on port 4010. It serves `italy.snapshot.json` at `/italy.json`. Calling `GET /__status/403` or `/__status/200` switches what it returns. Used only by Verification 2. |
| `./docs/designs/italy_trip_planner.md` | update in the final stage | last | Replaced by the final design. |

### Verification Plan

1.  **Automated:** `npm test` (Vitest, all files above), `npm run lint` and `npm run build` must all pass. The build also checks the types.
2.  **Data failure:** run `node scripts/mock-source.mjs`. Then run `npm run build` and `npm start` with `DATA_URL=http://localhost:4010/italy.json` and `REVALIDATE_SECONDS=10`. Check:
    *   The build succeeds while the mock returns 403. The build does not fetch.
    *   Mock at 403, first visit: the snapshot notice shows, and places are listed.
    *   Mock at 200: reload, and there is no notice.
    *   Mock at 403: wait more than 10 s and reload twice. There is still no notice, and the live data is still served. If this fails, wrap the fetch in `unstable_cache` (see Data loading).
3.  **Manual CUJ pass:** run `npm run dev` and go through each journey:
    *   CUJ 1: Food + Rome + "carbonara" (2 results; clearing the filters restores everything)
    *   CUJ 2: set interest, mark must-visit, reload, show and hide not interested, turn must-visit off and back on
    *   CUJ 3: Rome + Florence plan with 2 must-visits
    *   CUJ 4: Chianti, Siena and Pienza as must-visits on 9:00–16:00
    *   CUJ 5: the `Evenings` card and the data-quality panel
4.  **Keyboard pass:** with Tab, Space, Enter and the arrow keys only:
    *   filter, search, set interest and toggle must-visit
    *   submit the trip form and switch option tabs
    *   the focus ring is visible on every control
5.  **Plan action check:** in `npm run dev`, generate a plan for each case: a valid trip gives options, `dayEnd` before `dayStart` gives the inline error, and a must-visit that cannot fit gives the conflict list. The same cases are covered headlessly by `plan.test.ts` and `validateRequest.test.ts`.

--------------------------------------------------------------------------------

*Drafted with EGM*
