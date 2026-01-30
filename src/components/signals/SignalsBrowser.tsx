"use client";

import { useState, useEffect } from "react";
import type { Signal } from "@/domain/signals/signal";
import { dispatchEvent, EVENTS } from "@/shared/events";

export function SignalsBrowser() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active");

  const handleSignalClick = async (signal: Signal) => {
    // Only zoom if the signal has a geofence target
    if (signal.target.kind === "geofence") {
      try {
        const response = await fetch(
          `/api/geofences/${signal.target.geofenceId}`
        );
        if (response.ok) {
          const data = await response.json();
          dispatchEvent(EVENTS.geofenceSelected, data.data);
        } else if (response.status === 404) {
          console.warn(
            `Geofence ${signal.target.geofenceId} not found - this may be seed data`
          );
        } else {
          console.error(`Failed to fetch geofence: ${response.status}`);
        }
      } catch (error) {
        console.error("Failed to fetch geofence:", error);
      }
    }
    // For polygon or global targets, we could add zoom logic later
  };

  useEffect(() => {
    const fetchSignals = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/signals/active");
        if (response.ok) {
          const data = await response.json();
          setSignals(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch signals:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignals();
  }, []);

  const filteredSignals = signals.filter((signal) => {
    if (filter === "active") return signal.isActive;
    if (filter === "inactive") return !signal.isActive;
    return true;
  });

  const getTargetLabel = (signal: Signal) => {
    switch (signal.target.kind) {
      case "global":
        return "Global";
      case "geofence":
        return "Geofence";
      case "polygon":
        return "Custom area";
      default:
        return "Unknown";
    }
  };

  const getTriggerLabel = (signal: Signal) => {
    const count = signal.triggers.length;
    if (count === 0) return "No triggers";
    if (count === 1) {
      const trigger = signal.triggers[0];
      switch (trigger) {
        case "new_sighting":
          return "New sighting";
        case "sighting_confirmed":
          return "Confirmed sighting";
        case "sighting_disputed":
          return "Disputed sighting";
        case "score_threshold":
          return "Score threshold";
        default:
          return "Custom trigger";
      }
    }
    return `${count} triggers`;
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-sm text-[color:var(--text-secondary)]">
          Loading signals...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters Section - Fixed at top */}
      <div className="border-b border-[color:var(--border)] p-4 space-y-4 bg-[color:var(--surface-elevated)] sticky top-0 z-10">
        <div>
          <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-2">
            Status
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filter === "all"
                  ? "border-[color:var(--accent-primary)] bg-[color:var(--accent-primary)] text-white"
                  : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-elevated)] hover:text-[color:var(--text-primary)]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filter === "active"
                  ? "border-[color:var(--accent-primary)] bg-[color:var(--accent-primary)] text-white"
                  : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-elevated)] hover:text-[color:var(--text-primary)]"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter("inactive")}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filter === "inactive"
                  ? "border-[color:var(--accent-primary)] bg-[color:var(--accent-primary)] text-white"
                  : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-elevated)] hover:text-[color:var(--text-primary)]"
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        <button
          className="w-full rounded-lg bg-[color:var(--accent-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--accent-hover)] transition"
          onClick={() => {
            // TODO: Open signal creator
            alert("Signal creator coming soon!");
          }}
        >
          Create Signal
        </button>
      </div>

      {/* Signals List - Scrollable */}
      <div className="p-4 pb-8 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-[color:var(--text-secondary)]">
            My Signals
          </h3>
          <span className="text-xs text-[color:var(--text-tertiary)]">
            {filteredSignals.length} found
          </span>
        </div>

        {filteredSignals.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[color:var(--text-secondary)]">
              {signals.length === 0
                ? "No signals created yet"
                : `No ${filter} signals`}
            </p>
            {filter !== "all" && (
              <button
                onClick={() => setFilter("all")}
                className="mt-2 text-xs font-medium text-[color:var(--accent-primary)] hover:underline"
              >
                Show all signals
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSignals.map((signal) => (
              <div
                key={signal.id}
                onClick={() => handleSignalClick(signal)}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3 hover:bg-[color:var(--surface-elevated)] transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[color:var(--text-primary)] truncate">
                      {signal.name}
                    </p>
                    <p className="text-xs text-[color:var(--text-secondary)] mt-1">
                      {getTriggerLabel(signal)} • {getTargetLabel(signal)}
                    </p>
                    {signal.description && (
                      <p className="text-xs text-[color:var(--text-tertiary)] mt-1 line-clamp-2">
                        {signal.description}
                      </p>
                    )}
                  </div>
                  <div
                    className={`flex-shrink-0 w-2 h-2 rounded-full ${
                      signal.isActive
                        ? "bg-[color:var(--accent-success)]"
                        : "bg-[color:var(--text-tertiary)]"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
