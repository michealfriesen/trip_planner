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
