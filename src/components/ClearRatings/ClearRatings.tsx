"use client";

import { RotateCcw, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PlacePref } from "@/lib/prefs/types";
import styles from "./ClearRatings.module.css";

interface ClearRatingsProps {
  ratings: Record<string, PlacePref>;
  ready: boolean;
  onClear: () => void;
  onRestore: (ratings: Record<string, PlacePref>) => void;
}

/** Clears every interest and must-visit at once, after a confirmation, with an Undo afterwards. */
export default function ClearRatings({ ratings, ready, onClear, onRestore }: ClearRatingsProps) {
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState<Record<string, PlacePref> | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  // Return focus to "Clear ratings" only when the question was dismissed, not on first render.
  const returnFocus = useRef(false);
  const count = Object.keys(ratings).length;
  const clearedCount = cleared ? Object.keys(cleared).length : 0;

  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      openRef.current?.focus();
    }
  }, [confirming]);

  // The "Clear ratings" button is disabled once nothing is rated, so focus goes to Undo instead,
  // and back to "Clear ratings" after Undo.
  useEffect(() => {
    if (cleared) undoRef.current?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      openRef.current?.focus();
    }
  }, [cleared]);

  function cancel() {
    returnFocus.current = true;
    setConfirming(false);
  }

  function confirm() {
    setCleared(ratings);
    setConfirming(false);
    onClear();
  }

  return (
    <div className={styles.wrap}>
      {confirming ? (
        <div
          className={styles.confirm}
          role="group"
          aria-labelledby="clear-ratings-question"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
        >
          <span id="clear-ratings-question" className={styles.question}>
            Clear all {count} {count === 1 ? "rating" : "ratings"}, including must-visits?
          </span>
          <button type="button" className={`${styles.button} ${styles.danger}`} onClick={confirm}>
            Clear
          </button>
          <button ref={cancelRef} type="button" className={styles.button} onClick={cancel}>
            Cancel
          </button>
        </div>
      ) : (
        <button
          ref={openRef}
          type="button"
          className={styles.button}
          disabled={!ready || count === 0}
          onClick={() => setConfirming(true)}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Clear ratings{count > 0 ? ` (${count})` : ""}
        </button>
      )}
      {/* Always rendered, so screen readers announce the message when it appears. */}
      <p role="status" className={styles.status}>
        {cleared && (
          <>
            Cleared {clearedCount} {clearedCount === 1 ? "rating" : "ratings"}.
            <button
              ref={undoRef}
              type="button"
              className={styles.button}
              onClick={() => {
                returnFocus.current = true;
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
