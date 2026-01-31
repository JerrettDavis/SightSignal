import path from "node:path";
import type {
  CredentialsRepository,
  UserCredentials,
} from "@/domain/auth/auth";
import type { UserId } from "@/domain/users/user";
import {
  readCollection,
  writeCollection,
  getDataDir,
} from "@/adapters/repositories/file-store";

const getFilePath = () => path.join(getDataDir(), "credentials.json");

export class FileCredentialsRepository implements CredentialsRepository {
  private filePath: string;

  constructor() {
    this.filePath = getFilePath();
  }

  async create(credentials: UserCredentials): Promise<void> {
    const data = await readCollection<UserCredentials>(this.filePath, []);
    data.push(credentials);
    await writeCollection(this.filePath, data);
  }

  async getByEmail(email: string): Promise<UserCredentials | null> {
    const data = await readCollection<UserCredentials>(this.filePath, []);
    return (
      data.find((creds) => creds.email.toLowerCase() === email.toLowerCase()) ||
      null
    );
  }

  async getByUserId(userId: UserId): Promise<UserCredentials | null> {
    const data = await readCollection<UserCredentials>(this.filePath, []);
    return data.find((creds) => creds.id === userId) || null;
  }

  async update(credentials: UserCredentials): Promise<void> {
    const data = await readCollection<UserCredentials>(this.filePath, []);
    const index = data.findIndex((c) => c.id === credentials.id);
    if (index !== -1) {
      data[index] = credentials;
      await writeCollection(this.filePath, data);
    }
  }

  async delete(userId: UserId): Promise<void> {
    const data = await readCollection<UserCredentials>(this.filePath, []);
    const filtered = data.filter((c) => c.id !== userId);
    await writeCollection(this.filePath, filtered);
  }
}
