"use client";

import { useMemo, useState } from "react";
import PlaceList from "@/components/PlaceList/PlaceList";
import PlaceMap, { type MapFocus } from "@/components/PlaceMap/PlaceMap";
import { usableCoordinates } from "@/lib/geo";
import type { DataIssue, Place } from "@/lib/types";
import styles from "./DiscoverView.module.css";

interface DiscoverViewProps {
  places: Place[];
  /** Shown by the data-quality panel (stage 7). */
  issues: DataIssue[];
  fetchedAt: string;
}

export default function DiscoverView({ places, fetchedAt }: DiscoverViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);

  const sorted = useMemo(() => [...places].sort((a, b) => a.name.localeCompare(b.name)), [places]);

  // Choosing a card moves the map to it; choosing a marker only selects, since the marker is already in view.
  function selectFromList(id: string) {
    setSelectedId(id);
    const place = sorted.find((p) => p.id === id);
    const c = place && usableCoordinates(place);
    if (c) setFocus((prev) => ({ coordinates: c, seq: (prev?.seq ?? 0) + 1 }));
  }

  const fetchedLabel = new Date(fetchedAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  return (
    <div className={styles.layout}>
      <section className={styles.mapPane} aria-label="Map">
        <PlaceMap places={sorted} selectedId={selectedId} focus={focus} onSelect={setSelectedId} />
      </section>
      <section className={styles.listPane} aria-labelledby="places-heading">
        <div className={styles.summary}>
          <h1 id="places-heading" className={styles.title}>
            Places
          </h1>
          <p role="status" className={styles.count}>
            {sorted.length} places
          </p>
        </div>
        <p className={styles.fetched}>Data as of {fetchedLabel} UTC</p>
        <PlaceList matches={sorted} uncertainMatches={[]} selectedId={selectedId} onSelect={selectFromList} />
      </section>
    </div>
  );
}
