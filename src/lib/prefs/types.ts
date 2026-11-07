export type Interest = "not_interested" | "maybe" | "very";

export interface PlacePref {
  interest?: Interest;
  mustVisit: boolean;
}

export interface StoredPrefs {
  version: 1;
  /** Keyed by Place.id. */
  places: Record<string, PlacePref>;
  /** 'YYYY-MM-DD' and 'HH:mm'. */
  trip: { startDate?: string; dayStart: string; dayEnd: string };
}
