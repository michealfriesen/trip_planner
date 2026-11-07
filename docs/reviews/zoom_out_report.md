# Stage 5: Initial Zoom Out Report

**Target:** `docs/designs/italy_trip_planner.md` (full file, lines 1–856)
**Reviewers:** `egm-zoom-out` (zoom-out standard) and `egm-inventive-catalyst`
**Context given to reviewers:** `C:\Users\miche\Downloads\italy.json`

---

## Part A: Zoom Out reviewer

**Context check: passes.** These claims were checked against the data: 57 distinct hours strings, 16 cities, 9 null `duration_minutes` values and 1 null `booking_required`.
**Project alignment:** not assessed, because the repository has no code yet.
**Result:** 0 Blockers, 5 Major, 9 Nits.

### Major

**M1. Showing up to 3 itinerary options is not required by any Goal or CUJ.**
- G6 and CUJ 3 ask for one itinerary.
- The options feature adds clustering (union-find), a focus multiplier, a 70% overlap rule, cluster labels and ARIA tabs. Both remaining open questions (OQ6 and OQ7) are about it.
- A cluster can stretch about 100 km (Bologna to Parma).
- **Fix:**
  - Design one option: `PlanResponse = { status:'ok', itinerary }`.
  - Move clustering, focus scoring, overlap removal and the tabs to Future work.
  - Delete OQ1, OQ6, OQ7, Alternatives 23–24, `cluster.ts` and its test, and the related config.
  - Drop build stage 5 and give its 20 minutes to stage 4.

**M2. Travel between days is not modelled.**
- Travel cost is calculated only within each day. There is no start location for a day and no cost for the move from day N to day N+1.
- A plan of Venice, then Rome, then Milan gets no penalty. That is the exact failure The Problem section names.
- **Fix:**
  - Treat the trip as one continuous route: day N+1's first leg starts at day N's last stop and uses up day N+1's time.
  - If this is left out on purpose, add it to Non-Goals and remove the claim about travel between cities from The Problem.

**M3. The time budget doesn't match the scope.**
- Stage 4 (60 minutes) covers validation, time helpers, an insertion scheduler, a five-stage feasibility check with an MST, a 4-status route and the Plan view.
- Stage 1 (70 minutes) covers `normalize` with about 10 rules, the map, three field components and the data-quality panel.
- There are 11 test files.
- The cut order only removes things from stage 5, so there is no slack before that.
- **Fix:**
  - Allow cuts from earlier stages too: data-quality panel, then the uncertain tier, then suspect-pin styling, then the not-enough-total-time check.
  - State the smallest app that can ship: list, map, ratings and one plan.

**M4. The "uncertain matches" tier never triggers on this dataset, and CUJ 1 cannot be followed.**
- Every record has a `type`, a `city`, a valid price and a tags array, so `uncertainMatches` is always empty.
- G3 and CUJ 1 say "text-only field". The mechanism actually checks for a field that is missing or invalid.
- The "Food" category does not exist; `food` is a tag.
- **Fix:**
  - Drop the uncertain tier, or use one wording everywhere and add a test record that reaches it.
  - Change CUJ 1 to "Restaurant" or the `food` tag.

**M5. The planner is exposed as a hand-written HTTP API without a strong reason.**
- The time-zone reason holds just as well in the browser. Only the LGPL and bundle-size reason supports running on the server.
- A public REST contract adds 4 status codes, validation of `days` from 1 to 14, 503 handling and curl tests.
- **Fix:**
  - Use a Server Action, `generatePlan(input) → PlanResult`.
  - Give only the dependency reason for running on the server.
  - If showing off the API boundary is a goal, say so.

### Nit

- **N1. Feasibility stage 4 duplicates stage 5.** Stage 4 builds a minimum spanning tree only to word an error message differently. **Fix:** remove it, or replace it with a simple check: total must-visit minutes > days × window.
- **N2. Unusable locations are guarded in three layers, but no record has one.** **Fix:**
  - Remove the `location_unusable` conflict and unscheduled reasons, and filter those places out of the candidates instead.
  - Reduce the rules for missing or duplicate ids to a comment and a test.
- **N3. Data quality is recorded in six overlapping forms.** These are `Field.status`, `locationQuality`, `PlaceHours.status`, `PlaceFlag[]`, `DataIssue[]` and `StopWarning`. **Fix:**
  - Derive the issues from `places[].flags`.
  - Map `StopWarning` directly from `PlaceFlag`.
- **N4. The memoisation contradicts the claim that cleaning takes under 10 ms.** **Fix:**
  - Remove the memoisation keyed on `fetchedAt`.
  - Reword OQ5 to say the raw fetch is cached.
- **N5. The Technical Plan contains code-level details.** Examples: `normalize('NFD')`, `new Date(y,m,d,h,min)`, the union-find count, the number of swaps. **Fix:** move them to the file tables.
- **N6. `days` from 1 to 14 in the request is speculative.** The UI fixes the trip at 3 days. **Fix:** the server reads `tripDays` from config, and `days` is removed from the request.
- **N7. The daylight-saving test targets the wrong time zone.** Only gaps in the server's own time zone matter, and UTC has none. **Fix:** state that the server runs on UTC, or set `TZ=UTC` in tests, and remove the daylight-saving test.
- **N8. Config keys only serve features dropped by M1.** These are `focusMultiplier`, `clusterCutoffKm`, `maxOptions` and `optionOverlapLimit`. **Fix:** remove them along with M1.
- **N9. Verification step 2 depends on cache timing.** **Fix:**
  - Unit-test that `getDataset` throws on a non-2xx response.
  - Rely on Next.js's documented stale-serving behaviour.
  - Keep only the manual check of the no-cache error page.

### Keep
- opening_hours.js, backed by a measured 54/57 parse rate.
- Must-visit kept separate from interest.
- Server fetch, which the missing CORS header requires.
- The `FieldValue` component.
- Ordered build stages with a cut order.
- Pure planner functions with deterministic tie-breaks.

---

## Part B: Inventive Catalyst reviewer

**Result:** false compromises were found. 0 Blockers, 4 Major, 3 Nits. All findings are advisory.

### Major

**IC1. Travel between days is not modelled.** This is the same issue as Zoom Out M2.
- The MST bound in the feasibility check counts travel between cities, but the scheduler does not.
- **Fix:**
  - Day N+1's first leg starts at day N's last stop and is charged to day N+1's window.
  - Add a test: the leg between days is > 0 when the two days are in different clusters.
- **Cost:**
  - `tryInsert` must re-check the next day.
  - 2-opt must keep each day's endpoints fixed.

**IC2. Hours are re-parsed for every date, which forces the time-zone workaround and accepts an error of up to one hour at clock changes.**
- Every hours string in the data is a weekly pattern; there are no PH or SH rules and no sunrise or sunset times.
- **Fix:**
  - In `normalize`, evaluate each parsed string once over a reference week.
  - Store the result as plain JSON, `weekly: [startMin,endMin][][7]`, with hours past midnight carried into the next day.
  - Guard with `isWeekStable()`.
  - The planner then needs only the weekday and minutes. This removes the `Date` workaround, the daylight-saving error and its test, the re-parsing on each request, and the planner's runtime dependency on the library.
- **Cost:**
  - Rules tied to specific dates fall back to unparsed.
  - The reference week must not contain a clock change.

**IC3. If the live data fails, the reviewer sees a broken demo.**
- If the bucket returns 403 or 429, or disappears, the app shows only `error.tsx`, and `/api/plan` returns 503.
- The same 103-record snapshot is already committed as a test fixture.
- **Fix:**
  - When no live load has ever succeeded, fall back to a bundled snapshot marked `source:'snapshot'`.
  - Show a banner: "Live data unavailable (HTTP 403); showing bundled snapshot."
- **Cost:**
  - The data may be stale.
  - The fallback must sit outside the cached fetch.
  - The fixture moves to a shared location.

**IC4. Multiple options are likely to collapse into one.**
- Every option shares the same must-visit schedule.
- The ×2 focus boost cannot outweigh hours of travel. Rome to Venice is about 3.6 hours.
- The 70% rule only patches the symptoms.
- **Fix:**
  - An option becomes a choice of cluster for each day.
  - Days with must-visits are fixed to their cluster. Free days rotate through the top clusters.
  - Fill places are biased toward their day's cluster.
- **Cost:**
  - When must-visits cover every day, there is only one plan.
  - Cluster size still matters (OQ6).

### Nit

- **IC5. A single greedy pass in the feasibility check can report false conflicts.** **Fix:**
  - Retry a few fixed orders (tightest opening window first, then by location) before reporting.
  - Optionally backtrack when there are 6 or fewer must-visits.
- **IC6. Duplicate places force a false choice between merging and scheduling twice.**
  - Trevi 018/077 and Mercato Centrale 030/031 have identical coordinates. Acetaia 044/083 are about 370 m apart.
  - **Fix:**
    - Flag `possible_duplicate` plus a `duplicateGroup` for places within about 100 m in the same city.
    - Show a soft warning, or allow at most one fill place per group per day.
    - Ids do not change.
- **IC7. "Evenings" can still be scheduled at 9:00.** The design rejects Alternative 6 for exactly this, then allows it with only a warning. **Fix:**
  - Add a 3-entry alias table, marked as `normalized`: `Evenings`→`18:00-23:00`, `Morning only`→`07:00-13:00`, `9am-12:30pm`→`09:00-12:30`.
  - Anything else still falls back to unparsed.
