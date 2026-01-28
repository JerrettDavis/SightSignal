"use client";

import { useCallback, useEffect, useState } from "react";
import type { z } from "zod";
import dynamic from "next/dynamic";
import { SightingSchema } from "@/contracts/sighting";
import type { SightingCard } from "@/data/mock-sightings";
import { categoryLabelById, typeLabelById } from "@/data/taxonomy";
import { EVENTS } from "@/shared/events";

type ApiResponse<T> = {
  data: T;
};

const SightingsMap = dynamic(
  () =>
    import("@/components/map/sightings-map").then((mod) => mod.SightingsMap),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--surface)]">
        <div className="text-center">
          <div className="text-sm font-medium text-[color:var(--text-primary)]">
            Loading map...
          </div>
          <div className="mt-2 text-xs text-[color:var(--text-secondary)]">
            Initializing MapLibre
          </div>
        </div>
      </div>
    ),
  }
);

const formatRelativeTime = (iso: string) => {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} d ago`;
};

const toCard = (sighting: z.infer<typeof SightingSchema>): SightingCard => ({
  id: sighting.id,
  title:
    sighting.description.length > 42
      ? `${sighting.description.slice(0, 42)}…`
      : sighting.description,
  category: categoryLabelById(sighting.categoryId),
  type: typeLabelById(sighting.typeId),
  description: sighting.description,
  importance: sighting.importance ?? "normal",
  status: sighting.status,
  observedAtLabel: formatRelativeTime(sighting.observedAt),
  location: sighting.location,
  reactions: [],
  score: sighting.score,
  hotScore: sighting.hotScore,
});

type SelectedGeofence = {
  id: string;
  name: string;
  polygon: {
    points: Array<{ lat: number; lng: number }>;
  };
};

type SelectedSighting = {
  id: string;
  title: string;
  category: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
};

export const SightingsExplorer = () => {
  const [sightings, setSightings] = useState<SightingCard[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [selectedGeofence, setSelectedGeofence] =
    useState<SelectedGeofence | null>(null);
  const [selectedSighting, setSelectedSighting] =
    useState<SelectedSighting | null>(null);

  const loadSightings = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch("/api/sightings");
      if (!response.ok) {
        throw new Error("Request failed.");
      }
      const data = (await response.json()) as ApiResponse<unknown>;
      const parsed = SightingSchema.array().safeParse(data.data);
      if (!parsed.success) {
        throw new Error("Invalid data.");
      }
      setSightings(parsed.data.map(toCard));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadSightings();
  }, [loadSightings]);

  useEffect(() => {
    const handler = () => {
      void loadSightings();
    };
    window.addEventListener(EVENTS.sightingsUpdated, handler);
    return () => window.removeEventListener(EVENTS.sightingsUpdated, handler);
  }, [loadSightings]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<SelectedGeofence>;
      setSelectedGeofence(customEvent.detail);
    };
    window.addEventListener(EVENTS.geofenceSelected, handler);
    return () => window.removeEventListener(EVENTS.geofenceSelected, handler);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<SelectedSighting>;
      setSelectedSighting(customEvent.detail);
    };
    window.addEventListener(EVENTS.sightingSelected, handler);
    return () => window.removeEventListener(EVENTS.sightingSelected, handler);
  }, []);

  return (
    <div className="absolute inset-0">
      <SightingsMap
        sightings={sightings}
        selectedGeofence={selectedGeofence}
        selectedSighting={selectedSighting}
      />
      {status === "error" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-lg border border-[color:var(--accent-danger)] bg-[color:var(--surface-elevated)] px-4 py-2 shadow-[var(--shadow-md)] z-10">
          <div className="text-sm font-medium text-[color:var(--accent-danger)]">
            Unable to load signals
          </div>
        </div>
      )}
    </div>
  );
};
