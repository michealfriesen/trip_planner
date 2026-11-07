// Types only: shared by the server planner and the Plan UI, so the browser never imports server code.
import type { PlannerConfig } from "@/lib/config";
import type { PlacePref } from "@/lib/prefs/types";
import type { Place, PlaceFlag } from "@/lib/types";
import type { TravelTimeEstimator } from "@/lib/planner/travel";

export interface PlanRequest {
  /** 'YYYY-MM-DD' */
  startDate: string;
  /** 1–14 */
  days: number;
  /** 'HH:mm' */
  dayStart: string;
  dayEnd: string;
  /** Keyed by Place.id. */
  prefs: Record<string, PlacePref>;
}

export type StopWarning =
  | "hours_unparsed_assumed_open"
  | "hours_missing_assumed_open"
  | "hours_normalized"
  | "duration_default"
  | "seasonal_note";

export type Badge = PlaceFlag | StopWarning;

export interface Stop {
  placeId: string;
  /** 'HH:mm' */
  start: string;
  end: string;
  /** For a day's first stop: travel from the previous day's last stop; 0 on the trip's first stop. */
  travelMinutesBefore: number;
  mustVisit: boolean;
  warnings: StopWarning[];
}

export interface DayPlan {
  /** 'YYYY-MM-DD' */
  date: string;
  stops: Stop[];
}

export type UnscheduledReason = "no_time" | "closed_on_trip_days" | "location_unusable";

export interface Unscheduled {
  placeId: string;
  reason: UnscheduledReason;
}

export interface ItineraryOption {
  /** "Best overall", "Must-visits only" or "Built around <seed place name>". */
  label: string;
  days: DayPlan[];
  points: number;
  unscheduled: Unscheduled[];
}

export type ConflictReason =
  | "longer_than_day"
  | "closed_on_trip_days"
  | "not_enough_total_time"
  | "cannot_schedule_together"
  | "location_unusable";

export interface Conflict {
  placeIds: string[];
  reason: ConflictReason;
  /** A plain sentence with a suggested fix. */
  message: string;
}

/** What the planner itself returns; the action adds the data source. */
export type PlanOutcome =
  | { status: "ok"; options: ItineraryOption[] }
  | { status: "infeasible"; conflicts: Conflict[] };

export type PlanResult =
  | { status: "ok"; options: ItineraryOption[]; source: "live" | "snapshot" }
  | { status: "infeasible"; conflicts: Conflict[] }
  | { status: "bad_request"; message: string };

// ---- Server-side scheduling types ----

/** Minutes after midnight, clipped to the daily window. */
export interface Interval {
  start: number;
  end: number;
  /** The library could not say whether the place is open; counted as open. */
  unknown?: boolean;
}

export interface PlanContext {
  dates: string[];
  windowStart: number;
  windowEnd: number;
  estimator: TravelTimeEstimator;
  config: PlannerConfig;
  visitMinutes(place: Place): number;
  /** Cached per place and day. */
  intervals(place: Place, dayIndex: number): Interval[];
}

export interface ScheduledStop {
  place: Place;
  mustVisit: boolean;
  start: number;
  end: number;
  travelBefore: number;
  /** The visit used an interval the library marked unknown. */
  unknownHours: boolean;
}

/** One day's route, in visiting order. */
export type DaySchedule = ScheduledStop[];
