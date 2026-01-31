"use client";

import { useSignalNavigation } from "@/stores/signalNavigationStore";
import { useEffect } from "react";
import SignalListSidebar from "./SignalListSidebar";
import SightingListSidebar from "./SightingListSidebar";
import SightingDetailSidebar from "./SightingDetailSidebar";

/**
 * 3-tier hierarchical sidebar stack
 * - Level 1: Signal list (always visible, 320px)
 * - Level 2: Sighting list (visible when signal selected, 400px)
 * - Level 3: Sighting details (visible when sighting selected, 480px)
 */
export default function SidebarStack() {
  const { selectedSignal, selectedSighting, syncWithUrl } =
    useSignalNavigation();

  // Sync with URL on mount
  useEffect(() => {
    syncWithUrl();
  }, [syncWithUrl]);

  return (
    <div className="flex h-full">
      {/* Level 1: Signal List - Always visible */}
      <div
        className="h-full overflow-y-auto bg-[color:var(--surface-elevated)] border-r border-[color:var(--border)] transition-all duration-300"
        style={{ width: "320px" }}
      >
        <SignalListSidebar />
      </div>

      {/* Level 2: Sighting List - Visible when signal selected */}
      {selectedSignal && (
        <div
          className="h-full overflow-y-auto bg-[color:var(--surface-elevated)] border-r border-[color:var(--border)] transition-all duration-300"
          style={{ width: "400px" }}
        >
          <SightingListSidebar signalId={selectedSignal} />
        </div>
      )}

      {/* Level 3: Sighting Details - Visible when sighting selected */}
      {selectedSighting && (
        <div
          className="h-full overflow-y-auto bg-[color:var(--surface-elevated)] border-r border-[color:var(--border)] transition-all duration-300"
          style={{ width: "480px" }}
        >
          <SightingDetailSidebar sightingId={selectedSighting} />
        </div>
      )}
    </div>
  );
}
