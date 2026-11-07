"use client";

import Suspect from "@/components/Suspect/Suspect";
import { useDebug } from "@/components/Debug/DebugContext";
import type { PlaceHours } from "@/lib/types";
import styles from "./HoursValue.module.css";

export default function HoursValue({ hours }: { hours: PlaceHours }) {
  const debug = useDebug();

  switch (hours.status) {
    case "missing":
      return <Suspect reasons={["No hours in the source data."]}>Unknown</Suspect>;
    case "unparsed":
      return <Suspect reasons={["The hours text could not be read."]}>{hours.raw}</Suspect>;
    case "normalized":
      // Readable after small corrections; only debug mode says what was corrected.
      return (
        <span className={styles.hours}>
          {hours.raw}
          {debug && (
            <span className={styles.debug}>
              {hours.warnings.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </span>
          )}
        </span>
      );
    case "parsed":
      return <>{hours.raw}</>;
  }
}
