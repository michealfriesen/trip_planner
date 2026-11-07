"use client";

import { useMemo, useState } from "react";
import PlaceList from "@/components/PlaceList/PlaceList";
import PlaceMap from "@/components/PlaceMap/PlaceMap";
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

  const sorted = useMemo(() => [...places].sort((a, b) => a.name.localeCompare(b.name)), [places]);

  const fetchedLabel = new Date(fetchedAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  return (
    <div className={styles.layout}>
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
        <PlaceList matches={sorted} uncertainMatches={[]} selectedId={selectedId} onSelect={setSelectedId} />
      </section>
      <section className={styles.mapPane} aria-label="Map">
        <PlaceMap places={sorted} selectedId={selectedId} onSelect={setSelectedId} />
      </section>
    </div>
  );
}
