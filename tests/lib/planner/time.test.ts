import { describe, expect, it } from "vitest";
import { parseOpeningHours } from "@/lib/data/normalizeHours";
import { fromMinutes, openIntervals, toMinutes, tripDates } from "@/lib/planner/time";

describe("tripDates", () => {
  it("counts days across a month end and the clock change", () => {
    expect(tripDates("2027-03-27", 3)).toEqual(["2027-03-27", "2027-03-28", "2027-03-29"]);
    expect(tripDates("2027-02-27", 3)).toEqual(["2027-02-27", "2027-02-28", "2027-03-01"]);
  });
});

describe("toMinutes / fromMinutes", () => {
  it("round-trips, with 1440 as 24:00", () => {
    expect(toMinutes("08:15")).toBe(495);
    expect(fromMinutes(495)).toBe("08:15");
    expect(fromMinutes(1440)).toBe("24:00");
  });
});

describe("openIntervals", () => {
  const all = [0, 1440] as const;

  it("is empty on a closed weekday and open on an open one", () => {
    const uffizi = parseOpeningHours("Tues-Sun 8:15-18:50");
    expect(openIntervals(uffizi, "2027-03-29", ...all)).toEqual([]); // Monday
    expect(openIntervals(uffizi, "2027-03-30", ...all)).toEqual([{ start: 495, end: 1130 }]);
  });

  it("splits hours that run past midnight across the two days", () => {
    const late = parseOpeningHours("8:00-01:00");
    expect(openIntervals(late, "2027-03-30", ...all)).toEqual([
      { start: 0, end: 60 },
      { start: 480, end: 1440 },
    ]);
  });

  it("keeps wall-clock times on the days around the clock change", () => {
    const oh = parseOpeningHours("09:00-19:00");
    for (const date of ["2027-03-27", "2027-03-28", "2027-03-29"]) {
      expect(openIntervals(oh, date, ...all)).toEqual([{ start: 540, end: 1140 }]);
    }
  });

  it("clips to the daily window", () => {
    const oh = parseOpeningHours("09:00-19:00");
    expect(openIntervals(oh, "2027-03-30", 600, 900)).toEqual([{ start: 600, end: 900 }]);
    expect(openIntervals(oh, "2027-03-30", 1200, 1260)).toEqual([]);
  });
});
