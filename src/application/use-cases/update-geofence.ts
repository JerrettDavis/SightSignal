import {
  updateGeofence as updateGeofenceEntity,
  type Geofence,
  type GeofenceId,
  type UpdateGeofence as UpdateGeofenceInput,
} from "@/domain/geofences/geofence";
import type { GeofenceRepository } from "@/ports/geofence-repository";
import { err, type DomainError, type Result } from "@/shared/result";

export type UpdateGeofence = (
  id: string,
  updates: UpdateGeofenceInput
) => Promise<Result<Geofence, DomainError>>;

type Dependencies = {
  repository: GeofenceRepository;
};

export const buildUpdateGeofence = ({
  repository,
}: Dependencies): UpdateGeofence => {
  return async (id, updates) => {
    const existing = await repository.getById(id as GeofenceId);

    if (!existing) {
      return err({
        code: "geofence.not_found",
        message: "Geofence not found.",
      });
    }

    const updateResult = updateGeofenceEntity(existing, updates);

    if (!updateResult.ok) {
      return updateResult;
    }

    await repository.update(updateResult.value);
    return updateResult;
  };
};
