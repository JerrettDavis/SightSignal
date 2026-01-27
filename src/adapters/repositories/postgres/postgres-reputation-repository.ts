import postgres from "postgres";
import type { ReputationRepository } from "@/ports/reputation-repository";
import type {
  UserId,
  UserReputation,
  ReputationEvent,
  ReputationEventId,
} from "@/domain/reputation/reputation";

export const postgresReputationRepository = (
  sql: ReturnType<typeof postgres>
): ReputationRepository => {
  return {
    async getByUserId(userId: UserId): Promise<UserReputation | null> {
      const rows = await sql`
        SELECT user_id, score, created_at, updated_at
        FROM user_reputation
        WHERE user_id = ${userId}
      `;

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        userId: row.user_id as UserId,
        score: row.score,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      };
    },

    async create(reputation: UserReputation): Promise<void> {
      await sql`
        INSERT INTO user_reputation (user_id, score, created_at, updated_at)
        VALUES (
          ${reputation.userId},
          ${reputation.score},
          ${reputation.createdAt},
          ${reputation.updatedAt}
        )
      `;
    },

    async update(reputation: UserReputation): Promise<void> {
      await sql`
        UPDATE user_reputation
        SET score = ${reputation.score},
            updated_at = ${reputation.updatedAt}
        WHERE user_id = ${reputation.userId}
      `;
    },

    async addEvent(event: ReputationEvent): Promise<void> {
      await sql`
        INSERT INTO reputation_events (id, user_id, amount, reason, reference_id, created_at)
        VALUES (
          ${event.id},
          ${event.userId},
          ${event.amount},
          ${event.reason},
          ${event.referenceId ?? null},
          ${event.createdAt}
        )
      `;
    },

    async getEvents(
      userId: UserId,
      limit: number = 50
    ): Promise<ReputationEvent[]> {
      const rows = await sql`
        SELECT id, user_id, amount, reason, reference_id, created_at
        FROM reputation_events
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      return rows.map((row) => ({
        id: row.id as ReputationEventId,
        userId: row.user_id as UserId,
        amount: row.amount,
        reason: row.reason,
        referenceId: row.reference_id,
        createdAt: row.created_at.toISOString(),
      }));
    },

    async getTopUsers(limit: number): Promise<UserReputation[]> {
      const rows = await sql`
        SELECT user_id, score, created_at, updated_at
        FROM user_reputation
        ORDER BY score DESC, created_at ASC
        LIMIT ${limit}
      `;

      return rows.map((row) => ({
        userId: row.user_id as UserId,
        score: row.score,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      }));
    },
  };
};
