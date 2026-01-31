"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useEffect, useState } from "react";
import { getCacheStats } from "@/shared/offline-storage";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [cacheStats, setCacheStats] = useState({
    sightings: 0,
    signals: 0,
    comments: 0,
    pendingActions: 0,
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      // Load cache stats when offline
      getCacheStats().then(setCacheStats);
    }
  }, [isOnline]);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="rounded-lg bg-yellow-500/90 backdrop-blur-sm px-4 py-3 shadow-lg border border-yellow-600/50">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-900"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-900">
              You&apos;re offline
            </p>
            <p className="text-xs text-yellow-800">Viewing cached data</p>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex-shrink-0 rounded p-1 hover:bg-yellow-600/30 transition"
          >
            <svg
              className={`h-4 w-4 text-yellow-900 transition-transform ${showDetails ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-yellow-600/30">
            <p className="text-xs font-semibold text-yellow-900 mb-2">
              Cached Data:
            </p>
            <div className="space-y-1 text-xs text-yellow-800">
              <div className="flex justify-between">
                <span>Sightings:</span>
                <span className="font-medium">{cacheStats.sightings}</span>
              </div>
              <div className="flex justify-between">
                <span>Signals:</span>
                <span className="font-medium">{cacheStats.signals}</span>
              </div>
              <div className="flex justify-between">
                <span>Comments:</span>
                <span className="font-medium">{cacheStats.comments}</span>
              </div>
              {cacheStats.pendingActions > 0 && (
                <div className="flex justify-between pt-1 border-t border-yellow-600/30">
                  <span>Pending sync:</span>
                  <span className="font-medium">
                    {cacheStats.pendingActions}
                  </span>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-yellow-800/80">
              Data will sync when you&apos;re back online
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
