# Build handoff

Read this first, then `docs/designs/italy_trip_planner.md`.

## Where things stand

- The design is reviewed and every Blocker and Major finding is resolved. No production code exists yet.
- The design doc is the single source of truth. Build from its **Detailed Implementation Plan** (from `## Detailed Implementation Plan` to the end). Read the Technical Plan sections a stage needs as you reach them (types, cleaning rules, Badges, Planner, Travel time).
- `docs/design_draft.md` is an old copy. Ignore it.
- `docs/reviews/` holds the review reports. You only need them to find out why a decision was made.

## Rules for the build

1. **Time box:** 4 hours total. Build the stages in order (0 to 8). Stop where time runs out. There is no separate cut order.
2. **Done means:** a stage is done when `npm run build`, `npm run lint` and `npm test` all pass, with that stage's tests written in that stage. Commit at the end of each stage.
3. **Stage column:** every file table in the plan has a Stage column. Build only that stage's files and settings. `config.ts` gets its planner keys in stage 4. In `plan.test.ts`, the overlap and seed cases wait until stage 6.
4. **Smallest version that ships:** the end of stage 1, with every place in a list and on a map, plus flags.
5. **README:** stage 5. Any stage finished after that adds one line to the README.
6. **Data:** the live source is `https://storage.googleapis.com/interview-booking/italy.json`, set as the default `DATA_URL` in `config.ts`. Copy its 103 records to `src/data/italy.snapshot.json` in stage 1.

## Decisions to keep (do not reopen)

- Hours: `opening_hours@3.15.0` in its default mode. No hand-written overrides. Text it can't read is flagged, logged, treated as open, and scheduled last, with a warning.
- Coordinates: the only check is the `isInCountry` rectangle (lat 35.4–47.1, lon 6.6–18.6). There is **no** city-centre or "suspect" check. Checking coordinates against the city is future work with Google Maps. Known gap: `place_059`.
- Interest (the traveler's choice: not interested / maybe / very) is separate from `rating` (from the dataset, display only).
- Food category = Restaurant + Cafe.
- Planner: multi-start greedy on the server through a Server Action. 2-opt is stage 8.
- Data: page `revalidate = 0`, fetch cache, snapshot fallback when the fetch fails.

## Small details the design leaves open (decide while building)

- `InterestControl`: radio buttons can't be cleared once one is selected. Use `aria-pressed` toggle buttons, or add an explicit "Unrated" option.
- `AppNav` needs `'use client'` to read the current path.
- Stage 4: write the conflict message text for each conflict reason. Add test scenarios for `not_enough_total_time` and `cannot_schedule_together`.

## First steps

1. Run setup step 2 from the design (`npx create-next-app@15 . ...`). The repository root holds only `docs/` and `.git`, so it will scaffold.
2. Install the pinned versions with `--save-exact`.
3. Then build stage 0's config files.
