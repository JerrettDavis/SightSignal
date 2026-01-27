import { getSignalRepository } from "@/adapters/repositories/repository-factory";
import { getSightingRepository } from "@/adapters/repositories/repository-factory";
import {
  matchesConditions,
  type SightingMatchData,
} from "@/domain/signals/signal";
import { getReputationTier } from "@/domain/reputation/reputation";
import {
  jsonBadRequest,
  jsonForbidden,
  jsonNotFound,
  jsonOk,
  jsonUnauthorized,
} from "@/shared/http";
import type { SignalId } from "@/domain/signals/signal";
import type { Sighting, SightingId } from "@/domain/sightings/sighting";
import { z } from "zod";

export const runtime = "nodejs";

const signalRepository = getSignalRepository();
const sightingRepository = getSightingRepository();

// Placeholder for auth - will be implemented later
const getUserIdFromSession = (): string | null => {
  // TODO: Implement proper auth
  return "placeholder-user-id";
};

const EvaluateSignalRequestSchema = z.object({
  sightingId: z.string().optional(),
});

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

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

export const POST = async (request: Request, context: RouteContext) => {
  const userId = getUserIdFromSession();
  if (!userId) {
    return jsonUnauthorized("Authentication required");
  }

  const params = await context.params;
  const signalId = params.id as SignalId;

  // Check if signal exists
  const signal = await signalRepository.getById(signalId);
  if (!signal) {
    return jsonNotFound("Signal not found.");
  }

  // Only signal owner can manually evaluate
  if (signal.ownerId !== userId) {
    return jsonForbidden("You do not have permission to evaluate this signal.");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonBadRequest({ message: "Invalid JSON payload." });
  }

  const parsed = EvaluateSignalRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonBadRequest({
      message: "Invalid payload.",
      details: parsed.error.flatten(),
    });
  }

  // If sightingId provided, evaluate that specific sighting
  if (parsed.data.sightingId) {
    const sighting = await sightingRepository.getById(
      parsed.data.sightingId as SightingId
    );
    if (!sighting) {
      return jsonNotFound("Sighting not found.");
    }

    const matchData = toMatchData(sighting);
    const matches = matchesConditions(signal.conditions, matchData);

    return jsonOk({
      data: {
        signalId: signal.id,
        sightingId: sighting.id,
        matches,
        matchData,
      },
    });
  }

  // Otherwise, evaluate all recent sightings (last 100)
  const allSightings = await sightingRepository.list({});
  const recentSightings = allSightings.slice(-100); // Get last 100

  const results = recentSightings.map((sighting) => {
    const matchData = toMatchData(sighting);
    const matches = matchesConditions(signal.conditions, matchData);
    return {
      sightingId: sighting.id,
      matches,
    };
  });

  const matchCount = results.filter((r) => r.matches).length;

  return jsonOk({
    data: {
      signalId: signal.id,
      evaluated: results.length,
      matched: matchCount,
      results: results.filter((r) => r.matches), // Only return matches
    },
  });
};
