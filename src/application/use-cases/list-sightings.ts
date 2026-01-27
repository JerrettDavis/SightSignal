import type { Sighting } from "@/domain/sightings/sighting";
import type {
  SightingFilters,
  SightingRepository,
} from "@/ports/sighting-repository";

export type ListSightings = (filters: SightingFilters) => Promise<Sighting[]>;

export const buildListSightings = (
  repository: SightingRepository
): ListSightings => {
  return async (filters) => repository.list(filters);
};
