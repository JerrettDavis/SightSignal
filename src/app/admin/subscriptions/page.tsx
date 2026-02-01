"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";

type SubscriptionTarget =
  | { kind: "geofence"; geofenceId: string }
  | {
      kind: "polygon";
      polygon: { points: Array<{ lat: number; lng: number }> };
    };

interface Subscription {
  id: string;
  email: string;
  target: SubscriptionTarget;
  trustLevel: string;
  createdAt: string;
}

const formatTarget = (target: SubscriptionTarget): string => {
  if (target.kind === "geofence") {
    return `Geofence: ${target.geofenceId}`;
  }
  if (target.kind === "polygon" && target.polygon?.points) {
    return `Custom polygon (${target.polygon.points.length} points)`;
  }
  return "Unknown target";
};

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingSubscription, setEditingSubscription] =
    useState<Subscription | null>(null);
  const [editForm, setEditForm] = useState({
    email: "",
    trustLevel: "",
  });

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/subscriptions");

      if (!response.ok) {
        throw new Error(`Failed to fetch subscriptions: ${response.status}`);
      }

      const data = await response.json();
      setSubscriptions(data.data || data);
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load subscriptions"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSubscriptions();
  }, []);

  const filteredSubscriptions = subscriptions.filter((subscription) =>
    subscription.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredSubscriptions.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subscription?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/subscriptions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete subscription");
      }

      await fetchSubscriptions();
      setSelectedIds(new Set());
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to delete subscription"
      );
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.size} subscription(s)?`
      )
    ) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/admin/subscriptions/${id}`, { method: "DELETE" })
        )
      );

      await fetchSubscriptions();
      setSelectedIds(new Set());
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to delete subscriptions"
      );
    }
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setEditForm({
      email: subscription.email,
      trustLevel: subscription.trustLevel,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSubscription) return;

    try {
      const response = await fetch(
        `/api/admin/subscriptions/${editingSubscription.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update subscription");
      }

      await fetchSubscriptions();
      setEditingSubscription(null);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to update subscription"
      );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[color:var(--text-primary)]">
              Subscriptions
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Manage all email subscriptions
            </p>
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="rounded-lg bg-[color:var(--accent-danger)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
            >
              Delete {selectedIds.size} selected
            </button>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)]"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--accent-primary)] border-r-transparent"></div>
              <p className="mt-4 text-sm text-[color:var(--text-secondary)]">
                Loading subscriptions...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="rounded-lg border border-[color:var(--accent-danger)] bg-[color:var(--accent-danger)]/10 p-4">
            <p className="text-sm text-[color:var(--accent-danger)]">{error}</p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[color:var(--border)] bg-[color:var(--surface-elevated)]">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          filteredSubscriptions.length > 0 &&
                          selectedIds.size === filteredSubscriptions.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 rounded border-[color:var(--border)] text-[color:var(--accent-primary)] focus:ring-[color:var(--accent-primary)]"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--text-secondary)] uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--text-secondary)] uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--text-secondary)] uppercase tracking-wider">
                      Trust Level
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--text-secondary)] uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[color:var(--text-secondary)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {filteredSubscriptions.map((subscription) => (
                    <tr
                      key={subscription.id}
                      className="hover:bg-[color:var(--surface-elevated)] transition"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(subscription.id)}
                          onChange={(e) =>
                            handleSelectOne(subscription.id, e.target.checked)
                          }
                          className="h-4 w-4 rounded border-[color:var(--border)] text-[color:var(--accent-primary)] focus:ring-[color:var(--accent-primary)]"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[color:var(--text-primary)]">
                        {subscription.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-[color:var(--text-secondary)]">
                        {formatTarget(subscription.target)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            subscription.trustLevel === "high"
                              ? "bg-[color:var(--accent-success)]/10 text-[color:var(--accent-success)]"
                              : subscription.trustLevel === "medium"
                                ? "bg-[color:var(--accent-warning)]/10 text-[color:var(--accent-warning)]"
                                : "bg-[color:var(--text-tertiary)]/10 text-[color:var(--text-tertiary)]"
                          }`}
                        >
                          {subscription.trustLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[color:var(--text-secondary)]">
                        {new Date(subscription.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(subscription)}
                            className="rounded px-3 py-1 text-xs font-medium text-[color:var(--accent-primary)] hover:bg-[color:var(--accent-primary)]/10 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(subscription.id)}
                            className="rounded px-3 py-1 text-xs font-medium text-[color:var(--accent-danger)] hover:bg-[color:var(--accent-danger)]/10 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredSubscriptions.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm text-[color:var(--text-secondary)]">
                  No subscriptions found
                </p>
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        {editingSubscription && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)]">
              <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
                Edit Subscription
              </h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1">
                    Trust Level
                  </label>
                  <select
                    value={editForm.trustLevel}
                    onChange={(e) =>
                      setEditForm({ ...editForm, trustLevel: e.target.value })
                    }
                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 rounded-lg bg-[color:var(--accent-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--accent-hover)] transition"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingSubscription(null)}
                  className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] hover:bg-[color:var(--surface-elevated)] transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
