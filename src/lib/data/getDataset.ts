import "server-only";
import snapshot from "@/data/italy.snapshot.json";
import { DATA_URL, REVALIDATE_SECONDS } from "@/lib/config";
import { normalize } from "@/lib/data/normalize";
import type { Dataset } from "@/lib/types";

/** When src/data/italy.snapshot.json was copied from the live source (its response Date header). */
const SNAPSHOT_FETCHED_AT = "2026-11-07T04:45:31.000Z";

export interface DatasetResult {
  dataset: Dataset;
  source: "live" | "snapshot";
}

async function fetchLive(): Promise<{ json: unknown; fetchedAt: string }> {
  const res = await fetch(DATA_URL, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`Place data request failed with HTTP ${res.status}`);
  const json: unknown = await res.json();
  if (!Array.isArray(json)) throw new Error("Place data is not a JSON array");
  const date = res.headers.get("date");
  const fetchedAt = date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : new Date().toISOString();
  return { json, fetchedAt };
}

export async function getDataset(): Promise<DatasetResult> {
  try {
    const { json, fetchedAt } = await fetchLive();
    return { dataset: normalize(json, fetchedAt), source: "live" };
  } catch (error) {
    console.error("[data] live fetch failed; using snapshot", error);
    return { dataset: normalize(snapshot, SNAPSHOT_FETCHED_AT), source: "snapshot" };
  }
}
