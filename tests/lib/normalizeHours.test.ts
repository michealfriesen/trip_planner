import { afterEach, describe, expect, it, vi } from "vitest";
import snapshot from "@/data/italy.snapshot.json";
import { normalizeHours, parseOpeningHours } from "@/lib/data/normalizeHours";

afterEach(() => vi.restoreAllMocks());

/** Open intervals for one local day, in minutes after midnight (1440 = midnight). */
function intervalsOn(raw: string, isoDate: string): [number, number][] {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dayStart = new Date(y, m - 1, d);
  const dayEnd = new Date(y, m - 1, d + 1);
  const toMin = (t: Date) => (t.getTime() >= dayEnd.getTime() ? 1440 : t.getHours() * 60 + t.getMinutes());
  return parseOpeningHours(raw)
    .getOpenIntervals(dayStart, dayEnd)
    .map(([from, to]) => [toMin(from), toMin(to)]);
}

describe("normalizeHours on the snapshot", () => {
  const records = snapshot as { hours: unknown }[];
  const distinct = [...new Set(records.map((r) => r.hours).filter((h): h is string => typeof h === "string"))];

  it("is missing only for null hours", () => {
    for (const r of records) {
      expect(normalizeHours(r.hours).status === "missing").toBe(r.hours === null);
    }
  });

  it("splits the 57 distinct strings 17 / 37 / 3", () => {
    const byStatus = { parsed: [] as string[], normalized: [] as string[], unparsed: [] as string[] };
    for (const h of distinct) {
      const { status } = normalizeHours(h);
      if (status !== "missing") byStatus[status].push(h);
    }
    expect(distinct).toHaveLength(57);
    expect(byStatus.parsed).toHaveLength(17);
    expect(byStatus.normalized).toHaveLength(37);
    expect(byStatus.unparsed.sort()).toEqual(["9am-12:30pm", "Evenings", "Morning only"]);
  });
});

describe("normalizeHours", () => {
  it("treats empty and blank strings as missing", () => {
    expect(normalizeHours("")).toEqual({ status: "missing", warnings: [] });
    expect(normalizeHours("   ")).toEqual({ status: "missing", warnings: [] });
    expect(normalizeHours(undefined)).toEqual({ status: "missing", warnings: [] });
  });

  it("keeps the raw text and warnings when normalized", () => {
    const hours = normalizeHours("8am-7pm");
    expect(hours.status).toBe("normalized");
    expect(hours.raw).toBe("8am-7pm");
    expect(hours.warnings.length).toBeGreaterThan(0);
  });

  const TUESDAY = "2027-03-23";
  const SATURDAY = "2027-03-27";
  const cases: [string, "parsed" | "normalized", [number, number][], [number, number][]][] = [
    ["8:00-01:00", "parsed", [[0, 60], [480, 1440]], [[0, 60], [480, 1440]]],
    ["Wed-Mon 10:00-19:00", "normalized", [], [[600, 1140]]],
    ["Tues, Thurs-Sun 10:00-18:00", "normalized", [[600, 1080]], [[600, 1080]]],
    ["Daily 10:00-24:00", "normalized", [[600, 1440]], [[600, 1440]]],
    ["8am-7pm", "normalized", [[480, 1140]], [[480, 1140]]],
    ["Sat-Sun 9:00-19:00", "normalized", [], [[540, 1140]]],
    ["Mon-Fri 7:00-14:00, Sat 7:00-17:00", "normalized", [[420, 840]], [[420, 1020]]],
  ];

  it.each(cases)("%s is %s with the expected intervals", (raw, status, tuesday, saturday) => {
    expect(normalizeHours(raw).status).toBe(status);
    expect(intervalsOn(raw, TUESDAY)).toEqual(tuesday);
    expect(intervalsOn(raw, SATURDAY)).toEqual(saturday);
  });

  it.each(["9am-12:30pm", "Evenings", "Morning only"])("%s is unparsed", (raw) => {
    expect(normalizeHours(raw)).toEqual({ raw, status: "unparsed", warnings: [] });
  });
});
