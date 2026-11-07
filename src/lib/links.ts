/** Discover, with the place open on the full-screen map. */
export function placeOnMapHref(id: string): string {
  return `/?place=${encodeURIComponent(id)}`;
}
