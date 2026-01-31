/**
 * GET /api/sightings/[id]/signals
 *
 * Get all signals a sighting belongs to.
 */

import { NextRequest } from "next/server";
import { jsonOk, jsonNotFound, jsonServerError } from "@/shared/http";
import {
  getSignalRepository,
  getSightingRepository,
} from "@/adapters/repositories/repository-factory";
import { buildSignalSightingRepository } from "@/adapters/repositories/postgres/postgres-signal-sighting-repository";
import { getSql } from "@/adapters/repositories/postgres/client";
import type { SightingId } from "@/domain/sightings/sighting";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: sightingId } = await params;

    const sightingRepo = getSightingRepository();
    const sighting = await sightingRepo.getById(sightingId as SightingId);

    if (!sighting) {
      return jsonNotFound("Sighting not found");
    }

    const sql = getSql();
    const signalSightingRepo = buildSignalSightingRepository(sql);
    const signalIds = await signalSightingRepo.getSignalsBySighting(
      sightingId as SightingId
    );

    const signalRepo = getSignalRepository();
    const signals = await Promise.all(
      signalIds.map((id) => signalRepo.getById(id))
    );

    const validSignals = signals.filter((s) => s !== null);

    return jsonOk({
      data: {
        signals: validSignals.map((signal) => ({
          id: signal.id,
          name: signal.name,
          description: signal.description,
        })),
      },
    });
  } catch (error) {
    console.error("[Sighting Signals] Error:", error);
    return jsonServerError("Failed to fetch signals");
  }
}
