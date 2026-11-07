import { describe, expect, it } from "vitest";
import { validateRequest } from "@/lib/planner/validateRequest";

const valid = {
  startDate: "2027-03-27",
  days: 3,
  dayStart: "09:00",
  dayEnd: "21:00",
  prefs: { place_001: { interest: "very", mustVisit: true }, place_002: { mustVisit: false } },
};

describe("validateRequest", () => {
  it("accepts a valid request and keeps only known fields", () => {
    const result = validateRequest({ ...valid, prefs: { p: { interest: "maybe", mustVisit: false, extra: 1 } } });
    expect(result).toEqual({ ...valid, prefs: { p: { interest: "maybe", mustVisit: false } } });
  });

  it.each([
    ["not an object", null],
    ["an array", []],
    ["an impossible date", { ...valid, startDate: "2027-02-30" }],
    ["a date in another format", { ...valid, startDate: "27/03/2027" }],
    ["zero days", { ...valid, days: 0 }],
    ["too many days", { ...valid, days: 15 }],
    ["a fraction of a day", { ...valid, days: 1.5 }],
    ["24:00", { ...valid, dayEnd: "24:00" }],
    ["a time without a leading zero", { ...valid, dayStart: "9:00" }],
    ["a day that ends before it starts", { ...valid, dayStart: "18:00", dayEnd: "09:00" }],
    ["a day that ends when it starts", { ...valid, dayEnd: "09:00" }],
    ["prefs as an array", { ...valid, prefs: [] }],
    ["an unknown interest", { ...valid, prefs: { p: { interest: "love", mustVisit: false } } }],
    ["a missing mustVisit", { ...valid, prefs: { p: { interest: "very" } } }],
    ["too many prefs", { ...valid, prefs: Object.fromEntries(Array.from({ length: 2001 }, (_, i) => [`p${i}`, { mustVisit: false }])) }],
  ])("rejects %s", (_, body) => {
    expect(validateRequest(body)).toHaveProperty("error");
  });
});
