/**
 * GET /api/signals/[id]/sightings
 *
 * Get all sightings in a signal (like viewing posts in a subreddit).
 */

import { NextRequest } from "next/server";
import { jsonOk, jsonNotFound, jsonServerError } from "@/shared/http";
import {
  getSignalRepository,
  getSightingRepository,
} from "@/adapters/repositories/repository-factory";
import { buildSignalSightingRepository } from "@/adapters/repositories/postgres/postgres-signal-sighting-repository";
import { getSql } from "@/adapters/repositories/postgres/client";
import type { SignalId } from "@/domain/signals/signal";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: signalId } = await params;

    // Verify signal exists
    const signalRepo = getSignalRepository();
    const signal = await signalRepo.getById(signalId as SignalId);

    if (!signal) {
      return jsonNotFound("Signal not found");
    }

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Get sighting IDs in this signal
    const sql = getSql();
    const signalSightingRepo = buildSignalSightingRepository(sql);
    const sightingIds = await signalSightingRepo.getSightingsBySignal(
      signalId as SignalId,
      { limit, offset }
    );

    // Fetch full sighting data
    const sightingRepo = getSightingRepository();
    const sightings = await Promise.all(
      sightingIds.map((id) => sightingRepo.getById(id))
    );

    // Filter out any nulls (deleted sightings)
    const validSightings = sightings.filter((s) => s !== null);

    // Get total count
    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count
      FROM signal_sightings
      WHERE signal_id = ${signalId}
    `;
    const total = parseInt(countResult[0].count, 10);

    console.log(
      `[Signal Sightings] Fetched ${validSightings.length} sightings for signal ${signalId}`
    );

    return jsonOk({
      data: {
        sightings: validSightings,
        signal: {
          id: signal.id,
          name: signal.name,
          description: signal.description,
        },
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    console.error("[Signal Sightings] Error:", error);
    return jsonServerError("Failed to fetch sightings");
  }
}
