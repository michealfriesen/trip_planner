import { describe, expect, it } from "vitest";
import { PLANNER_CONFIG } from "@/lib/config";
import { fastestModeEstimator } from "@/lib/planner/travel";

const estimator = fastestModeEstimator(PLANNER_CONFIG.travelModes);
const KM_PER_DEGREE = (6371 * Math.PI) / 180;
const origin = { latitude: 42, longitude: 12 };
/** A point `km` due north of the origin. */
const north = (km: number) => ({ latitude: origin.latitude + km / KM_PER_DEGREE, longitude: origin.longitude });

describe("fastestModeEstimator", () => {
  it.each([
    [0, 0], // same spot
    [0.5, 8], // walk 7.8
    [2, 16], // local 15.2 beats walk 31.2
    [2.01, 16],
    [10, 35], // long distance 35 beats local 36
    [50, 55], // exactly 55, not rounded up by float noise
    [50.01, 56],
  ])("%d km takes %d minutes", (km, minutes) => {
    expect(estimator.estimate(origin, north(km))).toBe(minutes);
  });

  it("never goes down as distance grows", () => {
    let previous = 0;
    for (let i = 0; i <= 50_000; i++) {
      const minutes = estimator.estimate(origin, north(i / 100));
      expect(minutes).toBeGreaterThanOrEqual(previous);
      previous = minutes;
    }
  });
});
