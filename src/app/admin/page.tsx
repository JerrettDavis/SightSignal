"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { MetricCard } from "@/components/admin/MetricCard";

interface Metrics {
  totalSightings: number;
  activeSightings: number;
  criticalAlerts: number;
  geofences: number;
  publicGeofences: number;
  subscriptions: number;
  resolvedSightings: number;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("[Admin Dashboard] Component mounted");

  useEffect(() => {
    console.log("[Admin Dashboard] useEffect running");
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/admin/metrics");

        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.status}`);
        }

        const data = await response.json();
        setMetrics(data.data || data);
      } catch (err) {
        console.error("Error fetching metrics:", err);
        setError(err instanceof Error ? err.message : "Failed to load metrics");
      } finally {
        setLoading(false);
      }
    };

    void fetchMetrics();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-bold text-[color:var(--text-primary)]">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Overview of your SignalFeed platform
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--accent-primary)] border-r-transparent"></div>
              <p className="mt-4 text-sm text-[color:var(--text-secondary)]">
                Loading metrics...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="rounded-lg border border-[color:var(--accent-danger)] bg-[color:var(--accent-danger)]/10 p-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 flex-shrink-0 text-[color:var(--accent-danger)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-[color:var(--accent-danger)]">
                  Error loading dashboard
                </h3>
                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        {metrics && !loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Sightings"
              value={metrics.totalSightings}
            />
            <MetricCard
              title="Active Sightings"
              value={metrics.activeSightings}
            />
            <MetricCard
              title="Critical Alerts"
              value={metrics.criticalAlerts}
            />
            <MetricCard title="Geofences" value={metrics.geofences} />
            <MetricCard
              title="Public Geofences"
              value={metrics.publicGeofences}
            />
            <MetricCard title="Subscriptions" value={metrics.subscriptions} />
            <MetricCard
              title="Resolved Sightings"
              value={metrics.resolvedSightings}
            />
          </div>
        )}

        {/* Quick Stats */}
        {metrics && !loading && (
          <div className="mt-8 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-sm)]">
            <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
              Quick Stats
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-[color:var(--text-secondary)]">
                  Resolution Rate
                </p>
                <p className="mt-1 text-2xl font-bold text-[color:var(--text-primary)]">
                  {metrics.totalSightings > 0
                    ? Math.round(
                        (metrics.resolvedSightings / metrics.totalSightings) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-[color:var(--text-secondary)]">
                  Public Geofence Ratio
                </p>
                <p className="mt-1 text-2xl font-bold text-[color:var(--text-primary)]">
                  {metrics.geofences > 0
                    ? Math.round(
                        (metrics.publicGeofences / metrics.geofences) * 100
                      )
                    : 0}
                  %
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-[color:var(--text-secondary)]">
                  Critical Alert Rate
                </p>
                <p className="mt-1 text-2xl font-bold text-[color:var(--text-primary)]">
                  {metrics.activeSightings > 0
                    ? Math.round(
                        (metrics.criticalAlerts / metrics.activeSightings) * 100
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
