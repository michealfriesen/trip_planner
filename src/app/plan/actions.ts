"use server";

import { PLANNER_CONFIG } from "@/lib/config";
import { getDataset } from "@/lib/data/getDataset";
import { plan } from "@/lib/planner/plan";
import type { PlanResult } from "@/lib/planner/types";
import { validateRequest } from "@/lib/planner/validateRequest";

/**
 * The Plan action. Every expected outcome is returned, not thrown, because Next.js hides the message of a
 * thrown action error in production.
 */
export async function generatePlan(input: unknown): Promise<PlanResult> {
  const request = validateRequest(input);
  if ("error" in request) return { status: "bad_request", message: request.error };

  const { dataset, source } = await getDataset();
  const outcome = plan(dataset.places, request, PLANNER_CONFIG);
  return outcome.status === "ok" ? { ...outcome, source } : outcome;
}
