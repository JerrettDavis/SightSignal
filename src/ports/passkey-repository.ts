import type { Passkey, PasskeyId, NewPasskey } from "@/domain/auth/passkey";
import type { UserId } from "@/domain/users/user";

export interface PasskeyRepository {
  create(passkey: NewPasskey): Promise<void>;
  getById(id: PasskeyId): Promise<Passkey | null>;
  listByUserId(userId: UserId): Promise<Passkey[]>;
  updateCounter(id: PasskeyId, counter: number): Promise<void>;
  updateLastUsed(id: PasskeyId, lastUsedAt: string): Promise<void>;
  delete(id: PasskeyId): Promise<void>;
  deleteByUserId(userId: UserId): Promise<void>;
}
