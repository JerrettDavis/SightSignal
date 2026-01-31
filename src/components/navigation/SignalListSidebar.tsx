"use client";

import { useEffect, useState } from "react";
import { useSignalNavigation } from "@/stores/signalNavigationStore";

interface Signal {
  id: string;
  name: string;
  description: string | null;
  sightingCount?: number;
  subscriptionCount?: number;
}

export default function SignalListSidebar() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { selectedSignal, navigateToSignal } = useSignalNavigation();

  useEffect(() => {
    fetchSignals();
  }, []);

  async function fetchSignals() {
    try {
      const res = await fetch("/api/signals");
      if (!res.ok) throw new Error("Failed to fetch signals");
      const data = await res.json();
      setSignals(data.data || []);
    } catch (error) {
      console.error("Error fetching signals:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[color:var(--border)]">
        <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
          Signals
        </h2>
        <p className="text-sm text-[color:var(--text-secondary)]">
          Browse by topic or area
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {signals.map((signal) => (
          <button
            key={signal.id}
            onClick={() => navigateToSignal(signal.id)}
            className={`w-full p-4 text-left hover:bg-[color:var(--surface)] transition-colors border-b border-[color:var(--border)] ${
              selectedSignal === signal.id
                ? "bg-[color:var(--surface)] border-l-4 border-l-[color:var(--accent-primary)]"
                : ""
            }`}
          >
            <div className="font-medium text-[color:var(--text-primary)]">
              {signal.name}
            </div>
            {signal.description && (
              <div className="text-sm text-[color:var(--text-secondary)] mt-1 line-clamp-2">
                {signal.description}
              </div>
            )}
            <div className="flex gap-4 mt-2 text-xs text-[color:var(--text-tertiary)]">
              <span>{signal.sightingCount || 0} sightings</span>
              <span>{signal.subscriptionCount || 0} subscribers</span>
            </div>
          </button>
        ))}
      </div>

      {/* Create Signal Modal - TODO: Build proper signal creator */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[color:var(--surface-elevated)] rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-[color:var(--text-primary)] mb-4">
              Create Signal
            </h3>
            <p className="text-sm text-[color:var(--text-secondary)] mb-4">
              Signal creation UI coming soon. This will allow you to:
            </p>
            <ul className="text-sm text-[color:var(--text-secondary)] space-y-2 mb-6 list-disc list-inside">
              <li>Select a geofence or define custom area</li>
              <li>Choose sighting types to include</li>
              <li>Name and describe your signal</li>
              <li>Set public/private visibility</li>
              <li>Configure notification preferences</li>
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] bg-[color:var(--surface)] hover:bg-[color:var(--surface-elevated)] border border-[color:var(--border)] rounded-lg transition"
              >
                Close
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[color:var(--accent-primary)] hover:bg-[color:var(--accent-hover)] rounded-lg transition"
                disabled
              >
                Create (Soon)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
