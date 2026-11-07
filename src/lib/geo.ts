import { ITALY_BOUNDS } from "@/lib/config";
import type { Coordinates, Place } from "@/lib/types";

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** For now a rectangle around Italy; a real border check can replace it without changing callers. */
export function isInCountry(c: Coordinates): boolean {
  const [[south, west], [north, east]] = ITALY_BOUNDS;
  return c.latitude >= south && c.latitude <= north && c.longitude >= west && c.longitude <= east;
}

/** The place's coordinates when they can be drawn and planned with, otherwise null. */
export function usableCoordinates(place: Place): Coordinates | null {
  const { coordinates, locationQuality } = place.location;
  return locationQuality === "ok" && coordinates.status === "ok" ? coordinates.value : null;
}
