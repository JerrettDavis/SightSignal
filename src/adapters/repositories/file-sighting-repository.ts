import path from "node:path";
import type { Sighting, SightingId } from "@/domain/sightings/sighting";
import type {
  SightingFilters,
  SightingRepository,
} from "@/ports/sighting-repository";
import { pointInPolygon } from "@/shared/geo";
import {
  readCollection,
  writeCollection,
  getDataDir,
} from "@/adapters/repositories/file-store";
import { seedSightings } from "@/data/seed";

const getFilePath = () => path.join(getDataDir(), "sightings.json");

const ensureSightingDefaults = (sighting: Sighting): Sighting => ({
  ...sighting,
  upvotes: sighting.upvotes ?? 0,
  downvotes: sighting.downvotes ?? 0,
  confirmations: sighting.confirmations ?? 0,
  disputes: sighting.disputes ?? 0,
  spamReports: sighting.spamReports ?? 0,
  score: sighting.score ?? 0,
  hotScore: sighting.hotScore ?? 0,
});

export const fileSightingRepository = (): SightingRepository => {
  const filePath = getFilePath();

  return {
    async create(sighting) {
      const data = await readCollection<Sighting>(filePath, seedSightings);
      // Ensure all scoring fields are initialized
      const sightingWithScores = ensureSightingDefaults(sighting);
      data.push(sightingWithScores);
      await writeCollection(filePath, data);
    },
    async getById(id: SightingId) {
      const data = await readCollection<Sighting>(filePath, seedSightings);
      const sighting = data.find((item) => item.id === id);
      if (!sighting) {
        return null;
      }
      // Ensure backward compatibility by providing default values
      return ensureSightingDefaults(sighting);
    },
    async list(filters: SightingFilters) {
      const data = await readCollection<Sighting>(filePath, seedSightings);
      const filtered = data.filter((sighting) => {
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
      const withDefaults = filtered.map(ensureSightingDefaults);

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
      const data = await readCollection<Sighting>(filePath, seedSightings);
      const index = data.findIndex((item) => item.id === sighting.id);
      if (index !== -1) {
        // Preserve all scoring fields during update
        const existing = data[index];
        const updated: Sighting = {
          ...sighting,
          upvotes: sighting.upvotes ?? existing.upvotes ?? 0,
          downvotes: sighting.downvotes ?? existing.downvotes ?? 0,
          confirmations: sighting.confirmations ?? existing.confirmations ?? 0,
          disputes: sighting.disputes ?? existing.disputes ?? 0,
          spamReports: sighting.spamReports ?? existing.spamReports ?? 0,
          score: sighting.score ?? existing.score ?? 0,
          hotScore: sighting.hotScore ?? existing.hotScore ?? 0,
        };
        data[index] = updated;
        await writeCollection(filePath, data);
      }
    },
    async delete(id) {
      const data = await readCollection<Sighting>(filePath, seedSightings);
      const filtered = data.filter((item) => item.id !== id);
      await writeCollection(filePath, filtered);
    },
    async deleteMany(ids) {
      const data = await readCollection<Sighting>(filePath, seedSightings);
      const idSet = new Set(ids);
      const filtered = data.filter((item) => !idSet.has(item.id));
      await writeCollection(filePath, filtered);
    },
  };
};
