import {
  updateSighting as updateSightingEntity,
  type Sighting,
  type SightingId,
  type UpdateSighting as UpdateSightingInput,
} from "@/domain/sightings/sighting";
import type { SightingRepository } from "@/ports/sighting-repository";
import { err, type DomainError, type Result } from "@/shared/result";

export type UpdateSighting = (
  id: string,
  updates: UpdateSightingInput
) => Promise<Result<Sighting, DomainError>>;

type Dependencies = {
  repository: SightingRepository;
};

export const buildUpdateSighting = ({
  repository,
}: Dependencies): UpdateSighting => {
  return async (id, updates) => {
    const existing = await repository.getById(id as SightingId);

    if (!existing) {
      return err({
        code: "sighting.not_found",
        message: "Sighting not found.",
      });
    }

    const updateResult = updateSightingEntity(existing, updates);

    if (!updateResult.ok) {
      return updateResult;
    }

    await repository.update(updateResult.value);
    return updateResult;
  };
};
