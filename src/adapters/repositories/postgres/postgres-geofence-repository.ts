import type { Polygon } from "@/domain/geo/geo";
import type { Geofence, GeofenceId } from "@/domain/geofences/geofence";
import type {
  GeofenceFilters,
  GeofenceRepository,
} from "@/ports/geofence-repository";
import { polygonWithinPolygon } from "@/shared/geo";
import { getSql } from "@/adapters/repositories/postgres/client";

const mapRow = (row: Record<string, unknown>): Geofence => ({
  id: row.id as GeofenceId,
  name: String(row.name ?? ""),
  visibility: row.visibility as Geofence["visibility"],
  polygon: row.polygon as Polygon,
  createdAt: new Date(row.created_at as string).toISOString(),
  ownerId: row.owner_id ? String(row.owner_id) : undefined,
});

const applyBounds = (geofences: Geofence[], bounds?: Polygon) => {
  if (!bounds) {
    return geofences;
  }
  return geofences.filter((geofence) =>
    polygonWithinPolygon(geofence.polygon, bounds)
  );
};

export const postgresGeofenceRepository = (): GeofenceRepository => {
  const sql = getSql();

  return {
    async create(geofence) {
      await sql`
        insert into geofences (
          id,
          name,
          visibility,
          polygon,
          created_at,
          owner_id
        )
        values (
          ${geofence.id},
          ${geofence.name},
          ${geofence.visibility},
          ${sql.json(geofence.polygon)},
          ${geofence.createdAt},
          ${geofence.ownerId ?? null}
        )
      `;
    },
    async getById(id: GeofenceId) {
      const rows = await sql`select * from geofences where id = ${id} limit 1`;
      if (!rows.length) {
        return null;
      }
      return mapRow(rows[0]);
    },
    async list(filters: GeofenceFilters) {
      const rows = await sql`select * from geofences`;
      const mapped = rows.map(mapRow).filter((geofence) => {
        if (filters.visibility && geofence.visibility !== filters.visibility) {
          return false;
        }
        return true;
      });
      return applyBounds(mapped, filters.bounds);
    },
    async update(geofence) {
      await sql`
        update geofences set
          name = ${geofence.name},
          visibility = ${geofence.visibility},
          polygon = ${sql.json(geofence.polygon)},
          owner_id = ${geofence.ownerId ?? null}
        where id = ${geofence.id}
      `;
    },
    async delete(id) {
      await sql`delete from geofences where id = ${id}`;
    },
    async deleteMany(ids) {
      if (ids.length === 0) return;
      await sql`delete from geofences where id = any(${ids})`;
    },
  };
};
