import { describe, expect, it } from "vitest";
import { emptyPrefs, loadPrefs, savePrefs, withPlacePref } from "@/lib/prefs/storage";
import type { StoredPrefs } from "@/lib/prefs/types";

describe("prefs storage", () => {
  it("returns the same data after a save and load", () => {
    const prefs: StoredPrefs = {
      version: 1,
      places: {
        place_001: { mustVisit: true },
        place_002: { interest: "very", mustVisit: false },
        place_003: { interest: "not_interested", mustVisit: true },
      },
      trip: { startDate: "2027-03-27", dayStart: "08:30", dayEnd: "22:00" },
    };
    expect(loadPrefs(savePrefs(prefs))).toEqual(prefs);
  });

  it.each([
    ["null", null],
    ["bad JSON", "{not json"],
    ["a JSON array", "[]"],
    ["another version", JSON.stringify({ version: 2, places: { place_001: { mustVisit: true } } })],
  ])("gives empty preferences for %s", (_, raw) => {
    expect(loadPrefs(raw)).toEqual(emptyPrefs());
  });

  it("keeps ids that are not in the dataset", () => {
    const raw = JSON.stringify({ version: 1, places: { gone_999: { interest: "maybe", mustVisit: false } } });
    expect(loadPrefs(raw).places).toEqual({ gone_999: { interest: "maybe", mustVisit: false } });
  });

  it("drops malformed entries and trip values, keeping the rest", () => {
    const raw = JSON.stringify({
      version: 1,
      places: {
        a: { interest: "loved", mustVisit: "yes" },
        b: "very",
        c: { interest: "maybe" },
      },
      trip: { startDate: "next week", dayStart: "9am", dayEnd: "20:00" },
    });
    const prefs = loadPrefs(raw);
    expect(prefs.places).toEqual({ c: { interest: "maybe", mustVisit: false } });
    expect(prefs.trip).toEqual({ dayStart: emptyPrefs().trip.dayStart, dayEnd: "20:00" });
  });

  it("removes a place once it has neither interest nor must-visit", () => {
    const places = withPlacePref({}, "x", { interest: "very", mustVisit: true });
    const unflagged = withPlacePref(places, "x", { interest: "very", mustVisit: false });
    expect(unflagged).toEqual({ x: { interest: "very", mustVisit: false } });
    expect(withPlacePref(unflagged, "x", { interest: undefined, mustVisit: false })).toEqual({});
  });
});
