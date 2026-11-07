# Consolidated Review Report: Italy Trip Planner

**Target:** `docs/designs/italy_trip_planner.md` (856 lines)
- FeatureRange: lines 1–683
- DetailedRange: lines 684–856

**Preset:** Consolidated report, all review rubrics. The pipeline ran Stages 5 through 9 without stopping.

**Context:** `C:\Users\miche\Downloads\italy.json`

**Stage reports:**

| Stage | File |
|---|---|
| 5 | `zoom_out_report.md` |
| 6 | `comprehension_report.md` |
| 7 | `critic_report.md` |
| 8 | `intermediate_zoom_out_report.md` |
| 9 | `implementation_readiness_report.md` |

**Verdict:** Not ready to implement.

- 4 Blockers, 24 Majors and 9 grouped Nits remain after deduplication. They come from 183 raw findings.
- The data claims mostly match `italy.json`. Checked and confirmed: 103 records, 57 distinct hours strings, 16 cities, `place_059` about 156 km off, and the duplicate pairs.
- Two claims in the doc are false:
  - OQ6, the Bologna–Modena–Parma chaining.
  - CUJ 1, which uses a "Food" category that does not exist.

**Author decisions.** Items marked ⚖️ need an architecture choice from you. Each lists options without a ranking. All other items are mechanical fixes.

**Raw finding ID prefixes:**

| Prefix | Source |
|---|---|
| S5-Z | Stage 5 Zoom Out |
| S5-IC | Stage 5 Inventive Catalyst |
| S6-# | Stage 6 Comprehension |
| S7-D | Stage 7 Design |
| S7-S | Stage 7 Structural |
| S7-Y | Stage 7 Style |
| S8-Z8 | Stage 8 Zoom Out |
| S9-R | Stage 9 Readiness |
| S9-C | Stage 9 Codebase |
| S9-T | Stage 9 Style |

---

## 🔴 Blockers

### B1 ⚖️ Define how travel between days works

**Where:** Planner steps 2.4, 2.5 and 4; `Stop.travelMinutesBefore`; the Problem section; `tryInsert`.

**Problem:**
- Nothing says where day N+1 starts.
- If each day is planned on its own, a plan of Rome → Venice → Rome costs no travel between days. That is the failure the doc says the app prevents.
- The MST lower bound in step 2.4 assumes one connected route. If overnight moves are free, that check can wrongly reject a trip that fits.

**Options:**
- **(a) Continuous route.** Day N+1's first leg starts at day N's last stop and counts against day N+1's window. Insertion and 2-opt must take this link into account. Step 2.4 stays valid.
- **(b) Free overnight moves.** In step 2.4, subtract the (days − 1) longest MST edges. List "hotel moves are not modelled" as a Non-Goal and soften the Problem section.
- **(c) Home base.** Each day starts and ends at a single base point that the traveler picks or that is inferred from the must-visits. This needs a new input.

**Then:** add a test for whichever option you pick.

### B2 Add a Risks & Mitigations section

**Where:** the whole document. The section is required by the feature-spec standard.

**Fix:** add `## Risks & Mitigations` between Technical Plan and Alternatives. Use a table with the columns Risk | Category | Impact | Mitigation | Residual. It must at least cover:
- the data source failing or being rate-limited, which also fails the build (see M10)
- the daylight-saving error
- false "infeasible" results from greedy insertion
- duplicate places scheduled twice
- the LGPL licence: the library stays server-only
- no request size or key-count limit on `/api/plan`; cap the body at about 32 KB
- XSS: React escapes text, and popups must be JSX, never `bindPopup(string)`
- OSM tile attribution and usage policy
- O(n²) clustering beyond about 1,000 places
- planning on unparsed hours and suspect coordinates (see M4 and M6)

### B3 Fix the scaffold step

**Where:** line 704; the Files table.

**Problem:**
- `npx create-next-app@latest trip-planner` either refuses to run, because the folder already contains `.md` files, or creates `trip-planner/trip-planner/`.
- The interactive prompts are not answered.
- Files the scaffold generates are not listed.

**Fix:**
1. Move `concepts_brief.md` and `design_draft.md` into `docs/`.
2. Run:
   `npx create-next-app@<pinned> . --ts --eslint --app --src-dir --import-alias "@/*" --no-tailwind --use-npm --disable-git`
   and state the Turbopack and React Compiler choices.
3. Add keep/delete rows for each generated file:
   - delete `page.module.css` and `public/*.svg`
   - keep `favicon.ico`, `next-env.d.ts` and the lockfile
   - mark `README.md` as **Modify**

### B4 Data-failure UI cannot work as designed

**Where:** the `error.tsx` and `getDataset.ts` rows; Verification step 2.

**Problem:**
- Errors from server components reach `error.tsx` serialized, so `instanceof DataUnavailableError` is always false.
- Production builds hide the error message.
- Importing a class from a `server-only` module into a client component breaks the build.
- `reset()` does not run the server fetch again.

**Fix:**
- Put `DataUnavailableError` in `src/lib/data/errors.ts`, with no `server-only` import.
- In `page.tsx` and `plan/page.tsx`, catch the error and render `<DataUnavailable status={e.status} />`. Define what `status` holds when the failure is a network error.
- The retry button runs `startTransition(() => { router.refresh(); reset(); })`.
- `error.tsx` stays as a generic fallback.

---

## 🟡 Major

### Scope and architecture

**M1 ⚖️ Decide whether to offer multiple itinerary options.**
- **Problem:**
  - No Goal or CUJ requires options. G6, CUJ 3 and the Overview all describe a single itinerary.
  - Options bring in clustering, focus scoring, the 70% overlap rule, labels, tabs, OQ6 and OQ7.
  - Every option shares the same must-visit schedule, and a ×2 focus boost can't outweigh hours of travel, so the options are likely to collapse into one.
- **Options:**
  - **(a) One itinerary.** Move clustering and tabs to Future work, delete the related config, alternatives and tests, and give stage 5's time to stage 4.
  - **(b) Keep options, redefined as a per-day choice of cluster.** Days with must-visits are fixed; free days rotate through the top clusters.
  - **(c) Keep the current design.** Make the Overview, G6 and CUJ 3 say "up to 3 options", and define the edge cases in M9.

**M2 ⚖️ Decide whether the planner is a REST API.**
- **Problem:**
  - The time-zone reason for running on the server also applies to the browser.
  - The REST contract adds 4 status codes, validation, the 503 path and curl tests.
  - `validateRequest` has no access to the dataset, so it can't drop unknown ids.
  - `days` from 1 to 14 is speculative.
- **Options:**
  - **(a) Server Action:** `generatePlan(input)`.
  - **(b) Keep `POST /api/plan`.** State that the API boundary is something to show in the take-home. Drop unknown ids in `plan()`. Cap the body size. Remove `days`, or default it to `tripDays`.
  - **(c) Plan in the browser** using the precomputed weekly hours from M4(b).
- **In every case:** rewrite Alternative 21's rationale around bundle size, a single parse location and headless tests.

**M3 Fit the scope to the time budget, and make cuts safe.**
- **Problem:**
  - Stages 1 (70 min) and 4 (60 min) are overloaded.
  - The rule "cut from the end" contradicts the cut order.
  - Files are not assigned to stages.
  - Cuts break tests and the API: the overlap test, the `label` field, the "Only one distinct plan" copy, and the cluster test.
- **Fix:**
  - Add a Stage column to every file row, with the stub each stage uses.
  - Allow cuts from earlier stages: data-quality panel → uncertain tier → suspect-pin styling → stage-4 MST check.
  - For each cut, state what ships: label, copy and test changes.
  - Define "working" as `npm run build`, `lint` and `test` all passing.
  - State the smallest product that can ship.

### Data and cleaning

**M4 ⚖️ Stop treating unparsed hours as always open.**
- **Problem:**
  - `Evenings` (4 places), `Morning only` and `9am-12:30pm` can be scheduled at any time. This is the same flaw used to reject Alternative 6.
  - Every hours string is re-parsed for each date, which forces the local-`Date` workaround and its daylight-saving error.
- **Options:**
  - **(a) Alias table before parsing.** `Evenings`→`17:00-23:00`, `Morning only`→`07:00-12:00`, plus an am/pm regex. The result is `normalized` with an "interpreted as…" warning. Rewrite Alternative 8.
  - **(b) Option (a) plus precomputed weekly hours.** Evaluate each string once in `normalize` and store `weekly: [startMin,endMin][][7]`. This removes the `Date` trick, the daylight-saving test and the planner's runtime dependency on the library.
  - **(c) Keep "assumed open"**, but schedule unparsed fill places last and list the risk in B2.

**M5 Warn about seasonal closures.**
- **Problem:** at least 10 records say things like "Open April-October only", but the planner never shows `seasonal_notes`.
- **Fix:** add a `seasonal_note` `StopWarning` that displays the raw note text. No parsing needed.

**M6 ⚖️ Decide how suspect coordinates are used for planning.**
- **Problem:**
  - `place_059` is about 155 km from Milan. It joins the Isola della Scala cluster and adds a 2-hour leg.
  - The reason given for rejecting Alternative 13 (the Chianti example) is false: Chianti is about 21 km from Florence, under the 25 km threshold.
- **Options:**
  - **(a)** Use the city-centre coordinates for travel and clustering, keep the raw pin on the map, and keep the warning.
  - **(b)** Exclude suspect places from fill candidates.
  - **(c)** Keep the current behaviour and fix the Alternative 13 rationale.

**M7 Specify every cleaning rule and the raw field mapping.**
- **Problem:** there are no rules for price, booking, name or seasonal notes, and no raw→typed field names.
- **Fix:** add `RawPlace` (all fields `unknown`) and one rule line per field. For example:
  - `price_range`: a string of 1 to 4 `€` → `ok`; null → `missing` with `price_unknown`; anything else → `invalid`
  - `booking_required`: a boolean → `ok`; null → `missing` (`place_020`)
  - blank name → "Unnamed place"
  - empty strings → undefined
- **Also:** normalize tags with `_`→`-`. Only `local_favorite` uses an underscore.

**M8 Rewrite OQ6 and the cluster test with measured distances.**
- **Problem:** at 30 km, Bologna does not join Modena (about 37 km) or Parma (about 50 km). The chaining that actually happens is:
  - Florence → Chianti → Siena (29.45 km)
  - Como → Lenno → Bellagio
  - `place_059` → Isola della Scala
- **Fix:**
  - Restate OQ6 using these distances.
  - Name the real risk: moving the cutoff from 30 to 38 km merges Bologna with Modena.
  - Make `cluster.test.ts` assert the exact clusters.
- **Note:** if M1(a) is chosen, this item goes away.

### Planner contracts

**M9 Define the option and cluster edge cases.**
- **Fix:**
  - Overlap = `|A∩B| / min(|A|,|B|)`. Two empty sets count as 1.
  - Use one term everywhere: "deduplicating options (`optionOverlapLimit`)".
  - Cluster ties: points, then size, then smallest id.
  - Label rule: include a 2nd city only if it has at least ⅓ of the stops; format "A & B focus".
  - No fill places → one "Must-visits only" option.
  - Nothing rated → `options: []` and a link to Discover.
  - `points` counts fill places only.
- **Note:** if M1(a) is chosen, this item shrinks.

**M10 ⚖️ Decide the render and cache mode, and make Verification 2 something you can run.**
- **Problem:**
  - With `revalidate` set, `/` and `/plan` are prerendered at build time, so `next build` needs network access and fails on a 403 or 429.
  - Pointing `DATA_URL` at a 403 changes the cache key instead of making the entry stale.
  - The Next.js caching claims have no version or source.
  - The `normalize` memo has no key or fallback.
- **Options:**
  - **(a)** `export const revalidate = 3600`, and accept that the build fetches the data.
  - **(b)** `export const dynamic = 'force-dynamic'`, plus the fetch data cache.
  - **(c)** Option (a) or (b), plus a bundled snapshot fallback with a banner when no live load has ever succeeded.
- **Then:**
  - Test with a local mock server that can be switched to return 403, using `REVALIDATE_SECONDS=10` and `next build && next start`.
  - Cite the Next.js version and docs.
  - Remove the memo, or key it on the `Date` header with a `now()` fallback.

**M11 Specify the scheduling rules and `PlanContext`.**
- **Fix:**
  - Add `interface PlanContext { dates; windowStart; windowEnd; estimator; config; visitMinutes(); intervals() }`.
  - Pass `ctx` to `tryInsert` and `bestInsertion`.
  - State the rules:
    - how a day starts (per B1)
    - a stop may wait until its place opens
    - a visit must fit inside one opening interval
    - `unknown` intervals count as open, with a warning
    - travel is rounded up with `Math.ceil`
    - query intervals from day d to d+1 and clip them to the day window; `place_020` closes at 01:00
    - the `[from,to,unknown,comment]` interval shape is handled

**M12 Fix the travel-time formulas.**
- **Problem:**
  - The units are wrong: the formulas give hours, but the column says minutes.
  - The bands jump backwards: 2 km takes 31→15 min, and 50 km takes 140→55 min. Florence → Siena is about 50.4 km, right on the edge.
  - Because the minutes are not monotonic, the MST built on km is no longer a lower bound.
- **Fix:**
  - Use ×60 formulas, and note that 1.3 is a detour factor.
  - Make `estimate()` monotonic (take the minimum across modes, or join the bands at their edges).
  - Build the MST on minutes.
  - Define `travelBands: {maxKm, overheadMin, detour, kmh}[]` with `≤` at the band edge.
  - List the expected minutes at 0, 2, 2.01, 50 and 50.01 km.
  - Add a monotonicity test.

**M13 Unify the data-quality and warning types.**
- **Problem:**
  - `PlaceFlag` has no id flags.
  - `StopWarning` has 3 values that `FlagBadge` can't render, so this fails under `strict`.
  - `Unscheduled.location_unusable` is never produced.
  - The reason `too_far` can't be computed.
  - Data quality appears in 6 overlapping forms.
- **Fix:**
  - Add `id_missing | id_duplicate`.
  - Make `StopWarning` a subset of `PlaceFlag`, plus `seasonal_note`.
  - `FlagBadge` takes `flag` and a context (card or stop).
  - Drop `travel_estimated`; the timeline already labels travel times as estimates.
  - Remove `location_unusable` and `too_far`, or define them.
  - Derive `issues` from the flags.
  - Add a table of 15 label/title pairs.

**M14 Give every type a home file and a full definition.**
- **Fix:** put each type in a named file:
  - `Interest`, `PlacePref` and `StoredPrefs` → `src/lib/prefs/types.ts`
  - `FilterCriteria` → `filterPlaces.ts`
  - `interface PlannerConfig` → `config.ts`
  - `DataUnavailableError` → `errors.ts`
  - the `Cluster` type and the travel bands
- **Also:**
  - Show the Plan API types in a ```ts block.
  - Relax the rule that props come "from `@/lib/types` only".

**M15 Define the filter contract.**
- **Fix:**
  - `FilterCriteria = { categories, cities, prices, tags, query, showNotInterested }`, where an empty array means no filter on that field.
  - Values within a facet combine with OR; facets combine with AND.
  - Only `price` and a missing `city` can be "uncertain". `Unknown` matches only when it is selected.
  - When the query is empty, sort by name.
  - Only `DiscoverView` and `PlanView` call `usePreferences()`, and they pass the results down as props. Before `ready`, only the preference controls are disabled.

### Journeys, tests and claims

**M16 ⚖️ Fix CUJ 1 and the "uncertain match" tier.**
- **Problem:**
  - There is no "Food" category.
  - "Pasta" matches 3 records in total, and only one in Rome: `place_099` Eataly, which is a shop.
  - Rome + Restaurant + "pasta" returns 0 results.
  - No record has a missing type, city, price or tags, so the uncertain tier never triggers.
  - "Text-only field" is undefined.
- **Options:**
  - **(a)** Keep the tier as a defensive feature that only fixture tests reach. Rewrite CUJ 1 around a query that has several matches, such as Rome + tag `food` with no text.
  - **(b)** Drop the uncertain tier, along with its G3 wording and CUJ 1 bullet.
- **In both cases:**
  - Replace "text-only" with "the filtered field is missing or invalid".
  - Hard-code the expected ids in `filterPlaces.test.ts` and Verification step 3.

**M17 Make the hours-parsing claims checkable.**
- **Problem:**
  - "The 9 tricky cases" are never listed.
  - The parser mode in the code differs from the "tolerant" mode named in the text.
  - "54 of 57 unchanged" contradicts the `normalized` status.
  - G2's measure passes no matter what the code does.
- **Fix:**
  - List the 9 strings with their expected statuses and intervals. Include `8:00-01:00` and `Wed-Mon`.
  - Fix the constructor options.
  - Turn the 54/3 split into an assertion that fails on any new `unparsed` string.
  - Define "tolerant mode" and "24/7 default" in one sentence each.

**M18 Make time-zone handling deterministic.**
- **Problem:**
  - `new Date(y,m,d,h,min)` uses the time zone of the host. Your machine changes its clocks on 2027-03-14, not 2027-03-28. Vercel runs in UTC.
  - "Italian wall-clock" overclaims.
- **Fix:**
  - Set `test.env = { TZ: 'Europe/Rome' }` in Vitest, or remove the issue entirely with M4(b).
  - Expect `09:00-19:00` → `[540,1140]` on 03-27, 03-28 and 03-29.
  - State that production runs in UTC.
- **Note:** if M4(b) is chosen, this item mostly goes away.

**M19 Make "deterministic" true and testable.**
- **Fix:**
  - Specify every tie-break:
    - insert must-visits longest first, then by `id`
    - after `rating`, break remaining ties by lower `id`
    - cluster ties as in M9
  - Test by shuffling the input order, not by running the same input twice.
  - Check hours compliance against hand-written expected intervals (for example the Colosseum and `place_059`), not against the scheduler's own `openIntervals`.

**M20 Calibrate claims in the Goals.**
- **Fix:**
  - G5: "No itinerary omits a must-visit. If they cannot all be placed, no itinerary is shown and the conflicts are named." Greedy placement can fail, so "guaranteed" overclaims.
  - G6: "fills remaining time by greedy insertion ranked by points per minute", not "most points".
  - G3: drop "quickly".
  - Add Measures to G3, G4, G7 and G8.
  - Measure or drop "under 10 ms".
  - Write "Italy's bounding box", not "inside Italy".

**M21 Separate "rating" from "interest", and add a glossary.**
- **Fix:**
  - Use "interest" for the traveler's choice and "rating" only for the dataset's stars.
  - Pick one term each for:
    - itinerary / option / plan
    - text-only / uncertain / unparsed / invalid
    - Step 6 / Stage 6

**M22 Rewrite the rejection rationales as trade-offs.**
- **Fix:** Alternatives 1, 11, 14, 15, 21, 23 and the line-532 alternative restate the decision instead of giving the trade-off that decided it. Drop the "Rejected by author:" prefix on all 25.

**M23 Pin versions and dependencies.**
- **Fix:**
  - `opening_hours@3.15.0`, `react-leaflet@5` (React 19), `leaflet@1.9`, and pinned `lucide-react` and `vitest`.
  - Record the Next.js and React versions.
  - Add `server-only`, and alias it to an empty module in Vitest (otherwise it throws).
  - Define the `@` alias through `resolve.alias`.

**M24 Specify the map component.**
- **Problem:** `MapContainer` props are fixed after the first render. `fitBounds([])` throws, and fitting a single point zooms all the way in.
- **Fix:**
  - Add a `FitBounds` child that uses `useMap()`. With 0 points, use Italy's bounds. With 1 point, use `setView` at a stated zoom.
  - Default view: Italy at zoom 6.
  - Give the tile URL and attribution.

---

## 🟢 Nits (grouped)

- **N1. Document structure:**
  - Split Open Questions into Open and Resolved, in ascending order.
  - Add anchor links for cross-references.
  - Use H4 headings for the planner steps instead of "step 2.5".
  - Fix the garbled Alternative 5 heading.
  - List all five feasibility stages; only three bullets are shown.
- **N2. Component details:**
  - `AppNav` needs `'use client'`.
  - Add a `CategoryIcon` table.
  - `PlaceCard` hours use `HoursValue`.
  - `InterestControl`: use `aria-pressed` toggles or an explicit "Unrated" option, since radios can't be cleared. Use two `Heart` icons with a text label.
  - Define keyboard behaviour (Tab, Space, Enter, focus order).
  - `ConflictList` links have no destination.
- **N3. Planner extras:**
  - Feasibility stage 4 duplicates stage 5.
  - Scoring favours short "Maybe" places; add this to OQ7.
  - A single greedy pass can report false conflicts; retry a few fixed orders.
  - Remove the unreachable `location_unusable` layers.
- **N4. Data extras:**
  - Flag `possible_duplicate` for identical coordinates (018/077, 030/031).
  - List the 16 `CITY_CENTRES` coordinates.
  - Default a past start date to today.
- **N5. Tests and fixtures:**
  - Add `makeRawPlace` for synthetic missing or out-of-box records.
  - Spell out the preference fixture.
  - Name the fixture source and keep it byte-identical.
  - Add conflict message templates.
  - Add scenarios for `not_enough_total_time` and `cannot_schedule_together`.
- **N6. Config:**
  - Move the 150 ms debounce into `config.ts`.
  - Remove the config keys that M1(a) makes unnecessary.
- **N7. Technical Plan code-level detail:** move `normalize('NFD')`, the `Date` constructor and swap counts into the file tables.
- **N8. Wording, FeatureRange:**
  - self-praise ("clean, componentized")
  - "several hours" → about 4 h
  - give counts in the Problem section
  - "Trip length" instead of "Travel defaults"
  - remove caveats that have no decision
  - use the dataset's names (Trastevere Neighborhood, Hard Rock Cafe Rome)
  - "any dataset" overclaims
  - MST is described twice
  - "at most 36 stops"
  - Alternatives wording: lines 472, 559, 597, 641 and 679
- **N9. Wording, DetailedRange, and both ranges:**
  - "no special card code", "another dataset works", "bundling unreliable" and "makes G7 true" overclaim
  - "nothing renders before ready" is too broad
  - "simple" and "typed boundary" are filler or jargon
  - network error vs response
  - the memo sentence is out of order
  - the docs row says "update at Step 6"
  - mixed British and US spelling and uneven contractions across the document

---

## Suggested order of work

1. **Decide the ⚖️ items first.** B1, M1, M2, M4, M6, M10 and M16. These decisions remove or reshape M8, M9, M18 and parts of M3.
2. **Fix the Blockers.** B2, B3 and B4.
3. **Fix the remaining Majors** by section: data, planner contracts, then tests and claims.
4. **Fix the Nits** last. Many disappear along with features that are dropped.

---

## Traceability matrix

| Raw finding | Consolidated |
|---|---|
| S5-Z-M1 | M1 |
| S5-Z-M2 | B1 |
| S5-Z-M3 | M3 |
| S5-Z-M4 | M16 |
| S5-Z-M5 | M2 |
| S5-Z-N1 | N3 |
| S5-Z-N2 | M13, N3 |
| S5-Z-N3 | M13 |
| S5-Z-N4 | M10 |
| S5-Z-N5 | N7 |
| S5-Z-N6 | M2 |
| S5-Z-N7 | M18 |
| S5-Z-N8 | N6 |
| S5-Z-N9 | M10 |
| S5-IC1 | B1 |
| S5-IC2 | M4, M18 |
| S5-IC3 | M10 |
| S5-IC4 | M1 |
| S5-IC5 | N3 |
| S5-IC6 | N4 |
| S5-IC7 | M4 |
| S6-1 | M1 |
| S6-2 | B1 |
| S6-3 | M21 |
| S6-4 | M16 |
| S6-5 | M16 |
| S6-6 | M17 |
| S6-7 | M17 |
| S6-8 | M13 |
| S6-9 | M9 |
| S6-10 | M13 |
| S6-11 | M9 |
| S6-12 | M2 |
| S6-13 | B4 |
| S6-14 | M18 |
| S6-15 | M21 |
| S6-16 | N8 |
| S7-D-B1 | B1 |
| S7-D-M1 | B2 |
| S7-D-M2 | M12 |
| S7-D-M3 | M4 |
| S7-D-M4 | M6 |
| S7-D-M5 | M8 |
| S7-D-M6 | M16 |
| S7-D-M7 | M2 |
| S7-D-N1 | M19 |
| S7-D-N2 | B4 |
| S7-D-N3 | M10 |
| S7-D-N4 | M7 |
| S7-D-N5 | N3 |
| S7-D-N6 | M9 |
| S7-D-N7 | N4 |
| S7-D-N8 | M17 |
| S7-D-N9 | M22 |
| S7-S-B1 | B2 |
| S7-S-M1 | M22 |
| S7-S-M2 | M12 |
| S7-S-M3 | M13 |
| S7-S-M4 | M13 |
| S7-S-M5 | M16 |
| S7-S-N1 | N1 |
| S7-S-N2 | M20 |
| S7-S-N3 | N1 |
| S7-S-N4 | N1 |
| S7-S-N5 | M14 |
| S7-S-N6 | N1 |
| S7-S-N7 | M22 |
| S7-Y-M1 | M20 |
| S7-Y-M2 | M20 |
| S7-Y-M3 | M17 |
| S7-Y-M4 | M20 |
| S7-Y-M5 | M16 |
| S7-Y-M6 | M16 |
| S7-Y-M7 | M20 |
| S7-Y-M8 | M10 |
| S7-Y-M9 | M20 |
| S7-Y-M10 | M17 |
| S7-Y-M11 | M12 |
| S7-Y-M12 | M19 |
| S7-Y-M13 | M22, M2 |
| S7-Y-N1 to S7-Y-N5 | N8 |
| S7-Y-N6 | N8, M1 |
| S7-Y-N7 to S7-Y-N17 | N8 |
| S8-Z8-M1 | M5 |
| S8-Z8-M2 | M13 |
| S8-Z8-M3 | M3 |
| S8-Z8-M4 | M16, M17, M19 |
| S8-Z8-N1 | M2 |
| S8-Z8-N2 | M13 |
| S8-Z8-N3 | M15 |
| S8-Z8-N4 | N2 |
| S8-Z8-N5 | M9 |
| S8-Z8-N6 | M21 |
| S8-Z8-N7 | N4 |
| S8-Z8-N8 | M20 |
| S9-R-B1 | B3 |
| S9-R-M1 | B3, M23 |
| S9-R-M2 | M3 |
| S9-R-M3 | M10 |
| S9-R-M4 | B4 |
| S9-R-M5 | M7 |
| S9-R-M6 | M15 |
| S9-R-M7 | M16 |
| S9-R-M8 | M14, M15 |
| S9-R-M9 | M11 |
| S9-R-M10 | M11, B1 |
| S9-R-M11 | M12 |
| S9-R-M12 | M18 |
| S9-R-M13 | M9 |
| S9-R-M14 | M13 |
| S9-R-M15 | M17 |
| S9-R-N1 | N4 |
| S9-R-N2 | M10 |
| S9-R-N3 | M23 |
| S9-R-N4 | N2 |
| S9-R-N5 | M24 |
| S9-R-N6 | N2 |
| S9-R-N7 | N2 |
| S9-R-N8 | M2 |
| S9-R-N9 | N5 |
| S9-R-N10 | N5 |
| S9-R-N11 | M21, N9 |
| S9-C-B1 | B4 |
| S9-C-2 | B4 |
| S9-C-3 | M10 |
| S9-C-4 | M8 |
| S9-C-5 | M10 |
| S9-C-6 | M18 |
| S9-C-7 | B3 |
| S9-C-8 | M23 |
| S9-C-9 | M16 |
| S9-C-10 | M7 |
| S9-C-11 | M17 |
| S9-C-12 | M2 |
| S9-C-13 | M14 |
| S9-C-14 | N9, M14 |
| S9-C-15 | B3 |
| S9-C-16 | M24 |
| S9-C-17 | M11 |
| S9-C-18 | M10 |
| S9-C-19 | M23 |
| S9-C-20 | M23 |
| S9-C-21 | N2 |
| S9-C-22 | N2 |
| S9-C-23 | N5 |
| S9-C-24 | N5 |
| S9-T-M1 | M3 |
| S9-T-M2 | M3 |
| S9-T-M3 | M9 |
| S9-T-M4 | N1 |
| S9-T-M5 | N8 |
| S9-T-M6 | M18 |
| S9-T-M7 | N9 |
| S9-T-M8 | N9 |
| S9-T-M9 | N9 |
| S9-T-M10 | N9 |
| S9-T-M11 | M17 |
| S9-T-M12 | M21 |
| S9-T-M13 | M15, N9 |
| S9-T-M14 | N2 |
| S9-T-N1 to S9-T-N9 | N9, N6 (T-N3) |
