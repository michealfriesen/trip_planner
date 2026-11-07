"use client";

import PlaceCard from "@/components/PlaceCard/PlaceCard";
import type { Place } from "@/lib/types";
import styles from "./PlaceList.module.css";

interface PlaceListProps {
  matches: Place[];
  uncertainMatches: Place[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function PlaceList({ matches, uncertainMatches, selectedId, onSelect }: PlaceListProps) {
  const renderCards = (places: Place[]) => (
    <ul className={styles.list}>
      {places.map((p) => (
        <li key={p.id}>
          <PlaceCard place={p} selected={p.id === selectedId} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );

  if (matches.length === 0 && uncertainMatches.length === 0) {
    return <p className={styles.empty}>No places match.</p>;
  }

  return (
    <div className={styles.wrap}>
      {renderCards(matches)}
      {uncertainMatches.length > 0 && (
        <section aria-labelledby="uncertain-heading">
          <h2 id="uncertain-heading" className={styles.heading}>
            May be inaccurate
          </h2>
          <p className={styles.hint}>These places have a missing or unclear value for a filter you chose.</p>
          {renderCards(uncertainMatches)}
        </section>
      )}
    </div>
  );
}
