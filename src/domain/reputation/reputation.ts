import { err, ok, type DomainError, type Result } from "@/shared/result";

export type UserId = string & { readonly __brand: "UserId" };
export type ReputationEventId = string & {
  readonly __brand: "ReputationEventId";
};

export type ReputationReason =
  | "sighting_created"
  | "sighting_upvoted"
  | "sighting_confirmed"
  | "sighting_disputed"
  | "signal_created"
  | "signal_subscribed"
  | "signal_verified"
  | "report_upheld";

export type UserReputation = {
  userId: UserId;
  score: number;
  createdAt: string;
  updatedAt: string;
};

export type ReputationEvent = {
  id: ReputationEventId;
  userId: UserId;
  amount: number;
  reason: ReputationReason;
  referenceId?: string;
  createdAt: string;
};

export type NewReputationEvent = {
  userId: UserId;
  reason: ReputationReason;
  referenceId?: string;
};

// Reputation amounts for each action
export const REPUTATION_AMOUNTS: Record<ReputationReason, number> = {
  sighting_created: 1,
  sighting_upvoted: 1,
  sighting_confirmed: 2,
  sighting_disputed: -1,
  signal_created: 5,
  signal_subscribed: 2,
  signal_verified: 50,
  report_upheld: -10,
};

// Reputation tiers
export type ReputationTier = "unverified" | "new" | "trusted" | "verified";

export const getReputationTier = (
  score: number,
  isVerified: boolean = false
): ReputationTier => {
  if (isVerified) return "verified";
  if (score >= 50) return "trusted";
  if (score >= 10) return "new";
  return "unverified";
};

export const getTierLabel = (tier: ReputationTier): string => {
  switch (tier) {
    case "verified":
      return "✓ Verified";
    case "trusted":
      return "★ Trusted";
    case "new":
      return "⭐ New";
    case "unverified":
      return "Unverified";
  }
};

export const getTierDescription = (tier: ReputationTier): string => {
  switch (tier) {
    case "verified":
      return "Admin-vetted trusted contributor";
    case "trusted":
      return "High reputation member (50+ points)";
    case "new":
      return "Establishing reputation (10-49 points)";
    case "unverified":
      return "New member (< 10 points)";
  }
};

// Create a new user reputation
export const createUserReputation = (
  userId: UserId,
  context: { createdAt: string }
): UserReputation => {
  return {
    userId,
    score: 0,
    createdAt: context.createdAt,
    updatedAt: context.createdAt,
  };
};

// Create a reputation event
export const createReputationEvent = (
  input: NewReputationEvent,
  context: { id: ReputationEventId; createdAt: string }
): ReputationEvent => {
  const amount = REPUTATION_AMOUNTS[input.reason];

  return {
    id: context.id,
    userId: input.userId,
    amount,
    reason: input.reason,
    referenceId: input.referenceId,
    createdAt: context.createdAt,
  };
};

// Apply a reputation event to user reputation
export const applyReputationEvent = (
  reputation: UserReputation,
  event: ReputationEvent
): UserReputation => {
  // Never let reputation go below 0
  const newScore = Math.max(0, reputation.score + event.amount);

  return {
    ...reputation,
    score: newScore,
    updatedAt: event.createdAt,
  };
};

// Validate user ID
export const validateUserId = (id: string): Result<UserId, DomainError> => {
  if (!id || id.trim().length === 0) {
    return err({
      code: "reputation.invalid_user_id",
      message: "User ID is required",
    });
  }

  return ok(id as UserId);
};
