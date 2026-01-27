import type { AdminUser, AdminUserId } from "@/domain/auth/admin-user";

export type { AdminUser, AdminUserId };

export type TokenPayload = {
  userId: AdminUserId;
  username: string;
};

export type JwtService = {
  sign: (payload: TokenPayload) => Promise<string>;
  verify: (token: string) => Promise<TokenPayload | null>;
};

export type PasswordService = {
  hash: (password: string) => Promise<string>;
  verify: (password: string, hash: string) => Promise<boolean>;
};

export type AdminAuthRepository = {
  findByUsername: (username: string) => Promise<AdminUser | null>;
  create: (user: AdminUser) => Promise<void>;
};
