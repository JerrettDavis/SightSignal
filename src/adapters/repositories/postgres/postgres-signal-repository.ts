import type { Polygon } from "@/domain/geo/geo";
import type {
  Signal,
  SignalId,
  SignalTarget,
  SignalConditions,
  TriggerType,
} from "@/domain/signals/signal";
import type {
  SignalFilters,
  SignalRepository,
  SignalWithSubscriptionCount,
} from "@/ports/signal-repository";
import { getSql } from "@/adapters/repositories/postgres/client";

const mapRow = (row: Record<string, unknown>): Signal => {
  // Parse target from JSONB column
  const targetData = row.target as Record<string, unknown> | null;
  let target: SignalTarget;

  if (targetData?.kind === "geofence") {
    target = { kind: "geofence", geofenceId: String(targetData.geofenceId) };
  } else if (targetData?.kind === "polygon") {
    target = { kind: "polygon", polygon: targetData.polygon as Polygon };
  } else {
    target = { kind: "global" };
  }

  return {
    id: row.id as SignalId,
    name: String(row.name ?? ""),
    description: row.description ? String(row.description) : undefined,
    ownerId: String(row.owner_id ?? ""),
    target,
    triggers: (row.triggers as TriggerType[]) ?? [],
    conditions: (row.conditions as SignalConditions) ?? {},
    isActive: Boolean(row.is_active),
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
};

export const postgresSignalRepository = (): SignalRepository => {
  const sql = getSql();

  return {
    async create(signal) {
      await sql`
        insert into signals (
          id,
          name,
          description,
          owner_id,
          target,
          triggers,
          conditions,
          is_active,
          created_at,
          updated_at
        )
        values (
          ${signal.id},
          ${signal.name},
          ${signal.description ?? null},
          ${signal.ownerId},
          ${sql.json(signal.target)},
          ${signal.triggers},
          ${sql.json(signal.conditions)},
          ${signal.isActive},
          ${signal.createdAt},
          ${signal.updatedAt}
        )
      `;
    },

    async list(filters) {
      if (!filters || Object.keys(filters).length === 0) {
        const rows = await sql`select * from signals order by created_at desc`;
        return rows.map(mapRow);
      }

      // Build dynamic query with filters
      let query = "select * from signals where 1=1";
      const params: Array<string | boolean> = [];

      if (filters.ownerId) {
        query += ` and owner_id = $${params.length + 1}`;
        params.push(filters.ownerId);
      }

      if (filters.isActive !== undefined) {
        query += ` and is_active = $${params.length + 1}`;
        params.push(filters.isActive);
      }

      if (filters.geofenceId) {
        query += ` and target->>'geofenceId' = $${params.length + 1}`;
        params.push(filters.geofenceId);
      }

      query += " order by created_at desc";

      const rows = await sql.unsafe(query, params);
      return rows.map(mapRow);
    },

    async listWithSubscriptionCounts(filters) {
      if (!filters || Object.keys(filters).length === 0) {
        const rows = await sql`
          select
            s.*,
            count(ss.id)::int as subscription_count
          from signals s
          left join signal_subscriptions ss on s.id = ss.signal_id
          group by s.id
          order by s.created_at desc
        `;
        return rows.map((row) => ({
          ...mapRow(row),
          subscriptionCount: Number(row.subscription_count ?? 0),
          sightingCount: Number(row.sighting_count ?? 0),
        }));
      }

      // Build dynamic query with filters
      let query = `
        select
          s.*,
          count(ss.id)::int as subscription_count
        from signals s
        left join signal_subscriptions ss on s.id = ss.signal_id
        where 1=1
      `;
      const params: Array<string | boolean> = [];

      if (filters.ownerId) {
        query += ` and s.owner_id = $${params.length + 1}`;
        params.push(filters.ownerId);
      }

      if (filters.isActive !== undefined) {
        query += ` and s.is_active = $${params.length + 1}`;
        params.push(filters.isActive);
      }

      if (filters.geofenceId) {
        query += ` and s.target->>'geofenceId' = $${params.length + 1}`;
        params.push(filters.geofenceId);
      }

      query += " group by s.id order by s.created_at desc";

      const rows = await sql.unsafe(query, params);
      return rows.map((row) => ({
        ...mapRow(row),
        subscriptionCount: Number(row.subscription_count ?? 0),
      }));
    },

    async getById(id) {
      const rows = await sql`select * from signals where id = ${id} limit 1`;
      if (!rows.length) {
        return null;
      }
      return mapRow(rows[0]);
    },

    async getByOwner(ownerId) {
      return this.list({ ownerId });
    },

    async getActiveSignals() {
      return this.list({ isActive: true });
    },

    async getSignalsForGeofence(geofenceId) {
      return this.list({ geofenceId });
    },

    async update(signal) {
      await sql`
        update signals set
          name = ${signal.name},
          description = ${signal.description ?? null},
          owner_id = ${signal.ownerId},
          target = ${sql.json(signal.target)},
          triggers = ${signal.triggers},
          conditions = ${sql.json(signal.conditions)},
          is_active = ${signal.isActive},
          updated_at = ${signal.updatedAt}
        where id = ${signal.id}
      `;
    },

    async delete(id) {
      await sql`delete from signals where id = ${id}`;
    },

    async deleteMany(ids) {
      if (ids.length === 0) return;
      await sql`delete from signals where id = any(${ids})`;
    },
  };
};
