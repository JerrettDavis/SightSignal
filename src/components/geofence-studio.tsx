"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { PolygonSchema } from "@/contracts/geo";
import { categories, sightingTypes } from "@/data/taxonomy";
import type { LatLng } from "@/domain/geo/geo";
import { dispatchEvent, EVENTS } from "@/shared/events";

type GeofenceRecord = {
  id: string;
  name: string;
  visibility: string;
  polygon: {
    points: LatLng[];
  };
  createdAt: string;
};

const samplePolygon: LatLng[] = [
  { lat: 37.8129, lng: -122.419 },
  { lat: 37.8129, lng: -122.401 },
  { lat: 37.7985, lng: -122.401 },
  { lat: 37.7985, lng: -122.419 },
];

const GeofenceMap = dynamic(
  () => import("@/components/map/geofence-map").then((mod) => mod.GeofenceMap),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-[420px] w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow-sm)]" />
    ),
  }
);

export const GeofenceStudio = () => {
  const [geofences, setGeofences] = useState<GeofenceRecord[]>([]);
  const [draftPoints, setDraftPoints] = useState<LatLng[]>([]);
  const [name, setName] = useState("Waterfront alerts");
  const [visibility, setVisibility] = useState("public");
  const [email, setEmail] = useState("");
  const [trustLevel, setTrustLevel] = useState("all");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [typeIds, setTypeIds] = useState<string[]>([]);
  const [target, setTarget] = useState<"drawn" | string>("drawn");
  const [geofenceStatus, setGeofenceStatus] = useState<
    "idle" | "saving" | "error" | "success"
  >("idle");
  const [subscriptionStatus, setSubscriptionStatus] = useState<
    "idle" | "saving" | "error" | "success"
  >("idle");

  const loadGeofences = useCallback(async () => {
    const response = await fetch("/api/geofences");
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { data: GeofenceRecord[] };
    setGeofences(data.data ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGeofences();
  }, [loadGeofences]);

  useEffect(() => {
    const handler = () => {
      void loadGeofences();
    };
    window.addEventListener(EVENTS.geofencesUpdated, handler);
    return () => window.removeEventListener(EVENTS.geofencesUpdated, handler);
  }, [loadGeofences]);

  const handleMapClick = useCallback((point: LatLng) => {
    setDraftPoints((prev) => [...prev, point]);
  }, []);

  const handleClear = () => {
    setDraftPoints([]);
  };

  const handleSample = () => {
    setDraftPoints(samplePolygon);
  };

  const handleCreateGeofence = async () => {
    setGeofenceStatus("saving");
    const polygon = { points: draftPoints };
    const validation = PolygonSchema.safeParse(polygon);
    if (!validation.success) {
      setGeofenceStatus("error");
      return;
    }

    const response = await fetch("/api/geofences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        visibility,
        polygon,
      }),
    });

    if (!response.ok) {
      setGeofenceStatus("error");
      return;
    }

    setGeofenceStatus("success");
    setDraftPoints([]);
    dispatchEvent(EVENTS.geofencesUpdated);
  };

  const handleToggleCategory = (id: string) => {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleType = (id: string) => {
    setTypeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubscribe = async () => {
    setSubscriptionStatus("saving");
    const targetPayload =
      target === "drawn"
        ? { kind: "polygon", polygon: { points: draftPoints } }
        : { kind: "geofence", geofenceId: target };

    const response = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        target: targetPayload,
        categoryIds,
        typeIds,
        trustLevel,
      }),
    });

    if (!response.ok) {
      setSubscriptionStatus("error");
      return;
    }

    setSubscriptionStatus("success");
    setEmail("");
    setCategoryIds([]);
    setTypeIds([]);
    dispatchEvent(EVENTS.subscriptionsUpdated);
  };

  const readyToSave = draftPoints.length >= 3;
  const readyToSubscribe =
    email.length > 3 && (target !== "drawn" || readyToSave);

  const publicGeofences = useMemo(
    () => geofences.filter((geofence) => geofence.visibility === "public"),
    [geofences]
  );

  return (
    <div className="grid gap-6">
      {/* Map Section */}
      <div className="flex flex-col gap-4">
        <GeofenceMap
          geofences={publicGeofences}
          draftPoints={draftPoints}
          onMapClick={handleMapClick}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSample}
            data-testid="sample-geofence-button"
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-elevated)] hover:text-[color:var(--text-primary)] transition"
          >
            Use sample polygon
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-elevated)] hover:text-[color:var(--text-primary)] transition"
          >
            Clear points
          </button>
          <span className="rounded-lg bg-[color:var(--surface)] px-3 py-2 text-xs font-medium text-[color:var(--text-secondary)]">
            Points: {draftPoints.length}
          </span>
        </div>
      </div>

      {/* Create Geofence Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">
          Create Geofence
        </h3>
        <div className="grid gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[color:var(--text-secondary)]">
              Name
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)]"
              placeholder="Downtown alerts"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[color:var(--text-secondary)]">
              Visibility
            </span>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)]"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
          <button
            type="button"
            data-testid="create-geofence-button"
            onClick={handleCreateGeofence}
            disabled={!readyToSave || geofenceStatus === "saving"}
            className="rounded-lg bg-[color:var(--accent-primary)] px-6 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-sm)] hover:bg-[color:var(--accent-hover)] transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {geofenceStatus === "saving" ? "Saving..." : "Save geofence"}
          </button>
          {geofenceStatus === "error" && (
            <span className="text-xs font-medium text-[color:var(--accent-danger)]">
              Add at least 3 points and try again.
            </span>
          )}
          {geofenceStatus === "success" && (
            <span className="text-xs font-medium text-[color:var(--accent-success)]">
              Geofence saved successfully
            </span>
          )}
        </div>
      </div>

      {/* Subscribe Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">
          Subscribe
        </h3>
        <div className="grid gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[color:var(--text-secondary)]">
              Email
            </span>
            <input
              data-testid="subscription-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)]"
              placeholder="alerts@domain.com"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[color:var(--text-secondary)]">
              Target
            </span>
            <select
              value={target}
              onChange={(event) =>
                setTarget(event.target.value as "drawn" | string)
              }
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)]"
            >
              <option value="drawn">Drawn polygon</option>
              {publicGeofences.map((geofence) => (
                <option key={geofence.id} value={geofence.id}>
                  {geofence.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[color:var(--text-secondary)]">
              Trust level
            </span>
            <select
              value={trustLevel}
              onChange={(event) => setTrustLevel(event.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)]"
            >
              <option value="all">All</option>
              <option value="vetted">Vetted only</option>
              <option value="raw">Raw only</option>
            </select>
          </label>

          {/* Categories */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-[color:var(--text-secondary)]">
              Categories
            </span>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-medium text-[color:var(--text-secondary)] cursor-pointer hover:bg-[color:var(--surface-elevated)] transition"
                >
                  <input
                    type="checkbox"
                    checked={categoryIds.includes(category.id)}
                    onChange={() => handleToggleCategory(category.id)}
                    className="rounded"
                  />
                  {category.label}
                </label>
              ))}
            </div>
          </div>

          {/* Types */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-[color:var(--text-secondary)]">
              Types
            </span>
            <div className="flex flex-wrap gap-2">
              {sightingTypes.map((type) => (
                <label
                  key={type.id}
                  className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-medium text-[color:var(--text-secondary)] cursor-pointer hover:bg-[color:var(--surface-elevated)] transition"
                >
                  <input
                    type="checkbox"
                    checked={typeIds.includes(type.id)}
                    onChange={() => handleToggleType(type.id)}
                    className="rounded"
                  />
                  {type.label}
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            data-testid="subscribe-button"
            onClick={handleSubscribe}
            disabled={!readyToSubscribe || subscriptionStatus === "saving"}
            className="rounded-lg bg-[color:var(--accent-primary)] px-6 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-sm)] hover:bg-[color:var(--accent-hover)] transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {subscriptionStatus === "saving"
              ? "Saving..."
              : "Save subscription"}
          </button>
          {subscriptionStatus === "success" && (
            <span className="text-xs font-medium text-[color:var(--accent-success)]">
              Subscription saved successfully
            </span>
          )}
          {subscriptionStatus === "error" && (
            <span className="text-xs font-medium text-[color:var(--accent-danger)]">
              Provide email and a target.
            </span>
          )}
        </div>
      </div>

      {/* Public Geofences Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">
          Public Geofences
        </h3>
        <div className="space-y-2">
          {publicGeofences.map((geofence) => (
            <button
              key={geofence.id}
              data-testid="geofence-card"
              onClick={() => dispatchEvent(EVENTS.geofenceSelected, geofence)}
              className="w-full text-left rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3 hover:bg-[color:var(--surface-elevated)] hover:border-[color:var(--accent-primary)] transition cursor-pointer"
            >
              <p className="text-sm font-medium text-[color:var(--text-primary)]">
                {geofence.name}
              </p>
              <p className="text-xs text-[color:var(--text-tertiary)] mt-1">
                {geofence.polygon.points.length} points • Created{" "}
                {new Date(geofence.createdAt).toLocaleDateString()}
              </p>
            </button>
          ))}
          {publicGeofences.length === 0 && (
            <p className="text-sm text-[color:var(--text-secondary)] py-4">
              No public geofences yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
