import path from "node:path";
import type { User, UserId } from "@/domain/users/user";
import type { UserRepository, UserListFilters } from "@/ports/user-repository";
import {
  readCollection,
  writeCollection,
  getDataDir,
} from "@/adapters/repositories/file-store";

const getFilePath = () => path.join(getDataDir(), "users.json");

export const fileUserRepository = (): UserRepository => {
  const filePath = getFilePath();

  return {
    async getById(id: UserId): Promise<User | null> {
      const data = await readCollection<User>(filePath, []);
      return data.find((user) => user.id === id) || null;
    },

    async getByEmail(email: string): Promise<User | null> {
      const data = await readCollection<User>(filePath, []);
      return (
        data.find((user) => user.email.toLowerCase() === email.toLowerCase()) ||
        null
      );
    },

    async list(filters?: UserListFilters): Promise<User[]> {
      let users = await readCollection<User>(filePath, []);

      if (filters) {
        // Filter by role
        if (filters.role) {
          users = users.filter((u) => u.role === filters.role);
        }

        // Filter by status
        if (filters.status) {
          users = users.filter((u) => u.status === filters.status);
        }

        // Search by email or username
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          users = users.filter(
            (u) =>
              u.email.toLowerCase().includes(searchLower) ||
              u.username?.toLowerCase().includes(searchLower)
          );
        }
      }

      // Sort by creation date (newest first)
      return users.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },

    async create(user: User): Promise<void> {
      const data = await readCollection<User>(filePath, []);
      data.push(user);
      await writeCollection(filePath, data);
    },

    async update(user: User): Promise<void> {
      const data = await readCollection<User>(filePath, []);
      const index = data.findIndex((u) => u.id === user.id);
      if (index !== -1) {
        data[index] = user;
        await writeCollection(filePath, data);
      }
    },

    async delete(id: UserId): Promise<void> {
      const data = await readCollection<User>(filePath, []);
      const filtered = data.filter((u) => u.id !== id);
      await writeCollection(filePath, filtered);
    },

    async deleteMany(ids: UserId[]): Promise<void> {
      const data = await readCollection<User>(filePath, []);
      const filtered = data.filter((u) => !ids.includes(u.id));
      await writeCollection(filePath, filtered);
    },

    async count(filters?: UserListFilters): Promise<number> {
      const users = await this.list(filters);
      return users.length;
    },
  };
};
