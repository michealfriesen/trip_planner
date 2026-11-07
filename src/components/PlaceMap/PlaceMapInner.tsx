"use client";

import "leaflet/dist/leaflet.css";
import type { LatLngBoundsLiteral, LatLngTuple } from "leaflet";
import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { ITALY_BOUNDS } from "@/lib/config";
import { usableCoordinates } from "@/lib/geo";
import type { Place } from "@/lib/types";
import styles from "./PlaceMapInner.module.css";

export interface PlaceMapProps {
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface Pin {
  id: string;
  name: string;
  point: LatLngTuple;
}

const COUNTRY_BOUNDS: LatLngBoundsLiteral = [[...ITALY_BOUNDS[0]], [...ITALY_BOUNDS[1]]];

function FitBounds({ pins }: { pins: Pin[] }) {
  const map = useMap();

  useEffect(() => {
    if (pins.length === 0) map.fitBounds(COUNTRY_BOUNDS);
    else if (pins.length === 1) map.setView(pins[0].point, 13);
    else map.fitBounds(pins.map((p) => p.point), { padding: [24, 24] });
  }, [map, pins]);

  return null;
}

function PanToSelected({ pin }: { pin: Pin | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (pin) map.panTo(pin.point);
  }, [map, pin]);
  return null;
}

export default function PlaceMapInner({ places, selectedId, onSelect }: PlaceMapProps) {
  const pins = useMemo<Pin[]>(
    () =>
      places.flatMap((p) => {
        const c = usableCoordinates(p);
        return c ? [{ id: p.id, name: p.name, point: [c.latitude, c.longitude] as LatLngTuple }] : [];
      }),
    [places],
  );
  const selectedPin = pins.find((p) => p.id === selectedId);

  return (
    <MapContainer center={[42.5, 12.5]} zoom={6} className={styles.map} scrollWheelZoom>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <FitBounds pins={pins} />
      <PanToSelected pin={selectedPin} />
      {pins.map((pin) => {
        const selected = pin.id === selectedId;
        return (
          <CircleMarker
            key={pin.id}
            center={pin.point}
            radius={selected ? 10 : 6}
            pathOptions={{
              color: selected ? "#7a4a00" : "#0b6e4f",
              fillColor: selected ? "#f0b429" : "#1f9d74",
              fillOpacity: 0.85,
              weight: selected ? 3 : 1.5,
            }}
            eventHandlers={{ click: () => onSelect(pin.id) }}
          >
            <Tooltip>{pin.name}</Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
