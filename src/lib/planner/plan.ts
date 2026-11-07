import "server-only";
import type { PlannerConfig } from "@/lib/config";
import { usableCoordinates } from "@/lib/geo";
import { buildOption, type FillCandidate } from "@/lib/planner/buildOption";
import { createContext } from "@/lib/planner/context";
import { checkFeasibility } from "@/lib/planner/feasibility";
import type { PlanOutcome, PlanRequest, Unscheduled } from "@/lib/planner/types";
import type { Place } from "@/lib/types";

/**
 * Plans a trip. Deterministic: places are taken in id order, and every choice breaks ties on id.
 * Stage 4 runs the unseeded "Best overall" run only; seeds and the overlap rule are stage 6.
 */
export function plan(places: readonly Place[], request: PlanRequest, config: PlannerConfig): PlanOutcome {
  const ctx = createContext(request, config);
  const byId = [...places].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // 1. Candidates. Preference ids not in the dataset are dropped here.
  const musts: Place[] = [];
  const fills: FillCandidate[] = [];
  const unlocated: Unscheduled[] = [];
  for (const place of byId) {
    const pref = Object.hasOwn(request.prefs, place.id) ? request.prefs[place.id] : undefined;
    if (!pref) continue;
    if (pref.mustVisit) {
      musts.push(place);
    } else if (pref.interest === "maybe" || pref.interest === "very") {
      if (usableCoordinates(place)) fills.push({ place, points: config.points[pref.interest] });
      else unlocated.push({ placeId: place.id, reason: "location_unusable" });
    }
  }

  // 2. Feasibility of the must-visits.
  const feasible = checkFeasibility(musts, ctx);
  if (!feasible.ok) return { status: "infeasible", conflicts: feasible.conflicts };

  // 4. One unseeded run. (3, seeds, and 6, picking among runs, come in stage 6; 5, 2-opt, in stage 8.)
  const label = fills.length === 0 ? "Must-visits only" : "Best overall";
  const option = buildOption(feasible.days, fills, null, label, ctx)!;
  option.unscheduled.push(...unlocated);
  return { status: "ok", options: [option] };
}
