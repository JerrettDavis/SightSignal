import type { Sighting, SightingId } from "@/domain/sightings/sighting";
import type {
  SightingFilters,
  SightingRepository,
} from "@/ports/sighting-repository";
import { pointInPolygon } from "@/shared/geo";
import { seedSightings } from "@/data/seed";

type Store = Map<SightingId, Sighting>;

const getStore = (): Store => {
  const globalAny = globalThis as {
    __sightsignal_store?: Store;
    __sightsignal_store_initialized?: boolean;
  };
  if (!globalAny.__sightsignal_store) {
    globalAny.__sightsignal_store = new Map<SightingId, Sighting>();
    // Load seed data on first initialization
    if (!globalAny.__sightsignal_store_initialized) {
      seedSightings.forEach((sighting) => {
        globalAny.__sightsignal_store!.set(sighting.id, sighting);
      });
      globalAny.__sightsignal_store_initialized = true;
    }
  }
  return globalAny.__sightsignal_store;
};

export const inMemorySightingRepository = (): SightingRepository => {
  const store = getStore();

  return {
    async create(sighting) {
      // Ensure all scoring fields are initialized
      const sightingWithScores: Sighting = {
        ...sighting,
        upvotes: sighting.upvotes ?? 0,
        downvotes: sighting.downvotes ?? 0,
        confirmations: sighting.confirmations ?? 0,
        disputes: sighting.disputes ?? 0,
        spamReports: sighting.spamReports ?? 0,
        score: sighting.score ?? 0,
        hotScore: sighting.hotScore ?? 0,
      };
      store.set(sightingWithScores.id, sightingWithScores);
    },
    async getById(id) {
      const sighting = store.get(id);
      if (!sighting) {
        return null;
      }
      // Ensure backward compatibility by providing default values
      return {
        ...sighting,
        upvotes: sighting.upvotes ?? 0,
        downvotes: sighting.downvotes ?? 0,
        confirmations: sighting.confirmations ?? 0,
        disputes: sighting.disputes ?? 0,
        spamReports: sighting.spamReports ?? 0,
        score: sighting.score ?? 0,
        hotScore: sighting.hotScore ?? 0,
      };
    },
    async list(filters: SightingFilters) {
      const values = Array.from(store.values());
      const filtered = values.filter((sighting) => {
        if (filters.status && sighting.status !== filters.status) {
          return false;
        }
        if (filters.typeIds && !filters.typeIds.includes(sighting.typeId)) {
          return false;
        }
        if (
          filters.categoryIds &&
          !filters.categoryIds.includes(sighting.categoryId)
        ) {
          return false;
        }
        if (
          filters.bounds &&
          !pointInPolygon(filters.bounds, sighting.location)
        ) {
          return false;
        }
        return true;
      });

      // Ensure backward compatibility by providing default values for all sightings
      const withDefaults = filtered.map((sighting) => ({
        ...sighting,
        upvotes: sighting.upvotes ?? 0,
        downvotes: sighting.downvotes ?? 0,
        confirmations: sighting.confirmations ?? 0,
        disputes: sighting.disputes ?? 0,
        spamReports: sighting.spamReports ?? 0,
        score: sighting.score ?? 0,
        hotScore: sighting.hotScore ?? 0,
      }));

      // Sort by hot score (descending), then by created_at (descending)
      const sorted = withDefaults.sort((a, b) => {
        // First sort by hot score
        if (b.hotScore !== a.hotScore) {
          return b.hotScore - a.hotScore;
        }
        // Then by created_at (most recent first)
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      // Apply minHotScore filter
      const scoreFiltered =
        filters.minHotScore !== undefined
          ? sorted.filter((s) => s.hotScore >= filters.minHotScore!)
          : sorted;

      // Apply limit and offset
      const offset = filters.offset ?? 0;
      const limit = filters.limit;
      if (limit !== undefined) {
        return scoreFiltered.slice(offset, offset + limit);
      }
      return scoreFiltered.slice(offset);
    },
    async update(sighting) {
      // Preserve all scoring fields during update
      const existing = store.get(sighting.id);
      const updated: Sighting = {
        ...sighting,
        upvotes: sighting.upvotes ?? existing?.upvotes ?? 0,
        downvotes: sighting.downvotes ?? existing?.downvotes ?? 0,
        confirmations: sighting.confirmations ?? existing?.confirmations ?? 0,
        disputes: sighting.disputes ?? existing?.disputes ?? 0,
        spamReports: sighting.spamReports ?? existing?.spamReports ?? 0,
        score: sighting.score ?? existing?.score ?? 0,
        hotScore: sighting.hotScore ?? existing?.hotScore ?? 0,
      };
      store.set(updated.id, updated);
    },
    async delete(id) {
      store.delete(id);
    },
    async deleteMany(ids) {
      ids.forEach((id) => store.delete(id));
    },
  };
};
