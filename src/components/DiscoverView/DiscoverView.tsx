"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import FilterBar from "@/components/FilterBar/FilterBar";
import PlaceList from "@/components/PlaceList/PlaceList";
import PlaceMap, { type MapFocus } from "@/components/PlaceMap/PlaceMap";
import SearchBox from "@/components/SearchBox/SearchBox";
import SortSelect from "@/components/SortSelect/SortSelect";
import { usePreferences } from "@/hooks/usePreferences";
import { EMPTY_CRITERIA, filterOptions, filterPlaces, type FilterCriteria } from "@/lib/discover/filterPlaces";
import { sortPlaces, type SortKey } from "@/lib/discover/sortPlaces";
import { usableCoordinates } from "@/lib/geo";
import type { DataIssue, Place } from "@/lib/types";
import styles from "./DiscoverView.module.css";

interface DiscoverViewProps {
  places: Place[];
  /** Shown by the data-quality panel (stage 7). */
  issues: DataIssue[];
  fetchedAt: string;
}

export default function DiscoverView({ places, fetchedAt }: DiscoverViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [criteria, setCriteria] = useState<FilterCriteria>(EMPTY_CRITERIA);
  // Bumped by "Clear filters" to remount the search box with an empty value.
  const [searchKey, setSearchKey] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [mapExpanded, setMapExpanded] = useState(false);
  const { prefs, ready, setInterest, setMustVisit } = usePreferences();
  const prefHandlers = useMemo(() => ({ ready, setInterest, setMustVisit }), [ready, setInterest, setMustVisit]);

  const options = useMemo(() => filterOptions(places), [places]);
  const { matches, uncertainMatches } = useMemo(() => {
    const result = filterPlaces(places, criteria, prefs.places);
    return {
      matches: sortPlaces(result.matches, sortKey, prefs.places),
      uncertainMatches: sortPlaces(result.uncertainMatches, sortKey, prefs.places),
    };
  }, [places, criteria, sortKey, prefs.places]);
  const shown = useMemo(() => [...matches, ...uncertainMatches], [matches, uncertainMatches]);

  const onSearch = useCallback(
    (query: string) => setCriteria((c) => (c.query === query ? c : { ...c, query })),
    [],
  );

  function clearFilters() {
    setCriteria(EMPTY_CRITERIA);
    setSearchKey((k) => k + 1);
  }

  useEffect(() => {
    if (!mapExpanded) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !e.defaultPrevented) setMapExpanded(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mapExpanded]);

  // Choosing a card moves the map to it; choosing a marker only selects, since the marker is already in view.
  function selectFromList(id: string) {
    setSelectedId(id);
    const place = places.find((p) => p.id === id);
    const c = place && usableCoordinates(place);
    if (c) setFocus((prev) => ({ coordinates: c, seq: (prev?.seq ?? 0) + 1 }));
  }

  const fetchedLabel = new Date(fetchedAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  const countText = `${matches.length} of ${places.length} places${
    uncertainMatches.length > 0 ? `, ${uncertainMatches.length} may be inaccurate` : ""
  }`;

  return (
    <div className={`${styles.layout} ${mapExpanded ? styles.expanded : ""}`}>
      <section className={styles.mapPane} aria-label="Map">
        <PlaceMap
          places={shown}
          selectedId={selectedId}
          focus={focus}
          onSelect={setSelectedId}
          expanded={mapExpanded}
          prefs={prefs.places}
        />
        <div className={styles.mapControls}>
          {mapExpanded && <p className={styles.mapCount}>{countText}</p>}
          <button
            type="button"
            className={styles.expandButton}
            aria-pressed={mapExpanded}
            title={mapExpanded ? "Exit full screen (Esc)" : "Full screen map"}
            onClick={() => setMapExpanded((v) => !v)}
          >
            {mapExpanded ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
            {mapExpanded ? "Show list" : "Full screen"}
          </button>
        </div>
      </section>
      <section className={styles.listPane} aria-labelledby="places-heading" hidden={mapExpanded}>
        <div className={styles.summary}>
          <h1 id="places-heading" className={styles.title}>
            Places
          </h1>
          <p role="status" className={styles.count}>
            {countText}
          </p>
        </div>
        <p className={styles.fetched}>Data as of {fetchedLabel} UTC</p>
        <div className={styles.controls}>
          <div className={styles.searchRow}>
            <SearchBox key={searchKey} initialValue={criteria.query} onSearch={onSearch} />
            <SortSelect value={sortKey} onChange={setSortKey} />
          </div>
          <FilterBar options={options} criteria={criteria} onChange={setCriteria} onClear={clearFilters} />
        </div>
        <PlaceList
          matches={matches}
          uncertainMatches={uncertainMatches}
          prefs={prefs.places}
          prefHandlers={prefHandlers}
          selectedId={selectedId}
          onSelect={selectFromList}
        />
      </section>
    </div>
  );
}
