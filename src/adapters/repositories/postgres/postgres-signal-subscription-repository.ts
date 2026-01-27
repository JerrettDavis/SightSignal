import type { SignalId } from "@/domain/signals/signal";
import type {
  SignalSubscription,
  SignalSubscriptionId,
  SignalSubscriptionFilters,
  SignalSubscriptionRepository,
  DeliveryMethod,
  DeliveryConfig,
} from "@/ports/signal-subscription-repository";
import { getSql } from "@/adapters/repositories/postgres/client";

const mapRow = (row: Record<string, unknown>): SignalSubscription => {
  // Parse delivery config from delivery_method column
  const deliveryMethod = row.delivery_method as DeliveryMethod;

  // For now, we'll store a simple config. In a real implementation,
  // we might have separate columns or a JSONB column for delivery_config
  let deliveryConfig: DeliveryConfig;
  if (deliveryMethod === "email") {
    deliveryConfig = { method: "email", email: String(row.user_id) }; // Simplified
  } else if (deliveryMethod === "webhook") {
    deliveryConfig = { method: "webhook", url: "" }; // Would need separate column
  } else {
    deliveryConfig = { method: "push", subscription: {} }; // Would need separate column
  }

  return {
    id: row.id as SignalSubscriptionId,
    signalId: row.signal_id as SignalId,
    userId: String(row.user_id ?? ""),
    deliveryMethod,
    deliveryConfig,
    isActive: true, // Default to true as we don't have this column in the migration
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.created_at as string).toISOString(), // Using created_at as we don't have updated_at
  };
};

export const postgresSignalSubscriptionRepository =
  (): SignalSubscriptionRepository => {
    const sql = getSql();

    return {
      async create(subscription) {
        await sql`
        insert into signal_subscriptions (
          id,
          signal_id,
          user_id,
          delivery_method,
          created_at
        )
        values (
          ${subscription.id},
          ${subscription.signalId},
          ${subscription.userId},
          ${subscription.deliveryMethod},
          ${subscription.createdAt}
        )
        on conflict (signal_id, user_id, delivery_method) do nothing
      `;
      },

      async list(filters) {
        if (!filters || Object.keys(filters).length === 0) {
          const rows =
            await sql`select * from signal_subscriptions order by created_at desc`;
          return rows.map(mapRow);
        }

        // Build dynamic query with filters
        let query = "select * from signal_subscriptions where 1=1";
        const params: Array<string | boolean> = [];

        if (filters.signalId) {
          query += ` and signal_id = $${params.length + 1}`;
          params.push(filters.signalId);
        }

        if (filters.userId) {
          query += ` and user_id = $${params.length + 1}`;
          params.push(filters.userId);
        }

        // Note: isActive filter not implemented in DB yet
        // if (filters.isActive !== undefined) {
        //   query += ` and is_active = $${params.length + 1}`;
        //   params.push(filters.isActive);
        // }

        query += " order by created_at desc";

        const rows = await sql.unsafe(query, params);
        return rows.map(mapRow);
      },

      async getById(id) {
        const rows =
          await sql`select * from signal_subscriptions where id = ${id} limit 1`;
        if (!rows.length) {
          return null;
        }
        return mapRow(rows[0]);
      },

      async getBySignalAndUser(signalId, userId) {
        const rows = await sql`
        select * from signal_subscriptions
        where signal_id = ${signalId} and user_id = ${userId}
        limit 1
      `;
        if (!rows.length) {
          return null;
        }
        return mapRow(rows[0]);
      },

      async update(subscription) {
        await sql`
        update signal_subscriptions set
          signal_id = ${subscription.signalId},
          user_id = ${subscription.userId},
          delivery_method = ${subscription.deliveryMethod}
        where id = ${subscription.id}
      `;
      },

      async delete(id) {
        await sql`delete from signal_subscriptions where id = ${id}`;
      },

      async deleteBySignalAndUser(signalId, userId) {
        await sql`
        delete from signal_subscriptions
        where signal_id = ${signalId} and user_id = ${userId}
      `;
      },

      async countBySignal(signalId) {
        const rows = await sql`
        select count(*)::int as count
        from signal_subscriptions
        where signal_id = ${signalId}
      `;
        return rows[0]?.count ?? 0;
      },

      // Convenience methods
      async subscribe(subscription) {
        // Use ON CONFLICT to handle duplicates
        await this.create(subscription);
      },

      async unsubscribe(signalId, userId) {
        await this.deleteBySignalAndUser(signalId, userId);
      },

      async getSubscribers(signalId) {
        return this.list({ signalId });
      },
    };
  };
