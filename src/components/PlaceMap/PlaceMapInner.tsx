"use client";

import "leaflet/dist/leaflet.css";
import { divIcon, type DivIcon, type LatLngBoundsLiteral, type LatLngTuple } from "leaflet";
import { useEffect, useMemo, type ReactElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import { categoryIcon } from "@/components/CategoryIcon/CategoryIcon";
import { ITALY_BOUNDS } from "@/lib/config";
import { usableCoordinates } from "@/lib/geo";
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
  onSelect: (id: string) => void;
}

interface Pin {
  id: string;
  name: string;
  category: Category;
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

  useEffect(() => {
    if (pins.length === 0) map.fitBounds(COUNTRY_BOUNDS);
    else if (pins.length === 1) map.setView(pins[0].point, 13);
    else map.fitBounds(pins.map((p) => p.point), { padding: [24, 24] });
  }, [map, pins]);

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

export default function PlaceMapInner({ places, selectedId, focus, onSelect }: PlaceMapProps) {
  const pins = useMemo<Pin[]>(
    () =>
      places.flatMap((p) => {
        const c = usableCoordinates(p);
        return c
          ? [{ id: p.id, name: p.name, category: p.type, point: [c.latitude, c.longitude] as LatLngTuple }]
          : [];
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
      {pins.map((pin) => {
        const selected = pin.id === selectedId;
        return (
          <Marker
            key={pin.id}
            position={pin.point}
            icon={pinIcon(pin.category, selected)}
            zIndexOffset={selected ? 1000 : 0}
            // The list is the keyboard path; 100 extra tab stops on the map would get in the way.
            keyboard={false}
            eventHandlers={{ click: () => onSelect(pin.id) }}
          >
            <Tooltip direction="top">{pin.name}</Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
