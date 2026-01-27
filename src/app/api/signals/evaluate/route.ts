import { getSignalRepository } from "@/adapters/repositories/repository-factory";
import { getSightingRepository } from "@/adapters/repositories/repository-factory";
import {
  matchesConditions,
  shouldTrigger,
  type SightingMatchData,
} from "@/domain/signals/signal";
import { getReputationTier } from "@/domain/reputation/reputation";
import { jsonBadRequest, jsonOk } from "@/shared/http";
import type { Sighting, SightingId } from "@/domain/sightings/sighting";
import type { SignalId } from "@/domain/signals/signal";
import { z } from "zod";

export const runtime = "nodejs";

const signalRepository = getSignalRepository();
const sightingRepository = getSightingRepository();

const EvaluateAllSignalsRequestSchema = z.object({
  sightingId: z.string(),
  triggerType: z.enum([
    "new_sighting",
    "sighting_confirmed",
    "sighting_disputed",
    "score_threshold",
  ]),
});

// Helper to convert sighting to match data
const toMatchData = (sighting: Sighting): SightingMatchData => {
  return {
    categoryId: sighting.categoryId,
    typeId: sighting.typeId,
    tags: [], // TODO: Add tags when sighting model includes them
    importance: sighting.importance,
    score: sighting.score || 0,
    reporterTrustLevel: sighting.reporterId
      ? getReputationTier(0)
      : "unverified", // TODO: Get actual reputation
  };
};

/**
 * Evaluate all signals for a given sighting
 * This endpoint is typically called internally when:
 * - A new sighting is created
 * - A sighting is confirmed/disputed
 * - A sighting's score changes
 */
export const POST = async (request: Request) => {
  // This is an internal endpoint, but we still validate the request
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonBadRequest({ message: "Invalid JSON payload." });
  }

  const parsed = EvaluateAllSignalsRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonBadRequest({
      message: "Invalid payload.",
      details: parsed.error.flatten(),
    });
  }

  const { sightingId, triggerType } = parsed.data;

  // Get the sighting
  const sighting = await sightingRepository.getById(sightingId as SightingId);
  if (!sighting) {
    return jsonBadRequest({ message: "Sighting not found." });
  }

  // Get all active signals
  const allSignals = await signalRepository.list({ isActive: true });

  // Filter signals that:
  // 1. Have the matching trigger type
  // 2. Match the sighting conditions
  const matchData = toMatchData(sighting);
  const matchedSignals: SignalId[] = [];

  for (const signal of allSignals) {
    // Check if this trigger type is enabled for the signal
    if (!shouldTrigger(signal, triggerType)) {
      continue;
    }

    // Check if sighting matches signal conditions
    if (matchesConditions(signal.conditions, matchData)) {
      matchedSignals.push(signal.id);
    }
  }

  // TODO: In a real implementation, this would:
  // 1. Queue notification jobs for each matched signal
  // 2. Fetch subscribers for each signal
  // 3. Send notifications via configured delivery methods

  return jsonOk({
    data: {
      sightingId,
      triggerType,
      matchedSignals: matchedSignals.length,
      signalIds: matchedSignals,
      message: `Matched ${matchedSignals.length} signal(s). Notifications would be queued here.`,
    },
  });
};
