"use client";

import { RotateCcw, Undo2 } from "lucide-react";
import { useState } from "react";
import type { PlacePref } from "@/lib/prefs/types";
import styles from "./ClearRatings.module.css";

interface ClearRatingsProps {
  ratings: Record<string, PlacePref>;
  ready: boolean;
  onClear: () => void;
  onRestore: (ratings: Record<string, PlacePref>) => void;
}

/** Clears every interest and must-visit at once, with an Undo instead of a confirmation step. */
export default function ClearRatings({ ratings, ready, onClear, onRestore }: ClearRatingsProps) {
  const [cleared, setCleared] = useState<Record<string, PlacePref> | null>(null);
  const count = Object.keys(ratings).length;
  const clearedCount = cleared ? Object.keys(cleared).length : 0;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        disabled={!ready || count === 0}
        onClick={() => {
          setCleared(ratings);
          onClear();
        }}
      >
        <RotateCcw size={14} aria-hidden="true" />
        Clear ratings{count > 0 ? ` (${count})` : ""}
      </button>
      {/* Always rendered, so screen readers announce the message when it appears. */}
      <p role="status" className={styles.status}>
        {cleared && (
          <>
            Cleared {clearedCount} {clearedCount === 1 ? "rating" : "ratings"}.
            <button
              type="button"
              className={styles.undo}
              onClick={() => {
                onRestore(cleared);
                setCleared(null);
              }}
            >
              <Undo2 size={14} aria-hidden="true" />
              Undo
            </button>
          </>
        )}
      </p>
    </div>
  );
}
