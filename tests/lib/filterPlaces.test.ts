import { describe, expect, it, vi } from "vitest";
import snapshot from "@/data/italy.snapshot.json";
import { normalize } from "@/lib/data/normalize";
import { EMPTY_CRITERIA, filterPlaces, type FilterCriteria } from "@/lib/discover/filterPlaces";
import { Category } from "@/lib/types";
import { makePlace } from "../fixtures/places";

function criteria(overrides: Partial<FilterCriteria>): FilterCriteria {
  return { ...EMPTY_CRITERIA, ...overrides };
}

describe("filterPlaces", () => {
  it("Food + Rome + carbonara gives exactly place_009 and place_022 (CUJ 1)", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { places } = normalize(snapshot);
    const result = filterPlaces(places, criteria({ categoryGroups: ["Food"], cities: ["Rome"], query: "carbonara" }), {});
    expect(result.matches.map((p) => p.id).sort()).toEqual(["place_009", "place_022"]);
    expect(result.uncertainMatches).toEqual([]);
    vi.restoreAllMocks();
  });

  it("matches name, description and tags without regard to accents or case", () => {
    const places = [
      makePlace({ id: "a", name: "Zeta Bar", description: "Great caffè and pastries." }),
      makePlace({ id: "b", name: "Caffè Florian" }),
      makePlace({ id: "c", name: "Museo", description: "No coffee here." }),
      makePlace({ id: "d", name: "Bar Centrale", tags: ["caffe"] }),
    ];
    const { matches } = filterPlaces(places, criteria({ query: "CAFFE" }), {});
    expect(matches.map((p) => p.id)).toEqual(["d", "b", "a"]);
  });

  it("puts a place with missing price in uncertainMatches only when the other filters pass", () => {
    const places = [
      makePlace({ id: "rome", price: { status: "missing" }, location: { ...makePlace().location, city: "Rome" } }),
      makePlace({ id: "milan", price: { status: "missing" }, location: { ...makePlace().location, city: "Milan" } }),
      makePlace({ id: "cheap", price: { status: "ok", value: 1 } }),
    ];
    const result = filterPlaces(places, criteria({ prices: [1], cities: ["Rome"] }), {});
    expect(result.matches.map((p) => p.id)).toEqual(["cheap"]);
    expect(result.uncertainMatches.map((p) => p.id)).toEqual(["rome"]);
  });

  it("puts a place with no city in uncertainMatches for a city filter", () => {
    const places = [makePlace({ id: "nocity", location: { ...makePlace().location, city: undefined } })];
    expect(filterPlaces(places, criteria({ cities: ["Rome"] }), {}).uncertainMatches.map((p) => p.id)).toEqual([
      "nocity",
    ]);
  });

  it("hides not-interested places unless shown, but always shows a not-interested must-visit", () => {
    const places = [makePlace({ id: "meh" }), makePlace({ id: "must" }), makePlace({ id: "plain" })];
    const prefs = {
      meh: { interest: "not_interested" as const, mustVisit: false },
      must: { interest: "not_interested" as const, mustVisit: true },
    };
    expect(filterPlaces(places, EMPTY_CRITERIA, prefs).matches.map((p) => p.id).sort()).toEqual(["must", "plain"]);
    expect(filterPlaces(places, criteria({ showNotInterested: true }), prefs).matches).toHaveLength(3);
  });

  it("matches Unknown only when its group is selected", () => {
    const places = [makePlace({ id: "u", type: Category.Unknown }), makePlace({ id: "m", type: Category.Museum })];
    expect(filterPlaces(places, criteria({ categoryGroups: ["Museum"] }), {}).matches.map((p) => p.id)).toEqual(["m"]);
    expect(filterPlaces(places, criteria({ categoryGroups: [Category.Unknown] }), {}).matches.map((p) => p.id)).toEqual([
      "u",
    ]);
  });
});
