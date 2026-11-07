# Italy Trip Planner

* **Author:** Micheal Friesen
* **Date:** 2026-11-06

## Overview

A Next.js web app that helps a traveler plan a 3-day trip in Italy from a fixed dataset of 103 places (`italy.json`). The traveler browses places on a map and in a list, filters them, marks favorites with a priority, and gets suggested day-by-day itineraries built from those favorites.

The project is an interview take-home with a hard 4-hour time box and no stated grading criteria. Its purpose is to show product thinking and well-structured, componentized software. The intended order of value is:

1. **Browse:** see every place on a map and in a list, with accessible category icons.
2. **Filter:** narrow places by category, tags, cost and location.
3. **Shortlist:** mark favorites with a priority, saved in the browser.
4. **Plan:** generate itineraries from the shortlist, accounting for opening hours, visit length and travel time.

The author's original stage names (Collecting, Refining, Mapping, Managing) are replaced in the UI by **Browse, Shortlist, Plan**. "Mapping" would be confused with the map view. "Managing" (day-of navigation, notes, booking) is future work.

## Analysis

Seven reviewers looked at the concept separately. All of them read the real dataset. Their findings are combined below, most important first.

### 1. The scope is larger than 4 hours, and the planner is where the time goes

All seven reviewers raised this. Cleaning the data, building the map and list, filters and favorites can each be finished on time. The itinerary generator is a scheduling problem: opening hours change by weekday, places sit in different cities, visit lengths range from 15 to 480 minutes, and must-visits may not fit. It is the most likely part to be half-finished at hour 4. A half-finished planner also makes the finished parts look worse.

**Response:** Build in vertical slices so the app can be demonstrated after each step:

1. normalized data model and tests
2. list and map
3. filters
4. favorites
5. planner, with a fixed time cap

The planner is a pure function with no React, storage or network code. That makes it testable on its own and easy to cut back if time runs out.

### 2. The opening-hours data is messier than "inconsistent formats" suggests

There are 103 records with sequential, unique ids `place_001` to `place_103`, and every record has the same 16 fields. The `hours` field is where most of the dirt is:

- 33 records are `null`.
- 5 are vague text: "Morning only", "Evenings".
- The rest mix about 12 patterns:
  - 24-hour times, and 12-hour times ("8am-7pm")
  - closing at 24:00 or after midnight ("8:00-01:00")
  - day ranges that wrap around the week ("Wed-Mon")
  - day lists ("Tues, Thurs-Sun")
  - split lunch and dinner times
  - different hours on different days ("Mon-Sat 9:30-17:30, Sun 14:00-17:30")
  - a "Daily" prefix
- Commas mean three different things: they separate time slots, day groups, or days. Splitting on commas alone will parse some records wrongly.

`seasonal_notes` also holds rules that change whether a place can be visited, such as "Closed Sundays except last Sunday", "Third weekend of each month only" and "Open April-October only". The `hours` field does not reflect these.

**Response:**

- Parse `hours` into a weekly schedule: for each weekday, a list of open and close times in minutes from midnight. Close times may go above 1440 so that after-midnight closings fit.
- Give every place one of four hours states:
  - **known**
  - **approximate:** "Morning only" becomes about 08:00–12:00, "Evenings" about 18:00–23:00
  - **always open:** a null value on an outdoor place such as a piazza, viewpoint or neighborhood
  - **unknown:** a null value on anything else
- The planner treats unknown hours as open but shows a warning.
- Show seasonal notes as text with a flag. Do not parse them in the 4-hour version.
- A hand-written parser checked against the roughly 40 distinct strings is cheaper, more predictable and easier to test than an LLM.

### 3. The planner cannot honor weekday hours without a trip date

"Tues-Sun", "Wed-Mon" and "Sat-Sun" only mean something once each trip day has a weekday. The concept has no start date.

**Response:** Add a start-date input with a visible default.

### 4. Travel time: a table keyed by city name will not scale to this data

The data covers 16 cities in 5 regions, with 30 places in Rome, 20 in Florence and 15 each in Milan and Venice. Several are small towns with one place each: Siena, Pienza, Lenno, Bellagio, Burano, Maranello, Isola della Scala, Padua, Como, Parma and Modena. A full city-to-city table is about 120 pairs, mostly guesses.

The `city` field is also used two ways. The Chianti bike trip is listed under Florence but its coordinates are 22 km away. The Siena day trip is listed under Siena.

A table between cities also says nothing about travel inside a city, and that decides whether a day is feasible. In Rome, places can be more than 30 minutes apart.

**Response, combining the reviewers' suggestions:**

- Look up travel time from coordinates, not from city names.
- Default estimate: straight-line distance × a road-or-rail factor ÷ an assumed speed for the mode (walking under about 2 km, otherwise train or car), plus a fixed overhead per trip.
- Override the estimate with a small hand-made table for the main train links between 5 hub cities (Rome, Florence, Bologna, Milan, Venice), which is 10 pairs.
- Straight-line distance is wrong across water and mountains (Venice to Burano, Lake Como ferries), so those get overrides too.
- Return the number of minutes plus where it came from (`table` or `estimate`) so the UI can mark estimates with "~".

**Where reviewers disagree:** One reviewer said a `TravelTimeProvider` interface is speculative and a single function is enough. Two others said keep the interface and make it asynchronous and batch-based now. Their reason is that Google's Distance Matrix is asynchronous and billed per origin–destination pair: 30 favorites means about 900 pairs. A synchronous interface would force every caller to change later. The cost of doing it now is small, and it supports the "swap in Google Maps later" story in the README.

### 5. "Several itineraries" is undefined and will produce near-copies

Running the same algorithm with different random seeds or stop orders gives options that only look different.

**Response:** Make the options differ on the one decision that really separates plans. With 16 cities and 3 days, that decision is which cities to stay in. Two compatible approaches came up:

- **One option per realistic city set:** for example "Rome only", "Rome + Florence", and "the set that fits the most must-visits".
- **Two or three named strategies on one greedy core:** for example "most must-visits", "fewest city changes", "relaxed pace".

Each option is labeled with what it gives up ("drops 2 Venice must-visits"). Options that come out the same are removed. If every favorite is in one city, show one plan and say why.

**Fallback if time runs short:** one greedy itinerary, plus a "re-plan with city X as the base" button.

### 6. Favorites: tiers, not a ranked list

*Superseded by author decision 3: a 1–5 interest score plus a separate must-visit flag. The reviewers' reasoning against drag-to-rank still applies.*

A drag-to-rank list needs a drag-and-drop library and keyboard reordering to be accessible. The planner also only needs a hard "must-visit" rule. Every reviewer recommended **must / want / maybe** tiers:

- One tap adds a place as "want", and a segmented control changes the tier.
- Must-visits are hard requirements. Want and maybe are weighted.

Tiers can be turned into a ranked list later without losing anything. A ranked list cannot be turned back into tiers.

**Where reviewers disagree:** some would break ties inside a tier by rating. Another pointed out that ratings run from 2.1 to 5.0 with only four below 4.0, so rating barely separates places and the user's priority should decide. A neutral rule is to break ties by rating, then by fit with the day.

### 7. The planner must explain itself and never drop places silently

Must-visits can be closed on every trip day, or too far apart to fit together. Three must-visits in Rome, Venice and Milan cannot fit in 3 days.

**Response:** Every itinerary option returns its scheduled days plus an `unscheduled` list. Each unscheduled place has a reason, such as `closed_on_day`, `no_time`, `too_far` or `out_of_season`. Every stop that rests on uncertain data carries a warning: "hours unknown, assumed open", "duration estimated", "seasonal: Apr–Oct".

Reviewers singled this out as the clearest piece of product thinking a reviewer will see. It is also the only way to debug a strange itinerary during a demo.

Edge states that need defined screens:

- no favorites
- favorites that fill less than 3 days
- full-day trips: Chianti 480 min, Siena and Pienza 360, Burano 300. These take a whole day, not one slot.

### 8. Problems in specific records

- **Wrong coordinate:** Brera Antique Market (`place_059`) has longitude 11.1910. Every other Milan place is near 9.18, so the pin lands about 160 km east, near Verona. **Response:** flag any place more than about 30 km from the median point of its city. Do not silently fix it.
- **Near-duplicates:** Mercato Centrale Firenze (030, market) and Mercato Centrale (031, experience) have identical coordinates. So do Trevi Fountain (018) and Trevi Fountain by Night (077). Records 044 and 083 are both Acetaia Giusti. The Colosseum, Forum and Palatine share one ticket. **Response:** flag possible duplicates and link them. Do not merge them, because merging changes ids and breaks saved favorites.
- **Tags:** 31 distinct tags.
  - `local_favorite` and `local-favorite` are the same tag spelled two ways.
  - `market`, `shop` and `experience` repeat the type.
  - `scenic`, `views` and `photogenic` overlap.
  - `budget`, `free` and `splurge` overlap with `price_range`.
  - Some tags contradict their record: `budget` on a €€ place, `active` on the Ferrari Museum.
  
  **Response:** a committed tag map that normalizes separators and sorts tags into groups (interest, time of day, crowd, cost, activity, audience). Unmapped tags pass through with a flag. Raw values are kept next to normalized ones.
- **Types:** 10 types, used loosely. `cafe` covers gelato shops, wine bars and a rooftop bar. `experience` mixes 60-minute activities with six whole-day trips. A department store rooftop is typed `viewpoint`. **Response:** map the 10 raw types to about 7 display categories, each with an icon and a text label. Add a derived "Day trip" category for places of 300 minutes or more.
- **Missing values:** `duration_minutes` is null for 9 records, mostly viewpoints, and gets a default per type, marked as estimated. `booking_required` is null for one record (Il Sorpasso) and is shown as "unknown", not "no".
- **Price:** exactly four values, € to €€€€, with no free tier. Piazzas and neighborhoods are marked €. Treat price as a 1–4 scale.
- **Neighborhood:** null in 19 records and inconsistent elsewhere. Filter by region and city, and show neighborhood as display text only.
- **Encoding:** the file is valid UTF-8 (em dashes, €, accented letters). Search should ignore accents and case, because "supplì" and "suppli" both appear.

### 9. Structure: define the contracts between parts before writing UI

The concept lists features, not modules. Reviewers proposed one-way dependencies:

```
data/      load raw JSON, normalize(raw) -> { places, issues }   (pure, runs once at build or import time)
domain/    Place, OpeningHours, Category, DataIssue types; filter functions; plan(); TravelTimeProvider and FavoritesStore interfaces
adapters/  static travel table plus estimate; localStorage favorites store
ui/        map, list, filters, favorites controls, itinerary view
```

- Components never import the raw record type. They receive small view types built from `Place`, such as a marker with id, coordinates, category and label. This settles the apparent conflict between "components that accept any data" and "strict types": the strict model belongs to the data layer, and components only see the narrow shapes they need.
- Filters are plain functions over `Place`, not logic inside components.
- The map and list share one store for the selected place and the active filters.

### 10. Saved favorites can silently break

The ids look like row numbers. If the dataset is regenerated or reordered, saved favorites will point at the wrong places, with no error.

**Response:**

- Save only user input, never cleaned places or generated itineraries, under one versioned key, e.g. `{ schemaVersion: 1, favorites: [{ id, interest, mustVisit, nameSnapshot }] }`.
- On load, show a favorite whose id is gone, or whose name no longer matches, as "no longer available". Do not drop it or remap it.
- Read localStorage only after the page mounts in the browser. Reading it during server rendering in Next.js causes the favorite state to mismatch or flicker.

### 11. Accessibility needs testable criteria

Accessibility is the top priority but has no acceptance checks. Maps are where accessibility usually fails.

**Response:**

- The list is the main view and works fully by keyboard. The map adds to it and highlights the same selected place.
- Every category icon has a visible text label.
- Color is never the only way information is shown.
- Price is read aloud with a word ("€€, moderate").
- Map markers are either focusable buttons with labels, or hidden from screen readers with the list as the alternative.

### 12. Library and tooling choices

- **Map:** react-leaflet with OpenStreetMap tiles. It needs no API key and is loaded with `dynamic(..., { ssr: false })` because Leaflet needs a browser. Credit OpenStreetMap as its usage policy requires.
- **Icons:** lucide-react.
- **Tests:** Vitest on logic only, no UI tests:
  - a table test with every distinct hours string
  - every raw tag either maps or is flagged
  - planner rules: no overlapping visits, every visit inside opening hours, travel time respected, every must-visit either scheduled or listed as unscheduled with a reason
  - loading and migrating saved favorites
- **Determinism:** the same favorites and start date always give the same itineraries.

### 13. The README probably counts as much as an extra feature

With no grading criteria, a reviewer judges what they can see. Unexplained gaps look like oversights. Reserve 25–30 minutes for a README that covers:

- what was built and the Browse / Shortlist / Plan model
- the data problems found and how each was handled
- what was cut and why
- next steps: Google Maps travel times, ranking within tiers, parsing seasonal notes, an offline LLM pass, the Managing stage

Add a `/data-quality` page or panel that lists issue counts and raw → cleaned values. It shows the cleaning work instead of hiding it.

### Ideal Final Result

Every pin, filter and plan comes from one cleaned dataset, built once, together with a list of every problem found in it. Components only see the narrow data they need. The planner is a pure, tested function. Travel time comes from coordinates already in the data, with a few overrides. Each itinerary states what it gave up and why. The 4 hours go into the planner and the UI, not into supporting code.

## Goals vs. Non-Goals

* **In-Scope Goals:**
  * Clean `italy.json` into a typed `Place` model with a list of data issues per record, shown in the UI.
  * List and map views that share one selection, with accessible category icons and text labels.
  * Filters by display category, tag group, price (1–4), and region/city, with a result count, a clear button and an empty state.
  * A 1–5 interest score and a separate must-visit flag for each place, saved under a versioned key in localStorage. Places with interest 1 can be hidden, and hiding can be undone.
  * Calendar picker for the trip start date, user-chosen daily start and end times, a fixed 3-day length kept as a parameter, and a must-visit feasibility check that runs first. An itinerary generator that reports unscheduled places with reasons and marks estimated data. One itinerary first, then several options that share all must-visits if time allows.
  * Travel time estimated from coordinates, behind an interface that can later call a real service.
  * Logic tests and a README explaining decisions and cuts.
* **Out-of-Scope Non-Goals:**
  * Creating, editing or deleting places. Data for other countries.
  * Merging two travelers' preferences. Budget limits.
  * Booking integration. Day-of navigation and notes (the "Managing" stage).
  * Calling Google Maps or any other travel-time API (interface only).
  * Calling an LLM while the app runs.
  * Parsing `seasonal_notes` into rules (shown as text only).
  * Drag-to-rank favorites. Map marker clustering. Saving filters in the URL. Syncing across tabs.
  * Editing an itinerary by hand. Users change favorites and generate again.
  * Calling an LLM, online or offline (revisit if time remains).

## Alternatives Weighed

* **One city per day instead of travel-time-based planning.** Rejected by author: the real constraint is travel time between places, not a rule about cities.
* **Server-side storage for favorites.** Rejected by author: localStorage is enough for a single-user demo.
* **A full hand-made travel-time table between all cities.** Rejected by author: about 120 pairs, mostly guesses, and it says nothing about travel inside a city. Replaced by estimates from coordinates.
* **A drag-to-rank favorites list.** Rejected by author: costly to build accessibly, and the planner only needs must-visit as a hard rule. Replaced by a 1–5 interest score plus a separate must-visit flag (decision 3).
* **Must / want / maybe / not-interested tiers with points (10 / 3 / 1 / -1).** Rejected by author: the tier names suggested that "must" places were guaranteed, but under linear points four "wants" outscore one "must". Replaced by a 1–5 interest score plus a separate must-visit flag that the planner guarantees.
* **LLM cleaning of hours and tags.** Rejected by author for now: the formats follow about 12 patterns, and an LLM adds an API key, results that vary between runs, and an outside dependency. To be revisited only if time remains.
* **Automatically merging similar tags and duplicate places.** Reviewers recommended against it: similar tags often mean different things, and merging places changes ids and breaks saved favorites. Replaced by an explicit tag map and duplicate flags. Pending author confirmation.
* **Several itineraries from random variation or named strategies.** Rejected by author: random variation produces near-copies, and named strategies cost more time than the box allows. Replaced by one option per cluster of favorites.
* **Cleaning the data once at build time and committing the output.** Rejected by author: the dataset is treated as if it came from an API. Results are cleaned when they are fetched and the cleaned result is cached, so the same code would work against a live source.

## Key Decisions & Staging for Next Steps

**Decided by author:**
1. **Stack:** Next.js, componentized around a typed model that never depends on the raw input shape.
2. **Storage:** favorites are saved in browser localStorage.
3. **User interest and must-visit (replaces the must / want / maybe / not-interested tiers):** two separate inputs per place.
   * **Interest:** 1 to 5, where 1 means "not interested" and 5 means "very interested". It is a soft preference: the planner tries to fit higher-interest places but promises nothing. A place with interest 1 can be hidden from the map and list. Hiding must be reversible: a "show hidden" control is needed so a hidden place can still be found again.
   * **Must visit:** an on/off flag. This is a hard guarantee: every must-visit place is in every itinerary option, or the planner refuses to build a plan and says which must-visits conflict and why (too far apart, closed on every trip day, more total time than the trip has).
   * **Decided:**
     * Interest is shown as hearts, not stars. The design may change later.
     * "Not rated" is a separate state from interest 1.
   * **Open:** what happens when a 1-interest place is marked must-visit. Default: marking a place must-visit raises its interest to 5.
   * **Must-visit feasibility check:** this runs first, before any itinerary is generated. If the must-visits cannot all be visited, the user gets an error naming the places that conflict and the reason. The check counts:
     * travel time between must-visits
     * each must-visit's own visit length (3 must-visits of 360 minutes or more cannot fit into 3 days with a 9:00–21:00 window, even with no travel)
     * whether each must-visit is open on at least one trip day
     
     Passing the check does not guarantee the planner can fit everything. The planner can still fail while packing days, so it needs the same error path.
4. **Place model and hours:** components that render places take one strongly typed interface. Required fields: name, location (coordinates plus city) and type. Optional fields: description, cost, rating, structured `openingHours`, and others. Hours that regular expressions can parse become typed `openingHours`, which can be filtered and checked by the planner. Anything else is kept as display-only text in a `timeDescription` field. A place without parsed hours is still shown on the map and list.
5. **Trip length:** fixed at 3 days for now, but kept as a parameter so it can be extended later. The 3-day itinerary comes first. A calendar range picker is deferred.
6. **Travel time:** estimated from coordinates. Google Maps may be added if time remains, mainly to check that locations are correct.
7. **Itinerary options:** every option contains every must-visit. Options differ only in the places chosen to fill the remaining time, grouped by location so each option has a clear geographic focus where the must-visits allow it.
8. **Ordering:** the user's interest score and must-visit flag decide priority, not the place's public rating. Within that, places are grouped by how close they are to each other.
9. **Data loading:** `italy.json` is treated as an API response. It is cleaned when fetched, around page load, and the cleaned result is cached.
10. **LLM:** dropped for now. Revisit only if time remains.
11. **Build and cut order:**
    1. show places on the map and list
    2. filtered search
    3. rate places by interest and mark must-visits
    4. generate one itinerary
    5. generate several itineraries from clusters
12. **Parse-or-fallback rule for optional fields:** every optional field that cannot be trusted as typed goes through regex parsing first.
    * If parsing succeeds, the value is stored as a typed field.
    * If it fails, the raw value is kept as a text description.
    
    One shared type covers this for every field, for example `Parsed<T> = { kind: 'typed', value: T } | { kind: 'text', raw: string }`. When a filter applies to a field that is only text:
    * the place is still shown, at the bottom of the results
    * it carries a warning label that the match may be inaccurate

13. **Planner scoring (first version, values to be tuned in testing):**
    * Must-visit places are placed first, as hard requirements (see decision 3).
    * The remaining time is filled to get the most total points. Points come from the interest score through a configurable map, so the values can be tuned (for example 2 → 1, 3 → 2, 4 → 4, 5 → 8). Interest-1 places are left out.
    * Each place takes its `duration_minutes` if that value parses to a valid whole number of minutes. Otherwise it takes 1 hour by default.
    * Letting the user change visit length per place is a later feature, not a requirement for this version.
    * The user picks the start and end time of their planning day. Defaults are 9:00 and 21:00. The planner uses whatever window the user chooses and makes no fixed assumption about hours for sleep or rest. Travel time counts against the window.
    * Interest points, default visit length and default day start and end times all live in one configuration object. A later view can then let the user change visit time place by place.

    **Review notes on this model:**
    * **No fast exact solution:** choosing places to maximize points within a time budget, including travel between them, is a hard problem. Plan to use a greedy approach: rank places by points per hour, including travel, and add them one at a time. Expect good plans, not provably best ones.
    * **Day window:** the user's chosen start and end times feed the planner, the must-visit feasibility check and opening-hours checks. A short window, for example 4 hours, can make a single long must-visit impossible, and the feasibility check must report that.

**Open questions raised by these decisions** (items 1, 2 and 5 are now decided by the author; 3 and 4 carry forward):
1. **Two phases with different rules:**
   * **Discover:** the user searches and filters all places, rates them by interest and marks must-visits. When a filter applies to a field that is only text, the place is shown at the bottom of the results with a warning label.
   * **Plan:** works only from favorites. Filters and search do not apply here.
     * Optional fields that are only text are treated as empty, as if not specified. For example, text-only hours mean no opening-hours limit.
     * Such places are flagged to the user on their itinerary stop.
     * They are not reordered or pushed to the end.
   
   Consequence: a place with text-only hours may be scheduled at a time when it is closed. The flag on the stop is the only protection against that, so it must be visible.
2. **Start date:** a single start-date picker plus a fixed 3-day itinerary. Trip length stays a parameter in the planner and data model so longer trips can be added without a redesign.
3. **Musts that are far apart:** must places in distant cities, such as Rome and Venice, end up in different clusters, so each option drops some musts. Each option has to state which places it drops.
4. **How clusters are formed and counted:** what distance cutoff or method groups places, and how many options are shown. Left for `/egm-draft`.
5. **Search:** a search box alongside the filters that matches name, tags and description, ignoring case and accents. Rank name matches above description matches, because descriptions often mention other places. For example, the Roman Forum's description mentions the Colosseum.
6. **Where cleaning and caching run:** on the server with Next.js fetch caching, or in the browser. Also decide what clears the cache.
7. **Records that fail validation:** a record missing a required field (name, coordinates, type) is rejected. A record with coordinates that look wrong, such as `place_059`, is kept but flagged.

**Proposed 4-hour schedule (from the review):**

| Time | Work |
|---|---|
| 0:00–0:20 | Next.js setup, copy in the JSON, add react-leaflet and lucide-react |
| 0:20–1:10 | `Place` model, `normalize()`, hours parser, tag and type maps, default durations, issue list, parser tests |
| 1:10–2:10 | List and map with shared filter and selection state; data-issue badges |
| 2:10–2:40 | Tiered favorites in localStorage |
| 2:40–3:30 | Start date and planner: choose cities, fill time slots, estimate travel, report unscheduled places with reasons |
| 3:30–4:00 | README: decisions, data findings, cuts, next steps |
