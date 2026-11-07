import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon/CategoryIcon";
import FlagBadge from "@/components/FlagBadge/FlagBadge";
import type { Stop } from "@/lib/planner/types";
import type { Place } from "@/lib/types";
import styles from "./StopCard.module.css";

interface StopCardProps {
  stop: Stop;
  place: Place;
}

export default function StopCard({ stop, place }: StopCardProps) {
  const where = [place.location.neighborhood, place.location.city].filter(Boolean).join(", ");
  const assumedOpen = stop.warnings.some(
    (w) => w === "hours_unparsed_assumed_open" || w === "hours_missing_assumed_open",
  );

  return (
    <article className={`${styles.card} ${stop.mustVisit ? styles.must : ""}`}>
      <p className={styles.time}>
        <time>{stop.start}</time>–<time>{stop.end}</time>
      </p>
      <div className={styles.body}>
        <h3 className={styles.name}>
          <CategoryIcon category={place.type} />
          <Link href={`/#place-${place.id}`}>{place.name}</Link>
          {stop.mustVisit && <span className={styles.mustLabel}>Must-visit</span>}
        </h3>
        {where && <p className={styles.where}>{where}</p>}
        {stop.warnings.length > 0 && (
          <ul className={styles.warnings} aria-label="Warnings">
            {stop.warnings.map((w) => (
              <li key={w}>
                <FlagBadge badge={w} />
              </li>
            ))}
          </ul>
        )}
        {assumedOpen && (
          <p className={styles.detail}>
            Listed hours: {place.hours.raw ? <q>{place.hours.raw}</q> : "none given"}
          </p>
        )}
        {place.seasonalNotes && <p className={styles.detail}>{place.seasonalNotes}</p>}
      </div>
    </article>
  );
}
