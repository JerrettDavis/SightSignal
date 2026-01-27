import type { Result, DomainError } from "@/shared/result";
import { ok, err } from "@/shared/result";
import type { SightingRepository } from "@/ports/sighting-repository";
import type { SightingReactionRepository } from "@/ports/sighting-reaction-repository";
import type { ReputationRepository } from "@/ports/reputation-repository";
import type { SightingId } from "@/domain/sightings/sighting";
import type { UserId } from "@/domain/reputation/reputation";
import type { SightingReactionType } from "@/domain/sightings/sighting-reaction";
import {
  createSightingReaction,
  calculateBaseScore,
  calculateHotScore,
  getAgeInHours,
  canUserReact,
  validateReactionType,
} from "@/domain/sightings/sighting-reaction";
import { buildAddReputationEvent } from "../reputation/add-reputation-event";

export type AddSightingReaction = (
  sightingId: string,
  userId: string,
  type: string
) => Promise<Result<void, DomainError>>;

type Dependencies = {
  sightingRepository: SightingRepository;
  reactionRepository: SightingReactionRepository;
  reputationRepository: ReputationRepository;
};

export const buildAddSightingReaction = ({
  sightingRepository,
  reactionRepository,
  reputationRepository,
}: Dependencies): AddSightingReaction => {
  return async (sightingId, userId, type) => {
    // Validate reaction type
    const typeValidation = validateReactionType(type);
    if (!typeValidation.ok) {
      return typeValidation;
    }

    const reactionType = typeValidation.value;

    // Get sighting
    const sighting = await sightingRepository.getById(sightingId as SightingId);
    if (!sighting) {
      return err({
        code: "sighting.not_found",
        message: "Sighting not found",
      });
    }

    // Check if user can react
    const canReact = canUserReact(userId as UserId, sighting.reporterId);
    if (!canReact.ok) {
      return canReact;
    }

    // Create and save reaction
    const reaction = createSightingReaction(
      {
        sightingId: sightingId as SightingId,
        userId: userId as UserId,
        type: reactionType,
      },
      { createdAt: new Date().toISOString() }
    );

    await reactionRepository.add(reaction);

    // Recalculate scores
    const counts = await reactionRepository.getCounts(sightingId as SightingId);
    const baseScore = calculateBaseScore(counts);
    const ageInHours = getAgeInHours(sighting.createdAt);
    const hotScore = calculateHotScore(baseScore, ageInHours);

    // Update sighting with new scores
    const updatedSighting = {
      ...sighting,
      upvotes: counts.upvotes,
      downvotes: counts.downvotes,
      confirmations: counts.confirmations,
      disputes: counts.disputes,
      spamReports: counts.spamReports,
      score: baseScore,
      hotScore,
    };

    await sightingRepository.update(updatedSighting);

    // Update sighting creator's reputation (if applicable)
    if (sighting.reporterId) {
      const addReputationEvent = buildAddReputationEvent({
        repository: reputationRepository,
      });

      if (reactionType === "upvote") {
        await addReputationEvent(
          sighting.reporterId,
          "sighting_upvoted",
          sightingId
        );
      } else if (reactionType === "confirmed") {
        await addReputationEvent(
          sighting.reporterId,
          "sighting_confirmed",
          sightingId
        );
      } else if (reactionType === "disputed") {
        await addReputationEvent(
          sighting.reporterId,
          "sighting_disputed",
          sightingId
        );
      }
    }

    return ok(undefined);
  };
};
