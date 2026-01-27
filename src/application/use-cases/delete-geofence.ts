import type { GeofenceId } from "@/domain/geofences/geofence";
import type { GeofenceRepository } from "@/ports/geofence-repository";
import { err, ok, type DomainError, type Result } from "@/shared/result";

export type DeleteGeofence = (id: string) => Promise<Result<void, DomainError>>;

type Dependencies = {
  repository: GeofenceRepository;
};

export const buildDeleteGeofence = ({
  repository,
}: Dependencies): DeleteGeofence => {
  return async (id) => {
    const existing = await repository.getById(id as GeofenceId);

    if (!existing) {
      return err({
        code: "geofence.not_found",
        message: "Geofence not found.",
      });
    }

    await repository.delete(id as GeofenceId);
    return ok(undefined);
  };
};
