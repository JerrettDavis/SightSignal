"use client";

import { useEffect, useState } from "react";
import { useSignalNavigation } from "@/stores/signalNavigationStore";
import { ArrowLeft } from "lucide-react";

interface Sighting {
  id: string;
  description: string;
  location: { lat: number; lng: number };
  importance: string;
  status: string;
  observedAt: string;
  createdAt: string;
}

interface SightingListSidebarProps {
  signalId: string;
}

export default function SightingListSidebar({
  signalId,
}: SightingListSidebarProps) {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [signalName, setSignalName] = useState("");
  const [loading, setLoading] = useState(true);
  const { selectedSighting, navigateToSighting, navigateBack } =
    useSignalNavigation();

  useEffect(() => {
    fetchSightings();
  }, [signalId]);

  async function fetchSightings() {
    try {
      const res = await fetch(`/api/signals/${signalId}/sightings?limit=100`);
      if (!res.ok) throw new Error("Failed to fetch sightings");
      const data = await res.json();
      setSightings(data.data?.sightings || []);
      setSignalName(data.data?.signal?.name || "");
    } catch (error) {
      console.error("Error fetching sightings:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[color:var(--border)]">
        <button
          onClick={navigateBack}
          className="flex items-center gap-2 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] mb-2"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Back</span>
        </button>
        <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
          {signalName}
        </h2>
        <p className="text-sm text-[color:var(--text-secondary)]">
          {sightings.length} sightings
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sightings.length === 0 ? (
          <div className="p-4 text-center text-[color:var(--text-secondary)]">
            No sightings in this signal yet
          </div>
        ) : (
          sightings.map((sighting) => (
            <button
              key={sighting.id}
              onClick={() => navigateToSighting(sighting.id)}
              className={`w-full p-4 text-left hover:bg-[color:var(--surface)] transition-colors border-b border-[color:var(--border)] ${
                selectedSighting === sighting.id
                  ? "bg-[color:var(--surface)] border-l-4 border-l-[color:var(--accent-primary)]"
                  : ""
              }`}
            >
              <div className="font-medium text-[color:var(--text-primary)] line-clamp-2">
                {sighting.description}
              </div>
              <div className="flex gap-2 mt-2 text-xs">
                <span
                  className={`px-2 py-1 rounded ${
                    sighting.importance === "high"
                      ? "bg-[color:var(--accent-danger)] text-white"
                      : sighting.importance === "normal"
                        ? "bg-[color:var(--accent-warning)] text-white"
                        : "bg-[color:var(--surface)] text-[color:var(--text-secondary)]"
                  }`}
                >
                  {sighting.importance}
                </span>
                <span className="px-2 py-1 rounded bg-[color:var(--surface)] text-[color:var(--text-secondary)]">
                  {sighting.status}
                </span>
              </div>
              <div className="text-xs text-[color:var(--text-tertiary)] mt-2">
                {new Date(sighting.observedAt).toLocaleString()}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
