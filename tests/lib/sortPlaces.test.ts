import { describe, expect, it } from "vitest";
import { sortPlaces } from "@/lib/discover/sortPlaces";
import type { PlacePref } from "@/lib/prefs/types";
import type { Price } from "@/lib/types";
import { makePlace } from "../fixtures/places";

const ids = (places: { id: string }[]) => places.map((p) => p.id);

describe("sortPlaces", () => {
  it("sorts by rating high to low, missing last, ties by name", () => {
    const places = [
      makePlace({ id: "none", name: "A", rating: undefined }),
      makePlace({ id: "low", name: "B", rating: 3.9 }),
      makePlace({ id: "highZ", name: "Z", rating: 4.8 }),
      makePlace({ id: "highC", name: "C", rating: 4.8 }),
    ];
    expect(ids(sortPlaces(places, "rating", {}))).toEqual(["highC", "highZ", "low", "none"]);
  });

  it("puts missing and invalid prices last in both price orders", () => {
    const price = (v: Price) => ({ status: "ok" as const, value: v });
    const places = [
      makePlace({ id: "missing", name: "A", price: { status: "missing" } }),
      makePlace({ id: "p3", name: "B", price: price(3) }),
      makePlace({ id: "invalid", name: "C", price: { status: "invalid", raw: "cheap", reason: "x" } }),
      makePlace({ id: "p1", name: "D", price: price(1) }),
    ];
    expect(ids(sortPlaces(places, "price_asc", {}))).toEqual(["p1", "p3", "missing", "invalid"]);
    expect(ids(sortPlaces(places, "price_desc", {}))).toEqual(["p3", "p1", "missing", "invalid"]);
  });

  it("orders by interest: must-visit, very, maybe, unrated, not interested", () => {
    const places = ["not", "unrated", "maybe", "very", "must"].map((id) => makePlace({ id, name: id }));
    const prefs: Record<string, PlacePref> = {
      not: { interest: "not_interested", mustVisit: false },
      maybe: { interest: "maybe", mustVisit: false },
      very: { interest: "very", mustVisit: false },
      must: { interest: "not_interested", mustVisit: true },
    };
    expect(ids(sortPlaces(places, "interest", prefs))).toEqual(["must", "very", "maybe", "unrated", "not"]);
  });

  it("sorts by visit length short to long with missing last, without changing the input", () => {
    const places = [
      makePlace({ id: "none", name: "A", durationMinutes: { status: "missing" } }),
      makePlace({ id: "long", name: "B", durationMinutes: { status: "ok", value: 180 } }),
      makePlace({ id: "short", name: "C", durationMinutes: { status: "ok", value: 30 } }),
    ];
    expect(ids(sortPlaces(places, "duration", {}))).toEqual(["short", "long", "none"]);
    expect(ids(places)).toEqual(["none", "long", "short"]);
  });
});
