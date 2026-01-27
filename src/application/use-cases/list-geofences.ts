import type { Geofence } from "@/domain/geofences/geofence";
import type {
  GeofenceFilters,
  GeofenceRepository,
} from "@/ports/geofence-repository";

export type ListGeofences = (filters: GeofenceFilters) => Promise<Geofence[]>;

export const buildListGeofences = (
  repository: GeofenceRepository
): ListGeofences => {
  return async (filters) => repository.list(filters);
};
