"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { generatePlan } from "@/app/plan/actions";
import ConflictList from "@/components/ConflictList/ConflictList";
import OptionTabs from "@/components/OptionTabs/OptionTabs";
import TripForm from "@/components/TripForm/TripForm";
import { usePreferences } from "@/hooks/usePreferences";
import { PLANNER_CONFIG } from "@/lib/config";
import type { PlanRequest, PlanResult } from "@/lib/planner/types";
import type { Place } from "@/lib/types";
import styles from "./PlanView.module.css";

export default function PlanView({ places }: { places: Place[] }) {
  const { prefs, ready, setTrip } = usePreferences();
  const [result, setResult] = useState<PlanResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const { musts, others } = useMemo(() => {
    let musts = 0;
    let others = 0;
    for (const [id, pref] of Object.entries(prefs.places)) {
      if (!placeById.has(id)) continue;
      if (pref.mustVisit) musts++;
      else if (pref.interest === "maybe" || pref.interest === "very") others++;
    }
    return { musts, others };
  }, [prefs.places, placeById]);

  const { startDate, dayStart, dayEnd } = prefs.trip;

  function submit() {
    if (!startDate) return;
    const request: PlanRequest = { startDate, days: PLANNER_CONFIG.tripDays, dayStart, dayEnd, prefs: prefs.places };
    setFailed(false);
    startTransition(async () => {
      try {
        setResult(await generatePlan(request));
      } catch (error) {
        console.error("[plan] request failed", error);
        setResult(null);
        setFailed(true);
      }
    });
  }

  const nothingRated = ready && musts + others === 0;

  return (
    <div className={styles.page}>
      <section className={styles.setup} aria-labelledby="plan-heading">
        <h1 id="plan-heading" className={styles.title}>
          Plan your trip
        </h1>
        <TripForm
          trip={prefs.trip}
          days={PLANNER_CONFIG.tripDays}
          disabled={!ready || pending || nothingRated}
          pending={pending}
          onChange={setTrip}
          onSubmit={submit}
        />
        {ready && (
          <p className={styles.summary}>
            {nothingRated ? (
              <>
                You haven&apos;t chosen any places yet. <Link href="/">Rate some places on Discover</Link> first.
              </>
            ) : (
              <>
                Planning with <strong>{musts}</strong> must-{musts === 1 ? "visit" : "visits"} and{" "}
                <strong>{others}</strong> other {others === 1 ? "place" : "places"} you&apos;re interested in.{" "}
                <Link href="/">Change on Discover</Link>
              </>
            )}
          </p>
        )}
      </section>

      <div aria-live="polite" aria-busy={pending}>
        {pending && <p className={styles.status}>Planning…</p>}
        {!pending && failed && (
          <div role="alert" className={styles.error}>
            <p>Something went wrong while planning. Your choices are safe.</p>
            <button type="button" onClick={submit}>
              Retry
            </button>
          </div>
        )}
        {!pending && result?.status === "bad_request" && (
          <p role="alert" className={styles.error}>
            {result.message}
          </p>
        )}
        {!pending && result?.status === "infeasible" && (
          <ConflictList conflicts={result.conflicts} placeById={placeById} />
        )}
        {!pending && result?.status === "ok" && (
          <OptionTabs options={result.options} placeById={placeById} prefs={prefs.places} />
        )}
      </div>
    </div>
  );
}
