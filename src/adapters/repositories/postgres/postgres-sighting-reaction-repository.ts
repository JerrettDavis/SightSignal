import postgres from "postgres";
import type { SightingReactionRepository } from "@/ports/sighting-reaction-repository";
import type { SightingId } from "@/domain/sightings/sighting";
import type { UserId } from "@/domain/reputation/reputation";
import type {
  SightingReaction,
  SightingReactionType,
  SightingReactionCounts,
} from "@/domain/sightings/sighting-reaction";
import { emptyReactionCounts } from "@/domain/sightings/sighting-reaction";

export const postgresSightingReactionRepository = (
  sql: ReturnType<typeof postgres>
): SightingReactionRepository => {
  return {
    async add(reaction: SightingReaction): Promise<void> {
      // Use ON CONFLICT to handle duplicate reactions (upsert)
      await sql`
        INSERT INTO sighting_reactions (sighting_id, user_id, type, created_at)
        VALUES (
          ${reaction.sightingId},
          ${reaction.userId},
          ${reaction.type},
          ${reaction.createdAt}
        )
        ON CONFLICT (sighting_id, user_id, type)
        DO UPDATE SET created_at = EXCLUDED.created_at
      `;
    },

    async remove(
      sightingId: SightingId,
      userId: UserId,
      type: SightingReactionType
    ): Promise<void> {
      await sql`
        DELETE FROM sighting_reactions
        WHERE sighting_id = ${sightingId}
          AND user_id = ${userId}
          AND type = ${type}
      `;
    },

    async getUserReaction(
      sightingId: SightingId,
      userId: UserId
    ): Promise<SightingReaction | null> {
      const rows = await sql`
        SELECT sighting_id, user_id, type, created_at
        FROM sighting_reactions
        WHERE sighting_id = ${sightingId}
          AND user_id = ${userId}
        LIMIT 1
      `;

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        sightingId: row.sighting_id as SightingId,
        userId: row.user_id as UserId,
        type: row.type as SightingReactionType,
        createdAt: row.created_at.toISOString(),
      };
    },

    async getCounts(sightingId: SightingId): Promise<SightingReactionCounts> {
      const rows = await sql`
        SELECT
          type,
          COUNT(*) as count
        FROM sighting_reactions
        WHERE sighting_id = ${sightingId}
        GROUP BY type
      `;

      const counts = emptyReactionCounts();

      rows.forEach((row) => {
        const type = row.type as SightingReactionType;
        const count = Number(row.count);

        switch (type) {
          case "upvote":
            counts.upvotes = count;
            break;
          case "downvote":
            counts.downvotes = count;
            break;
          case "confirmed":
            counts.confirmations = count;
            break;
          case "disputed":
            counts.disputes = count;
            break;
          case "spam":
            counts.spamReports = count;
            break;
        }
      });

      return counts;
    },

    async getReactionsForSighting(
      sightingId: SightingId
    ): Promise<SightingReaction[]> {
      const rows = await sql`
        SELECT sighting_id, user_id, type, created_at
        FROM sighting_reactions
        WHERE sighting_id = ${sightingId}
        ORDER BY created_at DESC
      `;

      return rows.map((row) => ({
        sightingId: row.sighting_id as SightingId,
        userId: row.user_id as UserId,
        type: row.type as SightingReactionType,
        createdAt: row.created_at.toISOString(),
      }));
    },

    async getUserReactions(
      userId: UserId,
      limit: number = 50
    ): Promise<SightingReaction[]> {
      const rows = await sql`
        SELECT sighting_id, user_id, type, created_at
        FROM sighting_reactions
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      return rows.map((row) => ({
        sightingId: row.sighting_id as SightingId,
        userId: row.user_id as UserId,
        type: row.type as SightingReactionType,
        createdAt: row.created_at.toISOString(),
      }));
    },
  };
};
