import "server-only";
import { hasKnownHours } from "@/lib/planner/context";
import { bestInsertion, hasSlotOnTripDays, type Insertion } from "@/lib/planner/schedule";
import { fromMinutes } from "@/lib/planner/time";
import type {
  DaySchedule,
  ItineraryOption,
  PlanContext,
  ScheduledStop,
  Stop,
  StopWarning,
  Unscheduled,
} from "@/lib/planner/types";
import type { Place } from "@/lib/types";

/** A fill candidate: a place with interest and a usable location, not a must-visit. */
export interface FillCandidate {
  place: Place;
  points: number;
}

function stopWarnings(s: ScheduledStop): StopWarning[] {
  const warnings: StopWarning[] = [];
  const { hours, durationMinutes, seasonalNotes } = s.place;
  if (hours.status === "unparsed") warnings.push("hours_unparsed_assumed_open");
  else if (hours.status === "missing") warnings.push("hours_missing_assumed_open");
  else if (hours.status === "normalized" || s.unknownHours) warnings.push("hours_normalized");
  if (durationMinutes.status !== "ok") warnings.push("duration_default");
  if (seasonalNotes) warnings.push("seasonal_note");
  return warnings;
}

function toStop(s: ScheduledStop): Stop {
  return {
    placeId: s.place.id,
    start: fromMinutes(s.start),
    end: fromMinutes(s.end),
    travelMinutesBefore: s.travelBefore,
    mustVisit: s.mustVisit,
    warnings: stopWarnings(s),
  };
}

function rating(p: Place): number {
  return p.rating ?? -1;
}

/**
 * Greedy fill: each round inserts the candidate with the best points / (visit + extra travel).
 * Ties go to the higher dataset rating, then the lower id. Stops when nothing more fits.
 */
function fill(days: DaySchedule[], candidates: FillCandidate[], ctx: PlanContext): DaySchedule[] {
  const remaining = [...candidates];
  for (;;) {
    let best: { index: number; insertion: Insertion; score: number } | null = null;
    for (let i = 0; i < remaining.length; i++) {
      const { place, points } = remaining[i];
      const insertion = bestInsertion(days, { place, mustVisit: false }, ctx);
      if (!insertion) continue;
      const score = points / (ctx.visitMinutes(place) + insertion.extraTravel);
      if (
        !best ||
        score > best.score ||
        (score === best.score && rating(place) > rating(remaining[best.index].place)) ||
        (score === best.score &&
          rating(place) === rating(remaining[best.index].place) &&
          place.id < remaining[best.index].place.id)
      ) {
        best = { index: i, insertion, score };
      }
    }
    if (!best) return days;
    days = best.insertion.days;
    remaining.splice(best.index, 1);
  }
}

/**
 * Builds one itinerary from the must-visit schedule. If `seed` is set it is placed first; returns null when the
 * seed does not fit. Places with known hours fill first; places with unreadable or missing hours only get the
 * time left over.
 */
export function buildOption(
  mustDays: DaySchedule[],
  fills: FillCandidate[],
  seed: FillCandidate | null,
  label: string,
  ctx: PlanContext,
): ItineraryOption | null {
  let days = mustDays;
  let candidates = fills;
  if (seed) {
    const placed = bestInsertion(days, { place: seed.place, mustVisit: false }, ctx);
    if (!placed) return null;
    days = placed.days;
    candidates = fills.filter((f) => f.place.id !== seed.place.id);
  }

  days = fill(
    days,
    candidates.filter((c) => hasKnownHours(c.place)),
    ctx,
  );
  days = fill(
    days,
    candidates.filter((c) => !hasKnownHours(c.place)),
    ctx,
  );

  const placedIds = new Set(days.flatMap((d) => d.map((s) => s.place.id)));
  const points = fills.filter((f) => placedIds.has(f.place.id)).reduce((sum, f) => sum + f.points, 0);
  const unscheduled: Unscheduled[] = fills
    .filter((f) => !placedIds.has(f.place.id))
    .map((f) => ({
      placeId: f.place.id,
      reason: hasSlotOnTripDays(f.place, ctx) ? "no_time" : "closed_on_trip_days",
    }));

  return {
    label,
    days: days.map((d, i) => ({ date: ctx.dates[i], stops: d.map(toStop) })),
    points,
    unscheduled,
  };
}
