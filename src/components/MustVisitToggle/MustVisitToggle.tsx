"use client";

import { useId } from "react";
import { BadgeCheck } from "lucide-react";
import styles from "./MustVisitToggle.module.css";

interface MustVisitToggleProps {
  mustVisit: boolean;
  /** False when the place's location is unusable, so the planner could not place it. */
  locatable: boolean;
  disabled: boolean;
  onChange: (mustVisit: boolean) => void;
}

export default function MustVisitToggle({ mustVisit, locatable, disabled, onChange }: MustVisitToggleProps) {
  const reasonId = useId();
  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={mustVisit}
        aria-describedby={locatable ? undefined : reasonId}
        disabled={disabled || (!locatable && !mustVisit)}
        onClick={() => onChange(!mustVisit)}
      >
        <BadgeCheck size={16} aria-hidden="true" />
        Must visit
      </button>
      {!locatable && (
        <span id={reasonId} className={styles.reason}>
          Location unknown
        </span>
      )}
    </span>
  );
}
