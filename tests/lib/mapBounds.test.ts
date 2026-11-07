import { describe, expect, it } from "vitest";
import { placesInBounds } from "@/lib/discover/mapBounds";
import { makePlace } from "../fixtures/places";

const at = (id: string, latitude: number, longitude: number) =>
  makePlace({
    id,
    location: { coordinates: { status: "ok", value: { latitude, longitude } }, locationQuality: "ok", city: "X", region: "Y" },
  });

const ROME_VIEW = { south: 41.8, west: 12.4, north: 42.0, east: 12.6 };

describe("placesInBounds", () => {
  it("keeps places inside the view, including on its edges, and drops those outside", () => {
    const places = [
      at("inside", 41.9, 12.5),
      at("edge", 42.0, 12.4),
      at("north", 42.1, 12.5),
      at("east", 41.9, 12.7),
    ];
    expect(placesInBounds(places, ROME_VIEW).map((p) => p.id)).toEqual(["inside", "edge"]);
  });

  it("drops places without a usable location, since they have no pin", () => {
    const unusable = makePlace({
      id: "unusable",
      location: {
        coordinates: { status: "ok", value: { latitude: 41.9, longitude: 12.5 } },
        locationQuality: "unusable",
        city: "Rome",
        region: "Lazio",
      },
    });
    const missing = makePlace({
      id: "missing",
      location: { coordinates: { status: "missing" }, locationQuality: "unusable", city: "Rome", region: "Lazio" },
    });
    expect(placesInBounds([unusable, missing], ROME_VIEW)).toEqual([]);
  });
});
