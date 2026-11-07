"use client";

import { BadgeCheck, Heart, HeartCrack } from "lucide-react";
import CategoryIcon from "@/components/CategoryIcon/CategoryIcon";
import FieldValue from "@/components/FieldValue/FieldValue";
import type { PlacePref } from "@/lib/prefs/types";
import type { Place } from "@/lib/types";
import styles from "./PlaceSummary.module.css";

const INTEREST = {
  not_interested: { label: "Not interested", icon: <HeartCrack size={14} aria-hidden="true" /> },
  maybe: { label: "Maybe", icon: <Heart size={14} aria-hidden="true" /> },
  very: { label: "Very interested", icon: <Heart size={14} aria-hidden="true" fill="currentColor" /> },
} as const;

/** A read-only, condensed place card, shown when hovering a pin on the full-screen map. */
export default function PlaceSummary({ place, pref }: { place: Place; pref: PlacePref | undefined }) {
  const where = [place.location.neighborhood, place.location.city].filter(Boolean).join(", ");
  const interest = pref?.interest && INTEREST[pref.interest];
  const booking = place.bookingRequired.status === "ok" && place.bookingRequired.value;

  return (
    <div className={styles.summary}>
      <div className={styles.header}>
        <strong className={styles.name}>{place.name}</strong>
        <CategoryIcon category={place.type} />
      </div>
      {where && <p className={styles.where}>{where}</p>}

      <p className={styles.facts}>
        {place.rating !== undefined && (
          <span>
            <span aria-hidden="true">★ </span>
            {place.rating.toFixed(1)}
            <span className="visually-hidden"> out of 5</span>
          </span>
        )}
        <FieldValue field={place.price} render={(p) => <span>{"€".repeat(p)}</span>} />
        <FieldValue field={place.durationMinutes} render={(m) => <span>{m} min</span>} />
        {booking && <span>Booking required</span>}
      </p>

      {pref?.mustVisit ? (
        <p className={`${styles.pref} ${styles.mustVisit}`}>
          <BadgeCheck size={14} aria-hidden="true" /> Must visit
        </p>
      ) : (
        interest && (
          <p className={styles.pref}>
            {interest.icon} {interest.label}
          </p>
        )
      )}

      {place.description && <p className={styles.description}>{place.description}</p>}
    </div>
  );
}
