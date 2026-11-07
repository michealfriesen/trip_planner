import { describe, expect, it } from "vitest";
import snapshot from "@/data/italy.snapshot.json";
import { PLANNER_CONFIG } from "@/lib/config";
import { normalize } from "@/lib/data/normalize";
import { createContext } from "@/lib/planner/context";
import { checkFeasibility, formatDuration, listNames } from "@/lib/planner/feasibility";
import { plan } from "@/lib/planner/plan";
import type { Place } from "@/lib/types";
import { makePlace } from "../../fixtures/places";

const places = normalize(snapshot, "2026-11-07T00:00:00.000Z").places;
const byId = (id: string) => places.find((p) => p.id === id)!;

/** Saturday 27 to Monday 29 March 2027. */
const trip = { startDate: "2027-03-27", days: 3, dayStart: "09:00", dayEnd: "21:00" };
const check = (musts: Place[], t: Partial<typeof trip> = {}) =>
  checkFeasibility(musts, createContext({ ...trip, ...t }, PLANNER_CONFIG));

const hours = (raw: string) => ({ raw, status: "parsed" as const, warnings: [] });
const minutes = (value: number) => ({ status: "ok" as const, value });
const at = (latitude: number, longitude: number) => ({
  coordinates: { status: "ok" as const, value: { latitude, longitude } },
  locationQuality: "ok" as const,
});

describe("formatDuration and listNames", () => {
  it("writes durations and lists in words", () => {
    expect(formatDuration(480)).toBe("8 hours");
    expect(formatDuration(90)).toBe("1 hour 30 minutes");
    expect(formatDuration(45)).toBe("45 minutes");
    expect(listNames(["A", "B", "C"])).toBe("A, B and C");
  });
});

describe("checkFeasibility", () => {
  it("rejects a must-visit with no usable location", () => {
    const lost = makePlace({
      id: "lost",
      location: { coordinates: { status: "missing" }, locationQuality: "unusable" },
    });
    const result = check([lost, makePlace()]);
    expect(result).toMatchObject({ ok: false, conflicts: [{ placeIds: ["lost"], reason: "location_unusable" }] });
  });

  it("CUJ 4: flags only the day trip that is longer than the day", () => {
    const result = check([byId("place_035"), byId("place_038"), byId("place_089")], { dayEnd: "16:00" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({ placeIds: ["place_035"], reason: "longer_than_day" });
    expect(result.conflicts[0].message).toContain("8 hours");
    expect(result.conflicts[0].message).toContain("7 hours");
  });

  it("rejects a must-visit that is closed on every trip day", () => {
    const result = check([makePlace({ id: "tue", hours: hours("Tu 09:00-18:00") })]);
    expect(result).toMatchObject({ ok: false, conflicts: [{ placeIds: ["tue"], reason: "closed_on_trip_days" }] });
  });

  it("rejects must-visits that need more time than the trip has", () => {
    const musts = ["a", "b", "c"].map((id, i) =>
      makePlace({ id, durationMinutes: minutes(70), location: at(41.9 + i * 0.05, 12.5) }),
    );
    const result = check(musts, { days: 1, dayEnd: "12:00" });
    expect(result).toMatchObject({ ok: false, conflicts: [{ reason: "not_enough_total_time" }] });
  });

  it("names the must-visits that block one another", () => {
    const sat = { hours: hours("Sa 09:00-12:00"), durationMinutes: minutes(120) };
    const result = check([makePlace({ id: "a", name: "A", ...sat }), makePlace({ id: "b", name: "B", ...sat })]);
    expect(result).toMatchObject({
      ok: false,
      conflicts: [{ placeIds: ["b", "a"], reason: "cannot_schedule_together" }],
    });
    if (!result.ok) expect(result.conflicts[0].message).toContain("could not find a plan that fits B together with A");
  });

  it("plans a must-visit with unreadable hours, with a warning", () => {
    const rasputin = byId("place_037");
    expect(rasputin.hours.status).toBe("unparsed");
    const outcome = plan(places, { ...trip, prefs: { place_037: { mustVisit: true } } }, PLANNER_CONFIG);
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    const stop = outcome.options[0].days.flatMap((d) => d.stops).find((s) => s.placeId === "place_037");
    expect(stop?.warnings).toContain("hours_unparsed_assumed_open");
  });
});
