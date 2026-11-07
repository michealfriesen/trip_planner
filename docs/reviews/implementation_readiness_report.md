# Stage 9: Implementation Readiness Report

**Target:** `docs/designs/italy_trip_planner.md`, DetailedRange lines 684–856.

**Reviewers:**
- `egm-implementation-readiness` and `egm-codebase-details`, both checked against `implementation-readiness-standard.md`
- `egm-style`

**Context:** `C:\Users\miche\Downloads\italy.json`

**Totals:**

| Reviewer | Blocker | Major | Nit |
|---|---|---|---|
| Readiness | 1 | 15 | 11 |
| Codebase | 1 | 16 | 7 |
| Style | 0 | 14 | 9 |

**Verdict:** Not ready. The plan fails the Zero-Decision Rule:
- The scaffold command doesn't work in this repository.
- `error.tsx` can't detect `DataUnavailableError`.
- Several contracts are undefined: `FilterCriteria`, `PlanContext`, the scheduling rules and the cleaning rules.

**Limits of the reviews:**
- The codebase reviewer had no web or npm access, so its library claims come from model knowledge only. They are marked where uncertain.
- Line numbers are approximate (±2).

---

## Data claims checked against `italy.json` (no finding)

- **Records and ids:** 103 records, ids `place_001`–`place_103`, all unique and in order.
- **Types and cities:** 10 types and 16 cities.
- **Hours:** 70 records have hours, 33 have null, and there are 57 distinct strings.
  - `Evenings` appears in 037, 068, 079 and 100.
  - `Morning only` is 006, `9am-12:30pm` is 087, and `8:00-01:00` is 020.
- **Distances:**
  - `place_059` is about 156 km from Milan and is the only place more than 25 km from its city.
  - Chianti (035) is about 21 km from Florence.
- **Single values:**
  - `place_020` is the only `booking_required: null`.
  - `local_favorite` appears only in `place_100`.
- **Duplicates:** 018/077 and 030/031 have identical coordinates, and 044/083 are both Acetaia Giusti.
- **Durations:** they run from 15 to 480. Nine are null: 014, 023, 027, 052, 066, 077, 085, 093 and 097.
- **Never null:** `price_range`, `type`, `city`, `name` and `tags`.
- **Not verified:** the "54 of 57 parse" figure (the reviewer could not run `opening_hours`).

---

## 🔴 Blockers

### R-B1: The setup command fails or creates a nested folder (line 704)

`npx create-next-app@latest trip-planner` fails in both places it could be run:
- From the parent folder, it hits the existing repository, and create-next-app refuses because `concepts_brief.md` and `design_draft.md` are not on its allowlist.
- From the repository root, it creates `trip-planner/trip-planner/`, so every `./` path in the plan is wrong.

The prompts for recent defaults, Turbopack and the React Compiler are also left unanswered.

**Fix:**
1. Move the two `.md` files into `docs/`.
2. From the repository root, run `npx create-next-app@<pinned> . --ts --eslint --app --src-dir --import-alias "@/*" --no-tailwind --use-npm --disable-git`.
3. State the Turbopack and React Compiler choices explicitly.

The codebase reviewer reported the same problem as C-15 (Major).

### C-B1: `error.tsx` can't detect `DataUnavailableError` (lines ~742, ~754; Verification 2)

Errors thrown in a Server Component are serialized before they reach the client error boundary, so `instanceof` always fails. In production builds, the message is also replaced; only `digest` is kept.

Defining the class in a `server-only` module and importing it into the client `error.tsx` breaks the build.

**Fix:**
- Add `src/lib/data/errors.ts` with no `server-only` import.
- In `page.tsx` and `plan/page.tsx`, catch the error and render `<DataUnavailable status={e.status} />`.
- Keep `error.tsx` as a generic fallback.
- Define what `status` holds for a network error.

The readiness reviewer reported the same problem as R-M4.

---

## 🟡 Majors

### Implementation readiness (`egm-implementation-readiness`)

| ID | Lines | Issue | Fix |
|---|---|---|---|
| R-M1 | 711–713, 725–730 | No versions are pinned, and the files the scaffold creates are not listed. | Pin `opening_hours@3.15.0`, `react-leaflet` v5, `leaflet` 1.9, `lucide-react` and `vitest`. Add a keep or delete row for `page.module.css`, `public/*.svg`, `favicon.ico`, `next-env.d.ts`, the lockfile and `README.md`. |
| R-M2 | 684–700 | Files are not assigned to stages. Components span stages (for example `DiscoverView` and `PlaceCard`). The cut order breaks tests (cutting the overlap rule or 2-opt). | Add a Stage column, the stubs each stage uses, and the test removed with each cut. |
| R-M3 | 742, 752 | Prerender, ISR or dynamic rendering is not decided. With `revalidate`, the build fetches the data. Verification 2 can't be observed with a warm cache. | Choose `revalidate = 3600` (and accept the build-time fetch) or `force-dynamic`. Write down the verification commands. |
| R-M4 | 742, 754 | Same problem as C-B1. | See C-B1. |
| R-M5 | 741 | There are no cleaning rules for name, price, booking or seasonal notes. Raw field names are never mapped. | Add `RawPlace` (all fields `unknown`) and one rule per field. |
| R-M6 | 757–758, 777 | `FilterCriteria` and its semantics are undefined: OR or AND within a facet, how Unknown and a missing city count, and empty-query sorting. | Define the type. Use OR within a facet and AND across facets. Only price and a missing city are uncertain. Name sort when the query is empty. |
| R-M7 | 840, 817 | "Food" doesn't exist. Rome + restaurant + "pasta" returns 0 results. | Use tag `food` + Rome + "pasta", which returns `place_099` only. Hard-code the expected id. |
| R-M8 | 735, 761, 766, 779 | The preference types have no home file. "Nothing renders before ready" is ambiguous. If every component calls `usePreferences()` separately, their state drifts apart. | Add `src/lib/prefs/types.ts`. Only `DiscoverView` and `PlanView` call the hook and pass state down as props. Before `ready`, only the preference controls are disabled. |
| R-M9 | 789–793 | `ctx` is untyped, and `tryInsert` has no access to dates, window, estimator or intervals. | Add a `PlanContext` interface and pass `ctx` to `tryInsert` and `bestInsertion`. |
| R-M10 | 789 | Scheduling rules are missing: day start, carry-over between days, waiting until opening, whether a visit fits in one interval, `unknown` intervals, rounding. | State the rules. The day-start rule must match the D-B1 decision. |
| R-M11 | 788, 819 | The band edges jump (2 km: 31.2 to 15.2 min; 50 km: 140 to 55.5 min). Florence→Siena is about 50.4 km, right at an edge. `travelBands` has no shape. | Define the band type with `≤` and `ceil`, make the estimate monotonic, and list the expected minutes at 0, 2, 2.01, 50 and 50.01 km. |
| R-M12 | 787, 820 | Test results depend on the machine's time zone (the reviewer's machine changes clocks on 2027-03-14, not 03-28). The DST test has no expected value. | Set `TZ: 'Europe/Rome'` in the Vitest env. Expect `09:00-19:00` → `[540, 1140]` on 03-27, 03-28 and 03-29. |
| R-M13 | 791, 794 | Edge cases are undecided: cluster ties, the label rule, no fill places, nothing rated, the overlap formula, empty options. | Specify each one. The overlap formula is `\|A∩B\|/min(\|A\|,\|B\|)`. |
| R-M14 | 764, 806 | `FlagBadge` takes a `PlaceFlag`, but a `StopWarning` has extra values. No labels or titles are defined. | Type the prop as `PlaceFlag \| StopWarning` and add a table of the 15 labels and titles. |
| R-M15 | 740, 815 | The 9 test cases are not listed, and the constructor call doesn't set a parser mode. | List the 9 strings with their expected results. Fix the constructor options, including `mode`. |

### Codebase details (`egm-codebase-details`)

| ID | Lines | Issue | Fix |
|---|---|---|---|
| C-2 | ~754 | `reset()` does not re-run the server fetch, so the error just shows again. | `startTransition(() => { router.refresh(); reset(); })` |
| C-3 | ~752 | Same problem as R-M3: the render mode isn't stated, so the build needs network access. | Same as R-M3. |
| C-4 | ~822 | The cluster test relies on OQ6, which is false: Bologna↔Modena is 36.0 km and Modena↔Parma is about 50 km. Florence→Chianti→Siena does chain (29.45 km). `place_059` joins Isola della Scala. | State the exact clusters expected at 30 km and test the real chain. |
| C-5 | ~838 | Verification 2b can't be carried out: pointing `DATA_URL` at a 403 changes the cache key, and nothing triggers a revalidation. | Use a local mock server that can be switched to 403, with `REVALIDATE_SECONDS = 10`, on `next build && next start`. |
| C-6 | ~820 | The DST test depends on the time zone. Production runs in UTC on Vercel. | Same as R-M12. Also record that production runs in UTC. |
| C-7 | ~704 | Same problem as R-B1. | Same as R-B1. |
| C-8 | ~711 | No versions are pinned, and `server-only` is not listed. | Pin the versions, add `server-only`, and record the Next.js and React versions. |
| C-9 | ~840, ~817 | Same problem as R-M7. `uncertainMatches` is always empty for real data. | Same as R-M7. State that `uncertainMatches` is tested with fixtures only. |
| C-10 | ~741 | Same problem as R-M5. | Price: 1–4 `€` characters is ok, null is missing, anything else is invalid. Booking: boolean is ok, null is missing (`place_020`). A blank name becomes "Unnamed place". |
| C-11 | ~815 | Same problem as R-M15. | List the 9 cases and all 54 expected statuses as a fixture. |
| C-12 | ~786 | `validateRequest` can't drop unknown ids because it has no dataset. | Pass `knownIds`, or filter in `plan()`. |
| C-13 | tables | These types and classes have no home file: `Interest`, `PlacePref`, `StoredPrefs`, `FilterCriteria`, `PlannerConfig`, `Cluster`, `DataUnavailableError` and the travel bands. | Assign each one to a file. |
| C-14 | ~756–807 | Directory globs are used for non-generated files. `PlaceMap` has no CSS. "Update at Step 6" is not a valid Create, Modify or Delete action. | List every path explicitly. |
| C-15 | ~725, ~830 | Scaffold output is not listed, and `README.md` is marked "create" when it is a modify. | Add keep or delete rows. |
| C-16 | ~769 | `MapContainer` props are fixed after mount. `fitBounds([])` throws, and one point zooms to the maximum. | Add a `FitBounds` child using `useMap`. With 0 points, fall back to Italy's bounds. With 1 point, call `setView` at a fixed zoom. |
| C-17 | ~787 | The `[from, to, unknown, comment]` interval shape isn't handled, and intervals past midnight (`place_020`) aren't clipped. | Query day d through d+1. `unknown` counts as open with a warning. Clip each interval to the day window. |

### Style (`egm-style`)

| ID | Lines | Issue | Fix |
|---|---|---|---|
| T-M1 | 688 vs 700–701 | "Cut from the end" contradicts the cut order. | "Remove features in the cut order below; each removal leaves build and tests passing." |
| T-M2 | 688 | "A working app" can't be checked. | "After each stage, `npm run build`, `lint` and `test` pass." |
| T-M3 | 698, 700, 805, 841 | One concept has 4 names: repeats, overlap rule, drop repeated, 70% overlap. | Use "deduplicating options (`optionOverlapLimit`)" everywhere. |
| T-M4 | 798 | "Five stages" are listed as three bullets. | List all five. |
| T-M5 | 798 | "Shortest network" means MST. | Say "minimum spanning tree (Prim's)". |
| T-M6 | 795 | "Italian wall-clock" is only true with `TZ=Europe/Rome`. | Calibrate the wording, or set TZ in the scripts. |
| T-M7 | 760 | "No special card code" overclaims. | "Needs only a `<FieldValue>` call." |
| T-M8 | 754 | "Another dataset works too" is false: `cityCentres` is hand-entered. | Remove the claim. |
| T-M9 | 718 | "Bundling unreliable" names no failure mode. | Name the dynamic locale `require` error. |
| T-M10 | 721 | "Makes G7 true" is a conclusion. | Restate G7. |
| T-M11 | 833 | "9 tricky cases from the drafting test" is undefined. | List them. |
| T-M12 | 856 | "Step 6" vs "Stage 6". | Rename one of them. |
| T-M13 | 784 | "Nothing renders before ready" is too broad. | "Preference-dependent UI renders only when `ready`." |
| T-M14 | 747 | "Works fully with the keyboard" is vague. | Tab reaches every control, Space or Enter activates it, and focus follows list order. |

---

## 🟢 Nits

### Readiness

- **R-N1:** Give all 16 city-centre coordinates. Chianti is about 21 km from Florence, close to the 25 km limit.
- **R-N2:** Add a fallback for a missing `Date` header, and a memo mechanism keyed by the header.
- **R-N3:** Add the `server-only` package, or state that Next.js's built-in version is used.
- **R-N4:** `AppNav` needs `'use client'` because it calls `usePathname`.
- **R-N5:** State the map's default view (Italy, zoom 6), when it refits, and the tile URL and attribution.
- **R-N6:** `InterestControl` uses roving tabindex, and "two hearts" means two lucide `Heart` icons.
- **R-N7:** Add a `CategoryIcon` table. `PlaceCard` hours use `HoursValue`, not `FieldValue`.
- **R-N8:** Drop unknown ids in `plan()`. `days` defaults to `tripDays`. A non-boolean `mustVisit` is a 400.
- **R-N9:** Add a message template for each conflict reason, the hours format, and the scenarios for `not_enough_total_time` and `cannot_schedule_together`.
- **R-N10:** Add `makeRawPlace`, because no real record covers the missing or out-of-bounds cases. Spell out the preference fixture.
- **R-N11:** "Step 6" should be "Stage 6". State what changes in the final doc update.

### Codebase

- **C-18:** Add a fallback for a missing `Date` header. Memoise by body or ETag.
- **C-19:** `server-only` throws under Vitest. Make sure no test imports `getDataset`, or alias it to an empty module.
- **C-20:** Spell out the Vitest `@` alias with `resolve.alias`.
- **C-21:** List the category → lucide icon mapping. Use two `Heart` icons with `aria-hidden` and a text label.
- **C-22:** The ARIA radio pattern can't clear a selection. Use `aria-pressed` toggles or an explicit "Unrated" option.
- **C-23:** The missing-coordinates and unknown-type tests need synthetic records.
- **C-24:** Name the source of `tests/fixtures/italy.json` and keep it byte-identical.

### Style

- **T-N1:** "Simple loading state" is filler.
- **T-N2:** "Typed boundary" is jargon.
- **T-N3:** Move the 150 ms debounce into `config.ts` (G7).
- **T-N4:** Line 798's wording is wordy.
- **T-N5:** "Build again" is vague.
- **T-N6:** Line 833's sentence is confusing.
- **T-N7:** A network error is not a "response".
- **T-N8:** Contractions are inconsistent.
- **T-N9:** The memo sentence comes before `fetchedAt` is defined.

---

## Paths read by reviewers
- `C:\Users\miche\.copilot\installed-plugins\egm\egm\agents\implementation_readiness.md`
- `C:\Users\miche\.copilot\installed-plugins\egm\egm\agents\codebase_details.md`
- `C:\Users\miche\.copilot\installed-plugins\egm\egm\agents\style.md`
- `C:\Users\miche\.copilot\installed-plugins\egm\egm\resources\document_standards\implementation-readiness-standard.md`
- `C:\Users\miche\projects\trip-planner\docs\designs\italy_trip_planner.md`
- `C:\Users\miche\Downloads\italy.json`
