import type { SightingId } from "@/domain/sightings/sighting";
import type { UserId } from "@/domain/reputation/reputation";
import type {
  SightingReaction,
  SightingReactionType,
  SightingReactionCounts,
} from "@/domain/sightings/sighting-reaction";

export type SightingReactionRepository = {
  // Add/remove reactions
  add: (reaction: SightingReaction) => Promise<void>;
  remove: (
    sightingId: SightingId,
    userId: UserId,
    type: SightingReactionType
  ) => Promise<void>;

  // Query reactions
  getUserReaction: (
    sightingId: SightingId,
    userId: UserId
  ) => Promise<SightingReaction | null>;
  getCounts: (sightingId: SightingId) => Promise<SightingReactionCounts>;
  getReactionsForSighting: (
    sightingId: SightingId
  ) => Promise<SightingReaction[]>;

  // Get user's reactions
  getUserReactions: (
    userId: UserId,
    limit?: number
  ) => Promise<SightingReaction[]>;
};
