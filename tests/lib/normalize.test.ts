import { afterEach, describe, expect, it, vi } from "vitest";
import snapshot from "@/data/italy.snapshot.json";
import { normalize } from "@/lib/data/normalize";
import { Category } from "@/lib/types";
import { makeRawPlace } from "../fixtures/places";

afterEach(() => vi.restoreAllMocks());

function quiet() {
  return vi.spyOn(console, "warn").mockImplementation(() => {});
}

describe("normalize on the snapshot", () => {
  it("keeps all 103 records and builds one issue per flag", () => {
    quiet();
    const { places, issues } = normalize(snapshot);
    expect(places).toHaveLength(103);
    expect(issues).toHaveLength(places.reduce((n, p) => n + p.flags.length, 0));
  });

  it("keeps place_059's coordinates as ok (known gap: no city check)", () => {
    quiet();
    const p = normalize(snapshot).places.find((x) => x.id === "place_059")!;
    expect(p.location.locationQuality).toBe("ok");
    expect(p.location.coordinates.status).toBe("ok");
  });

  it("marks place_020's booking as missing", () => {
    quiet();
    const p = normalize(snapshot).places.find((x) => x.id === "place_020")!;
    expect(p.bookingRequired).toEqual({ status: "missing" });
    expect(p.flags).toContain("booking_unknown");
  });

  it("logs unparsed hours with the place id and raw text", () => {
    const warn = quiet();
    normalize(snapshot);
    expect(warn).toHaveBeenCalledWith("[hours] unparsed", { placeId: "place_037", raw: "Evenings" });
  });
});

describe("normalize cleaning rules", () => {
  it("marks missing coordinates as unusable", () => {
    const [p] = normalize([makeRawPlace({ latitude: null, longitude: null })]).places;
    expect(p.location).toMatchObject({ coordinates: { status: "missing" }, locationQuality: "unusable" });
    expect(p.flags).toContain("location_unusable");
  });

  it("keeps coordinates outside the planning area but marks them unusable", () => {
    const [swapped, zero] = normalize([
      makeRawPlace({ id: "a", latitude: 12.5, longitude: 41.9 }),
      makeRawPlace({ id: "b", latitude: 0, longitude: 0 }),
    ]).places;
    for (const p of [swapped, zero]) {
      expect(p.location.coordinates.status).toBe("ok");
      expect(p.location.locationQuality).toBe("unusable");
      expect(p.flags).toContain("location_unusable");
    }
  });

  it("maps an unknown type to Unknown with a flag", () => {
    const [p] = normalize([makeRawPlace({ type: "spaceport" })]).places;
    expect(p.type).toBe(Category.Unknown);
    expect(p.flags).toContain("type_unknown");
  });

  it("merges local-favorite and local_favorite", () => {
    const [p] = normalize([makeRawPlace({ tags: ["local_favorite", " Local-Favorite ", 3, "quiet"] })]).places;
    expect(p.tags).toEqual(["local-favorite", "quiet"]);
  });

  it("renames duplicate ids and fills in missing ids", () => {
    const { places } = normalize([makeRawPlace({ id: "x" }), makeRawPlace({ id: "x" }), makeRawPlace({ id: "  " })]);
    expect(places.map((p) => p.id)).toEqual(["x", "x#2", "row_2"]);
    expect(places[1].flags).toContain("id_duplicate");
    expect(places[2].flags).toContain("id_missing");
  });

  it("flags bad duration and price as invalid", () => {
    const [p] = normalize([makeRawPlace({ duration_minutes: 0, price_range: "$$" })]).places;
    expect(p.durationMinutes).toMatchObject({ status: "invalid", raw: "0" });
    expect(p.price).toMatchObject({ status: "invalid", raw: "$$" });
    expect(p.flags).toEqual(expect.arrayContaining(["duration_default", "price_unknown"]));
  });

  it("does not throw on a broken record", () => {
    const { places } = normalize([null, 42, "text", [], { name: { nested: true }, latitude: "x" }]);
    expect(places).toHaveLength(5);
    expect(places[0]).toMatchObject({ id: "row_0", name: "Unnamed place", type: Category.Unknown });
    expect(places[4].location.coordinates.status).toBe("invalid");
  });

  it("throws only when the top level is not an array", () => {
    expect(() => normalize({ places: [] })).toThrow();
  });
});
