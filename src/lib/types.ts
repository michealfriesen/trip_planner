export type Field<T> =
  | { status: "ok"; value: T }
  | { status: "missing" }
  | { status: "invalid"; raw: string; reason: string };

/** The dataset's 10 types plus Unknown. String values keep the JSON sent to the browser readable. */
export enum Category {
  HistoricSite = "HistoricSite",
  Restaurant = "Restaurant",
  Experience = "Experience",
  Museum = "Museum",
  Viewpoint = "Viewpoint",
  Cafe = "Cafe",
  Neighborhood = "Neighborhood",
  Market = "Market",
  Park = "Park",
  Shop = "Shop",
  Unknown = "Unknown",
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PlaceLocation {
  coordinates: Field<Coordinates>;
  /** unusable = missing or outside the planning area */
  locationQuality: "ok" | "unusable";
  city?: string;
  region?: string;
  neighborhood?: string;
}

export interface PlaceHours {
  /** Always kept for display. */
  raw?: string;
  status: "parsed" | "normalized" | "unparsed" | "missing";
  /** opening_hours.js warnings, shown as "interpreted as …" */
  warnings: string[];
}

/** Shown as € … €€€€ */
export type Price = 1 | 2 | 3 | 4;

export interface Place {
  /** Source id, e.g. "place_001"; preference key. */
  id: string;
  name: string;
  type: Category;
  location: PlaceLocation;
  hours: PlaceHours;
  /** The planner uses 60 when not 'ok' and flags the stop. */
  durationMinutes: Field<number>;
  description?: string;
  /** Dataset star rating, 0–5. Display only. */
  rating?: number;
  price: Field<Price>;
  bookingRequired: Field<boolean>;
  /** Lowercased, '_' -> '-', de-duplicated. */
  tags: string[];
  /** Display only. */
  seasonalNotes?: string;
  flags: PlaceFlag[];
}

export type PlaceFlag =
  | "id_missing"
  | "id_duplicate"
  | "name_missing"
  | "type_unknown"
  | "location_unusable"
  | "hours_normalized"
  | "hours_unparsed"
  | "hours_missing"
  | "duration_default"
  | "price_unknown"
  | "booking_unknown";

export interface DataIssue {
  placeId: string;
  field: string;
  flag: PlaceFlag;
  raw?: string;
  reason: string;
}

export interface Dataset {
  places: Place[];
  issues: DataIssue[];
  fetchedAt: string;
}

/** The source record. Every field is unknown: nothing about the source is trusted. */
export interface RawPlace {
  id: unknown;
  name: unknown;
  type: unknown;
  city: unknown;
  region: unknown;
  neighborhood: unknown;
  description: unknown;
  latitude: unknown;
  longitude: unknown;
  hours: unknown;
  duration_minutes: unknown;
  price_range: unknown;
  rating: unknown;
  tags: unknown;
  seasonal_notes: unknown;
  booking_required: unknown;
}
