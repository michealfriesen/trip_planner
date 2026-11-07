"use client";

import { useEffect, useRef } from "react";
import CategoryIcon from "@/components/CategoryIcon/CategoryIcon";
import { useDebug } from "@/components/Debug/DebugContext";
import FieldValue from "@/components/FieldValue/FieldValue";
import FlagBadge from "@/components/FlagBadge/FlagBadge";
import HoursValue from "@/components/HoursValue/HoursValue";
import InterestControl from "@/components/InterestControl/InterestControl";
import MustVisitToggle from "@/components/MustVisitToggle/MustVisitToggle";
import Suspect from "@/components/Suspect/Suspect";
import type { Interest, PlacePref } from "@/lib/prefs/types";
import type { Place } from "@/lib/types";
import styles from "./PlaceCard.module.css";

export interface PrefHandlers {
  /** False until stored preferences have loaded; the controls stay disabled until then. */
  ready: boolean;
  setInterest: (id: string, interest: Interest | undefined) => void;
  setMustVisit: (id: string, mustVisit: boolean) => void;
}

interface PlaceCardProps {
  place: Place;
  pref: PlacePref | undefined;
  prefHandlers: PrefHandlers;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function PlaceCard({ place, pref, prefHandlers, selected, onSelect }: PlaceCardProps) {
  const ref = useRef<HTMLElement>(null);
  const debug = useDebug();

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  const { location } = place;
  const where = [location.neighborhood, location.city].filter(Boolean).join(", ");

  // Mouse convenience: the whole card selects. Keyboard and screen readers use the title button.
  function handleCardClick(e: React.MouseEvent<HTMLElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("a, button, input, select, textarea, label, [tabindex]")) return;
    if (window.getSelection()?.toString()) return; // the traveler is selecting text
    onSelect(place.id);
  }

  return (
    <article
      ref={ref}
      className={`${styles.card} ${selected ? styles.selected : ""}`}
      onClick={handleCardClick}
    >
      <header className={styles.header}>
        <h3 className={styles.name}>
          <button
            type="button"
            className={styles.select}
            aria-pressed={selected}
            onClick={() => onSelect(place.id)}
          >
            {place.name}
          </button>
        </h3>
        {place.flags.includes("type_unknown") ? (
          <Suspect reasons={["Not a type we know."]}>
            <CategoryIcon category={place.type} />
          </Suspect>
        ) : (
          <CategoryIcon category={place.type} />
        )}
      </header>

      <div className={styles.prefs}>
        <InterestControl
          placeName={place.name}
          interest={pref?.interest}
          mustVisit={pref?.mustVisit ?? false}
          disabled={!prefHandlers.ready}
          onChange={(v) => prefHandlers.setInterest(place.id, v)}
        />
        <MustVisitToggle
          mustVisit={pref?.mustVisit ?? false}
          locatable={location.locationQuality === "ok"}
          disabled={!prefHandlers.ready}
          onChange={(v) => prefHandlers.setMustVisit(place.id, v)}
        />
      </div>

      <dl className={styles.facts}>
        {where && (
          <div>
            <dt>Where</dt>
            <dd>{where}</dd>
          </div>
        )}
        {place.rating !== undefined && (
          <div>
            <dt>Rating</dt>
            <dd>
              <span aria-hidden="true">★ </span>
              {place.rating.toFixed(1)}
              <span className="visually-hidden"> out of 5</span>
            </dd>
          </div>
        )}
        <div>
          <dt>Price</dt>
          <dd>
            <FieldValue field={place.price} showMissing render={(p) => "€".repeat(p)} />
          </dd>
        </div>
        <div>
          <dt>Visit</dt>
          <dd>
            <FieldValue field={place.durationMinutes} showMissing render={(m) => `${m} min`} />
          </dd>
        </div>
        <div>
          <dt>Hours</dt>
          <dd>
            <HoursValue hours={place.hours} />
          </dd>
        </div>
        <div>
          <dt>Booking</dt>
          <dd>
            <FieldValue
              field={place.bookingRequired}
              showMissing
              render={(b) => (b ? "Required" : "Not needed")}
            />
          </dd>
        </div>
      </dl>

      {place.description && <p className={styles.description}>{place.description}</p>}
      {place.seasonalNotes && (
        <p className={styles.seasonal}>
          <strong>Seasonal note:</strong> {place.seasonalNotes}
        </p>
      )}

      {place.tags.length > 0 && (
        <ul className={styles.tags} aria-label="Tags">
          {place.tags.map((t) => (
            <li key={t} className={styles.tag}>
              {t}
            </li>
          ))}
        </ul>
      )}

      {debug && place.flags.length > 0 && (
        <ul className={styles.flags} aria-label="Data warnings">
          {place.flags.map((f) => (
            <li key={f}>
              <FlagBadge badge={f} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
