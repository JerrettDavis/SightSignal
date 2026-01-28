"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { GeofenceMapEditor } from "@/components/admin/GeofenceMapEditor";

interface Geofence {
  id: string;
  name: string;
  visibility: string;
  polygon: { points: Array<{ lat: number; lng: number }> };
  createdAt: string;
  ownerId?: string;
}

export default function AdminGeofences() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    visibility: "",
  });
  const [visualEditingGeofence, setVisualEditingGeofence] =
    useState<Geofence | null>(null);

  const fetchGeofences = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/geofences");

      if (!response.ok) {
        throw new Error(`Failed to fetch geofences: ${response.status}`);
      }

      const data = await response.json();
      setGeofences(data.data || data);
    } catch (err) {
      console.error("Error fetching geofences:", err);
      setError(err instanceof Error ? err.message : "Failed to load geofences");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchGeofences();
  }, []);

  const filteredGeofences = geofences.filter((geofence) =>
    geofence.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredGeofences.map((g) => g.id)));
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
    if (!confirm("Are you sure you want to delete this geofence?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/geofences/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete geofence");
      }

      await fetchGeofences();
      setSelectedIds(new Set());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete geofence");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.size} geofence(s)?`
      )
    ) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/admin/geofences/${id}`, { method: "DELETE" })
        )
      );

      await fetchGeofences();
      setSelectedIds(new Set());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete geofences");
    }
  };

  const handleEdit = (geofence: Geofence) => {
    setEditingGeofence(geofence);
    setEditForm({
      name: geofence.name,
      visibility: geofence.visibility,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingGeofence) return;

    try {
      const response = await fetch(
        `/api/admin/geofences/${editingGeofence.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update geofence");
      }

      await fetchGeofences();
      setEditingGeofence(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update geofence");
    }
  };

  const handleVisualEdit = (geofence: Geofence) => {
    setVisualEditingGeofence(geofence);
  };

  const handleSaveVisualEdit = async (
    points: Array<{ lat: number; lng: number }>
  ) => {
    if (!visualEditingGeofence) return;

    try {
      const response = await fetch(
        `/api/admin/geofences/${visualEditingGeofence.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            polygon: { points },
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update geofence shape");
      }

      await fetchGeofences();
      setVisualEditingGeofence(null);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to update geofence shape"
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
              Geofences
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Manage all geofences
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
              placeholder="Search by name..."
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
                Loading geofences...
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
                          filteredGeofences.length > 0 &&
                          selectedIds.size === filteredGeofences.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 rounded border-[color:var(--border)] text-[color:var(--accent-primary)] focus:ring-[color:var(--accent-primary)]"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--text-secondary)] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--text-secondary)] uppercase tracking-wider">
                      Visibility
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--text-secondary)] uppercase tracking-wider">
                      Points Count
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
                  {filteredGeofences.map((geofence) => (
                    <tr
                      key={geofence.id}
                      className="hover:bg-[color:var(--surface-elevated)] transition"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(geofence.id)}
                          onChange={(e) =>
                            handleSelectOne(geofence.id, e.target.checked)
                          }
                          className="h-4 w-4 rounded border-[color:var(--border)] text-[color:var(--accent-primary)] focus:ring-[color:var(--accent-primary)]"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[color:var(--text-primary)]">
                        {geofence.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            geofence.visibility === "public"
                              ? "bg-[color:var(--accent-success)]/10 text-[color:var(--accent-success)]"
                              : "bg-[color:var(--text-tertiary)]/10 text-[color:var(--text-tertiary)]"
                          }`}
                        >
                          {geofence.visibility}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[color:var(--text-secondary)]">
                        {geofence.polygon.points.length}
                      </td>
                      <td className="px-4 py-3 text-sm text-[color:var(--text-secondary)]">
                        {new Date(geofence.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleVisualEdit(geofence)}
                            className="rounded px-3 py-1 text-xs font-medium text-[color:var(--accent-success)] hover:bg-[color:var(--accent-success)]/10 transition"
                          >
                            Edit Shape
                          </button>
                          <button
                            onClick={() => handleEdit(geofence)}
                            className="rounded px-3 py-1 text-xs font-medium text-[color:var(--accent-primary)] hover:bg-[color:var(--accent-primary)]/10 transition"
                          >
                            Edit Info
                          </button>
                          <button
                            onClick={() => handleDelete(geofence.id)}
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

            {filteredGeofences.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm text-[color:var(--text-secondary)]">
                  No geofences found
                </p>
              </div>
            )}
          </div>
        )}

        {/* Visual Map Editor */}
        {visualEditingGeofence && (
          <GeofenceMapEditor
            points={visualEditingGeofence.polygon.points}
            onChange={handleSaveVisualEdit}
            onClose={() => setVisualEditingGeofence(null)}
          />
        )}

        {/* Edit Modal */}
        {editingGeofence && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)]">
              <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
                Edit Geofence
              </h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1">
                    Visibility
                  </label>
                  <select
                    value={editForm.visibility}
                    onChange={(e) =>
                      setEditForm({ ...editForm, visibility: e.target.value })
                    }
                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)]"
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
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
                  onClick={() => setEditingGeofence(null)}
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
