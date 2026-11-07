"use client";

import { Heart, HeartCrack } from "lucide-react";
import type { Interest } from "@/lib/prefs/types";
import styles from "./InterestControl.module.css";

const LEVELS: { value: Interest; label: string; icon: React.ReactNode }[] = [
  { value: "not_interested", label: "Not interested", icon: <HeartCrack size={16} aria-hidden="true" /> },
  { value: "maybe", label: "Maybe", icon: <Heart size={16} aria-hidden="true" /> },
  {
    value: "very",
    label: "Very interested",
    icon: (
      <>
        <Heart size={16} aria-hidden="true" />
        <Heart size={16} aria-hidden="true" />
      </>
    ),
  },
];

interface InterestControlProps {
  placeName: string;
  interest: Interest | undefined;
  mustVisit: boolean;
  disabled: boolean;
  onChange: (interest: Interest | undefined) => void;
}

/**
 * Toggle buttons rather than radios, so pressing the current level clears it back to Unrated.
 * Hidden for must-visits: the must-visit toggle beside it already says so, and interest doesn't apply.
 */
export default function InterestControl({ placeName, interest, mustVisit, disabled, onChange }: InterestControlProps) {
  if (mustVisit) return null;

  const current = LEVELS.find((l) => l.value === interest);
  return (
    <div className={styles.control} role="group" aria-label={`Interest in ${placeName}`}>
      {LEVELS.map((level) => {
        const pressed = level.value === interest;
        return (
          <button
            key={level.value}
            type="button"
            className={`${styles.level} ${styles[level.value]}`}
            aria-pressed={pressed}
            aria-label={level.label}
            title={pressed ? `${level.label} (press again to clear)` : level.label}
            disabled={disabled}
            onClick={() => onChange(pressed ? undefined : level.value)}
          >
            {level.icon}
          </button>
        );
      })}
      <span className={styles.label} aria-hidden="true">
        {current?.label ?? "Unrated"}
      </span>
    </div>
  );
}
