"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import PlaceSummary from "@/components/PlaceSummary/PlaceSummary";
import type { PlacePref } from "@/lib/prefs/types";
import type { Place } from "@/lib/types";
import styles from "./PlaceHoverCard.module.css";

interface PlaceHoverCardProps {
  place: Place;
  pref: PlacePref | undefined;
  className?: string;
  /** Renders the trigger; pass `describedBy` to its `aria-describedby`. */
  children: (describedBy: string | undefined) => ReactNode;
}

/**
 * Shows a `PlaceSummary` above its trigger on hover or keyboard focus (below it when there is no room above).
 * The card can be hovered without closing it, and Escape dismisses it (WCAG 1.4.13).
 */
export default function PlaceHoverCard({ place, pref, className, children }: PlaceHoverCardProps) {
  const [open, setOpen] = useState(false);
  const [below, setBelow] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!open || !wrap.current || !card.current) return;
    setBelow(wrap.current.getBoundingClientRect().top < card.current.offsetHeight);
  }, [open]);

  return (
    <div
      ref={wrap}
      className={`${styles.wrap} ${className ?? ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      {children(open ? id : undefined)}
      {open && (
        <div ref={card} id={id} role="tooltip" className={`${styles.card} ${below ? styles.below : styles.above}`}>
          <div className={styles.panel}>
            <PlaceSummary place={place} pref={pref} />
          </div>
        </div>
      )}
    </div>
  );
}
