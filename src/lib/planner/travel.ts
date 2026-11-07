import type { TravelMode } from "@/lib/config";
import { haversineKm } from "@/lib/geo";
import type { Coordinates } from "@/lib/types";

/** The planner only sees this interface, so a routing service can replace the estimate later. */
export interface TravelTimeEstimator {
  /** Whole minutes, rounded up. */
  estimate(from: Coordinates, to: Coordinates): number;
}

/**
 * The fastest of the configured modes at the straight-line distance:
 * `ceil(min over modes of overhead + km × detour / speed × 60)`.
 * Each mode grows with distance, so the estimate never goes down as distance grows.
 */
export function fastestModeEstimator(modes: readonly TravelMode[]): TravelTimeEstimator {
  return {
    estimate(from, to) {
      const km = haversineKm(from, to);
      if (km === 0) return 0;
      const minutes = Math.min(...modes.map((m) => m.overheadMin + (km * m.detour * 60) / m.kmh));
      // The small allowance stops floating-point noise (25.000000000000004) from rounding up a whole minute.
      return Math.ceil(minutes - 1e-9);
    },
  };
}
