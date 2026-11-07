import { isInCountry } from "@/lib/geo";
import { normalizeHours } from "@/lib/data/normalizeHours";
import {
  Category,
  type Coordinates,
  type DataIssue,
  type Dataset,
  type Field,
  type Place,
  type PlaceFlag,
  type Price,
  type RawPlace,
} from "@/lib/types";

const TYPE_MAP: Readonly<Record<string, Category>> = {
  historic_site: Category.HistoricSite,
  restaurant: Category.Restaurant,
  experience: Category.Experience,
  museum: Category.Museum,
  viewpoint: Category.Viewpoint,
  cafe: Category.Cafe,
  neighborhood: Category.Neighborhood,
  market: Category.Market,
  park: Category.Park,
  shop: Category.Shop,
};

type PendingIssue = Omit<DataIssue, "placeId">;

function text(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

function isMissing(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

function rawText(v: unknown): string {
  return typeof v === "string" ? v : JSON.stringify(v) ?? String(v);
}

function asRecord(v: unknown): Partial<RawPlace> {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Partial<RawPlace>) : {};
}

function cleanType(v: unknown, issues: PendingIssue[]): Category {
  const key = text(v)?.toLowerCase().replace(/[\s-]+/g, "_");
  const category = key ? TYPE_MAP[key] : undefined;
  if (category) return category;
  issues.push({
    field: "type",
    flag: "type_unknown",
    raw: isMissing(v) ? undefined : rawText(v),
    reason: isMissing(v) ? "No type given." : "Not a type we know.",
  });
  return Category.Unknown;
}

function cleanCoordinates(lat: unknown, lon: unknown): Field<Coordinates> {
  if (isMissing(lat) && isMissing(lon)) return { status: "missing" };
  if (typeof lat === "number" && Number.isFinite(lat) && typeof lon === "number" && Number.isFinite(lon)) {
    return { status: "ok", value: { latitude: lat, longitude: lon } };
  }
  return {
    status: "invalid",
    raw: `${rawText(lat)}, ${rawText(lon)}`,
    reason: "Latitude and longitude must both be numbers.",
  };
}

function cleanDuration(v: unknown, issues: PendingIssue[]): Field<number> {
  if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 1440) {
    return { status: "ok", value: v };
  }
  if (isMissing(v)) {
    issues.push({ field: "duration_minutes", flag: "duration_default", reason: "No visit length given." });
    return { status: "missing" };
  }
  const raw = rawText(v);
  const reason = "Visit length must be a whole number of minutes from 1 to 1440.";
  issues.push({ field: "duration_minutes", flag: "duration_default", raw, reason });
  return { status: "invalid", raw, reason };
}

function cleanPrice(v: unknown, issues: PendingIssue[]): Field<Price> {
  const t = text(v);
  if (t && /^€{1,4}$/.test(t)) return { status: "ok", value: t.length as Price };
  if (isMissing(v)) {
    issues.push({ field: "price_range", flag: "price_unknown", reason: "No price given." });
    return { status: "missing" };
  }
  const raw = rawText(v);
  const reason = "Price must be 1 to 4 € signs.";
  issues.push({ field: "price_range", flag: "price_unknown", raw, reason });
  return { status: "invalid", raw, reason };
}

function cleanBooking(v: unknown, issues: PendingIssue[]): Field<boolean> {
  if (typeof v === "boolean") return { status: "ok", value: v };
  if (isMissing(v)) {
    issues.push({ field: "booking_required", flag: "booking_unknown", reason: "Not stated whether booking is needed." });
    return { status: "missing" };
  }
  const raw = rawText(v);
  const reason = "Booking must be true or false.";
  issues.push({ field: "booking_required", flag: "booking_unknown", raw, reason });
  return { status: "invalid", raw, reason };
}

function cleanRating(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 5 ? v : undefined;
}

function cleanTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const tags = v
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().toLowerCase().replace(/_/g, "-"))
    .filter((t) => t !== "");
  return [...new Set(tags)];
}

function sourceId(v: unknown): string | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return text(v);
}

function cleanPlace(input: unknown, index: number, usedIds: Set<string>): { place: Place; issues: DataIssue[] } {
  const r = asRecord(input);
  const pending: PendingIssue[] = [];

  let id = sourceId(r.id);
  if (id === undefined) {
    id = `row_${index}`;
    pending.push({ field: "id", flag: "id_missing", reason: `No id; using ${id}.` });
  }
  if (usedIds.has(id)) {
    const original = id;
    let n = 2;
    while (usedIds.has(`${original}#${n}`)) n++;
    id = `${original}#${n}`;
    pending.push({ field: "id", flag: "id_duplicate", raw: original, reason: `Another record has this id; renamed to ${id}.` });
  }
  usedIds.add(id);

  let name = text(r.name);
  if (name === undefined) {
    name = "Unnamed place";
    pending.push({ field: "name", flag: "name_missing", reason: "No name given." });
  }

  const type = cleanType(r.type, pending);

  const coordinates = cleanCoordinates(r.latitude, r.longitude);
  const usable = coordinates.status === "ok" && isInCountry(coordinates.value);
  if (!usable) {
    pending.push({
      field: "coordinates",
      flag: "location_unusable",
      raw: coordinates.status === "ok" ? `${coordinates.value.latitude}, ${coordinates.value.longitude}` : coordinates.status === "invalid" ? coordinates.raw : undefined,
      reason:
        coordinates.status === "ok"
          ? "Coordinates are outside the area we plan in."
          : coordinates.status === "invalid"
            ? coordinates.reason
            : "No coordinates given.",
    });
  }

  const hours = normalizeHours(r.hours);
  if (hours.status === "normalized") {
    pending.push({ field: "hours", flag: "hours_normalized", raw: hours.raw, reason: `Read with corrections: ${hours.warnings.join("; ")}` });
  } else if (hours.status === "unparsed") {
    pending.push({ field: "hours", flag: "hours_unparsed", raw: hours.raw, reason: "The hours text could not be read." });
  } else if (hours.status === "missing") {
    pending.push({ field: "hours", flag: "hours_missing", reason: "No hours given." });
  }

  const durationMinutes = cleanDuration(r.duration_minutes, pending);
  const price = cleanPrice(r.price_range, pending);
  const bookingRequired = cleanBooking(r.booking_required, pending);

  const flags: PlaceFlag[] = pending.map((p) => p.flag);
  const place: Place = {
    id,
    name,
    type,
    location: {
      coordinates,
      locationQuality: usable ? "ok" : "unusable",
      city: text(r.city),
      region: text(r.region),
      neighborhood: text(r.neighborhood),
    },
    hours,
    durationMinutes,
    description: text(r.description),
    rating: cleanRating(r.rating),
    price,
    bookingRequired,
    tags: cleanTags(r.tags),
    seasonalNotes: text(r.seasonal_notes),
    flags,
  };
  return { place, issues: pending.map((p) => ({ placeId: id, ...p })) };
}

/** Cleans every record into a typed Place. Never throws on a single record; throws only if the top level is not an array. */
export function normalize(raw: unknown, fetchedAt: string = new Date().toISOString()): Dataset {
  if (!Array.isArray(raw)) throw new Error("Place data must be a JSON array.");

  const usedIds = new Set<string>();
  const places: Place[] = [];
  const issues: DataIssue[] = [];
  raw.forEach((record, index) => {
    const result = cleanPlace(record, index, usedIds);
    places.push(result.place);
    issues.push(...result.issues);
  });

  let missingHours = 0;
  for (const p of places) {
    if (p.hours.status === "unparsed") console.warn("[hours] unparsed", { placeId: p.id, raw: p.hours.raw });
    if (p.hours.status === "missing") missingHours++;
  }
  if (missingHours > 0) console.warn(`[hours] missing for ${missingHours} places`);

  return { places, issues, fetchedAt };
}
