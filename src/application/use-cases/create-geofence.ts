import {
  createGeofence as createGeofenceEntity,
  type Geofence,
  type GeofenceId,
  type NewGeofence,
} from "@/domain/geofences/geofence";
import type { Clock } from "@/ports/clock";
import type { GeofenceRepository } from "@/ports/geofence-repository";
import type { IdGenerator } from "@/ports/id-generator";
import type { DomainError, Result } from "@/shared/result";

export type CreateGeofence = (
  input: NewGeofence
) => Promise<Result<Geofence, DomainError>>;

type Dependencies = {
  repository: GeofenceRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

export const buildCreateGeofence = ({
  repository,
  idGenerator,
  clock,
}: Dependencies): CreateGeofence => {
  return async (input) => {
    const id = idGenerator.nextId() as GeofenceId;
    const createdAt = clock.now();
    const geofenceResult = createGeofenceEntity(input, { id, createdAt });

    if (!geofenceResult.ok) {
      return geofenceResult;
    }

    await repository.create(geofenceResult.value);
    return geofenceResult;
  };
};
