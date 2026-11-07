"use client";

import { X } from "lucide-react";
import { forwardRef } from "react";
import InterestControl from "@/components/InterestControl/InterestControl";
import MustVisitToggle from "@/components/MustVisitToggle/MustVisitToggle";
import type { PrefHandlers } from "@/components/PlaceCard/PlaceCard";
import PlaceSummary from "@/components/PlaceSummary/PlaceSummary";
import type { PlacePref } from "@/lib/prefs/types";
import type { Place } from "@/lib/types";
import styles from "./MapPlacePanel.module.css";

interface MapPlacePanelProps {
  place: Place;
  pref: PlacePref | undefined;
  prefHandlers: PrefHandlers;
  onClose: () => void;
}

/** The selected place on the full-screen map, with its rating controls. */
const MapPlacePanel = forwardRef<HTMLElement, MapPlacePanelProps>(function MapPlacePanel(
  { place, pref, prefHandlers, onClose },
  ref,
) {
  return (
    <section
      ref={ref}
      className={styles.panel}
      aria-label={`Selected place: ${place.name}`}
      tabIndex={-1}
      onKeyDown={(e) => {
        // Handled here so the full-screen view's Esc (exit full screen) doesn't also fire.
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <button type="button" className={styles.close} aria-label="Close" title="Close" onClick={onClose}>
        <X size={16} aria-hidden="true" />
      </button>
      {/* The controls below show the interest, so the summary doesn't repeat it. The full description scrolls
          here, so the close button and rating controls stay in view. */}
      <div className={styles.scroll} role="region" aria-label="Place details" tabIndex={0}>
        <PlaceSummary place={place} pref={undefined} fullDescription />
      </div>
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
          locatable={place.location.locationQuality === "ok"}
          disabled={!prefHandlers.ready}
          onChange={(v) => prefHandlers.setMustVisit(place.id, v)}
        />
      </div>
    </section>
  );
});

export default MapPlacePanel;
