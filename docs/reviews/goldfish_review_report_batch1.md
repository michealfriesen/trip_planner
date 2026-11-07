Status: resolved

# Goldfish Annotated Review Report

**Target:** `docs/designs/italy_trip_planner.md` (full file, lines 1–856)

**Scope of this batch:** the items you gave direction on:
- B1, B2, B3 and B4
- the "Food" category (M16)
- the clustering question, which you resolved as multi-start greedy (M1, M8, M9)

All other consolidated items are left for a later batch.

**Your decisions applied:**
- **B1:** the travel leg between days is estimated with the current band formula and counted at the day boundary.
- **Clustering:** replaced with multi-start greedy, up to 3 options.
- **Food:** a display group made of Restaurant and Cafe.

## Prioritized Findings & AI Suggestions

### [Issue 1] [`egm-design`, `egm-zoom-out`, `egm-inventive-catalyst`, `egm-comprehension`] - Severity: Blocker (B1)
*   **Affected Scope:** [Lines 341–352](docs/designs/italy_trip_planner.md#L341-L352) (Plan API), [Lines 392–425](docs/designs/italy_trip_planner.md#L392-L425) (Planner), plus the `schedule.ts`, `improveRoute.ts` and `time.test.ts` rows.
*   **Discrepancy Description:** The doc never says where day N+1 starts. Travel between days costs nothing, so a Rome → Venice → Rome plan is not penalised. The MST bound assumes a single connected route.
*   **Rationale:** This is exactly the failure The Problem section says the app prevents.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** You chose to count the leg at the day boundary, using the current formula. I count it at the **start** of day N+1, because the traveler leaves in the morning. Counting it at the end of day N instead would need the same code with the opposite sign. With this rule the trip is one continuous route, so the MST lower bound stays valid. I also build the MST on estimated minutes instead of km, which keeps the bound valid however the travel bands behave.
*   ***Proposed Edit:***
    *   **Location:** Planner, new bullet after the Config list (before step 1).
        **Change:** add:
        > **Travel between days.** The trip is one continuous route. The first stop of day 1 has `travelMinutesBefore = 0`, because the traveler's start point is unknown. Every later day's first stop has `travelMinutesBefore` = the estimated travel from the previous non-empty day's last stop, using the same `TravelTimeEstimator`. This leg is counted at the start of that day: the first stop starts no earlier than `dayStart + travelMinutesBefore`. Insertion cost and the 2-opt pass include it. Inserting a place at the end of day d or the start of day d+1 changes the leg between days.
    *   **Location:** Planner step 2.4, the sub-bullet about the lower bound.
        **Change:** replace it with:
        > The lower bound on travel is the weight of a minimum spanning tree over the must-visits, with edges weighted by estimated travel minutes. Any continuous route that visits them all costs at least this much.
    *   **Location:** Planner step 5 (Improve routes).
        **Change:** add:
        > The previous day's last stop and the next day's first stop are fixed endpoints, so the legs between days are counted.
    *   **Location:** Plan API, `Stop` type.
        **Change:** add this comment after `travelMinutesBefore: number;`:
        > `// for a day's first stop: travel from the previous day's last stop; 0 on day 1`
    *   **Location:** `./src/lib/planner/schedule.ts` row.
        **Change:**
        - `tryInsert(day, place, position)` becomes `tryInsert(days, dayIndex, place, position)`.
        - Add: "recomputes times for that day and the first stop of the next non-empty day, since the leg between days may change".
    *   **Location:** `./tests/lib/plan.test.ts` row.
        **Change:** add the check:
        > when consecutive days end and start in different cities, the next day's first stop has `travelMinutesBefore > 0` and starts at or after `dayStart + travelMinutesBefore`
    *   **Location:** The Problem section (line 29).
        **Change:** none. The claim now holds.

### [Issue 2] [`egm-structural`, `egm-design`] - Severity: Blocker (B2)
*   **Affected Scope:** whole document. The section is missing between Technical Plan and Alternatives Considered.
*   **Discrepancy Description:** The standard requires a Risks & Mitigations section.
*   **Rationale:** Failure modes, security and scale limits are scattered through the doc or missing.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** A valid gap in the required structure.
*   ***Proposed Edit:***
    *   **Location:** new `## Risks and Mitigations` section, placed just before `## Alternatives Considered`.
        **Change:** insert:

```markdown
## Risks and Mitigations

| # | Risk | Category | Impact | Mitigation | Remaining risk |
| --- | --- | --- | --- | --- | --- |
| R1 | The data source returns 429/403/5xx or is unreachable. | Failure | No places, or a broken demo. | `getDataset()` throws on non-2xx, so Next.js keeps serving the last good copy. With no good copy, the page shows `DataUnavailable` with the status and a retry button. | The first load ever needs the source to be up. |
| R2 | The source is down while `next build` runs. | Failure | The build fails, because pages that use the data are prerendered. | Documented in the README. Rebuild when the source is back. | Accepted for a take-home. |
| R3 | Greedy insertion reports must-visits as not fitting when a valid plan exists. | Correctness | The traveler is told to drop a must-visit they could have kept. | The message says "could not find a plan", not "impossible", and suggests what to change. Multi-start runs reduce false failures for fill places. | False conflicts are still possible for must-visits. |
| R4 | Unparsed or missing hours are treated as open. | Correctness | A stop may be planned while the place is closed. | The stop carries an "assumed open" warning, and the raw text is shown. | The traveler must read the warning. |
| R5 | Suspect coordinates (`place_059`, about 155 km off) are used for travel time. | Correctness | One wrong long leg. | A "location may be wrong" label on the card and the stop. | Accepted. |
| R6 | A duplicate place is scheduled twice under two names. | Correctness | A wasted slot. | Known issue, noted in the README (see Non-Goals). | Accepted. |
| R7 | The clock-change error. Local `Date` arithmetic is off by up to one hour on the 2 clock-change nights. | Correctness | A stop near a clock change may be shifted by an hour. | Accepted. A test covers the date. | Accepted. |
| R8 | `POST /api/plan` has no authentication, and the request body has no size limit. | Security / cost | A large `prefs` object or repeated calls use CPU. | Reject bodies over 32 KB with 413. Ignore ids not in the dataset. The planner's work is bounded by dataset size × `maxSeeds`. | No rate limit, which is acceptable for a demo. |
| R9 | Dataset text is shown in the UI (HTML or script injection). | Security | XSS. | All text is rendered through React, which escapes it. Map popups are JSX, never `bindPopup(string)`. Nothing uses `dangerouslySetInnerHTML`. | None known. |
| R10 | OpenStreetMap tile usage policy. | Licence / ops | Tiles blocked for heavy use. | Show the required attribution. Demo traffic only. | Production use needs a tile provider. |
| R11 | opening_hours.js is LGPL-3.0. | Licence | Obligations if the library is modified or bundled. | It runs only on the server, unmodified, as a separate package (`serverExternalPackages`). | None for this use. |
| R12 | The planner's run time as the dataset grows. | Scalability | Greedy insertion is roughly O(stops × candidates × positions) per run, multiplied by the number of seeds. | Fine for 103 places. Beyond about 1,000 places, cap candidates by points and lower `maxSeeds`. | Not tested at scale. |
```

### [Issue 3] [`egm-implementation-readiness`, `egm-codebase-details`] - Severity: Blocker (B3)
*   **Affected Scope:** [Lines 704–714](docs/designs/italy_trip_planner.md#L704-L714) (Setup), plus the project and config file table.
*   **Discrepancy Description:** `npx create-next-app@latest trip-planner` either refuses to run, because the folder already contains `.md` files, or creates `trip-planner/trip-planner/`. The prompts are not answered, and the files the scaffold generates are not listed.
*   **Rationale:** The first build step fails.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** create-next-app only runs in an empty folder, apart from a few allowed names such as `docs` and `.git`. The repository root already holds `concepts_brief.md` and `design_draft.md`.
*   ***Proposed Edit:***
    *   **Location:** the Setup section, first bullet.
        **Change:** replace it with:
        > 1. Move `concepts_brief.md` and `design_draft.md` into `docs/`. create-next-app refuses a folder that contains other files.
        > 2. From the repository root, run `npx create-next-app@15 . --ts --eslint --app --src-dir --import-alias "@/*" --no-tailwind --use-npm --disable-git --no-turbopack`. The `.` scaffolds into the current folder instead of creating `trip-planner/trip-planner/`. The flags answer every prompt. If any prompt still appears, such as React Compiler, answer No.
        > 3. Delete `src/app/page.module.css` and `public/*.svg`. Keep `src/app/favicon.ico`, `next-env.d.ts` and `package-lock.json`.
    *   **Location:** the `./README.md` row.
        **Change:** set the action to `modify (scaffold creates it)`.

### [Issue 4] [`egm-codebase-details`, `egm-implementation-readiness`, `egm-design`, `egm-comprehension`] - Severity: Blocker (B4)
*   **Affected Scope:** [Lines 219–229](docs/designs/italy_trip_planner.md#L219-L229) (Data loading and failures), the `error.tsx` and `getDataset.ts` rows, and Verification step 2.
*   **Discrepancy Description:**
    - Server errors reach `error.tsx` in serialized form, so `instanceof` always fails. Production builds also hide the message.
    - Importing a class from a `server-only` file into a client component breaks the build.
    - `reset()` does not run the server fetch again.
*   **Rationale:** The "no data" screen cannot show the status, and its retry button does nothing.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** These are Next.js App Router facts. Catching the error in the server page keeps the status code available, because the page is still on the server when it catches it.
*   ***Proposed Edit:***
    *   **Location:** Data loading and failures, the third bullet ("If there has never been a successful load…").
        **Change:** replace it with:
        > If there has never been a successful load, `app/page.tsx` and `app/plan/page.tsx` catch `DataUnavailableError` and render `<DataUnavailable status={e.status} />`. This explains that the place data could not be loaded, shows the HTTP status (or "network error" when `status` is `null`), and offers "Try again", which calls `router.refresh()` to run the server fetch again. `app/error.tsx` stays as a generic fallback for any other error and does not show a status. The error must be caught in the page because Next.js serializes server errors before they reach `error.tsx`: the class is lost and production builds hide the message.
    *   **Location:** the file table, new row after `getDataset.ts`.
        **Change:** add:
        > `./src/lib/data/errors.ts` | create | `class DataUnavailableError extends Error { status: number \| null }`. It has no `server-only` import, so both server pages and client components can import it.
    *   **Location:** the `getDataset.ts` row.
        **Change:** "throws `DataUnavailableError(status)`" becomes "throws `DataUnavailableError(status)` (from `errors.ts`; `status` is `null` for a network error or bad JSON)".
    *   **Location:** the `page.tsx` and `plan/page.tsx` rows.
        **Change:** add "Wraps `getDataset()` in try/catch and renders `DataUnavailable` on `DataUnavailableError`."
    *   **Location:** the `error.tsx` row.
        **Change:** replace it with:
        > Generic client error boundary: "Something went wrong" and "Try again", which runs `startTransition(() => { router.refresh(); reset(); })`.
    *   **Location:** new row in the Discover UI table.
        **Change:** add:
        > `./src/components/DataUnavailable/*` | create | Client component. Shows the message, the status and a "Try again" button that calls `router.refresh()`.
    *   **Location:** Verification step 2, first sub-bullet.
        **Change:** "`error.tsx` shows the status" becomes "`DataUnavailable` shows the status, and Try again re-fetches".

### [Issue 5] [`egm-comprehension`, `egm-design`, `egm-structural`, `egm-style`, `egm-zoom-out`, `egm-implementation-readiness`, `egm-codebase-details`] - Severity: Major (M16)
*   **Affected Scope:** [Lines 53–56](docs/designs/italy_trip_planner.md#L53-L56) (G3), [Lines 119–127](docs/designs/italy_trip_planner.md#L119-L127) (CUJ 1), line 148 (CUJ 3), the Discover section, the `FilterBar` and `config.ts` rows, `filterPlaces.test.ts`, and Verification step 3.
*   **Discrepancy Description:**
    - There is no "Food" category.
    - "Pasta" in Rome matches only Eataly, which is a shop.
    - "Text-only field" is never defined.
    - The uncertain tier never triggers on real data.
*   **Rationale:** CUJ 1 cannot be followed.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** You defined Food as Restaurant + Cafe. I checked the data: Food + Rome + "pasta" still returns **0** results. Food + Rome + "carbonara" returns `place_009` Osteria Fernanda and `place_022` Roscioli Salumeria, so CUJ 1 can show both a filtered result and a count.
*   ***Proposed Edit:***
    *   **Location:** G3, first bullet.
        **Change:** "Filters cover category, tags, price and city." becomes:
        > Filters cover category, tags, price and city. Categories can be grouped for display. "Food" is Restaurant + Cafe.
    *   **Location:** G3, third bullet.
        **Change:** replace it with:
        > When the field a filter tests is missing or could not be parsed, the place is still shown below the confirmed matches, with a "may be inaccurate" label.
    *   **Location:** CUJ 1, When.
        **Change:** "type "pasta"" becomes "type "carbonara"".
    *   **Location:** CUJ 1, Then.
        **Change:** replace it with:
        > - The map and the list show only Rome restaurants and cafés whose name, tags or description match "carbonara": Osteria Fernanda and Roscioli Salumeria.
        > - The result count shows 2.
        > - No place in the dataset is missing its category, city or price, so the "may be inaccurate" group is empty here. That group is covered by tests with made-up records.
        > - Clearing the filters brings back every place.
    *   **Location:** CUJ 3, Then.
        **Change:** "text-only hours" becomes "unparsed or missing hours".
    *   **Location:** Discover, the `filterPlaces` bullet.
        **Change:** add:
        > The category filter works on display groups from `CATEGORY_GROUPS` in config: `Food = [Restaurant, Cafe]`. Every other category is its own group.
    *   **Location:** the `config.ts` row.
        **Change:** add "`CATEGORY_GROUPS`" to the data config list.
    *   **Location:** the `FilterBar` row.
        **Change:** "Category … checkboxes" becomes "Category-group … checkboxes (from `CATEGORY_GROUPS`)".
    *   **Location:** the `filterPlaces.test.ts` row.
        **Change:** "Category + city + search together (CUJ 1)" becomes "Food + Rome + "carbonara" returns exactly `place_009` and `place_022` (CUJ 1)".
    *   **Location:** Verification step 3, the CUJ 1 bullet.
        **Change:** replace it with:
        > CUJ 1: Food + Rome + "carbonara" (2 results; clearing the filters restores everything)

### [Issue 6] [`egm-zoom-out`, `egm-inventive-catalyst`, `egm-design`, `egm-codebase-details`, `egm-comprehension`] - Severity: Major (M1, M8, M9)
*   **Affected Scope:**
    - Overview (line 17)
    - G6
    - OQ6, OQ7 and OQ1
    - CUJ 3
    - the architecture diagram
    - Plan API `ItineraryOption.label`
    - Planner Config, steps 3, 4 and 6
    - Alternatives 23 and 24
    - the build-order table
    - the `config.ts`, `cluster.ts`, `buildOption.ts`, `plan.ts` and `OptionTabs` rows
    - `cluster.test.ts` and `plan.test.ts`
*   **Discrepancy Description:**
    - No Goal requires options.
    - The OQ6 chaining claim is false.
    - Options are likely to collapse into one.
    - The overlap formula and edge cases are undefined.
*   **Rationale:** Clustering adds code and a tuning question while the options it produces barely differ.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** You chose multi-start greedy:
    - Each run forces a different high-interest place into the plan first, then fills the rest greedily.
    - Forcing a distant place pays its travel once, so nearby places become cheap. This partly fixes greedy's short-sightedness, which was the only real argument for clusters.
    - Travel cost stays in the score, now including the leg between days (Issue 1).
    - Clustering, `clusterCutoffKm`, `focusMultiplier`, OQ6 and the cluster test are all removed.
*   ***Proposed Edit:***
    *   **Location:** Overview, Plan paragraph.
        **Change:** "it builds an itinerary that includes…" becomes "it builds up to 3 alternative itineraries. Each includes…".
    *   **Location:** G6 heading.
        **Change:** "A 3-day itinerary is generated…" becomes "Up to 3 alternative 3-day itineraries are generated…".
    *   **Location:** G6, second bullet.
        **Change:** replace it with:
        > It fills the remaining time by greedy insertion, ranking places by interest points per minute of visit and travel. Each alternative starts from a different high-interest place.
    *   **Location:** Open Questions.
        **Change:**
        - Delete OQ6.
        - Change OQ7 to: "**OQ7. Tuning the scoring.** The point values (Maybe 1, Very interested 4), `maxSeeds` (15) and the 70% overlap limit are first guesses."
        - Replace OQ1 with: "**OQ1. Making options differ.** Multi-start greedy: each run forces a different seed place in first. Up to 3 distinct options are kept. No clustering."
    *   **Location:** CUJ 3, first Then bullet.
        **Change:** "A 3-day plan is shown" becomes "Up to 3 alternative 3-day plans are shown, each".
    *   **Location:** Architecture diagram.
        **Change:** replace `lib/planner/cluster()` and `buildOption() x up to 3` with:
        > `lib/planner/buildOption() x (1 + seeds)` → `pickOptions()` (top 3 distinct)
    *   **Location:** Plan API.
        **Change:** `label` comment becomes `// "Best overall" or "Built around <seed place name>"`.
    *   **Location:** Planner Config.
        **Change:**
        - Remove the cluster cutoff.
        - Add "maximum seeds: 15".
        - Keep "maximum options: 3".
        - Overlap limit: 70%, measured as `|A∩B| / min(|A|,|B|)` over fill place ids.
    *   **Location:** Planner step 3.
        **Change:** replace it with:
        > 3. **Seeds.** Rank the fill candidates by points (high first), then by dataset `rating`, then by `id`. The first `maxSeeds` are the seeds. There is also one run with no seed, labelled "Best overall".
    *   **Location:** Planner step 4.
        **Change:**
        - Retitle it "Build one option per run".
        - Replace the focus-multiplier bullet with:
          > If the run has a seed, place it first at its best position, before greedy filling. If the seed does not fit, skip the run.
        - Score = `points / (visit minutes + extra travel minutes)`, where extra travel includes any change to legs between days.
        - Ties: higher dataset `rating`, then lower `id`.
    *   **Location:** Planner step 6.
        **Change:** replace it with:
        > 6. **Pick options.** Sort runs by total fill points (high first), then by label. Keep a run only if its fill-place overlap with every kept run is at most `optionOverlapLimit`. Stop at `maxOptions`. If there are no fill candidates, return one "Must-visits only" option. If only one option remains, the UI says the choices allow only one distinct plan.
    *   **Location:** Planner closing paragraph.
        **Change:** add:
        > With 103 places and 16 runs, each run is a full greedy fill, which is still well within a single request.
    *   **Location:** Alternative 23.
        **Change:**
        - Retitle it "Several itineraries from distance clusters".
        - Pros: options focus on clear areas.
        - Cons: single-link chaining (Florence → Chianti → Siena forms one group about 50 km long), a cutoff to tune, and every option shares the same must-visit days, so options collapse.
        - Reason: "Multi-start greedy gives different options using the same planner, with no tuning parameter."
    *   **Location:** Alternative 24.
        **Change:** the Reason becomes "Clustering was dropped; multi-start greedy is used instead (see Alternative 23)."
    *   **Location:** New Alternative 26, "One itinerary only".
        **Change:** add:
        - Pros: the least code.
        - Cons: one greedy run may never go to a far area, even when a group of places there is worth the trip.
        - Reason: "Multi-start reuses the planner and partly fixes this."
    *   **Location:** Build order, stage 5.
        **Change:** "Clusters, up to 3 options, removing repeats, 2-opt" becomes "Multi-start seeds, up to 3 options, overlap rule, 2-opt".
    *   **Location:** `config.ts` row.
        **Change:** remove `clusterCutoffKm` and `focusMultiplier`; add `maxSeeds: 15`.
    *   **Location:** `cluster.ts` row.
        **Change:** delete it.
    *   **Location:** `buildOption.ts` row.
        **Change:** the signature becomes `buildOption(mustDays, fills, seed \| null, ctx)`. Use the score above.
    *   **Location:** `plan.ts` row.
        **Change:** the steps become:
        > 1. candidates
        > 2. feasibility
        > 3. seeds
        > 4. build one option per run
        > 5. 2-opt
        > 6. pick options
    *   **Location:** `cluster.test.ts` row.
        **Change:** delete it.
    *   **Location:** `plan.test.ts` row.
        **Change:** "options overlap by no more than 70%" becomes "kept options overlap by no more than `optionOverlapLimit` (`|A∩B|/min`)", and add the check "a seeded option contains its seed".
    *   **Location:** `OptionTabs` row.
        **Change:** the tab label is `label` plus `points`.

## Not in this batch (still open from `consolidated_review_report.md`)

- M2: REST API vs Server Action
- M3: time budget and safe cuts
- M4: unparsed hours
- M5: seasonal notes
- M6: suspect coordinates
- M7: cleaning rules
- M10: render mode
- M11: scheduling rules and `PlanContext`
- M12: travel formulas and units
- M13: warning types
- M14: home files for types
- M15: filter contract
- M17: hours tests
- M18: time zones
- M19: determinism
- M20: claims in the Goals
- M21: terms
- M22: rejection rationales
- M23: versions
- M24: map component
- all Nits
