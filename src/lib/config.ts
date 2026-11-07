import { Category } from "@/lib/types";

const DEFAULT_DATA_URL = "https://storage.googleapis.com/interview-booking/italy.json";
const DEFAULT_REVALIDATE_SECONDS = 3600;

function positiveIntFromEnv(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return value && Number.isInteger(n) && n > 0 ? n : fallback;
}

export const DATA_URL = process.env.DATA_URL || DEFAULT_DATA_URL;

export const REVALIDATE_SECONDS = positiveIntFromEnv(
  process.env.REVALIDATE_SECONDS,
  DEFAULT_REVALIDATE_SECONDS,
);

/** The planning area: a rectangle around Italy, as [[south, west], [north, east]]. */
export const ITALY_BOUNDS = [
  [35.4, 6.6],
  [47.1, 18.6],
] as const satisfies readonly [readonly [number, number], readonly [number, number]];

/** Display groups for the category filter. Categories not listed here are their own group. */
export const CATEGORY_GROUPS: Readonly<Record<string, readonly Category[]>> = {
  Food: [Category.Restaurant, Category.Cafe],
};

export interface TravelMode {
  name: string;
  overheadMin: number;
  detour: number;
  kmh: number;
}

export interface PlannerConfig {
  /** Points per interest level. Unrated and not-interested places are never used to fill time. */
  points: { maybe: number; very: number };
  defaultVisitMinutes: number;
  /** 'HH:mm' */
  defaultDayStart: string;
  defaultDayEnd: string;
  tripDays: number;
  maxSeeds: number;
  maxOptions: number;
  /** Largest allowed share of fill places two kept options may have in common, |A∩B| / min(|A|, |B|). */
  optionOverlapLimit: number;
  travelModes: TravelMode[];
}

export const PLANNER_CONFIG: PlannerConfig = {
  points: { maybe: 1, very: 4 },
  defaultVisitMinutes: 60,
  defaultDayStart: "09:00",
  defaultDayEnd: "21:00",
  tripDays: 3,
  maxSeeds: 15,
  maxOptions: 3,
  optionOverlapLimit: 0.7,
  travelModes: [
    { name: "walk", overheadMin: 0, detour: 1.3, kmh: 5 },
    { name: "local", overheadMin: 10, detour: 1.3, kmh: 30 },
    { name: "long distance", overheadMin: 30, detour: 1.0, kmh: 120 },
  ],
};
