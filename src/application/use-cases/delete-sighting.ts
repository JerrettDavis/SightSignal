import type { SightingId } from "@/domain/sightings/sighting";
import type { SightingRepository } from "@/ports/sighting-repository";
import { err, ok, type DomainError, type Result } from "@/shared/result";

export type DeleteSighting = (id: string) => Promise<Result<void, DomainError>>;

type Dependencies = {
  repository: SightingRepository;
};

export const buildDeleteSighting = ({
  repository,
}: Dependencies): DeleteSighting => {
  return async (id) => {
    const existing = await repository.getById(id as SightingId);

    if (!existing) {
      return err({
        code: "sighting.not_found",
        message: "Sighting not found.",
      });
    }

    await repository.delete(id as SightingId);
    return ok(undefined);
  };
};
