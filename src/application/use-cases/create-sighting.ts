import {
  createSighting as createSightingEntity,
  type NewSighting,
  type Sighting,
  type SightingId,
} from "@/domain/sightings/sighting";
import type { Clock } from "@/ports/clock";
import type { IdGenerator } from "@/ports/id-generator";
import type { SightingRepository } from "@/ports/sighting-repository";
import type { DomainError, Result } from "@/shared/result";

export type CreateSighting = (
  input: NewSighting
) => Promise<Result<Sighting, DomainError>>;

type Dependencies = {
  repository: SightingRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

export const buildCreateSighting = ({
  repository,
  idGenerator,
  clock,
}: Dependencies): CreateSighting => {
  return async (input) => {
    const id = idGenerator.nextId() as SightingId;
    const createdAt = clock.now();
    const sightingResult = createSightingEntity(input, { id, createdAt });

    if (!sightingResult.ok) {
      return sightingResult;
    }

    await repository.create(sightingResult.value);
    return sightingResult;
  };
};
