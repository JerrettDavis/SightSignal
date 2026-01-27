import type { Polygon } from "@/domain/geo/geo";
import type {
  Geofence,
  GeofenceId,
  GeofenceVisibility,
} from "@/domain/geofences/geofence";

export type GeofenceFilters = {
  visibility?: GeofenceVisibility;
  bounds?: Polygon;
};

export type GeofenceRepository = {
  create: (geofence: Geofence) => Promise<void>;
  getById: (id: GeofenceId) => Promise<Geofence | null>;
  list: (filters: GeofenceFilters) => Promise<Geofence[]>;
  update: (geofence: Geofence) => Promise<void>;
  delete: (id: GeofenceId) => Promise<void>;
  deleteMany: (ids: GeofenceId[]) => Promise<void>;
};
