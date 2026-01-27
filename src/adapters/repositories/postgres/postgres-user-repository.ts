import type { User, UserId, UserRole, UserStatus } from "@/domain/users/user";
import type { UserRepository, UserListFilters } from "@/ports/user-repository";
import type { Sql } from "postgres";

type DbUser = {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
};

const fromDb = (row: DbUser): User => ({
  id: row.id as UserId,
  email: row.email,
  username: row.username || undefined,
  role: row.role,
  status: row.status,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export const buildPostgresUserRepository = (sql: Sql): UserRepository => {
  return {
    async getById(id: UserId): Promise<User | null> {
      const rows = await sql<DbUser[]>`
        SELECT * FROM users WHERE id = ${id}
      `;
      return rows.length > 0 ? fromDb(rows[0]) : null;
    },

    async getByEmail(email: string): Promise<User | null> {
      const rows = await sql<DbUser[]>`
        SELECT * FROM users WHERE LOWER(email) = LOWER(${email})
      `;
      return rows.length > 0 ? fromDb(rows[0]) : null;
    },

    async list(filters?: UserListFilters): Promise<User[]> {
      const conditions: string[] = [];
      const params: string[] = [];

      if (filters?.role) {
        conditions.push(`role = $${params.length + 1}`);
        params.push(filters.role);
      }

      if (filters?.status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
      }

      if (filters?.search) {
        conditions.push(
          `(LOWER(email) LIKE $${params.length + 1} OR LOWER(username) LIKE $${params.length + 1})`
        );
        params.push(`%${filters.search.toLowerCase()}%`);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const query = `SELECT * FROM users ${whereClause} ORDER BY created_at DESC`;

      const rows = await sql.unsafe<DbUser[]>(query, params);
      return rows.map(fromDb);
    },

    async create(user: User): Promise<void> {
      await sql`
        INSERT INTO users (id, email, username, role, status, created_at, updated_at)
        VALUES (
          ${user.id},
          ${user.email},
          ${user.username || null},
          ${user.role},
          ${user.status},
          ${user.createdAt},
          ${user.updatedAt}
        )
      `;
    },

    async update(user: User): Promise<void> {
      await sql`
        UPDATE users
        SET
          username = ${user.username || null},
          role = ${user.role},
          status = ${user.status},
          updated_at = ${user.updatedAt}
        WHERE id = ${user.id}
      `;
    },

    async delete(id: UserId): Promise<void> {
      await sql`DELETE FROM users WHERE id = ${id}`;
    },

    async deleteMany(ids: UserId[]): Promise<void> {
      if (ids.length === 0) return;
      await sql`DELETE FROM users WHERE id = ANY(${ids})`;
    },

    async count(filters?: UserListFilters): Promise<number> {
      const conditions: string[] = [];
      const params: string[] = [];

      if (filters?.role) {
        conditions.push(`role = $${params.length + 1}`);
        params.push(filters.role);
      }

      if (filters?.status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
      }

      if (filters?.search) {
        conditions.push(
          `(LOWER(email) LIKE $${params.length + 1} OR LOWER(username) LIKE $${params.length + 1})`
        );
        params.push(`%${filters.search.toLowerCase()}%`);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const query = `SELECT COUNT(*) as count FROM users ${whereClause}`;

      const rows = await sql.unsafe<{ count: string }[]>(query, params);
      return parseInt(rows[0].count, 10);
    },
  };
};
