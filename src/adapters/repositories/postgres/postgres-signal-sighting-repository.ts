/**
 * Signal-Sighting Association Repository
 *
 * Manages the many-to-many relationship between signals and sightings.
 */

import type { Sql } from "postgres";
import type { SignalId } from "@/domain/signals/signal";
import type { SightingId } from "@/domain/sightings/sighting";

export interface SignalSightingAssociation {
  id: string;
  signalId: SignalId;
  sightingId: SightingId;
  addedAt: Date;
  addedBy?: string;
  isPinned: boolean;
  pinOrder?: number;
}

export interface SignalSightingRepository {
  addSightingToSignal(
    signalId: SignalId,
    sightingId: SightingId,
    addedBy?: string,
    isPinned?: boolean
  ): Promise<void>;

  removeSightingFromSignal(
    signalId: SignalId,
    sightingId: SightingId
  ): Promise<void>;

  getSightingsBySignal(
    signalId: SignalId,
    options?: {
      limit?: number;
      offset?: number;
      includePinned?: boolean;
    }
  ): Promise<SightingId[]>;

  getSignalsBySighting(sightingId: SightingId): Promise<SignalId[]>;

  isPinned(signalId: SignalId, sightingId: SightingId): Promise<boolean>;

  pinSighting(
    signalId: SignalId,
    sightingId: SightingId,
    pinOrder?: number
  ): Promise<void>;

  unpinSighting(signalId: SignalId, sightingId: SightingId): Promise<void>;
}

export const buildSignalSightingRepository = (
  sql: Sql
): SignalSightingRepository => {
  return {
    async addSightingToSignal(signalId, sightingId, addedBy, isPinned = false) {
      const id = `ss-${sightingId}-${signalId}`;

      await sql`
        INSERT INTO signal_sightings (id, signal_id, sighting_id, added_by, is_pinned)
        VALUES (${id}, ${signalId}, ${sightingId}, ${addedBy || null}, ${isPinned})
        ON CONFLICT (signal_id, sighting_id) DO NOTHING
      `;

      console.log(
        `[SignalSighting] Added sighting ${sightingId} to signal ${signalId}`
      );
    },

    async removeSightingFromSignal(signalId, sightingId) {
      await sql`
        DELETE FROM signal_sightings
        WHERE signal_id = ${signalId} AND sighting_id = ${sightingId}
      `;

      console.log(
        `[SignalSighting] Removed sighting ${sightingId} from signal ${signalId}`
      );
    },

    async getSightingsBySignal(signalId, options = {}) {
      const { limit = 50, offset = 0, includePinned = true } = options;

      // Query with pinned sightings first
      const rows = await sql<{ sighting_id: string }[]>`
        SELECT sighting_id
        FROM signal_sightings
        WHERE signal_id = ${signalId}
        ORDER BY 
          is_pinned DESC,
          COALESCE(pin_order, 999999) ASC,
          added_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      return rows.map((row) => row.sighting_id as SightingId);
    },

    async getSignalsBySighting(sightingId) {
      const rows = await sql<{ signal_id: string }[]>`
        SELECT signal_id
        FROM signal_sightings
        WHERE sighting_id = ${sightingId}
        ORDER BY added_at DESC
      `;

      return rows.map((row) => row.signal_id as SignalId);
    },

    async isPinned(signalId, sightingId) {
      const rows = await sql<{ is_pinned: boolean }[]>`
        SELECT is_pinned
        FROM signal_sightings
        WHERE signal_id = ${signalId} AND sighting_id = ${sightingId}
      `;

      return rows.length > 0 ? rows[0].is_pinned : false;
    },

    async pinSighting(signalId, sightingId, pinOrder) {
      await sql`
        UPDATE signal_sightings
        SET is_pinned = TRUE, pin_order = ${pinOrder || null}
        WHERE signal_id = ${signalId} AND sighting_id = ${sightingId}
      `;

      console.log(
        `[SignalSighting] Pinned sighting ${sightingId} in signal ${signalId}`
      );
    },

    async unpinSighting(signalId, sightingId) {
      await sql`
        UPDATE signal_sightings
        SET is_pinned = FALSE, pin_order = NULL
        WHERE signal_id = ${signalId} AND sighting_id = ${sightingId}
      `;

      console.log(
        `[SignalSighting] Unpinned sighting ${sightingId} in signal ${signalId}`
      );
    },
  };
};
