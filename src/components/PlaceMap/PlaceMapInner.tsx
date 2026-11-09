"use client";

import "leaflet/dist/leaflet.css";
import {
  divIcon,
  type DivIcon,
  type LatLngBoundsLiteral,
  type LatLngTuple,
  type Map as LeafletMap,
  type Marker as LeafletMarker,
} from "leaflet";
import { useEffect, useMemo, useRef, type ReactElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { categoryIcon } from "@/components/CategoryIcon/CategoryIcon";
import PlaceSummary from "@/components/PlaceSummary/PlaceSummary";
import { ITALY_BOUNDS } from "@/lib/config";
import type { MapBounds } from "@/lib/discover/mapBounds";
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
  /** When set, called with the visible area now and after every pan, zoom or resize. */
  onBoundsChange?: (bounds: MapBounds) => void;
  /**
   * When set, the map refits to the pins only when this value changes, instead of whenever the set of pins changes.
   * Lets a caller hide pins (e.g. a place marked not interested) without moving the map.
   */
  fitKey?: string;
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

/** How a pin shows the traveler's rating. Must-visit outranks interest, as everywhere else. */
type PinLevel = "plain" | "not_interested" | "maybe" | "very" | "must";

function pinLevel(pref: PlacePref | undefined): PinLevel {
  if (pref?.mustVisit) return "must";
  return pref?.interest ?? "plain";
}

/** Read after the place name, since colour and rings alone don't reach screen readers. */
const LEVEL_LABEL: Record<PinLevel, string> = {
  plain: "",
  not_interested: ", not interested",
  maybe: ", maybe",
  very: ", very interested",
  must: ", must visit",
};

// Rated pins draw above unrated ones; the selected pin above all.
const LEVEL_Z: Record<PinLevel, number> = { plain: 0, not_interested: -100, maybe: 100, very: 200, must: 300 };

// The icon SVG depends only on category and size, so render each once when the module loads, before any render.
const PIN_SVGS = new Map(
  Object.values(Category).map((c) => {
    const Icon = categoryIcon(c);
    const svg = (size: number) => toMarkup(<Icon size={size} strokeWidth={2.25} aria-hidden="true" />);
    return [c, { normal: svg(14), selected: svg(18) }];
  }),
);

const pinIcons = new Map<string, DivIcon>();

// Icons are cached so an unchanged pin keeps the same icon object and Leaflet doesn't rebuild its element.
function pinIcon(category: Category, selected: boolean, level: PinLevel): DivIcon {
  const key = `${category}:${selected}:${level}`;
  let icon = pinIcons.get(key);
  if (!icon) {
    const svgs = PIN_SVGS.get(category)!;
    icon = divIcon({
      className: `${styles.pin} ${styles[level]} ${selected ? styles.selected : ""}`,
      html: `<span class="${styles.badge}">${selected ? svgs.selected : svgs.normal}</span>`,
      iconSize: [ICON_BOX, ICON_BOX],
      iconAnchor: [ICON_BOX / 2, ICON_BOX / 2],
      tooltipAnchor: [0, -ICON_BOX / 2 + 4],
    });
    pinIcons.set(key, icon);
  }
  return icon;
}

function FitBounds({ pins, fitKey }: { pins: Pin[]; fitKey?: string }) {
  const map = useMap();
  // Refit only when the set of places changes, not when the same places are re-sorted or a rating changes.
  const placeSet = useMemo(() => pins.map((p) => p.place.id).sort().join(","), [pins]);
  const trigger = fitKey ?? placeSet;
  const pinsRef = useRef(pins);
  pinsRef.current = pins;

  useEffect(() => {
    const current = pinsRef.current;
    if (current.length === 0) map.fitBounds(COUNTRY_BOUNDS);
    else if (current.length === 1) map.setView(current[0].point, 13);
    else map.fitBounds(current.map((p) => p.point), { padding: [24, 24] });
  }, [map, trigger]);

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

function boundsOf(map: LeafletMap): MapBounds {
  const b = map.getBounds();
  return { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() };
}

function ReportBounds({ onChange }: { onChange: (bounds: MapBounds) => void }) {
  const map = useMapEvents({
    moveend: () => onChange(boundsOf(map)),
    resize: () => onChange(boundsOf(map)),
  });

  // Report once on mount, so turning the filter on applies to the current view without waiting for a move.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => onChangeRef.current(boundsOf(map)), [map]);

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
  const level = pinLevel(pref);
  const icon = pinIcon(pin.place.type, selected, level);
  const label = pin.place.name + LEVEL_LABEL[level];

  // Leaflet replaces the element whenever the icon changes, so the attributes are reapplied after each change.
  useEffect(() => {
    const el = ref.current?.getElement();
    if (!el || !expanded) return;
    el.setAttribute("aria-label", label);
    el.setAttribute("aria-pressed", String(selected));
    el.dataset.placeId = pin.place.id;
  }, [icon, expanded, selected, label, pin.place.id]);

  return (
    <Marker
      ref={ref}
      position={pin.point}
      icon={icon}
      zIndexOffset={selected ? 1000 : LEVEL_Z[level]}
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

export default function PlaceMapInner({
  places,
  selectedId,
  focus,
  onSelect,
  expanded,
  prefs,
  onBoundsChange,
  fitKey,
}: PlaceMapProps) {
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
      <FitBounds pins={pins} fitKey={fitKey} />
      <FlyToFocus focus={focus} />
      <ResizeWithContainer />
      {onBoundsChange && <ReportBounds onChange={onBoundsChange} />}
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
