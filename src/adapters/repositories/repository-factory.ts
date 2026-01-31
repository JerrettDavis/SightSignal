import { inMemorySightingRepository } from "@/adapters/repositories/in-memory-sighting-repository";
import { inMemoryGeofenceRepository } from "@/adapters/repositories/in-memory-geofence-repository";
import { inMemorySubscriptionRepository } from "@/adapters/repositories/in-memory-subscription-repository";
import { InMemoryCommentRepository } from "@/adapters/repositories/in-memory-comment-repository";
import { InMemoryCredentialsRepository } from "@/adapters/repositories/in-memory-credentials-repository";
import { InMemoryMagicLinkRepository } from "@/adapters/repositories/in-memory-magic-link-repository";
import { InMemoryPushSubscriptionRepository } from "@/adapters/repositories/in-memory-push-subscription-repository";
import { fileSightingRepository } from "@/adapters/repositories/file-sighting-repository";
import { fileGeofenceRepository } from "@/adapters/repositories/file-geofence-repository";
import { fileSubscriptionRepository } from "@/adapters/repositories/file-subscription-repository";
import { fileUserRepository } from "@/adapters/repositories/file-user-repository";
import { FileCredentialsRepository } from "@/adapters/repositories/file-credentials-repository";
import { postgresSightingRepository } from "@/adapters/repositories/postgres/postgres-sighting-repository";
import { postgresGeofenceRepository } from "@/adapters/repositories/postgres/postgres-geofence-repository";
import { postgresSubscriptionRepository } from "@/adapters/repositories/postgres/postgres-subscription-repository";
import { postgresReputationRepository } from "@/adapters/repositories/postgres/postgres-reputation-repository";
import { postgresSightingReactionRepository } from "@/adapters/repositories/postgres/postgres-sighting-reaction-repository";
import { postgresTaxonomyRepository } from "@/adapters/repositories/postgres/postgres-taxonomy-repository";
import { buildPostgresCredentialsRepository } from "@/adapters/repositories/postgres/postgres-credentials-repository";
import { buildPostgresPasskeyRepository } from "@/adapters/repositories/postgres/postgres-passkey-repository";
import { inMemoryUserRepository } from "@/adapters/repositories/in-memory-user-repository";
import { buildPostgresUserRepository } from "@/adapters/repositories/postgres/postgres-user-repository";
import { inMemoryReputationRepository } from "@/adapters/repositories/in-memory-reputation-repository";
import { inMemorySightingReactionRepository } from "@/adapters/repositories/in-memory-sighting-reaction-repository";
import { inMemoryTaxonomyRepository } from "@/adapters/repositories/in-memory-taxonomy-repository";
import { inMemorySignalRepository } from "@/adapters/repositories/in-memory-signal-repository";
import { postgresSignalRepository } from "@/adapters/repositories/postgres/postgres-signal-repository";
import { getSql } from "@/adapters/repositories/postgres/client";

type StoreType = "memory" | "file" | "postgres";

const resolveStoreType = (): StoreType => {
  // Support both SIGNALFEED_ (new) and SIGHTSIGNAL_ (legacy) prefixes
  const fromEnv = (process.env.SIGNALFEED_DATA_STORE ||
    process.env.SIGHTSIGNAL_DATA_STORE) as StoreType | undefined;
  if (fromEnv === "memory" || fromEnv === "file" || fromEnv === "postgres") {
    return fromEnv;
  }
  return process.env.NODE_ENV === "production" ? "memory" : "file";
};

export const getSightingRepository = () => {
  const store = resolveStoreType();
  if (store === "file") {
    return fileSightingRepository();
  }
  if (store === "postgres") {
    return postgresSightingRepository();
  }
  return inMemorySightingRepository();
};

export const getGeofenceRepository = () => {
  const store = resolveStoreType();
  if (store === "file") {
    return fileGeofenceRepository();
  }
  if (store === "postgres") {
    return postgresGeofenceRepository();
  }
  return inMemoryGeofenceRepository();
};

export const getSubscriptionRepository = () => {
  const store = resolveStoreType();
  if (store === "file") {
    return fileSubscriptionRepository();
  }
  if (store === "postgres") {
    return postgresSubscriptionRepository();
  }
  return inMemorySubscriptionRepository();
};

export const getReputationRepository = () => {
  const store = resolveStoreType();
  if (store === "postgres") {
    return postgresReputationRepository(getSql());
  }
  return inMemoryReputationRepository();
};

export const getSightingReactionRepository = () => {
  const store = resolveStoreType();
  if (store === "postgres") {
    return postgresSightingReactionRepository(getSql());
  }
  return inMemorySightingReactionRepository();
};

export const getTaxonomyRepository = () => {
  const store = resolveStoreType();
  if (store === "postgres") {
    return postgresTaxonomyRepository(getSql());
  }
  return inMemoryTaxonomyRepository();
};

export const getUserRepository = () => {
  const store = resolveStoreType();
  if (store === "postgres") {
    return buildPostgresUserRepository(getSql());
  }
  if (store === "file") {
    return fileUserRepository();
  }
  return inMemoryUserRepository();
};

export const getSignalRepository = () => {
  const store = resolveStoreType();
  if (store === "postgres") {
    return postgresSignalRepository();
  }
  return inMemorySignalRepository();
};

// Comments are in-memory only for now
let commentRepositoryInstance: InMemoryCommentRepository | null = null;

export const getCommentRepository = () => {
  if (!commentRepositoryInstance) {
    commentRepositoryInstance = new InMemoryCommentRepository();
  }
  return commentRepositoryInstance;
};

// Credentials - now support file and postgres storage
let credentialsRepositoryInstance:
  | InMemoryCredentialsRepository
  | FileCredentialsRepository
  | ReturnType<typeof buildPostgresCredentialsRepository>
  | null = null;

export const getCredentialsRepository = () => {
  if (!credentialsRepositoryInstance) {
    const store = resolveStoreType();
    if (store === "postgres") {
      credentialsRepositoryInstance =
        buildPostgresCredentialsRepository(getSql());
    } else if (store === "file") {
      credentialsRepositoryInstance = new FileCredentialsRepository();
    } else {
      credentialsRepositoryInstance = new InMemoryCredentialsRepository();
    }
  }
  return credentialsRepositoryInstance;
};

// Magic links are in-memory only
let magicLinkRepositoryInstance: InMemoryMagicLinkRepository | null = null;

export const getMagicLinkRepository = () => {
  if (!magicLinkRepositoryInstance) {
    magicLinkRepositoryInstance = new InMemoryMagicLinkRepository();
  }
  return magicLinkRepositoryInstance;
};

// Push subscriptions are in-memory only
let pushSubscriptionRepositoryInstance: InMemoryPushSubscriptionRepository | null =
  null;

export const getPushSubscriptionRepository = () => {
  if (!pushSubscriptionRepositoryInstance) {
    pushSubscriptionRepositoryInstance =
      new InMemoryPushSubscriptionRepository();
  }
  return pushSubscriptionRepositoryInstance;
};

// Import new repositories
import { InMemoryUserSettingsRepository } from "./in-memory-user-settings-repository";
import { InMemoryLocationSharingRepository } from "./in-memory-location-sharing-repository";

// User settings are in-memory only
let userSettingsRepositoryInstance: InMemoryUserSettingsRepository | null =
  null;

export const getUserSettingsRepository = () => {
  if (!userSettingsRepositoryInstance) {
    userSettingsRepositoryInstance = new InMemoryUserSettingsRepository();
  }
  return userSettingsRepositoryInstance;
};

// Location sharing is in-memory only
let locationSharingRepositoryInstance: InMemoryLocationSharingRepository | null =
  null;

export const getLocationSharingRepository = () => {
  if (!locationSharingRepositoryInstance) {
    locationSharingRepositoryInstance = new InMemoryLocationSharingRepository();
  }
  return locationSharingRepositoryInstance;
};

// Passkeys - postgres only (WebAuthn requires persistent storage)
let passkeyRepositoryInstance: ReturnType<
  typeof buildPostgresPasskeyRepository
> | null = null;

export const getPasskeyRepository = () => {
  if (!passkeyRepositoryInstance) {
    const store = resolveStoreType();
    if (store !== "postgres") {
      throw new Error(
        "Passkeys require PostgreSQL storage. Set SIGNALFEED_DATA_STORE=postgres"
      );
    }
    passkeyRepositoryInstance = buildPostgresPasskeyRepository(getSql());
  }
  return passkeyRepositoryInstance;
};
