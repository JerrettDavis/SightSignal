import type { Passkey, PasskeyId, NewPasskey } from "@/domain/auth/passkey";
import type { UserId } from "@/domain/users/user";
import type { PasskeyRepository } from "@/ports/passkey-repository";
import type { Sql } from "postgres";

type DbPasskey = {
  id: string;
  user_id: string;
  credential_public_key: Buffer;
  counter: string; // bigint comes as string
  transports: string[];
  backup_eligible: boolean;
  backup_state: boolean;
  name: string | null;
  created_at: Date;
  last_used_at: Date | null;
};

const fromDb = (row: DbPasskey): Passkey => ({
  id: row.id as PasskeyId,
  userId: row.user_id as UserId,
  credentialPublicKey: new Uint8Array(row.credential_public_key),
  counter: parseInt(row.counter, 10),
  transports: row.transports,
  backupEligible: row.backup_eligible,
  backupState: row.backup_state,
  name: row.name || undefined,
  createdAt: row.created_at.toISOString(),
  lastUsedAt: row.last_used_at?.toISOString(),
});

export const buildPostgresPasskeyRepository = (sql: Sql): PasskeyRepository => {
  return {
    async create(passkey: NewPasskey): Promise<void> {
      await sql`
        INSERT INTO passkeys (
          id, user_id, credential_public_key, counter, transports,
          backup_eligible, backup_state, name, created_at
        )
        VALUES (
          ${passkey.id},
          ${passkey.userId},
          ${Buffer.from(passkey.credentialPublicKey)},
          ${passkey.counter},
          ${passkey.transports},
          ${passkey.backupEligible},
          ${passkey.backupState},
          ${passkey.name || null},
          NOW()
        )
      `;
    },

    async getById(id: PasskeyId): Promise<Passkey | null> {
      const rows = await sql<DbPasskey[]>`
        SELECT * FROM passkeys WHERE id = ${id}
      `;
      return rows.length > 0 ? fromDb(rows[0]) : null;
    },

    async listByUserId(userId: UserId): Promise<Passkey[]> {
      const rows = await sql<DbPasskey[]>`
        SELECT * FROM passkeys WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
      return rows.map(fromDb);
    },

    async updateCounter(id: PasskeyId, counter: number): Promise<void> {
      await sql`
        UPDATE passkeys
        SET counter = ${counter}
        WHERE id = ${id}
      `;
    },

    async updateLastUsed(id: PasskeyId, lastUsedAt: string): Promise<void> {
      await sql`
        UPDATE passkeys
        SET last_used_at = ${lastUsedAt}
        WHERE id = ${id}
      `;
    },

    async delete(id: PasskeyId): Promise<void> {
      await sql`DELETE FROM passkeys WHERE id = ${id}`;
    },

    async deleteByUserId(userId: UserId): Promise<void> {
      await sql`DELETE FROM passkeys WHERE user_id = ${userId}`;
    },
  };
};
