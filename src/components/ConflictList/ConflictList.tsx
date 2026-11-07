import Link from "next/link";
import type { Conflict } from "@/lib/planner/types";
import type { Place } from "@/lib/types";
import styles from "./ConflictList.module.css";

interface ConflictListProps {
  conflicts: Conflict[];
  placeById: ReadonlyMap<string, Place>;
}

/** An infeasible plan, as plain sentences with a fix and links to the places involved. */
export default function ConflictList({ conflicts, placeById }: ConflictListProps) {
  return (
    <section role="alert" className={styles.box} aria-labelledby="conflicts-heading">
      <h2 id="conflicts-heading" className={styles.heading}>
        Your must-visits don&apos;t fit this trip
      </h2>
      <ul className={styles.list}>
        {conflicts.map((c) => (
          <li key={`${c.reason}:${c.placeIds.join(",")}`}>
            <p className={styles.message}>{c.message}</p>
            <p className={styles.links}>
              {c.placeIds.map((id) => (
                <Link key={id} href={`/#place-${id}`}>
                  {placeById.get(id)?.name ?? id}
                </Link>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
