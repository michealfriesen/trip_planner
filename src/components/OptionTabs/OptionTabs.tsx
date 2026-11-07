"use client";

import { useRef, useState } from "react";
import DayTimeline from "@/components/DayTimeline/DayTimeline";
import UnscheduledList from "@/components/UnscheduledList/UnscheduledList";
import type { ItineraryOption } from "@/lib/planner/types";
import type { PlacePref } from "@/lib/prefs/types";
import type { Place } from "@/lib/types";
import styles from "./OptionTabs.module.css";

interface OptionTabsProps {
  options: ItineraryOption[];
  placeById: ReadonlyMap<string, Place>;
  prefs: Record<string, PlacePref>;
}

function assumedOpenCount(option: ItineraryOption): number {
  return option.days
    .flatMap((d) => d.stops)
    .filter((s) => s.warnings.some((w) => w === "hours_unparsed_assumed_open" || w === "hours_missing_assumed_open"))
    .length;
}

/** One tab per itinerary option (WAI-ARIA tabs: arrow keys, Home and End move between tabs). */
export default function OptionTabs({ options, placeById, prefs }: OptionTabsProps) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.min(active, options.length - 1);
  const option = options[current];
  const assumed = assumedOpenCount(option);

  function onKeyDown(e: React.KeyboardEvent) {
    const last = options.length - 1;
    const next =
      e.key === "ArrowRight"
        ? (current + 1) % options.length
        : e.key === "ArrowLeft"
          ? (current - 1 + options.length) % options.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : -1;
    if (next === -1) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <section aria-label="Your plan" className={styles.wrap}>
      <div role="tablist" aria-label="Plan options" className={styles.tablist} onKeyDown={onKeyDown}>
        {options.map((o, i) => (
          <button
            key={o.label}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`option-tab-${i}`}
            aria-selected={i === current}
            aria-controls={`option-panel-${i}`}
            tabIndex={i === current ? 0 : -1}
            className={styles.tab}
            onClick={() => setActive(i)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`option-panel-${current}`}
        aria-labelledby={`option-tab-${current}`}
        tabIndex={0}
        className={styles.panel}
      >
        {assumed > 0 && (
          <p className={styles.notice}>
            {assumed} {assumed === 1 ? "stop uses" : "stops use"} opening hours we could not read. These times may be
            wrong. Check them before you go.
          </p>
        )}
        {option.days.map((day, i) => (
          <DayTimeline key={day.date} day={day} dayNumber={i + 1} placeById={placeById} prefs={prefs} />
        ))}
        <UnscheduledList unscheduled={option.unscheduled} placeById={placeById} prefs={prefs} />
      </div>
    </section>
  );
}
