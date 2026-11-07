# Stage 6: Comprehension Test Report

**Target:** `docs/designs/italy_trip_planner.md`. FeatureRange is lines 1–683; DetailedRange is lines 684–856.
**Reviewer:** `egm-comprehension`, which read only the document.

**What this proposes**

This is a Next.js web app for one traveler. It turns 103 places in Italy, fetched from a remote `italy.json` that contains errors, into a 3-day itinerary.

The server fetches the data, caches it for an hour, and cleans each record into a typed `Place`. No record is dropped: values that are doubtful are flagged and shown instead.

In the browser "Discover" view, the traveler:
- filters and searches places on a map and in a list,
- rates each place Not interested, Maybe or Very interested,
- can mark places "must visit", which overrides the rating.

These choices are saved in localStorage.

In the "Plan" view, a server endpoint (`POST /api/plan`) works in this order:
1. It checks, in stages, whether all must-visits can fit, and returns named conflicts if they cannot.
2. Otherwise it groups places by distance.
3. It builds up to 3 plans (one per top cluster) by greedy insertion, with an optional route-improvement pass.
4. It returns the plans with a warning on each stop and a list of places that did not fit.

The work is staged to fit a 4-hour take-home, with a set order for cutting features.

**How the existing system works, per this document**

There is no app yet. Travelers plan with spreadsheets, notes and a separate map, so they easily miss closing days and underestimate travel time.

The data source is a static JSON file on Google Cloud Storage. It is served with `max-age=3600` and no CORS header, so a browser cannot fetch it directly.

The data has problems:
- about 12 different hours formats,
- null fields,
- one place about 160 km from its city,
- tags that differ only in spelling,
- duplicate places under different names.

---

## Findings

1. **Major: The document says "one itinerary" in some places and "options" in others (lines 17, 69–74, 141–150, 111).**
   - The Overview, G6 and CUJ 3 all describe a single itinerary.
   - OQ1 then talks about "Making options differ" and "Up to 3 options" without having explained why there are several.
   - **Fix:** say in the Overview, G6 and CUJ 3 that up to 3 alternative itineraries are returned, each centred on a different area.

2. **Major: The day model is undefined (lines 347, 390–425).**
   - The document never says where the traveler starts each day, or whether moving between cities overnight is free.
   - So it is unclear what `travelMinutesBefore` means for the first stop of a day.
   - It is also unclear why the stage-4 MST is a valid lower bound. If overnight moves are free, the MST counts travel that never uses any day's time, so the check could reject a trip that would actually fit.
   - **Fix:** state the day model, then explain stage 4 in terms of it.

3. **Major: "rating" means two different things (lines 15, 113, 413, 607, 609).** It is used both for the traveler's interest and for the dataset's star rating. **Fix:** use "interest" for the traveler's choice and "rating" only for the stars.

4. **Major: "text-only field" in G3 and CUJ 1 does not match `filterPlaces` (lines 56, 125, Discover).**
   - The rule in `filterPlaces` is "the field is missing or invalid", not "text-only".
   - Only price is a `Field<T>`, so in CUJ 1 no uncertain match is possible.
   - **Fix:** define "uncertain match" once, list which filters can produce one, and rewrite G3 and CUJ 1.

5. **Major: CUJ 1 uses a "Food" category that does not exist (lines 122, 840).** **Fix:** use Restaurant, or define a display group that includes it.

6. **Major: "the 9 tricky cases" are never listed (lines 516, 815).** **Fix:** list the strings and the results they should produce.

7. **Nit: "tolerant mode" and "the 24/7 default" are never explained.** The constructor call shown sets only `tag_key`. **Fix:** add one sentence on each, or link to the library's docs.

8. **Nit: `Unscheduled.location_unusable` can never be produced.** Candidates with unusable locations are excluded before scheduling. **Fix:** say when this reason is used, or remove it.

9. **Nit: the 70% overlap rule does not say what it measures against.** It could be this option's fills, the other option's fills, or the union of both. **Fix:** give the formula.

10. **Nit: the `too_far` reason is vague.** **Fix:** turn it into a concrete test.

11. **Nit: `ItineraryOption.points` is not defined.** It does not say whether must-visits count, or whether the focus boost is included. **Fix:** define it.

12. **Nit: `days` in `PlanRequest` is unclear.** The UI has no control for it. **Fix:** say whether `PlanView` sends `config.tripDays` or leaves the field out.

13. **Nit: `DataUnavailableError(status)` has no status on a network error.** **Fix:** say what `status` holds in that case, and what `error.tsx` shows.

14. **Nit: the daylight-saving test assumes the server's time zone.** The test does not say which zone the server is assumed to run in. **Fix:** state the assumed or required server time zone.

15. **Nit: "Step 6" and "Stage 6" are used for the same thing.** **Fix:** use one term.

16. **Nit: "Travel defaults to 3 days" reads as travel time.** **Fix:** write "The trip length defaults to 3 days".
