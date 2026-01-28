import type { Polygon } from "@/domain/geo/geo";
import type { Sighting, SightingId } from "@/domain/sightings/sighting";
import type {
  SightingFilters,
  SightingRepository,
} from "@/ports/sighting-repository";
import { pointInPolygon } from "@/shared/geo";
import { getSql } from "@/adapters/repositories/postgres/client";

const mapRow = (row: Record<string, unknown>): Sighting => {
  // Handle JSONB location field
  const location = row.location as { lat: number; lng: number } | null;

  return {
    id: row.id as SightingId,
    typeId: row.type_id as Sighting["typeId"],
    categoryId: row.category_id as Sighting["categoryId"],
    location: {
      lat: location?.lat ?? 0,
      lng: location?.lng ?? 0,
    },
    description: String(row.description ?? ""),
    details: row.details ? String(row.details) : undefined,
    importance: row.importance as Sighting["importance"],
    status: row.status as Sighting["status"],
    observedAt: new Date(row.observed_at as string).toISOString(),
    createdAt: new Date(row.created_at as string).toISOString(),
    fields: (row.fields as Record<string, Sighting["fields"][string]>) ?? {},
    reporterId: row.reporter_id ? String(row.reporter_id) : undefined,
    // Ensure backward compatibility by providing default values for scoring fields
    upvotes: row.upvotes != null ? Number(row.upvotes) : 0,
    downvotes: row.downvotes != null ? Number(row.downvotes) : 0,
    confirmations: row.confirmations != null ? Number(row.confirmations) : 0,
    disputes: row.disputes != null ? Number(row.disputes) : 0,
    spamReports: row.spam_reports != null ? Number(row.spam_reports) : 0,
    score: row.score != null ? Number(row.score) : 0,
    hotScore: row.hot_score != null ? Number(row.hot_score) : 0,
  };
};

const applyBounds = (sightings: Sighting[], bounds?: Polygon) => {
  if (!bounds) {
    return sightings;
  }
  return sightings.filter((sighting) =>
    pointInPolygon(bounds, sighting.location)
  );
};

export const postgresSightingRepository = (): SightingRepository => {
  const sql = getSql();

  return {
    async create(sighting) {
      // Ensure all scoring fields are initialized
      const upvotes = sighting.upvotes ?? 0;
      const downvotes = sighting.downvotes ?? 0;
      const confirmations = sighting.confirmations ?? 0;
      const disputes = sighting.disputes ?? 0;
      const spamReports = sighting.spamReports ?? 0;
      const score = sighting.score ?? 0;
      const hotScore = sighting.hotScore ?? 0;

      await sql`
        insert into sightings (
          id,
          type_id,
          category_id,
          location,
          description,
          details,
          importance,
          status,
          observed_at,
          created_at,
          fields,
          reporter_id,
          upvotes,
          downvotes,
          confirmations,
          disputes,
          spam_reports,
          score,
          hot_score
        )
        values (
          ${sighting.id},
          ${sighting.typeId},
          ${sighting.categoryId},
          ${sql.json(sighting.location)},
          ${sighting.description},
          ${sighting.details ?? null},
          ${sighting.importance},
          ${sighting.status},
          ${sighting.observedAt},
          ${sighting.createdAt},
          ${sql.json(sighting.fields)},
          ${sighting.reporterId ?? null},
          ${upvotes},
          ${downvotes},
          ${confirmations},
          ${disputes},
          ${spamReports},
          ${score},
          ${hotScore}
        )
      `;
    },
    async getById(id: SightingId) {
      const rows = await sql`select * from sightings where id = ${id} limit 1`;
      if (!rows.length) {
        return null;
      }
      return mapRow(rows[0]);
    },
    async list(filters: SightingFilters) {
      // Build WHERE clause conditions
      const conditions: string[] = [];
      if (filters.minHotScore !== undefined) {
        conditions.push(`hot_score >= ${filters.minHotScore}`);
      }
      if (filters.status) {
        conditions.push(`status = '${filters.status}'`);
      }
      if (filters.typeIds && filters.typeIds.length) {
        const ids = filters.typeIds.map((id) => `'${id}'`).join(", ");
        conditions.push(`type_id IN (${ids})`);
      }
      if (filters.categoryIds && filters.categoryIds.length) {
        const ids = filters.categoryIds.map((id) => `'${id}'`).join(", ");
        conditions.push(`category_id IN (${ids})`);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const limit = filters.limit !== undefined ? `LIMIT ${filters.limit}` : "";
      const offset =
        filters.offset !== undefined ? `OFFSET ${filters.offset}` : "";

      // Query with ordering by hot_score (descending), then created_at (descending)
      const rows = await sql.unsafe(`
        SELECT * FROM sightings
        ${whereClause}
        ORDER BY hot_score DESC, created_at DESC
        ${limit}
        ${offset}
      `);

      const mapped = rows.map(mapRow);
      return applyBounds(mapped, filters.bounds);
    },
    async update(sighting) {
      // Preserve scoring fields during update, using provided values or defaults
      const upvotes = sighting.upvotes ?? 0;
      const downvotes = sighting.downvotes ?? 0;
      const confirmations = sighting.confirmations ?? 0;
      const disputes = sighting.disputes ?? 0;
      const spamReports = sighting.spamReports ?? 0;
      const score = sighting.score ?? 0;
      const hotScore = sighting.hotScore ?? 0;

      await sql`
        update sightings set
          type_id = ${sighting.typeId},
          category_id = ${sighting.categoryId},
          location = ${sql.json(sighting.location)},
          description = ${sighting.description},
          details = ${sighting.details ?? null},
          importance = ${sighting.importance},
          status = ${sighting.status},
          observed_at = ${sighting.observedAt},
          fields = ${sql.json(sighting.fields)},
          reporter_id = ${sighting.reporterId ?? null},
          upvotes = ${upvotes},
          downvotes = ${downvotes},
          confirmations = ${confirmations},
          disputes = ${disputes},
          spam_reports = ${spamReports},
          score = ${score},
          hot_score = ${hotScore}
        where id = ${sighting.id}
      `;
    },
    async delete(id) {
      await sql`delete from sightings where id = ${id}`;
    },
    async deleteMany(ids) {
      if (ids.length === 0) return;
      await sql`delete from sightings where id = any(${ids})`;
    },
  };
};
