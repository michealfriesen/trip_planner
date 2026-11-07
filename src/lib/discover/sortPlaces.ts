import type { PlacePref } from "@/lib/prefs/types";
import type { Field, Place } from "@/lib/types";

export type SortKey = "name" | "rating" | "price_asc" | "price_desc" | "interest" | "duration";

export const SORT_OPTIONS: readonly { key: SortKey; label: string }[] = [
  { key: "name", label: "Name (A–Z)" },
  { key: "rating", label: "Rating (high to low)" },
  { key: "price_asc", label: "Price (low to high)" },
  { key: "price_desc", label: "Price (high to low)" },
  { key: "interest", label: "My interest" },
  { key: "duration", label: "Visit length (short to long)" },
];

function byName(a: Place, b: Place): number {
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

function fieldValue<T>(f: Field<T>): T | undefined {
  return f.status === "ok" ? f.value : undefined;
}

function interestRank(pref: PlacePref | undefined): number {
  if (pref?.mustVisit) return 0;
  switch (pref?.interest) {
    case "very":
      return 1;
    case "maybe":
      return 2;
    case undefined:
      return 3;
    case "not_interested":
      return 4;
  }
}

/** Sorts by a number, smallest first; places without one go last. */
function byNumber(value: (p: Place) => number | undefined) {
  return (a: Place, b: Place) => {
    const va = value(a);
    const vb = value(b);
    if (va === undefined || vb === undefined) return (va === undefined ? 1 : 0) - (vb === undefined ? 1 : 0);
    return va - vb;
  };
}

/** Returns a new array in the chosen order. Missing values sort last; ties fall back to name, then id. */
export function sortPlaces(places: Place[], key: SortKey, prefs: Record<string, PlacePref>): Place[] {
  const primary: Record<SortKey, (a: Place, b: Place) => number> = {
    name: () => 0,
    rating: byNumber((p) => (p.rating === undefined ? undefined : -p.rating)),
    price_asc: byNumber((p) => fieldValue(p.price)),
    price_desc: byNumber((p) => {
      const v = fieldValue(p.price);
      return v === undefined ? undefined : -v;
    }),
    interest: (a, b) => interestRank(prefs[a.id]) - interestRank(prefs[b.id]),
    duration: byNumber((p) => fieldValue(p.durationMinutes)),
  };
  const compare = primary[key];
  return [...places].sort((a, b) => compare(a, b) || byName(a, b));
}
