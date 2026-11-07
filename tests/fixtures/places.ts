import { Category, type Place, type RawPlace } from "@/lib/types";

export function makeRawPlace(overrides: Partial<Record<keyof RawPlace, unknown>> = {}): RawPlace {
  return {
    id: "test_001",
    name: "Test Place",
    type: "museum",
    city: "Rome",
    region: "Lazio",
    neighborhood: "Centro",
    description: "A place for tests.",
    latitude: 41.9,
    longitude: 12.5,
    hours: "09:00-18:00",
    duration_minutes: 60,
    price_range: "€€",
    rating: 4.5,
    tags: ["historic"],
    seasonal_notes: null,
    booking_required: false,
    ...overrides,
  };
}

export function makePlace(overrides: Partial<Place> = {}): Place {
  return {
    id: "test_001",
    name: "Test Place",
    type: Category.Museum,
    location: {
      coordinates: { status: "ok", value: { latitude: 41.9, longitude: 12.5 } },
      locationQuality: "ok",
      city: "Rome",
      region: "Lazio",
    },
    hours: { raw: "09:00-18:00", status: "parsed", warnings: [] },
    durationMinutes: { status: "ok", value: 60 },
    price: { status: "ok", value: 2 },
    bookingRequired: { status: "ok", value: false },
    tags: [],
    flags: [],
    ...overrides,
  };
}
