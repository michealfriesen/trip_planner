"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ClearRatings from "@/components/ClearRatings/ClearRatings";
import FilterBar from "@/components/FilterBar/FilterBar";
import MapPlacePanel from "@/components/MapPlacePanel/MapPlacePanel";
import PlaceList from "@/components/PlaceList/PlaceList";
import PlaceMap, { type MapFocus } from "@/components/PlaceMap/PlaceMap";
import ScrollToTop from "@/components/ScrollToTop/ScrollToTop";
import SearchBox from "@/components/SearchBox/SearchBox";
import SortSelect from "@/components/SortSelect/SortSelect";
import { usePreferences } from "@/hooks/usePreferences";
import { EMPTY_CRITERIA, filterOptions, filterPlaces, type FilterCriteria } from "@/lib/discover/filterPlaces";
import { placesInBounds, type MapBounds } from "@/lib/discover/mapBounds";
import { sortPlaces, type SortKey } from "@/lib/discover/sortPlaces";
import { usableCoordinates } from "@/lib/geo";
import type { DataIssue, Place } from "@/lib/types";
import styles from "./DiscoverView.module.css";

interface DiscoverViewProps {
  places: Place[];
  /** Shown by the data-quality panel (stage 7). */
  issues: DataIssue[];
  fetchedAt: string;
  /** Opens this place on the full-screen map once preferences have loaded. */
  linkedPlaceId?: string;
}

export default function DiscoverView({ places, fetchedAt, linkedPlaceId }: DiscoverViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [criteria, setCriteria] = useState<FilterCriteria>(EMPTY_CRITERIA);
  // Bumped by "Clear filters" to remount the search box with an empty value.
  const [searchKey, setSearchKey] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [mapExpanded, setMapExpanded] = useState(false);
  // "Update results when map moves": the list and count only include places inside the map's view.
  const [inViewOnly, setInViewOnly] = useState(false);
  const [viewBounds, setViewBounds] = useState<MapBounds | null>(null);
  // Bumped when a pin is chosen with the keyboard, to move focus into the panel once it renders.
  const [panelFocusSeq, setPanelFocusSeq] = useState(0);
  const panelRef = useRef<HTMLElement>(null);
  const { prefs, ready, setInterest, setMustVisit, clearRatings, restoreRatings } = usePreferences();
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
  // The map keeps every pin in `shown`: hiding pins as the map moves would change the pin set, which refits the map.
  const listed = useMemo(() => {
    if (!inViewOnly || !viewBounds) return { matches, uncertainMatches };
    return {
      matches: placesInBounds(matches, viewBounds),
      uncertainMatches: placesInBounds(uncertainMatches, viewBounds),
    };
  }, [inViewOnly, viewBounds, matches, uncertainMatches]);

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

  useEffect(() => {
    if (panelFocusSeq > 0) panelRef.current?.focus();
  }, [panelFocusSeq]);

  // Wait for preferences: loading them can change the shown places, which refits the map and would undo the fly-to.
  const linkApplied = useRef(false);
  // Bumped when a place is chosen from the map or a Plan link, to bring its card to the middle of the list.
  // Choosing a card in the list doesn't bump it: that card is already in view.
  const [reveal, setReveal] = useState<{ id: string; seq: number } | null>(null);
  const revealCard = useCallback((id: string) => setReveal((r) => ({ id, seq: (r?.seq ?? 0) + 1 })), []);
  // Keyboard and screen-reader users land on the linked card's title button.
  const [linkedCardFocus, setLinkedCardFocus] = useState<string | null>(null);
  const listRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Also runs on leaving full screen, so the card chosen there is in view.
    const list = listRef.current;
    if (!reveal || mapExpanded || !list) return;
    const card = list.querySelector<HTMLElement>(`article[data-place-id="${CSS.escape(reveal.id)}"]`);
    if (!card) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (list.scrollHeight > list.clientHeight) {
      // Scroll only the list pane, never the page, so the map stays where it is.
      const cardTop = card.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
      list.scrollTo({ top: cardTop - (list.clientHeight - card.offsetHeight) / 2, behavior });
    } else if (linkedCardFocus === reveal.id) {
      // Narrow screens: the list is part of the page, so the page scrolls to a linked card. Pin clicks don't
      // scroll the page, which would move the map out of view.
      card.scrollIntoView({ block: "center", behavior });
    }
  }, [reveal, mapExpanded, linkedCardFocus]);

  useEffect(() => {
    if (!linkedCardFocus) return;
    document
      .querySelector<HTMLElement>(`article[data-place-id="${CSS.escape(linkedCardFocus)}"] h3 button`)
      ?.focus({ preventScroll: true });
  }, [linkedCardFocus]);
  useEffect(() => {
    if (!ready || linkApplied.current || !linkedPlaceId) return;
    linkApplied.current = true;
    const place = places.find((p) => p.id === linkedPlaceId);
    if (!place) return;
    setSelectedId(place.id);
    revealCard(place.id);
    setLinkedCardFocus(place.id);
    const c = usableCoordinates(place);
    if (c) setFocus((prev) => ({ coordinates: c, seq: (prev?.seq ?? 0) + 1 }));
    // Drop the parameter so a reload shows the normal view; keep any others, such as ?debug.
    const url = new URL(window.location.href);
    url.searchParams.delete("place");
    window.history.replaceState(null, "", url);
  }, [ready, linkedPlaceId, places, revealCard]);

  const selectFromMap = useCallback(
    (id: string, options?: { keyboard: boolean }) => {
      setSelectedId(id);
      revealCard(id);
      if (options?.keyboard) setPanelFocusSeq((n) => n + 1);
    },
    [revealCard],
  );

  function closePanel() {
    const id = selectedId;
    setSelectedId(null);
    // Return focus to the pin the panel belonged to, so keyboard users keep their place on the map.
    if (id) document.querySelector<HTMLElement>(`.leaflet-marker-icon[data-place-id="${CSS.escape(id)}"]`)?.focus();
  }

  const selectedPlace = mapExpanded ? shown.find((p) => p.id === selectedId) : undefined;

  // Choosing a card moves the map to it; choosing a marker only selects, since the marker is already in view.
  function selectFromList(id: string) {
    setSelectedId(id);
    setReveal(null);
    const place = places.find((p) => p.id === id);
    const c = place && usableCoordinates(place);
    if (c) setFocus((prev) => ({ coordinates: c, seq: (prev?.seq ?? 0) + 1 }));
  }

  const fetchedLabel = new Date(fetchedAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  const countText = `${listed.matches.length} of ${places.length} places${inViewOnly ? " in map view" : ""}${
    listed.uncertainMatches.length > 0 ? `, ${listed.uncertainMatches.length} may be inaccurate` : ""
  }`;

  return (
    <div className={`${styles.layout} ${mapExpanded ? styles.expanded : ""}`}>
      <section className={styles.mapPane} aria-label="Map">
        <PlaceMap
          places={shown}
          selectedId={selectedId}
          focus={focus}
          onSelect={selectFromMap}
          expanded={mapExpanded}
          prefs={prefs.places}
          onBoundsChange={inViewOnly ? setViewBounds : undefined}
        />
        {selectedPlace && (
          <MapPlacePanel
            ref={panelRef}
            place={selectedPlace}
            pref={prefs.places[selectedPlace.id]}
            prefHandlers={prefHandlers}
            onClose={closePanel}
          />
        )}
        <div className={styles.mapControls}>
          <label className={styles.inViewToggle}>
            <input type="checkbox" checked={inViewOnly} onChange={(e) => setInViewOnly(e.target.checked)} />
            Update results when map moves
          </label>
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
      <section
        ref={listRef}
        className={styles.listPane}
        aria-labelledby="places-heading"
        hidden={mapExpanded}
      >
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
          <ClearRatings
            ratings={prefs.places}
            ready={ready}
            onClear={clearRatings}
            onRestore={restoreRatings}
          />
        </div>
        <PlaceList
          matches={listed.matches}
          uncertainMatches={listed.uncertainMatches}
          emptyText={inViewOnly ? "No places in this part of the map. Move or zoom out the map." : undefined}
          prefs={prefs.places}
          prefHandlers={prefHandlers}
          selectedId={selectedId}
          onSelect={selectFromList}
        />
        <ScrollToTop targetRef={listRef} />
      </section>
    </div>
  );
}
