"use client";

import { useCallback, useMemo, useState } from "react";
import FilterBar from "@/components/FilterBar/FilterBar";
import PlaceList from "@/components/PlaceList/PlaceList";
import PlaceMap, { type MapFocus } from "@/components/PlaceMap/PlaceMap";
import SearchBox from "@/components/SearchBox/SearchBox";
import { EMPTY_CRITERIA, filterOptions, filterPlaces, type FilterCriteria } from "@/lib/discover/filterPlaces";
import { usableCoordinates } from "@/lib/geo";
import type { PlacePref } from "@/lib/prefs/types";
import type { DataIssue, Place } from "@/lib/types";
import styles from "./DiscoverView.module.css";

interface DiscoverViewProps {
  places: Place[];
  /** Shown by the data-quality panel (stage 7). */
  issues: DataIssue[];
  fetchedAt: string;
}

// Preferences arrive in stage 3; a stable empty object keeps the filter memo from rerunning.
const NO_PREFS: Record<string, PlacePref> = {};

export default function DiscoverView({ places, fetchedAt }: DiscoverViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [criteria, setCriteria] = useState<FilterCriteria>(EMPTY_CRITERIA);
  // Bumped by "Clear filters" to remount the search box with an empty value.
  const [searchKey, setSearchKey] = useState(0);

  const options = useMemo(() => filterOptions(places), [places]);
  const { matches, uncertainMatches } = useMemo(
    () => filterPlaces(places, criteria, NO_PREFS),
    [places, criteria],
  );
  const shown = useMemo(() => [...matches, ...uncertainMatches], [matches, uncertainMatches]);

  const onSearch = useCallback(
    (query: string) => setCriteria((c) => (c.query === query ? c : { ...c, query })),
    [],
  );

  function clearFilters() {
    setCriteria(EMPTY_CRITERIA);
    setSearchKey((k) => k + 1);
  }

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

  return (
    <div className={styles.layout}>
      <section className={styles.mapPane} aria-label="Map">
        <PlaceMap places={shown} selectedId={selectedId} focus={focus} onSelect={setSelectedId} />
      </section>
      <section className={styles.listPane} aria-labelledby="places-heading">
        <div className={styles.summary}>
          <h1 id="places-heading" className={styles.title}>
            Places
          </h1>
          <p role="status" className={styles.count}>
            {matches.length} of {places.length} places
            {uncertainMatches.length > 0 && `, ${uncertainMatches.length} may be inaccurate`}
          </p>
        </div>
        <p className={styles.fetched}>Data as of {fetchedLabel} UTC</p>
        <div className={styles.controls}>
          <SearchBox key={searchKey} initialValue={criteria.query} onSearch={onSearch} />
          <FilterBar options={options} criteria={criteria} onChange={setCriteria} onClear={clearFilters} />
        </div>
        <PlaceList
          matches={matches}
          uncertainMatches={uncertainMatches}
          selectedId={selectedId}
          onSelect={selectFromList}
        />
      </section>
    </div>
  );
}
