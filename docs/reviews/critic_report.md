# Stage 7: Critic Review Report

**Target:** `docs/designs/italy_trip_planner.md`, FeatureRange lines 1–683.
**Reviewers:**
- `egm-design` and `egm-structural`, checked against `feature-spec-standard.md`
- `egm-style`

**Context:** `C:\Users\miche\Downloads\italy.json`.

**Totals:**

| Reviewer | Blocker | Major | Nit |
|---|---|---|---|
| Design | 1 | 7 | 9 |
| Structural | 1 | 5 | 7 |
| Style | 0 | 13 | 17 |

**Verdict:** Not ready. Two Blockers:
- the travel-between-days model is undefined
- the Risks & Mitigations section is missing

---

## Design review (`egm-design`)

### D-B1. 🔴 Blocker: the planner never says where each day starts (Planner steps 2.4, 2.5, 4, 5; `Stop.travelMinutesBefore`; Problem lines 29, 37)

**Problem.** The doc does not say what the first stop of day 2 or day 3 is measured from. If each day is planned on its own, greedy insertion can produce:
- day 1: Rome
- day 2: Venice
- day 3: Rome

with no travel time charged between them. That is exactly the failure the Problem section says the app prevents.

It also breaks step 2.4. The minimum spanning tree (MST) bound assumes one connected route. If overnight moves are free, the true bound is the MST minus its (days − 1) longest edges, so the current check can wrongly report `not_enough_total_time`.

**Fix.** Pick one rule.
- **Option 1:** the first stop of day d+1 is measured from the last stop of day d, and that travel counts inside day d+1's window. Insertion and 2-opt include the link. Step 2.4 stays valid as written.
- **Option 2:** overnight moves are free. Subtract the (days − 1) longest MST edges in step 2.4, and say in the README that hotel moves are not modelled.

### D-M1. 🟡 Major: there is no Risks & Mitigations section

Missing risks:
- unbounded `/api/plan` body
- HTML injection through Leaflet `bindPopup(string)`
- OSM tile attribution and usage policy
- an LGPL note
- the build failing when the data source is down
- planning that treats unparsed hours and suspect coordinates as facts

**Fix.** Add a table with these columns: risk, impact, mitigation, and cut-or-kept. Suggested mitigations:
- limit the request body to about 32 KB
- ignore unknown ids
- build popups with JSX only
- show OSM attribution

### D-M2. 🟡 Major: travel-time bands jump backwards

- 1.99 km walking takes about 31 min, but 2.01 km by transit takes about 15 min.
- 49.9 km takes about 140 min, but 50.1 km takes about 55 min.

Consequences:
- Florence→Siena (about 50 km) can come out slower than Florence→Pienza (about 80 km).
- Greedy insertion and 2-opt will favour the oddly cheap long hops.
- The MST is built on km and then converted to minutes. Because the conversion does not always rise with distance, the result is no longer a lower bound.

**Fix.**
- Make `estimate()` never decrease as distance grows: take the minimum over all modes, or join the bands so they meet.
- Build the MST on minutes, not km.
- Add a monotonicity test.

### D-M3. 🟡 Major: unparsed hours count as "open", the same flaw used to reject Alternative 6 (line 399; Alternatives 6 and 8)

The planner can put these at 14:00:
- `Evenings` and `Morning only`
- names that state a time of day ("at Dawn", "by Night", "at Aperitivo Hour")

**Fix.** Add a configurable alias table applied before parsing:
- `Evenings` → `17:00-23:00`
- `Morning only` → `07:00-12:00`
- an am/pm → 24-hour regex

Mark the result `normalized` with the warning "interpreted as …". Rewrite Alternative 8's rationale to match. Optionally, place unparsed fill stops last.

### D-M4. 🟡 Major: known-wrong coordinates are used for planning, and Alternative 13 was rejected on a false example

`place_059` (Brera, Milan) is about 155 km away, near Verona. It still gets planned, and it joins the Isola della Scala cluster.

Alternative 13's Chianti example is wrong: Chianti is about 21 km from Florence, under the 25 km threshold, so it would never be snapped.

**Fix.** For `suspect` places:
- keep the raw coordinates for the map pin
- use the city-centre coordinates for travel time and clustering, with the warning kept

Then rewrite Alternative 13's rationale.

### D-M5. 🟡 Major: OQ6's clustering example is false for this data

At a 30 km cutoff these do **not** chain into one cluster:
- Bologna→Modena: about 37 km
- Bologna→Maranello: about 38 km
- Modena→Parma: about 50 km

What actually chains at 30 km:
- Florence→Chianti→Siena (the Chianti→Siena link is 29.45 km)
- Como→Lenno→Bellagio
- `place_059`→Isola della Scala

**Fix.**
- Rewrite OQ6 using the measured distances.
- Raise the real risk instead: moving the cutoff from 30 km to 38 km suddenly merges Bologna and Modena.
- Make the cluster test assert the actual clusters.

### D-M6. 🟡 Major: CUJ 1 can't be run as written

- There is no "Food" category; `food` is a tag.
- As a tag, Food + Rome + "pasta" matches only `place_099` (Eataly, a shop).
- No record has a missing type, city, price or tags, so the uncertain-match path never triggers on real data.

**Fix.**
- Use the tag `food`, or the Restaurant category, and state the expected result.
- Change "text-only field" to "the filtered field is missing or invalid".
- Note that the uncertain-match path is defensive and is only exercised by fixture tests.

### D-M7. 🟡 Major: Alternative 21's rejection contradicts the Time handling section

The local-`Date` trick works the same way in a browser. LGPL allows shipping to the browser.

**Fix.** State the real reasons for running the planner on the server:
- bundle size (`opening_hours` plus `i18next` and `suncalc`)
- one copy of the parsing code
- tests that run without a browser

Weigh these against what the API costs inside the 4-hour box.

### Design nits

- **D-N1. Tie-breaks are not specified.** Specify:
  - the order musts are inserted in (longest first, then id)
  - a final tie-break by `id`
  - a fixed `TZ`
- **D-N2. `error.tsx` can't show the status in production.** Production hides the error message. Catch the error in `page.tsx` and render `DataUnavailable` instead.
- **D-N3. The render mode is not stated.** The page is prerendered at build time, so the build fetches the data. Also state the key used to memoise `normalize`.
- **D-N4. Tag normalization goes the wrong way.** Only `local_favorite` uses `_`; every other tag uses `-`. Normalise `_` to `-`.
- **D-N5. Scoring favours short "Maybe" places.** `points/(visit+travel)` lets a long Very interested place lose to a short Maybe. Add this to OQ7, or fill in two passes.
- **D-N6. The 70% overlap measure is undefined.** Define it, and say how empty options are treated.
- **D-N7. Duplicates with identical coordinates (018/077, 030/031).** Flagging them as `possible_duplicate` is a cheap check.
- **D-N8. "9 tricky cases" is undefined.** Include `8:00-01:00` and `Wed-Mon` among them.
- **D-N9. Rejection reasons.** Drop "Rejected by author:". Alternatives 1 and 14 restate the premise instead of giving a reason.

---

## Structural review (`egm-structural`)

Heading structure is valid: one H1, no skipped levels, and all code fences are closed. All required sections except Risks are present.

### S-B1. 🔴 Blocker: the required Risks & Mitigations section is missing

Risk content is scattered across:
- lines 219–229
- line 363
- step 2.5
- Non-Goals
- line 205

Security and scalability are not covered at all:
- `/api/plan` has no authentication
- `prefs` and `days` have no size limits
- raw strings are displayed
- clustering is O(n²)

**Fix.** Add `## Risks & Mitigations` between Technical Plan and Alternatives. Use the columns Risk | Category | Impact | Mitigation | Residual.

### S-M1. 🟡 Major: rejection reasons restate the decision (Alternatives 11, 14, 15, 21, 23)

Rewrite each Reason so it gives the trade-off that decided it.

### S-M2. 🟡 Major: travel formula units are wrong (lines 371–373)

The formulas produce hours but are labelled minutes. Use:
- `60 × km × 1.3 / 5`
- `10 + 60 × km × 1.3 / 30`
- `30 + 60 × km / 120`

### S-M3. 🟡 Major: `PlaceFlag` has no id flags (lines 275, 287; Alternative 5)

Add `'id_missing' | 'id_duplicate'`, or widen `DataIssue.flag`.

### S-M4. 🟡 Major: `Unscheduled.location_unusable` is never produced (lines 351, 394, 419–423)

Either remove it, or list rated places with unusable locations as unscheduled.

### S-M5. 🟡 Major: CUJ 1 "Food" category (line 122; also line 840)

Change it to Restaurant, or define a display group.

### Structural nits

- **S-N1.** Open Questions are out of order (OQ6 and OQ7 come before OQ1–5). Split them into Open and Resolved.
- **S-N2.** G3, G4, G7 and G8 have no Measure line.
- **S-N3.** Cross-references don't match the actual headings. Use anchor links.
- **S-N4.** "step 2.5" points into a nested list. Use H4 headings and refer to steps by name.
- **S-N5.** The Plan API is in a ```text block, and `PlannerConfig` is only a bullet list. Use ```ts and add an interface.
- **S-N6.** The Alternative 5 heading is garbled.
- **S-N7.** The "Rejected by author:" prefix repeats 25 times.

---

## Style review (`egm-style`)

These source facts were confirmed and produced no finding:
- 103 records and 10 types
- `place_059` is about 156 km out
- CUJ 4 durations are 360, 360 and 480 minutes
- the duplicate pairs exist
- the 3 unparsed hours strings exist

### Style majors

| ID | Lines | Issue | Fix |
|---|---|---|---|
| Y-M1 | 59, 62 (G5) | "Guaranteed" overclaims, because greedy placement can fail. | "No itinerary omits a must-visit; if they can't all be placed, no itinerary is shown and the conflicts are named." |
| Y-M2 | 72 (G6) | "Most interest points" implies an optimum. | "Fills remaining time by greedy insertion ranked by points per minute." |
| Y-M3 | 52 (G2 Measure) | The measure can't fail. | Assert 54/57 parsed or normalized, the 3 named strings unparsed, and nothing throws. |
| Y-M4 | 53 (G3) | "Quickly" can't be measured, and there is no Measure. | Remove "quickly" and add a Measure. |
| Y-M5 | 56, 125, 148 | "Text-only field" is undefined. | "Filtered field missing or unparsed." |
| Y-M6 | 122 | The "Food" category doesn't exist. | Use Restaurant, or define a group. Update line 840. |
| Y-M7 | 46, 175, 294 | A bounding box is not "inside Italy": it includes parts of Switzerland, Slovenia, Croatia, Tunisia and Corsica. | Say "Italy's bounding box". |
| Y-M8 | 223–224 | The Next.js caching claims have no version or source, and "never reaches the traveler" is absolute. | Add a version and a doc link, and qualify the claim. |
| Y-M9 | 228 | "Well under 10 ms" was never measured. | Measure it, or drop it. |
| Y-M10 | 290, 516 | "54 of 57 unchanged" contradicts the `normalized` status. "9 tricky cases" is undefined. "No development cost" overclaims. | Rewrite with a named test. |
| Y-M11 | 371–373 | The formula units are mixed, and 1.3 is not explained. | Use ×60 forms, and note that 1.3 is a detour factor. |
| Y-M12 | 413, 437 | "Deterministic" needs a final tie-break. | Add "remaining ties go to the lower id". |
| Y-M13 | 532, 645 | Rejection reasons are vague or wrong: CUJ 4 doesn't depend on hours, and the time-zone con contradicts line 362. | Rewrite both. |

### Style nits

- **Y-N1.** Line 18: "clean, componentized" is self-praise.
- **Y-N2.** Line 29: "several hours" is vague. Use "about 4 h by high-speed train".
- **Y-N3.** Lines 33–36: give counts for the data problems.
- **Y-N4.** Line 39: "look confident but are wrong" is vague.
- **Y-N5.** Line 76 (G7): "grow without being rewritten" is vague.
- **Y-N6.** Line 14: "Travel defaults to 3 days" should be "Trip length…". Also, "builds an itinerary" should be "up to 3 options".
- **Y-N7.** Lines 89 and 95: these caveats have no decision. Drop them.
- **Y-N8.** Line 97: wrong connective ("but").
- **Y-N9.** Line 109: resolved questions sit under "Open Questions".
- **Y-N10.** Lines 132 and 135: use the dataset's place names.
- **Y-N11.** Line 162: name a specific "Evenings" place. Unify the spelling of "unparsable".
- **Y-N12.** Line 186: state the reason (LGPL, deps) for keeping the library server-side.
- **Y-N13.** Line 226: "in any case" is filler.
- **Y-N14.** Line 232: "any dataset (G7)" overclaims.
- **Y-N15.** Line 401: the MST is described twice in one sentence.
- **Y-N16.** Lines 416 and 425: move the "optional, can be cut" note to the build-order table. Use "at most 36 stops".
- **Y-N17.** Alternatives wording: lines 472, 559, 597, 641 and 679. Also the "Rejected by author:" prefix, mixed British/US spelling, and uneven contractions.

---

## Paths read by reviewers
- `C:\Users\miche\.copilot\installed-plugins\egm\egm\agents\design_critic.md`
- `C:\Users\miche\.copilot\installed-plugins\egm\egm\agents\structural.md`
- `C:\Users\miche\.copilot\installed-plugins\egm\egm\agents\style.md`
- `C:\Users\miche\.copilot\installed-plugins\egm\egm\resources\document_standards\feature-spec-standard.md`
- `C:\Users\miche\projects\trip-planner\docs\designs\italy_trip_planner.md`
- `C:\Users\miche\Downloads\italy.json`
