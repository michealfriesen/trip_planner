# itineraryay

Turn a list of places in Italy into a day-by-day trip plan. Rate the places you care about on **Discover**, mark the ones you must see, then let **Plan** build an itinerary that respects opening hours, visit lengths and travel time.

Built with Next.js 15 (App Router), React 19, Leaflet and Vitest.

## Run and test

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (Vitest)
npm run lint
npm run build      # production build; does not need the network
```

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `DATA_URL` | `https://storage.googleapis.com/interview-booking/italy.json` | Place data source |
| `REVALIDATE_SECONDS` | `3600` | How long a good response is cached |

If the source cannot be loaded, the app serves a bundled copy (`src/data/italy.snapshot.json`) and shows a notice saying so.

## Architecture

```
  DATA_URL (fetch, cached 3600 s; on failure: bundled snapshot)
                              |
  +-------------------------- SERVER -------------------------------+
  |  lib/data/getDataset() --> lib/data/normalize()                 |
  |                              raw JSON -> Place[] + DataIssue[]  |
  |     +--> app/page.tsx, app/plan/page.tsx  (server components)   |
  |     +--> app/plan/actions.ts  generatePlan()  (Server Action)   |
  |            validateRequest -> feasibility -> buildOption        |
  |            -> { ok, option } | { infeasible, conflicts }        |
  +--------------------------------|--------------------------------+
                                   | Place[] as props
  +-------------------------- BROWSER ------------------------------+
  |  DiscoverView: FilterBar, SearchBox, SortSelect, PlaceList,     |
  |                PlaceMap, PlaceCard, InterestControl, ...        |
  |  PlanView:     TripForm -> OptionTabs, DayTimeline, StopCard,   |
  |                UnscheduledList, ConflictList                    |
  |  usePreferences() <-> localStorage (ratings, must-visit)        |
  +-----------------------------------------------------------------+
```

- **Planner** (`src/lib/planner`): a greedy builder. Must-visit stops go in first. Then, each round, it adds the place you rated with the most interest points per minute (visit plus extra travel) that still fits its opening hours. Unrated places never fill time. If the must-visits cannot all fit, the feasibility check explains why instead of returning a broken plan.
- **Travel time** (`travel.ts`): straight-line distance with a detour factor, taking the fastest of walking, local transport and long-distance travel. It sits behind a `TravelTimeEstimator` interface so a routing service can replace it.
- **Preferences** live only in the browser; there are no accounts.

## What was cut, and why

The work was time-boxed to 4 hours, built in stages (see `docs/designs/italy_trip_planner.md`).

- **Multiple plan options** (stage 6): the planner makes one unseeded run and returns a single "Best overall" option.
- **Data-quality panel** (stage 7): flags show on each card, but there is no single list of every data issue.
- **2-opt route improvement** (stage 8): stops keep the greedy order.
- **Known issue: duplicate places are not detected.** Two records for the same place (different ids) both appear and can both be scheduled.

## What comes next

- Real travel times from Google Maps instead of the straight-line estimate.
- Let the traveler change the visit length per place.
- Use an LLM to read hours the parser cannot (`Evenings`, `Morning only`).
- Detect duplicate places.
- A real border check for Italy instead of the bounding rectangle.
- Check each place's coordinates against its city with a geocoding service.