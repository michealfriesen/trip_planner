import { usableCoordinates } from "@/lib/geo";
import type { DaySchedule, PlanContext, ScheduledStop } from "@/lib/planner/types";
import type { Coordinates, Place } from "@/lib/types";

/** A place to put on the route; `mustVisit` is carried through to the stop. */
export interface RouteItem {
  place: Place;
  mustVisit: boolean;
}

function coords(place: Place): Coordinates {
  // Only places with usable coordinates become candidates, so this never fails in practice.
  const c = usableCoordinates(place);
  if (!c) throw new Error(`Place ${place.id} has no usable location`);
  return c;
}

/**
 * Times one day's route with the earliest possible start for each stop (scheduling rules 1–4).
 * `origin` is the last stop of the previous non-empty day, or null on the trip's first day with stops.
 * Returns null if any stop misses its opening hours or the daily window.
 */
export function timeDay(
  items: readonly RouteItem[],
  dayIndex: number,
  origin: Coordinates | null,
  ctx: PlanContext,
): DaySchedule | null {
  const stops: ScheduledStop[] = [];
  let clock = ctx.windowStart;
  let from = origin;
  for (const { place, mustVisit } of items) {
    const here = coords(place);
    const travel = from ? ctx.estimator.estimate(from, here) : 0;
    const arrival = clock + travel;
    const visit = ctx.visitMinutes(place);
    const interval = ctx
      .intervals(place, dayIndex)
      .find((iv) => Math.max(arrival, iv.start) + visit <= iv.end);
    if (!interval) return null;
    const start = Math.max(arrival, interval.start);
    const end = start + visit;
    if (end > ctx.windowEnd) return null;
    stops.push({ place, mustVisit, start, end, travelBefore: travel, unknownHours: interval.unknown === true });
    clock = end;
    from = here;
  }
  return stops;
}

function lastStopBefore(days: readonly DaySchedule[], dayIndex: number): Coordinates | null {
  for (let d = dayIndex - 1; d >= 0; d--) {
    const day = days[d];
    if (day.length > 0) return coords(day[day.length - 1].place);
  }
  return null;
}

function nextNonEmptyDay(days: readonly DaySchedule[], dayIndex: number): number {
  for (let d = dayIndex + 1; d < days.length; d++) if (days[d].length > 0) return d;
  return -1;
}

function travelOf(day: DaySchedule): number {
  return day.reduce((sum, s) => sum + s.travelBefore, 0);
}

export interface Insertion {
  days: DaySchedule[];
  /** Added travel minutes, including any change to the leg into the next non-empty day. */
  extraTravel: number;
}

/**
 * Inserts `item` at `position` on day `dayIndex`. Re-times that day and the next non-empty day, whose first leg
 * may change; later days are unaffected. Returns null if any stop no longer fits.
 */
export function tryInsert(
  days: readonly DaySchedule[],
  dayIndex: number,
  item: RouteItem,
  position: number,
  ctx: PlanContext,
): Insertion | null {
  const day = days[dayIndex];
  const items: RouteItem[] = day.map((s) => ({ place: s.place, mustVisit: s.mustVisit }));
  items.splice(position, 0, item);
  const timed = timeDay(items, dayIndex, lastStopBefore(days, dayIndex), ctx);
  if (!timed) return null;

  const next = [...days];
  next[dayIndex] = timed;
  let extraTravel = travelOf(timed) - travelOf(day);

  const after = nextNonEmptyDay(days, dayIndex);
  if (after !== -1) {
    const afterItems = days[after].map((s) => ({ place: s.place, mustVisit: s.mustVisit }));
    const origin = coords(timed[timed.length - 1].place);
    const retimed = timeDay(afterItems, after, origin, ctx);
    if (!retimed) return null;
    next[after] = retimed;
    extraTravel += travelOf(retimed) - travelOf(days[after]);
  }
  return { days: next, extraTravel };
}

/** The insertion with the least added travel. Ties go to the earlier day, then the earlier position. */
export function bestInsertion(days: readonly DaySchedule[], item: RouteItem, ctx: PlanContext): Insertion | null {
  let best: Insertion | null = null;
  for (let d = 0; d < days.length; d++) {
    for (let pos = 0; pos <= days[d].length; pos++) {
      const result = tryInsert(days, d, item, pos, ctx);
      if (result && (!best || result.extraTravel < best.extraTravel)) best = result;
    }
  }
  return best;
}

/** True when the place has an opening at least as long as its visit, inside the window, on some trip day. */
export function hasSlotOnTripDays(place: Place, ctx: PlanContext): boolean {
  const visit = ctx.visitMinutes(place);
  return ctx.dates.some((_, d) => ctx.intervals(place, d).some((iv) => iv.end - iv.start >= visit));
}
