import { Fragment } from "react";
import StopCard from "@/components/StopCard/StopCard";
import type { DayPlan } from "@/lib/planner/types";
import type { PlacePref } from "@/lib/prefs/types";
import type { Place } from "@/lib/types";
import styles from "./DayTimeline.module.css";

interface DayTimelineProps {
  day: DayPlan;
  dayNumber: number;
  placeById: ReadonlyMap<string, Place>;
  prefs: Record<string, PlacePref>;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function Leg({ minutes, overnight }: { minutes: number; overnight: boolean }) {
  return (
    <li className={styles.leg}>
      ~{minutes} min travel (estimated){overnight ? " from where you finished yesterday" : ""}
    </li>
  );
}

export default function DayTimeline({ day, dayNumber, placeById, prefs }: DayTimelineProps) {
  const heading = `Day ${dayNumber}: ${DATE_FORMAT.format(new Date(`${day.date}T00:00:00Z`))}`;
  return (
    <section className={styles.day} aria-label={heading}>
      <h2 className={styles.heading}>{heading}</h2>
      {day.stops.length === 0 ? (
        <p className={styles.empty}>Nothing planned. A free day.</p>
      ) : (
        <ol className={styles.list}>
          {day.stops.map((stop, i) => {
            const place = placeById.get(stop.placeId);
            return (
              <Fragment key={stop.placeId}>
                {stop.travelMinutesBefore > 0 && <Leg minutes={stop.travelMinutesBefore} overnight={i === 0} />}
                <li>{place && <StopCard stop={stop} place={place} pref={prefs[stop.placeId]} />}</li>
              </Fragment>
            );
          })}
        </ol>
      )}
    </section>
  );
}
