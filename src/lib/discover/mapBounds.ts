import { usableCoordinates } from "@/lib/geo";
import type { Place } from "@/lib/types";

/** The area the map currently shows, in degrees. */
export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Places drawn inside the bounds, edges included. Places without a usable location are never on the map, so they are dropped. */
export function placesInBounds(places: Place[], bounds: MapBounds): Place[] {
  return places.filter((p) => {
    const c = usableCoordinates(p);
    return (
      c !== null &&
      c.latitude >= bounds.south &&
      c.latitude <= bounds.north &&
      c.longitude >= bounds.west &&
      c.longitude <= bounds.east
    );
  });
}
