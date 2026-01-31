/**
 * POST /api/signals/[id]/sightings/[id]
 * DELETE /api/signals/[id]/sightings/[id]
 *
 * Add or remove a sighting from a signal.
 * URL: /api/signals/:signalId/sightings/:sightingId
 */

import { NextRequest } from "next/server";
import {
  jsonOk,
  jsonNotFound,
  jsonUnauthorized,
  jsonServerError,
} from "@/shared/http";
import {
  getSignalRepository,
  getSightingRepository,
} from "@/adapters/repositories/repository-factory";
import { buildSignalSightingRepository } from "@/adapters/repositories/postgres/postgres-signal-sighting-repository";
import { getSql } from "@/adapters/repositories/postgres/client";
import { cookies } from "next/headers";
import type { SignalId } from "@/domain/signals/signal";
import type { SightingId } from "@/domain/sightings/sighting";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>; // This is the sighting ID
}

export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: sightingId } = await context.params;

    // Get signal ID from URL path
    const signalId = request.nextUrl.pathname.split("/")[3]; // /api/signals/:signalId/sightings/:sightingId

    const cookieStore = await cookies();
    const sessionData = cookieStore.get("session_data");

    if (!sessionData) {
      return jsonUnauthorized("Must be logged in");
    }

    const session = JSON.parse(sessionData.value);

    const signalRepo = getSignalRepository();
    const signal = await signalRepo.getById(signalId as SignalId);

    if (!signal) {
      return jsonNotFound("Signal not found");
    }

    const sightingRepo = getSightingRepository();
    const sighting = await sightingRepo.getById(sightingId as SightingId);

    if (!sighting) {
      return jsonNotFound("Sighting not found");
    }

    const body = await request.json().catch(() => ({}));
    const isPinned = body.isPinned || false;

    const sql = getSql();
    const signalSightingRepo = buildSignalSightingRepository(sql);
    await signalSightingRepo.addSightingToSignal(
      signalId as SignalId,
      sightingId as SightingId,
      session.userId,
      isPinned
    );

    return jsonOk({
      data: {
        message: "Sighting added to signal",
        signalId,
        sightingId,
      },
    });
  } catch (error) {
    console.error("[Signal Sightings] Error adding:", error);
    return jsonServerError("Failed to add sighting");
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id: sightingId } = await context.params;
    const signalId = request.nextUrl.pathname.split("/")[3];

    const cookieStore = await cookies();
    const sessionData = cookieStore.get("session_data");

    if (!sessionData) {
      return jsonUnauthorized("Must be logged in");
    }

    const signalRepo = getSignalRepository();
    const signal = await signalRepo.getById(signalId as SignalId);

    if (!signal) {
      return jsonNotFound("Signal not found");
    }

    const sql = getSql();
    const signalSightingRepo = buildSignalSightingRepository(sql);
    await signalSightingRepo.removeSightingFromSignal(
      signalId as SignalId,
      sightingId as SightingId
    );

    return jsonOk({
      data: {
        message: "Sighting removed from signal",
      },
    });
  } catch (error) {
    console.error("[Signal Sightings] Error removing:", error);
    return jsonServerError("Failed to remove sighting");
  }
}
