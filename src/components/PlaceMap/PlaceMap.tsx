"use client";

import dynamic from "next/dynamic";
import type { PlaceMapProps } from "./PlaceMapInner";

export type { MapFocus } from "./PlaceMapInner";

const PlaceMapInner = dynamic(() => import("./PlaceMapInner"), {
  ssr: false,
  loading: () => <p style={{ padding: "var(--space-4)" }}>Loading map…</p>,
});

export default function PlaceMap(props: PlaceMapProps) {
  return <PlaceMapInner {...props} />;
}
