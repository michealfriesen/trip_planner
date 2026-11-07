import { PLANNER_CONFIG } from "@/lib/config";
import type { Interest, PlacePref, StoredPrefs } from "@/lib/prefs/types";

export const STORAGE_KEY = "trip-planner:prefs:v1";

const INTERESTS: readonly Interest[] = ["not_interested", "maybe", "very"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

export function emptyPrefs(): StoredPrefs {
  return {
    version: 1,
    places: {},
    trip: { dayStart: PLANNER_CONFIG.defaultDayStart, dayEnd: PLANNER_CONFIG.defaultDayEnd },
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function cleanPref(v: unknown): PlacePref | undefined {
  if (!isRecord(v)) return undefined;
  const interest = INTERESTS.includes(v.interest as Interest) ? (v.interest as Interest) : undefined;
  const mustVisit = v.mustVisit === true;
  if (!interest && !mustVisit) return undefined;
  return interest ? { interest, mustVisit } : { mustVisit };
}

/** Reads stored preferences. Null, broken JSON or another version give empty preferences. Unknown place ids are kept. */
export function loadPrefs(raw: string | null): StoredPrefs {
  if (raw === null) return emptyPrefs();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyPrefs();
  }
  if (!isRecord(data) || data.version !== 1) return emptyPrefs();

  const prefs = emptyPrefs();
  if (isRecord(data.places)) {
    for (const [id, value] of Object.entries(data.places)) {
      const pref = cleanPref(value);
      if (pref) prefs.places[id] = pref;
    }
  }
  if (isRecord(data.trip)) {
    const { startDate, dayStart, dayEnd } = data.trip;
    if (typeof startDate === "string" && DATE.test(startDate)) prefs.trip.startDate = startDate;
    if (typeof dayStart === "string" && TIME.test(dayStart)) prefs.trip.dayStart = dayStart;
    if (typeof dayEnd === "string" && TIME.test(dayEnd)) prefs.trip.dayEnd = dayEnd;
  }
  return prefs;
}

export function savePrefs(prefs: StoredPrefs): string {
  return JSON.stringify(prefs);
}

/** Returns the places map with one place's preference replaced. An empty preference removes the entry. */
export function withPlacePref(
  places: Record<string, PlacePref>,
  id: string,
  pref: PlacePref,
): Record<string, PlacePref> {
  const next = { ...places };
  if (pref.interest === undefined && !pref.mustVisit) delete next[id];
  else next[id] = pref.interest === undefined ? { mustVisit: pref.mustVisit } : pref;
  return next;
}
