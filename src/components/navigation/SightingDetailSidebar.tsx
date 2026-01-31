"use client";

import { useEffect, useState } from "react";
import { useSignalNavigation } from "@/stores/signalNavigationStore";
import { dispatchEvent, EVENTS } from "@/shared/events";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
} from "lucide-react";

interface Sighting {
  id: string;
  description: string;
  details: string | null;
  location: { lat: number; lng: number };
  importance: string;
  status: string;
  observedAt: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  confirmations: number;
  disputes: number;
  spamReports: number;
}

interface SightingDetailSidebarProps {
  sightingId: string;
}

export default function SightingDetailSidebar({
  sightingId,
}: SightingDetailSidebarProps) {
  const [sighting, setSighting] = useState<Sighting | null>(null);
  const [loading, setLoading] = useState(true);
  const { navigateBack } = useSignalNavigation();

  useEffect(() => {
    fetchSighting();
  }, [sightingId]);

  async function fetchSighting() {
    try {
      const res = await fetch(`/api/sightings/${sightingId}`);
      if (!res.ok) throw new Error("Failed to fetch sighting");
      const data = await res.json();
      setSighting(data.data);
    } catch (error) {
      console.error("Error fetching sighting:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!sighting) {
    return (
      <div className="p-4">
        <p className="text-gray-500">Sighting not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[color:var(--border)]">
        <button
          onClick={navigateBack}
          className="flex items-center gap-2 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] mb-4"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Back</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title & Description */}
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--text-primary)]">
            {sighting.description}
          </h2>
          {sighting.details && (
            <p className="mt-2 text-[color:var(--text-secondary)]">
              {sighting.details}
            </p>
          )}
        </div>

        {/* Importance & Status */}
        <div className="flex gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              sighting.importance === "high"
                ? "bg-[color:var(--accent-danger)] text-white"
                : sighting.importance === "normal"
                  ? "bg-[color:var(--accent-warning)] text-white"
                  : "bg-[color:var(--surface)] text-[color:var(--text-secondary)]"
            }`}
          >
            {sighting.importance}
          </span>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-[color:var(--accent-primary)] text-white">
            {sighting.status}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2 text-[color:var(--text-secondary)]">
          <MapPin size={16} className="mt-1" />
          <div>
            <div className="text-sm font-medium">Location</div>
            <div className="text-sm">
              {sighting.location.lat.toFixed(4)},{" "}
              {sighting.location.lng.toFixed(4)}
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-start gap-2 text-[color:var(--text-secondary)]">
          <Calendar size={16} className="mt-1" />
          <div>
            <div className="text-sm font-medium">Observed At</div>
            <div className="text-sm">
              {new Date(sighting.observedAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Engagement Stats */}
        <div className="border-t border-[color:var(--border)] pt-4">
          <div className="text-sm font-medium text-[color:var(--text-primary)] mb-2">
            Community Engagement
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-[color:var(--accent-success)]">
              <ThumbsUp size={14} />
              <span>{sighting.upvotes} upvotes</span>
            </div>
            <div className="flex items-center gap-2 text-[color:var(--accent-danger)]">
              <ThumbsDown size={14} />
              <span>{sighting.downvotes} downvotes</span>
            </div>
            <div className="flex items-center gap-2 text-[color:var(--accent-primary)]">
              <span>✓ {sighting.confirmations} confirmed</span>
            </div>
            <div className="flex items-center gap-2 text-[color:var(--accent-warning)]">
              <span>✗ {sighting.disputes} disputed</span>
            </div>
          </div>
          {sighting.spamReports > 0 && (
            <div className="flex items-center gap-2 text-[color:var(--accent-danger)] mt-2">
              <AlertTriangle size={14} />
              <span>{sighting.spamReports} spam reports</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-[color:var(--border)] pt-4 space-y-2">
          <button
            onClick={() => {
              if (sighting) {
                dispatchEvent(EVENTS.sightingSelected, {
                  id: sighting.id,
                  title: sighting.description,
                  category: "unknown", // API doesn't return category
                  description: sighting.details || sighting.description,
                  location: sighting.location,
                  timestamp: sighting.observedAt,
                });
              }
            }}
            className="w-full px-4 py-2 bg-[color:var(--accent-primary)] text-white rounded hover:bg-[color:var(--accent-hover)] transition"
          >
            View on Map
          </button>
          <button className="w-full px-4 py-2 border border-[color:var(--border)] rounded hover:bg-[color:var(--surface)] transition text-[color:var(--text-primary)]">
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
