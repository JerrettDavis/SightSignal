"use client";

import { useCallback, useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ReportForm } from "@/components/report-form";
import { ClientGeofenceStudio } from "@/components/client-geofence-studio";
import { ClientSightingsExplorer } from "@/components/client-sightings-explorer";
import { SignalsBrowser } from "@/components/signals/SignalsBrowser";
import { SightingSchema } from "@/contracts/sighting";
import type { SightingCard } from "@/data/mock-sightings";
import { categoryLabelById, typeLabelById } from "@/data/taxonomy";
import { EVENTS, dispatchEvent } from "@/shared/events";
import { getCookie, setCookie } from "@/shared/client-cookies";
import type { z } from "zod";

type View = "signals" | "sightings" | "report" | "geofences" | null;
type ApiResponse<T> = { data: T };

const formatRelativeTime = (iso: string) => {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
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

export default function Home() {
  const [activeView, setActiveView] = useState<View>("sightings");
  const [sightings, setSightings] = useState<SightingCard[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [importanceFilter, setImportanceFilter] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const loadSightings = useCallback(async () => {
    try {
      const response = await fetch("/api/sightings");
      if (!response.ok) return;
      const data = (await response.json()) as ApiResponse<unknown>;
      const parsed = SightingSchema.array().safeParse(data.data);
      if (!parsed.success) return;
      setSightings(parsed.data.map(toCard));
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSightings();
  }, [loadSightings]);

  useEffect(() => {
    const handler = () => void loadSightings();
    window.addEventListener(EVENTS.sightingsUpdated, handler);
    return () => window.removeEventListener(EVENTS.sightingsUpdated, handler);
  }, [loadSightings]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch("/api/admin/auth/verify");
        setIsAdmin(response.ok);
      } catch {
        setIsAdmin(false);
      }
    };
    void checkAdminStatus();
  }, []);

  useEffect(() => {
    // Check if user has dismissed the welcome wizard (cookie-based)
    const hasSeenWelcome = getCookie("sightsignal-welcome-dismissed");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowWelcome(!hasSeenWelcome);
  }, []);

  const dismissWelcome = () => {
    // Set cookie that expires in 1 year (365 days)
    setCookie("sightsignal-welcome-dismissed", "true", { maxAge: 365 });
    setShowWelcome(false);
  };

  const showWelcomeWizard = () => {
    setShowWelcome(true);
  };

  const openView = (view: View) => {
    setActiveView(view);
    setMobileSidebarOpen(true); // Open sidebar on mobile when switching views
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const filteredSightings = sightings
    .filter((sighting) => {
      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(sighting.category)
      ) {
        return false;
      }
      if (
        importanceFilter !== "all" &&
        sighting.importance !== importanceFilter
      ) {
        return false;
      }
      return sighting.status === "active";
    })
    .slice(0, 100); // Show top 100 sightings

  return (
    <div className="fixed inset-0 flex flex-col bg-[color:var(--background)]">
      {/* Top Bar */}
      <header className="relative flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-4 py-3 shadow-[var(--shadow-sm)] z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--text-secondary)] hover:bg-[color:var(--surface)] hover:text-[color:var(--text-primary)] transition"
            aria-label="Open menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12h18" />
              <path d="M3 6h18" />
              <path d="M3 18h18" />
            </svg>
          </button>

          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--accent-primary)] text-sm font-bold text-white">
            SS
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[color:var(--text-primary)]">
              SightSignal
            </h1>
            <p className="text-xs text-[color:var(--text-tertiary)]">
              Local intelligence
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-3">
          {/* Desktop: Full Navigation with Icons */}
          <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-[color:var(--surface)] border border-[color:var(--border)]">
            {/* Signals Button */}
            <button
              onClick={() => openView("signals")}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                activeView === "signals"
                  ? "bg-[color:var(--surface-elevated)] text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-primary)] hover:bg-[color:var(--surface-elevated)]"
              }`}
              title="Browse Signals"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
                <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                <path d="M12 4v6" />
                <path d="M2 18h20" />
              </svg>
              <span>Signals</span>
            </button>

            {/* Sightings Button */}
            <button
              onClick={() => openView("sightings")}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                activeView === "sightings"
                  ? "bg-[color:var(--surface-elevated)] text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-primary)] hover:bg-[color:var(--surface-elevated)]"
              }`}
              title="Browse Sightings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>Sightings</span>
            </button>

            {/* Geofences Button */}
            <button
              onClick={() => openView("geofences")}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                activeView === "geofences"
                  ? "bg-[color:var(--surface-elevated)] text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-primary)] hover:bg-[color:var(--surface-elevated)]"
              }`}
              title="Manage Geofences"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>Geofences</span>
            </button>
          </div>
        </nav>

        <div className="flex items-center gap-2">
          {/* Help Icon to reopen wizard */}
          <button
            onClick={showWelcomeWizard}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--text-secondary)] hover:bg-[color:var(--surface)] hover:text-[color:var(--text-primary)] transition"
            title="Show welcome guide"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
          </button>
          {isAdmin && (
            <a
              href="/admin"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--text-secondary)] hover:bg-[color:var(--surface)] hover:text-[color:var(--text-primary)] transition"
              title="Admin Panel"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </a>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content - Map + Fixed Sidebar */}
      <main className="flex flex-1 overflow-hidden">
        {/* Mobile Backdrop */}
        {mobileSidebarOpen && (
          <div
            className="md:hidden fixed inset-0 top-[68px] bg-black/20 z-40 transition-opacity"
            onClick={closeMobileSidebar}
            aria-hidden="true"
          />
        )}

        {/* Fixed Left Sidebar - Responsive */}
        <aside
          className={`
            fixed md:relative
            left-0 top-[68px] md:top-auto
            h-[calc(100vh-68px)]
            md:flex-1
            w-full sm:w-96
            md:w-96
            border-r border-[color:var(--border)]
            bg-[color:var(--surface-elevated)]
            flex flex-col overflow-hidden
            isolate
            z-50 md:z-10
            transform transition-transform duration-300 ease-out
            ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:translate-x-0
          `}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-6 py-4 flex-shrink-0">
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
              {activeView === "signals" && "Signals"}
              {activeView === "sightings" && "Sightings"}
              {activeView === "report" && "Report a Signal"}
              {activeView === "geofences" && "Geofences"}
            </h2>
            {/* Mobile Close Button */}
            <button
              onClick={closeMobileSidebar}
              className="md:hidden rounded-full p-2 text-[color:var(--text-secondary)] hover:bg-[color:var(--surface)] transition"
              aria-label="Close sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {/* Sidebar Content - Scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Signals View */}
            {activeView === "signals" && <SignalsBrowser />}

            {/* Sightings View */}
            {activeView === "sightings" && (
              <>
                {/* Filters Section - Fixed at top */}
                <div className="border-b border-[color:var(--border)] p-4 space-y-4 bg-[color:var(--surface-elevated)] sticky top-0 z-10">
                  <div>
                    <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-2">
                      Categories
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Nature",
                        "Public Safety",
                        "Community",
                        "Hazards",
                        "Infrastructure",
                        "Events",
                      ].map((category) => (
                        <button
                          key={category}
                          onClick={() => toggleCategory(category)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                            selectedCategories.includes(category)
                              ? "border-[color:var(--accent-primary)] bg-[color:var(--accent-primary)] text-white"
                              : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-elevated)] hover:text-[color:var(--text-primary)]"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-2">
                      Importance
                    </label>
                    <select
                      value={importanceFilter}
                      onChange={(e) => setImportanceFilter(e.target.value)}
                      className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-primary)]"
                    >
                      <option value="all">All levels</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                {/* Sightings List - Scrollable */}
                <div className="p-4 pb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-[color:var(--text-secondary)]">
                      Nearby Signals
                    </h3>
                    <span className="text-xs text-[color:var(--text-tertiary)]">
                      {filteredSightings.length} found
                    </span>
                  </div>

                  {filteredSightings.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-[color:var(--text-secondary)]">
                        No signals match your filters
                      </p>
                      <button
                        onClick={() => {
                          setSelectedCategories([]);
                          setImportanceFilter("all");
                        }}
                        className="mt-2 text-xs font-medium text-[color:var(--accent-primary)] hover:underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredSightings.map((sighting) => (
                        <div
                          key={sighting.id}
                          onClick={() => {
                            dispatchEvent(EVENTS.sightingSelected, {
                              id: sighting.id,
                              title: sighting.title,
                              category: sighting.category,
                              description: sighting.description,
                              location: sighting.location,
                            });
                          }}
                          className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3 hover:bg-[color:var(--surface-elevated)] transition cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[color:var(--text-primary)] truncate">
                                {sighting.title}
                              </p>
                              <p className="text-xs text-[color:var(--text-secondary)] mt-1">
                                {sighting.category} • {sighting.type}
                              </p>
                              <p className="text-xs text-[color:var(--text-tertiary)] mt-1">
                                {sighting.observedAtLabel}
                              </p>
                            </div>
                            <div
                              className={`flex-shrink-0 w-2 h-2 rounded-full ${
                                sighting.importance === "critical"
                                  ? "bg-[color:var(--accent-danger)]"
                                  : sighting.importance === "high"
                                    ? "bg-[color:var(--accent-warning)]"
                                    : sighting.importance === "low"
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
              </>
            )}

            {/* Report View */}
            {activeView === "report" && (
              <div className="p-4 sm:p-6 pb-8">
                <ReportForm />
              </div>
            )}

            {/* Geofences View */}
            {activeView === "geofences" && (
              <div className="p-4 sm:p-6 pb-8">
                <ClientGeofenceStudio />
              </div>
            )}
          </div>
        </aside>

        {/* Map Area */}
        <div className="relative flex-1 overflow-hidden isolate z-0">
          <ClientSightingsExplorer />

          {/* Welcome Card - Dismissable wizard */}
          {showWelcome && (
            <div className="absolute right-4 top-4 max-w-sm rounded-xl bg-[color:var(--surface-elevated)] p-4 shadow-[var(--shadow-md)] z-10 border border-[color:var(--border)]">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold text-[color:var(--text-primary)]">
                  Welcome to SightSignal
                </h2>
                <button
                  onClick={dismissWelcome}
                  className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded text-[color:var(--text-tertiary)] hover:bg-[color:var(--surface)] hover:text-[color:var(--text-primary)] transition"
                  title="Dismiss"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                Share and track local sightings, events, and hazards. Use the
                sidebar to explore signals or report new ones.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={dismissWelcome}
                  className="rounded-lg bg-[color:var(--accent-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--accent-hover)] transition"
                >
                  Got it
                </button>
              </div>
            </div>
          )}

          {/* FAB - Create Signal */}
          <button
            onClick={() => {
              setActiveView("report");
              setMobileSidebarOpen(true);
            }}
            className="absolute bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--accent-primary)] text-white shadow-[var(--shadow-lg)] hover:bg-[color:var(--accent-hover)] transition-all hover:scale-105 active:scale-95 z-[100] pointer-events-auto"
            title="Create new signal"
            aria-label="Create new signal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
}
