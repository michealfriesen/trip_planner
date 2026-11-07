import { useId } from "react";
import type { PlaceHours } from "@/lib/types";
import styles from "./HoursValue.module.css";

export default function HoursValue({ hours }: { hours: PlaceHours }) {
  const tipId = useId();

  if (hours.status === "missing") return <span className={styles.unknown}>Hours unknown</span>;

  return (
    <span className={styles.hours}>
      <span>{hours.raw}</span>
      {hours.status === "normalized" && (
        <span className={styles.tipWrap}>
          <span className={`${styles.badge} ${styles.info}`} tabIndex={0} aria-describedby={tipId}>
            interpreted
          </span>
          <span id={tipId} role="tooltip" className={styles.tip}>
            {hours.warnings.map((w) => (
              <span key={w} className={styles.tipLine}>
                {w}
              </span>
            ))}
          </span>
        </span>
      )}
      {hours.status === "unparsed" && (
        <span className={`${styles.badge} ${styles.warn}`} title="The hours text could not be read.">
          may be inaccurate
        </span>
      )}
    </span>
  );
}
