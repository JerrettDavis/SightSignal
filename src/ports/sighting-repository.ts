import type { Polygon } from "@/domain/geo/geo";
import type {
  CategoryId,
  Sighting,
  SightingId,
  SightingStatus,
  SightingTypeId,
} from "@/domain/sightings/sighting";

export type SightingFilters = {
  typeIds?: SightingTypeId[];
  categoryIds?: CategoryId[];
  status?: SightingStatus;
  bounds?: Polygon;
  limit?: number;
  offset?: number;
  minHotScore?: number;
};

export type SightingRepository = {
  create: (sighting: Sighting) => Promise<void>;
  getById: (id: SightingId) => Promise<Sighting | null>;
  list: (filters: SightingFilters) => Promise<Sighting[]>;
  update: (sighting: Sighting) => Promise<void>;
  delete: (id: SightingId) => Promise<void>;
  deleteMany: (ids: SightingId[]) => Promise<void>;
};
