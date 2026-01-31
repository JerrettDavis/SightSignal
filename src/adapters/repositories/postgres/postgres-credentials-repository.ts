import type {
  CredentialsRepository,
  UserCredentials,
} from "@/domain/auth/auth";
import type { UserId } from "@/domain/users/user";
import type { Sql } from "postgres";

type DbCredentials = {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
};

const fromDb = (row: DbCredentials): UserCredentials => ({
  id: row.id as UserId,
  email: row.email,
  passwordHash: row.password_hash,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export const buildPostgresCredentialsRepository = (
  sql: Sql
): CredentialsRepository => {
  return {
    async create(credentials: UserCredentials): Promise<void> {
      await sql`
        INSERT INTO user_credentials (id, email, password_hash, created_at, updated_at)
        VALUES (
          ${credentials.id},
          ${credentials.email},
          ${credentials.passwordHash},
          ${credentials.createdAt},
          ${credentials.updatedAt}
        )
      `;
    },

    async getByEmail(email: string): Promise<UserCredentials | null> {
      const rows = await sql<DbCredentials[]>`
        SELECT * FROM user_credentials WHERE LOWER(email) = LOWER(${email})
      `;
      return rows.length > 0 ? fromDb(rows[0]) : null;
    },

    async getByUserId(userId: UserId): Promise<UserCredentials | null> {
      const rows = await sql<DbCredentials[]>`
        SELECT * FROM user_credentials WHERE id = ${userId}
      `;
      return rows.length > 0 ? fromDb(rows[0]) : null;
    },

    async update(credentials: UserCredentials): Promise<void> {
      await sql`
        UPDATE user_credentials
        SET
          email = ${credentials.email},
          password_hash = ${credentials.passwordHash},
          updated_at = ${credentials.updatedAt}
        WHERE id = ${credentials.id}
      `;
    },

    async delete(userId: UserId): Promise<void> {
      await sql`DELETE FROM user_credentials WHERE id = ${userId}`;
    },
  };
};
