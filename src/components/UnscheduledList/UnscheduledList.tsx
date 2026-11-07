import Link from "next/link";
import type { Unscheduled, UnscheduledReason } from "@/lib/planner/types";
import type { Place } from "@/lib/types";
import styles from "./UnscheduledList.module.css";

const REASONS: Record<UnscheduledReason, string> = {
  no_time: "Didn't fit in the time left",
  closed_on_trip_days: "Not open long enough on your trip days",
  location_unusable: "Location unknown, so it can't be planned",
};

const ORDER: UnscheduledReason[] = ["no_time", "closed_on_trip_days", "location_unusable"];

interface UnscheduledListProps {
  unscheduled: Unscheduled[];
  placeById: ReadonlyMap<string, Place>;
}

/** Places the traveler is interested in that the plan left out, grouped by reason. */
export default function UnscheduledList({ unscheduled, placeById }: UnscheduledListProps) {
  if (unscheduled.length === 0) return null;
  return (
    <section className={styles.box} aria-labelledby="unscheduled-heading">
      <h2 id="unscheduled-heading" className={styles.heading}>
        Not in this plan ({unscheduled.length})
      </h2>
      {ORDER.map((reason) => {
        const items = unscheduled.filter((u) => u.reason === reason);
        if (items.length === 0) return null;
        return (
          <div key={reason}>
            <h3 className={styles.reason}>{REASONS[reason]}</h3>
            <ul className={styles.list}>
              {items.map((u) => (
                <li key={u.placeId}>
                  <Link href={`/#place-${u.placeId}`}>{placeById.get(u.placeId)?.name ?? u.placeId}</Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
