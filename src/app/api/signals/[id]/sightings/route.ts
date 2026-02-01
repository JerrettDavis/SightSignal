/**
 * GET /api/signals/[id]/sightings
 *
 * Get all sightings in a signal (like viewing posts in a subreddit).
 */

import { NextRequest } from "next/server";
import { jsonOk, jsonNotFound, jsonServerError } from "@/shared/http";
import { getSignalRepository } from "@/adapters/repositories/repository-factory";
import { getSql } from "@/adapters/repositories/postgres/client";
import type { SignalId } from "@/domain/signals/signal";
import type { SightingId } from "@/domain/sightings/sighting";

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

    const sql = getSql();

    console.log(
      `[Signal Sightings] Fetching sightings for signal ${signalId} (limit: ${limit}, offset: ${offset})`
    );

    // Fetch sightings with a single JOIN query instead of N+1 queries
    const sightingsData = await sql<
      Array<{
        id: string;
        type_id: string;
        category_id: string;
        location: { lat: number; lng: number };
        description: string;
        details: string | null;
        importance: string;
        status: string;
        observed_at: Date;
        created_at: Date;
        fields: Record<string, unknown>;
        reporter_id: string | null;
        upvotes: number;
        downvotes: number;
        confirmations: number;
        disputes: number;
        spam_reports: number;
        score: number;
        hot_score: number;
      }>
    >`
      SELECT s.*
      FROM sightings s
      INNER JOIN signal_sightings ss ON s.id = ss.sighting_id
      WHERE ss.signal_id = ${signalId}
      ORDER BY 
        ss.is_pinned DESC,
        COALESCE(ss.pin_order, 999999) ASC,
        ss.added_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Map to domain model (using type assertions for branded types)
    const sightings = sightingsData.map((row) => ({
      id: row.id as SightingId,
      typeId: row.type_id as string & { readonly __brand: "SightingTypeId" },
      categoryId: row.category_id as string & {
        readonly __brand: "CategoryId";
      },
      location: row.location,
      description: row.description,
      details: row.details || undefined,
      importance: row.importance as "low" | "normal" | "high" | "critical",
      status:
        row.status === "archived"
          ? "resolved"
          : (row.status as "active" | "resolved"),
      observedAt: row.observed_at.toISOString(),
      createdAt: row.created_at.toISOString(),
      fields: row.fields,
      reporterId: row.reporter_id || undefined,
      upvotes: row.upvotes,
      downvotes: row.downvotes,
      confirmations: row.confirmations,
      disputes: row.disputes,
      spamReports: row.spam_reports,
      score: row.score,
      hotScore: row.hot_score,
    }));

    // Get total count
    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count
      FROM signal_sightings
      WHERE signal_id = ${signalId}
    `;
    const total = parseInt(countResult[0].count, 10);

    console.log(
      `[Signal Sightings] Fetched ${sightings.length} sightings for signal ${signalId} (total: ${total})`
    );

    return jsonOk({
      data: {
        sightings,
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
