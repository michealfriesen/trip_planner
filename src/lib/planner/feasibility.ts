import "server-only";
import { usableCoordinates } from "@/lib/geo";
import { bestInsertion, hasSlotOnTripDays, type RouteItem } from "@/lib/planner/schedule";
import type { Conflict, DaySchedule, PlanContext } from "@/lib/planner/types";
import type { Place } from "@/lib/types";

export type FeasibilityResult = { ok: true; days: DaySchedule[] } | { ok: false; conflicts: Conflict[] };

/** 480 → "8 hours", 90 → "1 hour 30 minutes", 45 → "45 minutes". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? "hour" : "hours"}`);
  if (m > 0 || h === 0) parts.push(`${m} ${m === 1 ? "minute" : "minutes"}`);
  return parts.join(" ");
}

/** "A", "A and B", "A, B and C". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const UNMARK = "unmark it as a must-visit";

/** Weight of a minimum spanning tree over the places, in travel minutes (Prim's algorithm). */
function travelLowerBound(places: readonly Place[], ctx: PlanContext): number {
  if (places.length < 2) return 0;
  const points = places.map((p) => usableCoordinates(p)!);
  const inTree = new Array<boolean>(points.length).fill(false);
  const best = new Array<number>(points.length).fill(Infinity);
  best[0] = 0;
  let total = 0;
  for (let n = 0; n < points.length; n++) {
    let next = -1;
    for (let i = 0; i < points.length; i++) if (!inTree[i] && (next === -1 || best[i] < best[next])) next = i;
    inTree[next] = true;
    total += best[next];
    for (let i = 0; i < points.length; i++) {
      if (!inTree[i]) best[i] = Math.min(best[i], ctx.estimator.estimate(points[next], points[i]));
    }
  }
  return total;
}

/**
 * Checks that every must-visit can be placed, in five stages, returning at the first stage that finds conflicts.
 * On success, returns the must-visit schedule that option building starts from.
 */
export function checkFeasibility(musts: readonly Place[], ctx: PlanContext): FeasibilityResult {
  const windowLength = ctx.windowEnd - ctx.windowStart;
  const empty: DaySchedule[] = ctx.dates.map(() => []);

  // 1. Location unknown.
  const unlocated = musts.filter((p) => !usableCoordinates(p));
  if (unlocated.length > 0) {
    return {
      ok: false,
      conflicts: unlocated.map((p) => ({
        placeIds: [p.id],
        reason: "location_unusable",
        message: `We don't know where ${p.name} is, so it can't be planned. Please ${UNMARK}.`,
      })),
    };
  }

  // 2. Longer than the day.
  const tooLong = musts.filter((p) => ctx.visitMinutes(p) > windowLength);
  if (tooLong.length > 0) {
    return {
      ok: false,
      conflicts: tooLong.map((p) => ({
        placeIds: [p.id],
        reason: "longer_than_day",
        message:
          `${p.name} takes ${formatDuration(ctx.visitMinutes(p))}, but your day is only ` +
          `${formatDuration(windowLength)} long. Widen your daily hours or ${UNMARK}.`,
      })),
    };
  }

  // 3. Closed on every trip day. Unreadable or missing hours count as open (whole window).
  const closed = musts.filter((p) => !hasSlotOnTripDays(p, ctx));
  if (closed.length > 0) {
    return {
      ok: false,
      conflicts: closed.map((p) => ({
        placeIds: [p.id],
        reason: "closed_on_trip_days",
        message:
          `${p.name} is not open for ${formatDuration(ctx.visitMinutes(p))} within your daily hours on any day ` +
          `of your trip. Try other dates, widen your daily hours, or ${UNMARK}.`,
      })),
    };
  }

  // 4. Not enough total time: visits plus a lower bound on travel.
  const ordered = [...musts].sort((a, b) => ctx.visitMinutes(b) - ctx.visitMinutes(a) || a.id.localeCompare(b.id));
  const needed = ordered.reduce((sum, p) => sum + ctx.visitMinutes(p), 0) + travelLowerBound(ordered, ctx);
  const available = windowLength * ctx.dates.length;
  if (needed > available) {
    return {
      ok: false,
      conflicts: [
        {
          placeIds: ordered.map((p) => p.id),
          reason: "not_enough_total_time",
          message:
            `Your must-visits need at least ${formatDuration(needed)} including travel, but your trip has ` +
            `${formatDuration(available)}. Unmark some must-visits or widen your daily hours.`,
        },
      ],
    };
  }

  // 5. Greedy insertion, longest visit first. Failing here means "no plan found", not "impossible".
  let days = empty;
  const conflicts: Conflict[] = [];
  for (const place of ordered) {
    const item: RouteItem = { place, mustVisit: true };
    const placed = bestInsertion(days, item, ctx);
    if (placed) {
      days = placed.days;
      continue;
    }
    const visit = ctx.visitMinutes(place);
    const usableDays = ctx.dates
      .map((_, d) => d)
      .filter((d) => ctx.intervals(place, d).some((iv) => iv.end - iv.start >= visit));
    const blockers = usableDays.flatMap((d) => days[d].map((s) => s.place));
    const names = blockers.map((p) => p.name);
    conflicts.push({
      placeIds: [place.id, ...blockers.map((p) => p.id)],
      reason: "cannot_schedule_together",
      message:
        names.length > 0
          ? `We could not find a plan that fits ${place.name} together with ${listNames(names)}. ` +
            `Unmark one of them as a must-visit, widen your daily hours, or try other dates.`
          : `We could not find a time for ${place.name} on your trip. Widen your daily hours, try other dates, ` +
            `or ${UNMARK}.`,
    });
  }
  return conflicts.length > 0 ? { ok: false, conflicts } : { ok: true, days };
}
