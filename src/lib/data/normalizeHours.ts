import opening_hours, { type optional_conf } from "opening_hours";
import type { PlaceHours } from "@/lib/types";

const OH_CONF: optional_conf = {
  tag_key: "opening_hours",
  mode: undefined,
  map_value: undefined,
  warnings_severity: undefined,
  locale: undefined,
};

/** Builds the library object. Throws when the text cannot be read. */
export function parseOpeningHours(raw: string): opening_hours {
  return new opening_hours(raw, null, OH_CONF);
}

export function normalizeHours(raw: unknown): PlaceHours {
  if (raw === null || raw === undefined) return { status: "missing", warnings: [] };
  const text = String(raw).trim();
  // Empty values never reach the library, so it never fills in a default.
  if (text === "") return { status: "missing", warnings: [] };
  try {
    const warnings = parseOpeningHours(text).getWarnings();
    return { raw: text, status: warnings.length > 0 ? "normalized" : "parsed", warnings };
  } catch {
    return { raw: text, status: "unparsed", warnings: [] };
  }
}
