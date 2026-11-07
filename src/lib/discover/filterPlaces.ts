import { CATEGORY_GROUPS } from "@/lib/config";
import { foldText } from "@/lib/discover/text";
import type { PlacePref } from "@/lib/prefs/types";
import { Category, type Place, type Price } from "@/lib/types";

export interface FilterCriteria {
  /** Keys of CATEGORY_GROUPS, or a Category value for a category that is its own group. */
  categoryGroups: string[];
  cities: string[];
  prices: Price[];
  tags: string[];
  query: string;
  showNotInterested: boolean;
}

export interface FilterResult {
  matches: Place[];
  /** Pass every filter except that a tested field (city or price) is missing or invalid. */
  uncertainMatches: Place[];
}

export const EMPTY_CRITERIA: FilterCriteria = {
  categoryGroups: [],
  cities: [],
  prices: [],
  tags: [],
  query: "",
  showNotInterested: false,
};

/** The display group a category belongs to: a CATEGORY_GROUPS key, or the category itself. */
export function categoryGroupOf(category: Category): string {
  for (const [group, members] of Object.entries(CATEGORY_GROUPS)) {
    if (members.includes(category)) return group;
  }
  return category;
}

export interface FilterOptions {
  categoryGroups: string[];
  cities: string[];
  prices: Price[];
  tags: string[];
}

/** Filter choices taken from the data, so another dataset gets its own options. */
export function filterOptions(places: Place[]): FilterOptions {
  const groups = new Set<string>();
  const cities = new Set<string>();
  const prices = new Set<Price>();
  const tags = new Set<string>();
  for (const p of places) {
    groups.add(categoryGroupOf(p.type));
    if (p.location.city) cities.add(p.location.city);
    if (p.price.status === "ok") prices.add(p.price.value);
    p.tags.forEach((t) => tags.add(t));
  }
  const byText = (a: string, b: string) => a.localeCompare(b);
  // Configured groups first, then single categories in enum order, with Unknown last.
  const groupOrder = [...Object.keys(CATEGORY_GROUPS), ...Object.values(Category)];
  return {
    categoryGroups: [...groups].sort((a, b) => groupOrder.indexOf(a) - groupOrder.indexOf(b)),
    cities: [...cities].sort(byText),
    prices: [...prices].sort((a, b) => a - b),
    tags: [...tags].sort(byText),
  };
}

type Verdict = "pass" | "fail" | "uncertain";

function anyOf<T>(selected: T[], test: (v: T) => boolean): boolean {
  return selected.length === 0 || selected.some(test);
}

function cityVerdict(place: Place, cities: string[]): Verdict {
  if (cities.length === 0) return "pass";
  const city = place.location.city;
  if (city === undefined) return "uncertain";
  return cities.includes(city) ? "pass" : "fail";
}

function priceVerdict(place: Place, prices: Price[]): Verdict {
  if (prices.length === 0) return "pass";
  if (place.price.status !== "ok") return "uncertain";
  return prices.includes(place.price.value) ? "pass" : "fail";
}

function byName(a: Place, b: Place): number {
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

/** Both lists come back sorted by name; the view applies the traveler's chosen sort with sortPlaces. */
export function filterPlaces(
  places: Place[],
  criteria: FilterCriteria,
  prefs: Record<string, PlacePref>,
): FilterResult {
  const query = foldText(criteria.query.trim());
  const matches: Place[] = [];
  const uncertainMatches: Place[] = [];

  for (const place of places) {
    const pref = prefs[place.id];
    if (!criteria.showNotInterested && pref?.interest === "not_interested" && !pref.mustVisit) continue;

    if (!anyOf(criteria.categoryGroups, (g) => g === categoryGroupOf(place.type))) continue;
    if (!anyOf(criteria.tags, (t) => place.tags.includes(t))) continue;
    if (query !== "") {
      const haystack = [place.name, place.description ?? "", ...place.tags].map(foldText);
      if (!haystack.some((s) => s.includes(query))) continue;
    }

    const verdicts = [cityVerdict(place, criteria.cities), priceVerdict(place, criteria.prices)];
    if (verdicts.includes("fail")) continue;
    (verdicts.includes("uncertain") ? uncertainMatches : matches).push(place);
  }

  return { matches: matches.sort(byName), uncertainMatches: uncertainMatches.sort(byName) };
}
