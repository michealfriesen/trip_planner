Status: resolved

# Goldfish Annotated Review Report (batch 2)

**Target:** `docs/designs/italy_trip_planner.md` (877 lines, after batch 1)

**Scope of this batch:** M2, M4, M6 and M10.

**Your decisions applied:**
- **M2:** (a) a Server Action replaces `POST /api/plan`.
- **M4:** (c) keep "assumed open", with no hand-written overrides. Places with unparsed hours are scheduled last, logged on the server, and the traveler is told the times may be wrong.

- **M6:** plan with the raw latitude and longitude, warn the traveler, and never plan places outside Italy.

- **M10:** (c) a bundled snapshot fallback with a notice that the live load failed. It sits on per-request pages with a cached fetch (see Issue 4 for why neither (a) nor (b) works as written). The batch 1 report is saved as `goldfish_review_report_batch1.md`.

## Prioritized Findings & AI Suggestions

### [Issue 1] [`egm-zoom-out`, `egm-design`, `egm-implementation-readiness`] - Severity: Major (M2)
*   **Affected Scope:**
    - Technical Plan Summary (lines 178–184) and the architecture diagram
    - Plan API (lines 332–356)
    - Plan UI (line 431)
    - R8 (line 459)
    - Alternative 21 (lines 653–661)
    - Build order stage 4
    - The `validateRequest.ts`, `route.ts` and `PlanView` rows
    - `validateRequest.test.ts`
    - Verification step 5
*   **Discrepancy Description:** The REST contract adds 4 status codes, the 503 path and curl tests, and there is only one caller. `validateRequest` has no access to the dataset, so it cannot drop unknown ids as the doc claims.
*   **Rationale:** This is code and contract surface that the 4-hour time box does not need.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** You chose (a). These are the trade-offs a Server Action brings, and how the edits handle each one:
    1.  **It is still a public endpoint.** Next.js exposes every Server Action as a POST that anyone holding the action id can call. Input validation stays, and R8 still applies.
    2. **Thrown errors are hidden in production builds.** The client only receives a generic error. Every expected outcome (infeasible, bad input, no data) must therefore be **returned** as a typed result, never thrown.
    3. **The body size limit moves.** Server Actions accept 1 MB by default. The 32 KB cap moves to `experimental.serverActions.bodySizeLimit` in `next.config.ts`. I have not checked that this key still exists in Next.js 15, so check it during setup.
    4. **The curl smoke test goes away.** An action has no stable URL. The automated tests cover `plan()` and `validateRequest()` directly, and the action itself is a thin wrapper around them.
    5. **Unknown ids are dropped in `plan()`,** which has the dataset, not in `validateRequest()`, which does not.
*   ***Proposed Edit:***
    *   **Location:** Technical Plan Summary, Planner bullet.
        **Change:** "A route handler, `POST /api/plan`, receives…" becomes:
        > A Server Action, `generatePlan(input)` in `app/plan/actions.ts`, receives the trip settings and the traveler's choices.

        Then "It then returns either up to 3 itinerary options or a list of named conflicts." becomes:
        > It returns a typed result: up to 3 itinerary options, a list of named conflicts, or an error. It never throws for an expected outcome.
    *   **Location:** Architecture diagram.
        **Change:**
        - `app/api/plan/route.ts` becomes `app/plan/actions.ts  generatePlan()`.
        - `-- conflicts --> 422` becomes `-- conflicts --> { status: 'infeasible' }`.
        - `--> 200 PlanResponse` becomes `--> { status: 'ok' }`.
        - `TripForm --POST /api/plan-->` becomes `TripForm --generatePlan()-->`.
    *   **Location:** The `### Plan API` heading and code block.
        **Change:** rename it to `### Plan action`. Replace the first lines of the block with:
        > ```text
        > 'use server'  generatePlan(input: unknown): Promise<PlanResult>
        > input        PlanRequest  { startDate: 'YYYY-MM-DD', days: number (default 3, 1–14),
        >                             dayStart: 'HH:mm', dayEnd: 'HH:mm',
        >                             prefs: Record<placeId, { interest?: Interest; mustVisit: boolean }> }
        > PlanResult   { status: 'ok', options: ItineraryOption[] }
        >            | { status: 'infeasible', conflicts: Conflict[] }
        >            | { status: 'bad_request', message }       // invalid dates/times, dayEnd <= dayStart
        >            | { status: 'data_unavailable', message }  // dataset never loaded
        > ```
        Keep the `ItineraryOption` … `Conflict` lines as they are. Replace the sentence after the block with:
        > `generatePlan` runs `validateRequest(input)` first, because an action is a public POST endpoint like any other. Request validation is written by hand, with no schema library. `plan()` drops place ids that are not in the dataset. Every expected outcome is returned, not thrown, because Next.js hides the message of a thrown action error in production.
    *   **Location:** Plan UI, the `ConflictList` and `OptionTabs` bullets.
        **Change:** "shows a 422 response" becomes "shows an `infeasible` result". "A 200 response is shown as" becomes "An `ok` result is shown as". "On submit, it sends the request" becomes "On submit, it calls `generatePlan` with the trip settings and".
    *   **Location:** R8.
        **Change:** Risk becomes:
        > The `generatePlan` Server Action is a public POST endpoint with no authentication.

        Mitigation becomes:
        > `experimental.serverActions.bodySizeLimit: '32kb'` in `next.config.ts`. `validateRequest` checks the input. `plan()` ignores ids not in the dataset. The planner's work is bounded by dataset size × `maxSeeds`.
    *   **Location:** Alternative 21.
        **Change:**
        - Pros: "Plans instantly, with no endpoint to build." becomes "Plans instantly, with no server round trip."
        - Cons: replace the time-zone bullet with:
          > The planner would have to parse hours in a second place, the browser. Testing it would need a browser-like environment instead of plain Node.
        - Reason becomes:
          > Rejected by author: the planner runs on the server behind a Server Action. That keeps opening_hours.js out of the browser bundle and keeps hours parsing in one place, and the tests run in plain Node.
    *   **Location:** New Alternative 27, after Alternative 26.
        **Change:** add:
        > #### Alternative 27: A REST endpoint, `POST /api/plan`
        > *   **Pros:**
        >     *   A stable URL that curl or another client can call.
        >     *   HTTP status codes for each outcome.
        > *   **Cons:**
        >     *   There is only one caller, the Plan view.
        >     *   It needs 4 status codes, client-side `fetch` and response parsing, and its own tests.
        > *   **Reason for Rejection:** Rejected by author: a Server Action gives the same server-side planner with less code. The planner is a pure function, so an endpoint can be added later around `plan()`.
    *   **Location:** Build order, stage 4.
        **Change:** "Plan API, feasibility check, …" becomes "Plan action, feasibility check, …".
    *   **Location:** The `#### Plan API and planner (server)` heading.
        **Change:** it becomes `#### Plan action and planner (server)`.
    *   **Location:** The `validateRequest.ts` row.
        **Change:** "Unknown place ids are dropped." becomes "Unknown place ids are left for `plan()` to drop, because it has the dataset."
    *   **Location:** The `plan.ts` row.
        **Change:** step 1 becomes "build candidates (dropping ids that are not in the dataset)".
    *   **Location:** The `route.ts` row.
        **Change:** replace it with:
        > `./src/app/plan/actions.ts` | create | `'use server'`. `generatePlan(input: unknown): Promise<PlanResult>`:<br>• invalid input → `bad_request`<br>• `getDataset()` throws → `data_unavailable`<br>• `plan()` is infeasible → `infeasible`<br>• otherwise `ok`<br>Never throws for these cases.
    *   **Location:** The `next.config.ts` row.
        **Change:** add "and `experimental.serverActions.bodySizeLimit: '32kb'` (R8)".
    *   **Location:** The `planner/types.ts` row.
        **Change:** `PlanResponse` becomes `PlanResult`.
    *   **Location:** The `PlanView` row.
        **Change:**
        - "POSTs to `/api/plan`" becomes "calls `generatePlan` inside `useTransition`".
        - "Handles the 200, 422, 400/503 and network-error responses. The 400/503 and network errors are shown as…" becomes "Handles each `PlanResult` status, plus a thrown error (network failure or server crash). `bad_request`, `data_unavailable` and thrown errors are shown as…".
    *   **Location:** Verification step 5.
        **Change:** replace it with:
        > 5.  **Plan action check:** in `npm run dev`, generate a plan for each case: a valid trip gives options, `dayEnd` before `dayStart` gives the inline error, and a must-visit that cannot fit gives the conflict list. The same cases are covered headlessly by `plan.test.ts` and `validateRequest.test.ts`.
    *   **Location:** Verification step 4, keyboard pass.
        **Change:** none.

### [Issue 2] [`egm-design`, `egm-inventive-catalyst`, `egm-comprehension`] - Severity: Major (M4)
*   **Affected Scope:**
    - CUJ 3 (line 147)
    - Planner step 2.3 (line 402), step 3 (Seeds) and step 4
    - Plan UI
    - R4 (line 455)
    - Alternative 8 (lines 533–539)
    - The `normalize.ts`, `buildOption.ts`, `OptionTabs` and `StopCard` rows
    - `normalize.test.ts` and `plan.test.ts`
*   **Discrepancy Description:** Places with unparsed or missing hours can be scheduled at any time of day. `Evenings` can land at 9:00.
*   **Rationale:** This is the same flaw that was used to reject Alternative 6.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** You chose (c) and rejected aliases because they only cover strings seen today. A new format would fall through to "unparsed" anyway, so the general rule has to be safe on its own. Before you accept, these are the limits:
    1.  **"Last" changes how often these places are scheduled, not where they land in the day.** If a place with unparsed hours does get scheduled, it can still land at a time when it is closed. The warning is the only protection there. R4 stays open.
    2.  **The logs are for the operator, not the traveler.** Alternative 4 was rejected because logs replaced UI warnings. Here the logs are in addition to the UI warnings. Each log line names the place id and the raw text, so a developer can see which formats to support next.
    3.  **Must-visits are not deprioritized.** They are guaranteed, so a must-visit with unparsed hours is still placed, with a warning.
    4.  **The second half of M4 is not fixed by this.** Hours are still re-parsed for each date, so the local-`Date` workaround and R7 (the clock-change error) remain.
*   ***Proposed Edit:***
    *   **Location:** Planner step 3 (Seeds).
        **Change:** add:
        > Seeds are drawn only from fill candidates with `parsed` or `normalized` hours, so an option is never built around a place whose hours are unknown.
    *   **Location:** Planner step 4, after "Rounds stop when nothing more fits."
        **Change:** add:
        > *   **Unknown hours go last.** Greedy filling runs in two passes. The first pass uses only fill candidates with `parsed` or `normalized` hours. The second pass then offers the remaining candidates, whose hours are `unparsed` or `missing`, to the time that is left. In that pass they count as open, and the stop gets `hours_unparsed_assumed_open` or `hours_missing_assumed_open`.
    *   **Location:** Planner step 2.3.
        **Change:** "Unparsed or missing hours count as open, and the stop gets a warning." becomes:
        > Unparsed or missing hours count as open, and the stop gets a warning. Must-visits are not moved to the second pass, because they are guaranteed.
    *   **Location:** Typed model, Cleaning rules, the Hours bullet.
        **Change:** add a sub-bullet:
        > Each `unparsed` value is logged on the server once per successful fetch: `console.warn('[hours] unparsed', { placeId, raw })`. Missing hours are logged as one summary line with the count. The log tells the operator which new formats appear in the data. The UI warnings still apply (see Alternative 4).
    *   **Location:** Plan UI, after the stop-warnings bullet.
        **Change:** add:
        > *   If an option has any stop with an `…assumed_open` warning, it shows a notice above the days: "N stops use opening hours we could not read. These times may be wrong. Check them before you go." The `StopCard` for each of those stops shows the raw hours text next to its warning.
    *   **Location:** CUJ 3, Then.
        **Change:** after the warning bullet, add:
        > *   If any stop uses hours that could not be read, a notice above the plan says those times may be wrong.
    *   **Location:** R4.
        **Change:** Mitigation becomes:
        > They are filled only after every place with known hours has been tried. They are never seeds. Each such stop carries an "assumed open" warning with the raw text. The option shows a notice that times may be wrong. The server logs each unparsed string with its place id.

        Remaining risk stays: "A stop may still be placed when the place is closed. The traveler must read the warning."
    *   **Location:** Alternative 8.
        **Change:**
        - Retitle it "Rewriting hours into OpenStreetMap syntax, or mapping known phrases, before calling opening_hours.js".
        - Add a con: "A table of phrases such as `Evenings` → 17:00–23:00 only covers strings seen today. New entries fall through to unparsed anyway."
        - Reason becomes: "Rejected by author: hand-written overrides break as the data changes. The library's tolerant mode handles `Mon`, `Tues`, `Daily` and `8am`. What it cannot read is kept as text, flagged, logged and scheduled last."
    *   **Location:** The `normalize.ts` row.
        **Change:** add "Logs each `unparsed` hours value (place id and raw text) and one count of `missing` hours, once per call."
    *   **Location:** The `buildOption.ts` row.
        **Change:** add "Fills in two passes: places with known hours first, then places with unparsed or missing hours. Seeds come only from places with known hours."
    *   **Location:** The `OptionTabs` row.
        **Change:** add "Shows the 'times may be wrong' notice when any stop in the option has an `…assumed_open` warning."
    *   **Location:** The `StopCard` row.
        **Change:** add "Shows the raw hours text next to an `…assumed_open` warning."
    *   **Location:** `normalize.test.ts`.
        **Change:** add the check "`console.warn` is called with `place_037` and `Evenings`".
    *   **Location:** `plan.test.ts`.
        **Change:** add these checks:
        > • with made-up places, a place with unparsed hours is scheduled only when no place with known hours still fits<br>• no seed has unparsed or missing hours

### [Issue 3] [`egm-design`, `egm-zoom-out`] - Severity: Major (M6)
*   **Affected Scope:**
    - Planner step 1 (Candidates)
    - R5
    - Alternative 13 (lines 579–586)
    - `plan.test.ts`
*   **Discrepancy Description:**
    - `place_059` is about 155 km from Milan, its listed city, and the planner uses its coordinates for travel.
    - Alternative 13's reason for rejection is false: Chianti is about 21 km from Florence, under the 25 km threshold, so it is never flagged.
*   **Rationale:** The planner's rule for suspect places is implied, not stated, and one rejection rests on a wrong fact.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** You chose to plan with the raw latitude and longitude. Suspect places stay fill candidates and seeds, with a warning. Places outside Italy are excluded. This matches the current behaviour (option c), so the edits make it explicit and fix the false reason. Before you accept, these are the limits:
    1.  **Neither source is known to be right.** `place_059`'s coordinates sit near Verona, while its city says Milan. Coordinates are more specific than a city label, so they are the better guess. But if they are wrong, every leg to that stop is wrong by about 2 hours, and the warning is the only protection.
    2.  **A suspect place can be a seed.** That can produce an option labelled "Built around <a suspect place>", whose whole day is shaped by a location that may be wrong. The stop warning shows on that option, but the label does not.
    3.  **"Outside Italy" is a bounding box,** lat 35.4–47.1, lon 6.6–18.6. It also takes in parts of Slovenia, Croatia, Switzerland and Tunisia's coast. A record placed there would count as in Italy. You accepted this for the project's scope, as long as the check can be swapped for an accurate one later. The edits put it behind one function, so a real border check (for example a GeoJSON outline of Italy) replaces only that function.
*   ***Proposed Edit:***
    *   **Location:** Planner step 1, the "Fill places are…" bullet.
        **Change:** add:
        > A `suspect` location is used as given, with its raw latitude and longitude. It can be a fill place or a seed, and its stop gets the `location_suspect` warning. An `unusable` location (missing coordinates, or outside the Italy box) is never planned. As a fill place, it goes to `unscheduled` with `location_unusable`. As a must-visit, it is a `location_unusable` conflict.
    *   **Location:** R5.
        **Change:** Mitigation becomes:
        > Raw coordinates are used because they are more specific than the city label. The card and the stop show "Location may be inaccurate". Coordinates outside Italy are never planned.

        Remaining risk becomes:
        > If the coordinates are wrong, each leg to that stop is wrong too. An option built around a suspect seed is labelled with no warning.
    *   **Location:** Alternative 13.
        **Change:**
        - Replace the Chianti con with: "The city label may be the wrong value instead of the coordinates. `place_059` is listed under Milan but placed near Verona; moving it to Milan would replace a specific location with a general one."
        - Reason becomes: "Rejected by author: raw coordinates are used for planning, with a warning. The city-centre table only detects suspect values and never replaces them."
    *   **Location:** Typed model, Cleaning rules, the Coordinates bullet "Coordinates outside the box…".
        **Change:** replace it with:
        > Coordinates for which `isInCountry(c)` is false mean `unusable`. The values are kept, but no pin is drawn. For now `isInCountry` is a rectangle, lat 35.4–47.1 and lon 6.6–18.6. It also takes in parts of Slovenia, Croatia, Switzerland and the Tunisian coast. That is accepted for this project. It still catches swapped coordinates and (0, 0). A real border check can replace the function later without changing its callers.
    *   **Location:** G7's list of replaceable parts.
        **Change:** add "the in-country check (`isInCountry`)".
    *   **Location:** The `geo.ts` row.
        **Change:** `inBounds(c, bounds)` becomes "`isInCountry(c)`, which for now checks `ITALY_BOUNDS`, a rectangle".
    *   **Location:** The README row.
        **Change:** add "a real border check instead of the rectangle" to "what comes next".
    *   **Location:** `plan.test.ts`.
        **Change:** add the check:
        > • a made-up place with suspect coordinates can be scheduled and carries `location_suspect`; a place where `isInCountry` is false is never scheduled and is listed with `location_unusable`

### [Issue 4] [`egm-codebase-details`, `egm-implementation-readiness`, `egm-design`] - Severity: Major (M10)
*   **Affected Scope:**
    - Summary, data layer bullet, and the diagram's fetch line
    - Data loading and failures (lines 219–229)
    - R1 and R2
    - Build order stage 1
    - The `config.ts`, `getDataset.ts`, `errors.ts`, `page.tsx`, `plan/page.tsx`, `DataUnavailable`, `PlanView` rows and `tests/fixtures/italy.json`
    - Verification step 2
    - Issue 1 above (the `data_unavailable` result)
*   **Discrepancy Description:**
    - With `revalidate` set, `/` and `/plan` are prerendered, so `next build` fetches the data and fails on a 403 or 429.
    - Verification 2 changes `DATA_URL`, which creates a new cache entry instead of making the old one stale.
    - The caching claims cite no version, and the `normalize` memo has no key.
*   **Rationale:** The build depends on a third-party file, and the failure test does not test what it claims to.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** You chose (c): a saved copy, plus a notice that the live load failed. Option (c) also needs (a) or (b) underneath. Neither works as written:
    1.  **Option (b) as written does not cache.** The Next.js docs ("Caching and Revalidating (Previous Model)", updated 2026-08-18, which covers 15 and 16 without Cache Components) say `dynamic = 'force-dynamic'` sets every `fetch` to `no-store`. Every page view would hit the source, which invites 429s.
    2.  **Option (a) plus a saved copy breaks the "keep the last good copy" rule.** With a prerendered page, a failed background refresh that falls back to the snapshot *returns* normally. Next.js would then replace the good page with the snapshot page for an hour.
    3.  **What works:** `export const revalidate = 0` on the two pages. Per the same docs, this renders the page on each request but "leaves fetch requests that … use a positive revalidate as is". The fetch keeps `next: { revalidate: 3600 }`, so the Next.js data cache holds the last good response. `next build` no longer fetches anything.
    4.  **One claim is unverified.** I believe Next.js does not store non-2xx fetch responses in its data cache, so a 403 during a refresh leaves the good entry in place. The new Verification 2 tests exactly this. If it fails, the fix is to wrap the fetch in `unstable_cache`, which stores nothing when the function throws.
    5.  **What the snapshot costs:** it goes stale with no signal beyond the notice, and the repository holds a second copy of the data. The test fixture becomes the same file, so there is still only one copy.
    6.  **Effect on B4 and Issue 1:** with a saved copy there is always data. The `DataUnavailable` error screen, `errors.ts` and the action's `data_unavailable` result are no longer needed. `error.tsx` stays as the generic fallback.
*   ***Proposed Edit:***
    *   **Location:** Summary, the data layer bullet.
        **Change:** add:
        > If the live fetch fails and there is no cached copy, it falls back to a snapshot of `italy.json` bundled with the app, and the page says the live data could not be loaded.
    *   **Location:** Diagram, the fetch line.
        **Change:** it becomes `fetch (data cache 3600 s, throw on non-2xx; on failure: bundled snapshot)`.
    *   **Location:** Data loading and failures.
        **Change:** replace the section's bullets with:
        > *   `app/page.tsx` and `app/plan/page.tsx` set `export const revalidate = 0`. They are rendered on each request and never prerendered, so `next build` does not need the network.
        > *   `getDataset()` calls `fetch(DATA_URL, { next: { revalidate: REVALIDATE_SECONDS } })` (3600, matching the source's `Cache-Control: max-age=3600`). The page's `revalidate = 0` does not override a positive fetch `revalidate`, so the response is held in the Next.js data cache and shared by every request.
        > *   It throws on any non-2xx response (429, 403, 5xx), a network error, or a body that is not JSON or is not an array. Next.js does not store a failed response, so a failed refresh after a good load still serves the last good copy. Verification 2 checks this.
        > *   If the fetch throws, `getDataset()` logs the status with `console.error` and loads `src/data/italy.snapshot.json`, a copy of the source bundled with the app. It returns `{ dataset, source: 'live' | 'snapshot' }`.
        > *   When `source` is `'snapshot'`, both pages show `SnapshotNotice`: "Live place data could not be loaded. Showing a saved copy." The Plan view shows the same notice.
        > *   Fetching from the browser is not possible in any case, because the source sends no `Access-Control-Allow-Origin` header.
        > *   `normalize()` runs on each request. On 103 records it costs well under 10 ms, so there is no memo.
        > *   These rules follow the Next.js docs "Caching and Revalidating (Previous Model)", which apply to Next.js 15.
    *   **Location:** R1.
        **Change:** Mitigation becomes:
        > `getDataset()` throws on non-2xx, so the data cache keeps the last good copy. With no good copy, the bundled snapshot is used and a notice says live data could not be loaded.

        Remaining risk becomes:
        > The snapshot may be out of date.
    *   **Location:** R2.
        **Change:** replace it with:
        > R2 | The bundled snapshot drifts from the live source. | Correctness | A traveler on the fallback sees old data. | The notice says it is a saved copy. Refresh the snapshot by hand when the source changes. | Accepted.
    *   **Location:** Build order, stage 1.
        **Change:** add "snapshot fallback" to the scope.
    *   **Location:** New `./src/data/italy.snapshot.json` row, in the data layer table.
        **Change:** add:
        > create | A copy of the source. It is the fallback when the live fetch fails, and the test fixture.
    *   **Location:** The `config.ts` row.
        **Change:** `DATA_URL` and `REVALIDATE_SECONDS` read `process.env.DATA_URL` and `process.env.REVALIDATE_SECONDS`, with the current values as defaults. This is so Verification 2 can point at a mock server.
    *   **Location:** The `getDataset.ts` row.
        **Change:** replace the bullets with:
        > • fetches `DATA_URL` with `{ next: { revalidate: REVALIDATE_SECONDS } }` and throws on non-2xx, a network error or bad JSON<br>• on a throw, logs it and falls back to `italy.snapshot.json`<br>• returns `{ dataset: normalize(json), source }`, with `fetchedAt` from the response `Date` header, or the snapshot's file date
    *   **Location:** The `errors.ts` row (from batch 1).
        **Change:** delete it.
    *   **Location:** The `page.tsx` and `plan/page.tsx` rows.
        **Change:**
        - Replace "Wraps `getDataset()` in try/catch and renders `DataUnavailable`…" with "Exports `revalidate = 0`. Renders `SnapshotNotice` when `source` is `'snapshot'`."
        - `plan/page.tsx` passes `source` to `PlanView`.
    *   **Location:** The `DataUnavailable` row (from batch 1).
        **Change:** replace it with:
        > `./src/components/SnapshotNotice/*` | create | A server component. A `role="status"` notice: "Live place data could not be loaded. Showing a saved copy."
    *   **Location:** Issue 1 of this batch.
        **Change:**
        - Drop `{ status: 'data_unavailable' }` from `PlanResult`.
        - `generatePlan` uses `getDataset()`, including the snapshot fallback, and returns `source` with an `ok` result.
        - The `actions.ts` row drops "`getDataset()` throws → `data_unavailable`".
        - `PlanView` shows `SnapshotNotice` when `source` is `'snapshot'`.
    *   **Location:** The `tests/fixtures/italy.json` row.
        **Change:** delete it. Tests import `src/data/italy.snapshot.json`.
    *   **Location:** The `normalize.ts` row.
        **Change:** none. The memo is removed in `getDataset`.
    *   **Location:** New `./scripts/mock-source.mjs` row.
        **Change:** add:
        > create | A plain Node HTTP server on port 4010. It serves `italy.snapshot.json` at `/italy.json`. Calling `GET /__status/403` or `/__status/200` switches what it returns. Used only by Verification 2.
    *   **Location:** Verification step 2.
        **Change:** replace it with:
        > 2.  **Data failure:** run `node scripts/mock-source.mjs`. Then run `npm run build` and `npm start` with `DATA_URL=http://localhost:4010/italy.json` and `REVALIDATE_SECONDS=10`. Check:
        >     *   The build succeeds while the mock returns 403. The build does not fetch.
        >     *   Mock at 403, first visit: the snapshot notice shows, and places are listed.
        >     *   Mock at 200: reload, and there is no notice.
        >     *   Mock at 403: wait more than 10 s and reload twice. There is still no notice, and the live data is still served. If this fails, wrap the fetch in `unstable_cache` (see Data loading).
    *   **Location:** New Alternative 28, "Rendering on every request with `force-dynamic`".
        **Change:** add:
        - Pros: simple, and the build needs no network.
        - Cons: it sets every fetch to `no-store`, so every page view calls the source and invites 429s.
        - Reason: "Rejected by author: page `revalidate = 0` with a cached fetch gives per-request pages and a shared data cache."
    *   **Location:** New Alternative 29, "Prerendered pages (`revalidate = 3600`) with the snapshot fallback".
        **Change:** add:
        - Pros: pages are served from cache.
        - Cons: the build needs the network. A failed refresh that falls back to the snapshot would replace a good cached page with the snapshot page.
        - Reason: "Rejected by author: the fallback must never overwrite good data."

## Not in this batch (still open)

- M3, M5, M7, M11–M15, M17–M24
- All Nits
