import type {
  Subscription,
  SubscriptionId,
} from "@/domain/subscriptions/subscription";
import type { Polygon } from "@/domain/geo/geo";
import type {
  SubscriptionFilters,
  SubscriptionRepository,
} from "@/ports/subscription-repository";
import { getSql } from "@/adapters/repositories/postgres/client";

const mapRow = (row: Record<string, unknown>): Subscription => ({
  id: row.id as SubscriptionId,
  email: String(row.email ?? ""),
  target:
    row.target_kind === "geofence"
      ? { kind: "geofence", geofenceId: String(row.geofence_id ?? "") }
      : { kind: "polygon", polygon: row.polygon as Polygon },
  categoryIds: (row.category_ids as string[]) ?? [],
  typeIds: (row.type_ids as string[]) ?? [],
  trustLevel: row.trust_level as Subscription["trustLevel"],
  createdAt: new Date(row.created_at as string).toISOString(),
});

export const postgresSubscriptionRepository = (): SubscriptionRepository => {
  const sql = getSql();

  return {
    async create(subscription) {
      const targetKind = subscription.target.kind;
      const geofenceId =
        targetKind === "geofence" ? subscription.target.geofenceId : null;
      const polygon =
        targetKind === "polygon" ? subscription.target.polygon : null;

      await sql`
        insert into subscriptions (
          id,
          email,
          target_kind,
          geofence_id,
          polygon,
          category_ids,
          type_ids,
          trust_level,
          created_at
        )
        values (
          ${subscription.id},
          ${subscription.email},
          ${targetKind},
          ${geofenceId},
          ${polygon ? sql.json(polygon) : null},
          ${sql.json(subscription.categoryIds)},
          ${sql.json(subscription.typeIds)},
          ${subscription.trustLevel},
          ${subscription.createdAt}
        )
      `;
    },
    async list(filters?: SubscriptionFilters) {
      const rows = filters?.email
        ? await sql`select * from subscriptions where email = ${filters.email}`
        : await sql`select * from subscriptions`;
      return rows.map(mapRow);
    },
    async getById(id: SubscriptionId) {
      const rows =
        await sql`select * from subscriptions where id = ${id} limit 1`;
      if (!rows.length) {
        return null;
      }
      return mapRow(rows[0]);
    },
    async update(subscription) {
      const targetKind = subscription.target.kind;
      const geofenceId =
        targetKind === "geofence" ? subscription.target.geofenceId : null;
      const polygon =
        targetKind === "polygon" ? subscription.target.polygon : null;

      await sql`
        update subscriptions set
          email = ${subscription.email},
          target_kind = ${targetKind},
          geofence_id = ${geofenceId},
          polygon = ${polygon ? sql.json(polygon) : null},
          category_ids = ${sql.json(subscription.categoryIds)},
          type_ids = ${sql.json(subscription.typeIds)},
          trust_level = ${subscription.trustLevel}
        where id = ${subscription.id}
      `;
    },
    async delete(id) {
      await sql`delete from subscriptions where id = ${id}`;
    },
    async deleteMany(ids) {
      if (ids.length === 0) return;
      await sql`delete from subscriptions where id = any(${ids})`;
    },
  };
};
