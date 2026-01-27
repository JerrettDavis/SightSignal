import { err, ok, type DomainError, type Result } from "@/shared/result";
import type { SightingId } from "./sighting";
import type { UserId } from "../reputation/reputation";

export type SightingReactionType =
  | "upvote"
  | "downvote"
  | "confirmed"
  | "disputed"
  | "spam";

export type SightingReaction = {
  sightingId: SightingId;
  userId: UserId;
  type: SightingReactionType;
  createdAt: string;
};

export type NewSightingReaction = {
  sightingId: SightingId;
  userId: UserId;
  type: SightingReactionType;
};

export type SightingReactionCounts = {
  upvotes: number;
  downvotes: number;
  confirmations: number;
  disputes: number;
  spamReports: number;
};

// Create a new reaction
export const createSightingReaction = (
  input: NewSightingReaction,
  context: { createdAt: string }
): SightingReaction => {
  return {
    ...input,
    createdAt: context.createdAt,
  };
};

// Calculate base score from reaction counts
export const calculateBaseScore = (counts: SightingReactionCounts): number => {
  return (
    counts.upvotes -
    counts.downvotes +
    counts.confirmations * 2 -
    counts.disputes * 2 -
    counts.spamReports * 5
  );
};

// Calculate hot score with time decay (Reddit algorithm)
export const calculateHotScore = (
  baseScore: number,
  ageInHours: number
): number => {
  // Prevent negative hot scores from dominating
  const sign = baseScore >= 0 ? 1 : -1;
  const order = Math.log10(Math.max(Math.abs(baseScore), 1));

  // Time decay factor: (hours + 2)^1.5
  const decay = Math.pow(ageInHours + 2, 1.5);

  return (sign * order) / decay;
};

// Get age in hours from ISO timestamp
export const getAgeInHours = (createdAt: string): number => {
  const now = Date.now();
  const created = Date.parse(createdAt);
  return (now - created) / (1000 * 60 * 60);
};

// Determine visibility based on score
export type SightingVisibility = "visible" | "low_quality" | "hidden";

export const getSightingVisibility = (
  score: number,
  spamReports: number
): SightingVisibility => {
  // Auto-hide if 3+ spam reports pending review
  if (spamReports >= 3) return "hidden";

  // Hide very low quality content
  if (score <= -5) return "hidden";

  // Low quality warning
  if (score < 0) return "low_quality";

  return "visible";
};

// Validate reaction type
export const validateReactionType = (
  type: string
): Result<SightingReactionType, DomainError> => {
  const validTypes: SightingReactionType[] = [
    "upvote",
    "downvote",
    "confirmed",
    "disputed",
    "spam",
  ];

  if (!validTypes.includes(type as SightingReactionType)) {
    return err({
      code: "reaction.invalid_type",
      message: `Invalid reaction type. Must be one of: ${validTypes.join(", ")}`,
      field: "type",
    });
  }

  return ok(type as SightingReactionType);
};

// Check if user can react
export const canUserReact = (
  userId: UserId,
  reporterId?: string
): Result<void, DomainError> => {
  // Can't react to own sightings
  if (reporterId === userId) {
    return err({
      code: "reaction.cannot_react_to_own",
      message: "Cannot react to your own sighting",
    });
  }

  return ok(undefined);
};

// Get empty counts
export const emptyReactionCounts = (): SightingReactionCounts => ({
  upvotes: 0,
  downvotes: 0,
  confirmations: 0,
  disputes: 0,
  spamReports: 0,
});
