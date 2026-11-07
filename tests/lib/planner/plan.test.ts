import { describe, expect, it } from "vitest";
import snapshot from "@/data/italy.snapshot.json";
import { PLANNER_CONFIG } from "@/lib/config";
import { normalize } from "@/lib/data/normalize";
import { plan } from "@/lib/planner/plan";
import { toMinutes } from "@/lib/planner/time";
import { fastestModeEstimator } from "@/lib/planner/travel";
import type { ItineraryOption, PlanRequest, Stop } from "@/lib/planner/types";
import type { PlacePref } from "@/lib/prefs/types";
import type { Place } from "@/lib/types";
import { makePlace } from "../../fixtures/places";

const places = normalize(snapshot, "2026-11-07T00:00:00.000Z").places;

/** Saturday 27 to Monday 29 March 2027, across the clock change. */
const trip = { startDate: "2027-03-27", days: 3, dayStart: "09:00", dayEnd: "21:00" };

function run(ps: readonly Place[], prefs: Record<string, PlacePref>, t: Partial<typeof trip> = {}): ItineraryOption {
  const request: PlanRequest = { ...trip, ...t, prefs };
  const outcome = plan(ps, request, PLANNER_CONFIG);
  if (outcome.status !== "ok") throw new Error(`expected a plan, got ${JSON.stringify(outcome)}`);
  return outcome.options[0];
}

const stopsOf = (o: ItineraryOption) => o.days.flatMap((d) => d.stops.map((s) => ({ ...s, date: d.date })));
const span = (s: Stop) => [toMinutes(s.start), toMinutes(s.end)];

/** CUJ 3: everything in Rome and Florence rated, plus Brera; Colosseum and Uffizi are must-visits. */
const cuj3: Record<string, PlacePref> = Object.fromEntries(
  places
    .filter((p) => ["Rome", "Florence"].includes(p.location.city ?? "") || p.id === "place_059")
    .map((p, i) => [p.id, { interest: i % 3 === 0 ? "maybe" : "very", mustVisit: false } as PlacePref]),
);
cuj3.place_001 = { interest: "very", mustVisit: true };
cuj3.place_026 = { interest: "very", mustVisit: true };

describe("plan", () => {
  const option = run(places, cuj3);
  const stops = stopsOf(option);

  it("includes every must-visit and labels the run", () => {
    expect(option.label).toBe("Best overall");
    expect(stops.filter((s) => s.mustVisit).map((s) => s.placeId).sort()).toEqual(["place_001", "place_026"]);
  });

  it("never overlaps stops and keeps them inside the daily window", () => {
    for (const day of option.days) {
      let clock = toMinutes(trip.dayStart);
      for (const s of day.stops) {
        const [start, end] = span(s);
        expect(start).toBeGreaterThanOrEqual(clock);
        expect(end).toBeGreaterThan(start);
        expect(end).toBeLessThanOrEqual(toMinutes(trip.dayEnd));
        clock = end;
      }
    }
    expect(stops.length).toBeGreaterThan(6);
  });

  it("respects typed opening hours (G6)", () => {
    const colosseum = stops.find((s) => s.placeId === "place_001")!;
    expect(span(colosseum)[0]).toBeGreaterThanOrEqual(540);
    expect(span(colosseum)[1]).toBeLessThanOrEqual(1140);

    const uffizi = stops.find((s) => s.placeId === "place_026")!;
    expect(uffizi.date).not.toBe("2027-03-29"); // closed Mondays
    expect(span(uffizi)[0]).toBeGreaterThanOrEqual(495);
    expect(span(uffizi)[1]).toBeLessThanOrEqual(1130);

    const brera = stops.find((s) => s.placeId === "place_059");
    if (brera) {
      expect(["2027-03-27", "2027-03-28"]).toContain(brera.date);
      expect(span(brera)[0]).toBeGreaterThanOrEqual(540);
      expect(span(brera)[1]).toBeLessThanOrEqual(1140);
    }
  });

  it("flags stops at places with seasonal notes", () => {
    const colosseum = stops.find((s) => s.placeId === "place_001")!;
    expect(colosseum.warnings).toContain("seasonal_note");
  });

  it("gives the same plan whatever order places and preferences arrive in", () => {
    const shuffled = [...places].reverse();
    const prefs = Object.fromEntries(Object.entries(cuj3).reverse());
    expect(run(shuffled, prefs)).toEqual(option);
  });

  it("lists every fill place it left out, with a reason", () => {
    const placed = new Set(stops.map((s) => s.placeId));
    const rated = Object.keys(cuj3).filter((id) => !cuj3[id].mustVisit);
    for (const id of rated) {
      expect(placed.has(id) || option.unscheduled.some((u) => u.placeId === id)).toBe(true);
    }
  });

  it("adds the leg from the previous day's last stop", () => {
    const rome = { latitude: 41.9, longitude: 12.5 };
    const florence = { latitude: 43.77, longitude: 11.25 };
    const loc = (c: typeof rome) => ({ coordinates: { status: "ok" as const, value: c }, locationQuality: "ok" as const });
    const sat = makePlace({ id: "sat", location: loc(rome), hours: { raw: "Sa 09:00-18:00", status: "parsed", warnings: [] } });
    const sun = makePlace({ id: "sun", location: loc(florence), hours: { raw: "Su 09:00-18:00", status: "parsed", warnings: [] } });
    const o = run([sat, sun], { sat: { mustVisit: true }, sun: { mustVisit: true } });
    expect(o.days[0].stops[0]).toMatchObject({ placeId: "sat", travelMinutesBefore: 0 });
    const leg = fastestModeEstimator(PLANNER_CONFIG.travelModes).estimate(rome, florence);
    expect(leg).toBeGreaterThan(60);
    expect(o.days[1].stops[0]).toMatchObject({ placeId: "sun", travelMinutesBefore: leg });
  });

  it("fills places with unreadable hours only after places with known hours", () => {
    const unread = makePlace({ id: "a", hours: { raw: "Evenings", status: "unparsed", warnings: [] } });
    const known = makePlace({ id: "b", durationMinutes: { status: "ok", value: 120 } });
    const o = run([unread, known], { a: { interest: "very", mustVisit: false }, b: { interest: "maybe", mustVisit: false } }, {
      days: 1,
      dayEnd: "11:00",
    });
    expect(o.days[0].stops.map((s) => s.placeId)).toEqual(["b"]);
    expect(o.unscheduled).toEqual([{ placeId: "a", reason: "no_time" }]);
  });

  it("leaves out fill places with no usable location, and says so", () => {
    const lost = makePlace({ id: "lost", location: { coordinates: { status: "missing" }, locationQuality: "unusable" } });
    const o = run([lost], { lost: { interest: "very", mustVisit: false } });
    expect(o.label).toBe("Must-visits only");
    expect(o.unscheduled).toEqual([{ placeId: "lost", reason: "location_unusable" }]);
  });

  it("marks closed places separately from places that ran out of time", () => {
    const tue = makePlace({ id: "tue", hours: { raw: "Tu 09:00-18:00", status: "parsed", warnings: [] } });
    const o = run([tue], { tue: { interest: "very", mustVisit: false } });
    expect(o.unscheduled).toEqual([{ placeId: "tue", reason: "closed_on_trip_days" }]);
  });

  it("ignores preferences for places not in the dataset", () => {
    const o = run([makePlace()], { gone: { interest: "very", mustVisit: true } });
    expect(stopsOf(o)).toEqual([]);
  });
});
