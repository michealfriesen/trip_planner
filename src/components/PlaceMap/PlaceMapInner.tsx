"use client";

import "leaflet/dist/leaflet.css";
import { divIcon, type DivIcon, type LatLngBoundsLiteral, type LatLngTuple, type Marker as LeafletMarker } from "leaflet";
import { useEffect, useMemo, useRef, type ReactElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import { categoryIcon } from "@/components/CategoryIcon/CategoryIcon";
import PlaceSummary from "@/components/PlaceSummary/PlaceSummary";
import { ITALY_BOUNDS } from "@/lib/config";
import { usableCoordinates } from "@/lib/geo";
import type { PlacePref } from "@/lib/prefs/types";
import { Category, type Coordinates, type Place } from "@/lib/types";
import styles from "./PlaceMapInner.module.css";

/** A request to move the map to a place. `seq` changes on every request, so choosing the same place again still moves. */
export interface MapFocus {
  coordinates: Coordinates;
  seq: number;
}

export interface PlaceMapProps {
  places: Place[];
  selectedId: string | null;
  focus: MapFocus | null;
  /** `keyboard` is true when a pin was chosen with Enter or Space. */
  onSelect: (id: string, options?: { keyboard: boolean }) => void;
  /** Full-screen mode: pins show a condensed card on hover and can be reached with the keyboard. */
  expanded: boolean;
  prefs: Record<string, PlacePref>;
}

interface Pin {
  place: Place;
  point: LatLngTuple;
}

const COUNTRY_BOUNDS: LatLngBoundsLiteral = [[...ITALY_BOUNDS[0]], [...ITALY_BOUNDS[1]]];

/** Close enough to see the streets around a place, far enough to keep its neighbours in view. */
const FOCUS_ZOOM = 14;

// HTML markers keep their pixel size while the map zooms; SVG circles are stretched until the zoom ends.
// The box is sized for the selected pin so both states share one anchor.
const ICON_BOX = 36;

// Leaflet wants marker HTML as a string. This module only runs in the browser (ssr: false), so render with
// react-dom/client, which is already loaded, instead of pulling react-dom/server into the bundle.
// Must run outside a React render, because flushSync cannot flush while React is rendering.
function toMarkup(element: ReactElement): string {
  const host = document.createElement("div");
  const root = createRoot(host);
  flushSync(() => root.render(element));
  const html = host.innerHTML;
  root.unmount();
  return html;
}

function makePinIcon(category: Category, selected: boolean): DivIcon {
  const Icon = categoryIcon(category);
  const svg = toMarkup(<Icon size={selected ? 18 : 14} strokeWidth={2.25} aria-hidden="true" />);
  return divIcon({
    className: `${styles.pin} ${selected ? styles.selected : ""}`,
    html: `<span class="${styles.badge}">${svg}</span>`,
    iconSize: [ICON_BOX, ICON_BOX],
    iconAnchor: [ICON_BOX / 2, ICON_BOX / 2],
    tooltipAnchor: [0, -ICON_BOX / 2 + 4],
  });
}

// Built once when the module loads, before any render.
const PIN_ICONS = new Map(
  Object.values(Category).map((c) => [c, { normal: makePinIcon(c, false), selected: makePinIcon(c, true) }]),
);

function pinIcon(category: Category, selected: boolean): DivIcon {
  const icons = PIN_ICONS.get(category)!;
  return selected ? icons.selected : icons.normal;
}

function FitBounds({ pins }: { pins: Pin[] }) {
  const map = useMap();
  // Refit only when the set of places changes, not when the same places are re-sorted or a rating changes.
  const placeSet = useMemo(() => pins.map((p) => p.place.id).sort().join(","), [pins]);
  const pinsRef = useRef(pins);
  pinsRef.current = pins;

  useEffect(() => {
    const current = pinsRef.current;
    if (current.length === 0) map.fitBounds(COUNTRY_BOUNDS);
    else if (current.length === 1) map.setView(current[0].point, 13);
    else map.fitBounds(current.map((p) => p.point), { padding: [24, 24] });
  }, [map, placeSet]);

  return null;
}

function FlyToFocus({ focus }: { focus: MapFocus | null }) {
  const map = useMap();

  useEffect(() => {
    if (!focus) return;
    const { latitude, longitude } = focus.coordinates;
    // Never zoom out if the traveler is already closer than FOCUS_ZOOM.
    const zoom = Math.max(map.getZoom(), FOCUS_ZOOM);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) map.setView([latitude, longitude], zoom);
    else map.flyTo([latitude, longitude], zoom, { duration: 1.2 });
  }, [map, focus]);

  return null;
}

/** Leaflet only measures its container on load, so tell it when the pane is resized (e.g. entering full screen). */
function ResizeWithContainer() {
  const map = useMap();

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  return null;
}

interface PlaceMarkerProps {
  pin: Pin;
  selected: boolean;
  expanded: boolean;
  pref: PlacePref | undefined;
  onSelect: (id: string, options?: { keyboard: boolean }) => void;
}

function PlaceMarker({ pin, selected, expanded, pref, onSelect }: PlaceMarkerProps) {
  const ref = useRef<LeafletMarker>(null);
  const icon = pinIcon(pin.place.type, selected);

  // Leaflet replaces the element whenever the icon changes, so the attributes are reapplied after each change.
  useEffect(() => {
    const el = ref.current?.getElement();
    if (!el || !expanded) return;
    el.setAttribute("aria-label", pin.place.name);
    el.setAttribute("aria-pressed", String(selected));
    el.dataset.placeId = pin.place.id;
  }, [icon, expanded, selected, pin.place.name, pin.place.id]);

  return (
    <Marker
      ref={ref}
      position={pin.point}
      icon={icon}
      zIndexOffset={selected ? 1000 : 0}
      // Beside the list, the list is the keyboard path and 100 extra tab stops would get in the way.
      // In full screen the list is hidden, so the pins take its place.
      keyboard={expanded}
      eventHandlers={{
        click: () => onSelect(pin.place.id),
        // Leaflet gives markers role="button" but does not activate them from the keyboard.
        keydown: (e) => {
          const key = (e.originalEvent as KeyboardEvent).key;
          if (key !== "Enter" && key !== " ") return;
          e.originalEvent.preventDefault();
          onSelect(pin.place.id, { keyboard: true });
        },
      }}
    >
      {expanded ? (
        <Tooltip direction="top" opacity={1} className={styles.summaryTooltip}>
          <PlaceSummary place={pin.place} pref={pref} />
        </Tooltip>
      ) : (
        <Tooltip direction="top">{pin.place.name}</Tooltip>
      )}
    </Marker>
  );
}

export default function PlaceMapInner({ places, selectedId, focus, onSelect, expanded, prefs }: PlaceMapProps) {
  const pins = useMemo<Pin[]>(
    () =>
      places.flatMap((p) => {
        const c = usableCoordinates(p);
        return c ? [{ place: p, point: [c.latitude, c.longitude] as LatLngTuple }] : [];
      }),
    [places],
  );

  return (
    <MapContainer center={[42.5, 12.5]} zoom={6} className={styles.map} scrollWheelZoom>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <FitBounds pins={pins} />
      <FlyToFocus focus={focus} />
      <ResizeWithContainer />
      {pins.map((pin) => (
        <PlaceMarker
          // Leaflet reads `keyboard` only when a marker is created, so switching modes recreates the markers.
          key={`${pin.place.id}:${expanded}`}
          pin={pin}
          selected={pin.place.id === selectedId}
          expanded={expanded}
          pref={prefs[pin.place.id]}
          onSelect={onSelect}
        />
      ))}
    </MapContainer>
  );
}
