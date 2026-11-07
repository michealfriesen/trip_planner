"use client";

import { useCallback, useEffect, useState } from "react";
import { emptyPrefs, loadPrefs, savePrefs, STORAGE_KEY, withPlacePref } from "@/lib/prefs/storage";
import type { Interest, StoredPrefs } from "@/lib/prefs/types";

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked; the session still works, it just isn't saved
  }
}

/**
 * The traveler's saved choices. Loads after mount so the server HTML and the first browser render match;
 * until `ready`, callers should disable the preference controls.
 */
export function usePreferences() {
  const [prefs, setPrefs] = useState<StoredPrefs>(emptyPrefs);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs(readStorage()));
    setReady(true);

    // Keep other open tabs in step.
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setPrefs(loadPrefs(e.newValue));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, savePrefs(prefs));
    } catch {
      // Full or blocked storage: keep the in-memory choices.
    }
  }, [prefs, ready]);

  const setInterest = useCallback((id: string, interest: Interest | undefined) => {
    setPrefs((p) => {
      const mustVisit = p.places[id]?.mustVisit ?? false;
      return { ...p, places: withPlacePref(p.places, id, { interest, mustVisit }) };
    });
  }, []);

  const setMustVisit = useCallback((id: string, mustVisit: boolean) => {
    setPrefs((p) => {
      const interest = p.places[id]?.interest;
      return { ...p, places: withPlacePref(p.places, id, { interest, mustVisit }) };
    });
  }, []);

  const setTrip = useCallback((trip: Partial<StoredPrefs["trip"]>) => {
    setPrefs((p) => ({ ...p, trip: { ...p.trip, ...trip } }));
  }, []);

  return { prefs, ready, setInterest, setMustVisit, setTrip };
}
