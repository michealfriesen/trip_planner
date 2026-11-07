"use client";

import type { StoredPrefs } from "@/lib/prefs/types";
import styles from "./TripForm.module.css";

interface TripFormProps {
  trip: StoredPrefs["trip"];
  days: number;
  disabled: boolean;
  pending: boolean;
  onChange: (trip: Partial<StoredPrefs["trip"]>) => void;
  onSubmit: () => void;
}

/** Trip dates and daily hours. Changes are saved as they are made; the browser checks the fields on submit. */
export default function TripForm({ trip, days, disabled, pending, onChange, onSubmit }: TripFormProps) {
  const endBeforeStart = trip.dayEnd <= trip.dayStart;

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (!endBeforeStart) onSubmit();
      }}
    >
      <label className={styles.field}>
        <span>Start date</span>
        <input
          type="date"
          required
          value={trip.startDate ?? ""}
          onChange={(e) => onChange({ startDate: e.target.value || undefined })}
        />
      </label>
      <p className={styles.length}>{days}-day trip</p>
      <label className={styles.field}>
        <span>Day starts</span>
        <input type="time" required value={trip.dayStart} onChange={(e) => onChange({ dayStart: e.target.value })} />
      </label>
      <label className={styles.field}>
        <span>Day ends</span>
        <input
          type="time"
          required
          value={trip.dayEnd}
          aria-invalid={endBeforeStart}
          aria-describedby={endBeforeStart ? "trip-time-error" : undefined}
          onChange={(e) => onChange({ dayEnd: e.target.value })}
        />
      </label>
      <button type="submit" className={styles.submit} disabled={disabled || endBeforeStart}>
        {pending ? "Planning…" : "Plan my trip"}
      </button>
      {endBeforeStart && (
        <p id="trip-time-error" className={styles.error}>
          The day must end after it starts.
        </p>
      )}
    </form>
  );
}
