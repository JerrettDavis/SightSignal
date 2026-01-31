"use client";

import { useEffect, useState } from "react";
import type { SightingResponse } from "@/contracts/sighting";
import { ReactionButtons } from "./ReactionButtons";
import { CommentThread } from "./CommentThread";
import { categoryLabelById, typeLabelById } from "@/data/taxonomy";
import { cacheSighting } from "@/shared/offline-storage";

interface SightingDrilldownProps {
  sightingId: string | null;
  onClose: () => void;
  userId?: string;
}

export function SightingDrilldown({
  sightingId,
  onClose,
  userId,
}: SightingDrilldownProps) {
  const [sighting, setSighting] = useState<SightingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sightingId) {
      setSighting(null);
      return;
    }

    const fetchSighting = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/sightings/${sightingId}`);
        if (!response.ok) {
          throw new Error("Failed to load sighting");
        }
        const data = await response.json();
        setSighting(data.data);

        // Cache the sighting for offline access
        await cacheSighting(sightingId, data.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load sighting"
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchSighting();
  }, [sightingId]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sightingId) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [sightingId, onClose]);

  if (!sightingId) {
    return null;
  }

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (iso: string) => {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 30) return `${diffDays} d ago`;
    const diffMonths = Math.round(diffDays / 30);
    return `${diffMonths} mo ago`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drilldown Panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-[color:var(--surface)] shadow-2xl transition-transform duration-300 ease-out sm:w-[480px]"
        style={{
          animation: "slideInFromRight 300ms ease-out",
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
            Sighting Details
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[color:var(--text-secondary)] transition hover:bg-[color:var(--surface-elevated)] hover:text-[color:var(--text-primary)]"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--border)] border-t-[color:var(--accent-primary)]" />
                <p className="text-sm text-[color:var(--text-secondary)]">
                  Loading...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-[color:var(--accent-danger)]/20 bg-[color:var(--accent-danger)]/5 p-4">
              <p className="text-sm text-[color:var(--accent-danger)]">
                {error}
              </p>
            </div>
          )}

          {sighting && (
            <div className="space-y-6">
              {/* Status & Category Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    sighting.status === "active"
                      ? "bg-[color:var(--accent-success)]/10 text-[color:var(--accent-success)]"
                      : "bg-[color:var(--surface-elevated)] text-[color:var(--text-secondary)]"
                  }`}
                >
                  {sighting.status === "active" ? "Active" : "Resolved"}
                </span>
                <span className="rounded-full bg-[color:var(--surface-elevated)] px-3 py-1 text-xs font-medium text-[color:var(--text-secondary)]">
                  {categoryLabelById(sighting.categoryId)}
                </span>
                <span className="rounded-full bg-[color:var(--surface-elevated)] px-3 py-1 text-xs font-medium text-[color:var(--text-secondary)]">
                  {typeLabelById(sighting.typeId)}
                </span>
                {sighting.importance && sighting.importance !== "normal" && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      sighting.importance === "critical"
                        ? "bg-[color:var(--accent-danger)]/10 text-[color:var(--accent-danger)]"
                        : sighting.importance === "high"
                          ? "bg-[color:var(--accent-warning)]/10 text-[color:var(--accent-warning)]"
                          : "bg-[color:var(--surface-elevated)] text-[color:var(--text-secondary)]"
                    }`}
                  >
                    {sighting.importance}
                  </span>
                )}
              </div>

              {/* Description */}
              <div>
                <h3 className="mb-2 text-base font-semibold text-[color:var(--text-primary)]">
                  Description
                </h3>
                <p className="text-sm leading-relaxed text-[color:var(--text-secondary)]">
                  {sighting.description}
                </p>
              </div>

              {/* Details */}
              {sighting.details && (
                <div>
                  <h3 className="mb-2 text-base font-semibold text-[color:var(--text-primary)]">
                    Additional Details
                  </h3>
                  <p className="text-sm leading-relaxed text-[color:var(--text-secondary)]">
                    {sighting.details}
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="rounded-lg bg-[color:var(--surface-elevated)] p-4">
                <h3 className="mb-3 text-sm font-semibold text-[color:var(--text-primary)]">
                  Information
                </h3>
                <dl className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <dt className="text-[color:var(--text-tertiary)]">
                      Observed
                    </dt>
                    <dd className="text-[color:var(--text-secondary)]">
                      {formatRelativeTime(sighting.observedAt)}
                    </dd>
                  </div>
                  <div className="flex justify-between text-xs">
                    <dt className="text-[color:var(--text-tertiary)]">
                      Reported
                    </dt>
                    <dd className="text-[color:var(--text-secondary)]">
                      {formatRelativeTime(sighting.createdAt)}
                    </dd>
                  </div>
                  <div className="flex justify-between text-xs">
                    <dt className="text-[color:var(--text-tertiary)]">
                      Location
                    </dt>
                    <dd className="font-mono text-[color:var(--text-secondary)]">
                      {sighting.location.lat.toFixed(4)},{" "}
                      {sighting.location.lng.toFixed(4)}
                    </dd>
                  </div>
                  <div className="flex justify-between text-xs">
                    <dt className="text-[color:var(--text-tertiary)]">Score</dt>
                    <dd className="text-[color:var(--text-secondary)]">
                      {sighting.score}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Reactions */}
              <div>
                <h3 className="mb-3 text-base font-semibold text-[color:var(--text-primary)]">
                  Reactions
                </h3>
                <ReactionButtons
                  sightingId={sighting.id}
                  userId={userId}
                  initialUpvotes={sighting.upvotes}
                  initialDownvotes={sighting.downvotes}
                  initialConfirmations={sighting.confirmations}
                  initialDisputes={sighting.disputes}
                  onReactionChange={() => {
                    // Optionally refresh sighting data
                  }}
                />
              </div>

              {/* Comments */}
              <div>
                <h3 className="mb-3 text-base font-semibold text-[color:var(--text-primary)]">
                  Comments
                </h3>
                <CommentThread sightingId={sighting.id} userId={userId} />
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
