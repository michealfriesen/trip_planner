import type { Interest, PlacePref } from "@/lib/prefs/types";
import type { PlanRequest } from "@/lib/planner/types";

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const INTERESTS: readonly Interest[] = ["not_interested", "maybe", "very"];
const MAX_DAYS = 14;
/** Far above any real dataset; bounds the work one request can ask for. */
const MAX_PREFS = 2000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isRealDate(s: string): boolean {
  const m = DATE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/**
 * Checks a Plan action body by hand. A Server Action is a public POST endpoint, so nothing is trusted.
 * Unknown place ids are kept; `plan()` drops them because it has the dataset.
 */
export function validateRequest(body: unknown): PlanRequest | { error: string } {
  if (!isRecord(body)) return { error: "The request is not an object." };
  const { startDate, days, dayStart, dayEnd, prefs } = body;

  if (typeof startDate !== "string" || !isRealDate(startDate)) return { error: "Choose a valid start date." };
  if (typeof days !== "number" || !Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
    return { error: `The trip must be 1 to ${MAX_DAYS} days long.` };
  }
  if (typeof dayStart !== "string" || !TIME.test(dayStart) || typeof dayEnd !== "string" || !TIME.test(dayEnd)) {
    return { error: "Day start and end must be times such as 09:00." };
  }
  if (dayEnd <= dayStart) return { error: "The day must end after it starts." };

  if (!isRecord(prefs)) return { error: "Preferences are missing." };
  const entries = Object.entries(prefs);
  if (entries.length > MAX_PREFS) return { error: "Too many preferences." };
  const clean: Record<string, PlacePref> = {};
  for (const [id, value] of entries) {
    if (!isRecord(value) || typeof value.mustVisit !== "boolean") return { error: "A preference is not valid." };
    if (value.interest !== undefined && !INTERESTS.includes(value.interest as Interest)) {
      return { error: "A preference has an unknown interest level." };
    }
    clean[id] =
      value.interest === undefined
        ? { mustVisit: value.mustVisit }
        : { interest: value.interest as Interest, mustVisit: value.mustVisit };
  }

  return { startDate, days, dayStart, dayEnd, prefs: clean };
}
