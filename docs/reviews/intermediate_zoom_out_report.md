# Stage 8: Intermediate Zoom Out Report

**Target:** `docs/designs/italy_trip_planner.md`, the full file (lines 1–856).
**Reviewer:** `egm-zoom-out`, using `zoom-out-standard.md`.
**Context:** `italy.json` and `zoom_out_report.md` (the Stage 5 report).

**Result:** 0 Blockers, 4 Majors, 8 Nits. The context check passes. No finding repeats a Stage 5 finding; where a finding sharpens a Stage 5 item, it says which one.

## Major

### Z8-M1. Places that are closed for the season get planned with no warning

**Where:** Non-Goals (`seasonal_notes` shown as text only); `StopWarning`; planner steps 1 and 2.

**Problem.** At least 10 records use `seasonal_notes` to limit when the place is open:
- `place_035` Chianti: "Open April-October only"
- `place_059`: "Third weekend of each month only"
- another record: "October only"

A trip planned today (2026-11-06) would schedule Chianti with only a `hours_missing_assumed_open` warning. That is the "confident but wrong" plan The Problem section says the app should prevent.

**Fix.** Keep the decision not to parse seasonal notes. Add a `seasonal_note` `StopWarning` that shows the raw note text on the stop. This takes about 5 minutes and needs no parsing.

### Z8-M2. `StopWarning` and `FlagBadge` use different types

**Where:** the `StopWarning` and `PlaceFlag` types; the `FlagBadge`, `StopCard` and `buildOption.ts` rows.

**Problem.**
- `FlagBadge` maps `PlaceFlag` values, but `StopCard` draws one `FlagBadge` per `StopWarning`.
- Three `StopWarning` values are not `PlaceFlag`s, so this fails under `strict` type checking.
- There is no defined mapping from place flags to stop warnings.
- `travel_estimated` goes on every leg, so it tells the traveler nothing.

**Fix.**
- Make `StopWarning` a subset of `PlaceFlag`, plus `seasonal_note`.
- Let `FlagBadge` take a context (card or stop) to choose its wording.
- Remove `travel_estimated`, since `DayTimeline` already labels each leg as estimated.

This is the concrete form of Stage 5 N3.

### Z8-M3. The cut order breaks the API contract, the UI copy and the tests

**Where:** the build order and cut order; `ItineraryOption.label`; the `OptionTabs` row; the `plan.test.ts` and `cluster.test.ts` rows; Verification step 4.

**Problem.**
- If Stage 5 (clustering) is cut, the `label` field has no cluster to come from.
- `OptionTabs` would then always say "Only one distinct plan", which is false.
- Cutting the overlap rule makes the 70%-overlap test fail.
- Cutting multiple options leaves that assertion with nothing to check, so it can never fail.
- The cluster test and the tab-switching verification step have no cut rule.

**Fix.**
- For each cut, state the label, the UI copy and the test changes that ship with it.
- Tie each test to its build stage.

If Stage 5 M1 (one option only) is accepted, this finding goes away.

### Z8-M4. Several checks cannot fail, so they prove nothing

**Where:** the G1 and G2 measures; the `normalizeHours.test.ts` and `plan.test.ts` rows; Verification step 3.

**Problem.**
- **G2's measure** passes by construction. Assert the exact 54/3 split instead, and fail on any new `unparsed` string.
- **The hours-compliance test** probably uses the same `openIntervals` function as the scheduler, so it grades itself. Use hand-written expected intervals for a few known places, such as the Colosseum `9:00-19:00` and `place_059` (weekends only).
- **The determinism test** ("two runs give the same output") almost always passes. Shuffle the input order instead, which exercises the `id` tie-break.
- **CUJ 1:** "pasta" matches only 3 records (Mercato Centrale in Florence, Via Pescherie in Bologna, and `place_099` Eataly Roma, which is a shop). So:
  - Rome + Restaurant + "pasta" returns **0** results.
  - Rome + the `food` tag returns 1.
  - Neither can show "name matches first" or the uncertain tier.

**Fix.**
- Assert the list of unparsed strings.
- Use a hand-written hours oracle for the hours check.
- Shuffle the input to test determinism.
- Rewrite CUJ 1 around a query that has several matches.

This sharpens Stage 5 M4, whose fix still leaves the journey with no results.

## Nit

- **Z8-N1.** `validateRequest(body)` has no dataset, so it cannot drop unknown ids. Drop them in `plan()` instead.
- **Z8-N2.** The `too_far` unscheduled reason cannot be computed as written, and nothing tests it. Remove it, or define it and add a test.
- **Z8-N3.** If `DiscoverView` waits for `ready`, the server-rendered list is cancelled. Name the specific parts that wait for `ready`.
- **Z8-N4.** `ConflictList` links have no destination: there are no URL filters and no detail route. Use plain names, or define `/?place=<id>`.
- **Z8-N5.** It is unclear whether `ItineraryOption.points` includes must-visits. State that it counts fill places only.
- **Z8-N6.** Several terms mean the same thing:
  - itinerary / option / plan
  - text-only / uncertain / may be inaccurate / unparsed / invalid
  - Unrated / `interest: undefined`

  Add a glossary.
- **Z8-N7.** A start date in the past is accepted after a reload. Default it to today, or allow it on purpose.
- **Z8-N8.** The "inside Italy" check is a rough bounding box. Label it that way in the README and the flag text.

## Contested or sharpened from Stage 5

- **Stage 5 M4 (CUJ 1):** its suggested "Restaurant" fix returns 0 results. See Z8-M4.
- **Stage 5 N3:** made concrete as a type contradiction in Z8-M2.

## Files read

- `agents\zoom_out.md`
- `zoom-out-standard.md`
- `zoom_out_report.md`
- the target document (lines 1–856)
- `italy.json` (targeted ranges)
