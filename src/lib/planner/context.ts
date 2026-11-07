import "server-only";
import type opening_hours from "opening_hours";
import type { PlannerConfig } from "@/lib/config";
import { parseOpeningHours } from "@/lib/data/normalizeHours";
import { openIntervals, toMinutes, tripDates } from "@/lib/planner/time";
import { fastestModeEstimator } from "@/lib/planner/travel";
import type { Interval, PlanContext } from "@/lib/planner/types";
import type { Place } from "@/lib/types";

export interface ContextInput {
  startDate: string;
  days: number;
  dayStart: string;
  dayEnd: string;
}

/** Builds the shared planning context. Opening hours are parsed once per place and intervals cached per day. */
export function createContext(input: ContextInput, config: PlannerConfig): PlanContext {
  const dates = tripDates(input.startDate, input.days);
  const windowStart = toMinutes(input.dayStart);
  const windowEnd = toMinutes(input.dayEnd);
  const wholeWindow: Interval[] = [{ start: windowStart, end: windowEnd }];
  const parsed = new Map<string, opening_hours | null>();
  const cache = new Map<string, Interval[]>();

  function hoursFor(place: Place): opening_hours | null {
    if (!parsed.has(place.id)) {
      let oh: opening_hours | null = null;
      if ((place.hours.status === "parsed" || place.hours.status === "normalized") && place.hours.raw) {
        try {
          oh = parseOpeningHours(place.hours.raw);
        } catch {
          oh = null; // read once during cleaning, so this should not happen; fall back to "assumed open"
        }
      }
      parsed.set(place.id, oh);
    }
    return parsed.get(place.id)!;
  }

  return {
    dates,
    windowStart,
    windowEnd,
    estimator: fastestModeEstimator(config.travelModes),
    config,
    visitMinutes: (place) =>
      place.durationMinutes.status === "ok" ? place.durationMinutes.value : config.defaultVisitMinutes,
    intervals(place, dayIndex) {
      const key = `${place.id}\u0000${dayIndex}`;
      let result = cache.get(key);
      if (!result) {
        const oh = hoursFor(place);
        // Unreadable or missing hours count as open for the whole day (rule 7); the stop carries a warning.
        result = oh ? openIntervals(oh, dates[dayIndex], windowStart, windowEnd) : wholeWindow;
        cache.set(key, result);
      }
      return result;
    },
  };
}

/** True when the planner works from real opening hours for this place. */
export function hasKnownHours(place: Place): boolean {
  return place.hours.status === "parsed" || place.hours.status === "normalized";
}
